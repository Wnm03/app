#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const MANIFEST=path.join(ROOT,'DELETE-FILES.txt');
function readManifest(){
  if(!fs.existsSync(MANIFEST)) return [];
  return fs.readFileSync(MANIFEST,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')&&!x.startsWith('//')).map(x=>x.replace(/^\.\//,''));
}
function validate(rel){
  if(!rel||path.isAbsolute(rel)||rel.includes('\\')||rel.split('/').includes('..')) throw new Error(`path manifest tidak aman: ${rel}`);
}
function apply(){
  const entries=readManifest(),seen=new Set(),removed=[],missing=[];
  for(const rel of entries){
    validate(rel);
    if(seen.has(rel)) throw new Error(`duplikat path dalam DELETE-FILES.txt: ${rel}`);
    seen.add(rel);
    const full=path.resolve(ROOT,rel);
    if(!full.startsWith(ROOT+path.sep)) throw new Error(`path keluar repository: ${rel}`);
    if(fs.existsSync(full)){
      const st=fs.lstatSync(full);
      if(st.isDirectory()) throw new Error(`manifest hanya boleh menghapus file: ${rel}`);
      fs.rmSync(full,{force:true}); removed.push(rel);
    }else missing.push(rel);
  }
  return {entries,removed,missing};
}
if(require.main===module){try{const r=apply();console.log(`✓ DELETE-MANIFEST APPLY PASS — removed=${r.removed.length}, already-missing=${r.missing.length}, entries=${r.entries.length}`);}catch(e){console.error(`❌ DELETE-MANIFEST APPLY GAGAL — ${e.message}`);process.exit(1);}}
module.exports={readManifest,apply};
