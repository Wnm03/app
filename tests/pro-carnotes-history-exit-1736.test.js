'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'modules/vehicle/vehicle-core.js'),'utf8');
function extract(name){const start=src.indexOf(`function ${name}(`);assert.ok(start>=0,name);const open=src.indexOf('{',start);let d=1,i=open+1;while(i<src.length&&d){if(src[i]==='{')d++;else if(src[i]==='}')d--;i++;}return src.slice(start,i);}
function setup(){
  const listeners={};
  const classes=new Set(['active']);
  const page={id:'page-carnotes',classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)}};
  const nav={classList:{remove(){},add(){}},style:{}};
  const root={scrollTop:99};
  const document={body:{dataset:{theme:'pro'}},getElementById(id){return id==='page-carnotes'?page:id==='mainNav'?nav:id==='scrollRoot'?root:null}};
  const history={state:{__carnotesPro:true,screen:5,appMarker:'keep'},replaced:0,replaceState(st){this.state=st;this.replaced++;}};
  const location={href:'https://example.test/app'};
  let shown=null;
  const ctx={document,history,location,window:{addEventListener(t,f){listeners[t]=f}},showPage(name){shown=name;classes.delete('active')},console};
  const sandbox={...ctx}; vm.createContext(sandbox); new vm.Script(`${extract('proReturnToMainNav')}\nthis.proReturnToMainNav=proReturnToMainNav;`).runInContext(sandbox);
  return {sandbox,history,page,root,get shown(){return shown},listeners};
}
test('S1736: leaving Car Notes strips only synthetic Pro/modal history markers',()=>{
  const x=setup(); x.sandbox.proReturnToMainNav();
  assert.equal(x.shown,'dashboard-hub');
  assert.equal(x.history.replaced,1);
  assert.equal(x.history.state.appMarker,'keep');
  assert.equal(Object.prototype.hasOwnProperty.call(x.history.state,'__carnotesPro'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(x.history.state,'__kwModalStack'),false);
});
test('S1736: stale Pro popstate cannot hijack an inactive page',()=>{
  const x=setup();
  x.page.classList.remove('active');
  // Recreate the handler exactly from source around the installed listener.
  const start=src.indexOf("if(typeof window!=='undefined'&&typeof window.addEventListener==='function'&&!window.__proMockupBackBound)");
  const end=src.indexOf('\n\nfunction proMockupInit()',start);
  assert.ok(start>=0&&end>start);
  const block=src.slice(start,end);
  x.sandbox.proMockupSetScreen=()=>{throw new Error('stale Pro state was replayed')};
  x.sandbox.proReturnToMainNav=()=>{throw new Error('inactive page was hijacked')};
  vm.runInContext(block,x.sandbox);
  assert.doesNotThrow(()=>x.listeners.popstate({state:{__carnotesPro:true,screen:4}}));
});
