'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');

function freshPackage(saveResult=true,flushResult=true){
  delete global.ServiceHistoryAuditPackage;
  global.D={servisLogs:[
    {id:'a',vehicleId:'v1',date:'2026-09-01',km:100,item:'Jasa',cost:100000,masterCategoryId:'rem',serviceComponentId:'oil'},
    {id:'b',vehicleId:'v1',date:'2026-09-02',km:120,item:'Part',cost:200000,masterCategoryId:'mesin',serviceComponentId:'engine'},
    {id:'c',vehicleId:'v1',date:'2026-09-03',km:130,item:'Other',cost:50000,masterCategoryId:'mesin',serviceComponentId:'filter'}
  ],serviceAuditGroups:[]};
  let saves=0,flushes=0;
  global.save=()=>{saves++;return saveResult;};
  global.saveFlush=()=>{flushes++;return flushResult;};
  delete require.cache[require.resolve('../modules/vehicle/service-history-audit-package.js')];
  const api=require('../modules/vehicle/service-history-audit-package.js');
  return {api,getSaves:()=>saves,getFlushes:()=>flushes};
}

test('S1984 package lifecycle records change log and flushes critical persistence',()=>{
  const {api,getSaves,getFlushes}=freshPackage();
  const created=api.create({vehicleId:'v1',title:'Overhaul',typeId:'overhaul_turun_mesin',sourceServiceIds:['a','b']});
  assert.equal(created.ok,true);
  assert.equal(created.package.changeLog[0].action,'create');
  const updated=api.update(created.package.id,{title:'Overhaul selesai',status:'done'});
  assert.equal(updated.ok,true);
  assert.equal(api.byId(created.package.id).changeLog.at(-1).action,'update');
  assert.ok(getSaves()>=2);
  assert.ok(getFlushes()>=2);
});

test('S1984 package rollback also occurs when critical flush fails',()=>{
  const {api}=freshPackage(true,false);
  const r=api.create({vehicleId:'v1',sourceServiceIds:['a','b']});
  assert.equal(r.ok,false);
  assert.equal(r.code,'persistence_failed');
  assert.equal(global.D.serviceAuditGroups.length,0);
});

test('S1984 Job Type never rewrites an existing SOT category',()=>{
  delete global.ServiceSessionSOT;
  global.D={servisLogs:[]};
  global.save=()=>true;
  global.saveFlush=()=>true;
  delete require.cache[require.resolve('../modules/vehicle/service-session-sot.js')];
  const api=require('../modules/vehicle/service-session-sot.js');
  const row={id:'r1',vehicleId:'v1',masterCategoryId:'body',serviceComponentId:'shock'};
  const result=api.setJobType(row,'overhaul_turun_mesin','manual');
  assert.equal(result.ok,true);
  assert.equal(row.serviceJobType,'overhaul_turun_mesin');
  assert.equal(row.masterCategoryId,'body');
  assert.equal(row.serviceComponentId,'shock');
});

test('S1984 linkManual rolls back when persistence fails',()=>{
  delete global.ServiceSessionSOT;
  global.D={servisLogs:[{id:'a',vehicleId:'v1'},{id:'b',vehicleId:'v1'}]};
  global.save=()=>false;
  global.saveFlush=()=>true;
  delete require.cache[require.resolve('../modules/vehicle/service-session-sot.js')];
  const api=require('../modules/vehicle/service-session-sot.js');
  const r=api.linkManual(['a','b'],'overhaul_turun_mesin');
  assert.equal(r.ok,false);
  assert.equal(r.code,'persistence_failed');
  assert.equal(global.D.servisLogs[0].sessionId,null);
  assert.equal(global.D.servisLogs[1].serviceJobType,null);
});

test('S1984 disabled data-action controls are ignored before dispatch',()=>{
  const src=fs.readFileSync(path.join(root,'modules/shared/features-helpers-global-security.js'),'utf8');
  assert.match(src,/el\.disabled===true/);
  assert.match(src,/getAttribute&&el\.getAttribute\('aria-disabled'\)==='true'/);
});

test('S1984 critical Audit editors use saveFlush verification',()=>{
  const bulk=fs.readFileSync(path.join(root,'modules/vehicle/service-history-bulk-identity-editor.js'),'utf8');
  assert.match(bulk,/saveFlush\(\)===false/);
  assert.match(bulk,/persistence_verify_failed/);
  assert.match(bulk,/history-job-type-editor-s1974/);
});
