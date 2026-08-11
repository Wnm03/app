'use strict';
// tests/s542-custodian-rename-remove.test.js — Sesi S542, follow-up ringan
// #2 pasca-S541 (lihat s541-SESSION-NOTE.md §Non-goals: "Rename/hapus
// kustodian dari registry"). CustodianRegistry (modules/shared/
// custodian-registry.js, S540-A) sebelumnya cuma punya listAll()/
// findOrCreate() -- sesi ini nambah rename(id, newName)/remove(id), pola
// guard `typeof` & validasi SAMA PERSIS findOrCreate() (0 pola baru
// diciptakan). Test ini mirror gaya tests/s540a-custodian-registry.test.js.
//
// 0 file lain yang disentuh logic-nya sesi ini selain custodian-registry.js
// -- UI (investasi-list-view.js) murni consumer tipis yang dilegasikan
// penuh ke fungsi ini (0 logic UI yang perlu diuji terpisah karena tidak
// ada percabangan baru di luar 2 fungsi ini), pola sama S540-A/S540-C.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/custodian-registry.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => { D._saved = (D._saved || 0) + 1; } },
    ['CustodianRegistry'],
  );
}

test('1. rename(id, newName) -> ubah name entri existing, id TIDAK berubah, panggil save()', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }] };
  const ctx = makeCtx(D);
  const ok = ctx.CustodianRegistry.rename('c1', 'Majoris Insight');
  assert.equal(ok, true);
  assert.equal(D.investmentCustodians[0].id, 'c1');
  assert.equal(D.investmentCustodians[0].name, 'Majoris Insight');
  assert.equal(D._saved, 1);
});

test('2. rename(id, newName) -> trim whitespace sebelum disimpan', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }] };
  const ctx = makeCtx(D);
  ctx.CustodianRegistry.rename('c1', '  Bibit  ');
  assert.equal(D.investmentCustodians[0].name, 'Bibit');
});

test('3. rename(id tidak ditemukan, newName) -> balikin false, 0 perubahan registry', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }] };
  const ctx = makeCtx(D);
  const ok = ctx.CustodianRegistry.rename('c-tidak-ada', 'Nama Baru');
  assert.equal(ok, false);
  assert.equal(D.investmentCustodians[0].name, 'Majoris'); // tidak tersentuh
  assert.equal(D._saved, undefined); // save() tidak ikut terpanggil krn 0 perubahan
});

test('4. rename(id, "") atau whitespace -> throw Error, TIDAK menulis apa pun', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }] };
  const ctx = makeCtx(D);
  assert.throws(() => ctx.CustodianRegistry.rename('c1', ''), /wajib diisi/);
  assert.throws(() => ctx.CustodianRegistry.rename('c1', '   '), /wajib diisi/);
  assert.equal(D.investmentCustodians[0].name, 'Majoris');
});

test('5. rename() TIDAK dedup/collapse ke entri lain yg kebetulan nama jadi sama (registry tetap dedup by id)', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }, { id: 'c2', name: 'Bibit' }] };
  const ctx = makeCtx(D);
  ctx.CustodianRegistry.rename('c2', 'Majoris'); // sengaja jadi sama nama dgn c1
  assert.equal(D.investmentCustodians.length, 2); // tetap 2 baris terpisah
  assert.equal(D.investmentCustodians[0].id, 'c1');
  assert.equal(D.investmentCustodians[1].id, 'c2');
  assert.equal(D.investmentCustodians[1].name, 'Majoris');
});

test('6. remove(id) -> hapus entri dari D.investmentCustodians, panggil save()', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }, { id: 'c2', name: 'Bibit' }] };
  const ctx = makeCtx(D);
  const ok = ctx.CustodianRegistry.remove('c1');
  assert.equal(ok, true);
  assert.equal(D.investmentCustodians.length, 1);
  assert.equal(D.investmentCustodians[0].id, 'c2');
  assert.equal(D._saved, 1);
});

test('7. remove(id tidak ditemukan) -> balikin false, 0 perubahan registry', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }] };
  const ctx = makeCtx(D);
  const ok = ctx.CustodianRegistry.remove('c-tidak-ada');
  assert.equal(ok, false);
  assert.equal(D.investmentCustodians.length, 1);
  assert.equal(D._saved, undefined);
});

test('8. remove(id) pada registry kosong/belum pernah diisi -> balikin false, 0 crash', () => {
  const D = {};
  const ctx = makeCtx(D);
  const ok = ctx.CustodianRegistry.remove('c1');
  assert.equal(ok, false);
  assert.equal(D.investmentCustodians.length, 0);
});

test('9. remove(id) TIDAK menyentuh field lain di D (mis. investments[] holding yg masih referensikan id itu) -- 0 cascading delete, sesuai catatan desain', () => {
  const D = {
    investmentCustodians: [{ id: 'c1', name: 'Majoris' }],
    investments: [{ id: 'h1', name: 'Sucorinvest MM', custodianId: 'c1' }],
  };
  const ctx = makeCtx(D);
  ctx.CustodianRegistry.remove('c1');
  assert.equal(D.investments[0].custodianId, 'c1'); // holding TIDAK ikut berubah/terhapus
  assert.equal(D.investmentCustodians.length, 0);
});

test('10. rename() lalu remove() berurutan -> hasil akhir konsisten (rename dulu, baru dihapus, bukan sebaliknya)', () => {
  const D = { investmentCustodians: [{ id: 'c1', name: 'Majoris' }] };
  const ctx = makeCtx(D);
  ctx.CustodianRegistry.rename('c1', 'Majoris Insight');
  const ok = ctx.CustodianRegistry.remove('c1');
  assert.equal(ok, true);
  assert.equal(D.investmentCustodians.length, 0);
});
