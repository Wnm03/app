'use strict';
// tests/window-expose-audit-s347.test.js — Sesi 347
//
// Lanjutan Sesi 346 (13 modul). Audit penuh source-tree sesi ini menemukan
// 30 modul TAMBAHAN dengan pola bug yang sama: `const Owner={...}` top-level
// tanpa `window.Owner=Owner`, dipakai lewat data-action="Owner.xxx" yang
// di-resolve dispatcher global lewat window[Owner][method].
//
// Deviasi sesi ini: DashboardHub dites di sandbox vm TANPA global `window`
// sama sekali (lihat tests/dashboard-hub-goto-subtab.test.js), jadi guard-nya
// dibuat `if (typeof window !== 'undefined' && typeof Owner !== 'undefined')`
// supaya tidak throw ReferenceError di sana — pola ini sudah ada presedennya
// di scanner-session.js & ai-core.js. 29 modul lain tetap pakai guard biasa
// `if (typeof Owner !== 'undefined')` sama seperti Sesi 345/346.
//
// Sama seperti test s346: load file source ASLI lewat harness vm
// loadSource(), verifikasi window.Owner ada, identik dgn binding lexical-nya
// (bukan copy), dan method-nya bisa di-resolve gaya dispatcher nyata.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const TARGETS = [
  { name: 'Advisor', files: ['ai-chat.js'], sampleMethod: 'setTab' },
  { name: 'AIRecommendCard', files: ['ai-chat.js'], sampleMethod: 'markDismissed' },
  { name: 'AIStatusCard', files: ['ai-chat.js'], sampleMethod: 'render' },
  { name: 'AISimulateWidget', files: ['ai-chat.js'], sampleMethod: 'run' },
  { name: 'AIScenarioWidget', files: ['ai-chat.js'], sampleMethod: 'run' },
  { name: 'AIHealthCheckWidget', files: ['ai-chat.js'], sampleMethod: 'run' },
  { name: 'AIWidget', files: ['ai-chat.js'], sampleMethod: 'generate' },
  { name: 'BudgetTabs', files: ['budget.js'], sampleMethod: 'switchTo' },
  { name: 'BudgetReko', files: ['budget.js'], sampleMethod: 'getSettings' },
  { name: 'GoldImport', files: ['modules/asset/aset-emas-impor.js'], sampleMethod: 'open' },
  { name: 'GoldZakat', files: ['modules/asset/aset-emas-impor.js'], sampleMethod: 'totalGram24kEquiv' },
  {
    name: 'Tukang',
    files: ['modules/business/reset-gaji-mingguan.js', 'modules/business/tukang-absensi.js'],
    sampleMethod: 'toggleWorkerHistory',
  },
  { name: 'DashboardHub', files: ['modules/dashboard-hub/dashboard-hub.js'], sampleMethod: 'setSectionTab' },
  { name: 'RefAI', files: ['modules/finance/pajak-pbb-zakat.js'], sampleMethod: 'systemPrompt' },
  { name: 'Bill', files: ['modules/finance/piutang-utang.js'], sampleMethod: 'openLinkTxModal' },
  { name: 'BillFallbackScan', files: ['modules/finance/tagihan-kalender.js'], sampleMethod: 'confirmSelected' },
  { name: 'DanaDaruratAI', files: ['modules/shared/modules-calc.js'], sampleMethod: 'computeRecommendation' },
  { name: 'FinCoach', files: ['modules/shared/modules-calc.js'], sampleMethod: 'compute' },
  { name: 'BillMultiScan', files: ['modules/shared/scan-ocr.js'], sampleMethod: 'importSelected' },
  { name: 'UniversalScan', files: ['modules/shared/scan-ocr.js'], sampleMethod: 'scan' },
  { name: 'PriceReko', files: ['modules/shop/cobek-pricing.js'], sampleMethod: 'reset' },
  { name: 'OngkirCalc', files: ['modules/shop/cobek-pricing.js'], sampleMethod: 'getProdusenId' },
  { name: 'PriceRekoWidget', files: ['modules/shop/cobek-pricing.js'], sampleMethod: 'avgMarginForKategori' },
  { name: 'StockRekoWidget', files: ['modules/shop/cobek-pricing.js'], sampleMethod: 'groupForScan' },
  { name: 'WeightBulkWidget', files: ['modules/shop/cobek-pricing.js'], sampleMethod: 'applyBulk' },
  { name: 'LifeOSHome', files: ['lifeos/ui/lifeos-home.js'], sampleMethod: 'switchPanel' },
  { name: 'LifeOSLifeObjects', files: ['lifeos/ui/life-objects.js'], sampleMethod: 'createGeneric' },
  { name: 'LifeOSPlugins', files: ['lifeos/ui/plugins.js'], sampleMethod: 'register' },
  { name: 'LifeOSProjects', files: ['lifeos/ui/projects.js'], sampleMethod: 'createGeneric' },
  { name: 'LifeOSReview', files: ['lifeos/ui/review.js'], sampleMethod: 'startWeekly' },
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
