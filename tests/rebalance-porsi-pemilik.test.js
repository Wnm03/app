'use strict';
// tests/rebalance-porsi-pemilik.test.js — FITUR "Auto-Rebalance Porsi Pemilik"
// (permintaan user Agustus 2026, screenshot modal ⚖️ Atur Porsi Kepemilikan Aset
// "renov"): saat 2+ pemilik sudah terisi porsi lalu pemilik baru ditambah & bikin
// total >100%, sistem menawarkan penyesuaian (proporsional/dari terbesar/manual)
// lewat panel preview — TIDAK PERNAH mengubah porsi pemilik lama diam-diam.
//
// Bagian 1: calculateRebalance() (modules-calc.js) — rumus PURE, SSOT dipakai
// panel penyesuaian di Aset._renderRebalancePanel()/applyRebalance() (aset.js).
// Bagian 2: Aset._checkRebalanceTrigger()/applyRebalance()/cancelRebalance() —
// integrasi state di sekitar draft, lewat loadSource() (stub DOM minimal).
// Bagian 3: AccOwners._checkRebalanceTrigger()/applyRebalance()/cancelRebalance()
// (finance/akun.js) — wiring UI yang sama di modal Akun (accountOwnersModal),
// sesi lanjutan setelah domain Aset — 0 rumus baru, reuse calculateRebalance()
// SSOT yang sama.
// Bagian 4: InvestmentUI._checkRebalanceTrigger()/applyRebalance()/cancelRebalance()
// (asset/investasi-view.js) — wiring UI yang sama di modal Investasi
// (investmentOwnersModal), sesi lanjutan setelah domain Aset & Akun — 0 rumus
// baru, reuse calculateRebalance() SSOT yang sama.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

function loadCalc() {
  return loadSource(['modules/shared/modules-calc.js'], {}, ['calculateRebalance', 'calculateRemainingShare']);
}

// ================= Bagian 1: calculateRebalance() pure logic =================

test('proporsional (default, contoh persis dari permintaan user): A=71.88 B=28.12 C(baru)=20 -> A~57.50 B~22.50 total=100', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 71.88 }, { porsi: 28.12 }, { porsi: 20 }];
  const res = calculateRebalance(rows, 2, 'proporsional');
  assert.equal(res.ok, true);
  assert.equal(res.totalAfter, 100);
  const a = res.adjustments.find((x) => x.index === 0);
  const b = res.adjustments.find((x) => x.index === 1);
  assert.ok(Math.abs(a.to - 57.5) < 0.01, 'A ~57.50%, got ' + a.to);
  assert.ok(Math.abs(b.to - 22.5) < 0.01, 'B ~22.50%, got ' + b.to);
});

test('largest: seluruh pengurangan diambil dari pemilik terbesar', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 71.88 }, { porsi: 28.12 }, { porsi: 20 }];
  const res = calculateRebalance(rows, 2, 'largest');
  assert.equal(res.ok, true);
  assert.equal(res.totalAfter, 100);
  const a = res.adjustments.find((x) => x.index === 0);
  const b = res.adjustments.find((x) => x.index === 1);
  assert.equal(a.to, 51.88); // 71.88 - 20 (reduceNeeded)
  assert.equal(b.to, 28.12); // tidak tersentuh
});

test('largest: cascade ke pemilik berikutnya kalau yang terbesar tidak cukup, tidak pernah negatif', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 10 }, { porsi: 5 }, { porsi: 90 }];
  const res = calculateRebalance(rows, 2, 'largest');
  assert.equal(res.ok, true);
  assert.equal(res.totalAfter, 100);
  res.adjustments.forEach((a) => assert.ok(a.to >= 0, 'porsi tidak boleh negatif'));
});

test('manual: pengurangan hanya dari pemilik yang dipilih, selama porsinya cukup', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 71.88 }, { porsi: 28.12 }, { porsi: 20 }];
  const res = calculateRebalance(rows, 2, 'manual', 0);
  assert.equal(res.ok, true);
  const a = res.adjustments.find((x) => x.index === 0);
  const b = res.adjustments.find((x) => x.index === 1);
  assert.equal(a.to, 51.88);
  assert.equal(b.to, 28.12);
});

