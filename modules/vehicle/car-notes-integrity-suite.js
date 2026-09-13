/* Read-only aggregate integrity report for Car Notes domains. */
(function(g){'use strict';
 function run(input){
  const x=input||{}, reports=[];
  const add=(name,api,payload)=>{if(api&&typeof api.reconcile==='function')reports.push({name,result:api.reconcile(payload||{})});};
  add('service',g.ServiceIntegrityReconciler,{services:x.services,transactions:x.transactions});
  add('fuel',g.FuelIntegrityReconciler,{bbmLogs:x.bbmLogs,transactions:x.transactions});
  add('tax',g.VehicleTaxIntegrityReconciler,{taxRecords:x.taxRecords,vehicles:x.vehicles,transactions:x.transactions});
  const issues=reports.flatMap(r=>(r.result&&Array.isArray(r.result.issues)?r.result.issues:[]).map(issue=>Object.assign({domain:r.name},issue)));
  return {ok:issues.length===0,issues,reports};
 }
 const api={run};
 if(typeof window!=='undefined')window.CarNotesIntegritySuite=api;
 if(typeof globalThis!=='undefined')globalThis.CarNotesIntegritySuite=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
