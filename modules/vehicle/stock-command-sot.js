/* S2152 P4.1 — Stock Command SOT.
 * One write gateway for stock mutations. Storage remains D.partsStock;
 * this module is the command boundary, not a second store.
 */
(function(g){'use strict';
  const VERSION='STOCK-COMMAND-SOT-V1';
  function ensureStorage(){
    const d=(typeof D!=='undefined')?D:g.D;
    if(!d)return null;
    if(!Array.isArray(d.partsStock))d.partsStock=[];
    return d.partsStock;
  }
  const arr=()=>ensureStorage()||[];
  const str=v=>String(v==null?'':v).trim();
  const clone=v=>JSON.parse(JSON.stringify(v));
  function idOf(p){return p&&p.id!=null?str(p.id):'';}
  function find(id){const sid=str(id);return arr().find(p=>p&&idOf(p)===sid)||null;}
  function ensureId(part){if(part&&str(part.id))return part.id; if(typeof _genId==='function')return 'st_'+_genId(); return 'st_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
  function create(part,{saveNow=false}={}){
    if(!part||typeof part!=='object')return {ok:false,code:'INVALID_PART'};
    const p=clone(part); p.id=ensureId(p);
    if(find(p.id))return {ok:false,code:'DUPLICATE_ID',id:p.id};
    arr().push(p); if(saveNow&&typeof save==='function')save();
    return {ok:true,part:p,created:true};
  }
  function update(id,patch,{saveNow=false}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    if(!patch||typeof patch!=='object')return {ok:false,code:'INVALID_PATCH',id:p.id};
    const before=clone(p); Object.keys(patch).forEach(k=>{if(k!=='id')p[k]=patch[k];});
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:p,before,changed:JSON.stringify(before)!==JSON.stringify(p)};
  }
  function adjustQty(id,delta,{reason='adjustment',source='stock-command-sot',journal=true,saveNow=false}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    const d=Number(delta); if(!Number.isFinite(d))return {ok:false,code:'INVALID_DELTA',id:p.id};
    const before=Number(p.qty)||0, after=before+d;
    if(after<0)return {ok:false,code:'INSUFFICIENT_STOCK',id:p.id,beforeQty:before,requestedDelta:d};
    return setQty(id,after,{reason,source,journal,saveNow});
  }
  function consume(id,qty,{reason='service-usage',source='stock-command-sot',allowNegative=false,journal=true,saveNow=false}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    const q=Number(qty); if(!Number.isFinite(q)||q<=0)return {ok:false,code:'INVALID_QTY',id:p.id};
    const before=Number(p.qty)||0; if(!allowNegative&&before<q)return {ok:false,code:'INSUFFICIENT_STOCK',id:p.id,beforeQty:before,requestedQty:q};
    return setQty(id,before-q,{reason,source,journal,saveNow});
  }
  function applyDeltas(deltas,{reason='batch-adjustment',source='stock-command-sot',saveNow=false}={}){
    const rows=Array.isArray(deltas)?deltas.filter(x=>x&&x.id!=null&&Number.isFinite(Number(x.delta))&&Number(x.delta)!==0).map(x=>({id:str(x.id),delta:Number(x.delta)})):[];
    const before=new Map();
    for(const x of rows){const p=find(x.id);if(!p)return {ok:false,code:'PART_NOT_FOUND',id:x.id,rolledBack:false};if(!before.has(x.id))before.set(x.id,Number(p.qty)||0);}
    const changed=[];
    try{
      for(const x of rows){const r=adjustQty(x.id,x.delta,{reason,source,journal:true,saveNow:false});if(!r.ok)throw Object.assign(new Error(r.code||'STOCK_DELTA_FAILED'),{result:r});changed.push(r);}
      if(saveNow&&typeof save==='function')save();
      return {ok:true,changed,before:Object.fromEntries(before)};
    }catch(err){
      for(const [id,qty] of before){const p=find(id);if(p)p.qty=qty;}
      return {ok:false,code:'BATCH_ROLLBACK',error:err&&err.message||String(err),rolledBack:true,before:Object.fromEntries(before)};
    }
  }
  function setQty(id,qty,{reason='adjustment',source='stock-command-sot',journal=true,saveNow=false,journalBeforeQty=null}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    const before=Number(p.qty)||0, after=Number(qty);
    const journalBefore=journalBeforeQty==null?before:Number(journalBeforeQty);
    if(!Number.isFinite(after)||after<0)return {ok:false,code:'INVALID_QTY',id:p.id};
    p.qty=after;
    if(journal){if(!Array.isArray(p.adjustmentHistory))p.adjustmentHistory=[];p.adjustmentHistory.push({id:'adj_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),date:new Date().toISOString().slice(0,10),at:new Date().toISOString(),qtyBefore:journalBefore,qtyAfter:after,delta:after-journalBefore,reason,source});}
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:p,beforeQty:before,afterQty:after,changed:before!==after};
  }
  function archive(id,reason='manual-delete-with-history',{saveNow=false}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    if(p.isArchived)return {ok:true,part:p,changed:false,alreadyArchived:true};
    const r=setQty(id,0,{reason:'archive',source:'stock-command-sot',journal:true,saveNow:false});
    if(!r.ok)return r;
    p.archivedQtyBefore=r.beforeQty;p.isArchived=true;p.archivedAt=new Date().toISOString();p.archivedReason=reason;
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:p,changed:true};
  }
  function restore(id,{saveNow=false}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    if(!p.isArchived)return {ok:true,part:p,changed:false};
    p.isArchived=false;p.restoredAt=new Date().toISOString();
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:p,changed:true};
  }
  function applyPurchase(id,qty,unitPrice,date,txId,{saveNow=false}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    const q=Number(qty); if(!Number.isFinite(q)||q<=0)return {ok:false,code:'INVALID_QTY',id:p.id};
    const price=Number(unitPrice)||0, prevQty=Number(p.qty)||0;
    if(!Array.isArray(p.priceHistory))p.priceHistory=[];
    // S2296: a duplicate replay of the same finance transaction must not
    // increment stock twice. The transaction id is the durable operation
    // identity at this stock boundary; history is checked BEFORE mutation.
    const already=txId!=null&&p.priceHistory.some(h=>h&&String(h.txId)===String(txId));
    if(already){
      return {ok:true,part:p,qtyAdded:0,duplicateHistory:true,alreadyApplied:true};
    }
    const prevAvg=(typeof p.avgPrice==='number'&&p.avgPrice>0)?p.avgPrice:((Number(p.price)>0)?Number(p.price):null);
    p.qty=prevQty+q;
    if(price>0){p.lastPrice=price;p.avgPrice=(prevQty+q)>0?(((prevAvg==null?price:prevAvg)*prevQty)+(price*q))/(prevQty+q):price;p.price=p.avgPrice;}
    p.lastPurchaseDate=date;
    p.priceHistory.push({date,qty:q,price,txId:txId||null,qtyBefore:prevQty,avgPriceBefore:prevAvg});
    if(txId){if(!Array.isArray(p.txRefs))p.txRefs=[];if(!p.txRefs.includes(txId))p.txRefs.push(txId);p.lastTxId=txId;}
    if(typeof AIBus!=='undefined')AIBus.emit('finance.updated',{kind:'stok-sparepart',action:'purchase-apply',partId:p.id,qty:q,unitPrice:price,txId:txId||null});
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:p,qtyAdded:q,duplicateHistory:already};
  }
  function revertPurchase(id,qty,txId,{saveNow=false}={}){
    const p=find(id); if(!p)return {ok:false,code:'PART_NOT_FOUND',id:str(id)};
    const q=Number(qty); if(!Number.isFinite(q)||q<=0)return {ok:false,code:'INVALID_QTY',id:p.id};
    // S2296: duplicate purchase-revert replay must be a no-op. Check the
    // durable purchase history before changing quantity; otherwise a second
    // replay could subtract the same stock movement again.
    if(txId!=null&&Array.isArray(p.priceHistory)){
      const existingIdx=p.priceHistory.findIndex(h=>h&&String(h.txId)===String(txId));
      if(existingIdx===-1)return {ok:true,part:p,qtyRemoved:0,replayed:false,alreadyReverted:true};
    }
    p.qty=Math.max(0,(Number(p.qty)||0)-q);
    if(typeof AIBus!=='undefined')AIBus.emit('finance.updated',{kind:'stok-sparepart',action:'purchase-revert',partId:p.id,qty:q,txId:txId||null});
    if(!txId||!Array.isArray(p.priceHistory)){
      if(saveNow&&typeof save==='function')save();
      return {ok:true,part:p,qtyRemoved:q,replayed:false};
    }
    const idx=p.priceHistory.findIndex(h=>h&&h.txId===txId);
    if(idx===-1){
      if(Array.isArray(p.txRefs))p.txRefs=p.txRefs.filter(x=>x!==txId);
      if(p.lastTxId===txId){const last=p.priceHistory[p.priceHistory.length-1];p.lastTxId=last?(last.txId||null):null;}
      if(saveNow&&typeof save==='function')save();
      return {ok:true,part:p,qtyRemoved:q,replayed:false,historyMissing:true};
    }
    const entry=p.priceHistory[idx], after=p.priceHistory.slice(idx+1);
    p.priceHistory.splice(idx,1);
    if(Array.isArray(p.txRefs))p.txRefs=p.txRefs.filter(x=>x!==txId);
    if(p.lastTxId===txId){const last=p.priceHistory[p.priceHistory.length-1];p.lastTxId=last?(last.txId||null):null;}
    if(typeof entry.qtyBefore==='number'){
      let curQty=entry.qtyBefore;
      let curAvg=(typeof entry.avgPriceBefore==='number'&&entry.avgPriceBefore>0)?entry.avgPriceBefore:null;
      after.forEach(h=>{const hq=Number(h&&h.qty)||0,hp=Number(h&&h.price)||0,newQty=curQty+hq;if(hp>0){const prev=typeof curAvg==='number'&&curAvg>0?curAvg:hp;curAvg=newQty>0?(((prev*curQty)+(hp*hq))/newQty):hp;}curQty=newQty;});
      if(typeof curAvg==='number'&&curAvg>0){p.avgPrice=curAvg;p.price=curAvg;}
    }
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:p,qtyRemoved:q,replayed:true};
  }
  function applyPurchaseToTransaction(txId,partId,qty,unitPrice,date,{saveNow=false}={}){
    const tx=typeof D!=='undefined'&&Array.isArray(D.transactions)?D.transactions.find(x=>x&&String(x.id)===String(txId)):null;
    if(!tx)return {ok:false,code:'TRANSACTION_NOT_FOUND',txId:String(txId||'')};
    const r=applyPurchase(partId,qty,unitPrice,date,tx.id,{saveNow:false});
    if(!r.ok)return r;
    tx.partStockId=r.part.id;tx.partStockQty=Number(qty);tx.partStockUnit=tx.partStockUnit||'pcs';tx.partStockApplied=true;
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:r.part,transaction:tx};
  }
  function revertPurchaseForTransaction(txId,{saveNow=false}={}){
    const tx=typeof D!=='undefined'&&Array.isArray(D.transactions)?D.transactions.find(x=>x&&String(x.id)===String(txId)):null;
    if(!tx)return {ok:false,code:'TRANSACTION_NOT_FOUND',txId:String(txId||'')};
    if(!tx.partStockId||!tx.partStockQty)return {ok:true,transaction:tx,changed:false};
    const r=revertPurchase(tx.partStockId,tx.partStockQty,tx.id,{saveNow:false});
    if(!r.ok)return r;
    tx.partStockApplied=false;
    if(saveNow&&typeof save==='function')save();
    return {ok:true,part:r.part,transaction:tx,changed:true};
  }
  function remove(id,{saveNow=false}={}){
    const a=arr(),sid=str(id),idx=a.findIndex(p=>p&&idOf(p)===sid);
    if(idx<0)return {ok:false,code:'PART_NOT_FOUND',id:sid};
    const before=clone(a[idx]); a.splice(idx,1);
    if(saveNow&&typeof save==='function')save();
    return {ok:true,id:sid,before,removed:true};
  }
  function replaceSnapshot(rows,{saveNow=false}={}){
    const next=Array.isArray(rows)?clone(rows):[];
    const a=arr(); a.splice(0,a.length,...next);
    if(saveNow&&typeof save==='function')save();
    return {ok:true,count:a.length};
  }
  function restoreRows(rows,{saveNow=false}={}){
    const list=Array.isArray(rows)?rows.filter(Boolean):[], changed=[];
    for(const row of list){
      const id=idOf(row); if(!id)continue;
      const cur=find(id);
      if(cur){ const before=clone(cur); Object.keys(cur).forEach(k=>{if(!(k in row))delete cur[k];}); Object.keys(row).forEach(k=>{if(k!=='id')cur[k]=clone(row[k]);}); changed.push({id,before,after:clone(cur),action:'update'}); }
      else { const r=create(row,{saveNow:false}); if(r.ok)changed.push({id,after:clone(r.part),action:'create'}); }
    }
    if(saveNow&&typeof save==='function')save();
    return {ok:true,count:changed.length,changed};
  }
  function setQtyMap(map,{reason='rollback',source='stock-command-sot',saveNow=false}={}){
    const entries=map instanceof Map?Array.from(map.entries()):Object.entries(map||{}),changed=[];
    for(const [id,qty] of entries){const r=setQty(id,qty,{reason,source,journal:false,saveNow:false});if(!r.ok)return {ok:false,code:r.code,id:String(id),changed};changed.push(r);}
    if(saveNow&&typeof save==='function')save();
    return {ok:true,changed};
  }
  function audit(){return {ok:true,version:VERSION,storage:'D.partsStock',commands:['create','update','remove','setQty','setQtyMap','adjustQty','consume','applyDeltas','archive','restore','restoreRows','replaceSnapshot','applyPurchase','revertPurchase','applyPurchaseToTransaction','revertPurchaseForTransaction']};}
  const api={VERSION,ensureStorage,find,create,update,remove,setQty,setQtyMap,adjustQty,consume,applyDeltas,archive,restore,restoreRows,replaceSnapshot,applyPurchase,revertPurchase,applyPurchaseToTransaction,revertPurchaseForTransaction,audit};
  g.StockCommandSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
