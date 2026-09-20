/**
 * SERVICE HISTORY INTEGRITY AUDIT
 * Read-only diagnostics over D.servisLogs. Never mutates or deletes records.
 * The persisted log remains the single source of truth; canonical projections
 * must not be used as a replacement for the original payload.
 */
(function(root){
  'use strict';
  const arr=v=>Array.isArray(v)?v:[];
  const text=v=>String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ');
  const key=v=>v==null?'':String(v);
  const stable=v=>{try{return JSON.stringify(v==null?null:v);}catch(_){return String(v);}};
  function identityKey(r){
    if(!r)return null;
    if(r.id!=null&&String(r.id).trim())return `id:${r.id}`;
    return null;
  }
  function txKey(r){return r&&r.txLinkId?`tx:${r.txLinkId}`:null;}
  function idemKey(r){return r&&r.idempotencyKey?`idem:${r.idempotencyKey}`:null;}
  function logicalFingerprint(r){
    if(!r)return '';
    return [r.vehicleId,r.date,r.km,text(r.item),r.serviceComponentId||'',r.actionType||'',Number(r.cost||0),text(r.note),stable(r.checklist||[])].map(key).join('|');
  }
  function missing(r){
    const required=['id','vehicleId','date','item'];
    return required.filter(k=>r==null||r[k]==null||String(r[k]).trim()==='');
  }
  function groupBy(records, fn){
    const m=new Map();
    records.forEach((r,index)=>{const k=fn(r);if(!k)return;if(!m.has(k))m.set(k,[]);m.get(k).push({index,record:r});});
    return [...m.entries()].filter(([,v])=>v.length>1).map(([fingerprint,records])=>({fingerprint,records}));
  }
  function audit(records){
    const input=arr(records);
    const duplicateIds=groupBy(input,identityKey);
    const duplicateTxLinks=groupBy(input,txKey);
    const duplicateIdempotencyKeys=groupBy(input,idemKey);
    const fingerprintGroups=groupBy(input,logicalFingerprint);
    const incompleteRecords=input.map((record,index)=>({index,id:record&&record.id||null,missing:missing(record)})).filter(x=>x.missing.length);
    const conflicts=[];
    duplicateTxLinks.forEach(g=>{const vehicles=new Set(g.records.map(x=>x.record&&x.record.vehicleId));if(vehicles.size>1)conflicts.push({type:'TX_LINK_CROSS_VEHICLE',...g});});
    duplicateIdempotencyKeys.forEach(g=>{const vehicles=new Set(g.records.map(x=>x.record&&x.record.vehicleId));if(vehicles.size>1)conflicts.push({type:'IDEMPOTENCY_CROSS_VEHICLE',...g});});
    return {
      totalRecords:input.length,
      duplicateIds,
      duplicateTxLinks,
      duplicateIdempotencyKeys,
      suspectedDuplicates:fingerprintGroups,
      incompleteRecords,
      conflicts,
      safeToMerge:[],
      sourceOfTruth:'D.servisLogs',
      readOnly:true
    };
  }
  const api={audit,logicalFingerprint,missing};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ServiceHistoryIntegrityAudit=api;
})(typeof window!=='undefined'?window:globalThis);
