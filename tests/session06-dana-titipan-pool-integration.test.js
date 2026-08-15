'use strict';
// tests/session06-dana-titipan-pool-integration.test.js — SESSION 6
// (INTEGRATION & BUILD) — MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md §15
// (File Dependency Map / urutan build.js), §20 (scope Sesi 6), §18
// skenario Q (regression guard build().totals shape) + R (guard commitment
// tidak aktif saat NOT_MIGRATED, sudah dites session03 — di sini hanya
// smoke-check ulang lewat urutan load build.js yang sesungguhnya).
//
// TIDAK di-test ulang di sini: logic data layer (Sesi 1), status/agregasi
// (Sesi 2), guard commitment (Sesi 3), UI dashboard/modal (Sesi 4), "Isi
// dari Sisa" (Sesi 5) — semua itu sudah py punya test filenya sendiri
// (session01-05) dan TIDAK diulang (aturan §20 poin 4: "Jangan ulangi
// kerjaan sesi sebelumnya"). Fokus sesi ini murni WIRING: apakah
// scripts/build.js benar-benar mendaftarkan dana-titipan-pool-api.js
// SEBELUM dana-titipan-commitment-return-api.js (§15), dan apakah
// menjalankan seluruh trio + pool-api sesuai urutan build.js sungguhan
// (dibaca langsung dari file, bukan disalin manual) tidak menimbulkan
// error at load-time maupun merusak kontrak totals existing (s484).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const BUILD_JS_PATH = path.join(__dirname, '..', 'scripts', 'build.js');

function baseD(overrides) {
  return Object.assign({
    assets: [], investments: [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], titipanPool: [],
  }, overrides || {});
}

test('1. scripts/build.js mendaftarkan dana-titipan-pool-api.js SEBELUM dana-titipan-commitment-return-api.js (§15)', () => {
  const src = fs.readFileSync(BUILD_JS_PATH, 'utf8');
  const idxPool = src.indexOf("'modules/finance/dana-titipan-pool-api.js'");
  const idxAgg = src.indexOf("'modules/finance/dana-titipan-aggregation-api.js'");
  const idxGuard = src.indexOf("'modules/finance/dana-titipan-commitment-return-api.js'");
  const idxRender = src.indexOf("'modules/finance/dana-titipan-portfolio-render.js'");
  assert.ok(idxPool !== -1, 'dana-titipan-pool-api.js tidak ditemukan terdaftar di build.js');
  assert.ok(idxAgg !== -1 && idxGuard !== -1 && idxRender !== -1, 'trio existing tidak ditemukan di build.js');
  assert.ok(idxPool < idxAgg, 'pool-api.js harus terdaftar sebelum aggregation-api.js');
  assert.ok(idxAgg < idxGuard, 'urutan trio existing (aggregation < commitment-return) tidak boleh berubah');
  assert.ok(idxGuard < idxRender, 'urutan trio existing (commitment-return < portfolio-render) tidak boleh berubah');
});

test('2. scripts/build.js mendaftarkan pool-api.js PERSIS SEKALI (tidak dobel, tidak hilang saat disisip)', () => {
  const src = fs.readFileSync(BUILD_JS_PATH, 'utf8');
  const matches = src.match(/'modules\/finance\/dana-titipan-pool-api\.js'/g) || [];
  assert.equal(matches.length, 1, `dana-titipan-pool-api.js terdaftar ${matches.length}x di build.js, harus tepat 1x`);
});

test('3. Root finance/ (stale) TIDAK didaftarkan/disentuh oleh perubahan Sesi 6 (§17)', () => {
  const src = fs.readFileSync(BUILD_JS_PATH, 'utf8');
  // Baris yang barusan ditambah Sesi 6 hanya menyisipkan 1 entry modules/finance/dana-titipan-pool-api.js;
  // pastikan tidak ada referensi baru ke folder root finance/dana-titipan* (tanpa prefix modules/).
  const rootRefs = (src.match(/(?<!modules\/)finance\/dana-titipan[a-z0-9-]*\.js/g) || []);
  assert.deepEqual(rootRefs, [], `ditemukan referensi ke root finance/ yang seharusnya tidak disentuh: ${rootRefs.join(', ')}`);
});

