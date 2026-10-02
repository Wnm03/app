/* SERVICE-EVENT-LIFECYCLE-INTEGRITY — S13
 * Canonical event bridge for D.servisLogs lifecycle. Storage SoT remains D.servisLogs.
 * This module emits lifecycle events; it does not create a second service store.
 */
(function(g){
  function emit(action,s,extra,meta){
    if(typeof AIBus==='undefined'||!AIBus||typeof AIBus.emit!=='function')return;
    const payload=Object.assign({kind:'servis',action,servisId:s&&s.id||null,vehicleId:s&&s.vehicleId||null,txId:s&&s.txLinkId||null},extra||{});
    const deliveryMeta=(meta&&typeof meta==='object')?meta:null;
    AIBus.emit('service.updated',payload,deliveryMeta);
    // Backward-compatible bridge: existing reminder/AI listeners already consume vehicle.updated.
    AIBus.emit('vehicle.updated',payload,deliveryMeta);
  }
  async function emitAsync(action,s,extra,meta){
    if(typeof AIBus==='undefined'||!AIBus)return;
    const payload=Object.assign({kind:'servis',action,servisId:s&&s.id||null,vehicleId:s&&s.vehicleId||null,txId:s&&s.txLinkId||null},extra||{});
    const deliveryMeta=(meta&&typeof meta==='object')?meta:null;
    if(typeof AIBus.emitAsync==='function'){
      await AIBus.emitAsync('service.updated',payload,deliveryMeta);
      await AIBus.emitAsync('vehicle.updated',payload,deliveryMeta);
    }else if(typeof AIBus.emit==='function'){
      AIBus.emit('service.updated',payload,deliveryMeta);
      AIBus.emit('vehicle.updated',payload,deliveryMeta);
    }
  }
  function normalizeAndPersist(s){
    if(typeof g.ServiceEventSOT!=='undefined'&&s){const r=g.ServiceEventSOT.normalize(s,{persist:false});if(r&&r.ok&&r.changed&&typeof g.save==='function')g.save({domain:'servis',financeMutation:false});}
  }
  function metaFrom(extra){return extra&&extra.eventId?{eventId:String(extra.eventId),source:'service-event-outbox'}:null;}
  g.ServiceEventLifecycle={
    emit, emitAsync,
    create:(s,extra)=>{normalizeAndPersist(s);emit('create',s,extra,metaFrom(extra));},
    update:(s,extra)=>{normalizeAndPersist(s);emit('update',s,extra,metaFrom(extra));},
    remove:(s,extra)=>emit('delete',s,extra,metaFrom(extra)),
    unlink:(s,extra)=>emit('unlink',s,extra,metaFrom(extra)),
    createAsync:async(s,extra)=>{normalizeAndPersist(s);await emitAsync('create',s,extra,metaFrom(extra));},
    updateAsync:async(s,extra)=>{normalizeAndPersist(s);await emitAsync('update',s,extra,metaFrom(extra));},
    removeAsync:async(s,extra)=>emitAsync('delete',s,extra,metaFrom(extra)),
    unlinkAsync:async(s,extra)=>emitAsync('unlink',s,extra,metaFrom(extra))
  };
})(window);