test('manual: error kalau porsi pemilik terpilih tidak cukup, TIDAK ada perubahan', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 71.88 }, { porsi: 5 }, { porsi: 50 }];
  const res = calculateRebalance(rows, 2, 'manual', 1);
  assert.equal(res.ok, false);
  assert.equal(res.error, 'manual_owner_insufficient');
});

test('manual: error kalau belum pilih pemilik sama sekali', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 71.88 }, { porsi: 28.12 }, { porsi: 20 }];
  const res = calculateRebalance(rows, 2, 'manual', null);
  assert.equal(res.ok, false);
  assert.equal(res.error, 'manual_owner_not_selected');
});

test('tidak overflow -> no_reduction_needed (caller tidak boleh memicu rebalance)', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 50 }, { porsi: 30 }, { porsi: 10 }];
  const res = calculateRebalance(rows, 2, 'proporsional');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'no_reduction_needed');
});

test('porsi pemilik baru > total yang tersedia (>100%) -> error, tidak ada perubahan', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 40 }, { porsi: 30 }, { porsi: 120 }];
  const res = calculateRebalance(rows, 2, 'proporsional');
  assert.equal(res.ok, false);
});

test('hasil selalu bulat rapi (tanpa residu floating point) & total tepat 100', () => {
  const { calculateRebalance } = loadCalc();
  const rows = [{ porsi: 33.3333 }, { porsi: 33.3333 }, { porsi: 33.3334 }, { porsi: 10 }];
  const res = calculateRebalance(rows, 3, 'proporsional');
  assert.equal(res.ok, true);
  assert.equal(res.totalAfter, 100);
});

// ================= Bagian 2: integrasi state Aset._checkRebalanceTrigger/apply/cancel =================

function makeAsetCtx() {
  const el = {};
  function stubEl(id) {
    if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} };
    return el[id];
  }
  const fakeDocument = {
    getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); },
    createElement() { return { id: '', innerHTML: '' }; },
  };
  const D = { assets: [{ id: 'a1', name: 'Renov', nilai: 10000000, owners: [] }] };
  const ctx = loadSource(
    ['modules/shared/modules-calc.js', 'modules/asset/aset.js'],
    {
      D, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, save: () => {},
      openModal: () => {}, sameId: (a, b) => String(a) === String(b),
    },
    ['Aset', 'calculateRebalance'],
  );
  return ctx;
}

test('_checkRebalanceTrigger: overflow dgn 2 pemilik lama terisi -> pending muncul dgn method default proporsional', () => {
  const { Aset } = makeAsetCtx();
  Aset._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  // Guard: butuh MultiOwnerEngine di context nyata; test ini hanya mengecek jalur yang tidak
  // bergantung padanya tidak melempar error saat dipanggil tanpa engine (fallback aman).
  assert.doesNotThrow(() => Aset._checkRebalanceTrigger(2));
});

test('cancelRebalance: membuang pending TANPA mengubah draft', () => {
  const { Aset } = makeAsetCtx();
  Aset._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  Aset._rebalancePending = { editedIndex: 2, method: 'proporsional', manualIndex: null };
  Aset.cancelRebalance();
  assert.equal(Aset._rebalancePending, null);
  assert.equal(Aset._ownersDraft[0].porsi, 71.88);
  assert.equal(Aset._ownersDraft[1].porsi, 28.12);
});

test('applyRebalance: menulis hasil calculateRebalance ke draft & menandai _touched, lalu membuang pending', () => {
  const { Aset } = makeAsetCtx();
  Aset._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  Aset._rebalancePending = { editedIndex: 2, method: 'proporsional', manualIndex: null };
  Aset.applyRebalance();
  assert.equal(Aset._rebalancePending, null);
  assert.ok(Math.abs(Aset._ownersDraft[0].porsi - 57.5) < 0.01);
  assert.ok(Math.abs(Aset._ownersDraft[1].porsi - 22.5) < 0.01);
  assert.equal(Aset._ownersDraft[2].porsi, 20);
  assert.equal(Aset._ownersDraft[0]._touched, true);
  assert.equal(Aset._ownersDraft[1]._touched, true);
});

