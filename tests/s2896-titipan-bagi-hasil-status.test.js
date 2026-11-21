'use strict';
// S2896 (lanjutan): hak bagi hasil proyek yang belum dibayar tampil di kalimat status kartu pemilik Dana Titipan (tanpa membuka "Detail lengkap").
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load() {
  const ctx = loadSource(['modules/finance/dana-titipan-portfolio-render.js'], {
    escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(Math.abs(n || 0)), D: {},
  }, ['DanaTitipanPortfolioPresenter']);
  return ctx.DanaTitipanPortfolioPresenter || ctx.window.DanaTitipanPortfolioPresenter;
}

test('pemilik tanpa Pokok tapi punya bagi hasil: status memuat bagi hasil belum dibayar', () => {
  const R = load();
  const t = R._ownerStatusSentence({ ownerName: 'home in', principalAmount: null, bagiHasilTotal: 1588100 });
  assert.equal(t, 'Pokok belum dicatat · Bagi hasil proyek belum dibayar Rp 1,59 jt');
});

test('pemilik ber-Pokok + bagi hasil: suffix ditambahkan setelah kalimat lama', () => {
  const R = load();
  const o = { principalAmount: 10000000, estimatedUnallocated: 4000000, allocationStatus: 'OK', overAllocatedAmount: 0, bagiHasilTotal: 250000 };
  assert.equal(R._ownerStatusSentence(o), R._ownerStatusSentenceBase(o) + ' · Bagi hasil proyek belum dibayar Rp 250 rb');
});

test('tanpa bagi hasil (0/undefined): kalimat persis seperti semula', () => {
  const R = load();
  for (const b of [0, undefined, null, -5]) {
    const o = { principalAmount: null, bagiHasilTotal: b };
    assert.equal(R._ownerStatusSentence(o), 'Pokok belum dicatat');
  }
  assert.equal(R._ownerStatusSentence(null), 'Pokok belum dicatat');
});
