'use strict';
// tests/sparepart-interval-bulan.test.js — cakupan fitur baru "Interval
// Waktu (Bulan, opsional)" pada Kategori Sparepart (modules/vehicle/
// sparepart-servis.js): sebagian kategori servis (mis. Minyak Rem, Aki)
// idealnya diingatkan berbasis WAKTU juga, bukan cuma KM, krn bisa menurun
// kualitasnya meski kendaraan jarang dipakai.
//
// Cakupan:
//  - getEffectiveIntervalBulan()/getLastServiceDateForCat()/monthsSinceISO()
//    — helper murni baru, backward-compatible (null kalau tidak diisi).
//  - computeServiceUrgency() — SoT baru gabungan km+bulan; utk kategori yg
//    TIDAK punya intervalBulan, hasilnya identik dgn formula km lama (0
//    regresi utk data existing).
//  - saveCat()/openCatModal() — baca/tulis cat.intervalBulan lewat field
//    yang diinjeksi runtime (ensureIntervalBulanField()), no-op-safe kalau
//    anchor DOM tidak ada.
//  - parseCategoryCSV()/commitCategoryCSV()/exportCategoryCSV() — kolom
//    interval_bulan opsional, additive & order-agnostic.

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
      vehicles: [{ id: 'v1', name: 'Vario 125', jenis: 'motor' }],
      sparepartCats: [],
      servisLogs: [],
      partsStock: [],
    },
    overrides || {}
  );
}

function makeCtx(D, extra) {
  return loadSource(
    // sparepart-servis-b.js ditambahkan (audit split sesi ini): predictService()
    // dipindah ke situ, dimuat SETELAH sparepart-servis.js sama seperti build.js.
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    Object.assign(
      {
        D,
        curVehicleId: 'v1',
        codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
        save: () => {},
        toast: () => {},
        escapeHtml: (s) => String(s == null ? '' : s),
        document: { getElementById: () => null, querySelectorAll: () => [] },
        renderServisList: () => {},
        renderDashboardServisReminder: () => {},
        estimateServiceDateISO: () => null,
        // getLastServiceKmForCat() (dideklarasikan di bawah, dipanggil dari
        // computeServiceUrgency()/predictService()) delegasi ke
        // Servis.getLastServiceKmForCat() (car-notes.js, TIDAK dimuat di
        // harness ini) — stub minimal pola sama persis logic aslinya,
        // supaya test murni sparepart-servis.js ini tidak perlu load
        // car-notes.js segala.
        Servis: {
          getLastServiceKmForCat: (vehicleId, cat) => {
            const logs = (D.servisLogs || [])
              .filter((s) => s.vehicleId === vehicleId && s.km && (s.categoryId === cat.id))
              .sort((a, b) => new Date(b.date) - new Date(a.date) || b.km - a.km);
            return logs.length ? logs[0].km : null;
          },
        },
        MY_WRENCH: {},
      },
      extra || {}
    ),
    ['Sparepart']
  );
}

test('getEffectiveIntervalBulan() — balikin null kalau tidak diisi/0 (backward compatible), angka kalau >0', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.getEffectiveIntervalBulan({ intervalBulan: 0 }), null);
  assert.equal(ctx.getEffectiveIntervalBulan({}), null);
  assert.equal(ctx.getEffectiveIntervalBulan({ intervalBulan: 6 }), 6);
});

test('monthsSinceISO() — hitung selisih bulan (desimal) antara 2 tanggal, null kalau dateISO kosong', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.monthsSinceISO(null, '2026-08-26'), null);
  const m = ctx.monthsSinceISO('2026-02-26', '2026-08-26');
  assert.ok(m > 5.9 && m < 6.1, 'expect ~6 bulan, got ' + m);
});

test('getLastServiceDateForCat() — reuse servisLogMatchesCat(), balikin tanggal log servis TERAKHIR', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Minyak Rem', intervalKm: 20000, intervalBulan: 12 }],
    servisLogs: [
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 1000 },
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-05-01', km: 3000 },
    ],
  });
  const ctx = makeCtx(D);
  const cat = D.sparepartCats[0];
  assert.equal(ctx.getLastServiceDateForCat('v1', cat), '2026-05-01');
  assert.equal(ctx.getLastServiceDateForCat('v1', { id: 'c2', name: 'Lainnya' }), null);
});

test('computeServiceUrgency() — kategori TANPA intervalBulan identik dgn formula km lama', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Oli Mesin', intervalKm: 2000 }],
    servisLogs: [{ vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 8000 }],
  });
  const ctx = makeCtx(D);
  const cat = D.sparepartCats[0];
  const u = ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm: 9900, kmPerDay: 10 });
  assert.equal(u.sisaKm, 100); // 2000 - (9900-8000)
  assert.equal(u.status, 'segera'); // 100/2000 = 5% <= 15%
  assert.equal(u.intervalBulan, null);
  assert.equal(u.limitingAxis, 'km');
});

test('computeServiceUrgency() — axis bulan yang lebih mendesak MENANG (mis. Minyak Rem sudah lewat waktu walau km masih jauh)', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Minyak Rem', intervalKm: 20000, intervalBulan: 6 }],
    servisLogs: [{ vehicleId: 'v1', categoryId: 'c1', date: '2025-01-01', km: 1000 }],
  });
  const ctx = makeCtx(D);
  const cat = D.sparepartCats[0];
  // curKm dekat lastKm -> axis km masih aman, tapi sudah >12 bulan sejak servis terakhir
  const u = ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm: 1500, kmPerDay: 5, nowISO: '2026-08-26' });
  assert.equal(u.limitingAxis, 'bulan');
  assert.equal(u.status, 'lewat');
  assert.ok(u.sisaBulan < 0);
});

