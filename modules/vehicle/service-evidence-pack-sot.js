'use strict';
/* S1917 — deterministic evidence pack, read-only. */
(function(root){
 const arr=v=>Array.isArray(v)?v:[];function build(data={}){const services=arr(data.servisLogs),vehicles=arr(data.vehicles);return{version:'S1917-V1',generatedAt:data.generatedAt||new Date().toISOString(),counts:{vehicles:vehicles.length,services:services.length,transactions:arr(data.transactions).length,reminders:arr(data.reminders).length},serviceIds:services.map(s=>s&&s.id).filter(Boolean),provenanceCoverage:services.length?services.filter(s=>s&&s.sourceType).length/services.length:1,readOnly:true};}
 const api={version:'S1917-V1',build};if(root)root.ServiceEvidencePackSOT=api;if(typeof globalThis!=='undefined')globalThis.ServiceEvidencePackSOT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
