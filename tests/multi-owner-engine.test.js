'use strict';
// tests/multi-owner-engine.test.js — cakupan modules/shared/multi-owner-engine.js
// (Sesi 390, Multi-Owner Engine fondasi porsi kepemilikan pecahan). Modul
// ini pure TAPI getOwners() punya jalur opsional yang memakai OwnershipEngine
// (guard typeof) utk backward-compat baca field `ownership` lama — jadi ada
// 2 kelompok test: tanpa OwnershipEngine dimuat (guard jalan) dan dengan
// OwnershipEngine dimuat (jalur label dipakai), pola sama dgn cara
// ownership-settings-presenter.test.js menguji guard typeof OwnershipEngine.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/shared/multi-owner-engine.js'], {}, ['MultiOwnerEngine']);
}
function makeCtxWithOwnershipEngine() {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js'],
    {},
    ['OwnershipEngine', 'MultiOwnerEngine']
  );
}

// --- validateOwner ---------------------------------------------------------

test('validateOwner() — baris valid', () => {
  const ctx = makeCtx();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'ayah', porsi: 60 }))), { ok: true });
});

test('validateOwner() — bukan object -> reject', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.validateOwner(null).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner('ayah').ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner([]).ok, false);
});

test('validateOwner() — ownerId kosong/bukan string -> reject', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: '', porsi: 50 }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: '   ', porsi: 50 }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ porsi: 50 }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 123, porsi: 50 }).ok, false);
});

test('validateOwner() — porsi wajib angka, 0 < porsi <= 100', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'a', porsi: '50' }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'a', porsi: 0 }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'a', porsi: -10 }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'a', porsi: 100.01 }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'a', porsi: 100 }).ok, true);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'a', porsi: NaN }).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwner({ ownerId: 'a', porsi: Infinity }).ok, false);
});

// --- totalPorsi / remainingPorsi -------------------------------------------

test('totalPorsi() — jumlah porsi dari beberapa baris', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.totalPorsi([{ porsi: 60 }, { porsi: 40 }]), 100);
});

test('totalPorsi() — bukan array atau kosong -> 0', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.totalPorsi(null), 0);
  assert.equal(ctx.MultiOwnerEngine.totalPorsi([]), 0);
});

test('totalPorsi() — baris rusak dilewati (dianggap 0), tidak throw', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.totalPorsi([{ porsi: 30 }, null, { porsi: 'x' }, { porsi: 20 }]), 50);
});

test('remainingPorsi() — sisa porsi belum dialokasikan', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.remainingPorsi([{ porsi: 70 }]), 30);
  assert.equal(ctx.MultiOwnerEngine.remainingPorsi([]), 100);
  assert.equal(ctx.MultiOwnerEngine.remainingPorsi([{ porsi: 60 }, { porsi: 50 }]), -10);
});

test('remainingPorsi() — dibulatkan 2 desimal (residu float)', () => {
  const ctx = makeCtx();
  const sisa = ctx.MultiOwnerEngine.remainingPorsi([{ porsi: 33.33 }, { porsi: 33.33 }, { porsi: 33.34 }]);
  assert.equal(sisa, 0);
});

// --- validateOwners ----------------------------------------------------------

test('validateOwners() — daftar valid, total 100', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.validateOwners([{ ownerId: 'ayah', porsi: 70 }, { ownerId: 'budi', porsi: 30 }]);
  assert.equal(r.ok, true);
  assert.equal(r.total, 100);
});

test('validateOwners() — toleransi floating point (33.33x3)', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.validateOwners([
    { ownerId: 'a', porsi: 33.33 },
    { ownerId: 'b', porsi: 33.33 },
    { ownerId: 'c', porsi: 33.34 },
  ]);
  assert.equal(r.ok, true);
});

test('validateOwners() — bukan array atau kosong -> reject', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.validateOwners(null).ok, false);
  assert.equal(ctx.MultiOwnerEngine.validateOwners([]).ok, false);
});

test('validateOwners() — total bukan 100 -> reject dgn pesan angka aktual', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.validateOwners([{ ownerId: 'a', porsi: 50 }, { ownerId: 'b', porsi: 30 }]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /80/);
});

