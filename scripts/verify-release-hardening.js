#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const fail=[]; const ok=[];
function pass(s){ok.push(s)} function bad(s){fail.push(s)}
function read(f){return fs.readFileSync(path.join(ROOT,f),'utf8')}
function sha(s){return crypto.createHash('sha256').update(s).digest('hex')}
// Toolchain gate: report, never silently downgrade a release build.
for(const bin of ['node']){try{pass(`${bin} ${execFileSync(bin,['--version'],{encoding:'utf8'}).trim()}`)}catch{bad(`missing required tool: ${bin}`)}}
for(const bin of ['eslint','esbuild']){try{const v=execFileSync(bin,['--version'],{encoding:'utf8'}).trim();pass(`${bin} ${v}`)}catch{bad(`missing release tool: ${bin} (install before production release)`)} }
// Bundle/source freshness markers.
const bh=require('./bundle-hash');
const build=read('scripts/build.js');
const mA=build.match(/const GROUP_A = \[([\s\S]*?)\n\];/); const mB=build.match(/const GROUP_B = \[([\s\S]*?)\n\];/);
function parseGroup(m){return [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1])}
if(!mA||!mB) bad('cannot parse build groups'); else for(const [name,g,bundle] of [['A',parseGroup(mA),'app-bundle-a.min.js'],['B',parseGroup(mB),'app-bundle-b.min.js']]){
  const h=bh.computeGroupHash(g,f=>read(f)); const got=bh.extractEmbeddedHash(read(bundle));
  if(h!==got) bad(`bundle ${name} source hash stale (expected ${h}, got ${got||'none'})`); else pass(`bundle ${name} source hash fresh`);
}
// HTML mirror contract.
const prod=read('app_production.html').replace(/<!-- AUTO-GENERATED oleh scripts\/build\.js dari index\.html[\s\S]*?-->\n\n?/, '');
if(prod!==read('index.html')) bad('app_production.html is not an exact generated mirror'); else pass('HTML mirror exact');
// PWA cache contract.
const sw=read('sw.js'); const cache=(sw.match(/const CACHE_NAME = '([^']+)'/)||[])[1];
if(!cache) bad('SW cache name missing');
for(const f of ['index.html','app_production.html','app-bundle-a.min.js','app-bundle-b.min.js','styles.css']) if(!fs.existsSync(path.join(ROOT,f))) bad(`precache target missing: ${f}`);
if(cache) pass(`SW cache ${cache}`);
// Fixed bundle budget: grows only by an explicit source-controlled budget change.
const budgets=JSON.parse(read('config/release-budgets.json')).bundle_budget_bytes;
for(const n of Object.keys(budgets)){const size=fs.statSync(path.join(ROOT,n)).size;if(size>budgets[n]) bad(`${n} exceeds fixed budget (${size} > ${budgets[n]})`); else pass(`${n} within fixed size budget`);}
// Listener/timer ownership guard: forbid obvious top-level duplicate maintenance registrations in runtime extraction.
const rt=fs.existsSync(path.join(ROOT,'modules/shared/app-init-runtime.js'))?read('modules/shared/app-init-runtime.js'):'';
const interval=(rt.match(/setInterval\s*\(/g)||[]).length;
if(interval>2) bad(`runtime has ${interval} setInterval registrations; review ownership`); else pass(`runtime interval registrations ${interval}`);
console.log(ok.map(x=>`PASS ${x}`).join('\n'));
if(fail.length){console.error(fail.map(x=>`FAIL ${x}`).join('\n'));process.exit(1)}
console.log('RELEASE HARDENING: PASS (except explicitly reported unavailable toolchain items above)');
