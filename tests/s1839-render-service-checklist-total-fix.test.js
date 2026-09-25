// s1839-render-service-checklist-total-fix.test.js
// BUGFIX (audit screenshot user, modal "Edit Catatan Servis"): begitu >=1
// kategori servis dipilih di form, Servis.renderServiceChecklist() (servis.js)
// crash: "TypeError: Cannot read properties of undefined (reading 'length')".
//
// Akar masalah: `groups` dibentuk dari
//   ids.map(id => ServisChecklist.findGroupByMasterCategoryId(id)).filter(Boolean)
// dan findGroupByMasterCategoryId() mengembalikan WRAPPER { group, groupIdx },
// bukan grup itu sendiri (servis-checklist.js, findGroupByMasterCategoryId).
// Baris `cards = groups.map(found => { const group = found.group, ... })` di
// atasnya sudah benar destructure found.group -- tapi baris hitung total
// (`groups.reduce((n,g) => n + g.items.length, 0)`) kelewatan, masih akses
// g.items langsung padahal seharusnya g.group.items. Karena g.items undefined,
// .length meledak sebelum satu pun checklist item sempat dirender.
//
// Gap test sebelumnya: tidak ada test yang memanggil
// Servis.renderServiceChecklist() lewat DOM (servisChecklistPanel) --
// servis-checklist-groups-sesi1a.test.js & service-component-action-sot-s1810
// cuma test API ServisChecklist-nya, bukan fungsi render yang consume
// hasilnya. Test ini menutup gap itu: load source ASLI (bukan re-implement),
// extract body method-nya, jalankan lewat DOM stub minimal, pastikan tidak
// throw dan total/kategori-aktif dihitung benar untuk >1 kategori sekaligus.
const fs=require('fs'),vm=require('vm'),assert=require('assert');

function makeDivStub(){ return { innerHTML:'' }; }

function extractMethodBody(source,name){
  const startMarker=name+'(){';
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

{
  const box=makeDivStub();
  const ctx={
    console,
    escapeHtml:s=>String(s),
    Object,JSON,Array,String,
  };
  ctx.window=ctx;
  vm.createContext(ctx);

  const checklistSrc=fs.readFileSync('modules/vehicle/servis-checklist.js','utf8');
  ctx.document={getElementById(id){ return id==='servisChecklistPanel'?box:null; }};
  ctx.localStorage=undefined;
  vm.runInContext(require('./helpers/serviceMasterFixture').generatedSource(),ctx);
  vm.runInContext(checklistSrc,ctx);
  assert.ok(ctx.ServisChecklist,'ServisChecklist gagal ter-load dari source asli');

  ctx.curVehicleId='veh-1';
  ctx.Servis={
    // 3 kategori sekaligus (real masterCategoryId dari SERVICE_CHECKLIST_GROUPS),
    // sama seperti screenshot: user pilih >1 kategori sebelum checklist tampil.
    _serviceChecklistMasterCategoryIds:['servis-mesin','sistem-pengereman','roda'],
  };

  const servisSrc=fs.readFileSync('modules/vehicle/servis.js','utf8');
  const body=extractMethodBody(servisSrc,'renderServiceChecklist');
  const fn=vm.runInContext(`(function renderServiceChecklist(){${body}})`,ctx);

  assert.doesNotThrow(()=>{ fn.call(ctx.Servis); },
    'renderServiceChecklist() tidak boleh throw saat >1 kategori servis dipilih (regresi s1839)');

  assert.ok(box.innerHTML.includes('☑️ Checklist Komponen Servis'),
    'panel checklist harus benar-benar ter-render (bukan silently kosong)');
  assert.ok(box.innerHTML.includes('3 kategori aktif'),
    'ringkasan jumlah kategori aktif harus benar');

  // Total item = jumlah item di 3 grup itu (dari SERVICE_CHECKLIST_GROUPS asli),
  // dihitung ulang lewat ServisChecklist API supaya test ikut jebol kalau data
  // grup berubah di sesi berikutnya (bukan angka hardcode yang basi).
  const expectedTotal=['servis-mesin','sistem-pengereman','roda']
    .map(id=>ctx.ServisChecklist.findGroupByMasterCategoryId(id))
    .filter(Boolean)
    .reduce((n,found)=>n+found.group.items.length,0);
  assert.ok(box.innerHTML.includes(`0/${expectedTotal} dikerjakan`),
    `ringkasan total harus "0/${expectedTotal} dikerjakan" (regresi s1839: dulu 0/undefined lalu throw)`);

  console.log(`PASS: renderServiceChecklist() render ${expectedTotal} item lintas 3 kategori tanpa throw`);
}

{
  // Guard tambahan: 0 kategori dipilih -> jalur pesan placeholder, TIDAK boleh
  // ikut menyentuh baris total (groups kosong -> reduce tetap aman krn tidak
  // pernah dieksekusi -- early return duluan). Pastikan early-return itu tetap utuh.
  const box=makeDivStub();
  const ctx={console,escapeHtml:s=>String(s)};
  ctx.window=ctx;
  vm.createContext(ctx);
  const checklistSrc=fs.readFileSync('modules/vehicle/servis-checklist.js','utf8');
  ctx.document={getElementById(id){ return id==='servisChecklistPanel'?box:null; }};
  vm.runInContext(require('./helpers/serviceMasterFixture').generatedSource(),ctx);
  vm.runInContext(checklistSrc,ctx);
  ctx.curVehicleId='veh-1';
  ctx.Servis={_serviceChecklistMasterCategoryIds:[]};

  const servisSrc=fs.readFileSync('modules/vehicle/servis.js','utf8');
  const body=extractMethodBody(servisSrc,'renderServiceChecklist');
  const fn=vm.runInContext(`(function renderServiceChecklist(){${body}})`,ctx);

  assert.doesNotThrow(()=>{ fn.call(ctx.Servis); });
  assert.ok(box.innerHTML.includes('Pilih kategori servis untuk membuka checklist komponen'),
    '0 kategori -> placeholder, bukan checklist kosong/error');

  console.log('PASS: renderServiceChecklist() placeholder aman saat 0 kategori dipilih');
}

console.log('S1839-RENDER-SERVICE-CHECKLIST-TOTAL-FIX: 3/3 PASS');
