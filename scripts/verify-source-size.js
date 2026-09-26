#!/usr/bin/env node
'use strict';
const fs=require('fs'); const path=require('path');
const ROOT=path.join(__dirname,'..');
const THRESHOLD=1600;
const ALLOWLIST_MAX={'build.js':1700,'scripts/build.js':2550,'self-test.js':2750,'modules/vehicle/servis.js':2000};
const EXCLUDE=new Set(['node_modules','tests','backups']);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isDirectory()){if(!EXCLUDE.has(e.name))walk(path.join(dir,e.name),out);continue;}if(e.name.endsWith('.js')&&!e.name.includes('.min.'))out.push(path.join(dir,e.name));}return out;}
function check(strict=false){const hits=walk(ROOT).map(f=>({file:path.relative(ROOT,f),lines:fs.readFileSync(f,'utf8').split(/\r?\n/).length})).filter(x=>x.lines>THRESHOLD).sort((a,b)=>b.lines-a.lines);const blocking=hits.filter(h=>h.lines>(ALLOWLIST_MAX[h.file] ?? THRESHOLD));
for(const h of hits){const cap=ALLOWLIST_MAX[h.file] ?? THRESHOLD; const status=h.lines>cap?'✗':'⚠'; console.log(`${status} oversized source: ${h.file} (${h.lines} lines > ${THRESHOLD}; guard cap ${cap})`);}
if(strict&&blocking.length){console.error(`source-size guard failed: ${blocking.map(x=>x.file).join(', ')}`);process.exitCode=1;}return hits;
}
if(require.main===module)check(process.argv.includes('--strict'));
module.exports={check,THRESHOLD,ALLOWLIST_MAX};
