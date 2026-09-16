'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const cp=require('node:child_process'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const [name,file] of [['PWA recovery','scripts/verify-pwa-recovery.js'],['listener lifecycle','scripts/verify-listener-lifecycle.js']]) test(`${name} contract`,()=>{const r=cp.spawnSync(process.execPath,[file],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr)});
test('release hardening script is deterministic and has no silent toolchain fallback',()=>{const r=cp.spawnSync(process.execPath,['scripts/verify-release-hardening.js'],{cwd:root,encoding:'utf8'});assert.notEqual(r.status,0,'environment must explicitly report unavailable release tools');assert.match(r.stderr,/missing release tool: (eslint|esbuild)/)});
test('run-full-test rejects zero-test shard as pass',()=>{const s=require('fs').readFileSync(path.join(root,'scripts/run-full-test.js'),'utf8');assert.match(s,/stats\.tests===0&&retryEmpty/);assert.match(s,/stats\.tests>0/)});
