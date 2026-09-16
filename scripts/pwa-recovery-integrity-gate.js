#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.join(__dirname,'..');
function check(){const errors=[];const s=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
 for(const x of ["self.addEventListener('install'","self.skipWaiting()","caches.open(CACHE_NAME)","self.addEventListener('activate'","self.clients.claim()","self.addEventListener('fetch'","if (event.request.method !== 'GET') return","if (cached) return cached","return new Response('Offline atau resource tidak tersedia'"]){if(!s.includes(x))errors.push(`SW recovery contract hilang: ${x}`)}
 const m=s.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);if(!m)errors.push('PRECACHE_URLS hilang');else for(const f of ['index.html','app_production.html','styles.css','app-bundle-a.min.js','app-bundle-b.min.js','manifest.json'])if(!m[1].includes(`'./${f}'`))errors.push(`precache wajib hilang: ${f}`);
 const c=s.match(/CACHE_NAME\s*=\s*'([^']+)'/);if(!c)errors.push('CACHE_NAME hilang');
 return {ok:!errors.length,errors,cache:c&&c[1]};}
function main(){const r=check();if(!r.ok){console.error('PWA-RECOVERY-INTEGRITY: FAIL');r.errors.forEach(e=>console.error(' - '+e));process.exit(1)}console.log(`PWA-RECOVERY-INTEGRITY: PASS — ${r.cache}`)}
if(require.main===module)main();module.exports={check};
