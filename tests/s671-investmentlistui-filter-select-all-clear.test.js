'use strict';
// tests/s671-investmentlistui-filter-select-all-clear.test.js — Sesi 671
// (item backlog dari catatan "Belum dikerjakan" SESSION-NOTE-S669.md/S670.md:
// "Tombol cepat 'Pilih Semua'/'Bersihkan' di atas checkbox list owner Investasi
// (S669) kalau owner-nya banyak (>5)"). Ambang >5 dipilih persis sesuai kata-kata
// catatan backlog itu sendiri (bukan angka baru).
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/investasi-list-view.js. 0 file lain (aset.js Buku Aset & Dana
// Titipan portfolio-render) ikut disentuh -- item backlog "multi-select owner
// Buku Aset/Dana Titipan" & "persist filter ke localStorage" TETAP di backlog,
// sengaja ditunda (1 sesi 1 target).

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
      insertAdjacentElement(_position, node) {
        if (node && node.id) registry.set(node.id, node);
      },
      insertAdjacentHTML() {},
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    createElement(_tag) { return makeElement(undefined); },
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

// seedBanyakOwner(ctx, n) — n holding, tiap holding 1 owner non-SELF unik
// (owner1..ownerN), supaya ownerMap._renderFilterBar() punya persis n baris.
function seedBanyakOwner(ctx, n) {
  const holdings = [];
  for (let i = 1; i <= n; i += 1) {
    const h = ctx.Investment.addHolding({ name: 'Holding ' + i, type: 'Saham', unit: 1, avgPrice: 100000 });
    ctx.Investment.setOwners(h.id, [{ ownerId: 'owner' + i, porsi: 100, ownerName: 'Owner ' + i, isSelf: false }]);
    holdings.push(h);
  }
  return holdings;
}

test('<=5 owner non-SELF -> tombol Pilih Semua/Bersihkan TIDAK dirender', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedBanyakOwner(ctx, 5);
  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.doesNotMatch(html, /Pilih Semua/);
  assert.doesNotMatch(html, /Bersihkan/);
});

test('>5 owner non-SELF -> tombol Pilih Semua & Bersihkan dirender', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedBanyakOwner(ctx, 6);
  ctx.InvestmentListUI._renderList();

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  assert.match(html, /onFilterOwnerSelectAll\(\)/);
  assert.match(html, /onFilterOwnerClearAll\(\)/);
  assert.match(html, />Pilih Semua</);
  assert.match(html, />Bersihkan</);
});

test('onFilterOwnerSelectAll() -> filterOwnerIds terisi SEMUA owner non-SELF & semua holding-nya tampil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedBanyakOwner(ctx, 6);

  ctx.InvestmentListUI.onFilterOwnerSelectAll();
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 6);
  ['owner1', 'owner2', 'owner3', 'owner4', 'owner5', 'owner6'].forEach((id) => {
    assert.equal(ctx.InvestmentListUI.filterOwnerIds.indexOf(id) !== -1, true);
  });

  const html = dom.getElementById('investmentHoldingList').innerHTML;
  for (let i = 1; i <= 6; i += 1) assert.match(html, new RegExp('Holding ' + i));
});

test('onFilterOwnerSelectAll() lalu render ulang -> semua checkbox berstatus checked', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedBanyakOwner(ctx, 6);

  ctx.InvestmentListUI.onFilterOwnerSelectAll();
  const html = dom.getElementById('investmentHoldingList').innerHTML;
  for (let i = 1; i <= 6; i += 1) {
    assert.match(html, new RegExp('onFilterOwnerToggle\\(\'owner' + i + '\'\\)" checked>'));
  }
});

test('onFilterOwnerClearAll() setelah Select All -> filterOwnerIds & filterSettlement kosong lagi, semua holding tampil', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const holdings = seedBanyakOwner(ctx, 6);
  ctx.Investment.setOwnerSettlement(holdings[0].id, 'owner1', 'milik');

  ctx.InvestmentListUI.onFilterOwnerSelectAll();
  ctx.InvestmentListUI.onFilterSettlementChange('milik');
  ctx.InvestmentListUI.onFilterOwnerClearAll();

  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 0);
  assert.equal(ctx.InvestmentListUI.filterSettlement, '');
  const html = dom.getElementById('investmentHoldingList').innerHTML;
  for (let i = 1; i <= 6; i += 1) assert.match(html, new RegExp('Holding ' + i));
});

test('onFilterOwnerSelectAll() dgn Investment belum ada (guard typeof) -> tidak melempar', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const realInvestment = ctx.Investment;
  // Simulasikan Investment belum ter-load di lingkungan pemanggil (guard typeof
  // di dalam onFilterOwnerSelectAll(), pola sama guard lain di file ini).
  ctx.Investment = undefined;
  assert.doesNotThrow(() => ctx.InvestmentListUI.onFilterOwnerSelectAll());
  ctx.Investment = realInvestment;
});

test('holding dgn owners korup (getOwners() throw saat Select All) tidak menjatuhkan hasil, owner sehat lain tetap ke-include', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  seedBanyakOwner(ctx, 6);
  const rusak = ctx.Investment.addHolding({ name: 'Holding Rusak', type: 'Saham', unit: 1, avgPrice: 1 });
  rusak.owners = 'bukan-array-valid';

  assert.doesNotThrow(() => ctx.InvestmentListUI.onFilterOwnerSelectAll());
  assert.equal(ctx.InvestmentListUI.filterOwnerIds.length, 6);
});
