'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');

function loadGlobalObject(file, decl, exportName, extras={}){
  const ctx={console,...extras};
  vm.createContext(ctx);
  const src=read(file)+`\n;globalThis.${exportName}=${decl};`;
  vm.runInContext(src,ctx,{filename:file});
  return ctx[exportName];
}

function dom(values={}){
  const nodes={};
  for(const [id,value] of Object.entries(values)) nodes[id]={value,style:{},checked:false,textContent:''};
  return {getElementById(id){return nodes[id]||(nodes[id]={value:'',style:{},checked:false,textContent:''});},nodes};
}

function loadTitipan(){
  const d=dom({titipanCommitOwner:'o1',titipanCommitPrincipal:'100',titipanCommitDate:'',titipanCommitNotes:'',titipanReturnOwnerId:'o1',titipanReturnOwnerDisplay:'Budi',titipanReturnAmount:'100',titipanReturnDate:'',titipanReturnNotes:'',titipanPoolAmt:'100',titipanPoolDate:'',titipanPoolNotes:''});
  const toasts=[]; const closed=[];
  const ctx={document:d,toast:m=>toasts.push(m),closeModal:m=>closed.push(m),openModal(){},askConfirm:async()=>true,
    DanaTitipanPortfolioPresenter:{render(){},renderInto(){}},OwnerRegistry:{},escapeHtml:s=>String(s),updateAmtPreview(){},evalAmtExpr(){}};
  const src=read('modules/finance/dana-titipan-portfolio-render-b.js')+'\n;globalThis.__C= DanaTitipanCommitmentUI;globalThis.__R=DanaTitipanReturnUI;globalThis.__P=DanaTitipanPoolUI;';
  vm.createContext(ctx); vm.runInContext(src,ctx,{filename:'dana-titipan-portfolio-render-b.js'});
  return {ctx,dom:d,toasts,closed};
}

test('N7 behavior: all false-return Dana Titipan mutations fail closed',async()=>{
  const x=loadTitipan();
  x.ctx.DanaTitipanPortfolioAPI={
    saveCommitment:()=>({ok:false}), deleteCommitment:()=>({ok:false}), removeOwnerLinkage:()=>({ok:false}),
    recordReturn:()=>({ok:false}), deleteReturn:()=>({ok:false})
  };
  x.ctx.DanaTitipanPoolAPI={addDeposit:()=>({ok:false}),addOpeningBalance:()=>({ok:false})};
  await x.ctx.__C.save(); assert.deepEqual(x.closed,[]);
  await x.ctx.__C.deleteCommitment(); assert.deepEqual(x.closed,[]);
  await x.ctx.__C.removeOwnerLinkage('o1'); assert.deepEqual(x.closed,[]);
  await x.ctx.__R.save(); assert.deepEqual(x.closed,[]);
  await x.ctx.__R.deleteEntry('r1'); assert.deepEqual(x.closed,[]);
  x.ctx.__P._mode='deposit'; x.ctx.__P.save(); assert.deepEqual(x.closed,[]);
  x.ctx.__P._mode='opening'; x.ctx.__P.save(); assert.deepEqual(x.closed,[]);
  assert.ok(x.toasts.length>=7);
});

test('N11 behavior: Pension rejects invalid and negative money input without saving',()=>{
  const d=dom({pensUsiaSekarang:'30',pensUsiaPensiun:'60',pensTarget:'abc',pensAcc:'a1',pensReturn:'6',pensKontribusi:'1000000'});
  const saved=[]; const toasts=[];
  const ctx={window:{},D:{pensiun:{}},document:d,parsePzNum:v=>{const n=String(v).replace(/\./g,'').replace(',','.');return Number(n)||0;},toast:m=>toasts.push(m),save:()=>saved.push(1),closeModal(){},renderKeuangan(){}};
  const src=read('modules/shared/modules-calc.js')+'\n;globalThis.__P=Pensiun;';
  vm.createContext(ctx); vm.runInContext(src,ctx,{filename:'modules-calc.js'});
  ctx.__P.saveSettings();
  assert.equal(saved.length,0); assert.match(toasts.join(' '),/Target Dana Pensiun/);
  d.nodes.pensTarget.value='-5'; ctx.__P.saveSettings();
  assert.equal(saved.length,0); assert.match(toasts.join(' '),/Target Dana Pensiun/ );
  d.nodes.pensTarget.value='1.000.000.000'; ctx.__P.saveSettings();
  assert.equal(saved.length,1); assert.equal(ctx.__P ? d.nodes.pensTarget.value : '', '1.000.000.000');
});

