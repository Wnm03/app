'use strict';
// tests/s663-investmentlistui-summary-filter-note.test.js — Sesi 663 (lanjutan
// eksplisit dari daftar "Ide lanjutan" S662, poin 1 "Ringkasan ikut ter-filter":
// InvestmentListUI._renderSummary() (kartu total nilai/gain di atas tab 💹
// Investasi) SELALU menghitung dari SEMUA holding lewat Investment.
// portfolioSummary() -- SENGAJA TIDAK diubah sesi ini (kartu ringkasan tetap
// agregat utuh, bukan hasil filter). Yang baru: baris kecil
// #investSummaryFilterNote di bawah kartu ("Menampilkan: X dari Y holding
// (Rp Z)") yang HANYA muncul saat filter Pemilik (InvestmentListUI.filterOwnerId,
// S662) sedang aktif -- supaya user sadar kartu ringkasan di atas ≠ daftar
// holding yang sedang ditampilkan _renderList() di bawahnya.
//
// 1 file source disentuh sesi ini (sesuai Mode PATCH ZIP, docs/ZIP_RULES.md):
// modules/asset/investasi-list-view.js. modules/asset/investasi.js (S660)
// TIDAK disentuh lagi -- reuse penuh Investment.getHoldings()/holdingValue()/
// portfolioSummary() yang sudah ada, 0 rumus baru.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
}

// makeStatefulDom() — pola SAMA PERSIS tests/s662-investmentlistui-owner-settlement-filter.test.js,
// DITAMBAH document.createElement() + insertAdjacentElement() (pola stubEl()
// tests/rebalance-porsi-pemilik.test.js: node yang disisipkan didaftarkan ke
// registry pakai id-nya sendiri, supaya getElementById(node.id) berikutnya
// mengembalikan node yang sama -- persis perilaku DOM asli & pola
// InvestmentUI._renderRebalancePanel() yang sudah dites lewat mock serupa).
function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    const el = {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      className: '',
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
    return el;
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    createElement(_tag) {
      // Elemen belum punya id sampai caller nempelkannya sendiri (pola sama
      // investasi-view.js _renderRebalancePanel()) -- pakai id sementara unik
      // supaya tidak bentrok di registry sebelum caller set box.id = '...'.
      return makeElement(undefined);
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

test('_renderSummary() — filter TIDAK aktif -> #investSummaryFilterNote kosong (tidak ada info tambahan)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });

  ctx.InvestmentListUI._renderSummary();

  const note = dom.getElementById('investSummaryFilterNote');
  assert.equal(note.textContent, '', 'tanpa filter aktif, baris info tidak boleh muncul');
});

test('_renderSummary() — filterOwnerId aktif -> #investSummaryFilterNote menampilkan "X dari Y holding" + total nilai holding terfilter', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });
  ctx.Investment.addHolding({ name: 'Saham Sendiri', type: 'Saham', unit: 5, avgPrice: 20000 });

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');

  const note = dom.getElementById('investSummaryFilterNote');
  // 1 dari 3 holding cocok filter (Emas Istri), nilainya 10 x 1.000.000 = 10.000.000.
  assert.match(note.textContent, /Menampilkan: 1 dari 3 holding/);
  assert.match(note.textContent, /10\.000\.000/);
});

test('kartu ringkasan utama (totalValue) TETAP dari SEMUA holding walau filter aktif — tidak ikut terfilter', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.addHolding({ name: 'Reksadana Sendiri', type: 'Reksa Dana', unit: 10, avgPrice: 10000 });

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');

  const before = ctx.Investment.portfolioSummary().totalValue;
  ctx.InvestmentListUI._renderSummary();
  const valBox = dom.getElementById('investSummaryValue');
  // Investment.portfolioSummary() (S193, TIDAK disentuh sesi ini) dipanggil apa
  // adanya -- baris ini cuma memastikan _renderSummary() tetap membaca angka yang
  // SAMA PERSIS dari situ walau InvestmentListUI.filterOwnerId sedang aktif (kartu
  // ringkasan utama TIDAK ikut terfilter, hanya baris info tambahan di bawahnya).
  assert.equal(valBox.textContent, 'Rp ' + Math.round(before).toLocaleString('id-ID'));
});

test('ganti filter ke owner lain -> #investSummaryFilterNote ikut update (live, bukan basi dari filter sebelumnya)', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  const emasAnak = ctx.Investment.addHolding({ name: 'Emas Anak', type: 'Emas', unit: 2, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasAnak.id, [{ ownerId: 'anak1', porsi: 100, ownerName: 'Anak', isSelf: false }]);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  let note = dom.getElementById('investSummaryFilterNote');
  assert.match(note.textContent, /Menampilkan: 1 dari 2 holding \(Rp 10\.000\.000\)/);

  // Ganti filter ke owner lain (S669 multi-select: lepas centang istri1, centang anak1).
  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterOwnerToggle('anak1');
  note = dom.getElementById('investSummaryFilterNote');
  assert.match(note.textContent, /Menampilkan: 1 dari 2 holding \(Rp 2\.000\.000\)/);
});

test('balik ke "Semua Pemilik" (lepas centang owner terakhir) -> #investSummaryFilterNote dikosongkan lagi', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  assert.notEqual(dom.getElementById('investSummaryFilterNote').textContent, '');

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  assert.equal(dom.getElementById('investSummaryFilterNote').textContent, '');
});

test('filterOwnerId + filterSettlement aktif -> total nilai baris info cuma dari holding yang cocok KEDUA filter itu', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstriMilik = ctx.Investment.addHolding({ name: 'Emas Istri Sungguhan', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstriMilik.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  ctx.Investment.setOwnerSettlement(emasIstriMilik.id, 'istri1', 'milik');

  const rdTitipanIstri = ctx.Investment.addHolding({ name: 'RD Titipan Istri', type: 'Reksa Dana', unit: 100, avgPrice: 10000 });
  ctx.Investment.setOwners(rdTitipanIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  // Default 'titipan' (S660) -- tidak dipanggil setOwnerSettlement.

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');
  ctx.InvestmentListUI.onFilterSettlementChange('milik');

  const note = dom.getElementById('investSummaryFilterNote');
  // Cuma "Emas Istri Sungguhan" yg cocok (status milik) dari 2 holding istri1 total.
  assert.match(note.textContent, /Menampilkan: 1 dari 2 holding \(Rp 10\.000\.000\)/);
});

test('1 holding korup (holdingValue() throw) tidak menjatuhkan _renderSummary(), dilewati dari total baris info', () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const emasIstri = ctx.Investment.addHolding({ name: 'Emas Istri', type: 'Emas', unit: 10, avgPrice: 1000000 });
  ctx.Investment.setOwners(emasIstri.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  const rusak = ctx.Investment.addHolding({ name: 'Holding Rusak Istri', type: 'Saham', unit: 1, avgPrice: 1 });
  ctx.Investment.setOwners(rusak.id, [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }]);
  // Rusak unit-nya jadi non-numerik supaya holdingValue() (investasi.js) melempar
  // saat mengalikan unit x harga.
  rusak.unit = { bukan: 'angka' };

  ctx.InvestmentListUI.onFilterOwnerToggle('istri1');

  assert.doesNotThrow(() => { ctx.InvestmentListUI._renderSummary(); });
  const note = dom.getElementById('investSummaryFilterNote');
  assert.match(note.textContent, /Menampilkan: 2 dari 2 holding/, 'kedua holding tetap dihitung KE JUMLAH (count), cuma nilai holding korup yg dilewati dari total Rp');
});
