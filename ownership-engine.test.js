'use strict';
// tests/ownership-engine.test.js — cakupan modules/shared/ownership-engine.js
// (Sesi 191, Ownership Engine fondasi lintas-domain). Modul ini 100% pure
// (tidak ada dependency ke D/document/modul lain), jadi loadSource() dipanggil
// tanpa extraGlobals tambahan apa pun — pola paling sederhana di antara test
// engine lain di project ini (bandingkan tests/fuel-gauge-engine.test.js yang
// butuh mock FuelTankProfile/fuelEfficiency).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/shared/ownership-engine.js'], {}, ['OwnershipEngine']);
}

// --- TYPES / DEFAULT ---------------------------------------------------

// NB: Array.from() dipakai membungkus hasil dari sandbox vm (loadSource())
// sebelum deepEqual — array/object native vm beda "realm" dari Node utama,
// jadi assert.deepEqual/deepStrictEqual (Node --test pakai strict) akan
// gagal reference-equal walau isinya identik kalau dibandingkan mentah-mentah
// (pola sama persis tests/data-archive.test.js).

test('TYPES — 5 tipe resmi, urutan sesuai spesifikasi', () => {
  const ctx = makeCtx();
  assert.deepEqual(Array.from(ctx.OwnershipEngine.TYPES), ['SELF', 'INVESTOR', 'CUSTOMER', 'THIRD_PARTY', 'FAMILY']);
});

test('TYPES — balikin salinan baru tiap akses (tidak bisa dimutasi caller)', () => {
  const ctx = makeCtx();
  const first = ctx.OwnershipEngine.TYPES;
  first.push('HACKED');
  assert.deepEqual(Array.from(ctx.OwnershipEngine.TYPES), ['SELF', 'INVESTOR', 'CUSTOMER', 'THIRD_PARTY', 'FAMILY']);
});

test('DEFAULT — SELF', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.DEFAULT, 'SELF');
});

// --- isValidType ---------------------------------------------------------

test('isValidType() — semua 5 tipe resmi valid', () => {
  const ctx = makeCtx();
  ['SELF', 'INVESTOR', 'CUSTOMER', 'THIRD_PARTY', 'FAMILY'].forEach((t) => {
    assert.equal(ctx.OwnershipEngine.isValidType(t), true, t);
  });
});

test('isValidType() — case-insensitive & toleran whitespace', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.isValidType('self'), true);
  assert.equal(ctx.OwnershipEngine.isValidType('  Investor  '), true);
  assert.equal(ctx.OwnershipEngine.isValidType('Third_Party'), true);
});

test('isValidType() — tipe tidak dikenal/bukan string -> false', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.isValidType('OWNER'), false);
  assert.equal(ctx.OwnershipEngine.isValidType(''), false);
  assert.equal(ctx.OwnershipEngine.isValidType(null), false);
  assert.equal(ctx.OwnershipEngine.isValidType(undefined), false);
  assert.equal(ctx.OwnershipEngine.isValidType(123), false);
  assert.equal(ctx.OwnershipEngine.isValidType({}), false);
});

// --- normalize -------------------------------------------------------------

test('normalize() — balikin tipe resmi uppercase kalau valid', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.normalize('self'), 'SELF');
  assert.equal(ctx.OwnershipEngine.normalize(' family '), 'FAMILY');
  assert.equal(ctx.OwnershipEngine.normalize('THIRD_PARTY'), 'THIRD_PARTY');
});

test('normalize() — null kalau tidak valid', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.normalize('bukan-tipe'), null);
  assert.equal(ctx.OwnershipEngine.normalize(''), null);
  assert.equal(ctx.OwnershipEngine.normalize(null), null);
  assert.equal(ctx.OwnershipEngine.normalize(42), null);
});

// --- validate ----------------------------------------------------------

test('validate() — sukses utk 5 tipe resmi, hasil ternormalisasi', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.validate('customer');
  assert.equal(res.ok, true);
  assert.equal(res.type, 'CUSTOMER');
});

test('validate() — gagal: kosong/whitespace', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.validate('').ok, false);
  assert.equal(ctx.OwnershipEngine.validate('   ').ok, false);
});

test('validate() — gagal: bukan string', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.validate(null).ok, false);
  assert.equal(ctx.OwnershipEngine.validate(undefined).ok, false);
  assert.equal(ctx.OwnershipEngine.validate(1).ok, false);
  assert.equal(ctx.OwnershipEngine.validate({}).ok, false);
});

