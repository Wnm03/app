'use strict';
// S1986: reusable servisModal must not leak Edit full-height geometry into Create.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

function makeDoc(els){return{getElementById:id=>els[id]||null};}
function makeEls(){
  const modal={style:{width:'100%',maxWidth:'100vw',minWidth:'0',height:'100dvh',maxHeight:'100dvh',margin:'0',boxSizing:'border-box',overflowX:'hidden',overflowY:'hidden',display:'flex',flexDirection:'column',transform:'translateY(18px)',transition:'transform .2s'}};
  const overlay={style:{position:'fixed',inset:'0',width:'100vw',maxWidth:'100vw',height:'100dvh',left:'0',right:'0',bottom:'0',top:'0',padding:'0',boxSizing:'border-box'},querySelector:s=>s==='.modal'?modal:null};
  const panel=()=>({style:{flex:'1 1 auto',minHeight:'0',overflowY:'auto',overflowX:'hidden'}});
  return {modal,overlay,els:{servisModal:overlay,servisDetailPanel:panel(),servisReminderPanel:panel(),servisHistoryPanel:panel(),servisAuditPanel:panel()}};
}

function loadServis(els){
  return loadSource(['modules/vehicle/servis.js'],{
    document:makeDoc(els),
    PWAUX:{resetOverlayGeometry(overlay){const sheet=overlay&&overlay.querySelector?overlay.querySelector('.modal'):null;if(sheet&&sheet.style){sheet.style.transform='';sheet.style.transition='';}}},
  },['Servis']);
}

test('S1986 restoreCreateModalGeometry clears every Edit-only sheet override',()=>{
  const {modal,overlay,els}=makeEls();
  const ctx=loadServis(els);
  ctx.Servis._restoreCreateModalGeometry();
  assert.equal(modal.style.height,'');
  assert.equal(modal.style.maxHeight,'');
  assert.equal(modal.style.overflowY,'');
  assert.equal(modal.style.display,'');
  assert.equal(overlay.style.height,'');
  assert.equal(overlay.style.position,'');
  assert.equal(els.servisDetailPanel.style.overflowY,'');
  assert.equal(els.servisReminderPanel.style.flex,'');
});

test('S1986 openModal branches geometry by mode: Edit normalize, Create restore',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
  assert.match(src,/if\(Servis\.editId!==null\)\{\s*Servis\._normalizeEditModalGeometry\(\)/);
});

test('S1986 contract: Create path cannot unconditionally normalize Edit geometry',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../modules/vehicle/servis.js'),'utf8');
  assert.match(src,/else\{\s*Servis\._restoreCreateModalGeometry\(\);\s*\}/);
  assert.doesNotMatch(src,/openModal\('servisModal'\);\s*Servis\._normalizeEditModalGeometry\(\);/);
  assert.match(src,/_restoreCreateModalGeometry\(\)/);
});
