'use strict';
// tests/s662-investmentlistui-owner-settlement-filter.test.js — Sesi 662
// (sesi lanjutan eksplisit dari SESSION-NOTE-S661.md § "Belum dikerjakan
// sesi ini": "filter di daftar investasi/portfolio berdasarkan owner +
// settlement"). Fondasi query (Investment.getOwnerSettlement()/
// holdingsByOwnerSettlement()) dari S660, wiring toggle modal dari S661 —
// sesi ini menyambungkan ke UI daftar holding (InvestmentListUI._renderList(),
// investasi-list-view.js): dropdown "Pemilik" + "Status" di atas daftar,
// murni state UI (0 tulis ke D), delegasi penuh ke Investment.getOwners()/
// getOwnerSettlement() yang sudah ada (0 rumus baru).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/investasi-list-view.js. modules/asset/investasi.js (S660)
// TIDAK disentuh lagi — reuse penuh API yang sudah ada.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
}

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
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

function makeCtx(D, dom) {
  let _n = 0;
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/asset/investasi-list-view.js',
    ],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      uid: () => 'inv_' + (_n += 1),
      save: () => {},
      toast: () => {},
    },
    ['Investment', 'InvestmentListUI', 'MultiOwnerEngine'],
  );
}

test('_renderList() — 0 owner non-SELF di semua holding -> filter bar disembunyikan (tidak dirender)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });

  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.doesNotMatch(html, /onFilterOwnerToggle/, 'filter bar tidak boleh muncul kalau 0 owner non-SELF yg bisa difilter');
  assert.match(html, /Reksadana Sendiri/);
});

test('_renderList() — ada owner non-SELF -> filter bar muncul dgn opsi nama owner tsb', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emas = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emas.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);

  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /onFilterOwnerToggle/, 'filter bar harus muncul begitu ada owner non-SELF');
  // Label baris checkbox owner sejak S664 disertai badge jumlah holding
  // ("Istri (1 holding)") -- lihat tests/s664-investmentlistui-filterbar-owner-count-badge.test.js
  // utk cakupan test badge jumlah itu sendiri; assertion di sini cukup
  // longgar (nama owner ADA di baris, badge jumlah menyusul di span
  // terpisah sejak S669 checkbox-list), bukan cek format badge persis.
  assert.match(html, /Istri/);
  assert.match(html, /\(1 holding\)/, 'baris checkbox owner harus berisi badge jumlah holding');
});

test('filterOwnerId=owner tertentu -> hanya holding milik owner itu yang tampil, holding SELF tersembunyi', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri/);
  assert.doesNotMatch(html, /Reksadana Sendiri/);
});

test('filterOwnerId + filterSettlement="milik" -> hanya holding owner tsb yang berstatus milik sendiri (bukan titipan)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstriMilik = ctx.Investment.addHolding({ name: 'Emas Istri Sungguhan', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstriMilik.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.setOwnerSettlement(emasIstriMilik.id, 'istri1', 'milik');

  const rdTitipanIstri = ctx.Investment.addHolding({ name: 'RD Titipan Istri', type: 'Reksa Dana', unit: 100, avgPrice: 10000 });
  ctx.Investment.setOwners(rdTitipanIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  // Tidak dipanggil setOwnerSettlement -> default 'titipan' (S660).

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterSettlementChange('milik');

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri Sungguhan/);
  assert.doesNotMatch(html, /RD Titipan Istri/);
});

test('filterOwnerId + filterSettlement="titipan" -> hanya holding titipan owner tsb yang tampil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstriMilik = ctx.Investment.addHolding({ name: 'Emas Istri Sungguhan', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstriMilik.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.setOwnerSettlement(emasIstriMilik.id, 'istri1', 'milik');

  const rdTitipanIstri = ctx.Investment.addHolding({ name: 'RD Titipan Istri', type: 'Reksa Dana', unit: 100, avgPrice: 10000 });
  ctx.Investment.setOwners(rdTitipanIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterSettlementChange('titipan');

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /RD Titipan Istri/);
  assert.doesNotMatch(html, /Emas Istri Sungguhan/);
});

test('filter aktif tapi 0 holding cocok -> empty-state khusus "Tidak ada holding yang cocok dengan filter ini" (bukan empty-state kosong total)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  // Semua holding istri1 berstatus default 'titipan' -> filter 'milik' harus kosong.

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterSettlementChange('milik');

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Tidak ada holding yang cocok dengan filter ini/);
  assert.doesNotMatch(html, /Belum ada holding investasi tercatat/, 'pesan empty-state harus beda dari kasus benar-benar 0 holding sama sekali');
  // Filter bar tetap harus muncul (supaya user bisa ganti filter lagi), bukan ikut hilang.
  assert.match(html, /onFilterOwnerToggle/);
});

test('onFilterOwnerToggle() melepas-centang owner terakhir -> filterOwnerIds kosong & otomatis mereset filterSettlement (status tanpa owner tidak bermakna)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterSettlementChange('titipan');
  assert.equal(ctx.InvestmentListUI.filterSettlement, 'titipan');

  // Toggle lagi id yang sama -> lepas centang (bukan string kosong seperti API lama).
  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
  assert.equal(ctx.InvestmentListUI.filterSettlement, '', 'centang terakhir dilepas harus ikut mengosongkan filter status');

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /Emas Istri/);
  assert.match(html, /Reksadana Sendiri/, 'balik ke "Semua Pemilik" harus menampilkan semua holding lagi, termasuk yg SELF');
});

test('_holdingMatchesFilter() 1 holding korup (getOwners() throw) tidak menjatuhkan render, tetap disembunyikan dari hasil filter', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  const rusak = ctx.Investment.addHolding({ name: 'Holding Rusak', type: 'Saham', unit: 1, avgPrice: 1 });
  // Rusak owners record secara paksa supaya MultiOwnerEngine.getOwners() melempar.
  rusak.owners = 'bukan-array-valid';

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');

  let html;
  assert.doesNotThrow(() => { html = dom.getElementById('investmentHoldingList').innerHTML; });
  assert.match(html, /Emas Istri/);
  assert.doesNotMatch(html, /Holding Rusak/);
});
