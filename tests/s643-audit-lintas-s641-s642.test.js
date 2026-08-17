'use strict';
// tests/s643-audit-lintas-s641-s642.test.js — cakupan Sesi s643
// (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md, sesi PENUTUP): audit
// lintas modul s641 (Riwayat) + s642 (Dana Titipan mini-tabel), pola sama
// persis test audit s636-s639 di tests/s640-modern-theme-registration-audit.test.js.
// Tujuan: verifikasi ULANG (bukan cuma baca changelog) bahwa gating kedua
// sesi masih konsisten & tidak ada regresi ke jalur kartu/tema lama.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('audit — s641 Riwayat (#filterTxList) tetap gated via D.profile.theme==="modern" di showFilteredTx()', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/finance/filter-laporan.js'), 'utf8');
  assert.match(src, /D\.profile&&D\.profile\.theme==='modern'&&typeof txTableHTML==='function'/);
  assert.match(src, /visible\.map\(txHTML\)\.join\(''\)/, 'jalur kartu txHTML() masih ada apa adanya utk 10 tema lama');
});

test('audit — s641 kolom saldo berjalan Riwayat tetap kondisional scope==="account" (bukan selalu tampil)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/finance/filter-laporan.js'), 'utf8');
  assert.match(src, /scope==='account'\?accId:null/);
});

test('audit — s642 mini-tabel Dana Titipan tetap gated via D.profile.theme==="modern" di _returnsHistoryHtml()', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render.js'), 'utf8');
  assert.match(src, /D\.profile\s*&&\s*D\.profile\.theme\s*===\s*'modern'/);
  assert.match(src, /class="u-flex u-jcb u-fs11 u-mb2 u-ml10"/, 'jalur div/flex lama masih ada apa adanya utk 10 tema lain');
});

test('audit — s642 struktur <details> kartu owner Dana Titipan (S631-S634) tidak diubah', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render.js'), 'utf8');
  assert.match(src, /<details class="u-mb6\$\{o\.allocationStatus === 'OVER_ALLOCATED' \? ' titipan-owner-alert' : ''\}" id="titipanOwnerCard_\$\{oi\}">/);
});

test('audit — CSS .tx-tbl* dipakai s641/s642 reuse dari s637, 0 class baru di styles.css sejak s637', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /\.tx-tbl-wrap\s*\{/);
  assert.match(css, /\.tx-tbl\s*\{/);
});

test('audit — cakupan Ledger Pro genap 5/5 layar: Beranda/Uang/Aset/Riwayat/Titipan semua py gating "modern"', () => {
  const files = {
    'Beranda (ticker)': ['modules/dashboard-hub/dashboard-hub.js', /dashhub-ticker/],
    'Uang (#allTx)': ['modules/shared/modules-render.js', /theme==='modern'/],
    'Aset (#assetList)': ['modules/asset/aset.js', /theme==='modern'/],
    'Riwayat (#filterTxList)': ['modules/finance/filter-laporan.js', /theme==='modern'/],
    'Dana Titipan (returns)': ['modules/finance/dana-titipan-portfolio-render.js', /theme\s*===\s*'modern'/],
  };
  for (const [label, [file, pattern]] of Object.entries(files)) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(src, pattern, `${label} (${file}) tidak ditemukan gating modern`);
  }
});
