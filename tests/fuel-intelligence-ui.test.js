'use strict';
// tests/fuel-intelligence-ui.test.js — cakupan modules/vehicle/
// fuel-intelligence-ui.js (TASK-144, Fuel Bar Correction). Dependency
// (FuelGaugeEngine/FuelTankProfile/FuelStorage/FuelCard/FuelModal/toast/
// save/openModal/closeModal) di-mock lewat extraGlobals (pola sama persis
// tests/fuel-modal.test.js) supaya test fokus ke logic orkestrasi/wiring
// FuelBarCorrection sendiri, bukan ikut nge-test ulang modul lain.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeChild(barIndex) {
  const classes = new Set();
  return {
    dataset: { bar: String(barIndex) },
    classList: {
      toggle(name, force) {
        const has = classes.has(name);
        const shouldHave = force === undefined ? !has : !!force;
        if (shouldHave) classes.add(name); else classes.delete(name);
      },
      contains(name) { return classes.has(name); },
    },
  };
}

function makeBarPickerEl() {
  const el = { children: [], _html: '' };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(html) {
      el._html = html;
      const count = (html.match(/<button/g) || []).length;
      // Bar segmen dirender 0..(count-1) berurutan (lihat _renderBarPicker()
      // di fuel-intelligence-ui.js) — index array = nilai bar-nya sendiri,
      // sama seperti data-bar="${bar}" yang ditulis _segmentHtml() di DOM asli.
      el.children = Array.from({ length: count }, (_, i) => makeChild(i));
      // tandai tombol yang sudah "active" dari HTML awal (dipakai test
      // render currentBar) — regex sederhana, cukup utk kebutuhan test ini.
      const activeIdx = html.indexOf(' active"');
      if (activeIdx !== -1) {
        const before = html.slice(0, activeIdx);
        const btnCountBefore = (before.match(/<button/g) || []).length - 1;
        if (el.children[btnCountBefore]) el.children[btnCountBefore].classList.toggle('active', true);
      }
    },
  });
  return el;
}

function makeFakeDoc(extra = {}) {
  const els = {
    fbcVehName: { textContent: '' },
    fbcCurrentBarLabel: { textContent: '' },
    fbcCurrentLiterLabel: { textContent: '' },
    fbcCurrentPercentLabel: { textContent: '' },
    fbcBarPicker: makeBarPickerEl(),
    fbcPreviewBox: { style: { display: 'none' } },
    fbcBeforeLiter: { textContent: '' },
    fbcAfterLiter: { textContent: '' },
    fbcDiffLiter: { textContent: '' },
    fbcSaveBtn: { disabled: true },
    ...extra,
  };
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

const VEH = { id: 'v1', name: 'Vario 125', emoji: '🏍️' };
const PROFILE = { tankCapacityLiter: 10, fuelBarCount: 8, reserveLiter: 1 };

function fakeGaugeEngine() {
  // Linear model 1L == fuelBarCount/tankCapacityLiter bar, cukup utk test
  // wiring (bukan test ulang FuelGaugeEngine sendiri, sudah ada file
  // test-nya sendiri).
  return {
    calculateFuelLiter: (vid, bar) => ({ ok: true, vehicleId: vid, liter: Math.round((bar / PROFILE.fuelBarCount) * PROFILE.tankCapacityLiter * 100) / 100, clamped: false }),
    calculateFuelBar: (vid, liter) => ({ ok: true, vehicleId: vid, bar: (liter / PROFILE.tankCapacityLiter) * PROFILE.fuelBarCount, clamped: false }),
    calculateFuelPercent: (vid, liter) => ({ ok: true, vehicleId: vid, percent: Math.round((liter / PROFILE.tankCapacityLiter) * 100), clamped: false }),
  };
}

function makeCtx(overrides = {}) {
  return loadSource(['modules/vehicle/fuel-intelligence-ui.js'], overrides, ['FuelBarCorrection']);
}

// --- open() -------------------------------------------------------------

test('open() — kendaraan tidak ditemukan -> toast, tidak buka modal', () => {
  const toasts = [];
  let openCalled = false;
  const ctx = makeCtx({
    D: { vehicles: [] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    toast: (msg) => toasts.push(msg),
    openModal: () => { openCalled = true; },
  });
  ctx.FuelBarCorrection.open('v1');
  assert.equal(openCalled, false);
  assert.match(toasts[0], /tidak ditemukan/);
});

test('open() — profil tangki belum diatur (tankCapacityLiter kosong) -> toast, tidak buka modal', () => {
  const toasts = [];
  let openCalled = false;
  const ctx = makeCtx({
    D: { vehicles: [VEH] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => ({ tankCapacityLiter: null, fuelBarCount: 8 }) },
    toast: (msg) => toasts.push(msg),
    openModal: () => { openCalled = true; },
  });
  ctx.FuelBarCorrection.open('v1');
  assert.equal(openCalled, false);
  assert.match(toasts[0], /profil tangki/);
});

test('open() — belum ada dasar estimasi (belum ada fuelState/log full tank) -> label "-", bar picker 9 tombol (0..8), modal terbuka', () => {
  const { doc, els } = makeFakeDoc();
  const opened = [];
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [VEH], bbmLogs: [] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    openModal: (id) => opened.push(id),
  });
  ctx.FuelBarCorrection.open('v1');
  assert.equal(els.fbcVehName.textContent, '🏍️ Vario 125');
  assert.equal(els.fbcCurrentBarLabel.textContent, '- / 8 Bar');
  assert.equal(els.fbcCurrentLiterLabel.textContent, '- Liter');
  assert.equal(els.fbcCurrentPercentLabel.textContent, '-%');
  assert.equal(els.fbcBarPicker.children.length, 9); // 0..8 inklusif
  assert.equal(els.fbcPreviewBox.style.display, 'none');
  assert.equal(els.fbcSaveBtn.disabled, true);
  assert.deepEqual(opened, ['fuelBarCorrectionModal']);
});

