// finance-tx-sot.js — Single Source of Truth mutation gateway for D.transactions.
// S2503: Finance income/expense mutations are canonicalized through FinanceCategorySOT.
// Storage/schema remains unchanged; legacy labels are retained for display compatibility.
(function(g){
  'use strict';
  function getD(){
    const d=typeof D!=='undefined'?D:g.D;
    if(!d) throw new Error('FinanceTxSOT: D belum tersedia');
    if(!Array.isArray(d.transactions)) d.transactions=[];
    return d;
  }
  function normalizeId(id){ return id==null?'':String(id); }
  function getTaxonomy(){
    const sot=typeof FinanceCategorySOT!=='undefined'?FinanceCategorySOT:g.FinanceCategorySOT;
    if(!sot||typeof sot.resolve!=='function') throw new Error('FinanceCategorySOT wajib tersedia sebelum mutasi transaksi Finance');
    return sot;
  }
  function isFinanceType(type){ return type==='income'||type==='expense'; }
  function canonicalizeFinanceTx(tx, hints){
    if(!tx||typeof tx!=='object'||!isFinanceType(tx.type)) return tx;
    const hasTaxonomyFields=Object.prototype.hasOwnProperty.call(tx,'category')||
      Object.prototype.hasOwnProperty.call(tx,'categoryId')||
      Object.prototype.hasOwnProperty.call(tx,'subcategory')||
      Object.prototype.hasOwnProperty.call(tx,'subcategoryId');
    // Sparse technical transactions (e.g. legacy/system rows without a
    // category field) are not guessed into a taxonomy bucket.
    if(!hasTaxonomyFields)return tx;
    const sot=getTaxonomy();
    const h=hints||{};
    const categoryExplicit=!!h.category;
    const subcategoryExplicit=!!h.subcategory;
    // Category-only edits intentionally clear the previous subcategory before
    // resolving. The old subcategory belongs to the previous category and must
    // never be carried into the new category as an implicit reference.
    if(categoryExplicit&&!subcategoryExplicit){
      delete tx.subcategoryId;
      tx.subcategory='';
    }
    const input={
      type:tx.type,
      // Explicit ID is authoritative only when the caller supplied the ID.
      categoryId:h.categoryId?tx.categoryId:null,
      subcategoryId:h.subcategoryId?tx.subcategoryId:null,
      category:categoryExplicit?tx.category:tx.category,
      subcategory:subcategoryExplicit?tx.subcategory:tx.subcategory
    };
    // A renamed category/subcategory must resolve by its new label instead of
    // accidentally preserving the previous ID.
    if(categoryExplicit&&!h.categoryId) input.categoryId=null;
    if(subcategoryExplicit&&!h.subcategoryId) input.subcategoryId=null;
    const resolved=sot.resolve(input);
    if(!resolved.ok||!resolved.categoryId){
      throw new Error('FINANCE_CATEGORY_UNRESOLVED');
    }
    tx.categoryId=resolved.categoryId;
    tx.category=resolved.categoryName;
    if(resolved.subcategoryId){
      tx.subcategoryId=resolved.subcategoryId;
      tx.subcategory=resolved.subcategoryName;
    }else{
      delete tx.subcategoryId;
      if(tx.subcategory==null||subcategoryExplicit||categoryExplicit)tx.subcategory='';
    }
    return tx;
  }
  function create(tx){
    if(!tx || typeof tx!=='object') throw new TypeError('FinanceTxSOT.create membutuhkan object transaksi');
    const d=getD();
    canonicalizeFinanceTx(tx);
    d.transactions.push(tx);
    return tx;
  }
  function createMany(rows){
    if(!Array.isArray(rows)) throw new TypeError('FinanceTxSOT.createMany membutuhkan array');
    // Validate/canonicalize every row before mutating storage: atomic at the
    // SOT boundary even when one imported row is invalid.
    const prepared=rows.map(row=>{
      if(!row||typeof row!=='object') throw new TypeError('FinanceTxSOT.createMany berisi row tidak valid');
      // Clone before canonicalization so a rejected batch cannot mutate caller-owned
      // objects even though storage itself remains unchanged.
      const copy=JSON.parse(JSON.stringify(row));
      canonicalizeFinanceTx(copy);
      return copy;
    });
    getD().transactions.push(...prepared);
    return prepared;
  }
  function findById(id){
    const key=normalizeId(id);
    if(!key) return null;
    return getD().transactions.find(t=>t&&normalizeId(t.id)===key)||null;
  }
  function updateById(id,patch){
    const tx=findById(id);
    if(!tx || !patch || typeof patch!=='object') return tx;
    const before={...tx};
    Object.assign(tx,patch);
    try{
      canonicalizeFinanceTx(tx,{
        category:Object.prototype.hasOwnProperty.call(patch,'category'),
        categoryId:Object.prototype.hasOwnProperty.call(patch,'categoryId'),
        subcategory:Object.prototype.hasOwnProperty.call(patch,'subcategory'),
        subcategoryId:Object.prototype.hasOwnProperty.call(patch,'subcategoryId')
      });
    }catch(err){
      Object.keys(tx).forEach(k=>delete tx[k]);
      Object.assign(tx,before);
      throw err;
    }
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
    // Restore/import is a hard canonical boundary. Validate the full snapshot
    // before replacing the durable array so a bad row cannot partially restore.
    const prepared=rows.map(row=>{
      if(!row||typeof row!=='object') throw new TypeError('FinanceTxSOT.replaceSnapshot berisi row tidak valid');
      const copy=JSON.parse(JSON.stringify(row));
      canonicalizeFinanceTx(copy);
      return copy;
    });
    const d=getD();
    d.transactions.splice(0,d.transactions.length,...prepared);
    return d.transactions;
  }
  function snapshot(){ return getD().transactions.slice(); }
  const api={create,createMany,findById,updateById,removeById,removeWhere,replaceSnapshot,snapshot};
  g.FinanceTxSOT=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:window);
