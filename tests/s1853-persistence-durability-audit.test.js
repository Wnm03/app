'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

const files=[
 'modules/shared/features-helpers-global-security.js',
 'modules/asset/features-helpers-global-security.js',
 'modules/finance/features-helpers-global-security.js',
 'modules/shop/features-helpers-global-security.js'
];

function body(src,sig){
 const start=src.indexOf(sig); assert.notEqual(start,-1,`missing ${sig}`);
 const open=src.indexOf('{',start); let d=0,quote=null,esc=false;
 for(let i=open;i<src.length;i++){
  const c=src[i];
  if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote=null;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='{')d++; else if(c==='}'&&--d===0)return src.slice(start,i+1);
 }
 throw new Error(`unterminated ${sig}`);
}

test('S1853 persistence failure does not broadcast a false cross-tab write',()=>{
 for(const f of files){
  const s=fs.readFileSync(f,'utf8');
  const im=body(s,'function _saveImmediate(snapshotJson){');
  assert.match(im,/const fallbackOk=_writeLocalSnapshot\(json\)/,`${f}: fallback result must be observed`);
  assert.match(im,/if\(fallbackOk\)\{_markSavePersistMeta\('local',stamp\);_announcePersistenceWrite\(\);\}/,`${f}: failed fallback must not announce persistence`);
  assert.match(im,/else\{_saveQueuedVersion=-1;_saveQueuedStamp=0;\}/,`${f}: failed durable fallback must allow retry`);
 }
});

test('S1853 hard-flush has a durable timestamp so LS can beat an older IDB snapshot after suspend',()=>{
 for(const f of files){
  const s=fs.readFileSync(f,'utf8');
  const flush=body(s,'function saveFlush(){');
  assert.match(s,/const _savePersistMetaKey='kw_v4_persist_meta';/);
  assert.match(s,/function _nextSavePersistStamp\(\)/);
  assert.match(s,/function _markSavePersistMeta\(kind,stamp\)/);
  assert.match(flush,/const persistStamp=_saveImmediate\(json\)/);
  assert.match(flush,/const localOk=_writeLocalSnapshot\(json\)/);
  assert.match(flush,/if\(localOk\)_markSavePersistMeta\('local',persistStamp\)/);
 }
});

test('S1853 recovery prefers the newer synchronous local snapshot when IDB is stale',()=>{
 const s=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
 assert.match(s,/if\(idbRaw&&lsRaw\)/);
 assert.match(s,/_pm\.localTs>_pm\.idbTs/);
 assert.match(s,/localStorage-newer/);
});

test('S1853 UI hard-flush self-test isolates cross-tab stale state and restores it',()=>{
 const s=fs.readFileSync('modules/shared/self-test-cases-b.js','utf8');
 assert.match(s,/const staleBefore=typeof _crossTabStateStale/);
 assert.match(s,/const warnBefore=typeof _crossTabWarnShown/);
 assert.match(s,/if\(typeof _crossTabStateStale!=='undefined'\)_crossTabStateStale=false/);
 assert.match(s,/if\(typeof _crossTabStateStale!=='undefined'\)_crossTabStateStale=staleBefore/);
 assert.match(s,/if\(typeof _crossTabWarnShown!=='undefined'\)_crossTabWarnShown=warnBefore/);
});

console.log('S1853 persistence durability audit: PASS');