test('validate() — gagal: bukan salah satu dari 5 tipe resmi, reason sebutkan daftar valid', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.validate('BANK');
  assert.equal(res.ok, false);
  assert.match(res.reason, /SELF/);
  assert.match(res.reason, /FAMILY/);
});

// --- label ---------------------------------------------------------------

test('label() — label Bahasa Indonesia utk 5 tipe resmi', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.label('SELF'), 'Milik Sendiri');
  assert.equal(ctx.OwnershipEngine.label('INVESTOR'), 'Investor');
  assert.equal(ctx.OwnershipEngine.label('CUSTOMER'), 'Pelanggan');
  assert.equal(ctx.OwnershipEngine.label('THIRD_PARTY'), 'Pihak Ketiga');
  assert.equal(ctx.OwnershipEngine.label('FAMILY'), 'Keluarga');
});

test('label() — case-insensitive input tetap balikin label resmi', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.label('family'), 'Keluarga');
});

test('label() — fallback: tipe tidak dikenal balikin apa adanya (tidak crash)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.label('ENTAH'), 'ENTAH');
  assert.equal(ctx.OwnershipEngine.label(123), '123');
});

// --- resolve ---------------------------------------------------------------

test('resolve() — entity dgn ownership valid -> type tsb, isDefault false', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.resolve({ id: 'a1', ownership: 'investor' });
  assert.equal(res.ok, true);
  assert.equal(res.type, 'INVESTOR');
  assert.equal(res.isDefault, false);
});

test('resolve() — entity tanpa field ownership -> fallback DEFAULT, isDefault true', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.resolve({ id: 'a1' });
  assert.equal(res.ok, true);
  assert.equal(res.type, 'SELF');
  assert.equal(res.isDefault, true);
});

test('resolve() — entity dgn ownership tidak valid -> fallback DEFAULT (toleran, bukan error)', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.resolve({ id: 'a1', ownership: 'ENTAH' });
  assert.equal(res.ok, true);
  assert.equal(res.type, 'SELF');
  assert.equal(res.isDefault, true);
});

test('resolve() — entity null/undefined/bukan object -> fallback DEFAULT, tidak crash', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.resolve(null).type, 'SELF');
  assert.equal(ctx.OwnershipEngine.resolve(undefined).type, 'SELF');
  assert.equal(ctx.OwnershipEngine.resolve('bukan-object').type, 'SELF');
  assert.equal(ctx.OwnershipEngine.resolve(42).type, 'SELF');
});

// --- assign ----------------------------------------------------------------

test('assign() — sukses: balikin salinan baru dgn ownership ternormalisasi', () => {
  const ctx = makeCtx();
  const original = { id: 'acc1', name: 'BCA' };
  const res = ctx.OwnershipEngine.assign(original, 'investor');
  assert.equal(res.ok, true);
  assert.equal(res.entity.ownership, 'INVESTOR');
  assert.equal(res.entity.id, 'acc1');
  assert.equal(res.entity.name, 'BCA');
});

test('assign() — PURE: entity asli TIDAK dimutasi', () => {
  const ctx = makeCtx();
  const original = { id: 'acc1', name: 'BCA' };
  ctx.OwnershipEngine.assign(original, 'FAMILY');
  assert.equal(original.ownership, undefined);
});

test('assign() — timpa ownership existing dgn nilai baru', () => {
  const ctx = makeCtx();
  const original = { id: 'acc1', ownership: 'SELF' };
  const res = ctx.OwnershipEngine.assign(original, 'customer');
  assert.equal(res.entity.ownership, 'CUSTOMER');
});

test('assign() — gagal: entity bukan object (null/array/primitive)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.assign(null, 'SELF').ok, false);
  assert.equal(ctx.OwnershipEngine.assign(undefined, 'SELF').ok, false);
  assert.equal(ctx.OwnershipEngine.assign([], 'SELF').ok, false);
  assert.equal(ctx.OwnershipEngine.assign('str', 'SELF').ok, false);
  assert.equal(ctx.OwnershipEngine.assign(1, 'SELF').ok, false);
});

test('assign() — gagal: type tidak valid, entity tidak diubah/tidak dibalikin', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.assign({ id: 'a1' }, 'TIDAK_VALID');
  assert.equal(res.ok, false);
  assert.equal(res.entity, undefined);
});

// --- filterByType ------------------------------------------------------

test('filterByType() — filter entity sesuai tipe (persis)', () => {
  const ctx = makeCtx();
  const list = [
    { id: 1, ownership: 'SELF' },
    { id: 2, ownership: 'INVESTOR' },
    { id: 3, ownership: 'investor' },
    { id: 4, ownership: 'FAMILY' },
  ];
  const res = ctx.OwnershipEngine.filterByType(list, 'investor');
  assert.equal(res.ok, true);
  assert.deepEqual(res.items.map((i) => i.id), [2, 3]);
});

