const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const matrix=JSON.parse(fs.readFileSync(path.join(root,'docs/SOT-OWNERSHIP-MATRIX-S2153.json'),'utf8'));

test('S2153 ownership matrix declares canonical domains',()=>{
  const names=new Set(matrix.domains.map(x=>x.domain));
  for(const n of ['vehicleIdentity','activeVehicleContext','serviceTaxonomy','serviceEvent','serviceSession','checklistExecution','serviceInterval','reminderPlan','reminderDue','stock','financeTransaction','dashboard']) assert.ok(names.has(n),`missing domain ${n}`);
});

test('S2153 forbids feature-owned duplicate fact stores in architecture contract',()=>{
  const reminder=matrix.domains.find(x=>x.domain==='reminderDue');
  const dashboard=matrix.domains.find(x=>x.domain==='dashboard');
  assert.equal(reminder.fact,false);
  assert.equal(dashboard.fact,false);
  assert.equal(reminder.writeAuthority,'none');
  assert.equal(dashboard.writeAuthority,'none');
});

test('S2153 locks primary storage owners for service, stock, finance',()=>{
  const get=n=>matrix.domains.find(x=>x.domain===n);
  assert.equal(get('serviceEvent').storage,'D.servisLogs');
  assert.equal(get('stock').storage,'D.partsStock');
  assert.equal(get('financeTransaction').storage,'D.transactions');
});