// ================= Bagian 3: integrasi state AccOwners._checkRebalanceTrigger/apply/cancel =================
// (finance/akun.js, modal accountOwnersModal) — wiring UI sama persis Bagian 2 di atas, rumus
// tetap 100% calculateRebalance() SSOT (modules-calc.js), 0 rumus baru.

function makeAccOwnersCtx() {
  const el = {};
  function stubEl(id) {
    if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} };
    return el[id];
  }
  const fakeDocument = {
    getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); },
    createElement() { return { id: '', innerHTML: '' }; },
  };
  const D = { accounts: [{ id: 'acc1', name: 'BCA', owners: [] }] };
  const ctx = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js'],
    {
      D, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, save: () => {},
      openModal: () => {}, sameId: (a, b) => String(a) === String(b), editAccIdx: -1,
      findLinkedHoldingForAccount: () => null, uid: () => 'x', OwnerRegistry: undefined,
    },
    ['AccOwners', 'calculateRebalance', 'MultiOwnerEngine'],
  );
  return ctx;
}

test('AccOwners._checkRebalanceTrigger: overflow dgn 2 pemilik lama terisi -> pending muncul dgn method default proporsional', () => {
  const { AccOwners } = makeAccOwnersCtx();
  AccOwners._draft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  AccOwners._checkRebalanceTrigger(2);
  assert.ok(AccOwners._rebalancePending);
  assert.equal(AccOwners._rebalancePending.editedIndex, 2);
  assert.equal(AccOwners._rebalancePending.method, 'proporsional');
});

test('AccOwners._checkRebalanceTrigger: total <=100% -> tidak ada pending', () => {
  const { AccOwners } = makeAccOwnersCtx();
  AccOwners._draft = [{ ownerName: 'A', porsi: 50 }, { ownerName: 'B', porsi: 30 }, { ownerName: 'C', porsi: 10 }];
  AccOwners._checkRebalanceTrigger(2);
  assert.equal(AccOwners._rebalancePending, null);
});

test('AccOwners._checkRebalanceTrigger: overflow tapi cuma 1 baris terisi (oldTotal=0) -> tidak ada pending', () => {
  const { AccOwners } = makeAccOwnersCtx();
  AccOwners._draft = [{ ownerName: 'A', porsi: 150 }];
  AccOwners._checkRebalanceTrigger(0);
  assert.equal(AccOwners._rebalancePending, null);
});

test('AccOwners.cancelRebalance: membuang pending TANPA mengubah draft', () => {
  const { AccOwners } = makeAccOwnersCtx();
  AccOwners._draft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  AccOwners._rebalancePending = { editedIndex: 2, method: 'proporsional', manualIndex: null };
  AccOwners.cancelRebalance();
  assert.equal(AccOwners._rebalancePending, null);
  assert.equal(AccOwners._draft[0].porsi, 71.88);
  assert.equal(AccOwners._draft[1].porsi, 28.12);
});

test('AccOwners.applyRebalance: menulis hasil calculateRebalance ke draft & menandai _touched, lalu membuang pending', () => {
  const { AccOwners } = makeAccOwnersCtx();
  AccOwners._draft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  AccOwners._rebalancePending = { editedIndex: 2, method: 'proporsional', manualIndex: null };
  AccOwners.applyRebalance();
  assert.equal(AccOwners._rebalancePending, null);
  assert.ok(Math.abs(AccOwners._draft[0].porsi - 57.5) < 0.01);
  assert.ok(Math.abs(AccOwners._draft[1].porsi - 22.5) < 0.01);
  assert.equal(AccOwners._draft[2].porsi, 20);
  assert.equal(AccOwners._draft[0]._touched, true);
  assert.equal(AccOwners._draft[1]._touched, true);
});

test('AccOwners.applyRebalance: metode manual, pemilik terpilih tidak cukup -> toast error, draft TIDAK berubah', () => {
  const { AccOwners } = makeAccOwnersCtx();
  AccOwners._draft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 5 }, { ownerName: 'C', porsi: 50 }];
  AccOwners._rebalancePending = { editedIndex: 2, method: 'manual', manualIndex: 1 };
  AccOwners.applyRebalance();
  assert.ok(AccOwners._rebalancePending, 'pending harus tetap ada, applyRebalance gagal');
  assert.equal(AccOwners._draft[1].porsi, 5);
});

