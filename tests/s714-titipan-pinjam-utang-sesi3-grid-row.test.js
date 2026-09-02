'use strict';
// tests/s714-titipan-pinjam-utang-sesi3-grid-row.test.js — Sesi 3/3
// (lanjutan S714 Sesi 1+2: toggle 3-arah Biasa/Piutang/Utang +
// maybeCreateTitipanPinjamUtang()/D.debts). FIX: 2 baris baru di grid
// detail kartu owner (dana-titipan-portfolio-render.js) -- "Dipakai
// (Transaksi Titipan)" = o.usedTotal (sudah ada, sesi ini baru
// ditampilkan), "Dipinjam (Utang)" = o.debtPinjamTotal (BARU, fungsi
// _debtPinjamTotalForOwner() di dana-titipan-aggregation-api.js).
// Murni tampilan -- 0 formula spent/available/estimatedUnallocated
// lain disentuh, dicek eksplisit di test #4.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeElement(id) {
  let _innerHTML = '';
  const el = { id, className: '', style: {}, textContent: '' };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) { _innerHTML = String(html); },
  });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); } };
}

function baseD(investments, extra) {
  return Object.assign({
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    assets: [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], investmentCustodians: [],
  }, extra || {});
}

function makeCtx(D, dom) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom,
      uid: (() => { let n = 0; return () => 'u' + (n += 1); })(), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

const HOLDINGS_BUDI = [
  { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
];

test('1. baris "Dipakai (Transaksi Titipan)" muncul di grid detail dgn nilai o.usedTotal', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
    transactions: [{ id: 't1', type: 'expense', amount: 75000, titipanLinkId: 'budi' }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Dipakai \(Transaksi Titipan\)<\/span><span class="u-fw700">Rp 75000/);
});

test('2. baris "Dipinjam (Utang)" muncul dgn total D.debts belum lunas milik owner (autoTitipanOwnerId)', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
    debts: [
      { id: 'd1', nilai: 50000, lunas: false, autoTitipanOwnerId: 'budi', autoTxId: 't1' },
      { id: 'd2', nilai: 20000, lunas: false, autoTitipanOwnerId: 'budi', autoTxId: 't2' },
    ],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Dipinjam \(Utang\)<\/span><span class="u-fw700 u-pointer findash-card-sub-link" data-action="goToList" data-args="\["debtList",null,null,null,null,"utangpiutang"\]"[^>]*>Rp 70000/);
});

test('3. utang yang SUDAH lunas TIDAK ikut dijumlahkan ke "Dipinjam (Utang)"', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
    debts: [
      { id: 'd1', nilai: 50000, lunas: false, autoTitipanOwnerId: 'budi', autoTxId: 't1' },
      { id: 'd2', nilai: 20000, lunas: true, autoTitipanOwnerId: 'budi', autoTxId: 't2' },
    ],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Dipinjam \(Utang\)<\/span><span class="u-fw700 u-pointer findash-card-sub-link"[^>]*>Rp 50000/);
});

test('4. murni tampilan: estimatedUnallocated/available TIDAK ikut berubah krn debtPinjamTotal (anti-doublecount thd usedTotal)', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
    transactions: [{ id: 't1', type: 'expense', amount: 75000, titipanLinkId: 'budi' }],
    debts: [{ id: 'd1', nilai: 75000, lunas: false, autoTitipanOwnerId: 'budi', autoTxId: 't1' }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const o = projection.owners.find((x) => x.ownerId === 'budi');
  assert.equal(o.debtPinjamTotal, 75000);
  // estimatedUnallocated = principal(500000) - allocatedPrincipal(100000, holding Majoris 100*1000) - usedTotal(75000) - linkedExpenseTotal(0) - renovExpenseTotal(0)
  assert.equal(o.estimatedUnallocated, 500000 - 100000 - 75000);
  assert.equal(o.available, 500000 - 75000 - 0 - 0 - 0);
});

test('5. owner tanpa utang otomatis sama sekali -> debtPinjamTotal 0, baris tetap tampil "Rp 0"', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Dipinjam \(Utang\)<\/span><span class="u-fw700">Rp 0/);
});

test('6. utang otomatis milik owner LAIN tidak ikut ke debtPinjamTotal owner ini', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
    debts: [{ id: 'd1', nilai: 50000, lunas: false, autoTitipanOwnerId: 'siti', autoTxId: 't1' }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  const o = projection.owners.find((x) => x.ownerId === 'budi');
  assert.equal(o.debtPinjamTotal, 0);
});

// --- Sesi lanjutan (deep-link "Dipinjam (Utang)" -> Buku Utang) ---
// Reuse 100% goToList() yang sudah ada (filter-laporan.js) -- pola SAMA
// PERSIS navigasi lain di app (mis. kartu "Ringkasan Utang" Debt
// Optimizer), 0 fungsi navigasi baru ditulis. Karena 1 owner bisa punya
// BANYAK baris D.debts (multi-utang), tujuan link = seksi Buku Utang
// utuh (scroll+flash-highlight #debtList, tab "utangpiutang") -- BUKAN
// openDebtModal(id) 1 entri spesifik.

test('7. "Dipinjam (Utang)" > 0 -> jadi tombol data-action="goToList" ke debtList/tab utangpiutang', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
    debts: [{ id: 'd1', nilai: 50000, lunas: false, autoTitipanOwnerId: 'budi', autoTxId: 't1' }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /data-action="goToList"/);
  assert.match(html, /data-args="\["debtList",null,null,null,null,"utangpiutang"\]"/);
});

test('8. "Dipinjam (Utang)" = Rp 0 (owner tanpa utang) TIDAK jadi tombol/link (konsisten pola nameHtml holding row)', () => {
  const D = baseD(HOLDINGS_BUDI, {
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.doesNotMatch(html, /data-action="goToList"/);
  assert.match(html, /Dipinjam \(Utang\)<\/span><span class="u-fw700">Rp 0/);
});
