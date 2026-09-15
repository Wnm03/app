const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function overlay(){
  const set=new Set();
  return {id:'',classList:{add:c=>set.add(c),remove:c=>set.delete(c),contains:c=>set.has(c),toggle:(c,v)=>v==null?set.has(c)?set.delete(c):set.add(c):v?set.add(c):set.delete(c)},offsetWidth:1,getClientRects(){return[1]},querySelectorAll(){return[]},querySelector(){return null},focus(){}};
}

function setup(){
  const els={};
  const listeners={};
  const document={
    body:{classList:{add(){},remove(){},toggle(){}}},
    getElementById(id){if(!els[id]){els[id]=overlay();els[id].id=id;}return els[id]},
    querySelectorAll(sel){
      if(sel.includes('.overlay.open')) return Object.values(els).filter(e=>e.classList.contains('open'));
      return [];
    },
    querySelector(){return null},
    addEventListener(type,fn){listeners[type]=fn},
    removeEventListener(){}
  };
  const history={state:null,pushes:0,backs:0,replaces:0,pushState(st){this.state=st;this.pushes++},back(){this.backs++;this.state={};setTimeout(()=>listeners.popstate&&listeners.popstate(),0)},replaceState(st){this.state=st;this.replaces++}};
  const window={addEventListener(type,fn){listeners[type]=fn},removeEventListener(){}};
  const location={href:'https://example.test/app/'};
  const ctx=loadSource(['modules/shared/modal-navigasi.js'],{document,window,history,location,getComputedStyle:()=>({zIndex:'0'}),setTimeout,clearTimeout,renderPageContent:()=>{}},['_focusTrapStack']);
  return {ctx,document,history};
}

test('S1735: opening standard modal creates history marker and Android Back closes it',async()=>{
  const {ctx,document,history}=setup();
  const modal=document.getElementById('sparepartModal');
  ctx.openModal('sparepartModal');
  assert.equal(modal.classList.contains('open'),true);
  assert.deepEqual(Array.from(history.state.__kwModalStack),['sparepartModal']);
  assert.equal(history.pushes,1);
  ctx.closeModal('sparepartModal');
  assert.equal(history.backs,1);
  await new Promise(r=>setTimeout(r,320));
  assert.equal(modal.classList.contains('open'),false);
});

test('S1735: nested modals unwind one level at a time',async()=>{
  const {ctx,document,history}=setup();
  ctx.openModal('torsiModal');
  ctx.openModal('servisModal');
  assert.deepEqual(Array.from(history.state.__kwModalStack),['torsiModal','servisModal']);
  ctx.closeModal('servisModal');
  await new Promise(r=>setTimeout(r,320));
  assert.equal(document.getElementById('servisModal').classList.contains('open'),false);
  assert.equal(document.getElementById('torsiModal').classList.contains('open'),true);
});

test('S1735: direct browser/Android Back closes the visible modal without a second history.back()',async()=>{
  const {ctx,document,history}=setup();
  const modal=document.getElementById('servisModal');
  ctx.openModal('servisModal');
  history.back();
  await new Promise(r=>setTimeout(r,320));
  assert.equal(modal.classList.contains('open'),false);
  assert.equal(history.backs,1);
});
