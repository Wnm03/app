const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const modal=fs.readFileSync(path.join(root,'modules/shared/modals.js'),'utf8');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');

test('S2010 form: kategori/komponen/jenis servis tidak lagi tampil sebagai selector duplikat di atas checklist',()=>{
  const i=modal.indexOf('id=\\"servisModal\\"');
  const end=modal.indexOf('id=\\"servisReminderPanel\\"',i);
  assert.ok(i>=0&&end>i,'servisModal markup ditemukan');
  const detail=modal.slice(i,end);
  assert.match(detail,/id=\\"servisLegacyInputSelectors\\"[^>]*aria-hidden=\\"true\\"/);
  assert.doesNotMatch(detail,/id=\\"servisCanonicalInputSelectors\\"/);
  assert.doesNotMatch(detail,/Jenis Servis\/Item/);
  assert.doesNotMatch(detail,/Tindakan Servis/);
  assert.doesNotMatch(detail,/Hasil Pemeriksaan/);
  assert.doesNotMatch(detail,/Catatan Kondisi/);
});

test('S2010 form: jenis pekerjaan tetap satu metadata sesi dan ditempatkan di area checklist',()=>{
  assert.match(servis,/ensureServiceJobTypeUI\(selectedJobType\)/);
  assert.match(servis,/getElementById\('servisChecklistPanel'\)/);
  assert.match(servis,/id=\\?['\"]servisJobType/);
  assert.match(servis,/Jenis Pekerjaan[^\n]*satu sesi/);
  assert.doesNotMatch(servis,/catEl\.parentElement\.insertAdjacentElement\('beforebegin',wrap\)/);
});

test('S2010 persistence: item/category/component/action tetap diturunkan dari checklist, bukan input manual terpisah',()=>{
  assert.match(servis,/Servis\.syncServiceContextFromChecklist\(\);/);
  assert.match(servis,/let _preSaveChecklistSeed=.*ServisChecklist\.toLogPayload\(\)/);
  assert.match(servis,/masterCategoryId=masterCategoryId\|\|_seed\.masterCategoryId/);
  assert.match(servis,/serviceComponentId=serviceComponentId\|\|_seed\.serviceComponentId/);
  assert.match(servis,/const _rowActionType=_row\.actionType\|\|actionType/);
});

test('S2010 UX: checklist menjelaskan bahwa identity/action/condition/cost berada pada komponen',()=>{
  assert.match(servis,/Detail tindakan, hasil, biaya, part, foto, dan pengingat berada di kartu komponen|Semua detail pekerjaan disimpan pada kartu komponen/);
  assert.match(servis,/Pilih kategori servis untuk membuka checklist komponen/);
});


test('S2010 resilience: chip kategori punya fallback ke ServiceInputCatalog bila DatabaseAPI tidak tersedia',()=>{
  assert.match(servis,/const sourceCats=hasApi[\s\S]*ServiceInputCatalog\.groups/);
  assert.match(servis,/const cats=sourceCats\.filter/);
});
