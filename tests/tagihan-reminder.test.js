'use strict';
// tests/tagihan-reminder.test.js — Regression test untuk
// modules/finance/tagihan-reminder.js (sesi lanjutan Fix #3
// DASHBOARD-DEDUP.md, "Poin 1": perluasan cakupan saran Dashboard Hub,
// lanjutan dari Piutang/Utang). Lihat
// DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md § "Audit kesiapan per modul".

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function isoDaysFromToday(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// billNextDueLocalMidnight()/getBillPaidThisPeriodInfo() ASLI (tagihan-
// kalender.js) TIDAK di-load di sini (pola sama tests/piutang-utang-
// reminder.test.js yang mock layer di bawahnya) — di-stub sesederhana
// mungkin tapi PERILAKU billNextDueLocalMidnight() sama persis versi asli
// (parse local-midnight dari 'YYYY-MM-DD'). paidThisPeriod di-stub via
// map opsional per-test (default: tidak ada yang dianggap sudah dibayar).
function makeCtx(D, paidIds) {
  const stubBillNextDueLocalMidnight = (dateStr) => {
    if (!dateStr) return new Date(NaN);
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d);
  };
  const stubGetBillPaidThisPeriodInfo = (b) => {
    return (paidIds && paidIds.includes(b.id)) ? { tx: {}, date: new Date() } : null;
  };
  const ctx = loadSource(
    ['modules/finance/tagihan-reminder.js'],
    {
      D,
      billNextDueLocalMidnight: stubBillNextDueLocalMidnight,
      getBillPaidThisPeriodInfo: stubGetBillPaidThisPeriodInfo,
    },
    ['TagihanReminder'],
  );
  return ctx.TagihanReminder;
}

test('TagihanReminder.billReminders(): D.bills kosong/tidak ada -> array kosong, tidak throw', () => {
  const r1 = makeCtx({}).billReminders();
  assert.equal(r1.length, 0);
  const r2 = makeCtx({ bills: [] }).billReminders();
  assert.equal(r2.length, 0);
});

test('TagihanReminder.billReminders(): sudah dibayar periode ini (getBillPaidThisPeriodInfo truthy) dikecualikan total, walau nextDue sudah lewat', () => {
  const TR = makeCtx(
    { bills: [{ id: '1', name: 'Listrik', nextDue: isoDaysFromToday(-5), amount: 200000 }] },
    ['1'],
  );
  assert.equal(TR.billReminders().length, 0);
});

test('TagihanReminder.billReminders(): tanpa nextDue valid dikecualikan total, tidak dianggap overdue', () => {
  const TR = makeCtx({ bills: [{ id: '1', name: 'Internet', nextDue: '', amount: 300000 }] });
  assert.equal(TR.billReminders().length, 0);
});

test('TagihanReminder.billReminders(): nextDue sudah lewat -> severity overdue', () => {
  const TR = makeCtx({ bills: [{ id: '1', name: 'PDAM', nextDue: isoDaysFromToday(-3), amount: 50000 }] });
  const r = TR.billReminders();
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, 'overdue');
  assert.equal(r[0].type, 'bill');
  assert.match(r[0].message, /lewat jatuh tempo/);
});

test('TagihanReminder.billReminders(): sisa 0-7 hari -> severity due-soon (termasuk hari ini = H-0)', () => {
  const TR0 = makeCtx({ bills: [{ id: '1', name: 'A', nextDue: isoDaysFromToday(0), amount: 1 }] });
  assert.equal(TR0.billReminders()[0].severity, 'due-soon');
  const TR7 = makeCtx({ bills: [{ id: '2', name: 'B', nextDue: isoDaysFromToday(7), amount: 1 }] });
  assert.equal(TR7.billReminders()[0].severity, 'due-soon');
});

test('TagihanReminder.billReminders(): sisa >7 hari -> TIDAK dijadikan reminder (belum perlu diingatkan)', () => {
  const TR = makeCtx({ bills: [{ id: '1', name: 'A', nextDue: isoDaysFromToday(8), amount: 1 }] });
  assert.equal(TR.billReminders().length, 0);
});

test('TagihanReminder.summary(): overdueCount/dueSoonCount murni menjumlah panjang array by severity', () => {
  const TR = makeCtx({
    bills: [
      { id: '1', name: 'Overdue1', nextDue: isoDaysFromToday(-2) },
      { id: '2', name: 'Soon1', nextDue: isoDaysFromToday(3) },
      { id: '3', name: 'SudahDibayar', nextDue: isoDaysFromToday(-10) },
    ],
  }, ['3']);
  const s = TR.summary();
  assert.equal(s.total, 2);
  assert.equal(s.overdueCount, 1);
  assert.equal(s.dueSoonCount, 1);
  assert.equal(s.all.length, 2);
});

test('TagihanReminder._daysUntil(): billNextDueLocalMidnight belum dimuat -> null (tidak throw)', () => {
  const ctx = loadSource(
    ['modules/finance/tagihan-reminder.js'],
    { D: {} },
    ['TagihanReminder'],
  );
  assert.equal(ctx.TagihanReminder._daysUntil('2026-01-01'), null);
});
