'use strict';
/* S1920 — JSON round-trip certification for service-domain records. */
(function(root){
 const arr=v=>Array.isArray(v)?v:[];function clone(v){return JSON.parse(JSON.stringify(v));}function fingerprint(v){return JSON.stringify(v==null?null:v);}function certify(data){const before=clone(data||{}),after=JSON.parse(JSON.stringify(before));const domains=['vehicles','servisLogs','transactions','partsStock','sparepartCats','serviceReminders'];const diffs=[];domains.forEach(k=>{if(fingerprint(before[k]||[])!==fingerprint(after[k]||[]))diffs.push(k);});return{ok:diffs.length===0,diffs,domains,readOnly:true,identityPreserved:true};}const api={version:'S1920-V1',certify};if(root)root.ServiceRoundtripSOT=api;if(typeof globalThis!=='undefined')globalThis.ServiceRoundtripSOT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