test('4. INTEGRASI: load pool-api.js + aggregation-api.js + commitment-return-api.js + portfolio-render.js persis urutan build.js sungguhan -> tidak error, DanaTitipanPoolAPI & DanaTitipanPortfolioAPI sama-sama global', () => {
  const D = baseD();
  const dom = { getElementById() { return { id: '', className: '', style: {}, textContent: '', value: '', innerHTML: '' }; } };
  const ctx = loadSource(
    [
      'modules/finance/dana-titipan-pool-api.js',
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp' + Math.round(n || 0), fmtFull: (n) => 'Rp' + Math.round(n || 0),
    },
    ['DanaTitipanPoolAPI', 'DanaTitipanPortfolioAPI'],
  );
  assert.equal(typeof ctx.DanaTitipanPoolAPI, 'object');
  assert.equal(typeof ctx.DanaTitipanPoolAPI.status, 'function');
  assert.equal(typeof ctx.DanaTitipanPortfolioAPI, 'object');
  assert.equal(typeof ctx.DanaTitipanPortfolioAPI.saveCommitment, 'function');
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'NOT_MIGRATED');
});

test('5. Q — REGRESSION GUARD: build().totals shape TIDAK berubah setelah Sesi 1-6 (kontrak existing s484 tetap exact keys yang sama)', () => {
  const D = baseD({
    titipanCommitments: [{ id: 'c1', ownerId: 'o1', ownerName: 'A', principalAmount: 10000, committedDate: '2026-01-01', notes: '', createdAt: 1, updatedAt: 1 }],
  });
  const dom = { getElementById() { return { id: '', className: '', style: {}, textContent: '', value: '', innerHTML: '' }; } };
  const ctx = loadSource(
    [
      'modules/finance/dana-titipan-pool-api.js',
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp' + Math.round(n || 0), fmtFull: (n) => 'Rp' + Math.round(n || 0),
    },
    ['DanaTitipanPortfolioAPI'],
  );
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const keys = Object.keys(p.totals);
  assert.deepEqual(
    keys.sort(),
    ['allocatedPrincipalTotal', 'currentValueTotal', 'gainTotal', 'principalAmountTotal',
      'estimatedUnallocatedTotal', 'overAllocatedTotal', 'returnedTotalSum', 'outstandingPrincipalTotal'].sort(),
    'build().totals mendapat/kehilangan key -- ini dilarang keras (§4/§17 Master Handoff, kontrak s484)',
  );
  // Pastikan tidak ada key baru bertema pool (poolMasukTotal/poolAllocated/poolUnallocated) yang
  // nyelonong masuk ke totals ini -- itu WAJIB tetap hidup terpisah di DanaTitipanPoolAPI (§16 larangan awal).
  assert.ok(!('poolMasukTotal' in p.totals));
  assert.ok(!('poolAllocated' in p.totals));
  assert.ok(!('poolUnallocated' in p.totals));
});

test('6. R (re-check integrasi) — guard commitment TIDAK aktif saat NOT_MIGRATED walau seluruh chain (pool-api+trio) dimuat sungguhan lewat urutan build.js', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'oOld', porsi: 100, ownerName: 'DataLama', isSelf: false }] }],
    titipanCommitments: [{ id: 'cOld', ownerId: 'oOld', ownerName: 'DataLama', principalAmount: 7000000, committedDate: '2026-01-01', notes: '', createdAt: 1, updatedAt: 1 }],
  });
  const dom = { getElementById() { return { id: '', className: '', style: {}, textContent: '', value: '', innerHTML: '' }; } };
  const ctx = loadSource(
    [
      'modules/finance/dana-titipan-pool-api.js',
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp' + Math.round(n || 0), fmtFull: (n) => 'Rp' + Math.round(n || 0),
    },
    ['DanaTitipanPortfolioAPI', 'DanaTitipanPoolAPI'],
  );
  assert.equal(ctx.DanaTitipanPoolAPI.status(), 'NOT_MIGRATED');
  // Edit data lama (naikkan nominal) TANPA pool pernah diisi -- harus tetap bisa disimpan (tidak
  // ada guard yang memblokir), persis perilaku existing sebelum fitur pool ada (§8 rule 2/4, §12).
  assert.doesNotThrow(() => {
    ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'oOld', ownerName: 'DataLama', principalAmount: 8000000, committedDate: '2026-01-02', notes: '' });
  });
  const updated = D.titipanCommitments.find((c) => c.ownerId === 'oOld');
  assert.equal(updated.principalAmount, 8000000);
});
