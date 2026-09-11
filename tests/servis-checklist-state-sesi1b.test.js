'use strict';
// tests/servis-checklist-state-sesi1b.test.js — cakupan Sesi 1B
// (BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md §"Sesi 1B — State & logic
// toggle").
//
// Target: ServisChecklist.open/toggleItem/setActionType/checkedCount
// (modules/vehicle/servis-checklist.js) -- MURNI state/logic in-memory, 0
// markup (itu Sesi 1C), 0 tulis D.servisLogs (itu Sesi 2A). Mengunci 2
// Keputusan W yang menjadi syarat sesi ini ditulis (lihat breakdown
// dokumen §"Keputusan W yang masih menggantung" poin 1-2):
//   1. Default toggle periksa/ganti = 'periksa'.
//   2. Item ganti-saja/bersih-saja TETAP 1-actionType (tidak ada opsi
//      "periksa saja" tambahan).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function freshCtx(D) {
  // sparepart-servis.js dimuat DULUAN -- servis-checklist.js Sesi 1B
  // memanggil resolveServisCatForVehicle()/suggestNextBusiAction() dari
  // file itu apa adanya (lihat komentar _defaultActionType di source).
  return loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/servis-checklist.js'],
    { D },
    ['SERVICE_CHECKLIST_GROUPS', 'ServisChecklist'],
  );
}

// Index posisi item yang dipakai di test ini (persis SERVICE_CHECKLIST_GROUPS
// Sesi 1A) -- dicek ulang lewat nama di masing-masing test pertama supaya
// kalau urutan data berubah di sesi lain, test ini gagal jelas (bukan diam2
// nge-test item yang salah).
const G_MESIN = 0; // 'Servis Mesin'
const I_OLI_MESIN = 0; // ganti (terkunci)
const I_BUSI = 1; // alternate
const I_CELAH_KLEP = 2; // periksa (terkunci)
const I_RANTAI_KETENG = 3; // periksa-conditional
const I_KOMPRESI_MESIN = 4; // none
const G_REM = 5; // 'Sistem Pengereman'
const I_KAMPAS_REM_DEPAN = 0; // periksa-conditional
const I_SELANG_REM = 3; // ganti (terkunci)

test('sanity index: nama item di posisi yang dipakai test ini masih sesuai Sesi 1A', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  const g = ctx.SERVICE_CHECKLIST_GROUPS;
  assert.equal(g[G_MESIN].group, 'Servis Mesin');
  assert.equal(g[G_MESIN].items[I_OLI_MESIN].id, 'oli-mesin');
  assert.equal(g[G_MESIN].items[I_BUSI].id, 'busi');
  assert.equal(g[G_MESIN].items[I_CELAH_KLEP].id, 'celah-klep');
  assert.equal(g[G_MESIN].items[I_RANTAI_KETENG].id, 'rantai-keteng-tensioner');
  assert.equal(g[G_MESIN].items[I_KOMPRESI_MESIN].id, 'kompresi-mesin');
  assert.equal(g[G_REM].group, 'Sistem Pengereman');
  assert.equal(g[G_REM].items[I_KAMPAS_REM_DEPAN].id, 'kampas-rem-depan');
  assert.equal(g[G_REM].items[I_SELANG_REM].id, 'selang-rem');
});

test('open(vehicleId): reset _checked jadi {} & simpan vehicleId aktif', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  const r = ctx.ServisChecklist.open('veh-1');
  assert.equal(r.ok, true);
  assert.equal(r.vehicleId, 'veh-1');
  assert.deepEqual(JSON.parse(JSON.stringify(r.checked)), {});
  assert.equal(ctx.ServisChecklist.checkedCount(G_MESIN), 0);
});

test('open() dipanggil ulang membuang state sesi sebelumnya (tidak dibawa antar-buka-modal)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN);
  assert.equal(ctx.ServisChecklist.checkedCount(G_MESIN), 1);
  ctx.ServisChecklist.open('veh-1');
  assert.equal(ctx.ServisChecklist.checkedCount(G_MESIN), 0);
});

test('toggleItem: item ganti-saja (Oli Mesin) langsung checked[id]="ganti", tanpa dialog tambahan (Keputusan W poin 2)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { ok: true, id: 'oli-mesin', checked: true, actionType: 'ganti' });
});

test('toggleItem: item periksa terkunci (Celah Klep) -> checked[id]="periksa"', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_MESIN, I_CELAH_KLEP);
  assert.equal(r.actionType, 'periksa');
});

test('toggleItem: item "none" (Kompresi Mesin) -> checked[id]="catat" (sentinel, no actionType ganti/periksa)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_MESIN, I_KOMPRESI_MESIN);
  assert.equal(r.actionType, 'catat');
});

test('toggleItem: item 2-pilihan (Kampas Rem Depan, periksa-conditional) default "periksa" (KEPUTUSAN W poin 1)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_REM, I_KAMPAS_REM_DEPAN);
  assert.equal(r.actionType, 'periksa');
});

test('toggleItem: toggle ulang (centang lagi setelah uncentang) menghapus lalu isi ulang key -- uncentang pakai delete, bukan false/null', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  const on = ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN);
  assert.equal(on.checked, true);
  assert.ok(Object.prototype.hasOwnProperty.call(ctx.ServisChecklist._checked, 'oli-mesin'));
  const off = ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN);
  assert.deepEqual(JSON.parse(JSON.stringify(off)), { ok: true, id: 'oli-mesin', checked: false, actionType: null });
  assert.ok(!Object.prototype.hasOwnProperty.call(ctx.ServisChecklist._checked, 'oli-mesin'));
});

