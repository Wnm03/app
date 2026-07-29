'use strict';
// tests/akun-del-migrate-choice.test.js — cakupan delAcc() (modules/finance/akun.js),
// fitur baru sesi ini: kalau akun yang mau dihapus PUNYA data terkait
// (transaksi/tagihan/BBM/servis/Shop) DAN ada lebih dari 1 kemungkinan akun
// tujuan, user diberi PILIHAN mau dipindah ke akun mana (showChoiceModal),
// bukan otomatis ke D.accounts[0] seperti sebelumnya. Semua fungsi
// render/save di-stub no-op (DOM-heavy, di luar cakupan harness ini — lihat
// catatan loadSource.js), fokus test murni ke: (a) kapan showChoiceModal
// dipanggil/tidak, (b) ke akun mana data akhirnya berpindah, (c) pembatalan
// (choiceModal/confirm balik null/false) TIDAK menghapus apa pun.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(accounts) {
  return {
    accounts,
    transactions: [],
    bills: [],
    bbmLogs: [],
    servisLogs: [],
    cobek: [],
    targets: [],
    assets: [],
  };
}

function makeCtx(D, stubs = {}) {
  const calls = { save: 0, choiceModalArgs: null, confirmArgs: null };
  const toasts = [];
  const ctx = loadSource(
    ['modules/finance/akun.js'],
    Object.assign(
      {
        D,
        escapeHtml: (s) => s,
        fmt: (n) => 'Rp' + n,
        save: () => { calls.save++; },
        toast: (msg) => toasts.push(msg),
        askConfirm: stubs.askConfirm || (async (msg) => { calls.confirmArgs = msg; return true; }),
        showChoiceModal: stubs.showChoiceModal || (async (opts) => { calls.choiceModalArgs = opts; return 0; }),
        renderAccGrid: () => {},
        populateKeuFilters: () => {},
        renderDashAccList: () => {},
        renderLapAccList: () => {},
        renderDashboard: () => {},
        renderKeuangan: () => {},
        refreshBillEverywhere: () => {},
        renderCnTab: () => {},
      },
      stubs.extra || {}
    )
  );
  return { ctx, calls, toasts };
}

test('delAcc() — akun TANPA data terkait, akun lain cuma 1 -> tidak ada showChoiceModal, langsung hapus', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵' },
    { id: 'a2', name: 'Bank', emoji: '🏦' },
  ]);
  let choiceModalCalled = false;
  const { ctx, calls } = makeCtx(D, { showChoiceModal: async () => { choiceModalCalled = true; return 0; } });
  await ctx.delAcc(0);
  assert.equal(choiceModalCalled, false);
  assert.equal(D.accounts.length, 1);
  assert.equal(D.accounts[0].id, 'a2');
  assert.equal(calls.save, 1);
});

test('delAcc() — akun PUNYA transaksi terkait, tapi cuma 1 kemungkinan akun tujuan -> auto pakai akun itu, tanpa showChoiceModal', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵' },
    { id: 'a2', name: 'Bank', emoji: '🏦' },
  ]);
  D.transactions.push({ id: 't1', accountId: 'a1', type: 'expense', amount: 10000 });
  let choiceModalCalled = false;
  const { ctx } = makeCtx(D, { showChoiceModal: async () => { choiceModalCalled = true; return 0; } });
  await ctx.delAcc(0);
  assert.equal(choiceModalCalled, false);
  assert.equal(D.transactions[0].accountId, 'a2');
  assert.equal(D.accounts.length, 1);
});

test('delAcc() — akun PUNYA data terkait & 2+ kemungkinan tujuan -> showChoiceModal dipanggil, data pindah ke akun yang DIPILIH (bukan otomatis accounts[0])', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵' },
    { id: 'a2', name: 'Bank BCA', emoji: '🏦' },
    { id: 'a3', name: 'Bank Mandiri', emoji: '🏦' },
  ]);
  D.transactions.push({ id: 't1', accountId: 'a1', type: 'expense', amount: 50000 });
  D.bills.push({ id: 'b1', accountId: 'a1' });
  D.bbmLogs.push({ id: 'bbm1', accountId: 'a1' });
  D.servisLogs.push({ id: 's1', accountId: 'a1' });
  D.cobek.push({ id: 'c1', accountId: 'a1' });
  // Pilih index 1 dari daftar `others` ([a2, a3]) -> harus jadi a3 (Bank Mandiri), BUKAN a2 (accounts[0] versi lama)
  const { ctx, calls } = makeCtx(D, { showChoiceModal: async (opts) => { calls.choiceModalArgs = opts; return 1; } });
  await ctx.delAcc(0);
  assert.ok(calls.choiceModalArgs);
  assert.equal(calls.choiceModalArgs.choices.length, 2);
  assert.equal(D.transactions[0].accountId, 'a3');
  assert.equal(D.bills[0].accountId, 'a3');
  assert.equal(D.bbmLogs[0].accountId, 'a3');
  assert.equal(D.servisLogs[0].accountId, 'a3');
  assert.equal(D.cobek[0].accountId, 'a3');
  assert.equal(D.accounts.length, 2);
  assert.deepEqual(D.accounts.map((a) => a.id), ['a2', 'a3']);
});

