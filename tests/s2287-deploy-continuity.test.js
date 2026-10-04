const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','modules/shared/features-helpers-global-security.js'),'utf8');

test('S2287: continuity sentinel exists and compares only on build transition',()=>{
 assert.match(src,/const _continuityHighWaterKey='kw_v4_continuity_highwater_v1'/);
 assert.match(src,/function _checkDeployContinuity\(previousMeta,currentState,currentBuild\)/);
 assert.match(src,/if\(!prevBuild\|\|!currentBuild\|\|String\(prevBuild\)===String\(currentBuild\)\)return null;/);
});

test('S2287: populated critical collections cannot silently become empty after deploy',()=>{
 assert.match(src,/if\(before>0&&after===0\)drops\.push\(/);
 assert.match(src,/phase:'deploy-continuity'/);
 assert.match(src,/Tidak ada penyimpanan ulang yang diizinkan/);
});

test('S2287: high-water metrics never decrease',()=>{
 assert.match(src,/Math\.max\(Number\(prev\[k\]\)\|\|0,Number\(metrics\[k\]\)\|\|0\)/);
 assert.match(src,/localStorage\.setItem\(_continuityHighWaterKey/);
});

test('S2287: continuity baseline is checked before metadata/high-water update',()=>{
 const check=src.indexOf('const _continuityPreviousMeta=_readRuntimeMeta();');
 const record=src.indexOf('_recordRuntimeMeta({loadedFrom:',check);
 const high=src.indexOf('_updateContinuityHighWater(_continuityMetrics(D)',check);
 assert.ok(check>=0&&record>check&&high>record);
});
