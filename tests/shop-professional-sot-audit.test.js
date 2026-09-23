const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function ctx(extra={}) {
  return loadSource([
    'modules/shop/shop-professional-audit.js',
    'modules/shop/shop-inventory-ledger.js',
    'modules/shop/generic/product-repository.js',
  ], { D: { products: [], shopInventoryLedger: [] }, ...extra }, ['ShopProfessionalAudit','ShopInventoryLedger','ProductRepository']);
}

test('S1930 inventory ledger mencatat delta, opening baseline, audit trail, dan reconciliation', () => {
  const D={products:[{id:'p1',name:'A',stock:10}],shopInventoryLedger:[]};
  const c=ctx({D});
  const r1=c.ProductRepository.mutateStockDelta(D.products[0],-3,{source:'sale',reason:'jual',refType:'shopSale',refId:'s1',idempotencyKey:'s1:p1'});
  const r2=c.ProductRepository.mutateStockDelta(D.products[0],2,{source:'purchase-receiving',reason:'terima',refType:'purchaseOrder',refId:'po1',idempotencyKey:'po1:p1'});
  assert.equal(r1.ok,true); assert.equal(r2.ok,true); assert.equal(D.products[0].stock,9);
  assert.equal(D.shopInventoryLedger.length,2);
  assert.equal(D.shopInventoryLedger[0].openingStock,10);
  assert.equal(c.ShopInventoryLedger.reconcileProduct('p1',D.products[0]).status,'PASS');
  assert.equal(c.ShopInventoryLedger.auditTrail('p1').length,2);
});

test('S1930 stock mutation idempotency mencegah double-posting', () => {
  const D={products:[{id:'p1',stock:5}],shopInventoryLedger:[]};
  const c=ctx({D});
  c.ProductRepository.mutateStockDelta(D.products[0],-2,{source:'sale',idempotencyKey:'sale:p1'});
  const r=c.ProductRepository.mutateStockDelta(D.products[0],-2,{source:'sale',idempotencyKey:'sale:p1'});
  assert.equal(r.duplicate,true); assert.equal(D.products[0].stock,3); assert.equal(D.shopInventoryLedger.length,1);
});

test('S1930 set-stock menjadi adjustment delta dan tetap reconcile', () => {
  const D={products:[{id:'p1',stock:12}],shopInventoryLedger:[]};
  const c=ctx({D});
  c.ProductRepository.mutateSetStock(D.products[0],9,{source:'stock-opname',reason:'opname'});
  assert.equal(D.shopInventoryLedger[0].delta,-3);
  assert.equal(c.ShopInventoryLedger.reconcileProduct('p1',D.products[0]).status,'PASS');
});

test('S1930 purchase receiving menambah stok dan menghasilkan lifecycle partial/received', () => {
  const D={products:[{id:'p1',name:'A',stock:0,hargaBeli:100}],purchaseOrders:[],transactions:[],accounts:[{id:'a1'}],shopInventoryLedger:[]};
  const c=loadSource(['modules/shop/shop-professional-audit.js',
    'modules/shop/shop-inventory-ledger.js','modules/shop/generic/product-repository.js','modules/shop/business-flow-presenter-inventory.js'],{D,save(){},toast(){}},['ShopInventoryLedger','ProductRepository','BusinessFlowPresenterInventoryMixin']);
  const presenter=Object.assign({},c.BusinessFlowPresenterInventoryMixin,{renderMovement(){},render(){},renderTab(){}});
  const po=presenter.createPurchaseOrder({productId:'p1',qty:5});
  const a=presenter.receivePurchaseOrder(po.purchase.id,2);
  assert.equal(a.ok,true); assert.equal(a.purchase.status,'PARTIAL'); assert.equal(D.products[0].stock,2); assert.equal(D.transactions.length,1);
  const b=presenter.receivePurchaseOrder(po.purchase.id);
  assert.equal(b.ok,true); assert.equal(b.purchase.status,'RECEIVED'); assert.equal(D.products[0].stock,5); assert.equal(D.transactions.length,2);
  assert.equal(c.ShopInventoryLedger.reconcileProduct('p1',D.products[0]).status,'PASS');
});


test('S1931 audit backup legacy tidak mengarang COGS/ledger dan memberi status gap', () => {
  const D={
    products:[{id:'p1',stock:3},{id:'p2',stock:0}],
    cobek:[{id:'s1',items:[{productId:'p1',qty:2,harga:10}],total:20}],
    purchaseOrders:[], shopInventoryLedger:[], productStockCorrections:[{productId:'p1',delta:3}], transactions:[{id:'t1',stockProductId:'p1',stockQty:3}]
  };
  const c=loadSource(['modules/shop/shop-professional-audit.js','modules/shop/shop-inventory-ledger.js'],{D},['ShopProfessionalAudit','ShopInventoryLedger']);
  const a=c.ShopProfessionalAudit.inspect(D);
  assert.equal(a.counts.sales,1);
  assert.equal(a.legacySales[0].status,'UNVERIFIED_HISTORICAL_COST');
  assert.equal(a.certification.historicalCogsComplete,false);
  assert.equal(a.certification.purchaseLifecyclePresent,false);
  assert.equal(a.certification.fullyTraceable,false);
  assert.ok(a.warnings.includes('PURCHASE_ORDER_HISTORY_ABSENT'));
  assert.equal(a.certification.ledgerCoverage,false);
  assert.equal(a.untrackedProducts.length,2);
});

test('S1931 PO cost snapshot dipakai receiving, bukan harga master yang berubah', () => {
  const D={products:[{id:'p1',name:'A',stock:0,hargaBeli:100}],purchaseOrders:[],transactions:[],accounts:[{id:'a1'}],shopInventoryLedger:[]};
  const c=loadSource(['modules/shop/shop-professional-audit.js','modules/shop/shop-inventory-ledger.js','modules/shop/generic/product-repository.js','modules/shop/business-flow-presenter-inventory.js'],{D,save(){},toast(){}},['ShopProfessionalAudit','ShopInventoryLedger','ProductRepository','BusinessFlowPresenterInventoryMixin']);
  const presenter=Object.assign({},c.BusinessFlowPresenterInventoryMixin,{renderMovement(){},render(){},renderTab(){}});
  const po=presenter.createPurchaseOrder({productId:'p1',qty:2,unitCost:70});
  D.products[0].hargaBeli=120;
  const r=presenter.receivePurchaseOrder(po.purchase.id);
  assert.equal(r.ok,true);
  assert.equal(r.purchase.receipts[0].unitCost,70);
  assert.equal(D.transactions[0].amount,140);
});
