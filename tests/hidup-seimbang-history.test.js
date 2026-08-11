'use strict';
// tests/hidup-seimbang-history.test.js — cakupan modules/home/hidup-seimbang.js
// (LifeBalance): family `modules/home` sebelumnya 0 test file (lihat
// docs/COVERAGE-PER-MODULE.md).
//
// Fokus: modal Riwayat Skor (openHistoryModal/renderHistoryModal — literal
// "riwayat" di app ini) & tombol Tambah (saveSnapshot manual)/Hapus
// (deleteSnapshot) snapshot. LifeBalance.compute() (skor finansial, tidak
// terkait tombol riwayat/tambah/hapus) di-mock lewat monkey-patch supaya
// test ini tidak perlu menyusun ulang seluruh dependency-nya (D.targets/
// WorthIt/computeNoSpendLast30/D.workDays).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop in t) return t[prop];
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}

function makeDoc(predefined = {}) {
  return { getElementById: (id) => predefined[id] || autoEl() };
}

function makeD(overrides = {}) {
  return Object.assign({ lifeBalanceSnapshots: [] }, overrides);
}

function makeCtx({ document, D, calls, confirmResult = true }) {
  const ctx = loadSource(
    ['modules/home/hidup-seimbang.js'],
    {
      document, D,
      uid: (() => { let n = 1; return () => 'lb' + (n++); })(),
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      todayStr: () => '2026-08-01',
      save: () => calls.push('save'),
      openModal: (id) => calls.push('open:' + id),
      toast: (msg) => calls.push('toast:' + msg),
      askConfirm: async () => { calls.push('askConfirm'); return confirmResult; },
    },
    ['LifeBalance'],
  );
  // Skor finansial (compute()) di luar cakupan test ini — di-stub tetap
  // (SAMA objek `ctx.LifeBalance`, jadi pemanggilan internal `LifeBalance.compute()`
  // di dalam saveSnapshot()/render() ikut memakai versi stub ini).
  ctx.LifeBalance.compute = () => ({
    total: 70, level: '🟡 Cukup Baik', color: '#000',
    parts: [{ label: '🚨 Dana Darurat', pts: 20, max: 25, note: '80%' }],
  });
  return ctx;
}

// ===== Modal Riwayat Skor (openHistoryModal) =====

test('openHistoryModal() -> render riwayat lalu buka lbHistoryModal', () => {
  const calls = [];
  const els = { lbHistoryList: { innerHTML: 'sisa' } };
  const D = makeD();
  const { LifeBalance } = makeCtx({ document: makeDoc(els), D, calls });
  LifeBalance.openHistoryModal();
  assert.match(els.lbHistoryList.innerHTML, /Belum ada snapshot/);
  assert.ok(calls.includes('open:lbHistoryModal'));
});

test('renderHistoryModal() — ada snapshot -> daftar tampil, TIDAK ke state kosong', () => {
  const calls = [];
  const els = { lbHistoryList: { innerHTML: '' }, lbHistoryChart: { innerHTML: '' } };
  const D = makeD({ lifeBalanceSnapshots: [{ id: 's1', date: '2026-07-01', score: 65, parts: [], auto: true }] });
  const { LifeBalance } = makeCtx({ document: makeDoc(els), D, calls });
  LifeBalance.renderHistoryModal();
  assert.doesNotMatch(els.lbHistoryList.innerHTML, /Belum ada snapshot/);
  assert.match(els.lbHistoryList.innerHTML, /65\/100/);
});

// ===== Tombol Tambah (saveSnapshot manual) =====

test('saveSnapshot(true) (tombol simpan manual) — belum ada snapshot hari ini -> snapshot baru masuk, toast sukses', () => {
  const calls = [];
  const D = makeD();
  const { LifeBalance } = makeCtx({ document: makeDoc(), D, calls });
  LifeBalance.saveSnapshot(true);
  assert.equal(D.lifeBalanceSnapshots.length, 1);
  assert.equal(D.lifeBalanceSnapshots[0].date, '2026-08-01');
  assert.equal(D.lifeBalanceSnapshots[0].score, 70);
  assert.equal(D.lifeBalanceSnapshots[0].auto, false);
  assert.match(calls.join(','), /toast:.*tersimpan/);
});

test('saveSnapshot(true) — sudah ada snapshot auto hari ini -> di-UPDATE (bukan duplikat) & auto jadi false', () => {
  const calls = [];
  const D = makeD({ lifeBalanceSnapshots: [{ id: 's1', date: '2026-08-01', score: 40, parts: [], auto: true }] });
  const { LifeBalance } = makeCtx({ document: makeDoc(), D, calls });
  LifeBalance.saveSnapshot(true);
  assert.equal(D.lifeBalanceSnapshots.length, 1, 'tidak boleh dobel utk tanggal yang sama');
  assert.equal(D.lifeBalanceSnapshots[0].score, 70);
  assert.equal(D.lifeBalanceSnapshots[0].auto, false);
});

test('saveSnapshot(false) (auto, bukan tombol manual) — TIDAK toast', () => {
  const calls = [];
  const D = makeD();
  const { LifeBalance } = makeCtx({ document: makeDoc(), D, calls });
  LifeBalance.saveSnapshot(false);
  assert.equal(D.lifeBalanceSnapshots.length, 1);
  assert.equal(D.lifeBalanceSnapshots[0].auto, true);
  assert.ok(!calls.some((c) => c.startsWith('toast:')));
});

// ===== Tombol Hapus (deleteSnapshot) =====

test('deleteSnapshot() — dibatalkan -> snapshot tetap ada', async () => {
  const calls = [];
  const D = makeD({ lifeBalanceSnapshots: [{ id: 's1', date: '2026-07-01', score: 65, parts: [] }] });
  const { LifeBalance } = makeCtx({ document: makeDoc(), D, calls, confirmResult: false });
  await LifeBalance.deleteSnapshot('s1');
  assert.equal(D.lifeBalanceSnapshots.length, 1);
});

test('deleteSnapshot() — dikonfirmasi -> snapshot terhapus, riwayat & badge tren di-render ulang', async () => {
  const calls = [];
  const els = { lbHistoryList: { innerHTML: '' }, lbTrendBadge: { style: {}, classList: { add() {}, remove() {}, toggle() {} } } };
  const D = makeD({ lifeBalanceSnapshots: [{ id: 's1', date: '2026-07-01', score: 65, parts: [] }] });
  const { LifeBalance } = makeCtx({ document: makeDoc(els), D, calls, confirmResult: true });
  await LifeBalance.deleteSnapshot('s1');
  assert.equal(D.lifeBalanceSnapshots.length, 0);
  assert.ok(calls.includes('save'));
});
