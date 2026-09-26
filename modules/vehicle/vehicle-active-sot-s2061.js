'use strict';
/**
 * S2061-S2069 — Vehicle-scoped SOT boundary.
 *
 * Contract: every vehicle owns an independent data namespace. vehicleId is the
 * partition key; vehicle type is metadata/compatibility inside that partition.
 * This helper does not create a second data store and does not copy data.
 */
(function(global){
  const root=global||globalThis;
  const VERSION='VEHICLE-SCOPED-SOT-V1';
  const str=v=>String(v==null?'':v).trim();
  const same=(a,b)=>str(a)!==''&&str(a)===str(b);
  const data=()=>typeof D!=='undefined'?D:root.D;
  const vehicles=()=>{const d=data();return d&&Array.isArray(d.vehicles)?d.vehicles:[];};
  const findVehicle=id=>vehicles().find(v=>v&&same(v.id,id))||null;
  const vehicleType=v=>str(v&&(v.vehicleType||v.jenis||v.type)).toLowerCase()||null;

  function currentId(){try{if(typeof curVehicleId!=='undefined')return str(curVehicleId);}catch(e){/* global lexical scope may be unavailable in isolated/test contexts; safe fallback */} return typeof root.curVehicleId!=='undefined'?str(root.curVehicleId):'';}
  function ensureActive(preferred){
    const list=vehicles();
    if(!list.length){try{if(typeof curVehicleId!=='undefined')curVehicleId=null;}catch(e){/* global lexical scope may be unavailable in isolated/test contexts; safe fallback */};if(typeof root.curVehicleId!=='undefined')root.curVehicleId=null;return null;}
    const id=str(preferred||currentId());
    const v=findVehicle(id)||list[0];
    try{if(typeof curVehicleId!=='undefined')curVehicleId=v.id;}catch(e){/* global lexical scope may be unavailable in isolated/test contexts; safe fallback */};if(typeof root.curVehicleId!=='undefined')root.curVehicleId=v.id;
    return v;
  }
  function setActive(id,opts){
    const v=findVehicle(id);
    if(!v)return {ok:false,code:'vehicle_not_found',vehicleId:str(id)||null};
    const previous=currentId();
    try{if(typeof curVehicleId!=='undefined')curVehicleId=v.id;}catch(e){/* global lexical scope may be unavailable in isolated/test contexts; safe fallback */};if(typeof root.curVehicleId!=='undefined')root.curVehicleId=v.id;
    const changed=!same(previous,v.id);
    if(!opts||opts.emit!==false){
      try{ const bus=(typeof AIBus!=='undefined'?AIBus:root.AIBus); if(bus&&typeof bus.emit==='function')bus.emit('vehicle.context.changed',{vehicleId:v.id,vehicleType:vehicleType(v),previousVehicleId:previous||null}); }catch(e){/* global lexical scope may be unavailable in isolated/test contexts; safe fallback */}
      try{ if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('vehicle-context-changed',{detail:{vehicleId:v.id,vehicleType:vehicleType(v),previousVehicleId:previous||null}})); }catch(e){/* global lexical scope may be unavailable in isolated/test contexts; safe fallback */}
    }
    return {ok:true,changed,vehicle:v,vehicleId:v.id,vehicleType:vehicleType(v)};
  }
  function context(id){
    const v=findVehicle(id||currentId());
    return v?{vehicleId:String(v.id),vehicleType:vehicleType(v),vehicle:v}:null;
  }
  function assertVehicle(record,vehicleId,field){
    const vid=str(vehicleId||currentId());
    const value=record&&record[field||'vehicleId'];
    return !!vid&&!!value&&same(value,vid);
  }
  function scopeRows(rows,vehicleId){
    const vid=str(vehicleId||currentId());
    return (Array.isArray(rows)?rows:[]).filter(r=>r&&same(r.vehicleId,vid));
  }
  function auditRows(rows,vehicleId,name,opts){
    opts=opts||{};
    const vid=str(vehicleId||currentId()), v=findVehicle(vid), vt=vehicleType(v);
    const list=Array.isArray(rows)?rows:[];
    const missingVehicleId=[],wrongVehicle=[],typeMismatch=[],duplicateIds=[];
    const seen=new Set();
    for(const r of list){
      if(!r)continue;
      const id=r.id!=null?str(r.id):'';
      if(id){if(seen.has(id))duplicateIds.push(id);seen.add(id);}
      if(!r.vehicleId)missingVehicleId.push(id||null);
      else if(vid&&!same(r.vehicleId,vid)&&opts.onlyVehicle!==false)wrongVehicle.push({id:id||null,vehicleId:str(r.vehicleId)});
      const rt=str(r.vehicleType||r.jenisKendaraan||r.jenis||'').toLowerCase();
      if(vt&&rt&&rt!==vt)typeMismatch.push({id:id||null,vehicleType:rt,expected:vt});
    }
    return {version:VERSION,name:name||'domain',vehicleId:vid||null,vehicleType:vt,total:list.length,missingVehicleId,wrongVehicle,typeMismatch,duplicateIds,ok:!missingVehicleId.length&&!wrongVehicle.length&&!typeMismatch.length&&!duplicateIds.length};
  }
  function auditVehicle(vehicleId){
    const vid=str(vehicleId||currentId()), v=findVehicle(vid);
    if(!v)return {ok:false,code:'vehicle_not_found',vehicleId:vid||null};
    const D=data()||{};
    const domains={
      servisLogs:auditRows(D.servisLogs,vid,'servisLogs'),
      bbmLogs:auditRows(D.bbmLogs,vid,'bbmLogs'),
      kmLogs:auditRows(D.kmLogs,vid,'kmLogs'),
      jalanLogs:auditRows(D.jalanLogs,vid,'jalanLogs'),
      serviceReminderPackages:auditRows(D.serviceReminderPackages,vid,'serviceReminderPackages'),
      serviceAuditGroups:auditRows(D.serviceAuditGroups,vid,'serviceAuditGroups')
    };
    return {ok:Object.values(domains).every(x=>x.ok),version:VERSION,vehicleId:String(v.id),vehicleType:vehicleType(v),vehicleName:v.name||'',domains};
  }
  function assertWrite(vehicleId,record){
    const vid=str(vehicleId||currentId());
    const v=findVehicle(vid);
    if(!v)return {ok:false,code:'vehicle_not_found',vehicleId:vid||null};
    if(!record||!record.vehicleId)return {ok:false,code:'vehicle_id_required',vehicleId:vid};
    if(!same(record.vehicleId,vid))return {ok:false,code:'vehicle_scope_mismatch',vehicleId:vid,recordVehicleId:str(record.vehicleId)};
    return {ok:true,vehicleId:vid,vehicleType:vehicleType(v)};
  }
  function auditAll(){return vehicles().map(v=>auditVehicle(v.id));}

  root.VehicleScopedSOT={version:VERSION,currentId,findVehicle,vehicleType,ensureActive,setActive,context,scopeRows,assertVehicle,assertWrite,auditRows,auditVehicle,auditAll};
  if(typeof window!=='undefined')window.VehicleScopedSOT=root.VehicleScopedSOT;
  try{ensureActive();}catch(e){/* global lexical scope may be unavailable in isolated/test contexts; safe fallback */}
})(typeof window!=='undefined'?window:globalThis);
