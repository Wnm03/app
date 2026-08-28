'use strict';
// tests/bug-del-titipan-debt-guard.test.js — Audit 2026-08: bug delete Utang
// utk baris "🔒 Titipan" (auto-sync dari Aset._syncOwnerDebts()/
// Investment._syncTitipanDebt()/TitipanSync.reconcileAccounts()).
//
// Root cause: baris ini AUTO-GENERATE ULANG oleh save() itu sendiri (sync
// dipanggil dari dalam save(), gerbang tunggal) -- delete lama (1) hapus dari
// D.debts, (2) panggil save(), (3) save() re-sync & mendeteksi porsi non-SELF
// aset/akun/investasi sumbernya masih >0 -- baris dibuat lagi. Delete
// "tampak sukses" (tidak error) tapi baris balik lagi.
//
// Fix: Debt.delete() sekarang CEGAH delete SEBELUM proses jalan kalau baris
// bertaut (linkedAssetId/linkedInvestmentId/linkedAccountId), munculkan toast
// penjelasan. Utang manual (tidak bertaut) TETAP terhapus permanen seperti
// biasa -- 0 regresi kasus umum.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    debts: [
      { id: 'manual1', name: 'KTA Bank X', nilai: 3000000, lunas: false, bunga: 10, cicilanBulanan: 250000 },
      { id: 'titipanAset', name: 'Investor A', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, linkedAssetId: 'a1', linkedOwnerId: 'inv1' },
      { id: 'titipanInvest', name: 'Investor B', nilai: 1000000, lunas: false, bunga: 0, cicilanBulanan: 0, linkedInvestmentId: 'inv-h1', linkedOwnerId: 'inv2' },
      { id: 'titipanAkun', name: 'Investor C', nilai: 500000, lunas: false, bunga: 0, cicilanBulanan: 0, linkedAccountId: 'acc1', linkedOwnerId: 'inv3' },
    ],
    bills: [],
  };
}

function makeCtx(D, { confirmReturns = true, toastCalls = [] } = {}) {
  let saveCalls = 0;
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => { saveCalls++; },
      sameId: (a, b) => String(a) === String(b),
      askConfirm: async () => confirmReturns,
      toast: (msg, dur) => { toastCalls.push({ msg, dur }); },
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderBillList: () => {},
      checkBills: () => {},
    },
    ['Debt'],
  );
  ctx.__getSaveCalls = () => saveCalls;
  return ctx;
}

test('Debt.delete() — utang manual (tidak bertaut) tetap terhapus permanen', async () => {
  const D = makeD();
  const ctx = makeCtx(D);
  await ctx.Debt.delete('manual1');
  assert.equal(D.debts.some((d) => d.id === 'manual1'), false, 'utang manual harus hilang dari D.debts');
});

test('Debt.delete() — baris titipan ASET (linkedAssetId) DITOLAK, tidak terhapus, toast muncul', async () => {
  const D = makeD();
  const toastCalls = [];
  const ctx = makeCtx(D, { toastCalls });
  await ctx.Debt.delete('titipanAset');
  assert.equal(D.debts.some((d) => d.id === 'titipanAset'), true, 'baris titipan aset TIDAK boleh terhapus');
  assert.equal(toastCalls.length, 1, 'toast penjelasan harus muncul');
  assert.match(toastCalls[0].msg, /porsi kepemilikan/i);
});

test('Debt.delete() — baris titipan INVESTASI (linkedInvestmentId) DITOLAK', async () => {
  const D = makeD();
  const ctx = makeCtx(D);
  await ctx.Debt.delete('titipanInvest');
  assert.equal(D.debts.some((d) => d.id === 'titipanInvest'), true);
});

test('Debt.delete() — baris titipan AKUN (linkedAccountId) DITOLAK (sebelumnya lolos, sekarang ikut ter-guard)', async () => {
  const D = makeD();
  const ctx = makeCtx(D);
  await ctx.Debt.delete('titipanAkun');
  assert.equal(D.debts.some((d) => d.id === 'titipanAkun'), true);
});

test('Debt.delete() — baris titipan: askConfirm TIDAK PERNAH dipanggil sama sekali (ditolak sebelum konfirmasi)', async () => {
  const D = makeD();
  let confirmCalled = false;
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      askConfirm: async () => { confirmCalled = true; return true; },
      toast: () => {},
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      renderBillList: () => {},
      checkBills: () => {},
    },
    ['Debt'],
  );
  await ctx.Debt.delete('titipanAset');
  assert.equal(confirmCalled, false, 'askConfirm tidak boleh terpanggil utk baris titipan -- ditolak lebih dulu');
});

test('Debt.delete() — utang manual: save() TETAP dipanggil (perilaku lama tidak berubah)', async () => {
  const D = makeD();
  const ctx = makeCtx(D);
  await ctx.Debt.delete('manual1');
  assert.equal(ctx.__getSaveCalls(), 1);
});

test('Debt.renderList() — badge 🔒 Titipan JUGA tampil utk linkedAccountId (sebelumnya kelupaan)', () => {
  const D = makeD();
  const elMap = {
    debtList: { innerHTML: '' },
    debtTotalVal: { textContent: '' },
    debtCicilanVal: { textContent: '' },
  };
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      sameId: (a, b) => String(a) === String(b),
      resolveEntryAssetSelfPorsi: () => 100,
      isDebtOwnershipSelf: () => true,
      document: { getElementById: (id) => elMap[id] || null },
    },
    ['Debt'],
  );
  ctx.Debt.renderList();
  const html = elMap.debtList.innerHTML;
  // Baris titipan akun harus dapat badge & ikon kunci, BUKAN tombol hapus.
  const akunRowMatch = html.split('Investor C')[1] ? html : '';
  assert.match(html, /Titipan — bukan kewajiban dibayar/);
  // Tombol delDebt (data-action="delDebt") TIDAK boleh ada utk baris titipan
  // -- cek dgn menghitung berapa kali data-action="delDebt" muncul: harus
  // PERSIS 1 (cuma utk manual1, entri non-titipan satu-satunya di makeD()).
  const delBtnCount = (html.match(/data-action="delDebt"/g) || []).length;
  assert.equal(delBtnCount, 1, 'hanya utang manual yang boleh punya tombol hapus');
});
