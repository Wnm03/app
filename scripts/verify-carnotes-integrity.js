#!/usr/bin/env node
'use strict';
/**
 * Car Notes permanent integrity gate.
 * Read-only. Protects the rolled-back UI boundary from reintroducing the
 * retired Theme Pro presentation/routing layer and from structural drift.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FORBIDDEN = [
  'proMockup','proMockScreen','proMockBottomNav','pro-ui-layer','renderProHome',
  'proOpenHistoryTab','proReturnToMainNav','pro-vehicle','pro-primary-tabs',
  'pro-servis-screen','pro-mock','proCnBottomNav','data-theme="pro"',
  "data-theme='pro'"
];
const SOURCE_DIRS = ['modules','scripts'];
const SELF_FILE = path.resolve(__filename);
const SOURCE_FILES = ['index.html','app_production.html','sw.js','self-test.js'];
const EXCLUDE_DIRS = new Set(['node_modules','tests','docs','audit-sesi7','regression-evidence','backups']);

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) walk(path.join(dir,e.name),out); continue; }
    if (/\.(js|html|css)$/.test(e.name)) out.push(path.join(dir,e.name));
  }
  return out;
}
function scanForbidden(files) {
  const hits=[];
  for (const f of files) {
    const s=fs.readFileSync(f,'utf8');
    for (const token of FORBIDDEN) if (s.includes(token)) hits.push({file:path.relative(ROOT,f),token});
  }
  return hits;
}
function duplicateIds(file) {
  const s=fs.readFileSync(file,'utf8');
  const ids=[...s.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
  const c=new Map(); for(const id of ids)c.set(id,(c.get(id)||0)+1);
  return [...c].filter(([,n])=>n>1).map(([id,n])=>({id,count:n}));
}
function servisDeclarations() {
  const files=walk(path.join(ROOT,'modules')).filter(f=>f.endsWith('.js'));
  const hits=[];
  const re=/\b(?:const|let|var)\s+Servis\s*=/g;
  for(const f of files){const s=fs.readFileSync(f,'utf8'); for(const m of s.matchAll(re)) hits.push(path.relative(ROOT,f)+':'+(s.slice(0,m.index).match(/\n/g)||[]).length+1);}
  return hits;
}
function audit(){
  const files=[...SOURCE_FILES.map(f=>path.join(ROOT,f)),...SOURCE_DIRS.flatMap(d=>walk(path.join(ROOT,d)))];
  const uniq=[...new Set(files.filter(fs.existsSync).filter(f=>path.resolve(f)!==SELF_FILE))];
  const forbidden=scanForbidden(uniq);
  const dup=duplicateIds(path.join(ROOT,'index.html'));
  const prodDup=duplicateIds(path.join(ROOT,'app_production.html'));
  const servis=servisDeclarations();
  const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const required=['page-carnotes','cnTab-bbm','cnTab-servis','cnTab-insight','cnTab-pajak','cnTab-jalan','carNotesFab'];
  const missing=required.filter(x=>!idx.includes(`id="${x}"`));
  const bad = forbidden.length || dup.length || prodDup.length || servis.length!==1 || missing.length;
  return {ok:!bad,forbidden,dup,prodDup,servis,missing,scanned:uniq.length};
}
function main(){
  const result=audit();
  const {forbidden,dup,prodDup,servis,missing}=result;
  const bad=!result.ok;
  console.log(`Car Notes integrity: ${bad?'FAIL':'PASS'}`);
  console.log(`  scanned=${result.scanned} forbidden=${forbidden.length} duplicateIds=${dup.length}/${prodDup.length} ServisDeclarations=${servis.length}`);
  if(missing.length) console.log('  missing:',missing.join(', '));
  for(const x of forbidden) console.log(`  forbidden: ${x.file} -> ${x.token}`);
  for(const x of dup) console.log(`  duplicate index id: ${x.id} x${x.count}`);
  for(const x of prodDup) console.log(`  duplicate production id: ${x.id} x${x.count}`);
  if(servis.length!==1) console.log('  Servis declarations:',servis.join(', ')||'(none)');
  if(bad) process.exit(1);
}
if(require.main===module) main();
module.exports={main,audit};
