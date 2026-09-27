'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const runtimeFiles=[
  'modules/shared/backup-restore.js',
  'modules/shared/features-helpers-global-security.js',
  'modules/shop/features-helpers-global-security.js',
  'modules/finance/features-helpers-global-security.js',
  'modules/asset/features-helpers-global-security.js',
];

test('S2093 no runtime bootstrap/restore path recreates legacy vehicle interval authority',()=>{
  for(const rel of runtimeFiles){
    const s=fs.readFileSync(path.join(root,rel),'utf8');
    assert.doesNotMatch(s,/\bserviceIntervalKm\s*:\s*3000\b/,rel+' must not seed legacy serviceIntervalKm');
    assert.doesNotMatch(s,/\.serviceIntervalKm\s*=\s*3000\b/,rel+' must not self-heal legacy serviceIntervalKm');
    assert.doesNotMatch(s,/\.oliTransmisiIntervalKm\s*=\s*\d+/,rel+' must not seed legacy transmission interval');
    assert.doesNotMatch(s,/\.intervalOverrides\s*=\s*\{\}/,rel+' must not seed legacy intervalOverrides');
  }
});

test('S2093 legacy interval assignment is isolated to the explicit migration module',()=>{
  const files=[];
  function walk(dir){
    for(const n of fs.readdirSync(dir)){
      if(['tests','docs','node_modules','backups'].includes(n))continue;
      const p=path.join(dir,n),st=fs.statSync(p);
      if(st.isDirectory())walk(p); else if(n.endsWith('.js'))files.push(p);
    }
  }
  walk(path.join(root,'modules'));
  const offenders=[];
  const assignment=/\b(?:v|vehicle|veh)\.(?:serviceIntervalKm|oliTransmisiIntervalKm|intervalOverrides)\s*=/;
  for(const f of files){
    const rel=path.relative(root,f).replace(/\\/g,'/');
    if(rel==='modules/vehicle/service-interval-sot.js')continue;
    const lines=fs.readFileSync(f,'utf8').split(/\r?\n/);
    lines.forEach((line,i)=>{if(assignment.test(line))offenders.push(rel+':'+(i+1));});
  }
  assert.deepEqual(offenders,[]);
});

test('S2093 canonical interval remains in VehicleCarNotesSOT after legacy fields are absent',()=>{
  const ctx={console,setTimeout,clearTimeout,JSON,Date,structuredClone};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.D={vehicles:[{id:'A',name:'Motor A',vehicleType:'motor'}],sparepartCats:[]};
  ctx.curVehicleId='A';
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'modules/vehicle/vehicle-car-notes-sot-s2071.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'modules/vehicle/service-interval-sot.js'),'utf8'),ctx);
  const r=ctx.ServiceIntervalSOT.setManual({id:'oli',name:'Oli Mesin',serviceComponentId:'oli-mesin'},'A',3000,null);
  assert.equal(r.ok,true);
  assert.equal(ctx.D.vehicles[0].serviceIntervalKm,undefined);
  assert.equal(ctx.D.vehicles[0].intervalOverrides,undefined);
  assert.equal(ctx.VehicleCarNotesSOT.getServiceInterval('A',{id:'oli',name:'Oli Mesin',serviceComponentId:'oli-mesin'}).intervalKm,3000);
});
