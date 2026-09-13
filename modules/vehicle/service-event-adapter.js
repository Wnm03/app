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
  try{const raw=typeof localStorage!=='undefined'?localStorage.getItem(STORAGE_KEY):null;q=raw?JSON.parse(raw):[];if(!Array.isArray(q))q=[];}catch(_){q=[];}
  const persist=()=>{try{if(typeof localStorage==='undefined')return false;localStorage.setItem(STORAGE_KEY,JSON.stringify(q));return true;}catch(_){return false;}};
  return {
    enqueue(evt){
      if(!evt)return false;
      const payload=evt.payload||{};
      // V33: dedupe only by a stable event identity. Vehicle events keep action-aware
// semantics and must not collapse distinct vehicle.updated operations.
// outbox vehicle events use action-aware dedup key: (payload.action||'') and (payload.kind||'').
// V33: dedupe only by a stable event identity. The old vehicle/action/kind
      // fallback could collapse two legitimate events for the same vehicle.
      const stablePayloadId=payload.id||payload.servisId||payload.txLinkId||payload.deletedTxId||null;
      const fallback=JSON.stringify({vehicleId:payload.vehicleId||null,action:payload.action||'',kind:payload.kind||'',at:evt.at||null});
      // V36: callers cannot override canonical event identity with a stale/custom key.
      const key=`${evt.type||'event'}::${stablePayloadId||fallback}`;
      if(!q.some(x=>x.key===key)){const entry={...evt,key,at:Date.now(),attempts:Number(evt.attempts)||0};q.push(entry);if(persist())return true;q.pop();return false;}
      return false;
    },
    pending(){return q.slice();},
    drain(handler){
      if(typeof handler!=='function')return 0;
      let n=0;
      for(let i=q.length-1;i>=0;i--){
        try{handler(q[i]);const removed=q.splice(i,1)[0];if(!persist()){q.splice(i,0,removed);throw new Error('Outbox persistence failed after handler success');}n++;}
        catch(err){q[i]={...q[i],attempts:(Number(q[i].attempts)||0)+1,lastError:String(err&&err.message||err),lastAttemptAt:Date.now()};persist();}
      }
      return n;
    },
    flush(){
      return this.drain(evt=>{
        const p=evt.payload||{};
        if(evt.type==='service.create'&&typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.create==='function')return ServiceEventLifecycle.create(p,evt.options||{});
        if(evt.type==='service.update'&&typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.update==='function')return ServiceEventLifecycle.update(p,evt.options||{});
        if(evt.type==='service.remove'&&typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.remove==='function')return ServiceEventLifecycle.remove(p,evt.options||{});
        if(evt.type==='catalog.attach'&&typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function')return VehicleCatalogServisLink.attachToServis(p.servisId,p.links||[]);
        if(evt.type==='finance.updated'&&typeof AIBus!=='undefined'&&typeof AIBus.emit==='function')return AIBus.emit('finance.updated',p);
        if(evt.type==='vehicle.updated'&&typeof AIBus!=='undefined'&&typeof AIBus.emit==='function')return AIBus.emit('vehicle.updated',p);
        throw new Error('No handler available for '+evt.type);
      });
    },
    clear(){q=[];persist();}
  };
})();
if(typeof window!=='undefined')window.ServiceEventOutbox=ServiceEventOutbox;
if(typeof module!=='undefined')module.exports.ServiceEventOutbox=ServiceEventOutbox;

if(typeof window!=='undefined')window.flushServiceEventOutbox=()=>ServiceEventOutbox.flush();
if(typeof window!=='undefined'){try{queueMicrotask(()=>{try{ServiceEventOutbox.flush();}catch(_flushErr){console.debug('ServiceEventOutbox initial flush deferred',_flushErr);}});}catch(_queueErr){console.debug('ServiceEventOutbox microtask unavailable',_queueErr);}}
