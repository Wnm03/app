#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {spawnSync}=require('node:child_process');const ROOT=path.resolve(__dirname,'..');
const canonical=fs.readFileSync(path.join(ROOT,'modules/shared/features-helpers-global-security.js'),'utf8');const m=canonical.match(/APP_BUILD_VERSION\s*=\s*'([^']+)'/);if(!m)throw new Error('APP_BUILD_VERSION tidak ditemukan');
const version=m[1],targets=['app-bundle-a.min.js','app-bundle-b.min.js','index.html','app_production.html','sw.js'];
function h(f){return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');}
function run(){return spawnSync(process.execPath,[path.join(ROOT,'scripts/build-atomic.js'),version],{cwd:ROOT,stdio:'inherit'}).status||0;}
if(run()!==0)process.exit(1);const first=Object.fromEntries(targets.map(f=>[f,h(f)]));
if(run()!==0)process.exit(1);const second=Object.fromEntries(targets.map(f=>[f,h(f)]));
const drift=targets.filter(f=>first[f]!==second[f]);if(drift.length){console.error('REPRODUCIBLE BUILD FAILED — explicit-version rebuild changed artifacts:');drift.forEach(x=>console.error('  '+x));process.exit(1);}console.log(`REPRODUCIBLE BUILD PASS — ${targets.length} artifacts byte-identical at ${version}.`);
