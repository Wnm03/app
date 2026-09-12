/* SERVICE-EVENT-LIFECYCLE-INTEGRITY — S13
 * Canonical event bridge for D.servisLogs lifecycle. Storage SoT remains D.servisLogs.
 * This module emits lifecycle events; it does not create a second service store.
 */
(function(g){
  function emit(action,s,extra){
    if(typeof AIBus==='undefined'||!AIBus||typeof AIBus.emit!=='function')return;
    const payload=Object.assign({kind:'servis',action,servisId:s&&s.id||null,vehicleId:s&&s.vehicleId||null,txId:s&&s.txLinkId||null},extra||{});
    AIBus.emit('service.updated',payload);
    // Backward-compatible bridge: existing reminder/AI listeners already consume vehicle.updated.
    AIBus.emit('vehicle.updated',payload);
  }
  g.ServiceEventLifecycle={
    emit,
    create:s=>emit('create',s),
    update:(s,extra)=>emit('update',s,extra),
    remove:(s,extra)=>emit('delete',s,extra),
    unlink:(s,extra)=>emit('unlink',s,extra)
  };
})(window);
