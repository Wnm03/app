'use strict';
/* S1911 — explicit component→catalog-part compatibility gate. No fuzzy matching. */
(function(root){
 const arr=v=>Array.isArray(v)?v:[]; const id=v=>String(v==null?'':v).trim();
 function candidates(parts,vehicleId,componentId){return arr(parts).filter(p=>p&&(!vehicleId||!Array.isArray(p.compatibleVehicleIds)||p.compatibleVehicleIds.some(x=>id(x)===id(vehicleId)))&&(!componentId||arr(p.serviceComponentIds||p.componentIds).some(x=>id(x)===id(componentId))||id(p.serviceComponentId)===id(componentId)));}
 function resolve(parts,vehicleId,componentId,requestedPartId){const list=candidates(parts,vehicleId,componentId);if(!requestedPartId)return{ok:true,status:list.length?'unselected':'no-compatible-part',part:null,candidates:list};const hit=list.find(p=>id(p.id)===id(requestedPartId));return hit?{ok:true,status:'compatible',part:hit,candidates:list}:{ok:false,status:'incompatible',part:null,candidates:list};}
 function audit(rows,parts){const issues=[];arr(rows).forEach((r,i)=>{if(!r||!r.catalogPartId)return;const x=resolve(parts,r.vehicleId,r.serviceComponentId,r.catalogPartId);if(!x.ok)issues.push({index:i,id:r.id||null,vehicleId:r.vehicleId||null,serviceComponentId:r.serviceComponentId||null,catalogPartId:r.catalogPartId,code:'SERVICE_PART_INCOMPATIBLE'});});return{ok:issues.length===0,total:arr(rows).length,issues,rule:'explicit-ID compatibility only',readOnly:true};}
 const api={version:'S1911-V1',candidates,resolve,audit};if(root)root.ServicePartCompatibilitySOT=api;if(typeof globalThis!=='undefined')globalThis.ServicePartCompatibilitySOT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
