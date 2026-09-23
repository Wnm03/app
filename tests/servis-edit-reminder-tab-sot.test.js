'use strict';
// CATEGORY-SOT follow-up: Edit Riwayat Servis -> tab Pengingat.
// Tab ini adalah presenter/action surface saja: TIDAK membuat interval/reminder
// kedua. Semua nilai dibaca dari kategori/override kendaraan + checklist/stock
// yang sudah ada.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

function makeClassList(){
  return { active:false, toggle(c,on){ if(c==='active') this.active=!!on; } };
}
function makeDoc(els){ return { getElementById:id=>els[id]||null }; }
function makeCtx({D,els}){
  return loadSource(['car-notes.js'], {
    document:makeDoc(els),
    D,
    curVehicleId:'v1',
    escapeHtml:s=>String(s),
    resolveServisCatForVehicle:(name,vid)=>{
      const n=String(name||'').toLowerCase();
      return (D.sparepartCats||[]).find(c=>c.name.toLowerCase()===n&&(!c.vehicleId||c.vehicleId===vid))||null;
    },
    getCanonicalServiceInterval:(cat,ov)=>({
      intervalKm:Number.isFinite(ov.intervalKm)&&ov.intervalKm>0?ov.intervalKm:(cat.intervalKm>0?cat.intervalKm:null),
      intervalBulan:cat.intervalBulan>0?cat.intervalBulan:null,
    }),
    getEffectiveIntervalKm:(vid,cat)=>cat.intervalKm,
    getEffectiveIntervalBulan:cat=>cat.intervalBulan||null,
    computeServiceUrgency:()=>({status:'segera',sisaKm:500,sisaBulan:null}),
    getVehicleKm:()=>9500,
    getLastServiceKmForCat:()=>9000,
    estimateKmPerDay:()=>20,
    ServisChecklist:{findItemById:id=>id==='oil-check'?{item:{name:'Oli Mesin'}}:null},
    Sparepart:{renderStockList:()=>{},renderCatList:()=>{}},
  }, ['Servis']);
}

function baseEls(){
  return {
    servisEditTabs:{style:{},classList:makeClassList()},
    servisDetailPanel:{style:{}},
    servisReminderPanel:{style:{},innerHTML:''},
    servisEditTabDetail:{classList:makeClassList()},
    servisEditTabReminder:{classList:makeClassList()},
  };
}

test('modal source memiliki tab Pengingat + panel terpisah tanpa mengubah SoT data',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','modules/shared/modals.js'),'utf8');
  assert.match(src,/id=\\"servisEditTabs\\"/);
  assert.match(src,/data-action=\\"Servis\.setEditTab\\"/);
  assert.match(src,/id=\\"servisDetailPanel\\"/);
  assert.match(src,/id=\\"servisReminderPanel\\"/);
});

test('render tab membaca interval kategori + override kendaraan, bukan field reminder baru',()=>{
  const D={
    vehicles:[{id:'v1',name:'Vario',intervalOverrides:{catOil:10000}}],
    sparepartCats:[{id:'catOil',name:'Oli Mesin',intervalKm:8000,intervalBulan:6}],
    partsStock:[],servisLogs:[{id:'s1',vehicleId:'v1',item:'Oli Mesin',categoryId:'catOil',date:'2026-08-01',km:9000,cost:50000,checklist:[]}],
  };
  const els=baseEls();
  const ctx=makeCtx({D,els});
  ctx.Servis.editId='s1';
  ctx.Servis.renderEditReminderTab();
  assert.match(els.servisReminderPanel.innerHTML,/Oli Mesin/);
  assert.match(els.servisReminderPanel.innerHTML,/10\.000 km/);
  assert.match(els.servisReminderPanel.innerHTML,/Tidak menyimpan interval atau reminder kedua/);
  assert.doesNotMatch(els.servisReminderPanel.innerHTML,/id="servisInterval"/);
});

