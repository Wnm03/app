'use strict';
// tests/s641-riwayat-tabel-modern.test.js — cakupan Sesi s641
// (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md): perluasan pola tabel
// Ledger Pro (dari s637, tx-list-cashflow.js) ke #filterTxList (Riwayat),
// KHUSUS D.profile.theme==='modern'. Proof-test terpisah krn perubahan
// struktural DOM (bukan cuma styling), pola sama persis s637.
//
// Cakupan: (1) showFilteredTx() (filter-laporan.js) percabangan tema via
// string-check source (fungsinya besar & bergantung banyak helper global,
// verifikasi wiring lewat pembacaan source — pola sama dgn test wiring
// renderKeuangan() di s637). (2) Kolom saldo berjalan HANYA aktif saat
// scope==='account' (1 akun spesifik) — scope lain (dashboard/keuangan/
// laporan) lintas-akun sehingga null (kolom Saldo otomatis disembunyikan
// oleh txTableHTML, sudah diverifikasi di s637). (3) Batch "muat lebih
// banyak" ikut jalur yang sama (append <tr> via txTableRowHTML ke tbody
// yang sudah ada, bukan txTableHTML penuh — supaya tidak nyisipin
// <table>/<thead> baru di tengah). (4) 0 perubahan ke txHTML() lama /
// jalur kartu utk 10 tema lain.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'modules/finance/filter-laporan.js'), 'utf8');

test('showFilteredTx() — percabangan tema "modern" ke txTableHTML() ada, guard typeof, fallback txHTML() utk tema lain', () => {
  assert.match(src, /D\.profile&&D\.profile\.theme==='modern'&&typeof txTableHTML==='function'/);
  assert.match(
    src,
    /document\.getElementById\('filterTxList'\)\.innerHTML=visible\.length\?txTableHTML\(visible,scope==='account'\?accId:null\):ftxEmpty;/
  );
  assert.match(
    src,
    /document\.getElementById\('filterTxList'\)\.innerHTML=visible\.length\?visible\.map\(txHTML\)\.join\(''\):ftxEmpty;/
  );
});

test('showFilteredTx() — saldo berjalan hanya di-pass accId saat scope==="account" (lintas-akun -> null, kolom Saldo disembunyikan txTableHTML)', () => {
  assert.match(src, /scope==='account'\?accId:null/);
});

test('showFilteredTx() — batch "muat lebih banyak" tema modern append <tr> via txTableRowHTML ke tbody existing, bukan txTableHTML penuh', () => {
  assert.match(src, /typeof txTableRowHTML==='function'/);
  assert.match(src, /document\.querySelector\('#filterTxList \.tx-tbl tbody'\)/);
  assert.match(src, /tbody\.insertAdjacentHTML\('beforeend',nextBatch\.map\(t=>txTableRowHTML\(t,balMap\?balMap\.get\(t\.id\):undefined\)\)\.join\(''\)\)/);
});

test('showFilteredTx() — batch "muat lebih banyak" fallback txHTML() apa adanya utk 10 tema lain (0 regresi)', () => {
  assert.match(
    src,
    /document\.getElementById\('filterTxList'\)\.insertAdjacentHTML\('beforeend',nextBatch\.map\(txHTML\)\.join\(''\)\);/
  );
});

test('showFilteredTx() — computeAccRunningBalances() dipanggil ulang utk batch lanjutan dgn accId yg sama (bukan balMap penuh di-passing lintas closure)', () => {
  assert.match(
    src,
    /const balMap=scope==='account'&&typeof computeAccRunningBalances==='function'\?computeAccRunningBalances\(accId\):null;/
  );
});
