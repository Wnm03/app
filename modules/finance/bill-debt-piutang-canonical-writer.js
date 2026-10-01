// Canonical mutation boundary for Finance Bill/Debt/Piutang state.
// S2186: centralizes writes only; domain rules remain in existing modules.
var BillDebtPiutangCanonicalWriter = (function(){
  'use strict';
  function arr(key){
    if(!Array.isArray(D[key])) D[key]=[];
    return D[key];
  }
  function same(a,b){
    if(typeof sameId==='function')return sameId(a,b);
    return String(a)===String(b);
  }
  function ensure(){
    arr('bills');arr('billsArchive');arr('debts');arr('piutang');
    return true;
  }
  function add(key,row){
    if(!row||row.id==null)throw new Error('canonical writer: '+key+' row requires id');
    const list=arr(key);
    if(list.some(x=>x&&same(x.id,row.id)))throw new Error('canonical writer: duplicate '+key+' id '+row.id);
    list.push(row); return row;
  }
  function updateById(key,id,mutator){
    const list=arr(key), idx=list.findIndex(x=>x&&same(x.id,id));
    if(idx<0)return null;
    const row=list[idx];
    if(typeof mutator==='function')mutator(row,idx);
    return row;
  }
  function removeById(key,id){
    const list=arr(key), before=list.length;
    D[key]=list.filter(x=>!(x&&same(x.id,id)));
    return before-D[key].length;
  }
  function removeByPredicate(key,predicate){
    const list=arr(key), before=list.length;
    D[key]=list.filter((x,i)=>!predicate(x,i));
    return before-D[key].length;
  }
  function replace(key,next){
    D[key]=Array.isArray(next)?next:[];
    return D[key];
  }
  function moveById(fromKey,toKey,id,transform){
    const list=arr(fromKey), idx=list.findIndex(x=>x&&same(x.id,id));
    if(idx<0)return null;
    const row=list[idx];
    const destination=arr(toKey);
    if(destination.some(x=>x&&same(x.id,row.id))) throw new Error('canonical writer: duplicate '+toKey+' id '+row.id);
    const next=typeof transform==='function'?transform(row):row;
    if(next && destination.some(x=>x&&same(x.id,next.id))) throw new Error('canonical writer: duplicate '+toKey+' id '+next.id);
    if(!next)return null;
    list.splice(idx,1);
    destination.push(next);
    return next;
  }
  return {ensure,add,updateById,removeById,removeByPredicate,replace,moveById,same};
})();
if(typeof window!=='undefined')window.BillDebtPiutangCanonicalWriter=BillDebtPiutangCanonicalWriter;
if(typeof module!=='undefined'&&module.exports)module.exports=BillDebtPiutangCanonicalWriter;
