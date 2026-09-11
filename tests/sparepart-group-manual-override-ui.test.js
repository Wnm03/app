'use strict';
// tests/sparepart-group-manual-override-ui.test.js — fitur override grup
// manual (backlog sejak v1638: form "🔧 Kelola Kategori Sparepart" belum
// punya field manual utk override group/groupIcon langsung). Dikerjakan 2
// sesi terpisah (diminta user) — file test ini mencakup KEDUANYA.
//
// Sesi 1 — lapisan UI/populate saja:
//   1) collectKnownGroups() — kumpulkan grup unik dari TORSI_DB (semua
//      kendaraan) + GENERIC_GROUP_BY_NAME.
//   2) iconForGroupName() — cari icon utk 1 nama grup dari daftar di atas.
//   3) Sparepart.populateGroupSelect() — isi dropdown #sparepartGroupId:
//      opsi "🤖 Otomatis" (value kosong) + semua grup dikenal + grup KUSTOM
//      kategori yg diedit kalau grup itu tersimpan tapi tidak ada di daftar
//      dikenal (supaya tidak hilang dari dropdown).
//   4) Sparepart.openCatModal() memanggil populateGroupSelect() dgn
//      cat.group tersimpan (atau kosong/Otomatis utk kategori baru).
//
// Sesi 2 (lanjutan, ditambahkan ke file yang sama) — saveCat() SEKARANG baca
// dropdown #sparepartGroupId & terapkan override:
//   - Value non-kosong (grup dipilih) MENANG MUTLAK atas resolveCatGroup(),
//     baik cabang TAMBAH maupun EDIT, TERMASUK menang atas rule
//     recompute-by-rename dari v1641 (rename nama/pindah kendaraan tidak lagi
//     override pilihan manual di dropdown).
//   - Value kosong ("🤖 Otomatis") saat EDIT & nama/kendaraan TIDAK berubah
//     berarti reset eksplisit ke otomatis — group/groupIcon TERSIMPAN
//     dihapus (bukan cuma dibiarkan), supaya resolveCatGroup() ke depan
//     benar2 jatuh ke jalur otomatis, bukan terbaca sbg "tersimpan manual"
//     lagi (itu prioritas #1 resolveCatGroup()).
//   - Value kosong saat EDIT & nama/kendaraan BERUBAH: rule recompute-by-
//     rename v1641 tetap jalan apa adanya (0 regresi).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial) {
  return Object.assign(
    { value: '', disabled: false, textContent: '', checked: false, innerHTML: '', style: {}, dataset: {}, oninput: null, classList: { add() {}, remove() {} } },
    initial || {}
  );
}

function baseD(overrides) {
  return Object.assign(
    {
      vehicles: [
        { id: 'veh1', name: 'Vario 125', jenis: 'motor' },
        { id: 'veh2', name: 'Xpander', jenis: 'mobil' },
      ],
      sparepartCats: [],
      partsStock: [],
      servisLogs: [],
    },
    overrides || {}
  );
}

function makeCtx(D, curVehicleId, extraEls) {
  const els = Object.assign(
    {
      sparepartModalTitle: makeEl(),
      sparepartName: makeEl({ value: '' }),
      sparepartInterval: makeEl({ value: '' }),
      sparepartIntervalBulan: makeEl({ value: '' }),
      sparepartCode: makeEl({ value: '' }),
      sparepartShowInReminder: makeEl({ checked: true }),
      sparepartVehicleId: makeEl(),
      sparepartGroupId: makeEl(),
      sparepartAiSuggestBox: makeEl(),
      sparepartDelBtn: makeEl(),
    },
    extraEls || {}
  );
  const document = { getElementById: (id) => els[id] || null, createElement: () => makeEl({ appendChild() {} }) };
  const ctx = loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    {
      D,
      document,
      curVehicleId,
      openModal: () => {},
      closeModal: () => {},
      save: () => {},
      toast: () => {},
      askConfirm: async () => true,
      renderServisList: () => {},
      renderDashboardServisReminder: () => {},
      matchingVehicleName: () => null,
      codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
      escapeHtml: (s) => (s === null || s === undefined) ? '' : String(s),
      MY_WRENCH: {},
    },
    ['Sparepart', 'collectKnownGroups', 'iconForGroupName']
  );
  ctx._els = els;
  return ctx;
}

