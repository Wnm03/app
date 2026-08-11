'use strict';
// tests/s491-investment-owners-registry-wiring.test.js — Sesi 491 (langkah
// 3/5, PLAN-owner-registry-multi-session.md): wiring `investmentOwnersModal`
// (modules/asset/investasi-view.js) ke `OwnerRegistry`
// (modules/shared/owner-registry.js, S489). Replikasi PERSIS pola S490
// (tests/s490-asset-owners-registry-wiring.test.js) — target:
// `InvestmentUI._ownerNameFieldHtml()`/`onOwnerSelectChange()`/`saveOwners()`
// — dropdown pilih existing owner + "buat baru", ownerId baris baru non-SELF
// lewat `OwnerRegistry.findOrCreate()` (bukan `uid()` langsung).
//
// SENGAJA TIDAK diuji ulang di sini (sudah dicover regresi investasi-view.js
// yang sudah ada, lolos TANPA OwnerRegistry dimuat -- fallback free-text
// jalan sama persis sebelum S491): total porsi/isSelf toggle/sync titipan
// debt/AIBus emit.

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

function makeD(investments) {
  return { investments: investments || [], investmentTx: [], debts: [], ownerRegistry: [] };
}

function makeCtx(D, dom) {
  let _n = 0;
  const toastMessages = [];
  const ctx = loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/asset/investasi-view.js'],
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
    },
    ['Investment', 'InvestmentUI', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
  ctx.toastMessages = toastMessages;
  return ctx;
}

function addHolding(ctx, name) {
  return ctx.Investment.addHolding({ name, type: 'Saham', unit: 100, avgPrice: 10000, currentPrice: 10000 });
}

test('1. registry kosong -> _ownerNameFieldHtml() fallback free-text (bukan select), sama seperti sebelum S491', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.InvestmentUI._ownerNameFieldHtml({ ownerName: '', isSelf: false }, 0);
  assert.match(html, /<input/);
  assert.doesNotMatch(html, /<select/);
});

test('2. registry ada isi -> baris non-SELF render <select> berisi opsi registry + "Buat pemilik baru"', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.InvestmentUI._ownerNameFieldHtml({ ownerName: '', ownerId: '', isSelf: false }, 0);
  assert.match(html, /<select/);
  assert.match(html, /Budi/);
  assert.match(html, /__new__/);
});

test('3. baris isSelf:true SELALU free-text meski registry ada isi (tidak berubah)', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  const html = ctx.InvestmentUI._ownerNameFieldHtml({ ownerName: 'Aku', isSelf: true }, 0);
  assert.match(html, /<input/);
  assert.doesNotMatch(html, /<select/);
});

test('4. onOwnerSelectChange("__new__") -> masuk mode _creatingNew, ownerId/ownerName dikosongkan', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.InvestmentUI._ownersModalHolding = { id: 'h1' };
  ctx.InvestmentUI._ownersDraft = [{ ownerId: '', ownerName: '', porsi: 0, isSelf: false }];
  ctx.InvestmentUI.onOwnerSelectChange(0, '__new__');
  assert.equal(ctx.InvestmentUI._ownersDraft[0]._creatingNew, true);
  assert.equal(ctx.InvestmentUI._ownersDraft[0].ownerId, '');
});

test('5. onOwnerSelectChange(id existing) -> ownerId/ownerName draft terisi dari entri registry', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = { id: 'h1' };
  ctx.InvestmentUI._ownersDraft = [{ ownerId: '', ownerName: '', porsi: 0, isSelf: false }];
  ctx.InvestmentUI.onOwnerSelectChange(0, 'r1');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].ownerId, 'r1');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].ownerName, 'Budi');
});

test('6. saveOwners(): baris baru non-SELF -> ownerId lewat OwnerRegistry.findOrCreate(), masuk ke D.ownerRegistry', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeStatefulDom());
  const h = addHolding(ctx, 'Saham BBCA');
  ctx.InvestmentUI._ownersModalHolding = h;
  ctx.InvestmentUI._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 60, isSelf: true },
    { ownerId: '', ownerName: 'Cici', porsi: 40, isSelf: false },
  ];
  ctx.InvestmentUI.saveOwners();
  assert.equal(D.ownerRegistry.length, 1);
  assert.equal(D.ownerRegistry[0].name, 'Cici');
  const savedNonSelf = h.owners.find((o) => !o.isSelf);
  assert.equal(savedNonSelf.ownerId, D.ownerRegistry[0].id);
});

test('7. saveOwners(): 2 holding pakai nama owner non-SELF sama -> ownerId SAMA (tujuan utama S489-S491)', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeStatefulDom());
  const h1 = addHolding(ctx, 'Saham BBCA');
  const h2 = addHolding(ctx, 'Reksadana Pasar Uang');

  ctx.InvestmentUI._ownersModalHolding = h1;
  ctx.InvestmentUI._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 50, isSelf: true },
    { ownerId: '', ownerName: 'Budi', porsi: 50, isSelf: false },
  ];
  ctx.InvestmentUI.saveOwners();

  ctx.InvestmentUI._ownersModalHolding = h2;
  ctx.InvestmentUI._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 70, isSelf: true },
    { ownerId: '', ownerName: 'Budi', porsi: 30, isSelf: false },
  ];
  ctx.InvestmentUI.saveOwners();

  const id1 = h1.owners.find((o) => !o.isSelf).ownerId;
  const id2 = h2.owners.find((o) => !o.isSelf).ownerId;
  assert.equal(id1, id2);
  assert.equal(D.ownerRegistry.length, 1); // TIDAK duplikat
});

test('8. saveOwners(): baris non-SELF dgn ownerId SUDAH ada (dari dropdown pilih existing) -> TIDAK panggil findOrCreate ulang, id dipakai apa adanya', () => {
  const D = makeD();
  D.ownerRegistry.push({ id: 'r1', name: 'Budi' });
  const ctx = makeCtx(D, makeStatefulDom());
  const h = addHolding(ctx, 'Saham BBCA');
  ctx.InvestmentUI._ownersModalHolding = h;
  ctx.InvestmentUI._ownersDraft = [
    { ownerId: '', ownerName: 'Aku', porsi: 50, isSelf: true },
    { ownerId: 'r1', ownerName: 'Budi', porsi: 50, isSelf: false },
  ];
  ctx.InvestmentUI.saveOwners();
  assert.equal(D.ownerRegistry.length, 1); // tidak nambah entri baru
  const savedNonSelf = h.owners.find((o) => !o.isSelf);
  assert.equal(savedNonSelf.ownerId, 'r1');
});

test('9. saveOwners(): baris SELF baru tetap pakai uid() (TIDAK lewat OwnerRegistry, tidak berubah)', () => {
  const D = makeD();
  const ctx = makeCtx(D, makeStatefulDom());
  const h = addHolding(ctx, 'Saham BBCA');
  ctx.InvestmentUI._ownersModalHolding = h;
  ctx.InvestmentUI._ownersDraft = [{ ownerId: '', ownerName: 'Aku', porsi: 100, isSelf: true }];
  ctx.InvestmentUI.saveOwners();
  assert.equal(D.ownerRegistry.length, 0);
});
