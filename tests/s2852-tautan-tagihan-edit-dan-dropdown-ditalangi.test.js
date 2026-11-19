'use strict';
// S2852 — (a) edit lewat modal (cabang umum) tidak lagi melepas billLinkId bila tagihan masih ada; (b) dropdown "ditalangi" hanya memuat pemilik berkartu Dana Titipan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const ALL = [{ ownerId: 'H', ownerName: 'home in' }, { ownerId: 'R', ownerName: 'renov' }, { ownerId: 'X', ownerName: 'hanya registri' }];
const OWNERS = { acc_cash: [{ ownerId: 'SELF', isSelf: true }], acc_bri: [{ ownerId: 'H', ownerName: 'home in', isSelf: false }] };
function mkCtx(api, D0) {
  const D = Object.assign({ accounts: [{ id: 'acc_cash' }, { id: 'acc_bri' }], piutang: [], transactions: [], renovProjects: [], bills: [], billsArchive: [] }, D0 || {});
  return loadSource(['modules/finance/tx-renov.js'], {
    D, sameId: (a, b) => String(a) === String(b), uid: () => 'u1', toast() {},
    getAccOwnersRaw: (id) => ({ ok: true, owners: OWNERS[id] || [] }),
    DanaTitipanPortfolioAPI: api,
  });
}
const ids = (arr) => Array.from(arr.map((o) => o.ownerId));

test('S2852 (a): billLinkKeepOnGenericEdit — tagihan aktif / arsip dipertahankan', () => {
  const ctx = mkCtx({ listExistingOwners: () => ALL }, { bills: [{ id: 7, kind: 'tagihan' }], billsArchive: [{ id: 9, kind: 'cicilan' }] });
  assert.equal(ctx.billLinkKeepOnGenericEdit({ type: 'expense', billLinkId: 7 }, false), true);
  assert.equal(ctx.billLinkKeepOnGenericEdit({ type: 'expense', billLinkId: '7' }, false), true, 'id string/number sama');
  assert.equal(ctx.billLinkKeepOnGenericEdit({ type: 'expense', billLinkId: 9 }, false), true, 'tagihan arsip lunas');
});

test('S2852 (a): billLinkKeepOnGenericEdit — lepas tautan untuk kasus sengaja / yatim', () => {
  const ctx = mkCtx({ listExistingOwners: () => ALL }, { bills: [{ id: 7, kind: 'tagihan' }] });
  assert.equal(ctx.billLinkKeepOnGenericEdit({ type: 'expense', billLinkId: 7 }, true), false, 'Cara Bayar diganti pengguna = lepas');
  assert.equal(ctx.billLinkKeepOnGenericEdit({ type: 'income', billLinkId: 7 }, false), false, 'diubah jadi pemasukan = lepas');
  assert.equal(ctx.billLinkKeepOnGenericEdit({ type: 'expense', billLinkId: 404 }, false), false, 'tagihan sudah tak ada = bersihkan tautan yatim');
  assert.equal(ctx.billLinkKeepOnGenericEdit({ type: 'expense' }, false), false);
  assert.equal(ctx.billLinkKeepOnGenericEdit(null, false), false);
});

test('S2852 (a): transaksi-b.js memakai guard (bukan delete tanpa syarat) di cabang umum', () => {
  const src = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');
  assert.match(src, /billLinkKeepOnGenericEdit\(existingTx,_txPayMethodTouchedByUser\)\)\)delete existingTx\.billLinkId/);
  assert.equal((src.match(/\ndelete existingTx\.billLinkId;/g) || []).length, 0, 'tak ada delete tanpa syarat tersisa');
});

test('S2852 (b): dropdown ditalangi — hanya pemilik berkartu Dana Titipan', () => {
  const ctx = mkCtx({ listExistingOwners: () => ALL, build: () => ({ owners: [{ ownerId: 'H' }, { ownerId: 'R' }] }) });
  assert.deepEqual(ids(ctx.billTalanganOwnerChoices('acc_cash')), ['H', 'R'], 'X (hanya registri) tidak ditawarkan');
  assert.deepEqual(ids(ctx.billTalanganOwnerChoices('acc_bri')), ['R'], 'akun memuat porsi H: tetap tidak menawarkan H');
});

test('S2852 (b): pemilik tersimpan di tagihan (keepOwnerId) tetap ditawarkan', () => {
  const ctx = mkCtx({ listExistingOwners: () => ALL, build: () => ({ owners: [{ ownerId: 'H' }] }) });
  assert.deepEqual(ids(ctx.billTalanganOwnerChoices('acc_cash')), ['H']);
  assert.deepEqual(ids(ctx.billTalanganOwnerChoices('acc_cash', null, 'X')), ['H', 'X']);
});

test('S2852 (b): build() tak ada / gagal / bentuk tak dikenal = daftar penuh (perilaku S2850)', () => {
  assert.deepEqual(ids(mkCtx({ listExistingOwners: () => ALL }).billTalanganOwnerChoices('acc_cash')), ['H', 'R', 'X']);
  assert.deepEqual(ids(mkCtx({ listExistingOwners: () => ALL, build: () => { throw new Error('x'); } }).billTalanganOwnerChoices('acc_cash')), ['H', 'R', 'X']);
  assert.deepEqual(ids(mkCtx({ listExistingOwners: () => ALL, build: () => ({}) }).billTalanganOwnerChoices('acc_cash')), ['H', 'R', 'X']);
});

test('S2852 (b): proyek klien tetap tidak menawarkan; tanpa akun kosong', () => {
  const ctx = mkCtx({ listExistingOwners: () => ALL, build: () => ({ owners: [{ ownerId: 'H' }] }) }, { renovProjects: [{ id: 'P1', dana: 'klien' }] });
  assert.deepEqual(ids(ctx.billTalanganOwnerChoices('acc_cash', 'P1')), []);
  assert.deepEqual(ids(ctx.billTalanganOwnerChoices('')), []);
});