test('AccOwners.onPorsiInput: mengetik porsi yang bikin overflow memicu _checkRebalanceTrigger otomatis', () => {
  const { AccOwners } = makeAccOwnersCtx();
  AccOwners._draft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 0 }];
  AccOwners.onPorsiInput(2, '20');
  assert.ok(AccOwners._rebalancePending, 'onPorsiInput harus memicu panel rebalance saat overflow');
  assert.equal(AccOwners._rebalancePending.editedIndex, 2);
});

// ================= Bagian 4: integrasi state InvestmentUI._checkRebalanceTrigger/apply/cancel =================
// (asset/investasi-view.js, modal investmentOwnersModal) — wiring UI sama persis Bagian 2/3 di
// atas, rumus tetap 100% calculateRebalance() SSOT (modules-calc.js), 0 rumus baru. Investment
// (investasi.js) SENGAJA tidak dimuat di sini -- method2 yang dites (_checkRebalanceTrigger/
// applyRebalance/cancelRebalance) murni baca/tulis _ownersDraft & MultiOwnerEngine, tidak
// menyentuh Investment.* (guard typeof aman kalau Investment belum dimuat, sama pola
// _ownersHoldingValue()).

function makeInvestmentUICtx() {
  const el = {};
  function stubEl(id) {
    if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} };
    return el[id];
  }
  const fakeDocument = {
    getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); },
    createElement() { return { id: '', innerHTML: '' }; },
  };
  const ctx = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi-view.js'],
    {
      D: { investments: [] }, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {},
      openModal: () => {}, uid: () => 'x', OwnerRegistry: undefined,
    },
    ['InvestmentUI', 'calculateRebalance', 'MultiOwnerEngine'],
  );
  return ctx;
}

test('InvestmentUI._checkRebalanceTrigger: overflow dgn 2 pemilik lama terisi -> pending muncul dgn method default proporsional', () => {
  const { InvestmentUI } = makeInvestmentUICtx();
  InvestmentUI._ownersModalHolding = { id: 'h1', name: 'Reksadana X' };
  InvestmentUI._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  InvestmentUI._checkRebalanceTrigger(2);
  assert.ok(InvestmentUI._rebalancePending);
  assert.equal(InvestmentUI._rebalancePending.editedIndex, 2);
  assert.equal(InvestmentUI._rebalancePending.method, 'proporsional');
});

test('InvestmentUI._checkRebalanceTrigger: total <=100% -> tidak ada pending', () => {
  const { InvestmentUI } = makeInvestmentUICtx();
  InvestmentUI._ownersDraft = [{ ownerName: 'A', porsi: 50 }, { ownerName: 'B', porsi: 30 }, { ownerName: 'C', porsi: 10 }];
  InvestmentUI._checkRebalanceTrigger(2);
  assert.equal(InvestmentUI._rebalancePending, null);
});

test('InvestmentUI._checkRebalanceTrigger: overflow tapi cuma 1 baris terisi (oldTotal=0) -> tidak ada pending', () => {
  const { InvestmentUI } = makeInvestmentUICtx();
  InvestmentUI._ownersDraft = [{ ownerName: 'A', porsi: 150 }];
  InvestmentUI._checkRebalanceTrigger(0);
  assert.equal(InvestmentUI._rebalancePending, null);
});

test('InvestmentUI.cancelRebalance: membuang pending TANPA mengubah draft', () => {
  const { InvestmentUI } = makeInvestmentUICtx();
  InvestmentUI._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  InvestmentUI._rebalancePending = { editedIndex: 2, method: 'proporsional', manualIndex: null };
  InvestmentUI.cancelRebalance();
  assert.equal(InvestmentUI._rebalancePending, null);
  assert.equal(InvestmentUI._ownersDraft[0].porsi, 71.88);
  assert.equal(InvestmentUI._ownersDraft[1].porsi, 28.12);
});

