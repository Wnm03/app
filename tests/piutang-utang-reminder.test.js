'use strict';
// tests/piutang-utang-reminder.test.js — Regression test untuk
// modules/finance/piutang-utang-reminder.js (sesi lanjutan Fix #3
// DASHBOARD-DEDUP.md, "Poin 1": perluasan cakupan saran Dashboard Hub).
// Lihat DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md utk keputusan scope &
// konfirmasi ambang/urutan/exclusion.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function isoDaysFromToday(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// daysUntilDate() ASLI (vehicle-core.js) TIDAK di-load di sini (pola sama
// tests/priority-engine-s286.test.js yang mock layer di bawahnya) —
// di-stub sesederhana mungkin tapi PERILAKUNYA sama persis versi asli
// (round((target-now)/86400000)) supaya modul yang diuji benar2 diuji
// SENDIRIAN (unit), bukan terikat ke implementasi vehicle-core.js.
function makeCtx(D) {
  const stubDaysUntilDate = (dateStr) => {
    if (!dateStr) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  };
  const ctx = loadSource(
    ['modules/finance/piutang-utang-reminder.js'],
    { D, daysUntilDate: stubDaysUntilDate },
    ['PiutangUtangReminder'],
  );
  return ctx.PiutangUtangReminder;
}

test('PiutangUtangReminder.receivableReminders(): D.piutang kosong/tidak ada -> array kosong, tidak throw', () => {
  const r1 = makeCtx({}).receivableReminders();
  assert.equal(r1.length, 0);
  const r2 = makeCtx({ piutang: [] }).receivableReminders();
  assert.equal(r2.length, 0);
});

test('PiutangUtangReminder.receivableReminders(): entry lunas=true dikecualikan total, walau jatuhTempo sudah lewat', () => {
  const PU = makeCtx({ piutang: [{ id: '1', name: 'Budi', lunas: true, jatuhTempo: isoDaysFromToday(-10), amount: 100000 }] });
  assert.equal(PU.receivableReminders().length, 0);
});

test('PiutangUtangReminder.receivableReminders(): entry tanpa jatuhTempo (kosong) dikecualikan total, tidak dianggap overdue', () => {
  const PU = makeCtx({ piutang: [{ id: '1', name: 'Budi', lunas: false, jatuhTempo: '', amount: 100000 }] });
  assert.equal(PU.receivableReminders().length, 0);
});

test('PiutangUtangReminder.receivableReminders(): jatuhTempo sudah lewat -> severity overdue', () => {
  const PU = makeCtx({ piutang: [{ id: '1', name: 'Budi', lunas: false, jatuhTempo: isoDaysFromToday(-3), amount: 50000 }] });
  const r = PU.receivableReminders();
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, 'overdue');
  assert.equal(r[0].type, 'receivable');
  assert.match(r[0].message, /lewat jatuh tempo/);
});

test('PiutangUtangReminder.receivableReminders(): sisa 0-7 hari -> severity due-soon (termasuk hari ini = H-0)', () => {
  const PU0 = makeCtx({ piutang: [{ id: '1', name: 'A', jatuhTempo: isoDaysFromToday(0), amount: 1 }] });
  assert.equal(PU0.receivableReminders()[0].severity, 'due-soon');
  const PU7 = makeCtx({ piutang: [{ id: '2', name: 'B', jatuhTempo: isoDaysFromToday(7), amount: 1 }] });
  assert.equal(PU7.receivableReminders()[0].severity, 'due-soon');
});

test('PiutangUtangReminder.receivableReminders(): sisa >7 hari -> TIDAK dijadikan reminder (belum perlu diingatkan)', () => {
  const PU = makeCtx({ piutang: [{ id: '1', name: 'A', jatuhTempo: isoDaysFromToday(8), amount: 1 }] });
  assert.equal(PU.receivableReminders().length, 0);
});

test('PiutangUtangReminder.debtReminders(): pola sama persis receivableReminders() — sumber D.debts, type "debt"', () => {
  const PU = makeCtx({ debts: [{ id: '1', name: 'Kartu Kredit', lunas: false, jatuhTempo: isoDaysFromToday(-1), amount: 200000 }] });
  const r = PU.debtReminders();
  assert.equal(r.length, 1);
  assert.equal(r[0].type, 'debt');
  assert.equal(r[0].severity, 'overdue');
  assert.match(r[0].message, /Utang "Kartu Kredit"/);
});

test('PiutangUtangReminder.summary(): gabungan receivable+debt, overdueCount/dueSoonCount murni menjumlah panjang array by severity', () => {
  const PU = makeCtx({
    piutang: [
      { id: '1', name: 'Overdue1', jatuhTempo: isoDaysFromToday(-2) },
      { id: '2', name: 'Soon1', jatuhTempo: isoDaysFromToday(3) },
    ],
    debts: [
      { id: '1', name: 'Overdue2', jatuhTempo: isoDaysFromToday(-5) },
    ],
  });
  const s = PU.summary();
  assert.equal(s.total, 3);
  assert.equal(s.overdueCount, 2);
  assert.equal(s.dueSoonCount, 1);
  assert.equal(s.receivable.length, 2);
  assert.equal(s.debt.length, 1);
  assert.equal(s.all.length, 3);
});

test('PiutangUtangReminder._daysUntil(): daysUntilDate belum dimuat -> null (tidak throw)', () => {
  const ctx = loadSource(
    ['modules/finance/piutang-utang-reminder.js'],
    { D: {} },
    ['PiutangUtangReminder'],
  );
  assert.equal(ctx.PiutangUtangReminder._daysUntil('2026-01-01'), null);
});
