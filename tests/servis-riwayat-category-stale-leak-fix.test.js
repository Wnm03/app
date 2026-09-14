// servis-riwayat-category-stale-leak-fix.test.js
// BUGFIX (audit video user): "Riwayat A" (punya kategori/komponen servis) dibuka,
// lalu "Riwayat B" (TIDAK punya kategori/komponen -- data lama/legacy) dibuka
// lewat modal yang sama -- Kategori Servis & Komponen Servis di Riwayat B ikut
// menampilkan pilihan Riwayat A (nempel), padahal Riwayat B tidak pernah diisi.
// Sebaliknya juga berlaku (buka B dulu baru A, kalau urutannya dibalik & A yang
// justru kosong). Akar masalah: populateCategorySelect/populateComponentSelect
// (service-input-catalog.js) fallback baca `sel.value` (<select> DOM, TIDAK
// direset antar openModal()) tiap kali argumen selectedId yang dikirim kosong --
// dipakai memang supaya sync() manual (user ngetik) tidak menghapus pilihan
// manual yang sudah ada, tapi ikut termakan juga oleh renderServiceInputSelectors()
// (car-notes.js, dipanggil UTUH tiap buka record apapun) & renderTxServisSelectors()
// (tx-servis.js, pola sama persis di panel servis Transaksi Keuangan).
// Fix: kedua fungsi itu reset value select ke '' dulu SEBELUM memanggil
// populateCategorySelect/populateComponentSelect, supaya fallback di dalamnya
// tidak pernah kebaca dari value riwayat SEBELUMNYA.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {readServisSource}=require('./helpers/carNotesSource');

function makeSelectStub(){ return { value:'', innerHTML:'', options:[] }; }

function loadServiceInputCatalog(ctx){
  const checklist=fs.readFileSync('modules/vehicle/servis-checklist.js','utf8');
  const src=fs.readFileSync('modules/vehicle/service-input-catalog.js','utf8');
  vm.runInContext(checklist,ctx);
  vm.runInContext(src,ctx);
  return ctx.ServiceInputCatalog;
}

// Extracts the body of `renderServiceInputSelectors(selectedMasterId,selectedComponentId,selectedActionType){ ... }`
// from car-notes.js so the test runs against the REAL shipped logic, not a re-implementation.
// NOTE: signature gained a 3rd param (selectedActionType) when the "Tindakan Servis"
// (periksa/bersih/ganti) feature was merged in — the leak-fix itself is unaffected,
// only the extraction marker needed updating to match.
function extractMethodBody(source,name){
  const startMarker=name+'(selectedMasterId,selectedComponentId,selectedActionType){';
  const start=source.indexOf(startMarker);
  assert.ok(start>=0,`method ${name} not found in source`);
  let i=start+startMarker.length,depth=1;
  while(depth>0){
    if(source[i]==='{')depth++;
    else if(source[i]==='}')depth--;
    i++;
  }
  return source.slice(start+startMarker.length,i-1);
}

// --- car-notes.js: Servis.renderServiceInputSelectors (modal Riwayat Servis) ---
{
  const ctx={console,escapeHtml:s=>String(s)};ctx.window=ctx;
  vm.createContext(ctx);
  const ServiceInputCatalog=loadServiceInputCatalog(ctx);

  const catEl=makeSelectStub(), compEl=makeSelectStub(), itemEl={value:''};
  ctx.document={getElementById(id){
    if(id==='servisCategory')return catEl;
    if(id==='servisComponent')return compEl;
    if(id==='servisItem')return itemEl;
    return null;
  }};
  ctx.ServiceInputCatalog=ServiceInputCatalog;
  // stub Servis.syncServiceActionType(): body calls this at the end (Tindakan Servis
  // feature) -- irrelevant to the stale-leak fix under test, so it's a no-op stub.
  ctx.Servis={syncServiceActionType(){}};

  const carNotesSrc=readServisSource();
  const body=extractMethodBody(carNotesSrc,'renderServiceInputSelectors');
  const fn=vm.runInContext(`(function(selectedMasterId,selectedComponentId,selectedActionType){${body}})`,ctx);

  // Riwayat A: punya kategori "servis-mesin" & komponen "oli-mesin"
  fn.call(null,'servis-mesin','oli-mesin');
  assert.strictEqual(catEl.value,'servis-mesin','Riwayat A: kategori terisi benar');
  assert.strictEqual(compEl.value,'oli-mesin','Riwayat A: komponen terisi benar');

  // Riwayat B: TIDAK punya kategori/komponen sama sekali (data lama)
  fn.call(null,'','');
  assert.strictEqual(catEl.value,'','Riwayat B TIDAK boleh mewarisi kategori Riwayat A');
  assert.strictEqual(compEl.value,'','Riwayat B TIDAK boleh mewarisi komponen Riwayat A');

  console.log('PASS: car-notes.js Servis.renderServiceInputSelectors tidak lagi bocor antar riwayat');
}

// --- tx-servis.js: renderTxServisSelectors (panel Servis di modal Transaksi Keuangan) ---
{
  const ctx={console,escapeHtml:s=>String(s)};ctx.window=ctx;
  vm.createContext(ctx);
  const ServiceInputCatalog=loadServiceInputCatalog(ctx);

  const catEl=makeSelectStub(), compEl=makeSelectStub(), itemEl={value:''};
  ctx.document={getElementById(id){
    if(id==='txServisCategory')return catEl;
    if(id==='txServisComponent')return compEl;
    if(id==='txServisItem')return itemEl;
    return null;
  }};
  ctx.ServiceInputCatalog=ServiceInputCatalog;
  ctx.renderTxServisChecklist=()=>{};

  const txServisSrc=fs.readFileSync('modules/finance/tx-servis.js','utf8');
  const start=txServisSrc.indexOf('function renderTxServisSelectors(selectedMasterId,selectedComponentId){');
  assert.ok(start>=0,'renderTxServisSelectors not found');
  let i=txServisSrc.indexOf('{',start),depth=1;i++;
  while(depth>0){ if(txServisSrc[i]==='{')depth++; else if(txServisSrc[i]==='}')depth--; i++; }
  const body=txServisSrc.slice(txServisSrc.indexOf('{',start)+1,i-1);
  const fn=vm.runInContext(`(function(selectedMasterId,selectedComponentId){${body}})`,ctx);

  fn.call(null,'sistem-pengereman','kampas-rem-depan');
  assert.strictEqual(catEl.value,'sistem-pengereman');
  assert.strictEqual(compEl.value,'kampas-rem-depan');

  fn.call(null,'','');
  assert.strictEqual(catEl.value,'','Transaksi servis lain TIDAK boleh mewarisi kategori transaksi sebelumnya');
  assert.strictEqual(compEl.value,'','Transaksi servis lain TIDAK boleh mewarisi komponen transaksi sebelumnya');

  console.log('PASS: tx-servis.js renderTxServisSelectors tidak lagi bocor antar transaksi');
}

console.log('SERVIS-RIWAYAT-CATEGORY-STALE-LEAK-FIX: 2/2 PASS');
