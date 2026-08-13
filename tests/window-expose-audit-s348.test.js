'use strict';
// tests/window-expose-audit-s348.test.js — Sesi 348
//
// Lanjutan Sesi 345/346/347 (14 + 30 modul). Audit ulang penuh source-tree
// (semua top-level `const X={`/`let X={`/`var X={` yang dipakai lewat
// `data-action="X.xxx"` tapi TANPA `window.X=X`) menemukan 1 modul lagi yang
// terlewat di audit-audit sebelumnya: `AlokasiAset` di `modules/asset/aset.js`
// — file yang sama dengan `Aset` (sudah diperbaiki Sesi 346), tapi
// `AlokasiAset` adalah const TERPISAH yang luput karena audit sebelumnya
// mengira 1 fix per file sudah cukup padahal file ini punya banyak const
// top-level (ALOKASI_PRESETS, AlokasiAset, AssetInsight, Aset, Penyusutan,
// PajakAset, LaporanAset, IDBStore, PORTFOLIO_LABELS, TimelineW).
//
// Root cause SAMA PERSIS Sesi 345/346/347: `const AlokasiAset={...}`
// top-level HANYA membuat binding lexical-scope, BUKAN properti window —
// sementara 3 tombol chip risiko alokasi aset (Konservatif/Moderat/Agresif,
// lihat app_production.html & index.html) pakai
// data-action="AlokasiAset.setRisk" yang di-resolve dispatcher global lewat
// window['AlokasiAset']['setRisk']. Tanpa window.AlokasiAset=AlokasiAset,
// ketiga tombol itu gagal diam-diam.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const TARGETS = [
  { name: 'AlokasiAset', files: ['modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'], sampleMethod: 'setRisk' },
];

for (const { name, files, sampleMethod } of TARGETS) {
  test(`${files[files.length - 1]} — window.${name} ter-ekspos utk dispatcher data-action global`, () => {
    const ctx = loadSource(files);
    assert.equal(typeof ctx.window[name], 'object', `window.${name} harus ada (dipakai data-action="${name}.xxx")`);
  });

  test(`${files[files.length - 1]} — window.${name} adalah objek yang SAMA dengan binding lexical (bukan copy)`, () => {
    const ctx = loadSource(files, {}, [name]);
    assert.strictEqual(ctx.window[name], ctx[name], `window.${name} harus referensi identik ke const ${name}, bukan objek terpisah`);
  });

  test(`${files[files.length - 1]} — dispatcher-style lookup window["${name}"]["${sampleMethod}"] berhasil resolve method nyata`, () => {
    const ctx = loadSource(files);
    assert.equal(typeof ctx.window[name][sampleMethod], 'function');
  });
}