test('open() — sudah ada fuelState tersimpan -> label current estimate terisi dari situ', () => {
  const { doc, els } = makeFakeDoc();
  const veh = { ...VEH, fuelState: { currentFuelLiter: 5 } };
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  assert.equal(els.fbcCurrentLiterLabel.textContent, '5 Liter');
  assert.equal(els.fbcCurrentBarLabel.textContent, '4 / 8 Bar');
  assert.equal(els.fbcCurrentPercentLabel.textContent, '50%');
});

test('open() — log BBM terbaru full tank & belum ada fuelState -> current estimate = kapasitas penuh', () => {
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [VEH] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => ({ fullTank: true }) },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  assert.equal(els.fbcCurrentLiterLabel.textContent, '10 Liter');
  assert.equal(els.fbcCurrentPercentLabel.textContent, '100%');
});

// --- selectBar() (live preview) ------------------------------------------

test('selectBar() — live preview Sebelum/Sesudah/Selisih terisi via FuelGaugeEngine, tombol Simpan aktif', () => {
  const { doc, els } = makeFakeDoc();
  const veh = { ...VEH, fuelState: { currentFuelLiter: 5 } };
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(8); // penuh -> 10L
  assert.equal(els.fbcBeforeLiter.textContent, '5 L');
  assert.equal(els.fbcAfterLiter.textContent, '10 L');
  assert.equal(els.fbcDiffLiter.textContent, '+5 L');
  assert.equal(els.fbcPreviewBox.style.display, '');
  assert.equal(els.fbcSaveBtn.disabled, false);
});

test('selectBar() — belum ada estimasi sebelumnya -> "Belum ada data", selisih "-"', () => {
  const { doc, els } = makeFakeDoc();
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [VEH] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(4);
  assert.equal(els.fbcBeforeLiter.textContent, 'Belum ada data');
  assert.equal(els.fbcDiffLiter.textContent, '-');
});

// --- save() ---------------------------------------------------------------

test('save() — tanpa bar terpilih -> no-op (tidak menulis apa pun, tidak toast)', () => {
  const toasts = [];
  const veh = { ...VEH };
  const ctx = makeCtx({
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    toast: (msg) => toasts.push(msg),
  });
  ctx.FuelBarCorrection.save();
  assert.equal(veh.fuelState, undefined);
  assert.equal(toasts.length, 0);
});

