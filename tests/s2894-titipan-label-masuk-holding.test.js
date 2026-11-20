'use strict';
// S2894 — label baris ringkasan kartu pemilik: "Pokok" pada baris "→ Kini" adalah pokok yang MASUK holding
// (allocatedPrincipal), beda dari "Pokok" pada kalimat status (pokok yang dikomit). Label baris diganti "Masuk holding"
// supaya dua angka berbeda tidak memakai kata yang sama. Hanya teks; angka & jalur data tidak berubah.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadSource } = require('./helpers/loadSource');

function render() {
  const ctx = loadSource(['modules/finance/dana-titipan-portfolio-render.js'], {
    escapeHtml: (x) => String(x),
    fmtFull: (n) => 'Rp ' + Math.round(Math.abs(n || 0)).toLocaleString('id-ID'),
  }, ['DanaTitipanPortfolioPresenter']);
  return ctx.DanaTitipanPortfolioPresenter;
}
const owner = { ownerId: 'o1', ownerName: 'renov', principalAmount: 11000000, allocationStatus: 'OVER_ALLOCATED', overAllocatedAmount: 50000, estimatedUnallocated: 0, allocatedPrincipal: 9616338, currentValue: 9603268, gain: -13070, holdings: [], usedTotal: 0, returnedTotal: 0, outstandingPrincipal: 0 };

test('baris ringkasan kartu pemilik memakai label "Masuk holding", bukan "Pokok"', () => {
  const html = render()._ownerCardHtml(owner, 0);
  assert.match(html, /<span class="u-t2">Masuk holding<\/span> <span class="u-fw700 money">Rp 9\.616\.338<\/span>/);
  assert.doesNotMatch(html, /<span class="u-t2">Pokok<\/span>/);
  assert.match(html, /<span class="u-t2">Kini<\/span> <span class="u-fw700 money">Rp 9\.603\.268<\/span>/);
});
test('kalimat status tetap memakai "Pokok" (pokok dikomit) dan detail "Pokok Dikomit" tetap ada', () => {
  const html = render()._ownerCardHtml(owner, 0);
  assert.match(html, /titipan-status-line[^>]*>Pokok Rp 11 jt, terpakai Rp 11,05 jt, kelebihan Rp 50 rb</);
  assert.match(html, /Pokok Dikomit/);
});
test('header tabel pemilik (tema modern/lebar) ikut berlabel "Masuk holding → Kini"', () => {
  const src = fs.readFileSync('modules/finance/dana-titipan-portfolio-render.js', 'utf8');
  assert.match(src, /<th class="num">Masuk holding → Kini<\/th>/);
  assert.doesNotMatch(src, /<th class="num">Pokok → Kini<\/th>/);
});
