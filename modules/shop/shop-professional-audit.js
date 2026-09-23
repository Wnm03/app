// shop-professional-audit.js — S1931 accumulated professional/SOT audit.
// Read-only evidence classifier. It NEVER invents historical ledger/COGS data.
const ShopProfessionalAudit = {
  _arr(v){ return Array.isArray(v) ? v : []; },
  _num(v){ const n=Number(v); return Number.isFinite(n) ? n : null; },
  inspect(data){
    const D0 = data || (typeof D !== 'undefined' ? D : {});
    const products=this._arr(D0.products), sales=this._arr(D0.cobek), pos=this._arr(D0.purchaseOrders), ledger=this._arr(D0.shopInventoryLedger);
    const corrections=this._arr(D0.productStockCorrections), tx=this._arr(D0.transactions);
    const legacySales=sales.map(s=>{
      const items=this._arr(s && s.items);
      const costComplete=items.length>0 && items.every(i=>this._num(i.unitCost)!==null && this._num(i.cogs)!==null);
      return {id:s&&s.id,status:costComplete?'VERIFIED':'UNVERIFIED_HISTORICAL_COST',itemCount:items.length};
    });
    const trackedIds=new Set(ledger.map(x=>x&&x.productId).filter(Boolean));
    const untrackedProducts=products.filter(p=>p&&p.id&&!trackedIds.has(p.id)).map(p=>p.id);
    const stockLinkedTx=tx.filter(t=>t&&t.stockProductId);
    const stockLinkedWithoutLedger=stockLinkedTx.filter(t=>!trackedIds.has(t.stockProductId)).map(t=>t.id);
    const reconciliation=(typeof ShopInventoryLedger!=='undefined') ? ShopInventoryLedger.reconcileAll(products) : [];
    return {
      schemaVersion:1,
      generatedAt:new Date().toISOString(),
      counts:{products:products.length,sales:sales.length,purchaseOrders:pos.length,ledgerEntries:ledger.length,stockCorrections:corrections.length,stockLinkedTransactions:stockLinkedTx.length},
      legacySales,
      untrackedProducts,
      stockLinkedWithoutLedger,
      reconciliation,
      certification:{
        ledgerCoverage:products.length>0 && untrackedProducts.length===0,
        historicalCogsComplete:legacySales.every(x=>x.status==='VERIFIED'),
        purchaseLifecyclePresent:pos.length>0,
        fullyTraceable:products.length>0 && ledger.length>0 && untrackedProducts.length===0 && legacySales.every(x=>x.status==='VERIFIED') && pos.length>0
      },
      governance:(typeof ShopSotGovernance!=='undefined' ? ShopSotGovernance.certify() : null),
      dashboard:(typeof ShopSotGovernance!=='undefined' ? ShopSotGovernance.dashboard() : null),
      warnings:[
        ...(untrackedProducts.length?[`STOK_LEGACY_UNTRACKED:${untrackedProducts.length}`]:[]),
        ...(legacySales.some(x=>x.status!=='VERIFIED')?[`SALES_HISTORICAL_COST_UNVERIFIED:${legacySales.filter(x=>x.status!=='VERIFIED').length}`]:[]),
        ...(!pos.length?['PURCHASE_ORDER_HISTORY_ABSENT']:[]),
        ...(corrections.length?[`LEGACY_STOCK_CORRECTIONS:${corrections.length}`]:[]),
        ...(stockLinkedWithoutLedger.length?[`STOCK_TX_WITHOUT_LEDGER:${stockLinkedWithoutLedger.length}`]:[])
      ]
    };
  }
};
