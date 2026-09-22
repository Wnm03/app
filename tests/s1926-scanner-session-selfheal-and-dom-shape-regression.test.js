'use strict';
// S1926 regression: S1923 stale-render recovery cleanup assumed pageEl was a
// full DOM Element and also moved ScannerSession self-heal after the
// page-not-found guard. Existing modal/showPage harnesses intentionally use
// lightweight page shapes, and S1907-era behavior requires self-heal before
// an invalid-target early return.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

function makePage(classes=new Set(['active'])){
  return {
    classList:{
      add:c=>classes.add(c), remove:c=>classes.delete(c), contains:c=>classes.has(c),
    },
    setAttribute(){},
    dataset:{},
    // Intentionally omit querySelector/insertBefore: this is the lightweight
    // page shape used by pre-existing modal/showPage harnesses.
  };
}
function makeDoc(page){
  return {
    body:{classList:{add(){},remove(){},contains(){return false;}}},
    getElementById(id){
      if(id==='page-test') return page;
      if(id==='scrollRoot') return {scrollTop:0};
      return null;
    },
    querySelectorAll(){return [];},
    querySelector(){return null;},
    createElement(){return {className:'',setAttribute(){},innerHTML:'',};},
    addEventListener(){}, removeEventListener(){},
  };
}

test('S1926: showPage is safe when pageEl has no querySelector/insertBefore',()=>{
  const page=makePage();
  const fakeDoc=makeDoc(page);
  const ctx=loadSource(['modules/shared/modal-navigasi.js'],{
    document:fakeDoc,
    ScannerSession:{isActive(){}},
    renderPageContent(){throw new Error('intentional render failure');},
  });
  assert.doesNotThrow(()=>ctx.showPage('test'));
  assert.equal(page.classList.contains('active'),true);
});

test('S1926: ScannerSession self-heal runs before page-not-found guard',()=>{
  let calls=0;
  const fakeDoc={
    body:{classList:{add(){},remove(){},contains(){return false;}}},
    getElementById(){return null;},
    querySelectorAll(){return [];}, querySelector(){return null;},
    addEventListener(){}, removeEventListener(){},
  };
  const ctx=loadSource(['modules/shared/modal-navigasi.js'],{
    document:fakeDoc,
    ScannerSession:{isActive(){calls++;return false;}},
  });
  assert.equal(ctx.showPage('missing'),false);
  assert.equal(calls,1);
});

test('S1926: stale-render cleanup is defensively guarded',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  assert.match(src,/typeof pageEl\.querySelector==='function'\?pageEl\.querySelector\('\.page-render-error'\):null/);
  assert.match(src,/typeof _staleRenderError\.remove==='function'/);
  assert.match(src,/typeof pageEl\.insertBefore==='function'/);
});

test('S1926: self-heal appears before destination lookup in showPage source',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  const start=src.indexOf('function showPage(name,el,opts){');
  const heal=src.indexOf('ScannerSession.isActive();',start);
  const lookup=src.indexOf("const pageEl=document.getElementById('page-'+name);",start);
  const guard=src.indexOf('if(!pageEl){',start);
  assert.ok(start>=0&&heal>start&&lookup>heal&&guard>lookup);
});
