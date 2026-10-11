#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
function resolveManifest(){
if(process.env.PATCH_MANIFEST)return process.env.PATCH_MANIFEST;
// Tanpa PATCH_MANIFEST: pakai manifest B1-B10 dengan nomor build tertinggi (mis. PATCH-MANIFEST-B1-B10-S2041-2308.md), bukan manifest lama yang basi.
let best=null,bestN=-1;
for(const f of fs.readdirSync(ROOT)){const m=/^PATCH-MANIFEST-B1-B10-S\d+-(\d+)\.md$/.exec(f);if(m&&Number(m[1])>bestN){bestN=Number(m[1]);best=f;}}
return best||'PATCH-MANIFEST-S2529.md';
}
const manifestPath=resolveManifest();
const p=path.resolve(ROOT,manifestPath);if(!fs.existsSync(p))throw new Error(`Manifest tidak ditemukan: ${manifestPath}`);
const t=fs.readFileSync(p,'utf8');const a=t.indexOf('\nBEGIN_APPLY_FILES\n'),b=t.indexOf('\nEND_APPLY_FILES',a);if(a<0||b<0)throw new Error('Blok apply manifest tidak valid');
const files=t.slice(a+'\nBEGIN_APPLY_FILES\n'.length,b).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(x=>!x.startsWith('#'));
const missing=files.filter(f=>!fs.existsSync(path.join(ROOT,f)));
const dup=files.filter((f,i)=>files.indexOf(f)!==i);
const delMatch=t.match(/\nBEGIN_DELETE_FILES\n([\s\S]*?)\nEND_DELETE_FILES/);const deletes=delMatch?delMatch[1].split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(x=>!x.startsWith('#')):[];
const stillPresent=deletes.filter(f=>fs.existsSync(path.join(ROOT,f)));
const forbidden=files.filter(f=>/[\\/]\.tmp$|\.bak$|node_modules|\.test-checkpoints/.test(f));
const digest=crypto.createHash('sha256');for(const f of files){if(fs.existsSync(path.join(ROOT,f)))digest.update(f+'\0'+fs.readFileSync(path.join(ROOT,f)));}
if(missing.length||dup.length||stillPresent.length||forbidden.length){console.error('PATCH INTEGRITY FAILED');if(missing.length)console.error('missing:',missing);if(dup.length)console.error('duplicates:',dup);if(stillPresent.length)console.error('undeleted:',stillPresent);if(forbidden.length)console.error('forbidden:',forbidden);process.exit(1);}
console.log(`PATCH INTEGRITY PASS [${manifestPath}] — ${files.length} apply files, ${deletes.length} delete entries, content fingerprint ${digest.digest('hex').slice(0,16)}`);
