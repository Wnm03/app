'use strict';
/* S1914 — read-only cross-vehicle isolation audit. */
(function(root){
 const arr=v=>Array.isArray(v)?v:[];const s=v=>String(v==null?'':v);
 function audit(data={}){const vehicles=arr(data.vehicles),services=arr(data.servisLogs),tx=arr(data.transactions),rem=arr(data.reminders);const ids=new Set(vehicles.map(v=>s(v&&v.id)));const issues=[];services.forEach((r,i)=>{if(r&&r.vehicleId&&!ids.has(s(r.vehicleId)))issues.push({domain:'service',index:i,id:r.id||null,code:'ORPHAN_VEHICLE'});});tx.forEach((r,i)=>{if(r&&r.vehicleId&&!ids.has(s(r.vehicleId)))issues.push({domain:'transaction',index:i,id:r.id||null,code:'ORPHAN_VEHICLE'});});rem.forEach((r,i)=>{if(r&&r.vehicleId&&!ids.has(s(r.vehicleId)))issues.push({domain:'reminder',index:i,id:r.id||null,code:'ORPHAN_VEHICLE'});});return{ok:issues.length===0,vehicleCount:vehicles.length,issues,readOnly:true,rule:'vehicleId boundary is explicit'};}
 function sameVehicle(a,b){return !!a&&!!b&&s(a.vehicleId)===s(b.vehicleId);}
 const api={version:'S1914-V1',audit,sameVehicle};if(root)root.VehicleIsolationAuditSOT=api;if(typeof globalThis!=='undefined')globalThis.VehicleIsolationAuditSOT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
