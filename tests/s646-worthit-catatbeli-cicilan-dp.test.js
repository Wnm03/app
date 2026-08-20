'use strict';
// tests/s646-worthit-catatbeli-cicilan-dp.test.js — regresi BUG-008
// (TODO.md, "Finance/WorthIt — dari Sesi Audit worthit.js"):
//   1. WorthIt.catatBeli() dulu SELALU memaksa cicilanLastInput='total' lalu
//      syncCicilanPreview('total') -- ini menghitung ULANG txCicilanPerBulan
//      dari Total÷Tenor, MENIMPA d.cicilanBulan yang sudah dihitung presisi
//      oleh kalkulator WorthIt (mis. skema bunga custom di luar rumus
//      total/tenor sederhana di cicilan.js). Fix: kalau d.cicilanBulan>0,
//      jadikan itu SUMBER (cicilanLastInput='perbulan') supaya Total yang
//      direkalkulasi, bukan sebaliknya.
//   2. DP (d.dp) dulu tidak pernah dikurangkan dari Total Harga cicilan --
//      txCicilanTotal selalu diisi d.price mentah walau sebagian sudah
//      dibayar DP di muka (lihat WorthIt.hitung(), uangKeluarSekarang=dp).
//      Fix: txCicilanTotal = max(0, price-dp).
// Pakai fakeDom (pola sama tests/worthit-numeric-guard-s403.test.js), plus
// load cicilan.js bareng worthit.js karena catatBeli() memanggil
// syncCicilanPreview() langsung (fungsi global di cicilan.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakeDom(overrides) {
  const els = Object.assign(
    {
      txNote: { value: '' },
      txCat: { value: '' },
      txCicilanNama: { value: '' },
      txCicilanTotal: { value: '' },
      txCicilanPerBulan: { value: '' },
      txCicilanTenor: { value: '' },
      txCicilanBunga: { value: '0' },
      txCicilanShared: { checked: false },
      txCicilanSharedPct: { value: '50' },
      txCicilanSharedNominal: { value: '' },
      txCicilanPreview: { style: {} },
      prevPerBulan: {},
      prevTotal: {},
      prevSisa: {},
      prevMineRow: { style: {} },
      prevPerBulanMine: {},
      txCicilanSharedPreview: {},
      txAmt: { value: '' },
    },
    overrides,
  );
  return { getElementById: (id) => (id in els ? els[id] : null), _els: els };
}

function makeCtx(document) {
  return loadSource(
    ['modules/finance/worthit.js', 'modules/finance/cicilan.js'],
    {
      document,
      cicilanLastInput: 'total',
      cicilanSharedLastInput: 'pct',
      toast: () => {},
      closeModal: () => {},
      openTxModal: () => {},
      guessCategoryFromReceiptText: () => null,
      selectTxCat: () => {},
      setPayMethod: () => {},
      fmtFull: (n) => 'Rp' + n,
      fmt: (n) => 'Rp' + n,
      escapeHtml: (s) => String(s),
    },
    ['WorthIt'],
  );
}

test('catatBeli() — cicilanBulan dari kalkulator TIDAK ditimpa syncCicilanPreview', () => {
  const document = fakeDom();
  const ctx = makeCtx(document);
  ctx.WorthIt._last = {
    name: 'HP Baru',
    price: 6000000,
    method: 'cicilan',
    dp: 0,
    tenor: 12,
    cicilanBulan: 555000, // nilai presisi dari kalkulator, BUKAN 6000000/12=500000
    isDiskon: false,
    hargaNormal: 0,
    hematPersen: 0,
  };
  ctx.WorthIt.catatBeli();
  assert.equal(
    document._els.txCicilanPerBulan.value,
    '555000',
    'cicilan/bulan dari kalkulator harus tetap 555000, bukan direkalkulasi dari total/tenor',
  );
});

test('catatBeli() — DP dikurangkan dari Total Harga cicilan (financed = price-dp)', () => {
  const document = fakeDom();
  const ctx = makeCtx(document);
  ctx.WorthIt._last = {
    name: 'Motor Bekas',
    price: 10000000,
    method: 'cicilan',
    dp: 2000000,
    tenor: 10,
    cicilanBulan: 0, // user cuma isi Total Harga di kalkulator, bukan cicilan/bulan
    isDiskon: false,
    hargaNormal: 0,
    hematPersen: 0,
  };
  ctx.WorthIt.catatBeli();
  assert.equal(
    document._els.txCicilanTotal.value,
    '8000000',
    'Total Harga cicilan harus price-dp (10.000.000-2.000.000), bukan price mentah',
  );
});

test('catatBeli() — tanpa DP, Total Harga cicilan tetap = price penuh (0 regresi)', () => {
  const document = fakeDom();
  const ctx = makeCtx(document);
  ctx.WorthIt._last = {
    name: 'Kulkas',
    price: 3000000,
    method: 'cicilan',
    dp: 0,
    tenor: 6,
    cicilanBulan: 0,
    isDiskon: false,
    hargaNormal: 0,
    hematPersen: 0,
  };
  ctx.WorthIt.catatBeli();
  assert.equal(document._els.txCicilanTotal.value, '3000000');
});

test('catatBeli() — method tunai tidak tersentuh perubahan ini (0 regresi)', () => {
  const document = fakeDom();
  const ctx = makeCtx(document);
  ctx.WorthIt._last = {
    name: 'Sepatu',
    price: 500000,
    method: 'tunai',
    dp: 0,
    tenor: 0,
    cicilanBulan: 0,
    isDiskon: false,
    hargaNormal: 0,
    hematPersen: 0,
  };
  ctx.WorthIt.catatBeli();
  assert.equal(document._els.txAmt.value, '500000');
});
