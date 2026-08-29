'use strict';
// tests/s523b-titipan-owner-creation.test.js — Sesi 523-B (S523 BUG
// REGISTER, BUG-01: "Tidak ada tombol Tambah Pemilik" di modal Pokok
// Dana Titipan). Fix: DanaTitipanCommitmentUI.addNewOwner() baru
// (dana-titipan-portfolio-presenter.js) + tombol "➕ Tambah Pemilik Baru"
// baru di titipanCommitmentModal (modals.js). 100% reuse
// OwnerRegistry.findOrCreate() (S489, API resmi) -- 0 ownerId manual,
// 0 free-text langsung ke saveCommitment() (Design Lock S485d tetap
// utuh: ownerId yang disimpan tetap wajib lolos listExistingOwners()).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function makeElement(id) {
  let _innerHTML = '';
  let _value = '';
  let _options = [];
  const el = { id, textContent: '', placeholder: '', className: '', disabled: false, style: {} };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) {
      _innerHTML = String(html);
      _options = [];
      const re = /<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g;
      let m;
      while ((m = re.exec(_innerHTML))) _options.push({ value: m[1], textContent: m[2] });
    },
  });
  Object.defineProperty(el, 'value', { get() { return _value; }, set(v) { _value = v; } });
  Object.defineProperty(el, 'selectedOptions', {
    get() {
      const found = _options.find((o) => o.value === _value);
      if (found) return [found];
      return _options.length ? [_options[0]] : [];
    },
  });
  Object.defineProperty(el, '_options', { get() { return _options; } });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); } };
}

function makeD(investments) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: [],
    ownerRegistry: [],
  };
}

function makeCtx(D, dom, promptedValue) {
  let _n = 0;
  const toastMessages = [];
  const promptCalls = [];
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/shared/owner-registry.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/finance/dana-titipan-portfolio-render-b.js',
    ],
    {
      D,
      document: dom,
      uid: () => 'id_' + (_n += 1),
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      openModal: () => {},
      closeModal: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      showPromptModal: async (opts) => { promptCalls.push(opts); return promptedValue; },
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI', 'DanaTitipanCommitmentUI'],
  );
  ctx.toastMessages = toastMessages;
  ctx.promptCalls = promptCalls;
  return ctx;
}

test('S523-B.1. addNewOwner("Wati") -> OwnerRegistry.findOrCreate() dipanggil (bukan ownerId manual), owner masuk registry', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, 'Wati');
  await ctx.DanaTitipanCommitmentUI.addNewOwner();
  assert.equal(D.ownerRegistry.length, 1, 'owner baru harus tercatat di OwnerRegistry (bukan free-text lepas)');
  assert.equal(D.ownerRegistry[0].name, 'Wati');
  assert.ok(ctx.promptCalls.length >= 1, 'harus memanggil showPromptModal, bukan window.prompt liar');
});

test('S523-B.2. Owner baru dari addNewOwner() langsung muncul & terpilih di dropdown #titipanCommitOwner (listExistingOwners() union registry)', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, 'Cici');
  await ctx.DanaTitipanCommitmentUI.addNewOwner();
  const sel = dom.getElementById('titipanCommitOwner');
  const ciciOpt = sel._options.find((o) => o.textContent === 'Cici');
  assert.ok(ciciOpt, 'dropdown harus langsung berisi opsi "Cici" tanpa reload');
  assert.equal(sel.value, ciciOpt.value, 'owner baru harus otomatis terpilih di dropdown (mode tambah langsung siap pakai)');
});

test('S523-B.3. Owner baru dari addNewOwner() langsung bisa dipakai saveCommitment() (existing-owner-only guard tetap lolos)', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, 'Rudi');
  await ctx.DanaTitipanCommitmentUI.addNewOwner();
  const rudiId = D.ownerRegistry[0].id;
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: rudiId, ownerName: 'Rudi', principalAmount: 2000000, committedDate: '2026-01-01', notes: '' });
  assert.equal(rec.ownerId, rudiId);
  assert.equal(D.titipanCommitments.length, 1);
});

test('S523-B.4. Input kosong/batal (showPromptModal balik null/"") -> TIDAK membuat owner apa pun (0 side effect)', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, null);
  await ctx.DanaTitipanCommitmentUI.addNewOwner();
  assert.equal(D.ownerRegistry.length, 0, 'batal/kosong tidak boleh membuat owner');
  assert.equal(ctx.toastMessages.length, 0);

  const ctx2 = makeCtx(D, dom, '   ');
  await ctx2.DanaTitipanCommitmentUI.addNewOwner();
  assert.equal(D.ownerRegistry.length, 0, 'whitespace-only tidak boleh membuat owner');
});

test('S523-B.5. Nama yang SAMA (findOrCreate existing) -> TIDAK duplikat, balikin id yang sama & tetap terpilih di dropdown', async () => {
  const D = makeD();
  const dom = makeStatefulDom();
  const ctx1 = makeCtx(D, dom, 'Aku');
  await ctx1.DanaTitipanCommitmentUI.addNewOwner();
  assert.equal(D.ownerRegistry.length, 1);
  const firstId = D.ownerRegistry[0].id;

  const ctx2 = makeCtx(D, dom, 'Aku');
  await ctx2.DanaTitipanCommitmentUI.addNewOwner();
  assert.equal(D.ownerRegistry.length, 1, 'nama yang sama tidak boleh bikin entri registry kedua (kontrak findOrCreate)');
  assert.equal(D.ownerRegistry[0].id, firstId);
});

// ============================================================
// gap-check template: tombol baru harus benar-benar ada di modals.js
// dan data-action-nya nyambung ke fungsi yang benar-benar ada.
// ============================================================
test('[gap-check] titipanCommitmentModal: tombol "Tambah Pemilik Baru" ada di template & data-action nyambung ke DanaTitipanCommitmentUI.addNewOwner', () => {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  assert.match(modalsSrc, /data-action=\\"DanaTitipanCommitmentUI\.addNewOwner\\"/, 'tombol Tambah Pemilik Baru harus data-action="DanaTitipanCommitmentUI.addNewOwner"');
  const presenterSrc = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render-b.js'), 'utf8');
  assert.match(presenterSrc, /addNewOwner\(\)\s*{/, 'DanaTitipanCommitmentUI.addNewOwner() harus ada di presenter file');
});
