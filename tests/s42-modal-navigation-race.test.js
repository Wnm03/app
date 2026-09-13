const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const { createDocument, loadSource } = require('./helpers/loadSource');

function makeFakeOverlay(){
  const classes=new Set();
  return {classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},textContent:'',className:'',style:{},value:'',focus(){},select(){},offsetWidth:1,getClientRects(){return [1]}};
}
function setup(){
  const els={};
  const document={body:{classList:{add(){},remove(){},toggle(){}}},getElementById(id){return els[id]||(els[id]=makeFakeOverlay());},querySelectorAll(sel){
    if(!sel.includes('.open')) return [];
    return Object.values(els).filter(e=>e.classList.contains('open'));
  },querySelector(){return null},addEventListener(){},removeEventListener(){},contains(){return true}};
  for(const id of ['confirmModalOverlay','promptModalOverlay','choiceModalOverlay','infoModalOverlay','pinPromptModalOverlay','confirmModalIcon','confirmModalTitle','confirmModalMsg','confirmModalOk','confirmModalCancel','promptModalIcon','promptModalTitle','promptModalMsg','promptModalInput','promptModalError','promptModalOkBtn','promptModalCancelBtn','choiceModalTitle','choiceModalMsg','choiceModalList']) els[id]=makeFakeOverlay();
  const ctx=loadSource(['modules/shared/modal-navigasi.js'],{document,setTimeout,clearTimeout,escapeHtml:s=>String(s),renderPageContent:()=>{}},['_confirmStore','_promptStore','_choiceStore','_infoStore','_pinPromptStore','_focusTrapStack']);
  return {ctx,document,els};
}

test('S42: queued dialog render timer cannot resurrect a dialog after showPage cancellation', async()=>{
  const {ctx,document}=setup();
  let rendered=0;
  const p1=ctx._queueDialog(ctx._confirmStore,()=>{ rendered++; });
  const p2=ctx._queueDialog(ctx._confirmStore,()=>{ rendered++; });
  ctx._resolveDialog(ctx._confirmStore,'confirmModalOverlay',true);
  ctx._cancelAllCustomDialogQueues();
  await Promise.all([p1,p2]);
  await new Promise(r=>setTimeout(r,10));
  assert.equal(rendered,1);
  assert.equal(ctx._confirmStore.queue.length,0);
  assert.equal(document.getElementById('confirmModalOverlay').classList.contains('open'),false);
});

test('S42: forced showPage cleanup deactivates stale focus traps',()=>{
  const {ctx,document}=setup();
  const page=makeFakeOverlay(); page.id='page-home'; const origGet=document.getElementById; document.getElementById=(id)=>id==='page-home'?page:origGet(id);
  const overlay=document.getElementById('confirmModalOverlay');
  overlay.classList.add('open');
  ctx._focusTrapActivate(overlay);
  assert.equal(ctx._focusTrapStack.length,1);
  ctx.showPage('home');
  assert.equal(ctx._focusTrapStack.length,0);
  assert.equal(overlay.classList.contains('open'),false);
});