test('save() — menulis currentFuelBar/currentFuelLiter/correctedAt/estimatedSource/confidenceScore, panggil save(), closeModal, refresh FuelCard', () => {
  const { doc } = makeFakeDoc();
  const veh = { ...VEH };
  const calls = [];
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    save: () => calls.push('save'),
    closeModal: (id) => calls.push(['closeModal', id]),
    toast: (msg) => calls.push(['toast', msg]),
    FuelCard: { render: () => calls.push('FuelCard.render') },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(6);
  ctx.FuelBarCorrection.save();

  assert.equal(veh.fuelState.currentFuelBar, 6);
  assert.equal(veh.fuelState.currentFuelLiter, 7.5);
  assert.equal(veh.fuelState.estimatedSource, 'manual-bar-correction');
  assert.equal(veh.fuelState.confidenceScore, 100);
  assert.equal(typeof veh.fuelState.correctedAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(veh.fuelState.correctedAt)));

  assert.ok(calls.includes('save'));
  assert.ok(calls.some((c) => Array.isArray(c) && c[0] === 'closeModal' && c[1] === 'fuelBarCorrectionModal'));
  assert.ok(calls.includes('FuelCard.render'));

  // state controller direset setelah save
  assert.equal(ctx.FuelBarCorrection.curVehicleId, null);
  assert.equal(ctx.FuelBarCorrection.selectedBar, null);
});

test('save() — riwayat D.bbmLogs TIDAK diubah (koreksi hanya estimasi saat ini)', () => {
  const { doc } = makeFakeDoc();
  const veh = { ...VEH };
  const bbmLogs = [{ id: 'log1', vehicleId: 'v1', liter: 3, fullTank: false }];
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh], bbmLogs },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    save: () => {},
    closeModal: () => {},
    toast: () => {},
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(2);
  ctx.FuelBarCorrection.save();
  assert.deepEqual(ctx.D.bbmLogs, [{ id: 'log1', vehicleId: 'v1', liter: 3, fullTank: false }]);
});

test('save() — Fuel Modal sedang terbuka utk kendaraan yang sama -> di-refresh (FuelModal.open dipanggil ulang)', () => {
  const { doc } = makeFakeDoc();
  const veh = { ...VEH };
  const calls = [];
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    save: () => {},
    closeModal: () => {},
    toast: () => {},
    FuelCard: { render: () => {} },
    FuelModal: { curVehicleId: 'v1', open: (vid) => calls.push(['FuelModal.open', vid]) },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(3);
  ctx.FuelBarCorrection.save();
  assert.deepEqual(calls, [['FuelModal.open', 'v1']]);
});

// --- TASK-145 (Fuel Intelligence Integration) -----------------------------

test('save() — toast sukses pakai teks spesifikasi TASK-145 ("Kalibrasi bensin berhasil diperbarui")', () => {
  const { doc } = makeFakeDoc();
  const veh = { ...VEH };
  const toasts = [];
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    save: () => {},
    closeModal: () => {},
    toast: (msg) => toasts.push(msg),
    FuelCard: { render: () => {} },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(5);
  ctx.FuelBarCorrection.save();
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0], '✅ Kalibrasi bensin berhasil diperbarui');
});

test('save() — end-to-end: refresh FuelCard DAN FuelModal (kendaraan sama) sekaligus setelah save', () => {
  const { doc } = makeFakeDoc();
  const veh = { ...VEH };
  const calls = [];
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    save: () => calls.push('save'),
    closeModal: (id) => calls.push(['closeModal', id]),
    toast: (msg) => calls.push(['toast', msg]),
    FuelCard: { render: () => calls.push('FuelCard.render') },
    FuelModal: { curVehicleId: 'v1', open: (vid) => calls.push(['FuelModal.open', vid]) },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(7);
  ctx.FuelBarCorrection.save();
  assert.ok(calls.includes('FuelCard.render'));
  assert.ok(calls.some((c) => Array.isArray(c) && c[0] === 'FuelModal.open' && c[1] === 'v1'));
  assert.ok(calls.some((c) => Array.isArray(c) && c[0] === 'toast' && c[1] === '✅ Kalibrasi bensin berhasil diperbarui'));
});

test('save() — Fuel Modal terbuka utk kendaraan LAIN -> tidak ikut di-refresh', () => {
  const { doc } = makeFakeDoc();
  const veh = { ...VEH };
  const calls = [];
  const ctx = makeCtx({
    document: doc,
    D: { vehicles: [veh] },
    FuelGaugeEngine: fakeGaugeEngine(),
    FuelTankProfile: { get: () => PROFILE },
    FuelStorage: { latest: () => null },
    save: () => {},
    closeModal: () => {},
    toast: () => {},
    FuelCard: { render: () => {} },
    FuelModal: { curVehicleId: 'v-lain', open: (vid) => calls.push(['FuelModal.open', vid]) },
    openModal: () => {},
  });
  ctx.FuelBarCorrection.open('v1');
  ctx.FuelBarCorrection.selectBar(3);
  ctx.FuelBarCorrection.save();
  assert.deepEqual(calls, []);
});
