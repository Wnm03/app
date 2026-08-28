'use strict';
// tests/bug-del-titipan-piutang-guard.test.js — Audit lanjutan 2026-08: bug
// SERUPA Debt.delete() ditemukan di sisi Piutang. Entri piutang otomatis
// (autoBillId/autoTxId dari maybeCreateSharedPiutangFromBill(), atau
// autoTxId/autoTitipanOwnerId dari maybeCreateTitipanTalanganPiutang())
// AUTO-GENERATE ULANG kalau transaksi sumbernya diedit & disimpan ulang
// (idempotency guard-nya cuma cek "apakah tx.id ini sudah punya entri
// Piutang" -- kalau user hapus manual duluan, guard lolos & entri baru
// dibuat lagi). Fix: Piutang.delete() sekarang cegah hapus baris otomatis
// SEBELUM proses jalan, sama seperti Debt.delete().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    piutang: [
      { id: 'manual1', name: 'Pinjam ke Budi', nilai: 500000, lunas: false },
      { id: 'sharedBill1', name: 'Porsi bersama: Listrik', nilai: 150000, lunas: false, autoBillId: 'bill1', autoTxId: 'tx1' },
      { id: 'talangan1', name: 'Talangan Dana Titipan: Investor A', nilai: 200000, lunas: false, autoTxId: 'tx2', autoTitipanOwnerId: 'owner1' },
    ],
  };
}

function makeCtx(D, { toastCalls = [] } = {}) {
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
      askConfirm: async () => true,
      toast: (msg, dur) => { toastCalls.push({ msg, dur }); },
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
    },
    ['Piutang'],
  );
  ctx.__getSaveCalls = () => saveCalls;
  return ctx;
}

test('Piutang.delete() — piutang manual tetap terhapus permanen', async () => {
  const D = makeD();
  const ctx = makeCtx(D);
  await ctx.Piutang.delete('manual1');
  assert.equal(D.piutang.some((p) => p.id === 'manual1'), false);
});

test('Piutang.delete() — piutang otomatis dari tagihan (autoBillId/autoTxId) DITOLAK, toast muncul', async () => {
  const D = makeD();
  const toastCalls = [];
  const ctx = makeCtx(D, { toastCalls });
  await ctx.Piutang.delete('sharedBill1');
  assert.equal(D.piutang.some((p) => p.id === 'sharedBill1'), true);
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0].msg, /transaksi\/pembayaran tagihan/i);
});

test('Piutang.delete() — piutang otomatis Talangan Dana Titipan (autoTitipanOwnerId) DITOLAK', async () => {
  const D = makeD();
  const ctx = makeCtx(D);
  await ctx.Piutang.delete('talangan1');
  assert.equal(D.piutang.some((p) => p.id === 'talangan1'), true);
});

test('Piutang.delete() — piutang otomatis: askConfirm TIDAK dipanggil (ditolak sebelum konfirmasi)', async () => {
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
    },
    ['Piutang'],
  );
  await ctx.Piutang.delete('sharedBill1');
  assert.equal(confirmCalled, false);
});

test('Piutang.renderList() — badge "Talangan Dana Titipan" tampil, tombol hapus disembunyikan utk baris otomatis', () => {
  const D = makeD();
  const elMap = { piutangList: { innerHTML: '' } };
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
      isPiutangOwnershipSelf: () => true,
      document: { getElementById: (id) => elMap[id] || null },
    },
    ['Piutang'],
  );
  ctx.Piutang.renderList();
  const html = elMap.piutangList.innerHTML;
  assert.match(html, /Talangan Dana Titipan — otomatis dari transaksi/);
  const delBtnCount = (html.match(/data-action="delPiutang"/g) || []).length;
  assert.equal(delBtnCount, 1, 'hanya piutang manual yang boleh punya tombol hapus');
});
