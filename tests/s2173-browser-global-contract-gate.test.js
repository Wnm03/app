'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

function read(p){return fs.readFileSync(p,'utf8');}

test('S2173 generated taxonomy exports canonical browser global',()=>{
  const src=read('modules/vehicle/service-master-data.generated.js');
  assert.match(src,/globalThis\.__SERVICE_CHECKLIST_GROUPS__\s*=\s*SERVICE_CHECKLIST_GROUPS_GENERATED/);
});

test('S2173 all known runtime taxonomy adapters have browser-global fallback',()=>{
  const files=[
    'modules/vehicle/service-taxonomy-sot.js',
    'modules/vehicle/service-input-catalog.js',
    'modules/vehicle/service-history-sot-normalizer.js',
    'modules/vehicle/servis.js',
    'modules/vehicle/honda-oem-service-mapping.js',
    'modules/vehicle/sparepart-servis.js',
    'modules/vehicle/servis-checklist.js'
  ];
  for(const file of files){
    const src=read(file);
    assert.match(src,/__SERVICE_CHECKLIST_GROUPS__/,
      file+' must support the canonical generated browser taxonomy global');
  }
});

test('S2173 service taxonomy SOT remains the only persistent taxonomy owner',()=>{
  const sot=read('modules/vehicle/service-taxonomy-sot.js');
  const runtime=read('modules/vehicle/service-runtime-projection-sot-s2166.js');
  assert.match(sot,/facade\/projection|projection/i);
  assert.match(runtime,/read-only|projection/i);
  assert.doesNotMatch(runtime,/serviceCategories\s*=|serviceReminderPackages\s*=/,
    'runtime projection must not become a storage owner');
});
