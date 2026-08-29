'use strict';
// tests/s490-asset-owners-registry-wiring.test.js — Sesi 490 (langkah 2/5,
// PLAN-owner-registry-multi-session.md): wiring `assetOwnersModal`
// (modules/asset/aset.js) ke `OwnerRegistry` (modules/shared/owner-registry.js,
// S489). Target: `Aset._ownerNameFieldHtml()`/`onOwnerSelectChange()`/
// `saveOwners()` — dropdown pilih existing owner + "buat baru", ownerId baris
// baru non-SELF lewat `OwnerRegistry.findOrCreate()` (bukan `uid()` langsung).
//
// SENGAJA TIDAK diuji ulang di sini (sudah dicover regresi 392a-e/429/449/453
// series, semua lolos TANPA OwnerRegistry dimuat -- fallback free-text jalan
// sama persis sebelum S490): total porsi/nominal Rp dua-arah/isSelf toggle/
// sync saldo akun tertaut.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '',
      disabled: false, style: {},
      classList: { _set: new Set(), toggle(cls, force) { const on = force !== undefined ? force : !this._set.has(cls); if (on) this._set.add(cls); else this._set.delete(cls); return on; }, contains(cls) { return this._set.has(cls); }, add(cls) { this._set.add(cls); }, remove(cls) { this._set.delete(cls); } },
    };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

function makeD(assets) {
  return { assets: assets || [], accounts: [], transactions: [], debts: [], ownerRegistry: [] };
}

function makeCtx(D, dom) {
  let _n = 0;
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/asset-ownership-split-presenter.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'gen_' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: (msg) => { toastMessages.push(msg); },
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-08',
      parsePzNum: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
    },
    ['Aset', 'MultiOwnerEngine', 'OwnerRegistry', 'AssetOwnershipSplitPresenter'],
  );
  ctx.Aset.renderList = () => {};
  ctx.toastMessages = toastMessages;
  return ctx;
}

test('1. registry kosong -> _ownerNameFieldHtml() fallback free-text (bukan select), sama seperti sebelum S490', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.Aset._ownerNameFieldHtml({ ownerName: '', isSelf: false }, 0);
  assert.match(html, /<input/);
  assert.doesNotMatch(html, /<select/);
});

test('2. registry ada isi -> baris non-SELF render <select> berisi opsi registry + "Buat pemilik baru"', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.Aset._ownerNameFieldHtml({ ownerName: '', ownerId: '', isSelf: false }, 0);
  assert.match(html, /<select/);
  assert.match(html, /Budi/);
  assert.match(html, /__new__/);
});

test('3. baris isSelf:true SELALU free-text meski registry ada isi (tidak berubah)', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.Aset._ownerNameFieldHtml({ ownerName: 'Aku', isSelf: true }, 0);
  assert.match(html, /<input/);
  assert.doesNotMatch(html, /<select/);
});

test('4. onOwnerSelectChange("__new__") -> masuk mode _creatingNew, ownerId/ownerName dikosongkan', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset._ownersModalAsset = { id: 'a1' };
  ctx.Aset._ownersDraft = [{ ownerId: '', ownerName: '', porsi: 0, isSelf: false }];
  ctx.Aset.onOwnerSelectChange(0, '__new__');
  assert.equal(ctx.Aset._ownersDraft[0]._creatingNew, true);
  assert.equal(ctx.Aset._ownersDraft[0].ownerId, '');
});

test('5. onOwnerSelectChange(id existing) -> ownerId/ownerName draft terisi dari entri registry', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.Aset._ownersModalAsset = { id: 'a1' };
  ctx.Aset._ownersDraft = [{ ownerId: '', ownerName: '', porsi: 0, isSelf: false }];
  ctx.Aset.onOwnerSelectChange(0, 'r1');
  assert.equal(ctx.Aset._ownersDraft[0].ownerId, 'r1');
  assert.equal(ctx.Aset._ownersDraft[0].ownerName, 'Budi');
});

