'use strict';
// tests/s601-3-holding-account-owner-resolver.test.js — Sesi S601-3 (DL-S601-3,
// AUDIT-S600-HOLDING-GAP-OWNER-DROPDOWNS.md, Temuan #1 -- sebelumnya BELUM
// dikerjakan di S601, ditunda ke sesi ini).
//
// Skema baru: Holding (D.investments[]) dapat field opsional `accountId`
// (addHolding()/updateHolding(), investasi.js), pola TULIS falsy->null PERSIS
// SAMA dgn assetId/custodianId (0 rumus baru). resolveOwnerDefaultForAccount()
// (transaksi.js) direvisi prioritasnya: Holding tertaut LANGSUNG ke akun
// (findLinkedHoldingForAccount(), field baru) -> Aset tertaut -> account
// effective. Kalau Holding & Aset SAMA-SAMA tertaut akun yang sama (konflik),
// Holding MENANG -- keputusan Design Lock.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeInvCtx(D) {
  return loadSource(
    ['modules/shared/owner-registry.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js'],
    { D, uid: () => 'u' + Math.random().toString(36).slice(2), save: () => {} },
    ['Investment'],
  );
}

function makeResolverCtx(D) {
  return loadSource(
    ['modules/shared/owner-registry.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/finance/akun.js', 'modules/finance/transaksi.js'],
    { D, document: { getElementById: () => null }, sameId: (a, b) => String(a) === String(b), escapeHtml: (s) => String(s), uid: () => 'u' + Math.random().toString(36).slice(2), save: () => {}, toast: () => {} },
    ['getAccOwnersEffective', 'resolveOwnerDefaultForAccount', 'findLinkedHoldingForAccount', 'findLinkedAssetForAccount', 'Aset', 'Investment'],
  );
}

function baseD() {
  return { assets: [], investments: [], investmentTx: [], investmentWatchlist: [], accounts: [], debts: [], ownerRegistry: [] };
}

// ---------- Skema Holding.accountId (investasi.js) ----------

test('1. addHolding() -- accountId default null (holding baru tanpa argumen accountId)', () => {
  const D = baseD();
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Reksa Dana X' });
  assert.equal(h.accountId, null);
});

test('2. updateHolding() -- accountId ditulis dengan pola falsy->null PERSIS SAMA assetId/custodianId', () => {
  const D = baseD();
  const ctx = makeInvCtx(D);
  const h = ctx.Investment.addHolding({ name: 'Majoris' });
  ctx.Investment.updateHolding(h.id, { accountId: 'acc1' });
  assert.equal(ctx.Investment.getHolding(h.id).accountId, 'acc1');
  // falsy ('' / null / '__unlinked__') -> dinormalisasi jadi null (lepas tautan)
  ctx.Investment.updateHolding(h.id, { accountId: '' });
  assert.equal(ctx.Investment.getHolding(h.id).accountId, null);
  ctx.Investment.updateHolding(h.id, { accountId: 'acc2' });
  ctx.Investment.updateHolding(h.id, { accountId: '__unlinked__' === '__unlinked__' ? '' : 'acc2' });
  assert.equal(ctx.Investment.getHolding(h.id).accountId, null);
});

test('3. updateHolding() -- patch.accountId===undefined tidak menyentuh field lama (0 regresi holding tanpa field ini sama sekali)', () => {
  const D = baseD();
  D.investments.push({ id: 'h_lama', name: 'Legacy Holding', owners: undefined, fundSource: 'sendiri', titipanOwner: '', createdAt: 1 });
  const ctx = makeInvCtx(D);
  ctx.Investment.updateHolding('h_lama', { notes: 'edit lain' });
  assert.equal('accountId' in D.investments[0], false, 'holding lama tanpa field accountId sama sekali tetap tidak berubah');
});

// ---------- findLinkedHoldingForAccount() + resolveOwnerDefaultForAccount() prioritas baru ----------

test('4. findLinkedHoldingForAccount() -- balikin holding pertama yang h.accountId cocok, null kalau tidak ada', () => {
  const D = baseD();
  D.investments.push({ id: 'h1', name: 'Majoris', accountId: 'acc1' });
  D.investments.push({ id: 'h2', name: 'Lain', accountId: 'acc2' });
  const ctx = makeResolverCtx(D);
  assert.equal(ctx.findLinkedHoldingForAccount('acc1').id, 'h1');
  assert.equal(ctx.findLinkedHoldingForAccount('acc3'), null);
  assert.equal(ctx.findLinkedHoldingForAccount(''), null);
});

test('5. KONFLIK -- Holding & Aset SAMA-SAMA tertaut ke akun yang sama -> Holding MENANG (keputusan Design Lock)', () => {
  const D = baseD();
  D.accounts.push({ id: 'acc1' });
  D.investments.push({ id: 'h1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'o_holding', ownerName: 'Dari Holding', porsi: 100, isSelf: true }] });
  D.assets.push({ id: 'as1', accountId: 'acc1', owners: [{ ownerId: 'o_asset', ownerName: 'Dari Aset', porsi: 100, isSelf: true }] });
  const ctx = makeResolverCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'holding');
  assert.equal(res.owners.length, 1);
  assert.equal(res.owners[0].ownerId, 'o_holding', 'Holding harus menang atas Aset saat konflik');
  assert.equal(res.autoSelectId, 'o_holding');
});

test('6. Holding tertaut akun, Aset TIDAK tertaut -> source "holding", owners dari Investment.getOwners(h)', () => {
  const D = baseD();
  D.accounts.push({ id: 'acc1' });
  D.investments.push({ id: 'h1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'o1', ownerName: 'Budi', porsi: 60, isSelf: true }, { ownerId: 'o2', ownerName: 'Siti', porsi: 40, isSelf: false }] });
  const ctx = makeResolverCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'holding');
  assert.deepEqual(res.owners.map((o) => o.ownerId).sort(), ['o1', 'o2']);
  assert.equal(res.autoSelectId, null, '2+ owner -> 0 tie-break');
});

test('7. Holding tertaut akun TAPI holding itu sendiri belum punya owners eksplisit -> fallback default SELF 100% via Investment.getOwners(), TETAP source "holding" (bukan turun ke Aset/account)', () => {
  const D = baseD();
  D.accounts.push({ id: 'acc1' });
  D.investments.push({ id: 'h1', name: 'Majoris', accountId: 'acc1' });
  const ctx = makeResolverCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.equal(res.source, 'holding');
  assert.equal(res.owners.length, 1);
  assert.equal(res.owners[0].isSelf, true);
  assert.equal(res.autoSelectId, res.owners[0].ownerId);
});

test('8. Holding TIDAK tertaut akun apa pun -> fallback ke prioritas lama (Aset -> account effective -> none), 0 regresi', () => {
  const D = baseD();
  D.accounts.push({ id: 'acc1', owners: [{ ownerId: 'o_acc', ownerName: 'Dari Akun', porsi: 100, isSelf: true }] });
  D.investments.push({ id: 'h_lain', name: 'Tidak Terkait', accountId: 'acc_lain' });
  const ctx = makeResolverCtx(D);
  const res = ctx.resolveOwnerDefaultForAccount('acc1');
  assert.notEqual(res.source, 'holding');
  assert.equal(res.source, 'account');
  assert.equal(res.owners[0].ownerId, 'o_acc');
});
