'use strict';
// S1731: Car Notes Pro action contract.
// Every data-action rendered inside #page-carnotes must resolve to a real
// global function or an exposed Owner.method. This catches the exact class
// of regression seen in the Pro bottom nav: HTML used `proOpenHistory` while
// the implementation was renamed to `proOpenHistoryTab`.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const core=fs.readFileSync(path.join(ROOT,'modules/vehicle/vehicle-core.js'),'utf8');
const shared=fs.readFileSync(path.join(ROOT,'modules/shared/features-helpers-global-security.js'),'utf8');
const wrappers=fs.readFileSync(path.join(ROOT,'modules/shared/action-wrappers.js'),'utf8');
const carNotes=fs.readFileSync(path.join(ROOT,'car-notes.js'),'utf8');
const moduleSources=fs.readdirSync(path.join(ROOT,'modules'),{recursive:true})
  .filter(f=>String(f).endsWith('.js'))
  .map(f=>fs.readFileSync(path.join(ROOT,'modules',f),'utf8'));
const rootSources=fs.readdirSync(ROOT)
  .filter(f=>String(f).endsWith('.js'))
  .map(f=>fs.readFileSync(path.join(ROOT,f),'utf8'));
const source=moduleSources.concat(rootSources).join('\n')+'\n'+carNotes+'\n'+core+'\n'+shared+'\n'+wrappers;

function carNotesPage(h){
  const start=h.indexOf('<div class="page pro-vehicle-page" id="page-carnotes">');
  const end=h.indexOf('<div class="page" id="page-pajak">',start);
  assert.ok(start>=0 && end>start,'Car Notes page boundaries must exist');
  return h.slice(start,end);
}
function actionsInPage(){
  return [...new Set((carNotesPage(html).match(/data-action="[^"]+"/g)||[])
    .map(x=>x.slice(13,-1))
    .filter(x=>x!=='RideUI.*'))];
}
function reEscape(value){return String(value).replace(/[.*+?^${}()|[\\]\\]/g,'\\$&');}
function hasGlobalFunction(name){
  return new RegExp('(?:^|\\n)\\s*(?:async\\s+)?function\\s+'+reEscape(name)+'\\s*\\(').test(source);
}
function hasOwnerMethod(owner,method){
  const ownerDecl=new RegExp('(?:const|let|var)\\s+'+reEscape(owner)+'\\s*=\\s*\\{').test(source);
  if(!ownerDecl)return false;
  const m=reEscape(method);
  return new RegExp('\\b'+m+'\\s*(?::|\\()').test(source);
}

test('S1731: every Car Notes Pro data-action resolves to an implementation',()=>{
  const missing=[];
  for(const action of actionsInPage()){
    if(action.includes('.')){
      const [owner,method]=action.split('.');
      if(!hasOwnerMethod(owner,method))missing.push(action);
    }else if(!hasGlobalFunction(action))missing.push(action);
  }
  assert.deepEqual(missing,[],`Unresolved Car Notes data-action: ${missing.join(', ')}`);
});

test('S1731: Pro bottom-nav History action has matching global alias',()=>{
  assert.match(carNotesPage(html),/data-action="proOpenHistory"/);
  assert.match(core,/function proOpenHistory\(\)/);
  assert.match(core,/function proOpenHistoryTab\(\)/);
});