test('delAcc() — user membatalkan showChoiceModal (null) -> akun TIDAK dihapus, data TIDAK berpindah', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵' },
    { id: 'a2', name: 'Bank BCA', emoji: '🏦' },
    { id: 'a3', name: 'Bank Mandiri', emoji: '🏦' },
  ]);
  D.transactions.push({ id: 't1', accountId: 'a1', type: 'expense', amount: 50000 });
  const { ctx, calls } = makeCtx(D, { showChoiceModal: async () => null });
  await ctx.delAcc(0);
  assert.equal(D.accounts.length, 3);
  assert.equal(D.transactions[0].accountId, 'a1');
  assert.equal(calls.save, 0);
});

test('delAcc() — user membatalkan askConfirm (false) setelah memilih akun tujuan -> akun TIDAK dihapus', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵' },
    { id: 'a2', name: 'Bank BCA', emoji: '🏦' },
    { id: 'a3', name: 'Bank Mandiri', emoji: '🏦' },
  ]);
  D.transactions.push({ id: 't1', accountId: 'a1', type: 'expense', amount: 50000 });
  const { ctx, calls } = makeCtx(D, {
    showChoiceModal: async () => 1,
    askConfirm: async () => false,
  });
  await ctx.delAcc(0);
  assert.equal(D.accounts.length, 3);
  assert.equal(D.transactions[0].accountId, 'a1');
  assert.equal(calls.save, 0);
});

test('delAcc() — minimal 1 akun harus ada (guard existing, perilaku TIDAK berubah)', async () => {
  const D = makeD([{ id: 'a1', name: 'Cash', emoji: '💵' }]);
  const { ctx, toasts } = makeCtx(D);
  await ctx.delAcc(0);
  assert.equal(D.accounts.length, 1);
  assert.ok(toasts.some((t) => t.includes('Minimal 1 akun')));
});

test('delAcc() — akun ditautkan ke Target Tabungan (D.targets) -> ikut terdeteksi & ikut dipindah (gap yang diperbaiki sesi ini)', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵' },
    { id: 'a2', name: 'Bank BCA', emoji: '🏦' },
  ]);
  D.targets.push({ id: 'tg1', name: 'Dana Darurat', accountId: 'a1' });
  let choiceModalCalled = false;
  const { ctx, calls } = makeCtx(D, { showChoiceModal: async () => { choiceModalCalled = true; return 0; } });
  await ctx.delAcc(0);
  // cuma 1 kemungkinan tujuan (a2) -> tidak perlu tanya, tapi HARUS tetap terdeteksi & dipindah
  assert.equal(choiceModalCalled, false);
  assert.equal(D.targets[0].accountId, 'a2');
  assert.equal(D.accounts.length, 1);
  assert.equal(calls.save, 1);
});

test('delAcc() — akun ditautkan ke Aset (D.assets) & ada 2+ kemungkinan tujuan -> ikut terdeteksi, showChoiceModal muncul, ikut dipindah ke pilihan user', async () => {
  const D = makeD([
    { id: 'a1', name: 'Cash', emoji: '💵' },
    { id: 'a2', name: 'Bank BCA', emoji: '🏦' },
    { id: 'a3', name: 'Bank Mandiri', emoji: '🏦' },
  ]);
  D.assets.push({ id: 'as1', name: 'Reksadana XYZ', accountId: 'a1' });
  const { ctx, calls } = makeCtx(D, { showChoiceModal: async (opts) => { calls.choiceModalArgs = opts; return 1; } });
  await ctx.delAcc(0);
  assert.ok(calls.choiceModalArgs);
  assert.ok(calls.choiceModalArgs.message.includes('Aset'));
  assert.equal(D.assets[0].accountId, 'a3');
  assert.equal(D.accounts.length, 2);
});