test('validateOwners() — ownerId duplikat (case/whitespace-insensitive) -> reject', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.validateOwners([{ ownerId: 'Ayah', porsi: 50 }, { ownerId: ' ayah ', porsi: 50 }]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /duplikat/);
});

test('validateOwners() — baris tidak valid -> reject menyebut index', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.validateOwners([{ ownerId: 'a', porsi: 100 }, { ownerId: '', porsi: 1 }]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /ke-2/);
});

// --- getOwners ---------------------------------------------------------------

test('getOwners() — entity.owners valid dipakai apa adanya', () => {
  const ctx = makeCtx();
  const entity = { owners: [{ ownerId: 'ayah', porsi: 70, ownerName: 'Ayah' }, { ownerId: 'budi', porsi: 30 }] };
  const r = ctx.MultiOwnerEngine.getOwners(entity);
  assert.equal(r.ok, true);
  assert.equal(r.isSynthesized, false);
  assert.equal(r.isMultiOwner, true);
  assert.equal(r.owners.length, 2);
  assert.equal(r.owners[1].ownerName, 'budi'); // fallback ownerName = ownerId
});

test('getOwners() — mengembalikan salinan (tidak reference sama)', () => {
  const ctx = makeCtx();
  const entity = { owners: [{ ownerId: 'a', porsi: 100 }] };
  const r = ctx.MultiOwnerEngine.getOwners(entity);
  r.owners[0].porsi = 1;
  assert.equal(entity.owners[0].porsi, 100);
});

test('getOwners() — entity.owners invalid (total != 100) -> fallback sintesis default', () => {
  const ctx = makeCtx();
  const entity = { owners: [{ ownerId: 'a', porsi: 50 }] };
  const r = ctx.MultiOwnerEngine.getOwners(entity);
  assert.equal(r.isSynthesized, true);
  assert.equal(r.owners.length, 1);
  assert.equal(r.owners[0].porsi, 100);
});

test('getOwners() — tanpa owners maupun ownership, tanpa OwnershipEngine -> default SELF 100%', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.getOwners({});
  assert.equal(r.ok, true);
  assert.equal(r.isSynthesized, true);
  assert.equal(r.isMultiOwner, false);
  assert.deepEqual(JSON.parse(JSON.stringify(r.owners)), [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }]);
});

test('getOwners() — entity null/undefined -> tidak throw, default SELF', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.getOwners(null).owners[0].ownerId, 'SELF');
  assert.equal(ctx.MultiOwnerEngine.getOwners(undefined).owners[0].ownerId, 'SELF');
});

test('getOwners() — legacy entity.ownership (string), TANPA OwnershipEngine dimuat -> guard, fallback default SELF', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.getOwners({ ownership: 'INVESTOR' });
  // OwnershipEngine tidak ada di scope -> typeof guard gagal -> jalur default dipakai
  assert.equal(r.owners[0].ownerId, 'SELF');
});

test('getOwners() — legacy entity.ownership (string), DENGAN OwnershipEngine dimuat -> sintesis 1 pemilik 100% berlabel', () => {
  const ctx = makeCtxWithOwnershipEngine();
  const r = ctx.MultiOwnerEngine.getOwners({ ownership: 'INVESTOR' });
  assert.equal(r.ok, true);
  assert.equal(r.isSynthesized, true);
  assert.equal(r.isMultiOwner, false);
  assert.deepEqual(JSON.parse(JSON.stringify(r.owners)), [{ ownerId: 'INVESTOR', porsi: 100, ownerName: 'Investor', isSelf: false }]);
});

test('getOwners() — legacy entity.ownership tidak valid (dgn OwnershipEngine) -> fallback default SELF', () => {
  const ctx = makeCtxWithOwnershipEngine();
  const r = ctx.MultiOwnerEngine.getOwners({ ownership: 'BUKAN_TIPE' });
  assert.equal(r.owners[0].ownerId, 'SELF');
});

// --- getOwners: sintesis dari titipanAmount legacy (Sesi 406b) -------------