test('filterByType() — entity tanpa ownership ikut dianggap SELF/default', () => {
  const ctx = makeCtx();
  const list = [{ id: 1 }, { id: 2, ownership: 'SELF' }, { id: 3, ownership: 'FAMILY' }];
  const res = ctx.OwnershipEngine.filterByType(list, 'SELF');
  assert.deepEqual(res.items.map((i) => i.id), [1, 2]);
});

test('filterByType() — list kosong -> items kosong (bukan error)', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.filterByType([], 'SELF');
  assert.equal(res.ok, true);
  assert.deepEqual(res.items, []);
});

test('filterByType() — gagal: list bukan array', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.filterByType(null, 'SELF').ok, false);
  assert.equal(ctx.OwnershipEngine.filterByType({}, 'SELF').ok, false);
});

test('filterByType() — gagal: type tidak valid', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.filterByType([{ id: 1 }], 'BUKAN_TIPE');
  assert.equal(res.ok, false);
});

test('filterByType() — tidak memutasi list asli', () => {
  const ctx = makeCtx();
  const list = [{ id: 1, ownership: 'SELF' }];
  ctx.OwnershipEngine.filterByType(list, 'FAMILY');
  assert.equal(list.length, 1);
});

// --- groupByType -------------------------------------------------------

test('groupByType() — 5 bucket resmi selalu ada, meski kosong', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.groupByType([]);
  assert.equal(res.ok, true);
  assert.deepEqual(Array.from(Object.keys(res.groups)).sort(), ['CUSTOMER', 'FAMILY', 'INVESTOR', 'SELF', 'THIRD_PARTY']);
  Object.values(res.groups).forEach((arr) => assert.deepEqual(Array.from(arr), []));
});

test('groupByType() — kelompokkan entity ke bucket yang benar, tanpa ownership -> SELF', () => {
  const ctx = makeCtx();
  const list = [
    { id: 1, ownership: 'SELF' },
    { id: 2 },
    { id: 3, ownership: 'customer' },
    { id: 4, ownership: 'THIRD_PARTY' },
  ];
  const res = ctx.OwnershipEngine.groupByType(list);
  assert.deepEqual(Array.from(res.groups.SELF).map((i) => i.id), [1, 2]);
  assert.deepEqual(Array.from(res.groups.CUSTOMER).map((i) => i.id), [3]);
  assert.deepEqual(Array.from(res.groups.THIRD_PARTY).map((i) => i.id), [4]);
  assert.deepEqual(Array.from(res.groups.INVESTOR), []);
  assert.deepEqual(Array.from(res.groups.FAMILY), []);
});

test('groupByType() — gagal: list bukan array', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.groupByType('bukan-array').ok, false);
});

// --- countByType -------------------------------------------------------

test('countByType() — hitungan per tipe, default 0 utk bucket kosong', () => {
  const ctx = makeCtx();
  const list = [
    { id: 1, ownership: 'SELF' },
    { id: 2, ownership: 'SELF' },
    { id: 3, ownership: 'FAMILY' },
  ];
  const res = ctx.OwnershipEngine.countByType(list);
  assert.equal(res.ok, true);
  assert.deepEqual({ ...res.counts }, { SELF: 2, INVESTOR: 0, CUSTOMER: 0, THIRD_PARTY: 0, FAMILY: 1 });
});

test('countByType() — list kosong -> semua 0', () => {
  const ctx = makeCtx();
  const res = ctx.OwnershipEngine.countByType([]);
  assert.deepEqual({ ...res.counts }, { SELF: 0, INVESTOR: 0, CUSTOMER: 0, THIRD_PARTY: 0, FAMILY: 0 });
});

test('countByType() — gagal: list bukan array', () => {
  const ctx = makeCtx();
  assert.equal(ctx.OwnershipEngine.countByType(null).ok, false);
});

// --- Integrasi ringan end-to-end ------------------------------------------

test('integrasi — assign() lalu resolve() balikin tipe konsisten', () => {
  const ctx = makeCtx();
  const assigned = ctx.OwnershipEngine.assign({ id: 'x1' }, 'third_party');
  assert.equal(assigned.ok, true);
  const resolved = ctx.OwnershipEngine.resolve(assigned.entity);
  assert.equal(resolved.type, 'THIRD_PARTY');
  assert.equal(resolved.isDefault, false);
});
