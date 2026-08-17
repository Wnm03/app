'use strict';
// tests/s637-tx-tabel-modern-saldo-berjalan.test.js — cakupan Sesi s637
// (RENCANA-MODERNISASI-UI.md): pola tabel Ledger Pro + kolom saldo
// berjalan utk #allTx (tab Uang), KHUSUS D.profile.theme==='modern'.
// Proof-test terpisah sesuai catatan risiko rencana (perubahan struktural
// DOM, bukan cuma styling) -- lihat AUDIT sesi ini: keputusan user "opsi 1"
// (kolom Saldo HANYA muncul kalau accIdForBalance diisi, dipanggil dari
// renderKeuangan() cuma saat filter Akun != "semua").
//
// Cakupan: (1) computeAccRunningBalances() (akun.js) murni matematis,
// reuse rumus persis recalcAccBalance() tapi per-langkah. (2)
// txTableRowHTML/txTableHTML (tx-list-cashflow.js) markup & gating kolom
// Saldo. (3) txHTML() lama 0 berubah (regresi byte-level pada 1 kasus).
// (4) renderKeuangan() (modules-render.js) percabangan tema via string-check
// source (loadSource TIDAK menjalankan DOM penuh utk fungsi sebesar
// renderKeuangan, jadi verifikasi wiring lewat pembacaan source, pola sama
// dgn test wiring DashboardHub.render() di s636).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeCtx(D, extra) {
  return loadSource(
    ['modules/finance/akun.js', 'modules/finance/tx-list-cashflow.js'],
    Object.assign(
      {
        D,
        document: { getElementById: () => null },
        escapeHtml: (s) => String(s),
        getAllCats: () => [{ name: 'Makan', emoji: '🍔' }, { name: 'Gaji', emoji: '💰' }],
        fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
        toast: () => {},
        save: () => {},
      },
      extra || {},
    ),
    [],
  );
}

function makeD(accExtra) {
  return {
    accounts: [Object.assign({ id: 'a1', name: 'Kas', emoji: '💵' }, accExtra || {})],
    transactions: [],
  };
}

// --- computeAccRunningBalances() ------------------------------------------

test('computeAccRunningBalances() — akun tidak ditemukan -> Map kosong (tidak throw)', () => {
  const ctx = makeCtx(makeD());
  const map = ctx.computeAccRunningBalances('tidak-ada');
  assert.equal(map.size, 0);
});

test('computeAccRunningBalances() — akumulasi kronologis persis rumus recalcAccBalance (seed baseBalance, income+/expense-/transfer)', () => {
  const D = makeD({ baseBalance: 100000 });
  D.transactions = [
    { id: 't1', accountId: 'a1', type: 'income', amount: 50000, date: '2026-08-01' },
    { id: 't2', accountId: 'a1', type: 'expense', amount: 20000, date: '2026-08-02' },
    { id: 't3', accountId: 'a1', type: 'transfer_in', amount: 10000, date: '2026-08-03' },
    { id: 't4', accountId: 'a1', type: 'transfer_out', amount: 5000, date: '2026-08-04' },
  ];
  const ctx = makeCtx(D);
  const map = ctx.computeAccRunningBalances('a1');
  assert.equal(map.get('t1'), 150000);
  assert.equal(map.get('t2'), 130000);
  assert.equal(map.get('t3'), 140000);
  assert.equal(map.get('t4'), 135000);
  // total akhir harus sama persis dgn recalcAccBalance() (SSOT saldo akun)
  assert.equal(ctx.recalcAccBalance('a1'), 135000);
});

test('computeAccRunningBalances() — urutan tampil (desc) tidak pengaruhi hasil akumulasi (dihitung dari urutan tanggal naik, bukan urutan array input)', () => {
  const D = makeD({ baseBalance: 0 });
  // sengaja dimasukkan TIDAK urut tanggal ke D.transactions
  D.transactions = [
    { id: 't2', accountId: 'a1', type: 'expense', amount: 10000, date: '2026-08-02' },
    { id: 't1', accountId: 'a1', type: 'income', amount: 100000, date: '2026-08-01' },
  ];
  const ctx = makeCtx(D);
  const map = ctx.computeAccRunningBalances('a1');
  assert.equal(map.get('t1'), 100000);
  assert.equal(map.get('t2'), 90000);
});

