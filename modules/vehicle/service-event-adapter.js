/**
 * SERVICE-EVENT-SOT-08
 * Canonical service-event adapter + idempotency helpers.
 *
 * D.servisLogs remains the persisted service-event store for backward
 * compatibility. These helpers do not create a second store.
 */
function toCanonicalServiceEvent(log = {}, category = null) {
  const masterCategoryId =
    log.masterCategoryId ??
    category?.masterCategoryId ??
    null;

  const categoryId =
    log.categoryId ??
    log.catId ??
    category?.id ??
    null;

  return {
    id: log.id ?? null,
    txLinkId: log.txLinkId ?? null,
    vehicleId: log.vehicleId ?? log.vehicle ?? null,
    masterCategoryId,
    categoryId,
    item: log.item ?? log.name ?? null,
    actionType: log.actionType ?? null,
    km: Number.isFinite(log.km) ? log.km : null,
    date: log.date ?? log.tanggal ?? null,
    cost: Number.isFinite(log.cost) ? log.cost : 0,
    source: log.source ?? 'legacy-service-log'
  };
}

/**
 * Find the one service event belonging to a transaction + vehicle.
 * Vehicle is part of the identity boundary: a matching txLinkId on another
 * vehicle is never returned.
 */
function findServiceEventForTransaction(logs = [], txLinkId, vehicleId) {
  if (!txLinkId) return null;
  return logs.find((log) =>
    log &&
    log.txLinkId === txLinkId &&
    log.vehicleId === vehicleId
  ) || null;
}

/** Stable idempotency lookup for service writes. */
function findServiceEventByIdempotencyKey(logs = [], key, vehicleId) {
  if (!key) return null;
  return logs.find((log) => log && log.idempotencyKey === key && log.vehicleId === vehicleId) || null;
}

/**
 * Defensive vehicle isolation check for a service event.
 */
function isServiceEventForVehicle(log = {}, vehicleId) {
  return Boolean(log && vehicleId && log.vehicleId === vehicleId);
}

/**
 * Serialize all service mutations that can cross async boundaries.
 *
 * The app is single-threaded, but service saves may yield while waiting for
 * stock confirmation. A Finance->Service sync can therefore interleave with
 * a modal Service save. One shared promise tail makes those critical sections
 * deterministic without introducing a second datastore or browser lock.
 */
let _serviceMutationTail = Promise.resolve();
function withServiceMutationLock(fn) {
  const run = _serviceMutationTail.then(() => fn());
  _serviceMutationTail = run.catch(() => {});
  return run;
}

if (typeof module !== 'undefined') {
  module.exports = {
    toCanonicalServiceEvent,
    findServiceEventForTransaction,
    findServiceEventByIdempotencyKey,
    isServiceEventForVehicle,
    withServiceMutationLock
  };
}
if (typeof window !== 'undefined') {
  window.toCanonicalServiceEvent = toCanonicalServiceEvent;
  window.findServiceEventForTransaction = findServiceEventForTransaction;
  window.findServiceEventByIdempotencyKey = findServiceEventByIdempotencyKey;
  window.isServiceEventForVehicle = isServiceEventForVehicle;
  window.withServiceMutationLock = withServiceMutationLock;
}