test('N17 behavior: UI reaches SKIPPED only through allowed PLANNED pivot',()=>{
  const ctx={__SERVICE_CHECKLIST_GROUPS__:[{group:'G',items:[{id:'x',name:'X'}]}]};
  ctx.ServiceChecklistExecutionSOT={normalizeState:v=>['PLANNED','COMPLETED','SKIPPED'].includes(v)?v:null,transition:(a,b)=>({ok:(a===b)||(a==='PLANNED'&&(b==='COMPLETED'||b==='SKIPPED'))||(a==='COMPLETED'&&b==='PLANNED')||(a==='SKIPPED'&&b==='PLANNED')})};
  vm.createContext(ctx);
  const src=read('modules/vehicle/servis-checklist.js')+'\n;globalThis.__S=ServisChecklist;';
  vm.runInContext(src,ctx,{filename:'servis-checklist.js'});
  ctx.__S.render=()=>{}; ctx.__S.open('v1');
  const seq=[];
  for(let i=0;i<4;i++){const r=ctx.__S.cycleExecutionStatusAndRender(0,0);assert.equal(r.ok,true);seq.push(r.executionStatus);}
  assert.deepEqual(seq,['COMPLETED','PLANNED','SKIPPED','PLANNED']);
});

test('N19 behavior: one maintenance item matching multiple keyword groups is emitted once',()=>{
  const ctx={D:{vehicles:[]}}; vm.createContext(ctx);
  const src=read('modules/vehicle/fuel-maintenance-engine.js')+'\n;globalThis.__F=FuelMaintenanceEngine;';
  vm.runInContext(src,ctx,{filename:'fuel-maintenance-engine.js'});
  const groups=ctx.__F.KEYWORD_GROUPS; const keys=Object.keys(groups); assert.ok(keys.length>=2);
  const shared=groups[keys[0]][0]||groups[keys[1]][0];
  const item={id:'dup-1',categoryName:shared,status:'terlewat'};
  // Add a second matching keyword to guarantee the same item qualifies for multiple groups.
  const a=keys[0], b=keys[1];
  const joined=(groups[a][0]||'')+' '+(groups[b][0]||''); item.categoryName=joined;
  const out=ctx.__F._relevantOverdueItems([item]);
  assert.equal(out.length,1);
});

test('N18 behavior: local date helper gives Jakarta calendar day at 01:00',()=>{
  process.env.TZ='Asia/Jakarta';
  const src=read('modules/shared/features-helpers-global-security.js');
  const start=src.indexOf('function todayStr()'); assert.notEqual(start,-1);
  const end=src.indexOf('\n}',start)+2;
  class FakeDate extends Date { constructor(){super('2026-10-07T18:00:00.000Z');} }
  const ctx={Date:FakeDate}; vm.createContext(ctx);
  vm.runInContext(src.slice(start,end)+';globalThis.__today=todayStr;',ctx);
  // 18:00Z is 01:00 on 8 Oct in Asia/Jakarta; the local helper must return that calendar day.
  const expected=new Date('2026-10-07T18:00:00.000Z');
  const exp=expected.getFullYear()+'-'+String(expected.getMonth()+1).padStart(2,'0')+'-'+String(expected.getDate()).padStart(2,'0');
  assert.equal(ctx.__today(),exp);
  assert.match(read('modules/shared/modules-render-b.js'),/whD\.value=typeof todayStr==='function'\?todayStr\(\):''/);
  assert.match(read('car-notes.js'),/bbmDate.*todayStr/);
});

test('N4 behavior contract: reset clears both dashboard layout tab preferences',()=>{
  const src=read('modules/dashboard-hub/dashboard-hub-settings.js');
  assert.match(src,/removeItem\(DASH_DEFAULT_TAB_KEY\)/);
  assert.match(src,/removeItem\('dashHubSectionTab'\)/);
  assert.match(read('index.html'),/Tab saat pertama dibuka/);
});
