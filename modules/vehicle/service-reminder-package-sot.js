/* S1944 — Service Reminder Package & Multi-Component SOT.
 * Reminder is a recommendation/plan; service history remains evidence.
 * One package may target components across several canonical categories.
 * It never invents an interval for jobs such as Overhaul/Turun Mesin.
 */
(function(g){'use strict';
  const VERSION='SERVICE-REMINDER-PACKAGE-SOT-1';
  const STATES=['ACTIVE','COMPLETED','SNOOZED','DISMISSED','REQUIRES_INSPECTION'];
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  function logs(){return g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[];}
  function packages(){if(!g.D)return[]; if(!Array.isArray(g.D.serviceReminderPackages))g.D.serviceReminderPackages=[]; return g.D.serviceReminderPackages;}
  function id(prefix){return typeof g.uid==='function'?g.uid():prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
  function targetKey(t){return [str(t.categoryId),str(t.masterCategoryId),str(t.serviceComponentId),str(t.catalogPartId)].join('|');}
  function normalizeTarget(t){
    t=t||{}; return {
      categoryId:str(t.categoryId)||null,
      masterCategoryId:str(t.masterCategoryId)||null,
      serviceComponentId:str(t.serviceComponentId)||null,
      catalogPartId:str(t.catalogPartId)||null,
      componentName:str(t.componentName||t.name)||null,
      categoryName:str(t.categoryName)||null,
      source:str(t.source)||'manual'
    };
  }
  function canonicalTarget(t){
    const x=normalizeTarget(t);
    // Canonical component is authoritative when present; never infer by fuzzy name.
    const masters=Array.isArray(g.__SERVICE_MASTER_DATA__)?g.__SERVICE_MASTER_DATA__:[];
    for(const group of masters){
      const items=Array.isArray(group.items)?group.items:[];
      const hit=items.find(i=>i&&x.serviceComponentId&&String(i.id)===String(x.serviceComponentId));
      if(hit){x.serviceComponentId=hit.id;x.masterCategoryId=x.masterCategoryId||hit.masterCategoryId||group.masterCategoryId||null;x.componentName=x.componentName||hit.name;x.categoryName=x.categoryName||group.group||null;x.source='canonical';return x;}
    }
    return x;
  }
  function uniqueTargets(targets){
    const m=new Map(); arr(targets).map(canonicalTarget).forEach(t=>{const k=targetKey(t);if(k.replace(/\|/g,''))m.set(k,t);}); return [...m.values()];
  }
  function normalizePackage(p){
    const out=Object.assign({},p||{});
    out.id=str(out.id)||id('rempkg');
    out.vehicleId=str(out.vehicleId)||null;
    out.title=str(out.title)||'Paket Servis';
    out.status=STATES.includes(out.status)?out.status:'ACTIVE';
    out.scope=out.scope==='category'||out.scope==='component'||out.scope==='multi-category'?'multi-target':(out.scope||'multi-target');
    out.targets=uniqueTargets(out.targets||[]);
    out.serviceJobType=str(out.serviceJobType)||null;
    out.serviceJobLabel=str(out.serviceJobLabel)||null;
    out.intervalSource=str(out.intervalSource)||null;
    out.intervalKm=Number.isFinite(Number(out.intervalKm))&&Number(out.intervalKm)>0?Number(out.intervalKm):null;
    out.intervalBulan=Number.isFinite(Number(out.intervalBulan))&&Number(out.intervalBulan)>0?Number(out.intervalBulan):null;
    out.dueMode=out.dueMode==='RECOMMENDED_REVIEW'||out.dueMode==='SCHEDULED'?'RECOMMENDED_REVIEW':'SCHEDULED';
    if(out.serviceJobType==='overhaul_turun_mesin') {out.dueMode='RECOMMENDED_REVIEW';out.intervalKm=null;out.intervalBulan=null;}
    out.checklist=arr(out.checklist).map((c,i)=>({id:str(c.id)||('check_'+i),targetKey:str(c.targetKey)||targetKey(c),serviceComponentId:str(c.serviceComponentId)||null,label:str(c.label)||str(c.componentName)||'Pemeriksaan',done:!!c.done,notApplicable:!!c.notApplicable}));
    out.createdAt=out.createdAt||new Date().toISOString(); out.updatedAt=out.updatedAt||out.createdAt;
    out.sotVersion=VERSION;
    return out;
  }
  function buildChecklist(targets){return uniqueTargets(targets).map((t,i)=>({id:'check_'+i,targetKey:targetKey(t),serviceComponentId:t.serviceComponentId||null,label:t.componentName||t.categoryName||'Pemeriksaan',done:false,notApplicable:false}));}
  function create(input){
    input=input||{}; if(!str(input.vehicleId))return{ok:false,code:'vehicle_required'};
    const targets=uniqueTargets(input.targets||[]); if(!targets.length)return{ok:false,code:'target_required'};
    const p=normalizePackage(Object.assign({},input,{targets,checklist:input.checklist||buildChecklist(targets)}));
    packages().push(p); if(typeof g.save==='function')g.save({domain:'vehicle'}); return{ok:true,package:p};
  }
  function get(idOrVehicle){const all=packages(); const s=str(idOrVehicle); return all.filter(p=>p&&(p.id===s||p.vehicleId===s));}
  function byId(reminderId){return packages().find(p=>p&&p.id===str(reminderId))||null;}
  function transition(reminderId,to){
    const p=byId(reminderId); if(!p)return{ok:false,code:'not_found'};
    if(!STATES.includes(to))return{ok:false,code:'invalid_state'};
    const guard=(g.ReminderLifecycle&&typeof g.ReminderLifecycle.transition==='function')
      ?g.ReminderLifecycle.transition(p.status,to):null;
    if(guard){ if(!guard.ok)return{ok:false,code:String(guard.code||'invalid_transition').toLowerCase(),from:p.status,to}; }
    else if(p.status==='COMPLETED'&&to!=='COMPLETED')return{ok:false,code:'completed_cannot_reopen'};
    else if(p.status==='DISMISSED'&&to!=='DISMISSED')return{ok:false,code:'dismissed_cannot_reopen'};
    p.status=to;p.updatedAt=new Date().toISOString(); if(typeof g.save==='function')g.save({domain:'vehicle'});return{ok:true,package:p};
  }
  function targetCovered(target,row){
    const t=canonicalTarget(target), r=row||{};
    if(t.serviceComponentId) return String(r.serviceComponentId||r.itemId||'')===String(t.serviceComponentId);
    if(t.catalogPartId && String(r.catalogPartId||'')===String(t.catalogPartId)) return true;
    if(t.masterCategoryId && String(r.masterCategoryId||'')===String(t.masterCategoryId)) return true;
    if(t.categoryId && String(r.categoryId||'')===String(t.categoryId)) return true;
    return false;
  }
  function historyCoversTargets(p,found){
    // Backward-compatible coverage resolution:
    // - Prefer explicit checklist rows when present.
    // - Also accept canonical component/category fields stored directly on the
    //   service-log row (older Finance/legacy bridge shapes).
    // - If a legacy row has no target evidence at all, do not retroactively
    //   invent a mismatch; preserve the pre-S1954 completion contract.
    //   Once any explicit target evidence exists, require every package target
    //   to be covered by that evidence. This prevents unrelated structured
    //   history from completing a package while keeping old unstructured logs
    //   compatible.
    const rows=[]; let explicitEvidence=false;
    found.forEach(s=>{
      const row=s||{};
      const direct=[row.serviceComponentId,row.itemId,row.catalogPartId,row.masterCategoryId,row.categoryId].some(v=>str(v));
      if(direct) explicitEvidence=true;
      const checks=arr(row.checklist);
      checks.forEach(r=>{
        if(r && [r.serviceComponentId,r.itemId,r.catalogPartId,r.masterCategoryId,r.categoryId].some(v=>str(v))) explicitEvidence=true;
        rows.push(r||{});
      });
      if(direct) rows.push(row);
    });
    if(!explicitEvidence) return true;
    return p.targets.every(t=>rows.some(r=>targetCovered(t,r)));
  }
  function checklist(reminderId){const p=byId(reminderId);return p?arr(p.checklist).map(x=>Object.assign({},x)):[];}
  function plan(reminderId){const p=byId(reminderId);if(!p)return{ok:false,code:'not_found'};return{ok:true,reminder:p,targets:p.targets,checklist:checklist(reminderId),multiCategory:new Set(p.targets.map(t=>t.masterCategoryId||t.categoryId).filter(Boolean)).size>1};}
  function completeFromHistory(reminderId,logIds,jobTypeId){
    const p=byId(reminderId); if(!p)return{ok:false,code:'not_found'};
    const wanted=arr(logIds).map(String).filter(Boolean); if(!wanted.length)return{ok:false,code:'history_required'};
    const found=logs().filter(s=>s&&wanted.includes(String(s.id)));
    if(found.length!==wanted.length)return{ok:false,code:'history_not_found'};
    if(found.some(s=>String(s.vehicleId)!==String(p.vehicleId)))return{ok:false,code:'vehicle_mismatch'};
    if(!historyCoversTargets(p,found))return{ok:false,code:'history_target_mismatch'};
    const sid=found.find(s=>s.sessionId)?.sessionId || (typeof g.uid==='function'?g.uid():'svc_'+Date.now());
    const job=jobTypeId&&g.ServiceSessionSOT&&typeof g.ServiceSessionSOT.jobType==='function'?g.ServiceSessionSOT.jobType(jobTypeId):null;
    found.forEach(s=>{s.sessionId=sid;s.reminderPackageId=p.id;s.reminderPackageVersion=VERSION;if(job){s.serviceJobType=job.id;s.serviceJobLabel=job.label;s.serviceJobEvidence='reminder_package';}});
    p.status='COMPLETED';p.completedAt=new Date().toISOString();p.completedSessionId=sid;p.updatedAt=p.completedAt;
    if(typeof g.save==='function')g.save({domain:'vehicle'});
    return{ok:true,sessionId:sid,reminder:p,historyIds:wanted};
  }
  function audit(vehicleId){
    const ps=packages().filter(p=>!vehicleId||String(p.vehicleId)===String(vehicleId));
    return {version:VERSION,total:ps.length,active:ps.filter(p=>p.status==='ACTIVE').length,multiTarget:ps.filter(p=>p.targets.length>1).length,multiCategory:ps.filter(p=>new Set(p.targets.map(t=>t.masterCategoryId||t.categoryId).filter(Boolean)).size>1).length,overhaulReview:ps.filter(p=>p.serviceJobType==='overhaul_turun_mesin'&&p.dueMode==='RECOMMENDED_REVIEW').length,invalid:ps.filter(p=>!p.vehicleId||!p.targets.length).length};
  }
  function normalizeAll(){const all=packages();let changed=0;for(let i=0;i<all.length;i++){const n=normalizePackage(all[i]);if(JSON.stringify(n)!==JSON.stringify(all[i])){all[i]=n;changed++;}}if(changed&&typeof g.save==='function')g.save({domain:'vehicle'});return{ok:true,changed,total:all.length};}
  const api={VERSION,STATES,normalizePackage,normalizeAll,create,get,byId,transition,checklist,plan,completeFromHistory,audit,buildChecklist,canonicalTarget};
  g.ServiceReminderPackageSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