test('computeAccRunningBalances() — transaksi akun lain tidak ikut terhitung', () => {
  const D = makeD();
  D.accounts.push({ id: 'a2', name: 'Bank' });
  D.transactions = [
    { id: 't1', accountId: 'a1', type: 'income', amount: 50000, date: '2026-08-01' },
    { id: 't2', accountId: 'a2', type: 'income', amount: 999999, date: '2026-08-01' },
  ];
  const ctx = makeCtx(D);
  const map = ctx.computeAccRunningBalances('a1');
  assert.equal(map.size, 1);
  assert.equal(map.get('t1'), 50000);
});

// --- txTableHTML() / txTableRowHTML() -------------------------------------

test('txTableHTML() — accIdForBalance null (Semua Akun) -> kolom Saldo TIDAK dirender sama sekali', () => {
  const D = makeD({ baseBalance: 0 });
  D.transactions = [{ id: 't1', accountId: 'a1', type: 'income', amount: 50000, date: '2026-08-01', category: 'Gaji' }];
  const ctx = makeCtx(D);
  const html = ctx.txTableHTML(D.transactions, null);
  assert.doesNotMatch(html, /<th class="num">Saldo<\/th>/);
  assert.doesNotMatch(html, /tx-tbl-saldo/);
});

test('txTableHTML() — accIdForBalance diisi (1 akun) -> kolom Saldo dirender dgn nilai saldo berjalan benar', () => {
  const D = makeD({ baseBalance: 100000 });
  D.transactions = [
    { id: 't1', accountId: 'a1', type: 'income', amount: 50000, date: '2026-08-01', category: 'Gaji' },
    { id: 't2', accountId: 'a1', type: 'expense', amount: 20000, date: '2026-08-02', category: 'Makan' },
  ];
  const ctx = makeCtx(D);
  const html = ctx.txTableHTML(D.transactions, 'a1');
  assert.match(html, /<th class="num">Saldo<\/th>/);
  assert.match(html, /tx-tbl-saldo num">Rp 150\.000/);
  assert.match(html, /tx-tbl-saldo num">Rp 130\.000/);
});

test('txTableRowHTML() — data-action editTx & tombol hapus delTx tetap ada (pola klik sama persis txHTML kartu)', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't9', accountId: 'a1', type: 'expense', amount: 10000, date: '2026-08-05', category: 'Makan' };
  const row = ctx.txTableRowHTML(t, undefined);
  assert.match(row, /data-action="editTx" data-args="\["t9"\]"/);
  assert.match(row, /data-action="delTx"/);
});

test('txTableRowHTML() — tanpa balAfter (undefined) -> sel Saldo tidak dirender utk baris itu', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't9', accountId: 'a1', type: 'expense', amount: 10000, date: '2026-08-05', category: 'Makan' };
  const row = ctx.txTableRowHTML(t, undefined);
  assert.doesNotMatch(row, /tx-tbl-saldo/);
});

// --- Regresi: txHTML() (kartu, 10 tema lama) 0 berubah --------------------

test('txHTML() — regresi, tidak berubah sama sekali oleh perubahan s637 (kartu tetap dipakai apa adanya di jalur lama)', () => {
  const ctx = makeCtx(makeD());
  const t = { id: 't1', accountId: 'a1', type: 'expense', amount: 30000, date: '2026-08-05', category: 'Makan' };
  const html = ctx.txHTML(t);
  assert.match(html, /class="tx-item u-pointer" data-action="editTx"/);
  assert.doesNotMatch(html, /tx-tbl/);
});

// --- Wiring renderKeuangan() (modules-render.js) ---------------------------

test('renderKeuangan() — percabangan tema "modern" ke txTableHTML() ada di source, guard typeof, fallback txHTML() utk tema lain', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/modules-render.js'), 'utf8');
  assert.match(src, /D\.profile&&D\.profile\.theme==='modern'&&typeof txTableHTML==='function'/);
  assert.match(src, /const singleAccId=\(kf\.acc&&kf\.acc!=='semua'\)\?kf\.acc:null;/);
  assert.match(src, /allTxEl\.innerHTML=visible\.length\?txTableHTML\(visible,singleAccId\):allTxEmpty;/);
  assert.match(src, /allTxEl\.innerHTML=visible\.length\?visible\.map\(txHTML\)\.join\(''\):allTxEmpty;/);
});

test('CSS — class .tx-tbl* ada di styles.css (structural, dipakai txTableHTML)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /\.tx-tbl-wrap\s*\{/);
  assert.match(css, /\.tx-tbl\s*\{/);
});
