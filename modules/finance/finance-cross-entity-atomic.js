// S2196 — atomic boundary for cross-entity Finance mutations.
// Storage/schema tetap; helper ini hanya snapshot/rollback koleksi D yang terlibat.
(function(g){
  'use strict';
  const DEFAULT_KEYS=['transactions','bills','billsArchive','debts','piutang'];
  function getD(){if(!g.D)throw new Error('FinanceCrossEntityAtomic: D belum tersedia');return g.D;}
  function cloneValue(value){
    if(value===undefined)return undefined;
    if(value===null)return null;
    try{return JSON.parse(JSON.stringify(value));}
    catch(e){throw new Error('FinanceCrossEntityAtomic: snapshot gagal');}
  }
  let active=null;
  function emit(type,payload){
    if(active){active.queue.push([type,payload]);return true;}
    if(g.AIBus&&typeof g.AIBus.emit==='function'){g.AIBus.emit(type,payload);return true;}
    return false;
  }
  function flush(queue){
    if(!queue.length)return;
    const items=queue.splice(0);
    // Commit hanya memindahkan event ke staged journal. Delivery sengaja
    // dilakukan setelah snapshot + outbox berhasil durable dalam save().
    if(g.FinanceEventOutbox&&typeof g.FinanceEventOutbox.stageBatch==='function'){
      if(!g.FinanceEventOutbox.stageBatch(items))throw new Error('FinanceCrossEntityAtomic: outbox capacity exhausted');
      return;
    }
    // Compatibility path untuk harness/legacy build tanpa outbox: tidak ada
    // persistence gate yang dapat ditunggu, sehingga pertahankan delivery lama.
    items.forEach(item=>{try{if(g.AIBus&&typeof g.AIBus.emit==='function')g.AIBus.emit(item[0],item[1]);}catch(e){try{if(g.console&&console.error)console.error('FinanceCrossEntityAtomic: deferred event failed',e);}catch(_){void 0;}}});
  }
  function begin(keys){
    const d=getD();
    const list=Array.isArray(keys)&&keys.length?keys.slice():DEFAULT_KEYS.slice();
    const snapshot={};
    list.forEach(k=>{snapshot[k]=cloneValue(d[k]);});
    let closed=false;
    let committed=false;
    let committedEventCount=0;
    const parent=active;
    const tx={queue:parent?parent.queue:[],start:parent?parent.queue.length:0};
    active=tx;
    return Object.freeze({
      commit(){
        if(closed)return;
        if(parent){
          closed=true;
          if(active===tx)active=parent;
          return;
        }
        try{
          committedEventCount=tx.queue.length;
          flush(tx.queue);
          committed=true;
          closed=true;
          if(active===tx)active=parent;
        }catch(e){
          list.forEach(k=>{
            const snap=snapshot[k];
            if(Array.isArray(snap)){
              if(!Array.isArray(d[k]))d[k]=[];
              d[k].splice(0,d[k].length,...cloneValue(snap));
            }else if(snap&&typeof snap==='object'){
              if(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])){
                Object.keys(d[k]).forEach(key=>{delete d[k][key];});
                Object.assign(d[k],cloneValue(snap));
              }else d[k]=cloneValue(snap);
            }else d[k]=snap;
          });
          tx.queue.length=tx.start;
          closed=true;
          if(active===tx)active=parent;
          throw e;
        }
      },
      rollbackAfterCommit(){
        if(!committed)return false;
        const d=getD();
        list.forEach(k=>{
          const snap=snapshot[k];
          if(Array.isArray(snap)){
            if(!Array.isArray(d[k]))d[k]=[];
            d[k].splice(0,d[k].length,...cloneValue(snap));
          }else if(snap&&typeof snap==='object'){
            if(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])){
              Object.keys(d[k]).forEach(key=>{delete d[k][key];});
              Object.assign(d[k],cloneValue(snap));
            }else d[k]=cloneValue(snap);
          }else d[k]=snap;
        });
        if(committedEventCount&&g.FinanceEventOutbox&&typeof g.FinanceEventOutbox.discardStaged==='function')g.FinanceEventOutbox.discardStaged(committedEventCount);
        committed=false;
        return true;
      },
      rollback(){
        if(closed)return false;
        list.forEach(k=>{
          const snap=snapshot[k];
          if(Array.isArray(snap)){
            if(!Array.isArray(d[k]))d[k]=[];
            d[k].splice(0,d[k].length,...cloneValue(snap));
          }else if(snap&&typeof snap==='object'){
            if(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])){
              Object.keys(d[k]).forEach(key=>{delete d[k][key];});
              Object.assign(d[k],cloneValue(snap));
            }else d[k]=cloneValue(snap);
          }else d[k]=snap;
        });
        tx.queue.length=tx.start;
        closed=true;
        if(active===tx)active=parent;
        return true;
      },
      emit(type,payload){if(closed)throw new Error('FinanceCrossEntityAtomic: transaction closed');return emit(type,payload);},
      snapshot(){return cloneValue(snapshot);}
    });
  }
  function run(fn,keys){
    if(typeof fn!=='function')throw new TypeError('FinanceCrossEntityAtomic.run membutuhkan function');
    const tx=begin(keys);
    try{const result=fn();tx.commit();return result;}catch(e){tx.rollback();throw e;}
  }
  g.FinanceCrossEntityAtomic=Object.freeze({begin,run,emit});
})(typeof globalThis!=='undefined'?globalThis:window);
