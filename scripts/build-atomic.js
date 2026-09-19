#!/usr/bin/env node
'use strict';
/** Atomic build wrapper. It snapshots build-owned source/artifact files, runs build.js,
 * and restores them on any failure. This prevents partial version bumps and half-written
 * bundles/HTML/SW from surviving a failed build.
 */
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const include=new Set(['index.html','app_production.html','sw.js','app-bundle-a.min.js','app-bundle-b.min.js','chat-action-handlers.js','package.json']);
function collect(rel){const abs=path.join(ROOT,rel);if(!fs.existsSync(abs))return;for(const n of fs.readdirSync(abs)){const p=path.join(abs,n),s=fs.statSync(p);if(s.isDirectory()&&!['node_modules','.git','.test-checkpoints','backups'].includes(n))collect(path.join(rel,n));else if(/\.(js|html|md)$/.test(n))include.add(path.relative(ROOT,p));}}
collect('modules');
const backup=fs.mkdtempSync(path.join(os.tmpdir(),'kw-build-atomic-'));const manifest=[];
for(const rel of include){const src=path.join(ROOT,rel),dst=path.join(backup,rel);if(fs.existsSync(src)){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);manifest.push({rel,exists:true});}else manifest.push({rel,exists:false});}
function restore(){for(const x of manifest){const src=path.join(ROOT,x.rel),bak=path.join(backup,x.rel);if(x.exists){fs.mkdirSync(path.dirname(src),{recursive:true});fs.copyFileSync(bak,src);}else if(fs.existsSync(src))fs.rmSync(src,{force:true});}}
const r=spawnSync(process.execPath,[path.join(__dirname,'build.js'),...process.argv.slice(2)],{cwd:ROOT,stdio:'inherit',env:process.env});
if(r.status!==0){console.error(`\n❌ ATOMIC BUILD ROLLBACK — ${manifest.length} build-owned files restored.`);restore();fs.rmSync(backup,{recursive:true,force:true});process.exit(r.status||1);}
fs.rmSync(backup,{recursive:true,force:true});console.log(`✓ Atomic build committed (${manifest.length} files protected).`);
