#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');const args=process.argv.slice(2);const manifest=args.shift();
if(!manifest){console.error('Usage: node scripts/build-with-patch-manifest.js <manifest> [build args...]');process.exit(2);}
const abs=path.resolve(ROOT,manifest);if(!fs.existsSync(abs)){console.error(`PATCH PREFLIGHT FAILED — manifest tidak ditemukan: ${manifest}`);process.exit(2);}
const text=fs.readFileSync(abs,'utf8');const a=text.lastIndexOf('\nBEGIN_APPLY_FILES\n'),b=text.indexOf('\nEND_APPLY_FILES',a);
if(a<0||b<a){console.error(`PATCH PREFLIGHT FAILED — manifest ${manifest} tidak memiliki blok BEGIN_APPLY_FILES/END_APPLY_FILES`);process.exit(2);}
const files=text.slice(a+'\nBEGIN_APPLY_FILES\n'.length,b).split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
const missing=files.filter(f=>!fs.existsSync(path.join(ROOT,f)));
if(missing.length){console.error('PATCH PREFLIGHT FAILED — patch belum lengkap. Tidak ada build/version mutation yang dijalankan.');for(const f of missing)console.error(`  - ${f}`);process.exit(1);}
console.log(`PATCH PREFLIGHT PASS — ${files.length} files present.`);
const r=spawnSync(process.execPath,[path.join(ROOT,'scripts','build.js'),...args],{cwd:ROOT,stdio:'inherit',env:{...process.env,PATCH_MANIFEST:manifest}});process.exit(r.status==null?2:r.status);