// V27: post-commit projection outbox. This is not a second service datastore.
const ServiceEventOutbox = (()=>{
  const STORAGE_KEY='service-event-outbox:v1';
  let q=[];
  let writeTail=Promise.resolve();
  try{const raw=typeof localStorage!=='undefined'?localStorage.getItem(STORAGE_KEY):null;q=raw?JSON.parse(raw):[];if(!Array.isArray(q))q=[];}catch(_){q=[];}
  const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}};
  const persistLegacy=()=>{try{if(typeof localStorage==='undefined')return false;localStorage.setItem(STORAGE_KEY,JSON.stringify(q));return true;}catch(_){return false;}};
  const persistDurable=()=>{
    const snapshot=clone(q);
    writeTail=writeTail.then(async()=>{
      if(typeof IDBStore!=='undefined'&&IDBStore&&typeof IDBStore.set==='function'){
        const ok=await IDBStore.set(STORAGE_KEY,snapshot);
        if(ok!==false){persistLegacy();return true;}
      }
      return persistLegacy();
    }).catch(()=>false);
    return writeTail;
  };
  const flushPersistence=()=>writeTail;
  // S2477: backup/save/restore may run in a different tab than the tab that
  // enqueued the latest service event. The in-memory q is only a local cache;
  // prepare must merge the durable IDB queue before exposing an atomic snapshot,
  // otherwise a cross-tab event can be silently omitted or later overwritten.
  const prepareAtomicPersistence=async()=>{
    await writeTail;
    let durable=[];
    try{
      if(typeof IDBStore!=='undefined'&&IDBStore&&typeof IDBStore.get==='function'){
        const v=await IDBStore.get(STORAGE_KEY);
        if(Array.isArray(v))durable=clone(v);
      }
    }catch(_){
      throw new Error('Service event outbox durable snapshot tidak dapat dibaca');
    }
    const merged=[]; const seen=new Set();
    [...durable,...q].forEach(item=>{
      const key=item&&item.key!=null?String(item.key):JSON.stringify(item);
      if(seen.has(key))return;
      seen.add(key); merged.push(item);
    });
    q=clone(merged);
    return {queue:clone(q)};
  };
  const markAtomicPersisted=(queue)=>{q=Array.isArray(queue)?clone(queue):[];persistLegacy();};
  const adoptSnapshot=(queue)=>{q=Array.isArray(queue)?clone(queue):[];persistLegacy();};
  const loadDurable=async()=>{
    try{
      if(typeof IDBStore!=='undefined'&&IDBStore&&typeof IDBStore.get==='function'){
        const v=await IDBStore.get(STORAGE_KEY);
        if(Array.isArray(v))q=clone(v);
      }
    }catch(_){/* retain last known queue; fail closed in atomic caller */}
    return q;
  };
  return {
    enqueue(evt){
      if(!evt)return false;
      const payload=evt.payload||{};
      const stablePayloadId=payload.id||payload.servisId||payload.txLinkId||payload.deletedTxId||null;
      const fallback=JSON.stringify({vehicleId:payload.vehicleId||null,action:payload.action||'',kind:payload.kind||'',at:evt.at||null});
      const identity=evt.type==='vehicle.updated'
        ? JSON.stringify({id:stablePayloadId||null,vehicleId:payload.vehicleId||null,action:payload.action||'',kind:payload.kind||''})
        : String(stablePayloadId||fallback);
      const key=`${evt.type||'event'}::${identity}`;
      if(!q.some(x=>x.key===key)){
        const entry={...evt,key,eventId:String(evt.eventId||evt.id||key),at:Date.now(),attempts:Number(evt.attempts)||0};
        q.push(entry);
        // Persist the queue synchronously to the legacy durable mirror before
        // returning. This closes the crash window between enqueue() and the
        // asynchronous IDB tail: a subsequent handler-success/persist failure
        // can now restore the queue entry deterministically.
        if(!persistLegacy()){
          q.pop();
          return false;
        }
        // IDB persistence remains asynchronous and is deliberately deferred so a
        // caller can still exercise the post-handler crash boundary before the
        // background durable mirror consumes the failure signal.
        if(typeof setTimeout==='function')setTimeout(()=>{void persistDurable();},0);
        else void persistDurable();
        return true;
      }
      return false;
    },
    pending(){return q.slice();},
    drain(handler){
      if(typeof handler!=='function')return 0;
      let n=0;
      while(q.length){
        const index=0;
        try{
          const result=handler(q[index]);
          if(result&&typeof result.then==='function')throw new Error('Async handler requires drainAsync');
          const removed=q.splice(index,1)[0];
          if(!persistLegacy()){q.splice(index,0,removed);throw new Error('Outbox persistence failed after handler success');}
          void persistDurable(); n++;
        }catch(err){q[index]={...q[index],attempts:(Number(q[index].attempts)||0)+1,lastError:String(err&&err.message||err),lastAttemptAt:Date.now()};persistDurable();break;}
      }
      return n;
    },
    async drainAsync(handler){
      if(typeof handler!=='function')return 0;
      let n=0;
      while(q.length){
        const index=0;
        try{
          await handler(q[index]);
          const removed=q.splice(index,1)[0];
          if(!persistLegacy()){q.splice(index,0,removed);throw new Error('Outbox persistence failed after handler success');}
          await persistDurable(); n++;
        }catch(err){q[index]={...q[index],attempts:(Number(q[index].attempts)||0)+1,lastError:String(err&&err.message||err),lastAttemptAt:Date.now()};await persistDurable();break;}
      }
      return n;
    },
    flush(){
      return this.drainAsync(async evt=>{
        const p=evt.payload||{};
        const eventMeta={eventId:String(evt.eventId||evt.id||''),source:'service-event-outbox'};
        const options=Object.assign({},evt.options||{},eventMeta);
        if(evt.type==='service.create'&&typeof ServiceEventLifecycle!=='undefined'){if(typeof ServiceEventLifecycle.createAsync==='function')return ServiceEventLifecycle.createAsync(p,options);if(typeof ServiceEventLifecycle.create==='function')return ServiceEventLifecycle.create(p,options);}
        if(evt.type==='service.update'&&typeof ServiceEventLifecycle!=='undefined'){if(typeof ServiceEventLifecycle.updateAsync==='function')return ServiceEventLifecycle.updateAsync(p,options);if(typeof ServiceEventLifecycle.update==='function')return ServiceEventLifecycle.update(p,options);}
        if(evt.type==='service.remove'&&typeof ServiceEventLifecycle!=='undefined'){if(typeof ServiceEventLifecycle.removeAsync==='function')return ServiceEventLifecycle.removeAsync(p,options);if(typeof ServiceEventLifecycle.remove==='function')return ServiceEventLifecycle.remove(p,options);}
        if(evt.type==='catalog.attach'&&typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function')return VehicleCatalogServisLink.attachToServis(p.servisId,p.links||[]);
        if(evt.type==='finance.updated'&&typeof AIBus!=='undefined')return typeof AIBus.emitAsync==='function'?AIBus.emitAsync('finance.updated',p,eventMeta):AIBus.emit('finance.updated',p,eventMeta);
        if(evt.type==='vehicle.updated'&&typeof AIBus!=='undefined')return typeof AIBus.emitAsync==='function'?AIBus.emitAsync('vehicle.updated',p,eventMeta):AIBus.emit('vehicle.updated',p,eventMeta);
        throw new Error('No handler available for '+evt.type);
      });
    },
    clear(){const previous=q;q=[];if(!persistLegacy()){q=previous;return false;}void persistDurable();return true;},
    flushPersistence,prepareAtomicPersistence,markAtomicPersisted,adoptSnapshot,
    loadDurable,key:STORAGE_KEY
  };
})();;
if(typeof window!=='undefined')window.ServiceEventOutbox=ServiceEventOutbox;
if(typeof module!=='undefined')module.exports.ServiceEventOutbox=ServiceEventOutbox;

if(typeof window!=='undefined')window.flushServiceEventOutbox=()=>ServiceEventOutbox.flush();
if(typeof window!=='undefined'){try{queueMicrotask(()=>{try{ServiceEventOutbox.flush();}catch(_flushErr){console.debug('ServiceEventOutbox initial flush deferred',_flushErr);}});}catch(_queueErr){console.debug('ServiceEventOutbox microtask unavailable',_queueErr);}}
