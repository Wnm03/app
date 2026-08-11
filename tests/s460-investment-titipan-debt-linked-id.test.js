'use strict';
// tests/s460-investment-titipan-debt-linked-id.test.js — Sesi 460
// (rekomendasi #3 audit "dana titipan" Sesi 458): entri Buku Utang hasil
// titipan investasi (Investment._syncTitipanDebt()) SEBELUM sesi ini TIDAK
// PUNYA penanda apa pun di object utangnya sendiri -- beda dari titipan
// aset yang sudah ditandai `linkedAssetId`/`linkedOwnerId` sejak Sesi 455.
// Akibatnya: (a) badge "🔒 Titipan — bukan kewajiban dibayar" di Buku
// Utang cuma nongol utk titipan aset, dan (b) titipan investasi SALAH
// MASUK DebtStrategy.activeDebts() (ikut disimulasikan snowball/avalanche
// padahal bukan kewajiban riil, bunga/cicilan-nya selalu 0).
//
// FIX: tag debt dgn `linkedInvestmentId:h.id` (pola SAMA PERSIS
// `linkedAssetId`), lalu badge & activeDebts() exclude filter dilebarkan
// utk mengenali kedua penanda.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- Investment._syncTitipanDebt() — tagging ------------------------------

function makeInvCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/investasi.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {} },
    ['Investment', 'OwnershipEngine'],
  );
}

test('Investment.addHolding() — fundSource:"titipan" bikin entry Buku Utang ditandai linkedInvestmentId=h.id', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Reksadana X', unit: 0, avgPrice: 0, currentPrice: 1000, fundSource: 'titipan', titipanOwner: 'Budi' });
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].linkedInvestmentId, h.id);
  assert.equal(D.debts[0].id, h.debtLinkId);
});

test('Investment.updateHolding() — toggle "titipan"->"sendiri" menghapus debt tertaut, toggle balik ke "titipan" bikin lagi dgn linkedInvestmentId tetap terisi', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Emas', unit: 1, avgPrice: 900000, currentPrice: 950000, fundSource: 'titipan', titipanOwner: 'Ayah' });
  assert.equal(D.debts.length, 1);
  ctx.Investment.updateHolding(h.id, { fundSource: 'sendiri' });
  assert.equal(D.debts.length, 0, 'balik ke sendiri -> debt tertaut dihapus');
  ctx.Investment.updateHolding(h.id, { fundSource: 'titipan' });
  assert.equal(D.debts.length, 1, 'balik lagi ke titipan -> debt dibuat ulang');
  assert.equal(D.debts[0].linkedInvestmentId, h.id);
});

test('Investment._syncTitipanDebt() — UPDATE debt yg sudah ada (bukan bikin baru) tetap pertahankan linkedInvestmentId', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Saham Y', unit: 10, avgPrice: 5000, currentPrice: 5500, fundSource: 'titipan', titipanOwner: 'Ibu' });
  const before = D.debts.length;
  ctx.Investment.updateHolding(h.id, { notes: 'catatan baru' }); // patch tidak sentuh fundSource, cuma re-sync
  assert.equal(D.debts.length, before, 'tidak bikin entry duplikat');
  assert.equal(D.debts[0].linkedInvestmentId, h.id);
});

// --- piutang-utang.js — badge & DebtStrategy exclude ----------------------

function makeDebtCtx(D) {
  return loadSource(
    ['modules/finance/piutang-utang.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), save: () => {}, sameId: (a, b) => a === b },
    ['Debt', 'DebtStrategy'],
  );
}

test('DebtStrategy.activeDebts() — entri titipan investasi (linkedInvestmentId) TIDAK ikut, utang biasa & titipan aset tetap sesuai perilaku lama', () => {
  const D = {
    debts: [
      { id: 'd1', name: 'KTA Bank X', nilai: 3000000, lunas: false, bunga: 10, cicilanBulanan: 250000 },
      { id: 'd2', name: 'Investor Aset', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedAssetId: 'a1', linkedOwnerId: 'inv1' },
      { id: 'd3', name: 'Budi', nilai: 1000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedInvestmentId: 'i1' },
    ],
    bills: [],
  };
  const ctx = makeDebtCtx(D);
  const active = ctx.DebtStrategy.activeDebts();
  assert.equal(active.some((d) => d.id === 'd1'), true, 'utang biasa tetap ikut');
  assert.equal(active.some((d) => d.id === 'd2'), false, 'titipan aset tetap di-exclude (regresi S455)');
  assert.equal(active.some((d) => d.id === 'd3'), false, 'titipan investasi (BARU) sekarang di-exclude');
});

test('Debt.totalValue() — titipan investasi (linkedInvestmentId) DIKECUALIKAN sejak fix BUG-016 (Sesi 463), pola sama linkedAssetId (S455)', () => {
  const D = {
    debts: [
      { id: 'd1', name: 'KTA Bank X', nilai: 3000000, lunas: false },
      { id: 'd3', name: 'Budi', nilai: 1000000, lunas: false, linkedInvestmentId: 'i1' },
    ],
    bills: [],
  };
  const ctx = makeDebtCtx(D);
  // Sebelum fix BUG-016: 4jt (d1 + d3/titipan dihitung penuh, double-
  // subtraction thd porsi yang sudah dikecualikan di Investment.
  // portfolioSummary()). Sesudah fix: d3 dikecualikan, sisa cuma d1.
  assert.equal(ctx.Debt.totalValue(), 3000000);
});

test('Debt.renderList() — badge "🔒 Titipan" tampil utk entri linkedInvestmentId, sama seperti linkedAssetId', () => {
  let html = '';
  const totals = {};
  const el = { set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
  const documentStub = {
    getElementById(id) {
      if (id === 'debtList') return el;
      if (id === 'debtTotalVal' || id === 'debtCicilanVal') {
        return { set textContent(v) { totals[id] = v; }, get textContent() { return totals[id]; } };
      }
      return null;
    },
  };
  const D = {
    debts: [
      { id: 'd3', name: 'Budi', nilai: 1000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedInvestmentId: 'i1' },
    ],
    bills: [],
  };
  loadSource(
    ['modules/finance/piutang-utang.js'],
    { D, document: documentStub, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), save: () => {}, sameId: (a, b) => a === b },
    ['Debt'],
  ).Debt.renderList();
  assert.ok(html.includes('🔒 Titipan'), 'badge titipan harus muncul utk entri linkedInvestmentId');
});
