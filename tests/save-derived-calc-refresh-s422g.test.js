'use strict';
// tests/save-derived-calc-refresh-s422g.test.js — Sesi 422g/h/i: save() (titik
// tunggal, features-helpers-global-security.js) men-trigger refresh Kekayaan
// Bersih (renderKekayaanBersih(), guard DOM #kbNetWorth, s422g/s422h) tiap ada
// mutasi data yang bisa bikin nilai aset/saldo akun stale (mis.
// `syncLinkedAssetNilaiFromAkun()` di s422f).
//
// s422i (KOREKSI): guard `hitungZakatMaal()` yang SEMPAT ditambahkan di s422g
// DIHAPUS lagi -- `Zakat.hitungMaal()` (pajak-pbb-zakat.js) baca
// `document.getElementById('zmUtang').value` TANPA guard `if(el)` (throw kalau
// modal Zakat Maal tidak terbuka, yaitu praktis SELALU saat save() dipanggil
// dari tempat lain) DAN memanggil `save()` lagi di dalam dirinya sendiri --
// kalau digerbangi dari save() ini jadi crash/rekursi tak terbatas. Test di
// bawah sekarang justru MEMASTIKAN save() TIDAK memanggil hitungZakatMaal().
//
// Fokus test: WIRING save() -> pemanggilan fungsi2 turunan tsb, dgn spy.
// (bukan re-test logic renderBersih()/syncLinkedAssetNilaiFromAkun() sendiri,
// itu sudah dicakup test lain -- modules-calc.test.js / s422f test).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Stub `document` permisif (top-level file ini juga manggil document.addEventListener
// dkk saat di-load), TAPI dgn getElementById('kbNetWorth') bisa dikontrol per test
// buat nge-tes guard DOM s422h.
function makeDocumentStub(kbNetWorthPresent) {
  const base = new Proxy(function () { return base; }, {
    get(target, prop) {
      if (prop === 'getElementById') return (id) => (id === 'kbNetWorth' && kbNetWorthPresent ? {} : null);
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'then') return undefined;
      return () => base;
    },
    apply() { return base; },
  });
  return base;
}

function makeCtx(extraGlobals, documentStub) {
  return loadSource(
    ['modules/shared/features-helpers-global-security.js'],
    {
      DEFAULT_COBEK_KATEGORI: [], DEFAULT_CATS: { income: [], expense: [] }, DEFAULT_ACCOUNTS: [], DEFAULT_SPAREPARTS: [],
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
      ...(documentStub ? { document: documentStub } : {}),
      ...extraGlobals,
    },
    []
  );
}

test('save() — memanggil renderKekayaanBersih() kalau fungsinya ada DAN panel #kbNetWorth sedang di-render (guard DOM s422h)', () => {
  let calls = 0;
  const ctx = makeCtx(
    { renderKekayaanBersih: () => { calls++; } },
    makeDocumentStub(true),
  );
  ctx.save();
  assert.equal(calls, 1);
});

test('save() — TIDAK memanggil renderKekayaanBersih() kalau panel #kbNetWorth TIDAK ada di DOM (halaman lain, guard s422h)', () => {
  let calls = 0;
  const ctx = makeCtx(
    { renderKekayaanBersih: () => { calls++; } },
    makeDocumentStub(false),
  );
  ctx.save();
  assert.equal(calls, 0);
});

test('save() — TIDAK memanggil hitungZakatMaal() (s422i: Zakat.hitungMaal() baca DOM tanpa guard + panggil save() sendiri -- kalau digerbangi dari save() bikin crash/rekursi tak terbatas, lihat FIX-...-s422i-*.md)', () => {
  let calls = 0;
  const ctx = makeCtx({ hitungZakatMaal: () => { calls++; } });
  ctx.save();
  assert.equal(calls, 0);
});

test('save() — TIDAK error kalau renderKekayaanBersih/hitungZakatMaal belum didefinisikan (no-op)', () => {
  const ctx = makeCtx({});
  assert.doesNotThrow(() => ctx.save());
});

test('save() — tetap memanggil invalidateAccBalCache() & syncLinkedAssetNilaiFromAkun() (regresi wiring s422f, tidak boleh ke-drop)', () => {
  const order = [];
  const ctx = makeCtx(
    {
      invalidateAccBalCache: () => order.push('invalidateAccBalCache'),
      syncLinkedAssetNilaiFromAkun: () => order.push('syncLinkedAssetNilaiFromAkun'),
      renderKekayaanBersih: () => order.push('renderKekayaanBersih'),
    },
    makeDocumentStub(true),
  );
  ctx.save();
  // syncLinkedAssetNilaiFromAkun (koreksi a.nilai) harus jalan SEBELUM
  // renderKekayaanBersih (baca a.nilai) supaya panel Kekayaan Bersih tidak
  // menampilkan angka lama sesaat sebelum dikoreksi.
  assert.deepEqual(order, ['invalidateAccBalCache', 'syncLinkedAssetNilaiFromAkun', 'renderKekayaanBersih']);
});