test('komponen stok ditampilkan dan ditautkan kembali ke kategori SoT yang sama',()=>{
  const D={
    vehicles:[{id:'v1',name:'Vario'}],
    sparepartCats:[{id:'catOil',name:'Oli Mesin',intervalKm:8000}],
    partsStock:[{id:'p1',name:'Oli Mesin',catId:'catOil',qty:1}],
    servisLogs:[{id:'s1',vehicleId:'v1',item:'Ganti Oli',categoryId:'catOil',date:'2026-08-01',km:9000,cost:50000,usedPartId:'p1',usedPartQty:1,checklist:[]}],
  };
  const els=baseEls();
  const ctx=makeCtx({D,els});
  ctx.Servis.editId='s1';
  ctx.Servis.renderEditReminderTab();
  assert.match(els.servisReminderPanel.innerHTML,/Komponen\/Stok yang dipakai/);
  assert.match(els.servisReminderPanel.innerHTML,/Oli Mesin/);
  assert.match(els.servisReminderPanel.innerHTML,/8\.000 km/);
});

test('setEditTab reminder hanya mengganti presenter panel dan tidak menyimpan data',()=>{
  const D={vehicles:[],sparepartCats:[],partsStock:[],servisLogs:[{id:'s1',vehicleId:'v1',item:'X',checklist:[]}]};
  const els=baseEls();
  const ctx=makeCtx({D,els});
  ctx.Servis.editId='s1';
  const before=JSON.stringify(D.servisLogs);
  ctx.Servis.setEditTab('reminder');
  assert.equal(els.servisDetailPanel.style.display,'none');
  assert.equal(els.servisReminderPanel.style.display,'');
  assert.equal(els.servisEditTabReminder.classList.active,true);
  assert.equal(JSON.stringify(D.servisLogs),before);
});


test('tab Riwayat hanya menampilkan evidence riwayat dan tidak menampilkan countdown Pengingat',()=>{
  const D={vehicles:[{id:'v1',name:'Vario'}],sparepartCats:[{id:'catOil',name:'Oli Mesin',intervalKm:1500}],partsStock:[],servisLogs:[
    {id:'s3',vehicleId:'v1',item:'Oli Mesin',categoryId:'catOil',serviceComponentId:'oil',date:'2026-08-13',km:18554,actionType:'ganti',checklist:[]},
    {id:'s2',vehicleId:'v1',item:'Oli Mesin',categoryId:'catOil',serviceComponentId:'oil',date:'2026-07-18',km:17686,actionType:'periksa',checklist:[]},
    {id:'s1',vehicleId:'v1',item:'Oli Mesin',categoryId:'catOil',serviceComponentId:'oil',date:'2026-06-20',km:16900,actionType:'periksa',checklist:[]},
  ]};
  const els=baseEls(); els.servisHistoryPanel={style:{},innerHTML:''}; els.servisEditTabHistory={classList:makeClassList()};
  const ctx=makeCtx({D,els}); ctx.Servis.editId='s3'; ctx.Servis.renderEditHistoryTab(); const html=els.servisHistoryPanel.innerHTML;
  assert.match(html,/Riwayat Servis/);
  assert.doesNotMatch(html,/Reminder aktif/);
  assert.doesNotMatch(html,/Sisa 1\.000 km/);
  assert.doesNotMatch(html,/Jatuh tempo servis/);
  assert.match(html,/18\.554 km/); assert.match(html,/17\.686 km/); assert.match(html,/16\.900 km/);
});

test('tab Riwayat lama tidak mempertahankan countdown lama karena countdown memang milik Pengingat',()=>{
  const D={vehicles:[{id:'v1',name:'Vario'}],sparepartCats:[{id:'catOil',name:'Oli Mesin',intervalKm:1500}],partsStock:[],servisLogs:[
    {id:'new',vehicleId:'v1',item:'Oli Mesin',categoryId:'catOil',serviceComponentId:'oil',date:'2026-08-13',km:18554,actionType:'ganti',checklist:[]},
    {id:'old',vehicleId:'v1',item:'Oli Mesin',categoryId:'catOil',serviceComponentId:'oil',date:'2026-06-13',km:17000,actionType:'ganti',checklist:[]},
  ]};
  const els=baseEls(); els.servisHistoryPanel={style:{},innerHTML:''}; els.servisEditTabHistory={classList:makeClassList()};
  const ctx=makeCtx({D,els}); ctx.Servis.editId='new'; ctx.Servis.renderEditHistoryTab(); const html=els.servisHistoryPanel.innerHTML;
  assert.equal((html.match(/Reminder aktif/g)||[]).length,0);
  assert.equal((html.match(/Sisa 1\.000 km/g)||[]).length,0);
  assert.match(html,/2026-08-13/); assert.match(html,/2026-06-13/);
});
