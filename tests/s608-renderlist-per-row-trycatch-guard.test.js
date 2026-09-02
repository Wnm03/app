'use strict';
// tests/s608-renderlist-per-row-trycatch-guard.test.js — cakupan FIX audit
// "pola sama S601 InvestmentListUI._renderList()" (0 reaksi/0 toast pas 1
// item punya data yang bikin salah satu hitungan per-baris throw): beberapa
// renderer list besar (Aset.renderList(), Piutang.renderList(),
// Debt.renderList() x2 blok, WorthIt.renderList(), Etalase.renderList(),
// txHTML() global) sebelumnya pakai `list.map(...) -> innerHTML` TANPA
// try/catch per-baris -- 1 item error bikin SELURUH .map() throw sebelum
// innerHTML sempat ke-assign sama sekali, container tetap nampilin render
// SUKSES sebelumnya (data-action basi -> tap = 0 reaksi). Fix: bungkus
// hitungan per-item dgn try/catch, fallback ke baris aman ber-badge ⚠️
// (tetap bisa di-tap utk buka/edit), TIDAK menjatuhkan seluruh render.
//
// Test di sini HANYA memverifikasi kontrak baru (1 item rusak tidak
// menjatuhkan render / innerHTML tetap ke-assign, item lain tetap muncul) --
// bukan re-test isi HTML lengkap tiap renderer (sudah dicakup test lama).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('txHTML() — 1 transaksi yang bikin resolveTxAssetSplit() throw tidak melempar exception ke pemanggil, fallback baris ⚠️', () => {
  const ctx = loadSource(
    ['modules/finance/tx-list-cashflow.js'],
    {
      D: { accounts: [{ id: 'a1', name: 'Kas', emoji: '💵' }], transactions: [], products: [], cobek: [] },
      document: { getElementById: () => null },
      escapeHtml: (s) => String(s),
      getAllCats: () => [{ name: 'Makan', emoji: '🍔' }],
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      resolveTxAssetSplit: () => { throw new Error('data aset korup'); },
      toast: () => {},
      save: () => {},
    },
    [],
  );
  const t = { id: 'tBad', type: 'expense', amount: 10000, category: 'Makan', date: '2026-08-05', accountId: 'a1', assetId: 'asetOrphan' };
  let html;
  assert.doesNotThrow(() => { html = ctx.txHTML(t); });
  assert.match(html, /editTx/);
  assert.match(html, /tBad/);
});

test('Aset.renderList() — 1 aset yang bikin assetCrossCheckWarning() throw tidak menjatuhkan render list, aset lain tetap tampil', () => {
  const el = { innerHTML: '<div>render lama (basi)</div>' };
  const D = {
    assets: [
      { id: 'good1', name: 'Motor', jenis: 'Kendaraan', nilai: 5000000, owners: [] },
      { id: 'bad1', name: 'Rusak', jenis: 'Kendaraan', nilai: 1000000, owners: [] },
    ],
  };
  const ctx = loadSource(
    ['modules/shared/filter-prefs-store.js',
'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      uid: () => 'uid_' + Math.random().toString(36).slice(2),
      document: { getElementById: (id) => (id === 'assetList' ? el : null) },
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      assetCrossCheckWarning: (a) => { if (a.id === 'bad1') throw new Error('cross-check korup'); return null; },
      migrateAssetInvestmentsToHoldings: () => {},
      renderKekayaanBersih: () => {},
      hitungZakatMaal: () => {},
      Penyusutan: { renderList: () => {} },
      PajakAset: { renderList: () => {} },
      LaporanAset: { renderList: () => {} },
      AssetInsight: { render: () => {} },
    },
    ['Aset'],
  );
  assert.doesNotThrow(() => ctx.Aset.renderList());
  assert.match(el.innerHTML, /Motor/);
  assert.match(el.innerHTML, /Gagal menghitung data aset ini/);
  assert.doesNotMatch(el.innerHTML, /render lama \(basi\)/);
});
