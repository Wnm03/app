'use strict';
// S1987: app-wide contract for reusable modal geometry isolation.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

function read(p){return fs.readFileSync(path.join(root,p),'utf8');}

test('S1987 PWAUX exposes an explicit reusable-modal geometry reset helper',()=>{
  const s=read('modules/shared/pwa-ux-performance.js');
  assert.match(s,/PWAUX\.restoreReusableModalGeometry=function\(overlay,panelIds\)/);
  assert.match(s,/PWAUX\.resetOverlayGeometry\(overlay\)/);
});

test('S1987 service modal delegates Create reset to the shared geometry contract',()=>{
  const s=read('modules/vehicle/servis.js');
  assert.match(s,/PWAUX\.restoreReusableModalGeometry\(overlay,\['servisDetailPanel','servisReminderPanel','servisHistoryPanel','servisAuditPanel'\]\)/);
  assert.match(s,/if\(Servis\.editId!==null\)\{[\s\S]*?_normalizeEditModalGeometry\(\)[\s\S]*?\}else\{[\s\S]*?_restoreCreateModalGeometry\(\);/);
});

test('S1987 no unguarded Edit geometry normalization remains after servisModal open',()=>{
  const s=read('modules/vehicle/servis.js');
  assert.doesNotMatch(s,/openModal\('servisModal'\);\s*Servis\._normalizeEditModalGeometry\(\);/);
});

test('S1987 global modal open still resets overlay transform before snapshot',()=>{
  const s=read('modules/shared/modal-navigasi.js');
  const i=s.indexOf('function openModal(id){');
  assert.ok(i>=0);
  const chunk=s.slice(i,i+9000);
  assert.match(chunk,/PWAUX\.resetOverlayGeometry\(el\)/);
  assert.ok(chunk.indexOf('PWAUX.resetOverlayGeometry(el)')<chunk.indexOf('_proModalEditSnapshot='));
});
