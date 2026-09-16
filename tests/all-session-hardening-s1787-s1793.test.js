'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const run=n=>{const m=require(path.join(ROOT,'scripts',n));return typeof m.check==='function'?m.check():m.verify();};
test('S1787 architecture SoT gate',()=>assert.equal(run('architecture-integrity-gate.js').ok,true));
test('S1788 persistence SoT gate',()=>assert.equal(run('persistence-integrity-gate.js').ok,true));
test('S1789 runtime lifecycle gate',()=>assert.equal(run('verify-runtime-lifecycle.js').ok,true));
test('S1791 PWA recovery gate',()=>assert.equal(run('pwa-recovery-integrity-gate.js').ok,true));
test('S1792 critical feature manifest gate',()=>assert.equal(run('feature-regression-gate.js').ok,true));
test('S1793 release firewall has all hard gates',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/release-firewall.js'),'utf8');
 for(const f of ['architecture-integrity-gate.js','persistence-integrity-gate.js','pwa-recovery-integrity-gate.js','feature-regression-gate.js','sot-integrity-gate.js','verify-delete-manifest.js','verify-version-integrity.js','verify-runtime-lifecycle.js','verify-carnotes-integrity.js','verify-bundle-freshness.js'])assert.match(s,new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
test('S1790 data migration failure tidak melompati schema checkpoint',()=>{
 const {loadSource}=require('./helpers/loadSource');
 const ctx=loadSource(['modules/shared/features-helpers-global-security.js'],{
  DEFAULT_COBEK_KATEGORI:[],DEFAULT_CATS:{income:[],expense:[]},DEFAULT_ACCOUNTS:[],DEFAULT_SPAREPARTS:[],
  uid:(()=>{let n=0;return()=>`u${n++}`;})()
 },['SCHEMA_VERSION','D','DATA_MIGRATIONS']);
 const before=ctx.DATA_MIGRATIONS.length;
 let afterRan=false;
 ctx.DATA_MIGRATIONS.push({toVersion:9003,desc:'failing probe',migrate(){throw new Error('probe');}},{toVersion:9004,desc:'must not run',migrate(){afterRan=true;}});
 try {
  const returned=ctx.runDataMigrations(9002);
  assert.equal(afterRan,false);
  assert.equal(returned,9002);
  assert.equal(ctx.D.schemaVersion,9002);
 } finally { ctx.DATA_MIGRATIONS.length=before; }
});
