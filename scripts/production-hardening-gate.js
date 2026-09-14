#!/usr/bin/env node
const fs=require('fs'),path=require('path'),child=require('child_process');
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const build=read('scripts/build.js');
const car=read('car-notes.js');
const servis=read('modules/vehicle/servis.js');
if((servis.match(/^const\s+Servis\s*=\s*\{/gm)||[]).length!==1) throw new Error('Servis owner count != 1');
if(/^const\s+Servis\s*=\s*\{/m.test(car)) throw new Error('car-notes.js still owns Servis');
if(!/modules\/vehicle\/servis\.js/.test(build)) throw new Error('servis.js missing from build groups');
if(!/let\s+cnPeriodeByTab\s*=/.test(read('modules/shared/features-helpers-global-security.js'))) throw new Error('cnPeriodeByTab missing');
for(const f of ['app-bundle-a.min.js','app-bundle-b.min.js']) child.execFileSync(process.execPath,['--check',f],{stdio:'ignore'});
const html=read('index.html'); const sw=read('sw.js');
const v=(html.match(/[?&]v=(\d+)/)||[])[1]; const cv=(sw.match(/kw-cache-v(\d+)/)||[])[1];
if(v && cv && v!==cv) throw new Error(`HTML/SW version mismatch: ${v}/${cv}`);
console.log('PRODUCTION HARDENING GATE: PASS');
