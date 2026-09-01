'use strict';
// tests/s698-dashboard-kategori-click-tosource.test.js — Sesi S698 (item
// tertunda dari S697: "kategori di dashboard ringkasan bisa dapat pola
// klik-ke-sumber yang sama seperti Fix 1").
//
// Fix 2a — modules/finance/filter-laporan.js: showFilteredTx() parameter
// opsional ke-5 `kat` SEBELUMNYA cuma diterapkan di blok scope 'laporan'
// (S694). Ditambah guard yang sama persis (`if(kat)txs=txs.filter(t=>
// t.category===kat);`) ke blok scope 'dashboard'. Aditif murni: pemanggil
// lama scope 'dashboard' tanpa argumen ke-5 (mis. kartu "Pemasukan"/
// "Pengeluaran" bulan ini) 0 regresi karena kat default undefined -> guard
// skip.
//
// Fix 2b — modules/shared/modules-render-b.js: tiap baris kategori di
// #dashLapKatMini (renderDashLaporanMini()) dibungkus data-action=
// "showFilteredTx" + data-args escaped JSON berisi
// ['dashboard','all','📁 <kategori>',null,'<kategori>'] — pola SAMA PERSIS
// dgn #lapKat (Fix 1 / S694, sudah direlokasi ke file live yang sama di
// S697). Dites secara STRUKTURAL (regex atas source asli, pola sama
// tests/s694-laporan-kategori-click-tosource.test.js) karena
// renderDashLaporanMini() dipanggil dari alur render Dashboard yang berat
// (banyak dependency lintas modul) — di luar cakupan wajar 1 sesi untuk
// dijalankan terisolasi lewat loadSource.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, value: '', ...initial };
}

function makeCtx(D) {
  const els = {
    filterTxTitle: makeEl(),
    filterTxSummary: makeEl(),
    filterTxOwnerSplit: null,
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
  };
  const fakeDoc = {
    getElementById: (id) => (id in els ? els[id] : null),
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
  };
  const ctx = loadSource(
    ['modules/finance/filter-laporan.js'],
    {
      document: fakeDoc,
      D,
      sameId: (a, b) => String(a) === String(b),
      fmt: (n) => 'Rp' + n,
      escapeHtml: (s) => String(s),
      txHTML: (t) => `<div data-id="${t.id}"></div>`,
      openModal: () => {},
      getRange: () => ({ from: new Date('2026-01-01'), to: new Date('2026-12-31') }),
    },
    [],
  );
  return { ctx, els };
}

// Bulan berjalan (September 2026) — samakan dengan tanggal `now` sesungguhnya
// dipakai showFilteredTx(scope='dashboard'), bukan hardcode bulan lampau.
const D_BASE = {
  accounts: [{ id: 'acc1', name: 'BCA' }],
  transactions: [
    { id: 't1', accountId: 'acc1', type: 'expense', amount: 100000, date: '2026-09-05', category: 'Makan' },
    { id: 't2', accountId: 'acc1', type: 'expense', amount: 50000, date: '2026-09-06', category: 'Transport' },
    { id: 't3', accountId: 'acc1', type: 'income', amount: 200000, date: '2026-09-07', category: 'Makan' },
    { id: 't4', accountId: 'acc1', type: 'expense', amount: 999000, date: '2026-08-05', category: 'Makan' },
  ],
};

test('showFilteredTx(scope=dashboard, kat diisi) — hanya transaksi bulan berjalan + kategori itu yang ikut', () => {
  const { ctx, els } = makeCtx(D_BASE);
  ctx.showFilteredTx('dashboard', 'all', '📁 Makan', null, 'Makan');
  // t1 (expense Makan, Sep) + t3 (income Makan, Sep) ikut; t2 (Transport)
  // dan t4 (Makan tapi bulan Agustus, di luar bulan berjalan) tidak.
  assert.equal(els.filterTxSummary.textContent, '2 transaksi · Total Rp100000');
});

test('showFilteredTx(scope=dashboard, kat kosong/undefined) — 0 regresi, pola lama tetap jalan (semua kategori bulan berjalan)', () => {
  const { ctx, els } = makeCtx(D_BASE);
  ctx.showFilteredTx('dashboard', 'all', 'Semua', null);
  // t1+t2+t3 (3 tx bulan Sep), t4 (Agustus) tetap dikecualikan oleh filter
  // bulan berjalan yang sudah ada sebelumnya (bukan oleh fix sesi ini).
  assert.equal(els.filterTxSummary.textContent, '3 transaksi · Total Rp50000');
});

test('showFilteredTx(scope!==dashboard, mis. laporan) — perilaku existing scope lain tidak berubah', () => {
  const { ctx, els } = makeCtx(D_BASE);
  ctx.showFilteredTx('laporan', 'all', '📁 Makan', null, 'Makan');
  // t1+t3+t4 (semua Makan expense/income, transfer excluded, periode getRange
  // penuh tahun 2026) — scope laporan tidak terpengaruh fix scope dashboard.
  assert.equal(els.filterTxSummary.textContent, '3 transaksi · Total -Rp899000');
});

test('showFilteredTx() scope dashboard — kode sumber punya guard filter by kat (cek struktural)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'finance', 'filter-laporan.js'), 'utf8');
  const idx = src.indexOf("if(scope==='dashboard'){");
  assert.ok(idx >= 0, "blok scope 'dashboard' tidak ditemukan");
  const block = src.slice(idx, idx + 900);
  assert.match(block, /if\(kat\)txs=txs\.filter\(t=>t\.category===kat\);/,
    "scope dashboard harus filter tambahan by kat kalau diisi, pola sama scope laporan");
});

test('#dashLapKatMini (renderDashLaporanMini(), modules/shared/modules-render-b.js) — tiap baris kategori dibungkus data-action="showFilteredTx" + data-args ke dashboard/all/kat', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules', 'shared', 'modules-render-b.js'), 'utf8');
  const idx = src.indexOf('function renderDashLaporanMini(');
  assert.ok(idx >= 0, 'renderDashLaporanMini() tidak ditemukan');
  const block = src.slice(idx, idx + 3000);
  assert.match(block, /katEl\.innerHTML=ks\.length\?ks\.map/,
    'blok render katEl (#dashLapKatMini) tidak ditemukan di dalam fungsi');
  assert.match(block, /data-action="showFilteredTx"/,
    'baris kategori dashboard harus punya data-action="showFilteredTx"');
  assert.match(block, /data-args="\$\{escapeHtml\(JSON\.stringify\(\['dashboard','all','📁 '\+k,null,k\]\)\)\}"/,
    "data-args harus JSON.stringify(['dashboard','all','📁 '+k,null,k]) yang di-escapeHtml, pola sama data-args #lapKat");
});