test('6. saveOwners(): baris baru non-SELF -> ownerId lewat OwnerRegistry.findOrCreate(), masuk ke D.ownerRegistry', () => {
  const D = makeD([{ id: 'a1', name: 'Ruko', nilai: 100000000 }]);
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 60, isSelf: true },
    { ownerId: '', ownerName: 'Cici', porsi: 40, isSelf: false },
  ];
  ctx.Aset.saveOwners();
  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.ownerRegistry[0].name, 'Cici');
  const savedNonSelf = D.assets[0].owners.find((o) => !o.isSelf);
  assert.equal(savedNonSelf.ownerId, D.ownerRegistry[0].id);
});

test('7. saveOwners(): 2 aset pakai nama owner non-SELF sama -> ownerId SAMA (tujuan utama S489-S490)', () => {
  const D = makeD([{ id: 'a1', name: 'Ruko', nilai: 100000000 }, { id: 'a2', name: 'Tanah', nilai: 50000000 }]);
  const ctx = makeCtx(D, makeStatefulDom());

  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 50, isSelf: true },
    { ownerId: '', ownerName: 'Budi', porsi: 50, isSelf: false },
  ];
  ctx.Aset.saveOwners();

  ctx.Aset._ownersModalAsset = D.assets[1];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 70, isSelf: true },
    { ownerId: '', ownerName: 'Budi', porsi: 30, isSelf: false },
  ];
  ctx.Aset.saveOwners();

  const id1 = D.assets[0].owners.find((o) => !o.isSelf).ownerId;
  const id2 = D.assets[1].owners.find((o) => !o.isSelf).ownerId;
  assert.equal(id1, id2);
  assert.equal(D.ownerRegistry.length, 1); // TIDAK duplikat
});

test('8. saveOwners(): baris non-SELF dgn ownerId SUDAH ada (dari dropdown pilih existing) -> TIDAK panggil findOrCreate ulang, id dipakai apa adanya', () => {
  const D = makeD([{ id: 'a1', name: 'Ruko', nilai: 100000000 }]);
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 50, isSelf: true },
    { ownerId: 'r1', ownerName: 'Budi', porsi: 50, isSelf: false },
  ];
  ctx.Aset.saveOwners();
  assert.equal(D.ownerRegistry.length, 1); // tidak nambah entri baru
  const savedNonSelf = D.assets[0].owners.find((o) => !o.isSelf);
  assert.equal(savedNonSelf.ownerId, 'r1');
});

// SESI 547 (GAP3-AUD-001 poin 4): test ini SEBELUMNYA mengunci baris SELF
// baru pakai uid() acak (`'gen_1'`) sebagai "TIDAK berubah" -- itu justru
// bug yang diperbaiki S547 (lihat tests/s547-self-owner-identity-unification.test.js):
// SELF harus konsisten 1 literal ('SELF') lintas aset/investasi, bukan 2
// identitas lepas via OwnerRegistry per-nama, itu pun uid() acak. Assertion
// diupdate mengikuti perilaku BARU yang benar (0 duplikasi test dgn s547 --
// file ini tetap fokus "TIDAK lewat OwnerRegistry.findOrCreate()", s547
// fokus "konsistensi ownerId SELF lintas entity").
test('9. saveOwners(): baris SELF baru pakai literal \'SELF\' (TIDAK lewat OwnerRegistry.findOrCreate())', () => {
  const D = makeD([{ id: 'a1', name: 'Ruko', nilai: 100000000 }]);
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [{ ownerId: '', ownerName: 'Aku', porsi: 100, isSelf: true }];
  ctx.Aset.saveOwners();
  assert.equal(D.ownerRegistry.length, 0, 'SELF tidak masuk OwnerRegistry (registry cuma utk non-SELF)');
  assert.equal(D.assets[0].owners[0].ownerId, 'SELF');
});