test('toggleItem: groupIdx/itemIdx di luar batas -> {ok:false}, tidak throw', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  assert.equal(ctx.ServisChecklist.toggleItem(99, 0).ok, false);
  assert.equal(ctx.ServisChecklist.toggleItem(G_MESIN, 99).ok, false);
});

test('toggleItem: Busi (alternate) tanpa kategori ke-resolve -> fallback "periksa" (suggestNextBusiAction butuh cat valid)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] }); // kategori Busi belum ada
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_MESIN, I_BUSI);
  assert.equal(r.actionType, 'periksa');
});

test('toggleItem: Busi (alternate) dgn kategori ada & 0 histori log -> saran "periksa" (genap, suggestNextBusiAction dipanggil apa adanya)', () => {
  const D = { sparepartCats: [{ id: 'cat-busi', name: 'Busi' }], servisLogs: [] };
  const ctx = freshCtx(D);
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_MESIN, I_BUSI);
  assert.equal(r.actionType, 'periksa');
});

test('toggleItem: Busi (alternate) dgn 1 histori log kendaraan aktif -> saran "ganti" (ganjil, ikut suggestNextBusiAction)', () => {
  const D = {
    sparepartCats: [{ id: 'cat-busi', name: 'Busi' }],
    servisLogs: [{ vehicleId: 'veh-1', item: 'Busi', categoryId: 'cat-busi' }],
  };
  const ctx = freshCtx(D);
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_MESIN, I_BUSI);
  assert.equal(r.actionType, 'ganti');
});

test('toggleItem: Busi -- histori kendaraan LAIN tidak ikut dihitung (saran per-kendaraan, bukan global)', () => {
  const D = {
    sparepartCats: [{ id: 'cat-busi', name: 'Busi' }],
    servisLogs: [{ vehicleId: 'veh-LAIN', item: 'Busi', categoryId: 'cat-busi' }],
  };
  const ctx = freshCtx(D);
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.toggleItem(G_MESIN, I_BUSI);
  assert.equal(r.actionType, 'periksa'); // 0 histori veh-1 -> genap -> periksa
});

test('setActionType: override manual periksa->ganti pada item 2-pilihan yang sudah tercentang', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  ctx.ServisChecklist.toggleItem(G_REM, I_KAMPAS_REM_DEPAN);
  const r = ctx.ServisChecklist.setActionType(G_REM, I_KAMPAS_REM_DEPAN, 'ganti');
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { ok: true, id: 'kampas-rem-depan', actionType: 'ganti' });
});

test('setActionType: gagal kalau item belum dicentang (tidak otomatis mencentang)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  const r = ctx.ServisChecklist.setActionType(G_REM, I_KAMPAS_REM_DEPAN, 'ganti');
  assert.equal(r.ok, false);
});

test('setActionType: tolak actionType yang tidak valid utk item ganti-saja terkunci (Oli Mesin, Selang Rem)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN);
  const r = ctx.ServisChecklist.setActionType(G_MESIN, I_OLI_MESIN, 'periksa');
  assert.equal(r.ok, false, 'Keputusan W poin 2: Oli Mesin TIDAK punya opsi "periksa saja"');
  ctx.ServisChecklist.toggleItem(G_REM, I_SELANG_REM);
  const r2 = ctx.ServisChecklist.setActionType(G_REM, I_SELANG_REM, 'bersih');
  assert.equal(r2.ok, false);
});

test('setActionType: tolak actionType di luar ["periksa","ganti"] utk item alternate (Busi)', () => {
  const D = { sparepartCats: [{ id: 'cat-busi', name: 'Busi' }], servisLogs: [] };
  const ctx = freshCtx(D);
  ctx.ServisChecklist.open('veh-1');
  ctx.ServisChecklist.toggleItem(G_MESIN, I_BUSI);
  const r = ctx.ServisChecklist.setActionType(G_MESIN, I_BUSI, 'bersih');
  assert.equal(r.ok, false);
  const ok = ctx.ServisChecklist.setActionType(G_MESIN, I_BUSI, 'ganti');
  assert.equal(ok.ok, true);
});

test('checkedCount(groupIdx): hitung item tercentang per grup, independen antar grup', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN);
  ctx.ServisChecklist.toggleItem(G_MESIN, I_CELAH_KLEP);
  ctx.ServisChecklist.toggleItem(G_REM, I_KAMPAS_REM_DEPAN);
  assert.equal(ctx.ServisChecklist.checkedCount(G_MESIN), 2);
  assert.equal(ctx.ServisChecklist.checkedCount(G_REM), 1);
});

test('checkedCount: uncentang mengurangi hitungan; groupIdx di luar batas -> 0 (bukan throw)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  ctx.ServisChecklist.open('veh-1');
  ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN);
  ctx.ServisChecklist.toggleItem(G_MESIN, I_OLI_MESIN); // uncentang lagi
  assert.equal(ctx.ServisChecklist.checkedCount(G_MESIN), 0);
  assert.equal(ctx.ServisChecklist.checkedCount(99), 0);
});

test('window.ServisChecklist ter-expose (gate verify-window-expose.js, pola sama window.Sparepart)', () => {
  const ctx = freshCtx({ sparepartCats: [], servisLogs: [] });
  assert.equal(ctx.window.ServisChecklist, ctx.ServisChecklist);
});
