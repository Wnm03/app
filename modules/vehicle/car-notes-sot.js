/* S2152 P2 — Car Notes Domain SOT Facade.
 *
 * This is intentionally a FACADE, not a second database/store. Each domain
 * keeps its existing canonical persistence owner:
 *   vehicle   -> VehicleCarNotesSOT / D.vehicles[].sot
 *   taxonomy  -> ServiceTaxonomySOT
 *   interval  -> ServiceIntervalSOT / VehicleCarNotesSOT.serviceIntervals
 *   catalog   -> VehicleCatalog
 *   stock     -> D.partsStock (VehicleStockSOT is the canonical resolver)
 *   history   -> D.servisLogs / ServiceEventSOT
 *   finance   -> D.transactions
 *
 * Consumers should use this facade instead of inventing another cache or
 * copying the same facts into a new runtime store. UI is unaffected.
 */
(function(g){'use strict';
  const VERSION='CARNOTES-DOMAIN-SOT-V2';
  const arr=v=>Array.isArray(v)?v:[];
  const str=v=>String(v==null?'':v).trim();
  function data(){return typeof D!=='undefined'?D:(g.D||{});}
  function vehicleId(id){
    if(id!=null&&str(id))return str(id);
    try{if(typeof curVehicleId!=='undefined'&&str(curVehicleId))return str(curVehicleId);}catch(_){ /* isolated browser-global probe; canonical state is read from D */ }
    return str(g.curVehicleId||'');
  }
  const serviceLogs=()=>arr(data().servisLogs);
  const transactions=()=>arr(data().transactions);
  const partsStock=()=>arr(data().partsStock);
  const legacyCategories=()=>arr(data().sparepartCats);
  function serviceById(id){return serviceLogs().find(x=>x&&str(x.id)===str(id))||null;}
  function transactionById(id){return transactions().find(x=>x&&str(x.id)===str(id))||null;}
  function partStockById(id){return partsStock().find(x=>x&&str(x.id)===str(id))||null;}
  function vehicle(id){
    const v=vehicleId(id);
    return arr(data().vehicles).find(x=>x&&str(x.id)===v)||null;
  }
  function serviceHistory(id){
    const vid=vehicleId(id);
    return serviceLogs().filter(x=>x&&(!vid||str(x.vehicleId)===vid));
  }
  function vehicleTransactions(id){
    const vid=vehicleId(id);
    return transactions().filter(x=>x&&(!vid||str(x.vehicleId)===vid));
  }
  function vehicleStock(id){
    const vid=vehicleId(id);
    return partsStock().filter(x=>{
      if(!x)return false;
      if(!vid)return true;
      if(x.vehicleId==null||x.vehicleId==='')return true;
      return str(x.vehicleId)===vid;
    });
  }
  function serviceCategories(id){
    const vid=vehicleId(id);
    if(g.VehicleCarNotesSOT&&typeof g.VehicleCarNotesSOT.getServiceCategories==='function')
      return g.VehicleCarNotesSOT.getServiceCategories(vid);
    return legacyCategories().filter(x=>x&&(!vid||str(x.vehicleId)===vid));
  }
  function taxonomy(){return g.ServiceTaxonomySOT||null;}
  function catalog(){return g.VehicleCatalog||null;}
  function interval(){return g.ServiceIntervalSOT||null;}
  function stockResolver(){return g.VehicleStockSOT||null;}
  function serviceEvent(){return g.ServiceEventSOT||null;}
  function canonicalPart(id,vehicle){
    const cat=catalog();
    if(cat&&typeof cat.getById==='function')return cat.getById(id,vehicle)||null;
    if(cat&&typeof cat.getStore==='function')return arr(cat.getStore()?.items).find(x=>x&&str(x.id)===str(id))||null;
    return null;
  }
  function resolvePart(stock,vid){
    const r=stockResolver();
    return r&&typeof r.findCatalog==='function'?r.findCatalog(stock,vehicleId(vid)):null;
  }
  function audit(){
    const issues=[];
    if(!g.VehicleCarNotesSOT)issues.push('vehicle_sot_unavailable');
    if(!g.ServiceTaxonomySOT)issues.push('service_taxonomy_sot_unavailable');
    if(!g.VehicleStockSOT)issues.push('vehicle_stock_sot_unavailable');
    return {ok:issues.length===0,version:VERSION,issues,stores:{serviceHistory:'D.servisLogs',transactions:'D.transactions',stock:'D.partsStock',legacyCategoryProjection:'D.sparepartCats'}};
  }
  const api={VERSION,vehicleId,vehicle,serviceLogs,serviceById,serviceHistory,transactions,transactionById,vehicleTransactions,partsStock,partStockById,vehicleStock,serviceCategories,taxonomy,catalog,interval,stockResolver,serviceEvent,canonicalPart,resolvePart,audit};
  g.CarNotesSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
