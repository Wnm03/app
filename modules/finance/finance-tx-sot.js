// finance-tx-sot.js — Single Source of Truth mutation gateway for D.transactions.
// Design lock: storage/schema/transaction shape remain unchanged. This module only
// centralizes mutation authority; existing callers keep the same object semantics.
(function(g){
  'use strict';
  function getD(){
    // `D` adalah top-level lexical binding (`let D`), bukan properti globalThis.
    // Gunakan lexical D lebih dulu; fallback g.D mempertahankan kompatibilitas
    // dengan harness/test yang memang menyuntikkan globalThis.D.
    const d=typeof D!=='undefined'?D:g.D;
    if(!d) throw new Error('FinanceTxSOT: D belum tersedia');
    if(!Array.isArray(d.transactions)) d.transactions=[];
    return d;
  }
  function normalizeId(id){ return id==null?'':String(id); }
  function create(tx){
    if(!tx || typeof tx!=='object') throw new TypeError('FinanceTxSOT.create membutuhkan object transaksi');
    const d=getD();
    d.transactions.push(tx);
    return tx;
  }
  function createMany(rows){
    if(!Array.isArray(rows)) throw new TypeError('FinanceTxSOT.createMany membutuhkan array');
    rows.forEach(create);
    return rows;
  }
  function findById(id){
    const key=normalizeId(id);
    if(!key) return null;
    return getD().transactions.find(t=>t&&normalizeId(t.id)===key)||null;
  }
  function updateById(id,patch){
    const tx=findById(id);
    if(!tx || !patch || typeof patch!=='object') return tx;
    Object.assign(tx,patch);
    return tx;
  }
  function removeById(id){
    const d=getD(), key=normalizeId(id);
    if(!key) return null;
    const idx=d.transactions.findIndex(t=>t&&normalizeId(t.id)===key);
    if(idx<0) return null;
    return d.transactions.splice(idx,1)[0]||null;
  }
  function removeWhere(predicate){
    if(typeof predicate!=='function') throw new TypeError('FinanceTxSOT.removeWhere membutuhkan predicate');
    const d=getD(), removed=[];
    for(let i=d.transactions.length-1;i>=0;i--){
      const tx=d.transactions[i];
      if(predicate(tx)) removed.push(d.transactions.splice(i,1)[0]);
    }
    removed.reverse();
    return removed;
  }
  function replaceSnapshot(rows){
    if(!Array.isArray(rows)) throw new TypeError('FinanceTxSOT.replaceSnapshot membutuhkan array');
    const d=getD();
    d.transactions.splice(0,d.transactions.length,...rows);
    return d.transactions;
  }
  function snapshot(){ return getD().transactions.slice(); }
  const api={create,createMany,findById,updateById,removeById,removeWhere,replaceSnapshot,snapshot};
  g.FinanceTxSOT=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:window);