test('getOwners() — titipanAmount legacy (parsial) -> sintesis 2 pemilik, total 100', () => {
  const ctx = makeCtx();
  const entity = { nilai: 100000, titipanAmount: 30000, titipanOwnerType: 'investor', titipanOwnerName: 'Budi' };
  const r = ctx.MultiOwnerEngine.getOwners(entity);
  assert.equal(r.ok, true);
  assert.equal(r.isSynthesized, true);
  assert.equal(r.isMultiOwner, true);
  assert.equal(r.owners.length, 2);
  assert.equal(r.owners[0].ownerId, 'SELF');
  assert.equal(r.owners[0].porsi, 70);
  assert.equal(r.owners[0].isSelf, true);
  assert.equal(r.owners[1].ownerId, 'titipan_investor');
  assert.equal(r.owners[1].ownerName, 'Budi (Investor)');
  assert.equal(r.owners[1].porsi, 30);
  assert.equal(r.owners[1].isSelf, false);
  assert.equal(r.owners[0].porsi + r.owners[1].porsi, 100);
});

test('getOwners() — titipanAmount tanpa titipanOwnerName -> ownerName fallback ke label tipe', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.getOwners({ nilai: 1000, titipanAmount: 500, titipanOwnerType: 'keluarga' });
  assert.equal(r.owners[1].ownerName, 'Keluarga');
  assert.equal(r.owners[1].ownerId, 'titipan_keluarga');
});

test('getOwners() — titipanAmount tipe "lainnya"/tidak dikenal -> label Pihak Lain / default Investor', () => {
  const ctx = makeCtx();
  const rLainnya = ctx.MultiOwnerEngine.getOwners({ nilai: 1000, titipanAmount: 200, titipanOwnerType: 'lainnya' });
  assert.equal(rLainnya.owners[1].ownerName, 'Pihak Lain');
  const rDefault = ctx.MultiOwnerEngine.getOwners({ nilai: 1000, titipanAmount: 200 });
  assert.equal(rDefault.owners[1].ownerName, 'Investor');
  assert.equal(rDefault.owners[1].ownerId, 'titipan_investor');
});

test('getOwners() — titipanAmount == nilai (titipan penuh) -> 1 pemilik saja, SELF tidak muncul', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.getOwners({ nilai: 500, titipanAmount: 500, titipanOwnerType: 'investor', titipanOwnerName: 'Ayu' });
  assert.equal(r.owners.length, 1);
  assert.equal(r.isMultiOwner, false);
  assert.equal(r.owners[0].porsi, 100);
  assert.equal(r.owners[0].ownerId, 'titipan_investor');
});

test('getOwners() — titipanAmount > nilai (data korup/basi) -> dijepit ke nilai, tidak error/porsi > 100', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.getOwners({ nilai: 100, titipanAmount: 999, titipanOwnerType: 'investor' });
  assert.equal(r.owners.length, 1);
  assert.equal(r.owners[0].porsi, 100);
});

test('getOwners() — titipanAmount <= 0 atau nilai tidak valid -> TIDAK disintesis, lanjut cabang berikutnya', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.getOwners({ nilai: 1000, titipanAmount: 0 }).owners[0].ownerId, 'SELF');
  assert.equal(ctx.MultiOwnerEngine.getOwners({ nilai: 1000, titipanAmount: -50 }).owners[0].ownerId, 'SELF');
  assert.equal(ctx.MultiOwnerEngine.getOwners({ nilai: 0, titipanAmount: 500 }).owners[0].ownerId, 'SELF');
  assert.equal(ctx.MultiOwnerEngine.getOwners({ titipanAmount: 500 }).owners[0].ownerId, 'SELF');
  assert.equal(ctx.MultiOwnerEngine.getOwners({ nilai: 1000, titipanAmount: 'abc' }).owners[0].ownerId, 'SELF');
});

test('getOwners() — entity.owners valid tetap prioritas #1, titipanAmount diabaikan kalau owners ada', () => {
  const ctx = makeCtx();
  const entity = { owners: [{ ownerId: 'ayah', porsi: 100 }], nilai: 1000, titipanAmount: 500 };
  const r = ctx.MultiOwnerEngine.getOwners(entity);
  assert.equal(r.isSynthesized, false);
  assert.equal(r.owners[0].ownerId, 'ayah');
});

