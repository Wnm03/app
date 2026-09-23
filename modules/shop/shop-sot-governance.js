// shop-sot-governance.js — S1932-S1940 cumulative Shop Professional/SOT governance.
// Backward-compatible: legacy fields remain valid; this layer adds evidence,
// cutover, returns/adjustments/opname, explicit cost policy, finance links and certification.
const ShopSotGovernance = {
  _D(data){ return data || (typeof D !== 'undefined' ? D : {}); },
  _arr(v){ return Array.isArray(v) ? v : []; },
  _num(v, d=0){ const n=Number(v); return Number.isFinite(n) ? n : d; },
  _now(){ return new Date().toISOString(); },
  _id(prefix){ return prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); },
  _ensure(D0){
    if(!Array.isArray(D0.shopInventoryLedger))D0.shopInventoryLedger=[];
    if(!Array.isArray(D0.shopStockAdjustments))D0.shopStockAdjustments=[];
    if(!Array.isArray(D0.shopStockOpnames))D0.shopStockOpnames=[];
    if(!Array.isArray(D0.shopReturns))D0.shopReturns=[];
    if(!Array.isArray(D0.shopAuditTrail))D0.shopAuditTrail=[];
    if(!D0.shopCostPolicy)D0.shopCostPolicy={version:1,method:'SNAPSHOT',label:'Historical unit cost snapshot'};
    return D0;
  },
  _audit(D0, action, refType, refId, before, after, reason=''){
    this._ensure(D0).shopAuditTrail.push({id:this._id('audit'),at:this._now(),action,refType,refId:refId||null,before:before===undefined?null:before,after:after===undefined?null:after,reason,actor:'local-user'});
  },

  // S1932 — legacy cutover. Creates an explicit zero-delta opening evidence row.
  establishOpeningBalance(productId, {stock, unitCost=0, reason='Legacy stock cutover', at}={}){
    const D0=this._ensure(this._D()); const p=this._arr(D0.products).find(x=>x&&x.id===productId);
    if(!p)return{ok:false,reason:'Produk tidak ditemukan'};
    const q=this._num(stock,NaN); if(!Number.isFinite(q)||q<0)return{ok:false,reason:'Opening stock tidak valid'};
    const cost=this._num(unitCost,0); if(cost<0)return{ok:false,reason:'Opening cost tidak valid'};
    const exists=this._arr(D0.shopInventoryLedger).find(x=>x&&x.productId===productId&&x.source==='opening-balance');
    if(exists)return{ok:true,duplicate:true,entry:exists};
    const before=this._num(p.stock,0);
    // Opening balance is an explicit cutover snapshot; do not silently rewrite stock.
    const entry={id:this._id('open'),productId,before,after:before,delta:0,openingStock:q,openingUnitCost:cost,source:'opening-balance',reason,refType:'legacy-cutover',refId:productId,idempotencyKey:'opening:'+productId,at:at||this._now(),actor:'local-user'};
    D0.shopInventoryLedger.push(entry);
    p.shopOpeningStock=q; p.shopOpeningUnitCost=cost; p.shopSotStatus='OPENING_BALANCE'; p.shopOpeningAt=entry.at;
    this._audit(D0,'OPENING_BALANCE','product',productId,null,{stock:q,unitCost:cost},reason);
    return{ok:true,entry};
  },

  // S1933 — receiving guard. Existing receiving remains the mutation SOT; this API
  // provides a transaction-safe orchestration point for callers that do not use UI.
  receivePurchase(purchaseId, qty){
    const D0=this._ensure(this._D());
    if(typeof BusinessFlowPresenterInventoryMixin==='undefined'||typeof ProductRepository==='undefined')return{ok:false,reason:'Purchase/stock engine belum dimuat'};
    const snapshot={purchaseOrders:JSON.stringify(D0.purchaseOrders||[]),products:JSON.stringify(D0.products||[]),transactions:JSON.stringify(D0.transactions||[]),ledger:JSON.stringify(D0.shopInventoryLedger||[])};
    try{
      // Keep UI rendering outside the mutation contract: the existing mixin's
      // renderMovement() is presentation-only and may depend on a full UI context.
      const presenter=Object.assign({},BusinessFlowPresenterInventoryMixin,{renderMovement(){} });
      const r=presenter.receivePurchaseOrder(purchaseId,qty);
      if(!r||!r.ok)return r||{ok:false,reason:'Receiving gagal'};
      this._audit(D0,'RECEIVE','purchaseOrder',purchaseId,null,r.purchase,'PO receiving');
      return r;
    }catch(e){
      try{
        D0.purchaseOrders=JSON.parse(snapshot.purchaseOrders); D0.products=JSON.parse(snapshot.products);
        D0.transactions=JSON.parse(snapshot.transactions); D0.shopInventoryLedger=JSON.parse(snapshot.ledger);
      }catch(_){/* no-op */}
      return{ok:false,reason:e&&e.message?e.message:'Receiving gagal'};
    }
  },

  // S1934 — explicit return/cancellation evidence. Stock is restored exactly once.
  returnSale(saleId,{reason='Sale return',qtyByProduct}={}){
    const D0=this._ensure(this._D()); const sale=this._arr(D0.cobek).find(x=>x&&x.id===saleId);
    if(!sale)return{ok:false,reason:'Penjualan tidak ditemukan'};
    if(D0.shopReturns.some(x=>x&&x.saleId===saleId&&x.status==='POSTED'))return{ok:true,duplicate:true,return:D0.shopReturns.find(x=>x.saleId===saleId&&x.status==='POSTED')};
    const items=this._arr(sale.items); if(!items.length)return{ok:false,reason:'Penjualan tidak memiliki item'};
    const requested=qtyByProduct||{}; const posted=[];
    for(const it of items){
      const qty=Math.min(this._num(requested[it.productId],it.qty),this._num(it.qty,0));
      if(qty<=0)continue;
      const p=this._arr(D0.products).find(x=>x&&x.id===it.productId); if(!p)return{ok:false,reason:'Produk return tidak ditemukan'};
      const key='return:'+saleId+':'+it.productId;
      const r=ProductRepository.mutateStockDelta(p,qty,{source:'sale-return',reason,refType:'shopReturn',refId:saleId,idempotencyKey:key});
      if(!r.ok)return r;
      posted.push({productId:it.productId,qty,unitCost:this._num(it.unitCost,0),cogsReversal:this._num(it.unitCost,0)*qty});
    }
    const totalCogsReversal=posted.reduce((s,x)=>s+x.cogsReversal,0);
    const rec={id:this._id('ret'),saleId,status:'POSTED',date:this._now(),items:posted,totalCogsReversal,reason};
    D0.shopReturns.push(rec);
    sale.returnStatus=posted.length?'PARTIAL_OR_FULL':'NONE'; sale.returnCogsReversed=(this._num(sale.returnCogsReversed,0)+totalCogsReversal);
    this._audit(D0,'SALE_RETURN','shopSale',saleId,null,rec,reason);
    return{ok:true,return:rec};
  },

  // S1935 — explicit cost policy. SNAPSHOT preserves current historical behavior.
  setCostPolicy(method='SNAPSHOT'){
    const allowed=['SNAPSHOT','FIFO','WEIGHTED_AVERAGE'];
    if(!allowed.includes(method))return{ok:false,reason:'Metode COGS tidak didukung'};
    const D0=this._ensure(this._D()); const before=D0.shopCostPolicy;
    D0.shopCostPolicy={version:1,method,label:method==='SNAPSHOT'?'Historical unit cost snapshot':method==='FIFO'?'FIFO':'Weighted average',updatedAt:this._now()};
    this._audit(D0,'COST_POLICY','shop','cost-policy',before,D0.shopCostPolicy,'Explicit COGS policy');
    return{ok:true,policy:D0.shopCostPolicy};
  },
  cogsForSale(sale){
    const s=sale||{}; const items=this._arr(s.items);
    return{method:(this._D().shopCostPolicy||{method:'SNAPSHOT'}).method||'SNAPSHOT',totalCogs:items.reduce((sum,it)=>sum+this._num(it.cogs,this._num(it.unitCost,0)*this._num(it.qty,0)),0)};
  },

  // S1936 — all governed manual stock changes carry reason/evidence and ledger entry.
  adjustStock(productId, delta, {reason='Manual stock adjustment',type='ADJUSTMENT',refType='stockAdjustment',refId='',idempotencyKey}={}){
    const D0=this._ensure(this._D()); const p=this._arr(D0.products).find(x=>x&&x.id===productId);
    if(!p)return{ok:false,reason:'Produk tidak ditemukan'};
    const d=this._num(delta,NaN); if(!Number.isFinite(d)||d===0)return{ok:false,reason:'Delta adjustment tidak valid'};
    if(!reason||!String(reason).trim())return{ok:false,reason:'Alasan adjustment wajib diisi'};
    const key=idempotencyKey||this._id('adj-key');
    const r=typeof ProductRepository!=='undefined'?ProductRepository.mutateStockDelta(p,d,{source:'stock-adjustment',reason,refType,refId,idempotencyKey:key}):{ok:false,reason:'ProductRepository belum dimuat'};
    if(!r.ok)return r;
    const rec={id:this._id('adj'),productId,delta:d,type,reason,refType,refId:idempotencyKey||refId,at:this._now(),before:r.stock-d,after:r.stock,ledgerId:r.ledger&&r.ledger.entry?r.ledger.entry.id:null,status:'POSTED'};
    D0.shopStockAdjustments.push(rec); this._audit(D0,'STOCK_ADJUSTMENT','product',productId,rec.before,rec.after,reason);
    return{ok:true,adjustment:rec};
  },

  // S1937 — physical stock opname workflow.
  startOpname({note='',at}={}){ const D0=this._ensure(this._D()); const o={id:this._id('opname'),status:'COUNTING',startedAt:at||this._now(),note,lines:[]}; D0.shopStockOpnames.push(o); this._audit(D0,'OPNAME_START','opname',o.id,null,o,note); return{ok:true,opname:o}; },
  countOpname(opnameId, productId, physicalQty){
    const D0=this._ensure(this._D()); const o=D0.shopStockOpnames.find(x=>x&&x.id===opnameId); const p=D0.products&&D0.products.find(x=>x&&x.id===productId);
    const q=this._num(physicalQty,NaN); if(!o||!p||!Number.isFinite(q)||q<0)return{ok:false,reason:'Data opname tidak valid'};
    const line={productId,systemQty:this._num(p.stock,0),physicalQty:q,difference:q-this._num(p.stock,0),countedAt:this._now()}; const old=o.lines.find(x=>x.productId===productId); if(old)Object.assign(old,line);else o.lines.push(line); return{ok:true,line};
  },
  approveOpname(opnameId){
    const D0=this._ensure(this._D()); const o=D0.shopStockOpnames.find(x=>x&&x.id===opnameId); if(!o)return{ok:false,reason:'Opname tidak ditemukan'}; if(o.status==='APPROVED')return{ok:true,duplicate:true,opname:o};
    const applied=[]; for(const l of this._arr(o.lines)){if(l.difference!==0){const r=this.adjustStock(l.productId,l.difference,{reason:'Stock opname '+o.id,type:'OPNAME',refType:'opname',refId:o.id,idempotencyKey:'opname:'+o.id+':'+l.productId});if(!r.ok)return r;applied.push(r.adjustment);}}
    o.status='APPROVED'; o.approvedAt=this._now(); o.adjustments=applied; this._audit(D0,'OPNAME_APPROVE','opname',o.id,null,o,'Physical reconciliation'); return{ok:true,opname:o};
  },

  // S1938 — finance ↔ Shop reconciliation; never assumes an unrelated transaction is a Shop event.
  reconcileFinance(){
    const D0=this._D(), sales=this._arr(D0.cobek), purchases=this._arr(D0.purchaseOrders), tx=this._arr(D0.transactions);
    const saleRows=sales.map(s=>({id:s.id,linked:tx.some(t=>t&&t.cobekLinkId===s.id),txId:(tx.find(t=>t&&t.cobekLinkId===s.id)||{}).id||null}));
    const purchaseRows=purchases.map(p=>({id:p.id,linked:tx.some(t=>t&&t.shopPurchaseId===p.id),txIds:tx.filter(t=>t&&t.shopPurchaseId===p.id).map(t=>t.id)}));
    return{sales:saleRows,purchases:purchaseRows,unlinkedSales:saleRows.filter(x=>!x.linked).map(x=>x.id),unlinkedPurchases:purchaseRows.filter(x=>!x.linked&&purchases.length).map(x=>x.id),status:(saleRows.every(x=>x.linked)&&purchaseRows.every(x=>x.linked))?'PASS':'GAP'};
  },

  // S1939 — certification is evidence-based, never backfills history.
  certify(){
    const D0=this._ensure(this._D()); const products=this._arr(D0.products), ledger=this._arr(D0.shopInventoryLedger), sales=this._arr(D0.cobek), pos=this._arr(D0.purchaseOrders);
    const recon=typeof ShopInventoryLedger!=='undefined'?ShopInventoryLedger.reconcileAll(products):[];
    const tracked=products.filter(p=>ledger.some(l=>l&&l.productId===p.id)).length;
    const costComplete=sales.filter(Boolean).every(s=>this._arr(s.items).every(i=>this._num(i.unitCost,null)!==null&&this._num(i.cogs,null)!==null));
    const finance=this.reconcileFinance();
    let status='LEGACY_UNTRACKED';
    if(products.length&&tracked===products.length&&costComplete&&finance.status==='PASS'&&recon.every(r=>r.status==='PASS'))status='VERIFIED';
    else if(tracked>0||sales.length||pos.length)status='PARTIALLY_VERIFIED';
    if(recon.some(r=>r.status==='MISMATCH'))status='CONFLICT';
    return{status,cutoverRequired:products.some(p=>!ledger.some(l=>l&&l.productId===p.id)),ledgerCoverage:products.length?tracked/products.length:1,historicalCogsComplete:costComplete,finance,reconciliation:recon};
  },

  // S1940 — compact dashboard model; UI may render it without recomputing business rules.
  dashboard(){ const D0=this._ensure(this._D()); const cert=this.certify(); return{title:'Shop Professional SOT',certification:cert.status,ledger:{entries:D0.shopInventoryLedger.length},purchase:{orders:this._arr(D0.purchaseOrders).length},sales:{orders:this._arr(D0.cobek).length},cogs:{policy:(D0.shopCostPolicy||{}).method||'SNAPSHOT',complete:cert.historicalCogsComplete},reconciliation:{status:cert.finance.status,stock:cert.reconciliation.every(r=>r.status==='PASS')?'PASS':'GAP'},auditTrail:D0.shopAuditTrail.length,legacy:{cutoverRequired:cert.cutoverRequired}}; }
};
if(typeof window!=='undefined')window.ShopSotGovernance=ShopSotGovernance;
