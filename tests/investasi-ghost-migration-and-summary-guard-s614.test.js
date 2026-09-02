'use strict';
// tests/investasi-ghost-migration-and-summary-guard-s614.test.js — Regression sesi s614
// (audit user: "tab Investasi tidak respon" + "kendaraan Vario 125 nyangkut jadi Holding
// Investasi"). Dua fix independen dicover di sini:
//
//   1. InvestmentListUI._renderSummary() SEKARANG dibungkus try/catch (pola sama persis
//      _renderList() yang sudah dilindungi sejak fix sebelumnya) -- 1 holding yang bikin
//      Investment.portfolioSummary() throw TIDAK LAGI menjatuhkan render() secara
//      keseluruhan SEBELUM _renderList() sempat jalan.
//   2. findGhostMigratedAssets()/unmigrateAssetFromInvestment() (aset-misc.js, BARU) --
//      deteksi & pulihkan aset non-investasi (mis. Kendaraan) yang kadung ke-migrasi jadi
//      Holding Investasi lewat bug lama (SEBELUM gate ASSET_JENIS_TO_INVESTMENT_TYPE ada
//      di migrateAssetInvestmentsToHoldings()) -- fix source-nya tidak retroaktif, jadi
//      holding "hantu" yang sudah kadung termigrasi butuh jalur pemulihan manual ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '',
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeD(extra = {}) {
  return {
    assets: [], investments: [], investmentTx: [], investmentWatchlist: [], debts: [],
    ...extra,
  };
}

function makeCtx(D, dom, overrides = {}) {
  const calls = { toast: [], renderKekayaanBersih: 0, hitungZakatMaal: 0, assetRenderList: 0 };
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/asset/investasi-list-view.js',
      'modules/asset/aset-owners.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/aset.js',
      'modules/asset/aset-reports.js',
      'modules/asset/aset-misc.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      uid: () => 'uid_' + Math.random().toString(36).slice(2),
      save: () => {},
      toast: (msg) => { calls.toast.push(msg); },
      askConfirm: overrides.askConfirm || (async () => true),
      renderKekayaanBersih: () => { calls.renderKekayaanBersih += 1; },
      hitungZakatMaal: () => { calls.hitungZakatMaal += 1; },
      ...overrides.extraCtx,
    },
    ['Investment', 'InvestmentListUI', 'Aset', 'migrateAssetInvestmentsToHoldings', 'findGhostMigratedAssets', 'unmigrateAssetFromInvestment'],
  );
  ctx.Aset.renderList = () => { calls.assetRenderList += 1; };
  ctx.calls = calls;
  return ctx;
}

// ============================================================
// 1. _renderSummary() try/catch guard
// ============================================================

test('[_renderSummary guard] holding yg bikin portfolioSummary() throw TIDAK menjatuhkan render() -- _renderList() tetap jalan', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  // holding valid + holding "beracun" (purchaseDate rusak bikin holdingYieldPct() throw
  // lewat Date parsing yang aneh -- cukup pakai owners malformed supaya
  // Investment.dividendTotal()/realizedGainLoss() atau reduce lain throw).
  ctx.Investment.addHolding({ name: 'Saham Normal', type: 'Saham', unit: 10, avgPrice: 1000, currentPrice: 1200 });
  const poison = ctx.Investment.addHolding({ name: 'Holding Beracun', type: 'Lainnya', unit: 1, avgPrice: 100, currentPrice: 100 });
  // Paksa getHoldings() (dipakai portfolioSummary()) mengembalikan array yang throw saat
  // di-reduce, dgn merusak holdingCost lewat nilai non-numeric yg lolos ke arithmetic --
  // cara paling langsung: override Investment.holdingValue supaya throw utk holding ini.
  const origHoldingValue = ctx.Investment.holdingValue;
  ctx.Investment.holdingValue = (h) => {
    if (String(h.id) === String(poison.id)) throw new Error('simulated calc error');
    return origHoldingValue(h);
  };

  assert.doesNotThrow(() => ctx.InvestmentListUI.render());
  // _renderList() (dipanggil SETELAH _renderSummary() di render()) harus tetap sempat
  // jalan & mem-bind data-action pada baris holding -- dibuktikan lewat list TIDAK kosong.
  const listHtml = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(listHtml, /InvestmentListUI\.openModal/, '_renderList() harus tetap jalan & render baris holding walau _renderSummary() gagal hitung');
});