test('collectKnownGroups() — kumpulkan grup unik dari semua entri TORSI_DB + GENERIC_GROUP_BY_NAME, tanpa duplikat', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  const groups = ctx.collectKnownGroups();
  const names = groups.map((g) => g.group);
  assert.ok(names.includes('Sistem Rem'));
  assert.ok(names.includes('Perawatan Berkala'));
  // Perawatan Berkala muncul di lebih dari 1 entri TORSI_DB (beda kendaraan)
  // dan juga di GENERIC_GROUP_BY_NAME -- harus tetap 1 entri saja di hasil.
  assert.equal(names.filter((n) => n === 'Perawatan Berkala').length, 1);
  groups.forEach((g) => assert.ok(g.icon, `grup "${g.group}" harus punya icon`));
});

test('iconForGroupName() — balikin icon grup yang dikenal, fallback 📦 utk grup tak dikenal', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  assert.equal(ctx.iconForGroupName('Sistem Rem'), '🛑');
  assert.equal(ctx.iconForGroupName('Grup Yang Tidak Ada'), '📦');
  assert.equal(ctx.iconForGroupName(''), '📦');
});

test('populateGroupSelect() — isi dropdown dgn opsi Otomatis + semua grup dikenal, value default kosong utk kategori baru', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  ctx.Sparepart.populateGroupSelect(null);
  const sel = ctx._els.sparepartGroupId;
  assert.ok(sel.innerHTML.includes('🤖 Otomatis'));
  assert.equal(sel.value, '');
  assert.ok(sel.innerHTML.includes('Sistem Rem'));
});

test('populateGroupSelect() — grup kustom (belum ada di daftar dikenal) tetap dimasukkan & jadi nilai terpilih', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  ctx.Sparepart.populateGroupSelect('Grup Racikan Sendiri');
  const sel = ctx._els.sparepartGroupId;
  assert.ok(sel.innerHTML.includes('Grup Racikan Sendiri'));
  assert.equal(sel.value, 'Grup Racikan Sendiri');
});

test('populateGroupSelect() — no-op aman kalau elemen dropdown tidak ada di DOM (guard)', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1', { sparepartGroupId: null });
  assert.doesNotThrow(() => ctx.Sparepart.populateGroupSelect('Sistem Rem'));
});

test('openCatModal() — TAMBAH baru: dropdown grup terisi Otomatis (kosong)', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal();
  assert.equal(ctx._els.sparepartGroupId.value, '');
});

test('openCatModal() — EDIT kategori existing: dropdown grup terisi sesuai cat.group tersimpan', () => {
  const D = baseD({
    sparepartCats: [
      { id: 'sp1', name: 'Kampas Rem', code: 'KAM', intervalKm: 8000, intervalBulan: 0, showInReminder: true, vehicleId: 'veh1', group: 'Sistem Rem', groupIcon: '🛑' },
    ],
  });
  const ctx = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(0);
  assert.equal(ctx._els.sparepartGroupId.value, 'Sistem Rem');
});

// ==========================================================================
// Sesi 2 dari 2 (lanjutan) — saveCat() SEKARANG baca dropdown #sparepartGroupId
// & terapkan override: value non-kosong MENANG mutlak atas resolveCatGroup()
// (TAMBAH maupun EDIT, termasuk menang atas rule recompute-by-rename v1641);
// value kosong ("🤖 Otomatis") saat EDIT & nama/kendaraan TIDAK berubah berarti
// reset eksplisit -- group/groupIcon tersimpan DIHAPUS.
// ==========================================================================

test('saveCat() TAMBAH baru — dropdown "🤖 Otomatis" (kosong): group tetap hasil resolveCatGroup() murni (0 regresi perilaku lama)', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  ctx._els.sparepartName.value = 'Kampas Rem';
  ctx._els.sparepartInterval.value = '8000';
  ctx._els.sparepartGroupId.value = ''; // Otomatis
  ctx.Sparepart.catEditIdx = null;
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats.find((c) => c.name === 'Kampas Rem');
  assert.equal(cat.group, 'Sistem Rem'); // hasil resolveCatGroup() (match TORSI_DB)
});

test('saveCat() TAMBAH baru — dropdown grup dipilih manual: MENANG atas resolveCatGroup(), tersimpan apa adanya', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  ctx._els.sparepartName.value = 'Kampas Rem'; // resolveCatGroup() akan bilang "Sistem Rem"
  ctx._els.sparepartInterval.value = '8000';
  ctx._els.sparepartGroupId.value = 'Perawatan Berkala'; // dipilih manual, HARUS menang
  ctx.Sparepart.catEditIdx = null;
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats.find((c) => c.name === 'Kampas Rem');
  assert.equal(cat.group, 'Perawatan Berkala'); // pilihan dropdown, BUKAN resolveCatGroup()
  assert.equal(cat.groupIcon, ctx.iconForGroupName('Perawatan Berkala'));
});

