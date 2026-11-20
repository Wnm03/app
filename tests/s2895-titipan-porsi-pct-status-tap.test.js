'use strict';
// S2895 — Dana Titipan (audit browser): (1) Porsi holding dibulatkan 2 desimal (bukan 84.32566907725582%),
// (2) kalimat status pemilik tanpa Pokok menyebut pengeluaran akun tertaut, (3) tap target summary >= 44px.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadSource } = require('./helpers/loadSource');

function render(extra) {
  const ctx = loadSource(['modules/finance/dana-titipan-portfolio-render.js'], Object.assign({
    escapeHtml: (x) => String(x),
    fmtFull: (n) => 'Rp ' + Math.round(Math.abs(n || 0)).toLocaleString('id-ID'),
  }, extra || {}), ['DanaTitipanPortfolioPresenter']);
  return ctx.DanaTitipanPortfolioPresenter;
}

test('_pctText membulatkan max 2 desimal, koma Indonesia, tanpa nol berlebih', () => {
  const r = render();
  assert.equal(r._pctText(84.32566907725582), '84,33%');
  assert.equal(r._pctText(15.674330922744172), '15,67%');
  assert.equal(r._pctText(100), '100%');
  assert.equal(r._pctText(70), '70%');
  assert.equal(r._pctText(undefined), '0%');
});

test('baris holding (flat & tabel modern) tidak menampilkan porsi mentah', () => {
  const r = render();
  const hh = { name: 'Majoris', ownerPct: 84.32566907725582, currentValue: 1000000, hasGainTracking: false, linkedAssetId: 'a1' };
  const flat = r._holdingRowHtml(hh);
  const modern = r._holdingRowHtmlModern(hh);
  assert.match(flat, /\(84,33%\)/);
  assert.match(modern, /84,33%<\/td>/);
  assert.doesNotMatch(flat + modern, /84\.3256/);
});

test('kalimat status: Pokok kosong + ada transaksi akun tertaut -> sebut terpakai & nama akun', () => {
  const r = render();
  r._expenseComparisonForOwner = () => ({ total: 4307418, accountNames: ['BRI'] });
  assert.equal(r._ownerStatusSentence({ principalAmount: null }), 'Pokok belum dicatat, terpakai Rp 4,31 jt dari transaksi BRI');
});

test('kalimat status: Pokok kosong tanpa pembanding tetap "Pokok belum dicatat"', () => {
  const r = render();
  r._expenseComparisonForOwner = () => null;
  assert.equal(r._ownerStatusSentence({ principalAmount: null }), 'Pokok belum dicatat');
  r._expenseComparisonForOwner = () => ({ total: 0, accountNames: ['BRI'] });
  assert.equal(r._ownerStatusSentence({ principalAmount: null }), 'Pokok belum dicatat');
});

test('kalimat status dengan Pokok tercatat tidak berubah', () => {
  const r = render();
  r._expenseComparisonForOwner = () => ({ total: 999, accountNames: ['BRI'] });
  assert.equal(r._ownerStatusSentence({ principalAmount: 11000000, allocationStatus: 'OVER_ALLOCATED', overAllocatedAmount: 50000 }), 'Pokok Rp 11 jt, terpakai Rp 11,05 jt, kelebihan Rp 50 rb');
});

test('CSS: summary Rincian angka/Riwayat transaksi/Detail lengkap/Tautkan Aset Baru diberi padding tap target', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(css, /:is\(\.titipan-pool-detail,\.titipan-ledger-toggle,\.titipan-detail-toggle,\.titipan-linkasset-toggle\)>summary\{padding:14px 0\}/);
  assert.ok(Buffer.byteLength(css) <= 180000);
});

test('CSS: tombol nama holding & header grup kustodian ikut diberi padding tap target', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(css, /\.titipan-holding-row button,\.titipan-owner-card \.tx-tbl-name-btn,\.titipan-custodian-group>summary\{padding:12px 0!important\}/);
  assert.ok(Buffer.byteLength(css) <= 180000);
});

test('holding tanpa pelacakan untung-rugi diberi keterangan (flat & tabel modern); yang berpelacakan tidak', () => {
  const r = render();
  const nt = { name: 'Majoris', ownerPct: 100, currentValue: 9100000, hasGainTracking: false, linkedAssetId: 'a1' };
  const tr = { name: 'bibit', ownerPct: 100, currentValue: 1000000, allocatedPrincipal: 900000, gain: 100000, hasGainTracking: true, linkedAssetId: 'a2' };
  assert.match(r._holdingRowHtml(nt), /tanpa pelacakan untung-rugi/);
  assert.match(r._holdingRowHtmlModern(nt), /tanpa pelacakan/);
  assert.doesNotMatch(r._holdingRowHtml(tr) + r._holdingRowHtmlModern(tr), /tanpa pelacakan/);
});
