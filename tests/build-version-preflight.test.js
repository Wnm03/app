const fs=require('node:fs');
const path=require('node:path');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const createBuildCore=require('../scripts/build-core');

const VERSION_FILES=[
  ['modules/shared/modules-render.js','MODULE_RENDER_VERSION'],
  ['modules/shared/modals.js','MODAL_VERSION'],
  ['modules/shared/modules-calc.js','MODULE_CALC_VERSION'],
  ['chat-action-handlers.js','MODULE_FEATURES_VERSION'],
  ['modules/shared/features-helpers-global-security.js','APP_BUILD_VERSION'],
  ['modules/shared/features-helpers-global-security.js','PRODUCTION_BUILD_SYNCED_VERSION'],
];

function fixture(overrides={}){
  const files={};
  for(const [file,name] of VERSION_FILES) files[file]=(files[file]||'')+`${name}='old-v1823';\n`;
  Object.assign(files,overrides);
  let writes=0;
  const core=createBuildCore({
    ROOT:'.',ALL_SOURCE:VERSION_FILES.map(x=>x[0]),
    readFile:f=>files[f]||'',writeFile:(f,c)=>{writes++;files[f]=c;},
    fs,path,computeGroupHash:()=>'',markerLine:()=>'',Buffer,
  });
  return {core,files,get writes(){return writes;}};
}

test('build version preflight fails before any write when a runtime version constant drifted',()=>{
  const bad=fixture({'modules/shared/modals.js':"MODAL_VERSION='drifted';\n"});
  assert.throws(()=>bad.core.bumpVersionEverywhere('old-v1823','old-v1824'),/PRE-BUILD VERSION PREFLIGHT FAILED/);
  assert.equal(bad.writes,0,'no source file may be written before version preflight passes');
  assert.equal(bad.files['modules/shared/modals.js'],"MODAL_VERSION='drifted';\n");
});

test('build version preflight permits a fully synchronized old version and bumps all matches',()=>{
  const ok=fixture();
  const changed=ok.core.bumpVersionEverywhere('old-v1823','old-v1824');
  assert.equal(changed.length,5);
  assert.equal(ok.writes,5);
  for(const [file] of VERSION_FILES) assert.match(ok.files[file],/old-v1824/);
});
