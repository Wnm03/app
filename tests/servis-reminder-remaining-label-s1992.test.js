'use strict';
// S1992: tab Pengingat (Edit Catatan Servis) tidak boleh menampilkan "Sisa -10.637 km".
// Negatif = terlewat; interval harus berlabel "interval" agar tidak terbaca sebagai angka keterlambatan.
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function load(globals){
  return loadSource(['modules/vehicle/servis.js'],Object.assign({D:{servisLogs:[],transactions:[]},curVehicleId:'v1'},globals||{}),['Servis']);
}
const fmt=(u)=>load().Servis._formatReminderRemaining(u);

test('S1992 _formatReminderRemaining: positif tetap "Sisa"',()=>{
  assert.equal(fmt({sisaKm:2500,sisaBulan:10}),'Sisa 2.500 km · sisa 10 bln');
});

test('S1992 _formatReminderRemaining: km negatif -> Terlewat (tanpa tanda minus)',()=>{
  const r=fmt({sisaKm:-10637,sisaBulan:10});
  assert.equal(r,'Terlewat 10.637 km · sisa 10 bln');
  assert.ok(!/-/.test(r),'tidak boleh ada tanda minus');
});

test('S1992 _formatReminderRemaining: bulan negatif -> terlewat; keduanya negatif',()=>{
  assert.equal(fmt({sisaKm:500,sisaBulan:-3}),'Sisa 500 km · terlewat 3 bln');
  assert.equal(fmt({sisaKm:-200,sisaBulan:-2}),'Terlewat 200 km · terlewat 2 bln');
});

test('S1992 _formatReminderRemaining: hanya salah satu sumbu, null, atau tidak valid',()=>{
  assert.equal(fmt({sisaKm:1000,sisaBulan:null}),'Sisa 1.000 km');
  assert.equal(fmt({sisaKm:null,sisaBulan:4}),'sisa 4 bln');
  assert.equal(fmt({sisaKm:null,sisaBulan:null}),'');
  assert.equal(fmt({sisaKm:'abc',sisaBulan:undefined}),'');
  assert.equal(fmt(null),'');
  assert.equal(fmt(undefined),'');
});

test('S1992 _formatReminderRemaining: pembulatan mendekati nol tidak jadi "Terlewat 0"',()=>{
  assert.equal(fmt({sisaKm:-0.4,sisaBulan:-0.3}),'Sisa 0 km · sisa 0 bln');
  assert.equal(fmt({sisaKm:-0.6}),'Terlewat 1 km');
});

test('S1992 renderEditReminderTab: kasus screenshot (interval 4.000 km, sisa -10.637 km, sisa 10 bln)',()=>{
  const panel={innerHTML:''};
  const D={
    servisLogs:[{id:'s1',vehicleId:'v1',item:'Coolant',categoryId:'c1'}],
    vehicles:[{id:'v1',name:'Vario 125'}],
    sparepartCats:[{id:'c1',name:'Cairan pendingin radiator (coolant)',intervalKm:4000,intervalBulan:24}],
    partsStock:[],transactions:[],
  };
  const c=load({
    D,curVehicleId:'v1',
    document:{getElementById:id=>id==='servisReminderPanel'?panel:null},
    escapeHtml:(v)=>String(v),
  });
  // Harness memuat fungsi asli (function declaration) -> timpa setelah load, bukan lewat globals.
  c.getVehicleKm=()=>50000;c.estimateKmPerDay=()=>30;c.getLastServiceKmForCat=()=>40000;
  c.getEffectiveIntervalKm=()=>4000;c.getEffectiveIntervalBulan=()=>24;
  c.getCanonicalServiceInterval=()=>({intervalKm:4000,intervalBulan:24});
  c.computeServiceUrgency=()=>({statusIcon:'⚫',statusLabel:'Terlewat',sisaKm:-10637,sisaBulan:10.2});
  c.Servis.editId='s1';
  c.Servis._renderEditHistoryHtml=()=>'';
  c.Servis.renderEditReminderTab();
  const html=panel.innerHTML;
  assert.ok(html.includes('Terlewat 10.637 km'),'menampilkan keterlambatan sebagai Terlewat');
  assert.ok(html.includes('sisa 10 bln'),'sumbu waktu tetap "sisa"');
  assert.ok(!html.includes('Sisa -10'),'tidak ada "Sisa -10.637 km"');
  assert.ok(!/Sisa\s*-\d/.test(html),'tidak ada "Sisa" + angka negatif');
  assert.ok(html.includes('interval 4.000 km'),'interval berlabel eksplisit');
  assert.ok(html.includes('sumber: Kategori'));
});

test('S1992 renderEditReminderTab: tanpa urgency tidak merender baris sisa kosong',()=>{
  const panel={innerHTML:''};
  const D={servisLogs:[{id:'s1',vehicleId:'v1',item:'X',categoryId:'c1'}],vehicles:[{id:'v1',name:'V'}],sparepartCats:[{id:'c1',name:'Kat',intervalKm:0}],partsStock:[]};
  const c=load({D,document:{getElementById:id=>id==='servisReminderPanel'?panel:null},escapeHtml:(v)=>String(v)});
  c.computeServiceUrgency=undefined;
  c.Servis.editId='s1';c.Servis._renderEditHistoryHtml=()=>'';
  c.Servis.renderEditReminderTab();
  assert.ok(!/margin-top:6px[^>]*><\/div>/.test(panel.innerHTML),'tidak ada div sisa kosong');
});
