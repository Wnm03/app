'use strict';
// tests/data-health-check-asset-action-b11.test.js — Sesi B11 (QoL #5 rencana B1-B10):
// issue "Aset tertaut ke Holding Investasi yang sudah dihapus" (B6/B8) & "Kemungkinan
// Aset & Investasi dobel-catat" (B4) sekarang menyertakan field `assetId` di object
// issue, supaya konsumen render list (di luar file ini) bisa reuse dispatcher
// data-action="openAssetModal" data-args="[assetId]" yang sudah ada (lihat aset.js)
// utk tombol "Buka Aset" langsung dari saran, tanpa user cari manual. Harness sama
// persis tests/data-health-check-asset-investmentid-orphan-b6.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(assets, investments) {
  return {
    assets, investments,
    accounts: [], vehicles: [], transactions: [], bills: [], bbmLogs: [], piutang: [],
    partsStock: [], debts: [], budgets: [], categories: { income: [], expense: [] },
    cobek: [], lifeBalanceSnapshots: [], products: [], servisLogs: [], wealthSnapshots: [],
    wishlist: [], workDays: [],
  };
}

function makeFakeEl() {
  return { innerHTML: '' };
}

function run(assets, investments, extraCtx) {
  const D = makeD(assets, investments);
  const summaryEl = makeFakeEl();
  const listEl = makeFakeEl();
  const els = { dataHealthSummary: summaryEl, dataHealthList: listEl };
  const document = { getElementById: (id) => els[id] || makeFakeEl() };
  const ctx = loadSource(
    ['data-health-check.js'],
    Object.assign(
      {
        D, document, openModal: () => {}, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s),
        fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      },
      extraCtx || {},
    ),
  );
  const issues = ctx.runDataHealthCheck();
  return { issues, listHtml: listEl.innerHTML };
}

test('runDataHealthCheck: issue orphan investmentId menyertakan assetId + tombol Buka Aset', () => {
  const { issues, listHtml } = run(
    [{ id: 'a_ghost1', name: 'RDPU X', nilai: 10000000, investmentId: 'inv_ghost' }],
    [],
  );
  const found = issues.find((i) => i.title === 'Aset tertaut ke Holding Investasi yang sudah dihapus');
  assert.ok(found, 'issue orphan investmentId harus muncul');
  assert.equal(found.assetId, 'a_ghost1');
  assert.match(listHtml, /data-action="openAssetModal"/);
  assert.match(listHtml, /a_ghost1/);
});

test('runDataHealthCheck: issue saran dobel-catat (B4) menyertakan assetId + tombol', () => {
  // Guard typeof Aset di data-health-check.js -- suplai Aset palsu minimal
  // yang cuma expose _findInvestmentMigrationCandidates(), pola sama pendekatan
  // guard optional-dependency lain di file ini.
  const fakeAset = {
    _findInvestmentMigrationCandidates: () => [
      { assetId: 'a_pair1', assetName: 'Emas Antam', assetNilai: 5000000, holdingId: 'h1', holdingName: 'Emas Antam', holdingValue: 5100000 },
    ],
  };
  const { issues, listHtml } = run([], [], { Aset: fakeAset });
  const found = issues.find((i) => i.title === 'Kemungkinan Aset & Investasi dobel-catat (belum ditautkan)');
  assert.ok(found, 'issue saran dobel-catat harus muncul');
  assert.equal(found.assetId, 'a_pair1');
  assert.match(listHtml, /data-action="openAssetModal"/);
  assert.match(listHtml, /a_pair1/);
});

test('runDataHealthCheck: issue TANPA assetId tidak dapat tombol (regresi)', () => {
  const { listHtml } = run(
    [{ id: 'a1', name: 'Rumah', nilai: 1, accountId: 'acc_ghost' }],
    [],
  );
  assert.match(listHtml, /Aset dengan akun tautan tidak valid/);
  // Pastikan blok issue ini tidak ikut kebawa tombol openAssetModal dari issue lain.
  const errCountBtn = (listHtml.match(/data-action="openAssetModal"/g) || []).length;
  assert.equal(errCountBtn, 0);
});

test('runDataHealthCheck: regresi -- title/detail/level tidak berubah', () => {
  const { issues } = run(
    [{ id: 'a1', name: 'RDPU X', nilai: 10000000, investmentId: 'inv_ghost' }],
    [],
  );
  const found = issues.find((i) => i.title === 'Aset tertaut ke Holding Investasi yang sudah dihapus');
  assert.equal(found.level, 'warn');
  assert.match(found.detail, /RDPU X/);
  assert.match(found.detail, /Kekayaan Bersih/);
});
