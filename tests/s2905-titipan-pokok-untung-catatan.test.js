'use strict';
// S2905 — Dana Titipan: nilai pemilik = POKOK (selisih nilai holding vs biaya diselaraskan), untung hanya CATATAN (tidak dibagi).
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

function baseD(investments, assets) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    assets: assets || [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], investmentCustodians: [],
  };
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
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(Math.abs(n || 0)),
      fmtFullSigned: (n) => (Number(n || 0) < 0 ? '-' : '') + 'Rp ' + Math.round(Math.abs(n || 0)),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}


const P = () => makeCtx(baseD(), makeStatefulDom()).DanaTitipanPortfolioPresenter;
const hold = (g, a, c) => ({ holdingId: 'h' + g, name: 'Majoris', type: 'reksadana', ownerPct: 15, allocatedPrincipal: a, currentValue: c, gain: g, linkedInvestmentId: 'inv1', linkedOwnerId: null, hasGainTracking: true });
const sihab = (x) => Object.assign({ ownerId: 'o', ownerName: 'mas sihab', allocatedPrincipal: 1673501.7598585547, currentValue: 1700000, gain: 26498.240141445163, holdings: [hold(26498.240141445163, 1673501.7598585547, 1700000)], principalAmount: 1700000, estimatedUnallocated: 26498.240141445305, overAllocatedAmount: 0, allocationStatus: 'OK', usedTotal: 0, returnedTotal: 0, bagiHasilTotal: 0, outstandingPrincipal: 1700000 }, x || {});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1, a + ' != ' + b);

test('S2905-1. mas sihab: selisih 26.498 diselaraskan -> masuk = kini = pokok 1.700.000, catatan 0, sisa 0', () => {
  const a = P()._ownerAlign(sihab());
  near(a.masuk, 1700000); near(a.kini, 1700000); assert.equal(a.catatan, 0); assert.equal(a.sisa, 0); near(a.align, 26498);
});
test('S2905-2. renov-like: sisa 141.777 ditutup untung positif; rugi lain jadi catatan -13.070; sisa 0', () => {
  const o = sihab({ ownerName: 'renov', principalAmount: 11000000, allocatedPrincipal: 9424560.6, currentValue: 9553268, gain: 128707.4, estimatedUnallocated: 141777.4,
    holdings: [hold(141777.4, 8953980.6, 9095758), hold(4289, 200000, 204289), hold(-19917, 170000, 150083), hold(2558, 100580, 103138)] });
  const a = P()._ownerAlign(o);
  near(a.masuk, 9566338); near(a.kini, 9566338); near(a.catatan, -13070); assert.equal(a.sisa, 0);
});
test('S2905-3. sisa yang BUKAN dari untung (uang menganggur) tetap tampil sbg belum teralokasi', () => {
  const a = P()._ownerAlign(sihab({ gain: 0, holdings: [hold(0, 1200000, 1200000)], allocatedPrincipal: 1200000, currentValue: 1200000, estimatedUnallocated: 500000 }));
  assert.equal(a.align, 0); near(a.sisa, 500000); near(a.masuk, 1200000); assert.equal(a.catatan, 0);
});
test('S2905-4. sisa 0: untung tidak ditambahkan ke nilai pemilik, hanya catatan', () => {
  const a = P()._ownerAlign(sihab({ gain: 5000, allocatedPrincipal: 1700000, currentValue: 1705000, estimatedUnallocated: 0, holdings: [hold(5000, 1700000, 1705000)] }));
  near(a.kini, 1700000); near(a.catatan, 5000); assert.equal(a.sisa, 0);
});
test('S2905-5. pokok belum dicatat / OVER_ALLOCATED -> angka mentah', () => {
  const p = P();
  const n = p._ownerAlign(sihab({ principalAmount: null, allocationStatus: 'PRINCIPAL_NOT_SET', estimatedUnallocated: null }));
  assert.equal(n.adj, false); near(n.kini, 1700000); near(n.catatan, 26498.24);
  const v = p._ownerAlign(sihab({ allocationStatus: 'OVER_ALLOCATED', estimatedUnallocated: 0, overAllocatedAmount: 5000 }));
  assert.equal(v.adj, false); near(v.kini, 1700000);
  assert.equal(p._ownerAlign(null).adj, false);
});
test('S2905-6. render: Masuk 1.700.000 -> Kini 1.700.000, "catatan hasil +Rp 0", sisa Rp 0, tanpa untung semu', () => {
  const dom = makeStatefulDom(); const ctx = makeCtx(baseD(), dom); const o = sihab();
  ctx.DanaTitipanPortfolioAPI.build = () => ({ owners: [o], totals: { allocatedPrincipalTotal: o.allocatedPrincipal, currentValueTotal: o.currentValue, gainTotal: o.gain, principalAmountTotal: 1700000, estimatedUnallocatedTotal: o.estimatedUnallocated, overAllocatedTotal: 0, returnedTotalSum: 0, outstandingPrincipalTotal: 1700000 } });
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Masuk holding<\/span> <span class="u-fw700 money">Rp 1700000<\/span>/);
  assert.match(html, /Kini<\/span> <span class="u-fw700 money">Rp 1700000<\/span>\s*&nbsp;<span class="u-t2 u-fs10">catatan hasil<\/span> <span class="money ">\+Rp 0<\/span>/);
  assert.match(html, /terpakai Rp 1,7 jt, sisa Rp 0/);
  assert.match(html, /Catatan Untung-Rugi \(tidak dibagi\)/);
  assert.match(html, /Termasuk selaras ke pokok[^<]*<\/span><span class="u-fw700 titipan-selisih-pokok">Rp 26498</);
  const summ = html.slice(html.indexOf('<summary'), html.indexOf('</summary>'));
  assert.doesNotMatch(summ, /\+Rp 26498/, 'ringkasan pemilik tidak menampilkan untung semu');
  assert.match(html, /Total Estimasi Belum Teralokasi<\/span>\s*<span class="u-fw700">Rp 0</);
  assert.doesNotMatch(html, /TitipanExpenseUI\.open" data-args='\[/, 'tombol catat sisa (berargumen jumlah) hilang bila sisa 0');
});
