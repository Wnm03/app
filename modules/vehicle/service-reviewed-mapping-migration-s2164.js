/* S2164 — Controlled Reviewed-Mapping Migration
 * Applies ONLY S2163 mappings marked reviewed:true.
 * No guessing, no deletes, no cross-vehicle writes, idempotent.
 */
(function(g){'use strict';
  const VERSION='SERVICE-REVIEWED-MAPPING-MIGRATION-S2164';
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  function registry(){return g.ServiceLegacyMappingS2163||null;}
  function mappingFor(row){
    const r=row||{}, reg=registry();
    if(!reg||typeof reg.reviewed!=='function') return null;
    return reg.reviewed(r.item||r.name||r.componentName||'');
  }
  function vehicleKnown(data,id){return !!str(id)&&arr(data&&data.vehicles).some(v=>str(v&&v.id)===str(id));}
  function planRow(row,data,path){
    const r=row||{}, m=mappingFor(r);
    const out={path,id:str(r.id),vehicleId:str(r.vehicleId),status:'unmatched',reason:'no_reviewed_mapping',mapping:null,before:{masterCategoryId:r.masterCategoryId||null,serviceComponentId:r.serviceComponentId||null}};
    if(!m) return out;
    out.mapping={legacy:m.legacy,masterCategoryId:m.masterCategoryId,serviceComponentId:m.serviceComponentId};
    if(!vehicleKnown(data,r.vehicleId)) return Object.assign(out,{status:'blocked',reason:'vehicle_required_or_unknown'});
    if(r.serviceComponentId && str(r.serviceComponentId)!==str(m.serviceComponentId)) return Object.assign(out,{status:'conflict',reason:'existing_component_conflicts_with_reviewed_mapping'});
    if(r.masterCategoryId && str(r.masterCategoryId)!==str(m.masterCategoryId)) return Object.assign(out,{status:'conflict',reason:'existing_category_conflicts_with_reviewed_mapping'});
    const already=str(r.serviceComponentId)===str(m.serviceComponentId)&&str(r.masterCategoryId)===str(m.masterCategoryId);
    return Object.assign(out,{status:already?'clean':'safe',reason:already?'already_canonical':'reviewed_mapping_apply'});
  }
  function audit(data){
    data=data||{}; const logs=arr(data.servisLogs), rows=[];
    logs.forEach((r,i)=>rows.push(planRow(r,data,`servisLogs[${i}]`)));
    const counts=k=>rows.filter(x=>x.status===k).length;
    return {version:VERSION,rows,summary:{totalLogs:logs.length,reviewedMatches:rows.filter(x=>x.mapping).length,safe:counts('safe'),clean:counts('clean'),conflict:counts('conflict'),blocked:counts('blocked'),unmatched:counts('unmatched')}};
  }
  function apply(data,auditResult){
    if(!data||!auditResult||!Array.isArray(auditResult.rows)) return {ok:false,changed:0,reason:'audit_required'};
    let changed=0; const applied=[];
    auditResult.rows.forEach(p=>{
      if(p.status!=='safe') return;
      const m=/^servisLogs\[(\d+)\]$/.exec(p.path); if(!m)return;
      const r=data.servisLogs[Number(m[1])]; if(!r)return;
      const x=p.mapping; let c=false;
      if(!r.masterCategoryId){r.masterCategoryId=x.masterCategoryId;c=true;}
      if(!r.serviceComponentId){r.serviceComponentId=x.serviceComponentId;c=true;}
      if(!c)return;
      r.editHistory=Array.isArray(r.editHistory)?r.editHistory:[];
      r.editHistory.push({changedAt:new Date().toISOString(),changedBy:'system',source:'s2164-reviewed-mapping-migration',fields:['masterCategoryId','serviceComponentId'],legacyLabel:x.legacy});
      changed++; applied.push({id:str(r.id),vehicleId:str(r.vehicleId),legacy:x.legacy,masterCategoryId:x.masterCategoryId,serviceComponentId:x.serviceComponentId});
    });
    return {ok:true,changed,applied};
  }
  const api={VERSION,mappingFor,planRow,audit,apply};
  g.ServiceReviewedMappingMigrationS2164=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