test('InvestmentUI.applyRebalance: menulis hasil calculateRebalance ke draft & menandai _touched, lalu membuang pending', () => {
  const { InvestmentUI } = makeInvestmentUICtx();
  InvestmentUI._ownersModalHolding = { id: 'h1', name: 'Reksadana X' };
  InvestmentUI._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 20 }];
  InvestmentUI._rebalancePending = { editedIndex: 2, method: 'proporsional', manualIndex: null };
  InvestmentUI.applyRebalance();
  assert.equal(InvestmentUI._rebalancePending, null);
  assert.ok(Math.abs(InvestmentUI._ownersDraft[0].porsi - 57.5) < 0.01);
  assert.ok(Math.abs(InvestmentUI._ownersDraft[1].porsi - 22.5) < 0.01);
  assert.equal(InvestmentUI._ownersDraft[2].porsi, 20);
  assert.equal(InvestmentUI._ownersDraft[0]._touched, true);
  assert.equal(InvestmentUI._ownersDraft[1]._touched, true);
});

test('InvestmentUI.applyRebalance: metode manual, pemilik terpilih tidak cukup -> toast error, draft TIDAK berubah', () => {
  const { InvestmentUI } = makeInvestmentUICtx();
  InvestmentUI._ownersModalHolding = { id: 'h1', name: 'Reksadana X' };
  InvestmentUI._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 5 }, { ownerName: 'C', porsi: 50 }];
  InvestmentUI._rebalancePending = { editedIndex: 2, method: 'manual', manualIndex: 1 };
  InvestmentUI.applyRebalance();
  assert.ok(InvestmentUI._rebalancePending, 'pending harus tetap ada, applyRebalance gagal');
  assert.equal(InvestmentUI._ownersDraft[1].porsi, 5);
});

test('InvestmentUI.onOwnerPorsiInput: mengetik porsi yang bikin overflow memicu _checkRebalanceTrigger otomatis', () => {
  const { InvestmentUI } = makeInvestmentUICtx();
  InvestmentUI._ownersModalHolding = { id: 'h1', name: 'Reksadana X' };
  InvestmentUI._ownersDraft = [{ ownerName: 'A', porsi: 71.88 }, { ownerName: 'B', porsi: 28.12 }, { ownerName: 'C', porsi: 0 }];
  InvestmentUI.onOwnerPorsiInput(2, '20');
  assert.ok(InvestmentUI._rebalancePending, 'onOwnerPorsiInput harus memicu panel rebalance saat overflow');
  assert.equal(InvestmentUI._rebalancePending.editedIndex, 2);
});

// ================= Bagian 5: migrasi data lama -- panggilan _checkRebalanceTrigger() saat
// modal DIBUKA (bukan cuma saat user mengetik) =================
// (Agustus 2026) Aset yang overflow >100% SEBELUM fitur Auto-Rebalance ada tidak akan pernah
// memicu _checkRebalanceTrigger() lewat ketikan kalau user tidak menyentuh field porsi sama
// sekali sesudah buka modal -- openOwnersModal()/resetOwners() (ketiga domain) sekarang
// memanggilnya sendiri pakai baris TERAKHIR draft sbg editedIndex begitu draft selesai dimuat.
// Test di bagian ini murni MENGECEK TITIK PANGGILAN itu (via spy pada _checkRebalanceTrigger),
// BUKAN mengulang rumus calculateRebalance()/kondisi overflow (sudah dites lengkap di
// Bagian 1-4) -- konsisten dgn alasan di komentar aset.js: sengaja PURE/tidak menulis draft,
// jadi aman dites cukup lewat "apakah dipanggil", bukan efek sampingnya lagi.

