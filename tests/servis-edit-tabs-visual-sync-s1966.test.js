'use strict';
// S1966: Edit Catatan Servis tab visual/geometry hardening.
// The presenter must not leave Detail highlighted while Pengingat/Riwayat is visible,
// and switching tabs must clear any stale sheet geometry from a previous gesture.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');

function makeClassList(){return{active:false,toggle(c,on){if(c==='active')this.active=!!on;}};}
function makeDoc(els){return{getElementById:id=>els[id]||null};}
function makeCtx(els){
  const D={servisLogs:[{id:'s1',vehicleId:'v1',item:'Oli Mesin',checklist:[]}],vehicles:[],sparepartCats:[],partsStock:[]};
  const ctx=loadSource(['car-notes.js'],{
    document:makeDoc(els),D,curVehicleId:'v1',escapeHtml:s=>String(s),
    renderCnTab:()=>{},
    PWAUX:{resetOverlayGeometry(overlay){
      const sheet=overlay&&overlay.querySelector?overlay.querySelector('.modal'):null;
      if(sheet&&sheet.style){sheet.style.transform='';sheet.style.transition='';}
    }},
  },['Servis']);
  ctx.Servis.editId='s1';
  ctx.Servis.renderEditReminderTab=()=>{};
  ctx.Servis.renderEditHistoryTab=()=>{};
  return ctx;
}
function baseEls(){
  const modal={style:{transform:'translateY(18px)',transition:'transform 0.2s'},scrollTop:37};
  const overlay={style:{width:'240px',maxWidth:'240px',left:'12px',right:'auto'},querySelector:s=>s==='.modal'?modal:null};
  const els={
    servisModal:overlay,
    servisDetailPanel:{style:{}},servisReminderPanel:{style:{},innerHTML:''},servisHistoryPanel:{style:{},innerHTML:''},
    servisEditTabDetail:{classList:makeClassList(),style:{}},servisEditTabReminder:{classList:makeClassList(),style:{}},servisEditTabHistory:{classList:makeClassList(),style:{}},
  };
  return {els,modal};
}

test('Pengingat/Riwayat yang aktif selalu sinkron secara visual dengan panel yang ditampilkan',()=>{
  const {els}=baseEls(); const ctx=makeCtx(els);
  ctx.Servis.setEditTab('reminder');
  assert.equal(els.servisDetailPanel.style.display,'none');
  assert.equal(els.servisReminderPanel.style.display,'');
  assert.equal(els.servisEditTabDetail.classList.active,false);
  assert.equal(els.servisEditTabReminder.classList.active,true);
  assert.equal(els.servisEditTabDetail.style.background,'transparent');
  assert.equal(els.servisEditTabReminder.style.background,'var(--accent)');
  ctx.Servis.setEditTab('history');
  assert.equal(els.servisReminderPanel.style.display,'none');
  assert.equal(els.servisHistoryPanel.style.display,'');
  assert.equal(els.servisEditTabReminder.classList.active,false);
  assert.equal(els.servisEditTabHistory.classList.active,true);
  assert.equal(els.servisEditTabHistory.style.color,'#fff');
});

test('pindah tab membersihkan geometry sheet/overlay yang stale',()=>{
  const {els,modal}=baseEls(); const ctx=makeCtx(els);
  ctx.Servis.setEditTab('reminder');
  assert.equal(modal.style.transform,'');
  assert.equal(modal.style.transition,'');
  assert.equal(els.servisModal.style.width,'100vw');
  assert.equal(els.servisModal.style.maxWidth,'100vw');
  assert.equal(els.servisModal.style.left,'0');
  assert.equal(els.servisModal.style.right,'0');
  assert.equal(modal.style.width,'100%');
  assert.equal(modal.style.maxWidth,'100vw');
  assert.equal(modal.scrollTop,0);
});

test('kontrak implementasi menghapus ketergantungan class-only untuk tombol edit tab',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/servis.js'),'utf8');
  assert.match(src,/_syncEditTabButtonState\(next\)/);
  assert.match(src,/btn\.style\.background=active\?'var\(--accent\)'/);
  assert.match(src,/btn\.style\.color=active\?'#fff'/);
  assert.match(src,/_normalizeEditModalGeometry\(\)/);
});
