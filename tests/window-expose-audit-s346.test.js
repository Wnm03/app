'use strict';
// tests/window-expose-audit-s346.test.js — Sesi 346
//
// Lanjutan Sesi 345 (car-notes.js BBM/Servis/Torsi). Temuan tambahan sesi
// itu: pola `const Owner={...}` tanpa `window.Owner=Owner` kemungkinan juga
// ada di modul lain. Audit sesi ini mengonfirmasi & memperbaiki 13 modul:
// Budget, Aset, Kasir, Payroll, EduFund, LinkTx, WorthIt, LifeBalance,
// Refleksi, Pensiun, Etalase, Order, Sparepart.
//
// Akar masalah SAMA PERSIS Sesi 345: `const Owner={...}` top-level di script
// biasa (bukan module) HANYA membuat binding lexical-scope, BUKAN properti
// window — sementara dispatcher klik global
// (features-helpers-global-security.js) selalu resolve
// data-action="Owner.method" lewat window[Owner][method]. Tanpa
// window.Owner=Owner, SEMUA tombol dengan data-action berbentuk
// "Owner.xxx" di modul-modul ini gagal diam-diam (tidak ada error, tidak
// ada toast).
//
// Test ini memuat tiap file source ASLI (bukan re-implementasi) lewat
// harness vm loadSource(), lalu memverifikasi window.Owner benar-benar ada,
// identik dengan binding lexical-nya, dan method-nya bisa di-resolve gaya
// dispatcher nyata (window['Owner']['method']). Ini permanen menjaga supaya
// regresi pola ini tidak terulang lagi di modul manapun yang tercakup di
// sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Setiap entri: { name, files (dimuat berurutan agar dependensi lintas-file
// tersedia), sampleMethod (dipakai utk cek dispatcher-style lookup) }
const TARGETS = [
  { name: 'Budget', files: ['budget.js'], sampleMethod: 'getSettings' },
  { name: 'Aset', files: ['modules/asset/aset.js'], sampleMethod: 'openModal' },
  { name: 'Kasir', files: ['modules/business/kasir.js'], sampleMethod: 'render' },
  {
    name: 'Payroll',
    files: ['modules/business/reset-gaji-mingguan.js', 'modules/business/payroll-absensi.js'],
    sampleMethod: 'setWhTab',
  },
  { name: 'EduFund', files: ['modules/finance/edukasi-dana.js'], sampleMethod: 'openModal' },
  { name: 'LinkTx', files: ['modules/finance/linktx.js'], sampleMethod: 'open' },
  { name: 'WorthIt', files: ['modules/finance/worthit.js'], sampleMethod: 'onCategoryChange' },
  { name: 'LifeBalance', files: ['modules/home/hidup-seimbang.js'], sampleMethod: 'render' },
  { name: 'Refleksi', files: ['modules/home/refleksi-selfcare.js'], sampleMethod: 'open' },
  { name: 'Pensiun', files: ['modules/shared/modules-calc.js'], sampleMethod: 'avgSurplus' },
  { name: 'Etalase', files: ['modules/shop/cobek-etalase.js'], sampleMethod: 'parseSizeName' },
  { name: 'Order', files: ['modules/shop/cobek-order.js'], sampleMethod: 'openModal' },
  {
    name: 'Sparepart',
    files: ['car-notes.js', 'modules/vehicle/sparepart-servis.js'],
    sampleMethod: 'populateDatalist',
  },
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