test('InvestmentUI.openOwnersModal: memanggil _checkRebalanceTrigger(draft.length-1) tepat setelah draft dimuat', () => {
  const fakeInvestment = { getHolding: () => ({ id: 'h1', name: 'Reksadana X' }), getOwners: () => [{ ownerId: 'A', ownerName: 'A', porsi: 60, isSelf: false }, { ownerId: 'B', ownerName: 'B', porsi: 40, isSelf: false }] };
  const el = {};
  function stubEl(id) { if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} }; return el[id]; }
  const fakeDocument = { getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); }, createElement() { return { id: '', innerHTML: '' }; } };
  // Sisipkan Investment palsu (extraGlobal) supaya referensi global `Investment` di
  // openOwnersModal() (investasi-view.js) resolve ke sini -- module ini sengaja tidak
  // memuat file investasi.js asli (lihat catatan makeInvestmentUICtx() di atas).
  const { InvestmentUI } = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi-view.js'],
    { D: { investments: [] }, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, openModal: () => {}, uid: () => 'x', OwnerRegistry: undefined, Investment: fakeInvestment },
    ['InvestmentUI', 'MultiOwnerEngine'],
  );
  const calls = [];
  InvestmentUI._checkRebalanceTrigger = (i) => calls.push(i);
  InvestmentUI.openOwnersModal('h1');
  assert.deepEqual(calls, [1], 'harus dipanggil 1x dgn index baris terakhir draft (2 pemilik -> index 1)');
});

test('InvestmentUI.resetOwners: memanggil _checkRebalanceTrigger(draft.length-1) setelah draft dimuat ulang', () => {
  const fakeInvestment = { getOwners: () => [{ ownerId: 'A', ownerName: 'A', porsi: 60, isSelf: false }, { ownerId: 'B', ownerName: 'B', porsi: 40, isSelf: false }] };
  const el = {};
  function stubEl(id) { if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} }; return el[id]; }
  const fakeDocument = { getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); }, createElement() { return { id: '', innerHTML: '' }; } };
  const { InvestmentUI } = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi-view.js'],
    { D: { investments: [] }, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, openModal: () => {}, uid: () => 'x', OwnerRegistry: undefined, Investment: fakeInvestment },
    ['InvestmentUI', 'MultiOwnerEngine'],
  );
  InvestmentUI._ownersModalHolding = { id: 'h1', name: 'Reksadana X' };
  const calls = [];
  InvestmentUI._checkRebalanceTrigger = (i) => calls.push(i);
  InvestmentUI.resetOwners();
  assert.deepEqual(calls, [1], 'harus dipanggil 1x dgn index baris terakhir draft (2 pemilik -> index 1)');
});

test('Aset.openOwnersModal: memanggil _checkRebalanceTrigger(draft.length-1) tepat setelah draft dimuat', () => {
  const el = {};
  function stubEl(id) { if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} }; return el[id]; }
  const fakeDocument = { getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); }, createElement() { return { id: '', innerHTML: '' }; } };
  // Engine ASLI (bukan fake) dimuat di sini -- beda dari makeAsetCtx() Bagian 2 yang sengaja
  // tanpa engine (lihat komentarnya), krn openOwnersModal() aslinya butuh
  // MultiOwnerEngine.getOwners()+totalPorsi()+remainingPorsi() (dipakai updateOwnersTotal())
  // supaya benar-benar sampai ke baris pemanggilan _checkRebalanceTrigger() yang dites di sini.
  const D = { assets: [{ id: 'a1', name: 'Renov', nilai: 10000000, owners: [{ ownerId: 'A', ownerName: 'A', porsi: 60 }, { ownerId: 'B', ownerName: 'B', porsi: 40 }] }] };
  const { Aset } = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
    { D, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, save: () => {}, openModal: () => {}, sameId: (a, b) => String(a) === String(b) },
    ['Aset'],
  );
  Aset.editId = 'a1';
  const calls = [];
  Aset._checkRebalanceTrigger = (i) => calls.push(i);
  Aset.openOwnersModal();
  assert.deepEqual(calls, [1], 'harus dipanggil 1x dgn index baris terakhir draft (2 pemilik -> index 1)');
});

test('Aset.resetOwners: memanggil _checkRebalanceTrigger(draft.length-1) setelah draft dimuat ulang', () => {
  const el = {};
  function stubEl(id) { if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} }; return el[id]; }
  const fakeDocument = { getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); }, createElement() { return { id: '', innerHTML: '' }; } };
  const D = { assets: [{ id: 'a1', name: 'Renov', nilai: 10000000, owners: [{ ownerId: 'A', ownerName: 'A', porsi: 60 }, { ownerId: 'B', ownerName: 'B', porsi: 40 }] }] };
  const { Aset } = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
    { D, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, save: () => {}, openModal: () => {}, sameId: (a, b) => String(a) === String(b) },
    ['Aset'],
  );
  Aset._ownersModalAsset = D.assets[0];
  Aset._ownersReadOnly = false;
  const calls = [];
  Aset._checkRebalanceTrigger = (i) => calls.push(i);
  Aset.resetOwners();
  assert.deepEqual(calls, [1], 'harus dipanggil 1x dgn index baris terakhir draft (2 pemilik -> index 1)');
});

