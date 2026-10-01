/* S2161 — Existing Service Data SOT Reconciliation
 * Audit/guarded normalization only. It is NOT a new fact store.
 * Rule: never delete legacy fields, never overwrite a conflicting canonical ID,
 * and only apply deterministic mappings.
 */
(function(g){'use strict';
  const VERSION='SERVICE-DATA-RECONCILIATION-S2161';
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  function taxonomy(){return g.ServiceTaxonomySOT||null;}
  function normName(v){return str(v).toLowerCase().replace(/[()\/\-_.]+/g,' ').replace(/\s+/g,' ').trim();}
  function canonicalFromName(name,masterCategoryId){
    const t=taxonomy(); if(!t||typeof t.resolve!=='function')return null;
    return t.resolve({name,masterCategoryId})||null;
  }
  function canonicalFromIds(row){
    const t=taxonomy(); if(!t||typeof t.canonicalTarget!=='function')return null;
    return t.canonicalTarget(row||{});
  }
  function sparepartIndex(data){
    const byId=new Map(); arr(data&&data.sparepartCats).forEach(x=>{const id=str(x&&x.id);if(id){const a=byId.get(id)||[];a.push(x);byId.set(id,a);}}); return byId;
  }
  function proposal(row,data,path){
    const r=row||{}; const current=canonicalFromIds(r);
    const result={path,id:str(r.id),status:'unresolved',reason:'no_deterministic_mapping',before:{masterCategoryId:r.masterCategoryId||null,serviceComponentId:r.serviceComponentId||null,categoryId:r.categoryId||null},after:{masterCategoryId:r.masterCategoryId||null,serviceComponentId:r.serviceComponentId||null},source:null};
    if(!str(r.vehicleId)) return Object.assign(result,{status:'blocked',reason:'vehicle_required'});
    const vehicles=arr(data&&data.vehicles); if(!vehicles.some(v=>str(v&&v.id)===str(r.vehicleId))) return Object.assign(result,{status:'blocked',reason:'unknown_vehicle'});
    if(r.serviceComponentId){
      if(current&&current.serviceComponentId){
        if(r.masterCategoryId && str(r.masterCategoryId)!==str(current.masterCategoryId)){result.status='safe';result.reason='repair_master_from_canonical_component';result.after.masterCategoryId=current.masterCategoryId;result.after.serviceComponentId=current.serviceComponentId;result.source='canonical_component';return result;}
        result.status=r.masterCategoryId?'clean':'safe'; result.reason=r.masterCategoryId?'canonical':'derive_master_from_component'; result.after.masterCategoryId=current.masterCategoryId; result.after.serviceComponentId=current.serviceComponentId; result.source='canonical_component'; return result;
      }
      return Object.assign(result,{status:'conflict',reason:'unknown_service_component'});
    }
    // Existing legacy category entry may already point to a canonical component.
    if(r.categoryId){
      const sp=sparepartIndex(data).get(str(r.categoryId))||[];
      const canonical=sp.length===1&&sp[0].serviceComponentId?canonicalFromIds(sp[0]):null;
      if(canonical&&canonical.serviceComponentId){
        if(r.masterCategoryId&&str(r.masterCategoryId)!==str(canonical.masterCategoryId)) return Object.assign(result,{status:'conflict',reason:'legacy_category_master_mismatch'});
        result.status='safe';result.reason='legacy_category_to_canonical';result.after.masterCategoryId=canonical.masterCategoryId;result.after.serviceComponentId=canonical.serviceComponentId;result.source='sparepartCats';return result;
      }
    }
    const byName=canonicalFromName(r.item||r.name||r.componentName,r.masterCategoryId);
    if(byName&&byName.serviceComponentId){
      result.status='safe';result.reason='canonical_name_match';result.after.masterCategoryId=byName.masterCategoryId;result.after.serviceComponentId=byName.serviceComponentId;result.source='taxonomy_name';return result;
    }
    if(r.masterCategoryId && taxonomy() && typeof taxonomy().categoryById==='function' && taxonomy().categoryById(r.masterCategoryId)){
      result.reason='valid_category_but_component_unresolved';
    }
    return result;
  }
  function audit(data){
    data=data||{}; const logs=arr(data.servisLogs); const vehicles=arr(data.vehicles); const ids=new Map(); const rows=[]; const checklist=[];
    logs.forEach((r,i)=>{const id=str(r&&r.id);ids.set(id,(ids.get(id)||0)+1);const p=proposal(r,data,`servisLogs[${i}]`);rows.push(p);arr(r&&r.checklist).forEach((c,j)=>{const cp=proposal(Object.assign({vehicleId:r.vehicleId,id:c&&c.id},c),data,`servisLogs[${i}].checklist[${j}]`);checklist.push(cp);});});
    const duplicateIds=[...ids].filter(([id,n])=>id&&n>1).map(([id,count])=>({id,count}));
    const counts=k=>rows.filter(x=>x.status===k).length;
    return {version:VERSION,totalLogs:logs.length,totalVehicles:vehicles.length,duplicateIds,rows,checklist,summary:{clean:counts('clean'),safe:counts('safe'),conflict:counts('conflict'),blocked:counts('blocked'),unresolved:counts('unresolved'),checklistRows:checklist.length,checklistSafe:checklist.filter(x=>x.status==='safe').length,checklistClean:checklist.filter(x=>x.status==='clean').length,checklistConflict:checklist.filter(x=>x.status==='conflict').length,checklistUnresolved:checklist.filter(x=>x.status==='unresolved').length}};
  }
  function applySafe(data,auditResult){
    if(!data||!auditResult||!Array.isArray(auditResult.rows))return {ok:false,changed:0,reason:'audit_required'};
    let changed=0;
    auditResult.rows.forEach(p=>{if(p.status!=='safe')return;const m=/^servisLogs\[(\d+)\]$/.exec(p.path);if(!m)return;const r=data.servisLogs[Number(m[1])];if(!r)return;let c=false;if(p.after.masterCategoryId&&String(r.masterCategoryId||'')!==String(p.after.masterCategoryId)){r.masterCategoryId=p.after.masterCategoryId;c=true;}if(p.after.serviceComponentId&&!r.serviceComponentId){r.serviceComponentId=p.after.serviceComponentId;c=true;}if(c){r.editHistory=Array.isArray(r.editHistory)?r.editHistory:[];r.editHistory.push({changedAt:new Date().toISOString(),changedBy:'system',source:'s2161-sot-reconciliation',fields:['masterCategoryId','serviceComponentId']});changed++;}});
    auditResult.checklist.forEach(p=>{if(p.status!=='safe')return;const m=/^servisLogs\[(\d+)\]\.checklist\[(\d+)\]$/.exec(p.path);if(!m)return;const r=data.servisLogs[Number(m[1])];const c=r&&r.checklist&&r.checklist[Number(m[2])];if(!c)return;let ch=false;if(p.after.masterCategoryId&&!c.masterCategoryId){c.masterCategoryId=p.after.masterCategoryId;ch=true;}if(p.after.serviceComponentId&&!c.serviceComponentId){c.serviceComponentId=p.after.serviceComponentId;ch=true;}if(ch)changed++;});
    return {ok:true,changed};
  }
  const api={VERSION,normName,proposal,audit,applySafe};
  g.ServiceDataReconciliationS2161=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
