'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {audit}=require('../scripts/audit-service-interval-conflicts-s2148');
test('S2148 audit is read-only and scans the full component master',()=>{
  const r=audit();
  assert.equal(r.mode,'read-only-audit');
  assert.equal(r.componentsScanned,102);
  assert.ok(Array.isArray(r.findings));
});
test('S2148 flags V-Belt CVT interval conflict instead of silently changing canonical data',()=>{
  const r=audit();
  const f=r.findings.find(x=>x.componentId==='v-belt-cvt');
  assert.ok(f,'expected V-Belt CVT conflict to remain visible');
  assert.equal(f.declaredIntervalKm,32000);
  assert.ok(f.mentionedIntervalsKm.includes(24000));
  assert.ok(f.mentionedIntervalsKm.includes(32000));
});
test('S2148 findings always identify a component and reason',()=>{
  const r=audit();
  for(const f of r.findings){assert.ok(f.componentId);assert.ok(f.reason);}
});
