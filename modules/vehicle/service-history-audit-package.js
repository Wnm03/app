'use strict';
/**
 * S1956 — Service History Audit / Work Package SOT.
 * A package is a read-model/reference layer over existing service-history SOT rows.
 * It NEVER merges, moves, edits, or deletes source service records.
 * One package may reference many service records and can be labelled Overhaul/Turun Mesin,
 * Servis CVT Besar, Perbaikan, or a user-defined title.
 */
(function(global){
  const VERSION='SERVICE-HISTORY-AUDIT-PACKAGE-SOT-1';
  const TYPES=Object.freeze([
    {id:'routine',label:'Servis Rutin'},
    {id:'inspection',label:'Pemeriksaan'},
    {id:'repair',label:'Perbaikan'},
    {id:'overhaul_turun_mesin',label:'Overhaul / Turun Mesin'},
    {id:'cvt_besar',label:'Servis CVT Besar'},
    {id:'other',label:'Pekerjaan Lainnya'}
  ]);
  const str=v=>v==null?'':String(v).trim();
  const arr=v=>Array.isArray(v)?v:[];
  function logs(){return global.D&&Array.isArray(global.D.servisLogs)?global.D.servisLogs:[];}
  function groups(){
    if(!global.D)return[];
    if(!Array.isArray(global.D.serviceAuditGroups))global.D.serviceAuditGroups=[];
    return global.D.serviceAuditGroups;
  }
  function id(){return typeof global.uid==='function'?global.uid():'sag_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
  function type(idOrLabel){const s=str(idOrLabel);return TYPES.find(x=>x.id===s||x.label===s)||null;}
  function validSourceIds(ids){
    const wanted=[...new Set(arr(ids).map(str).filter(Boolean))];
    return wanted.filter(x=>logs().some(s=>s&&str(s.id)===x));
  }
  function categoryFor(log){
    if(!log)return null;
    if(log.masterCategoryId&&global.ServiceInputCatalog&&typeof global.ServiceInputCatalog.groupById==='function'){
      const g=global.ServiceInputCatalog.groupById(log.masterCategoryId);
      if(g)return {id:g.masterCategoryId||log.masterCategoryId,name:g.group||log.masterCategoryId};
    }
    return log.masterCategoryId||log.categoryId||null;
  }
  function componentFor(log){
    if(!log)return null;
    if(log.serviceComponentId&&global.ServiceInputCatalog&&typeof global.ServiceInputCatalog.itemById==='function'){
      const hit=global.ServiceInputCatalog.itemById(log.serviceComponentId);
      if(hit&&hit.item)return {id:hit.item.id,name:hit.item.name};
    }
    return log.serviceComponentId?{id:log.serviceComponentId,name:log.item||log.serviceComponentId}:null;
  }
  function sourceRows(group){
    const ids=new Set(arr(group&&group.sourceServiceIds).map(str));
    return logs().filter(s=>s&&ids.has(str(s.id)));
  }
  function integrity(group){
    const p=normalize(group); const wanted=new Set(p.sourceServiceIds); const rows=sourceRows(p);
    const found=new Set(rows.map(s=>str(s.id)));
    const missing=[...wanted].filter(id=>!found.has(id));
    const wrongVehicle=rows.filter(s=>str(s.vehicleId)!==str(p.vehicleId)).map(s=>str(s.id));
    return {ok:missing.length===0&&wrongVehicle.length===0,missingSourceIds:missing,wrongVehicleSourceIds:wrongVehicle,foundSourceIds:[...found],expectedCount:wanted.size,foundCount:rows.length};
  }
  function summarize(group){
    const rows=sourceRows(group);
    const components=new Map(), categories=new Map(), parts=new Map();
    let totalCost=0, kmMin=null, kmMax=null, inspections=0, services=0;
    rows.forEach(s=>{
      services++;
      const cost=Number(s.cost);
      if(Number.isFinite(cost))totalCost+=cost;
      const km=Number(s.km);
      if(Number.isFinite(km)){kmMin=kmMin==null?km:Math.min(kmMin,km);kmMax=kmMax==null?km:Math.max(kmMax,km);}
      if(s.conditionResult||s.conditionNote||s.actionType==='periksa')inspections++;
      const c=componentFor(s); if(c)components.set(String(c.id),c.name);
      const g=categoryFor(s); if(g){const k=typeof g==='object'?g.id:String(g);const n=typeof g==='object'?g.name:String(g);categories.set(k,n);}
      if(s.catalogPartId||s.usedPartId){const k=str(s.catalogPartId||s.usedPartId);if(k)parts.set(k,s.partName||s.item||k);}
    });
    return {services,components:[...components].map(([id,name])=>({id,name})),categories:[...categories].map(([id,name])=>({id,name})),parts:[...parts].map(([id,name])=>({id,name})),inspections,totalCost,kmMin,kmMax};
  }
  function normalize(p){
    const out=Object.assign({},p||{});
    out.id=str(out.id)||id();
    out.vehicleId=str(out.vehicleId)||null;
    out.title=str(out.title)||'Paket Pekerjaan';
    const t=type(out.typeId||out.type); out.typeId=t?t.id:'other'; out.typeLabel=t?t.label:(str(out.typeLabel)||'Pekerjaan Lainnya');
    out.sourceServiceIds=[...new Set(arr(out.sourceServiceIds).map(str).filter(Boolean))];
    out.sourceCount=out.sourceServiceIds.length;
    out.createdAt=out.createdAt||new Date().toISOString();
    out.updatedAt=out.updatedAt||out.createdAt;
    out.sotVersion=VERSION;
    return out;
  }
  function create(input){
    input=input||{};
    const vehicleId=str(input.vehicleId); if(!vehicleId)return{ok:false,code:'vehicle_required'};
    const ids=validSourceIds(input.sourceServiceIds); if(ids.length<2)return{ok:false,code:'need_two_source_records'};
    const rows=logs().filter(s=>ids.includes(str(s.id)));
    if(rows.some(s=>str(s.vehicleId)!==vehicleId))return{ok:false,code:'vehicle_mismatch'};
    const t=type(input.typeId||input.type)||TYPES.find(x=>x.id==='other');
    const existing=findExistingBySources(vehicleId,ids); if(existing)return{ok:false,code:'duplicate_source_package',package:normalize(existing),summary:summarize(existing)};
    const p=normalize({id:id(),vehicleId,title:input.title,typeId:t.id,typeLabel:t.label,sourceServiceIds:ids,createdAt:new Date().toISOString()});
    groups().push(p); if(typeof global.save==='function')global.save({domain:'vehicle'});
    return{ok:true,package:p,summary:summarize(p)};
  }
  function byId(packageId){return groups().find(p=>p&&str(p.id)===str(packageId))||null;}
  function forVehicle(vehicleId){return groups().filter(p=>p&&str(p.vehicleId)===str(vehicleId)).map(normalize);}
  function audit(packageId){const p=byId(packageId);if(!p)return{ok:false,code:'not_found'};const rows=sourceRows(p);return{ok:true,package:p,summary:summarize(p),sourceRows:rows,integrity:integrity(p)};}
  function findExistingBySources(vehicleId,sourceServiceIds){const ids=[...new Set(arr(sourceServiceIds).map(str).filter(Boolean))].sort();if(ids.length<2)return null;return groups().find(p=>{if(str(p.vehicleId)!==str(vehicleId))return false;const cur=[...new Set(arr(p.sourceServiceIds).map(str).filter(Boolean))].sort();return cur.length===ids.length&&cur.every((v,i)=>v===ids[i]);})||null;}
  function sameSourceSet(a,b){const x=[...new Set(arr(a).map(str).filter(Boolean))].sort(),y=[...new Set(arr(b).map(str).filter(Boolean))].sort();return x.length===y.length&&x.every((v,i)=>v===y[i]);}
  function update(packageId,patch){
    const p=byId(packageId); if(!p)return{ok:false,code:'not_found'};
    const vehicleId=str(p.vehicleId); const ids=patch&&patch.sourceServiceIds!==undefined?validSourceIds(patch.sourceServiceIds):p.sourceServiceIds.slice();
    if(ids.length<2)return{ok:false,code:'need_two_source_records'};
    const rows=logs().filter(s=>ids.includes(str(s.id))); if(rows.length!==ids.length)return{ok:false,code:'source_missing'};
    if(rows.some(s=>str(s.vehicleId)!==vehicleId))return{ok:false,code:'vehicle_mismatch'};
    const duplicate=groups().find(x=>str(x.id)!==str(packageId)&&str(x.vehicleId)===vehicleId&&sameSourceSet(x.sourceServiceIds,ids));
    if(duplicate)return{ok:false,code:'duplicate_source_package',package:normalize(duplicate)};
    const t=patch&&patch.typeId!==undefined?type(patch.typeId):type(p.typeId);
    if(patch&&patch.title!==undefined)p.title=str(patch.title)||'Paket Pekerjaan'; if(t){p.typeId=t.id;p.typeLabel=t.label;}
    p.sourceServiceIds=ids;p.sourceCount=ids.length;p.updatedAt=new Date().toISOString();p.sotVersion=VERSION;
    if(typeof global.save==='function')global.save({domain:'vehicle'}); return{ok:true,package:normalize(p),summary:summarize(p)};
  }
  function candidates(vehicleId,options){
    options=options||{};const maxDays=Number.isFinite(Number(options.maxDays))?Number(options.maxDays):2,maxKm=Number.isFinite(Number(options.maxKm))?Number(options.maxKm):100;
    const rows=logs().filter(s=>s&&str(s.vehicleId)===str(vehicleId)).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||Number(a.km||0)-Number(b.km||0));const out=[];
    rows.forEach(row=>{const date=String(row.date||''),km=Number(row.km),session=str(row.sessionId),cat=str(row.masterCategoryId||row.categoryId);let g=out.find(x=>Math.abs((new Date(date)-new Date(x.dateMin))/86400000)<=maxDays&&(!Number.isFinite(km)||!Number.isFinite(x.kmMin)||Math.abs(km-x.kmMin)<=maxKm)&&((session&&x.sessionIds.has(session))||(cat&&x.categoryIds.has(cat))||(!session&&!cat)));
      if(!g){g={vehicleId:String(vehicleId),dateMin:date,dateMax:date,kmMin:Number.isFinite(km)?km:null,kmMax:Number.isFinite(km)?km:null,sessionIds:new Set(),categoryIds:new Set(),sourceServiceIds:[]};out.push(g);}g.dateMin=g.dateMin&&date?[g.dateMin,date].sort()[0]:date;g.dateMax=g.dateMax&&date?[g.dateMax,date].sort().slice(-1)[0]:date;if(Number.isFinite(km)){g.kmMin=g.kmMin==null?km:Math.min(g.kmMin,km);g.kmMax=g.kmMax==null?km:Math.max(g.kmMax,km);}if(session)g.sessionIds.add(session);if(cat)g.categoryIds.add(cat);g.sourceServiceIds.push(String(row.id));});
    return out.filter(g=>g.sourceServiceIds.length>=2&&!groups().some(p=>str(p.vehicleId)===str(vehicleId)&&sameSourceSet(p.sourceServiceIds,g.sourceServiceIds))).map(g=>({vehicleId:g.vehicleId,sourceServiceIds:g.sourceServiceIds,dateMin:g.dateMin,dateMax:g.dateMax,kmMin:g.kmMin,kmMax:g.kmMax,sourceCount:g.sourceServiceIds.length}));
  }
  function remove(packageId){const before=groups().length;global.D.serviceAuditGroups=groups().filter(p=>str(p.id)!==str(packageId));if(global.D.serviceAuditGroups.length===before)return{ok:false,code:'not_found'};if(typeof global.save==='function')global.save({domain:'vehicle'});return{ok:true};}
  const api={VERSION,TYPES,logs,groups,type,normalize,create,update,byId,forVehicle,audit,remove,summarize,sourceRows,integrity,findExistingBySources,candidates};
  global.ServiceHistoryAuditPackage=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
