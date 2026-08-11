'use strict';
// tests/worthit-numeric-guard-s403.test.js — cakupan BUG-FIN-002 lanjutan di
// modules/finance/worthit.js:
//   1. hitung() — tenor hasil parseInt(...)||0 dulu tidak dijaga <0, bocor
//      ke WorthIt._last.tenor & berpotensi kepakai apa adanya di catatBeli()
//      ("d.tenor||6" -- negatif tetap truthy). Fix: clamp ke 0.
//   2. computeScore() — dulu baca it.price/it.hargaNormal mentah (beda dari
//      renderList() yang sudah defensif Number(it.price)||0), record wishlist
//      korup (price non-numeric) bisa NaN-poison skor. Fix: Number(it.x)||0.
// Pakai fakeDom (pola sama tests/inventory-transfer-chip-ui-s374.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakeDom(overrides) {
  const els = Object.assign(
    {
      wiName: { value: 'Kulkas' },
      wiPrice: { value: '3000000' },
      wiMethod: { value: 'cicilan' },
      wiCategory: { value: 'kebutuhan' },
      wiAlasanKebutuhan: { value: 'wajib' },
      wiDP: { value: '500000' },
      wiTenor: { value: '-6' },
      wiCicilanBulan: { value: '300000' },
      wiIsDiskon: { checked: false },
      wiHargaNormal: { value: '' },
      wiVerdictBox: { style: {} },
      wiVerdict: {},
      wiIssueList: {},
      wiResultBox: { style: {} },
    },
    overrides,
  );
  return { getElementById: (id) => (id in els ? els[id] : null), _els: els };
}

function makeCtx(D, document) {
  return loadSource(
    ['modules/finance/worthit.js'],
    {
      D,
      document,
      parsePzNum: (v) => {
        if (v == null) return 0;
        const str = String(v);
        const neg = /-/.test(str);
        const digits = str.replace(/[^0-9]/g, '');
        const n = Number(digits);
        return isNaN(n) ? 0 : (neg ? -n : n);
      },
      toast: () => {},
      totalSaldoAkun: () => 0,
      FI: { monthlySurplus: () => 100000, effectiveMonths: () => 3, monthsOfDataAvailable: () => 3 },
      fmtFull: (n) => 'Rp' + n,
      escapeHtml: (s) => String(s),
    },
    ['WorthIt'],
  );
}

function baseD() {
  return { transactions: [], targets: [], bills: [], wishlist: [] };
}

test('hitung() — tenor negatif diclamp ke 0 di WorthIt._last, tidak lolos apa adanya', () => {
  const D = baseD();
  const ctx = makeCtx(D, fakeDom());
  ctx.WorthIt.hitung();
  assert.equal(ctx.WorthIt._last.tenor, 0, 'tenor negatif harus diclamp ke 0');
});

test('hitung() — tenor positif tetap tersimpan apa adanya (0 regresi)', () => {
  const D = baseD();
  const ctx = makeCtx(D, fakeDom({ wiTenor: { value: '12' } }));
  ctx.WorthIt.hitung();
  assert.equal(ctx.WorthIt._last.tenor, 12);
});

test('computeScore() — price non-numeric (record korup) tidak menghasilkan NaN', () => {
  const D = baseD();
  const ctx = makeCtx(D, fakeDom());
  const it = { cat: 'keinginan', catExtra: 'lama', urgensi: 'bisa_nunggu', sudahPunya: false, price: 'rusak', isDiskon: false };
  const { score } = ctx.WorthIt.computeScore(it);
  assert.ok(Number.isFinite(score), 'score harus angka valid, bukan NaN');
});

test('computeScore() — price/hargaNormal numerik normal tetap hitung diskon dgn benar (0 regresi)', () => {
  const D = baseD();
  const ctx = makeCtx(D, fakeDom());
  const it = { cat: 'keinginan', catExtra: 'lama', urgensi: 'bisa_nunggu', sudahPunya: false, price: 100000, isDiskon: true, hargaNormal: 200000 };
  const { score, reasons } = ctx.WorthIt.computeScore(it);
  assert.ok(Number.isFinite(score));
  assert.ok(reasons.some((r) => /Diskon/.test(r.text)));
});
