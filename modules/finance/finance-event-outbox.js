// S2200/S2201 — durable event outbox.
// S2201: event dari atomic mutation distage di memory lalu dipersist bersama
// kw_v4_mirror dalam SATU IndexedDB transaction. Event tidak boleh durable bila
// state utama belum durable, dan sebaliknya.
(function(g){
  'use strict';
  const KEY='kw_finance_event_outbox_v1';
  const WRITER_GUARD_KEY='kw_v4_writer_guard_v1';
  const MAX=100;
  let replaying=false;
  let staged=[];
  let durableCache=null;
  let loadPromise=null;
  // S2209: serialize every durable outbox read/write/replay critical section.
  // A replay that clears KEY must never race a concurrent save() setMany() that
  // has already appended newer events.
  let persistenceChain=Promise.resolve();
  function withPersistenceLock(fn){
    if(typeof fn!=='function')return Promise.reject(new TypeError('FinanceEventOutbox.withPersistenceLock membutuhkan function'));
    const run=persistenceChain.then(fn,fn);
    persistenceChain=run.catch(()=>{});
    return run;
  }
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  let sequence=0;
  function normalize(item){
    if(!item||!item.type)return null;
    const createdAt=Number(item.createdAt)||Date.now();
    const seq=Number(item.seq)||(++sequence);
    sequence=Math.max(sequence,seq);
    const stableId=String(item.id||item.eventId||createdAt+'-'+seq+'-'+Math.random().toString(36).slice(2));
    return {id:stableId,eventId:String(item.eventId||stableId),type:item.type,payload:clone(item.payload),createdAt,seq};
  }
  function order(q){
    return q.slice().sort((a,b)=>(Number(a.seq)||0)-(Number(b.seq)||0)||(Number(a.createdAt)||0)-(Number(b.createdAt)||0)||String(a.id).localeCompare(String(b.id)));
  }
  function readLegacy(){
    try{
      if(typeof localStorage==='undefined')return [];
      const raw=localStorage.getItem(KEY); const q=raw?JSON.parse(raw):[];
      return Array.isArray(q)?q.map(normalize).filter(Boolean):[];
    }catch(e){return [];}
  }
  function writeLegacy(q){
    try{if(typeof localStorage==='undefined')return false;localStorage.setItem(KEY,JSON.stringify(q));return true;}
    catch(e){try{if(g.console&&console.error)console.error('FinanceEventOutbox: gagal persist fallback',e);}catch(_){ /* console API unavailable; persistence failure remains reported by return value */ }return false;}
  }
  async function loadDurable(){
    if(durableCache)return durableCache;
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      let q=[];
      try{
        if(g.IDBStore&&typeof g.IDBStore.get==='function'){
          const v=await g.IDBStore.get(KEY);
          if(Array.isArray(v))q=v.map(normalize).filter(Boolean);
        }
      }catch(e){
        // Fail closed: a read failure is NOT equivalent to an empty journal.
        // Treating it as [] could let the next atomic save overwrite a durable
        // outbox whose contents we were unable to read.
        throw new Error('FinanceEventOutbox: durable journal read failed');
      }
      // Merge legacy localStorage queue so events created by older builds are
      // carried into the same durable journal instead of being hidden by a
      // non-empty IndexedDB queue.
      const legacy=readLegacy();
      if(legacy.length){
        const seen=new Set(q.map(x=>x.id));
        legacy.forEach(item=>{if(!seen.has(item.id)){q.push(item);seen.add(item.id);}});
      }
      durableCache=order(q);
      return q;
    })().finally(()=>{loadPromise=null;});
    return loadPromise;
  }
  function enqueue(type,payload){
    const item=normalize({type,payload});
    if(!item)return false;
    const q=order(readLegacy());
    if(q.some(x=>x.id===item.id))return true;
    if(q.length>=MAX)return false;
    q.push(item);
    return writeLegacy(q);
  }
  // Atomic path: stage only. It is deliberately NOT durable yet.
  function stageBatch(items){
    if(!Array.isArray(items)||!items.length)return true;
    const incoming=[];
    items.forEach(item=>{
      const normalized=normalize({type:item&&item[0],payload:item&&item[1]});
      if(normalized)incoming.push(normalized);
    });
    const ids=new Set(staged.map(x=>x.id));
    const unique=incoming.filter(x=>{if(ids.has(x.id))return false;ids.add(x.id);return true;});
    if(staged.length+unique.length>MAX)return false;
    staged.push(...unique);
    return true;
  }
  // Backward-compatible alias used by S2199 atomic boundary.
  function enqueueBatch(items){return stageBatch(items);}
  async function prepareAtomicPersistence(){
    const durable=await loadDurable();
    const merged=[]; const seen=new Set();
    order(durable.concat(staged)).forEach(item=>{if(!seen.has(item.id)){seen.add(item.id);merged.push(item);}});
    return {queue:merged,stagedCount:staged.length,overflow:merged.length>MAX};
  }
  function markAtomicPersisted(queue,stagedCount){
    durableCache=Array.isArray(queue)?queue.slice():[];
    staged=staged.slice(Math.min(Number(stagedCount)||0,staged.length));
    try{if(typeof localStorage!=='undefined')localStorage.removeItem(KEY);}catch(e){ /* legacy cleanup is best-effort */ }
  }
  function replay(){
    if(replaying||typeof AIBus==='undefined'||!AIBus||typeof AIBus.emit!=='function')return false;
    // Compatibility path for isolated/legacy harnesses without IndexedDB.
    if(!g.IDBStore||typeof g.IDBStore.get!=='function'){
      replaying=true;
      try{
        const q=order(readLegacy().concat(staged));
        if(!q.length)return true;
        const remaining=q.slice();
        while(remaining.length){
          const item=remaining[0];
          try{AIBus.emit(item.type,item.payload,{eventId:item.eventId||item.id,source:'finance-event-outbox'});remaining.shift();}
          catch(e){writeLegacy(remaining);return false;}
        }
        if(!writeLegacy([]))return false;
        staged=[];return true;
      }finally{replaying=false;}
    }
    return withPersistenceLock(async()=>{
      replaying=true;
      try{
        const durable=await loadDurable();
        // Snapshot staged items owned by this replay. stageBatch() can run while
        // an async consumer is awaited; those newer events belong to the next
        // persistence cycle and must not be cleared by this replay.
        const replayStaged=staged.slice();
        const replayStagedIds=new Set(replayStaged.map(x=>x.id));
        const q=order(durable.concat(replayStaged));
        if(!q.length)return true;
        const remaining=q.slice();
        while(remaining.length){
          const item=remaining[0];
          try{if(typeof AIBus.emitAsync==='function'){await AIBus.emitAsync(item.type,item.payload,{eventId:item.eventId||item.id,source:'finance-event-outbox'});}else{AIBus.emit(item.type,item.payload,{eventId:item.eventId||item.id,source:'finance-event-outbox'});}remaining.shift();}
          catch(e){
            durableCache=remaining.slice();
            if(typeof g.IDBStore.setManyIfCurrent==='function'){
              const writerToken=await g.IDBStore.get(WRITER_GUARD_KEY);
              const persisted=await g.IDBStore.setManyIfCurrent([[KEY,durableCache]],WRITER_GUARD_KEY,writerToken,writerToken);
              if(!persisted)return false;
            }else{
              await g.IDBStore.set(KEY,durableCache);
            }
            return false;
          }
        }
        if(typeof g.IDBStore.setManyIfCurrent==='function'){
          const writerToken=await g.IDBStore.get(WRITER_GUARD_KEY);
          const cleared=await g.IDBStore.setManyIfCurrent([[KEY,[]]],WRITER_GUARD_KEY,writerToken,writerToken);
          if(!cleared)return false;
        }else{
          await g.IDBStore.set(KEY,[]);
        }
        durableCache=[];
        // Preserve events staged after replay started.
        staged=staged.filter(item=>!replayStagedIds.has(item.id));
        return true;
      }finally{replaying=false;}
    });
  }
  function discardStaged(count){
    const n=Math.max(0,Math.min(Number(count)||0,staged.length));
    if(!n)return true;
    staged.splice(Math.max(0,staged.length-n),n);
    return true;
  }
  function pending(){
    const durable=durableCache||readLegacy();
    return order(durable.concat(staged));
  }
  g.FinanceEventOutbox=Object.freeze({
    enqueue,enqueueBatch,stageBatch,replay,pending,prepareAtomicPersistence,markAtomicPersisted,discardStaged,withPersistenceLock,hasStaged:()=>staged.length>0,key:KEY
  });
  function scheduleReplay(){
    if(typeof g.setTimeout!=='function')return;
    let tries=0;
    const tick=()=>{tries++;Promise.resolve(replay()).then(ok=>{if(ok||tries>=60)return;g.setTimeout(tick,500);});};
    g.setTimeout(tick,0);
  }
  scheduleReplay();
})(typeof globalThis!=='undefined'?globalThis:window);