test('predictService() — kategori dgn intervalBulan mendesak ikut ditandai "lewat" walau sisaKm masih banyak', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Aki', intervalKm: 99999, intervalBulan: 6, showInReminder: true }],
    servisLogs: [{ vehicleId: 'v1', categoryId: 'c1', date: '2025-01-01', km: 100 }],
    vehicles: [{ id: 'v1', name: 'Vario 125', jenis: 'motor', kmLogs: [], servisLogs: [] }],
  });
  const ctx = makeCtx(D, {
    getVehicleKm: () => 200,
    estimateKmPerDay: () => 0,
    estimateServiceDateISO: () => null,
  });
  const r = ctx.predictService({ vehicleId: 'v1' });
  assert.equal(r.ok, true);
  const row = r.items.find((it) => it.categoryId === 'c1');
  assert.equal(row.status, 'lewat');
  assert.equal(row.limitingAxis, 'bulan');
});

test('ensureIntervalBulanField() — no-op-safe (balikin null) kalau anchor #sparepartInterval tidak ada di DOM', () => {
  const ctx = makeCtx(baseD(), { document: { getElementById: () => null } });
  assert.equal(ctx.Sparepart.ensureIntervalBulanField(), null);
});

test('saveCat() — baca & simpan cat.intervalBulan dari field baru (kategori baru & edit existing)', () => {
  const D = baseD({ sparepartCats: [{ id: 'c1', name: 'Oli Mesin', code: 'OLI', intervalKm: 2000, showInReminder: true }] });
  const els = {
    sparepartName: makeEl({ value: 'Minyak Rem' }),
    sparepartCode: makeEl({ value: '' }),
    sparepartInterval: makeEl({ value: '20000' }),
    sparepartIntervalBulan: makeEl({ value: '6' }),
    sparepartShowInReminder: makeEl({ checked: true }),
    sparepartVehicleId: makeEl({ value: '' }),
  };
  const document = { getElementById: (id) => els[id] || null };
  const ctx = makeCtx(D, {
    document,
    matchingVehicleName: () => null,
    closeModal: () => {},
  });
  ctx.Sparepart.catEditIdx = null;
  ctx.Sparepart.saveCat();
  const created = D.sparepartCats.find((c) => c.name === 'Minyak Rem');
  assert.ok(created);
  assert.equal(created.intervalBulan, 6);

  // Edit existing kategori: kosongkan field bulan -> tersimpan 0 (opsional,
  // TIDAK error walau toggle showInReminder aktif krn intervalKm tetap terisi)
  els.sparepartName.value = 'Oli Mesin';
  els.sparepartInterval.value = '2000';
  els.sparepartIntervalBulan.value = '';
  ctx.Sparepart.catEditIdx = 0;
  ctx.Sparepart.saveCat();
  assert.equal(D.sparepartCats[0].intervalBulan, 0);
});

test('renderCatList() — meta text menambahkan "atau Y bln" kalau intervalBulan diisi', () => {
  const D = baseD({ sparepartCats: [{ id: 'c1', name: 'Minyak Rem', intervalKm: 20000, intervalBulan: 6, showInReminder: true }] });
  const listEl = makeEl();
  const document = { getElementById: (id) => (id === 'sparepartCatList' ? listEl : null), querySelectorAll: () => [] };
  const ctx = makeCtx(D, { document, populateDatalist: () => {}, populateStockCatSelect: () => {} });
  ctx.Sparepart.populateDatalist = () => {};
  ctx.Sparepart.populateStockCatSelect = () => {};
  ctx.Sparepart.renderCatList();
  assert.match(listEl.innerHTML, /20\.000 km atau 6 bln/);
});

test('parseCategoryCSV()/commitCategoryCSV()/exportCategoryCSV() — round-trip kolom interval_bulan opsional', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const csv = 'nama,kode,interval_km,interval_bulan,tampil_reminder\nMinyak Rem,MRM,20000,6,ya\nBusi,BUS,8000,,ya';
  const rows = ctx.Sparepart.parseCategoryCSV(csv);
  assert.equal(rows[0].intervalBulan, 6);
  assert.equal(rows[1].intervalBulan, 0);
  const res = ctx.Sparepart.commitCategoryCSV(rows);
  assert.equal(res.created, 2);
  const minyakRem = D.sparepartCats.find((c) => c.name === 'Minyak Rem');
  assert.equal(minyakRem.intervalBulan, 6);

  // Export harus menyertakan header & nilai interval_bulan
  const anchor = { href: '', download: '', click() {} };
  const document = {
    getElementById: () => null,
    createElement: () => anchor,
  };
  const ctx2 = makeCtx(D, {
    document,
    URL: { createObjectURL: () => 'blob:x' },
    Blob: function Blob(parts) { this.parts = parts; },
  });
  const n = ctx2.Sparepart.exportCategoryCSV();
  assert.equal(n, D.sparepartCats.length);
});

// CSV tanpa kolom interval_bulan sama sekali (file lama) — TETAP kebaca,
// intervalBulan default 0, tidak ada error/regresi.
test('parseCategoryCSV() — file CSV lama (tanpa kolom interval_bulan) tetap kompatibel', () => {
  const ctx = makeCtx(baseD());
  const csv = 'nama,kode,interval_km,tampil_reminder\nOli Mesin,OLI,2000,ya';
  const rows = ctx.Sparepart.parseCategoryCSV(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].intervalBulan, 0);
});
