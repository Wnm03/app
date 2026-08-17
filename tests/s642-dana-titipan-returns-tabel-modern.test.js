'use strict';
// tests/s642-dana-titipan-returns-tabel-modern.test.js — cakupan Sesi s642
// (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md): mini-tabel Ledger Pro
// (reuse class .tx-tbl* dari s637, 0 CSS baru) KHUSUS isi daftar "Riwayat
// pengembalian" di dalam kartu owner Dana Titipan, KHUSUS
// D.profile.theme==='modern'. Struktur <details> pembungkus kartu owner
// (pemanggil _returnsHistoryHtml, di luar scope method ini) TIDAK disentuh
// sama sekali — sesuai batasan rencana ("perluas isi badan <details>,
// bukan ganti struktur-nya"). Proof-test terpisah krn perubahan struktural
// DOM di dalam komponen kompleks (S631–S634), pola sama s637/s641.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let _n = 0;
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      uid: () => 'r' + (_n += 1),
      save: () => {},
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    },
    ['DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
  return ctx;
}

function baseD(theme) {
  return {
    investments: [{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [],
    assets: [],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 100000000 }],
    profile: theme ? { theme } : {},
  };
}

test('_returnsHistoryHtml() — tema "modern": render mini-tabel .tx-tbl (bukan div/flex lama)', () => {
  const D = baseD('modern');
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000, returnDate: '2026-03-01', notes: 'cicilan 1' });
  const html = ctx.DanaTitipanPortfolioPresenter._returnsHistoryHtml('budi');
  assert.match(html, /class="tx-tbl-wrap[^"]*"/);
  assert.match(html, /<table class="tx-tbl">/);
  assert.match(html, /<td class="tx-tbl-date">2026-03-01<\/td>/);
  assert.match(html, /cicilan 1/);
  assert.doesNotMatch(html, /u-flex u-jcb u-fs11 u-mb2 u-ml10/);
});

test('_returnsHistoryHtml() — 10 tema lama (theme selain "modern"): tetap jalur div/flex lama, 0 <table>', () => {
  const D = baseD('dark');
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000, returnDate: '2026-03-01', notes: 'cicilan 1' });
  const html = ctx.DanaTitipanPortfolioPresenter._returnsHistoryHtml('budi');
  assert.match(html, /class="u-flex u-jcb u-fs11 u-mb2 u-ml10"/);
  assert.doesNotMatch(html, /<table/);
});

test('_returnsHistoryHtml() — D.profile tidak ada / theme kosong: fallback jalur lama (guard aman)', () => {
  const D = baseD(null);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 5000000 });
  const html = ctx.DanaTitipanPortfolioPresenter._returnsHistoryHtml('budi');
  assert.doesNotMatch(html, /<table/);
});

test('_returnsHistoryHtml() — kosong (belum ada return) tetap string kosong di kedua tema (0 regresi)', () => {
  const modernD = baseD('modern');
  const ctxModern = makeCtx(modernD);
  assert.equal(ctxModern.DanaTitipanPortfolioPresenter._returnsHistoryHtml('budi'), '');

  const darkD = baseD('dark');
  const ctxDark = makeCtx(darkD);
  assert.equal(ctxDark.DanaTitipanPortfolioPresenter._returnsHistoryHtml('budi'), '');
});

test('_returnsHistoryHtml() — tema "modern": nominal tetap escapeHtml-safe & tombol hapus (data-action) tetap ada di dalam tabel', () => {
  const D = baseD('modern');
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000, notes: '<script>x</script>' });
  const html = ctx.DanaTitipanPortfolioPresenter._returnsHistoryHtml('budi');
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, new RegExp(`data-action="DanaTitipanReturnUI\\.deleteEntry" data-args='\\["${rec.id}"\\]'`));
});
