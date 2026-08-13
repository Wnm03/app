'use strict';
// tests/dana-titipan-asset-picker-ghost-asset-s599.test.js — Sesi 599
// (laporan user, screenshot dropdown "Pilih Aset" di kartu owner Dana
// Titipan: 2 aset -- salah satunya "Majoris" -- muncul dobel di picker
// padahal sudah tidak ada di Buku Aset MAUPUN di tab Investasi/Holding).
//
// ROOT CAUSE: `DanaTitipanPortfolioPresenter._assetOptionsHtml()`
// (dana-titipan-portfolio-render.js) adalah SATU-SATUNYA titik baca
// `D.assets` di modul Dana Titipan yang TIDAK menerapkan guard
// `_migratedToInvestmentId`/`investmentId` -- guard yang SAMA sudah
// dipakai `Aset.renderList()` (filter Buku Aset), `Aset.totalValue()`,
// DAN `_assetSplits()` (dana-titipan-aggregation-api.js, fix s554/s594)
// supaya definisi "aset ini masih dihitung/tampil di mana" konsisten di
// seluruh modul Dana Titipan. Karena luput di sini, aset yang sudah
// tertaut manual (`a.investmentId`) atau termigrasi otomatis
// (`a._migratedToInvestmentId`, s476a) -- keduanya SENGAJA disembunyikan
// dari Buku Aset tapi TETAP ADA di `D.assets` (biar reversible) -- tetap
// nongol sebagai opsi picker, padahal sudah "pindah domain" ke Holding.
//
// FIX: `_assetOptionsHtml()` sekarang filter
// `!a._migratedToInvestmentId && !a.investmentId`, pola SAMA PERSIS
// `Aset.totalValue()`.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

test('_assetOptionsHtml(): aset ber-_migratedToInvestmentId (pindah otomatis s476a) TIDAK ikut jadi opsi -- kasus persis laporan user "Majoris" dobel', () => {
  const D = {
    investments: [{ id: 'h1', name: 'Majoris', unit: 1, avgPrice: 10133585, currentPrice: 10133585, owners: [] }],
    assets: [
      { id: 'a1', name: 'Majoris', nilai: 10133585, _migratedToInvestmentId: 'h1' },
      { id: 'a2', name: 'Vario 110', nilai: 15000000 },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const html = ctx.DanaTitipanPortfolioPresenter._assetOptionsHtml();
  assert.ok(html.includes('Vario 110'));
  assert.ok(!html.includes('Majoris'));
});

test('_assetOptionsHtml(): aset ber-investmentId (tautan manual B1) juga TIDAK ikut jadi opsi', () => {
  const D = {
    investments: [{ id: 'h1', name: 'Sucorinvest', unit: 1, avgPrice: 1000000, currentPrice: 1000000, owners: [] }],
    assets: [
      { id: 'a1', name: 'Sucorinvest', nilai: 1000000, investmentId: 'h1' },
      { id: 'a2', name: 'Cincin Emas', nilai: 5000000 },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const html = ctx.DanaTitipanPortfolioPresenter._assetOptionsHtml();
  assert.ok(html.includes('Cincin Emas'));
  assert.ok(!html.includes('Sucorinvest'));
});

test('_assetOptionsHtml(): aset normal (0 migrasi, 0 tautan) tetap muncul apa adanya -- 0 regresi kasus normal', () => {
  const D = {
    investments: [],
    assets: [
      { id: 'a1', name: 'Tanah Kavling', nilai: 500000 },
      { id: 'a2', name: 'Vario 125 KZR', nilai: 20000000 },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
  };
  const ctx = makeCtx(D);
  const html = ctx.DanaTitipanPortfolioPresenter._assetOptionsHtml();
  assert.ok(html.includes('Tanah Kavling'));
  assert.ok(html.includes('Vario 125 KZR'));
  assert.equal((html.match(/<option/g) || []).length, 3); // placeholder + 2 aset
});