// ============================================================
// 2. findGhostMigratedAssets() / unmigrateAssetFromInvestment()
// ============================================================

test('[findGhostMigratedAssets] aset Kendaraan yg _migratedToInvestmentId (bug lama) terdeteksi, aset investasi normal tidak', () => {
  const D = makeD({
    assets: [
      { id: 'a-vario', name: 'Vario 125', jenis: 'Kendaraan', nilai: 10000000, _migratedToInvestmentId: 'inv-vario' },
      { id: 'a-eth', name: 'ETH', jenis: 'Kripto', nilai: 10000000, _migratedToInvestmentId: 'inv-eth' },
    ],
    investments: [
      { id: 'inv-vario', name: 'Vario 125', type: 'Lainnya', unit: 1, avgPrice: 15000000, currentPrice: 10000000, owners: [] },
      { id: 'inv-eth', name: 'ETH', type: 'Kripto', unit: 1, avgPrice: 8000000, currentPrice: 10000000, owners: [] },
    ],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  const ghosts = ctx.findGhostMigratedAssets();
  assert.equal(ghosts.length, 1);
  assert.equal(ghosts[0].id, 'a-vario');
});

test('[unmigrateAssetFromInvestment] hapus holding tujuan & bersihkan flag di aset asal', () => {
  const D = makeD({
    assets: [{ id: 'a-vario', name: 'Vario 125', jenis: 'Kendaraan', nilai: 10000000, _migratedToInvestmentId: 'inv-vario' }],
    investments: [{ id: 'inv-vario', name: 'Vario 125', type: 'Lainnya', unit: 1, avgPrice: 15000000, currentPrice: 10000000, owners: [] }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  const ok = ctx.unmigrateAssetFromInvestment('a-vario');
  assert.equal(ok, true);
  assert.equal(D.investments.length, 0, 'holding hantu harus terhapus');
  assert.equal(D.assets[0]._migratedToInvestmentId, null, 'flag migrasi harus dibersihkan');
  assert.equal(ctx.findGhostMigratedAssets().length, 0);
});

test('[unmigrateAssetFromInvestment] assetId tidak ditemukan/tidak ter-migrasi -> return false, tidak ada perubahan', () => {
  const D = makeD({ assets: [{ id: 'a-rumah', name: 'Rumah', jenis: 'Properti', nilai: 500000000 }] });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  assert.equal(ctx.unmigrateAssetFromInvestment('a-rumah'), false);
  assert.equal(ctx.unmigrateAssetFromInvestment('a-tidak-ada'), false);
});

test('[InvestmentListUI._renderList] banner "pulihkan" muncul utk ghost & tombolnya panggil unmigrateGhost -> InvestmentListUI.render + Aset.renderList', async () => {
  const D = makeD({
    assets: [{ id: 'a-vario', name: 'Vario 125', jenis: 'Kendaraan', nilai: 10000000, _migratedToInvestmentId: 'inv-vario' }],
    investments: [{ id: 'inv-vario', name: 'Vario 125', type: 'Lainnya', unit: 1, avgPrice: 15000000, currentPrice: 10000000, owners: [] }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);

  ctx.InvestmentListUI.render();
  const listHtml = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(listHtml, /Vario 125/, 'nama aset harus muncul di banner');
  assert.match(listHtml, /InvestmentListUI\.unmigrateGhost/, 'tombol banner harus panggil unmigrateGhost');

  await ctx.InvestmentListUI.unmigrateGhost('a-vario');
  assert.equal(D.investments.length, 0);
  assert.equal(D.assets[0]._migratedToInvestmentId, null);
  assert.equal(ctx.calls.assetRenderList >= 1, true, 'Aset.renderList() harus ikut dipanggil supaya Buku Aset ikut refresh');
  assert.equal(ctx.calls.renderKekayaanBersih >= 1, true);
  assert.equal(ctx.calls.hitungZakatMaal >= 1, true);
  assert.match(ctx.calls.toast.join('|'), /dipulihkan/);
});

test('[InvestmentListUI._renderList] tidak ada ghost -> tidak ada banner dirender', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Investment.addHolding({ name: 'Saham Normal', type: 'Saham', unit: 10, avgPrice: 1000, currentPrice: 1200 });

  ctx.InvestmentListUI.render();
  const listHtml = dom.getElementById('investmentHoldingList').innerHTML;
  assert.doesNotMatch(listHtml, /unmigrateGhost/);
});