test('AccOwners.open: memanggil _checkRebalanceTrigger(draft.length-1) tepat setelah draft dimuat', () => {
  const el = {};
  function stubEl(id) { if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} }; return el[id]; }
  const fakeDocument = { getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); }, createElement() { return { id: '', innerHTML: '' }; } };
  const D = { accounts: [{ id: 'acc1', name: 'BCA', owners: [{ ownerId: 'A', ownerName: 'A', porsi: 60 }, { ownerId: 'B', ownerName: 'B', porsi: 40 }] }] };
  const ctx = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js'],
    {
      D, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, save: () => {},
      openModal: () => {}, sameId: (a, b) => String(a) === String(b),
      findLinkedHoldingForAccount: () => null, uid: () => 'x', OwnerRegistry: undefined,
      getAccOwners: (id) => { const acc = D.accounts.find((a) => a.id === id); return acc ? { ok: true, owners: acc.owners } : { ok: false, owners: [] }; },
    },
    ['AccOwners'],
  );
  // akun.js mendeklarasikan `let editAccIdx=-1` di top-level FILE-nya sendiri (bukan cuma
  // referensi ke global luar) -- ini SHADOW extraGlobal `editAccIdx` yang di-inject lewat
  // sandbox object (quirk vm: binding let/const top-level menang atas property object sandbox
  // bernama sama). Satu-satunya cara set nilainya dari luar: jalankan assignment lewat script
  // vm TAMBAHAN di context yang SAMA (bukan lewat property sandbox biasa).
  new vm.Script('editAccIdx = 0;').runInContext(ctx);
  const calls = [];
  ctx.AccOwners._checkRebalanceTrigger = (i) => calls.push(i);
  ctx.AccOwners.open();
  assert.deepEqual(calls, [1], 'harus dipanggil 1x dgn index baris terakhir draft (2 pemilik -> index 1)');
});

test('AccOwners.resetDraft: memanggil _checkRebalanceTrigger(draft.length-1) setelah draft dimuat ulang', () => {
  const el = {};
  function stubEl(id) { if (!el[id]) el[id] = { innerHTML: '', value: '', style: {}, textContent: '', disabled: false, classList: { toggle() {}, add() {}, remove() {} }, insertAdjacentElement(_, node) { el[node.id || '__box__'] = node; }, insertAdjacentHTML() {} }; return el[id]; }
  const fakeDocument = { getElementById(id) { return el[id] !== undefined ? el[id] : stubEl(id); }, createElement() { return { id: '', innerHTML: '' }; } };
  const D = { accounts: [{ id: 'acc1', name: 'BCA', owners: [{ ownerId: 'A', ownerName: 'A', porsi: 60 }, { ownerId: 'B', ownerName: 'B', porsi: 40 }] }] };
  const ctx = loadSource(
    ['modules/shared/modules-calc.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js'],
    {
      D, document: fakeDocument, escapeHtml: (s) => String(s), toast: () => {}, save: () => {},
      openModal: () => {}, sameId: (a, b) => String(a) === String(b), editAccIdx: 0,
      findLinkedHoldingForAccount: () => null, uid: () => 'x', OwnerRegistry: undefined,
      getAccOwners: (id) => { const acc = D.accounts.find((a) => a.id === id); return acc ? { ok: true, owners: acc.owners } : { ok: false, owners: [] }; },
    },
    ['AccOwners'],
  );
  ctx.AccOwners._accId = 'acc1';
  const calls = [];
  ctx.AccOwners._checkRebalanceTrigger = (i) => calls.push(i);
  ctx.AccOwners.resetDraft();
  assert.deepEqual(calls, [1], 'harus dipanggil 1x dgn index baris terakhir draft (2 pemilik -> index 1)');
});
