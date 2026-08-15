'use strict';
// tests/s624-filtertx-ownersplit-modal-dikomit.test.js — Sesi 624.
//
// Permintaan user: "tambahkan modal dikomit dan total setelah dikurangi
// pengeluaran hanya ditampilkan per navigasi pemilik porsi" -- di kartu
// "👥 Porsi per Pemilik" (showFilteredTx(scope='account'), filter-laporan.js).
//
// "Modal Dikomit" DI SINI BUKAN `Modal` yang sudah ada (sum tx.type==='income'
// akun ini, lihat s567/s568) -- ini pokok yang dicatat MANUAL lewat modal
// "💰 Pokok Dana Titipan" (DanaTitipanPortfolioAPI.getCommitments(),
// dana-titipan-commitment-return-api.js), 2 entitas beda sumber SENGAJA
// ditampilkan berdampingan (lihat jawaban ke user: keduanya memang tidak
// dijamin sinkron by design -- pola sama dashboard Dana Titipan).
//
// "hanya ditampilkan per navigasi pemilik porsi" -- baris baru ini masuk ke
// `detailHtml` per-row (row = 1 owner), yang SUDAH jadi konten yang di-swap
// oleh selectFilterTxOwnerSplit() saat tab owner diklik (S568) -- jadi
// otomatis scope ke owner yang lagi aktif, 0 perubahan ke tabsHtml/struktur
// tab itu sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(initial = {}) {
  return { innerHTML: '', textContent: '', style: {}, ...initial };
}

function makeCtx(D, danaTitipanPortfolioAPI) {
  const els = {
    filterTxTitle: makeEl(),
    filterTxSummary: makeEl(),
    filterTxOwnerSplit: makeEl(),
    filterTxList: makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {} }),
  };
  const fakeDoc = {
    getElementById: (id) => els[id] || null,
    createElement: () => makeEl({ insertAdjacentElement: () => {}, insertAdjacentHTML: () => {}, dataset: {}, querySelector: () => makeEl() }),
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/filter-laporan.js'],
    {
      document: fakeDoc,
      D,
      sameId: (a, b) => String(a) === String(b),
      fmt: (n) => 'Rp' + n,
      escapeHtml: (s) => String(s),
      txHTML: (t) => `<div data-id="${t.id}"></div>`,
      curMonth: 7,
      curYear: 2026,
      openModal: () => {},
      DanaTitipanPortfolioAPI: danaTitipanPortfolioAPI,
    },
    ['MultiOwnerEngine']
  );
  return { ctx, els };
}

const BASE_D = () => ({
  assets: [{ id: 'as1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 80 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 20 }] }],
  transactions: [
    { id: 't1', accountId: 'acc1', type: 'expense', amount: 300000, date: '2026-08-02', deductionOwnerId: 'SELF' },
  ],
  titipanCommitments: [
    { id: 'c1', ownerId: 'SELF', ownerName: 'renov', principalAmount: 1000000 },
  ],
});

test('Porsi per Pemilik — owner dgn pokok dikomit tercatat -> "Modal Dikomit" & "Total setelah dikurangi pengeluaran" muncul di detail tab-nya', () => {
  const D = BASE_D();
  const { ctx, els } = makeCtx(D, {
    getCommitments: () => D.titipanCommitments,
  });
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const rows = ctx.window._filterTxOwnerSplitRows;
  assert.equal(rows.length, 2);
  // renov (SELF): pokok dikomit 1.000.000, pengeluaran 300.000 -> sisa 700.000
  assert.ok(rows[0].detailHtml.includes('Modal Dikomit Rp1000000'), 'Modal Dikomit renov harus tampil = principalAmount, BUKAN Modal (income) yg sudah ada');
  assert.ok(rows[0].detailHtml.includes('Total setelah dikurangi pengeluaran Rp700000'), 'sisa = pokok dikomit - pengeluaran akun ini');
  // Kartu default HANYA owner pertama (renov) yang tampil (konsisten S568, mode tab bukan patungan)
  assert.ok(!els.filterTxOwnerSplit.innerHTML.includes('Modal Dikomit'.repeat(2)));
});

test('Porsi per Pemilik — owner TANPA pokok dikomit tercatat -> "Belum dicatat", bukan Rp0/error', () => {
  const D = BASE_D();
  // mas sihab (id 'sihab') sengaja TIDAK punya record di titipanCommitments
  const { ctx } = makeCtx(D, {
    getCommitments: () => D.titipanCommitments,
  });
  ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1');
  const rows = ctx.window._filterTxOwnerSplitRows;
  const sihabRow = rows.find(r => r.name === 'mas sihab');
  assert.ok(sihabRow.detailHtml.includes('Modal Dikomit'), 'label tetap muncul walau belum dicatat');
  assert.ok(sihabRow.detailHtml.includes('Belum dicatat'), 'owner tanpa commitment tampil "Belum dicatat", bukan Rp0 (beda makna: 0 vs tidak ada data)');
  assert.ok(!sihabRow.detailHtml.includes('Total setelah dikurangi pengeluaran'), 'tidak ada sisa yang bisa dihitung kalau pokok belum dicatat sama sekali');
});

test('Porsi per Pemilik — DanaTitipanPortfolioAPI belum dimuat (typeof undefined) -> baris Modal/Pengeluaran/Total lama tetap tampil, 0 crash, 0 baris Modal Dikomit', () => {
  const D = BASE_D();
  const { ctx, els } = makeCtx(D, undefined); // DanaTitipanPortfolioAPI sengaja tidak diinject -> typeof 'undefined' di dalam sandbox
  assert.doesNotThrow(() => ctx.showFilteredTx('account', 'all', 'Akun Test', 'acc1'));
  const rows = ctx.window._filterTxOwnerSplitRows;
  assert.ok(rows[0].detailHtml.includes('Pengeluaran Rp300000'), 'baris lama (Modal/Pengeluaran/Total) tidak boleh regresi');
  assert.ok(!rows[0].detailHtml.includes('Modal Dikomit'), 'guard typeof harus mencegah baris baru muncul kalau modul commitment belum dimuat');
  assert.ok(els.filterTxOwnerSplit.style.display === 'block');
});