test('getOwners() — titipanAmount hasil salinan aman dimutasi (tidak reference entity)', () => {
  const ctx = makeCtx();
  const entity = { nilai: 1000, titipanAmount: 500, titipanOwnerType: 'investor' };
  const r = ctx.MultiOwnerEngine.getOwners(entity);
  r.owners[0].porsi = 1;
  assert.equal(entity.nilai, 1000);
  assert.equal(entity.titipanAmount, 500);
});

// --- setOwners -----------------------------------------------------------

test('setOwners() — entity asli tidak dimutasi, balikin salinan baru', () => {
  const ctx = makeCtx();
  const entity = { id: 'aset1', nilai: 1000 };
  const r = ctx.MultiOwnerEngine.setOwners(entity, [{ ownerId: 'ayah', porsi: 100 }]);
  assert.equal(r.ok, true);
  assert.equal(entity.owners, undefined);
  assert.equal(r.entity.id, 'aset1');
  assert.equal(r.entity.nilai, 1000);
  assert.deepEqual(JSON.parse(JSON.stringify(r.entity.owners)), [{ ownerId: 'ayah', porsi: 100, ownerName: 'ayah', isSelf: false }]);
});

test('setOwners() — trim ownerId/ownerName, buang field asing per baris', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.setOwners({}, [{ ownerId: '  ayah  ', porsi: 100, ownerName: '  Ayah Budi  ', extra: 'buang' }]);
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(r.entity.owners)), [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah Budi', isSelf: false }]);
});

test('setOwners() — entity bukan object -> reject', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.setOwners(null, [{ ownerId: 'a', porsi: 100 }]).ok, false);
  assert.equal(ctx.MultiOwnerEngine.setOwners('x', [{ ownerId: 'a', porsi: 100 }]).ok, false);
});

test('setOwners() — owners tidak valid -> reject, entity tidak berubah', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.setOwners({ a: 1 }, [{ ownerId: 'a', porsi: 50 }]);
  assert.equal(r.ok, false);
});

// --- splitByPorsi ----------------------------------------------------------

test('splitByPorsi() — bagi nilai sesuai porsi', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.splitByPorsi(1000000, [{ ownerId: 'ayah', porsi: 70 }, { ownerId: 'budi', porsi: 30 }]);
  assert.equal(r.ok, true);
  assert.equal(r.splits[0].bagian, 700000);
  assert.equal(r.splits[1].bagian, 300000);
});

test('splitByPorsi() — nilai negatif (rugi) ikut terbagi proporsional', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.splitByPorsi(-100, [{ ownerId: 'a', porsi: 50 }, { ownerId: 'b', porsi: 50 }]);
  assert.equal(r.ok, true);
  assert.equal(r.splits[0].bagian, -50);
  assert.equal(r.splits[1].bagian, -50);
});

test('splitByPorsi() — ownerName fallback ke ownerId kalau tidak ada', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.splitByPorsi(100, [{ ownerId: 'x', porsi: 100 }]);
  assert.equal(r.splits[0].ownerName, 'x');
});

test('splitByPorsi() — nilai bukan angka -> reject', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.splitByPorsi('1000', [{ ownerId: 'a', porsi: 100 }]).ok, false);
  assert.equal(ctx.MultiOwnerEngine.splitByPorsi(NaN, [{ ownerId: 'a', porsi: 100 }]).ok, false);
});

test('splitByPorsi() — owners tidak valid (total != 100) -> reject', () => {
  const ctx = makeCtx();
  assert.equal(ctx.MultiOwnerEngine.splitByPorsi(100, [{ ownerId: 'a', porsi: 50 }]).ok, false);
});

test('splitByPorsi() — 3 pemilik dgn porsi pecahan, total split = nilai asal', () => {
  const ctx = makeCtx();
  const r = ctx.MultiOwnerEngine.splitByPorsi(999, [
    { ownerId: 'a', porsi: 33.33 },
    { ownerId: 'b', porsi: 33.33 },
    { ownerId: 'c', porsi: 33.34 },
  ]);
  assert.equal(r.ok, true);
  const totalSplit = r.splits.reduce((s, x) => s + x.bagian, 0);
  assert.ok(Math.abs(totalSplit - 999) < 0.01);
});