test('saveCat() TAMBAH baru — dropdown grup KUSTOM (tidak dikenal collectKnownGroups()): tetap tersimpan apa adanya, icon fallback 📦', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1');
  ctx._els.sparepartName.value = 'Kampas Rem';
  ctx._els.sparepartInterval.value = '8000';
  ctx._els.sparepartGroupId.value = 'Grup Racikan Sendiri';
  ctx.Sparepart.catEditIdx = null;
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats.find((c) => c.name === 'Kampas Rem');
  assert.equal(cat.group, 'Grup Racikan Sendiri');
  assert.equal(cat.groupIcon, '📦');
});

test('saveCat() EDIT — dropdown grup dipilih manual MENANG mutlak, bahkan saat nama DIRENAME (harusnya trigger recompute v1641)', () => {
  const D = baseD({
    sparepartCats: [
      { id: 'sp1', name: 'Oli Mesin', code: 'OLI', intervalKm: 4000, intervalBulan: 0, showInReminder: true, vehicleId: 'veh1', group: 'Perawatan Berkala', groupIcon: '🛠️' },
    ],
  });
  const ctx = makeCtx(D, 'veh1');
  ctx.Sparepart.catEditIdx = 0;
  ctx._els.sparepartName.value = 'Kampas Rem'; // rename -> tanpa override, v1641 akan recompute ke "Sistem Rem"
  ctx._els.sparepartInterval.value = '8000';
  ctx._els.sparepartGroupId.value = 'Kelistrikan'; // override manual, HARUS menang atas recompute
  ctx.Sparepart.saveCat();
  assert.equal(D.sparepartCats[0].group, 'Kelistrikan');
  assert.equal(D.sparepartCats[0].groupIcon, ctx.iconForGroupName('Kelistrikan'));
});

test('saveCat() EDIT — nama/kendaraan TIDAK berubah + dropdown "🤖 Otomatis" dipilih eksplisit: reset, group/groupIcon tersimpan DIHAPUS', () => {
  const D = baseD({
    sparepartCats: [
      { id: 'sp1', name: 'Kampas Rem', code: 'KAM', intervalKm: 8000, intervalBulan: 0, showInReminder: true, vehicleId: 'veh1', group: 'Perawatan Berkala', groupIcon: '🛠️' },
    ],
  });
  const ctx = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(0); // isi dropdown vehicleId/name/group sesuai tersimpan
  ctx.Sparepart.catEditIdx = 0;
  ctx._els.sparepartInterval.value = '8000';
  ctx._els.sparepartGroupId.value = ''; // Otomatis dipilih eksplisit (ubah dari 'Perawatan Berkala')
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats[0];
  assert.equal('group' in cat, false);
  assert.equal('groupIcon' in cat, false);
});

test('saveCat() EDIT — nama/kendaraan TIDAK berubah + dropdown TIDAK disentuh (masih tampilkan grup tersimpan): tersimpan apa adanya (0 perubahan)', () => {
  const D = baseD({
    sparepartCats: [
      { id: 'sp1', name: 'Kampas Rem', code: 'KAM', intervalKm: 8000, intervalBulan: 0, showInReminder: true, vehicleId: 'veh1', group: 'Sistem Rem', groupIcon: '🛑' },
    ],
  });
  const ctx = makeCtx(D, 'veh1');
  ctx.Sparepart.openCatModal(0); // populateGroupSelect() isi dropdown = 'Sistem Rem' (tersimpan)
  ctx.Sparepart.catEditIdx = 0;
  ctx._els.sparepartInterval.value = '8000';
  ctx.Sparepart.saveCat(); // dropdown TIDAK diubah manual, masih 'Sistem Rem'
  assert.equal(D.sparepartCats[0].group, 'Sistem Rem');
  assert.equal(D.sparepartCats[0].groupIcon, '🛑');
});

test('saveCat() — guard aman: elemen dropdown #sparepartGroupId tidak ada di DOM, perilaku identik sebelum Sesi 2 (resolveCatGroup() murni)', () => {
  const D = baseD();
  const ctx = makeCtx(D, 'veh1', { sparepartGroupId: undefined });
  delete ctx._els.sparepartGroupId;
  ctx._els.sparepartName.value = 'Kampas Rem';
  ctx._els.sparepartInterval.value = '8000';
  ctx.Sparepart.catEditIdx = null;
  ctx.Sparepart.saveCat();
  const cat = D.sparepartCats.find((c) => c.name === 'Kampas Rem');
  assert.equal(cat.group, 'Sistem Rem');
});
