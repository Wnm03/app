// shop-inventory-ledger.js — Shop Professional/SOT Audit (S1930)
// One append-only evidence ledger for every stock mutation that passes
// ProductRepository stock gates. It does NOT replace D.products.stock yet;
// stock remains the runtime snapshot for backward compatibility. The ledger
// makes each change auditable and allows reconciliation: openingStock + sum
// of deltas = current stock.
const ShopInventoryLedger = {
  _ensure() {
    if (typeof D === 'undefined') return null;
    if (!Array.isArray(D.shopInventoryLedger)) D.shopInventoryLedger = [];
    return D.shopInventoryLedger;
  },
  hasIdempotencyKey(key) {
    if (!key) return false;
    const list = this._ensure();
    return !!(list && list.some(x => x && x.idempotencyKey === key));
  },
  record({ productId, before, after, delta, source='adjustment', reason='', refType='', refId='', idempotencyKey='', actor='local-user', at } = {}) {
    const list = this._ensure();
    if (!list || !productId) return { ok:false, reason:'ledger tidak tersedia' };
    if (idempotencyKey && this.hasIdempotencyKey(idempotencyKey)) {
      return { ok:true, duplicate:true, entry:list.find(x => x.idempotencyKey === idempotencyKey) || null };
    }
    const b = Number(before), a = Number(after), d = Number(delta);
    if (![b,a,d].every(Number.isFinite)) return { ok:false, reason:'stock movement bukan angka finite' };
    const previous = list.filter(x => x && x.productId === productId).slice(-1)[0];
    const entry = {
      id: 'sim_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
      productId, before:b, after:a, delta:d,
      openingStock: previous ? undefined : b,
      source, reason, refType, refId, idempotencyKey:idempotencyKey || null,
      actor, at:at || new Date().toISOString()
    };
    list.push(entry);
    return { ok:true, entry };
  },
  reconcileProduct(productId, product) {
    const list=this._ensure() || [];
    const rows=list.filter(x=>x && x.productId===productId);
    if (!rows.length) return {ok:false,status:'UNTRACKED',productId,actual:product ? Number(product.stock)||0 : null,expected:null,movementCount:0};
    const opening=Number(rows[0].openingStock);
    const delta=rows.reduce((s,x)=>s+(Number(x.delta)||0),0);
    const expected=opening+delta;
    const actual=product ? Number(product.stock)||0 : null;
    const diff=actual===null ? null : actual-expected;
    return {ok:diff===0,status:diff===0?'PASS':'MISMATCH',productId,opening,delta,expected,actual,diff,movementCount:rows.length,lastMovement:rows[rows.length-1]};
  },
  reconcileAll(products) {
    const ps=Array.isArray(products)?products:((typeof D!=='undefined'&&Array.isArray(D.products))?D.products:[]);
    const ids=new Set(ps.map(p=>p&&p.id).filter(Boolean));
    const ledger=this._ensure()||[];
    ledger.forEach(x=>{if(x&&x.productId)ids.add(x.productId);});
    return Array.from(ids).map(id=>this.reconcileProduct(id,ps.find(p=>p&&p.id===id)||null));
  },
  auditTrail(productId) {
    const list=this._ensure()||[];
    return productId ? list.filter(x=>x&&x.productId===productId) : list.slice();
  }
};
