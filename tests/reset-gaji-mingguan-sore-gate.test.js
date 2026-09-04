'use strict';
// tests/reset-gaji-mingguan-sore-gate.test.js — cakupan gerbang jam sore (>=18:00)
// yang ditambahkan ke checkWeeklySalaryReset() (modules/business/reset-gaji-mingguan.js):
// 1) Bukan hari Sabtu -> tidak ada efek apa pun.
// 2) Hari Sabtu tapi jam < 18 -> tidak ada efek (termasuk D.lastResetPromptDate
//    TIDAK ikut ditandai, supaya popup masih bisa muncul kalau app dibuka lagi
//    sore/malam hari yang sama).
// 3) Hari Sabtu jam >= 18, tidak ada Absensi minggu ini -> D.lastResetPromptDate
//    ditandai (supaya tidak dicek ulang hari itu) tapi modal TIDAK dibuka.
// 4) Hari Sabtu jam >= 18, ada Absensi minggu ini -> modal weeklyResetModal
//    dibuka & wrCount/wrTotal terisi sesuai computeWeeklyGajiTotal().
// 5) Hari Sabtu jam >= 18 tapi sudah pernah ditawarkan hari ini -> tidak dibuka lagi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const SABTU_SORE = new Date(2026, 7, 15, 19, 0, 0); // Sabtu, 15 Agu 2026, jam 19:00
const SABTU_PAGI = new Date(2026, 7, 15, 9, 0, 0); // Sabtu yang sama, jam 09:00
const MINGGU = new Date(2026, 7, 16, 19, 0, 0); // Minggu (bukan Sabtu), jam 19:00

function makeFakeEl() {
  return { textContent: '', value: '', checked: false, style: {} };
}

function makeD(overrides) {
  return Object.assign({ workDays: [], accounts: [], categories: { income: [] }, profile: {} }, overrides);
}

function makeCtx(D) {
  let openedModal = null;
  const els = {
    wrCount: makeFakeEl(),
    wrTotal: makeFakeEl(),
    wrAutoIncome: makeFakeEl(),
    wrAccWrap: makeFakeEl(),
    wrAcc: makeFakeEl(),
  };
  const stub = {
    D,
    save: () => {},
    toast: () => {},
    uid: () => 'u1',
    dateToISO: (d) => d.toISOString().slice(0, 10),
    fmtFull: (n) => String(n),
    todayStr: () => els.__ts || '2026-08-15',
    openModal: (id) => { openedModal = id; },
    closeModal: () => {},
    document: { getElementById: (id) => els[id] || null },
  };
  const ctx = loadSource(['modules/business/reset-gaji-mingguan.js'], stub);
  ctx.__openedModal = () => openedModal;
  ctx.__els = els;
  ctx.__setToday = (ts) => { els.__ts = ts; };
  return ctx;
}

test('checkWeeklySalaryReset() — bukan hari Sabtu -> tidak ada efek', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.checkWeeklySalaryReset(MINGGU);
  assert.equal(ctx.__openedModal(), null);
  assert.equal(D.lastResetPromptDate, undefined);
});

test('checkWeeklySalaryReset() — Sabtu tapi masih pagi (<18:00) -> tidak ada efek, belum ditandai', () => {
  const D = makeD({ workDays: [{ date: '2026-08-11', total: 100000 }] });
  const ctx = makeCtx(D);
  ctx.__setToday('2026-08-15');
  ctx.checkWeeklySalaryReset(SABTU_PAGI);
  assert.equal(ctx.__openedModal(), null);
  assert.equal(D.lastResetPromptDate, undefined, 'belum ditandai supaya bisa dicek ulang nanti sore');
});

test('checkWeeklySalaryReset() — Sabtu sore (>=18:00), tidak ada Absensi minggu ini -> ditandai tapi modal tidak dibuka', () => {
  const D = makeD({ workDays: [] });
  const ctx = makeCtx(D);
  ctx.__setToday('2026-08-15');
  ctx.checkWeeklySalaryReset(SABTU_SORE);
  assert.equal(ctx.__openedModal(), null);
  assert.equal(D.lastResetPromptDate, '2026-08-15');
});

test('checkWeeklySalaryReset() — Sabtu sore (>=18:00), ada Absensi minggu ini -> buka weeklyResetModal dgn total benar', () => {
  const D = makeD({
    workDays: [
      { date: '2026-08-10', total: 100000 },
      { date: '2026-08-11', total: 120000 },
    ],
  });
  const ctx = makeCtx(D);
  ctx.__setToday('2026-08-15');
  ctx.checkWeeklySalaryReset(SABTU_SORE);
  assert.equal(ctx.__openedModal(), 'weeklyResetModal');
  assert.equal(ctx.__els.wrCount.textContent, 2);
  assert.equal(ctx.__els.wrTotal.textContent, '220000');
});

test('checkWeeklySalaryReset() — Sabtu sore tapi sudah pernah ditawarkan hari ini -> tidak dibuka lagi', () => {
  const D = makeD({
    workDays: [{ date: '2026-08-11', total: 100000 }],
    lastResetPromptDate: '2026-08-15',
  });
  const ctx = makeCtx(D);
  ctx.__setToday('2026-08-15');
  ctx.checkWeeklySalaryReset(SABTU_SORE);
  assert.equal(ctx.__openedModal(), null);
});
