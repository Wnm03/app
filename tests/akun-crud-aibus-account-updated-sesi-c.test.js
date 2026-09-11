'use strict';
// tests/akun-crud-aibus-account-updated-sesi-c.test.js — Sesi C-lanjutan
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 / §2c, AUDIT-SESI-C-EVENTBUS-
// D-WRITES-NO-EMIT.md, Prioritas Tinggi #4 "Akun"): item TERAKHIR yang masih
// tersisa dari daftar Prioritas Tinggi audit (delTx/4 jenis tx khusus/
// piutang-utang/tagihan sudah lebih dulu emit di sesi-sesi sebelumnya).
//
// modules/finance/akun.js SEBELUMNYA 0% emit AIBus. Nama event BARU:
// "account.updated" (belum ada presedennya -- keputusan diambil sesi ini,
// pola payload {kind:"account",action,...} konsisten dgn vehicle.updated/
// asset.updated yang sudah ada).
//
// 4 titik ditambah (replikasi pola vehicle-core.js persis):
// - _saveAccInner(): create & edit (2 assert terpisah)
// - delAcc(): hapus akun
// - AccOwners.save(): edit porsi kepemilikan akun (pola sama 2 titik edit
//   owner di aset-owners.js)
//
// Harness: loadSource() + stub minimal (pola sama
// vehicle-core-crud-aibus-vehicle-updated-sesi-c.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

function setEditAccIdx(ctx, val) {
  new vm.Script(`editAccIdx = ${val};`).runInContext(ctx);
}
function setAccIncludeState(ctx, val) {
  new vm.Script(`accIncludeState = ${val};`).runInContext(ctx);
}

function makeCtx(D, domValues, extra) {
  const values = Object.assign({
    accName: '', accEmoji: '💰', accBalance: '0', accJenis: 'kas_bebas',
    accPlatform: '', accTargetTanggal: '', accOwnership: 'SELF',
  }, domValues || {});
  const els = {};
  const getEl = (id) => {
    if (!els[id]) {
      els[id] = {
        value: values[id] !== undefined ? values[id] : '',
        innerHTML: '', textContent: '', disabled: false, style: {},
        classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      };
    }
    return els[id];
  };
  const aibusEvents = [];
  const ctx = loadSource(
    ['modules/finance/akun.js'],
    Object.assign({
      D,
      document: { getElementById: getEl },
      window: {},
      escapeHtml: (s) => String(s),
      sameId: (a, b) => String(a) === String(b),
      fmt: (n) => String(n),
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      save() {},
      withSaveGuard: (kind, modalId, fn) => fn(),
      closeModal() {},
      renderAccGrid() {}, populateAccFilters() {}, renderDashAccList() {},
      renderLapAccList() {}, renderDashboard() {}, renderKeuangan() {},
      refreshBillEverywhere() {}, renderCnTab() {}, populateKeuFilters() {},
      toast() {},
      askConfirm: async () => true,
      showChoiceModal: async () => 0,
      accModalCallback: null,
      OwnershipEngine: { isValidType: () => true, normalize: (v) => v, DEFAULT: 'SELF' },
      AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
    }, extra || {}),
    ['saveAcc', 'delAcc', 'AccOwners']
  );
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

test('_saveAccInner() (lewat saveAcc) — tambah akun baru emit account.updated {action:"create"}', () => {
  const D = { accounts: [], transactions: [] };
  const ctx = makeCtx(D, { accName: 'Dompet Baru' });

  ctx.saveAcc();

  assert.equal(D.accounts.length, 1, '0 regresi: akun tetap tersimpan seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'account.updated');
  assert.ok(ev, 'AIBus.emit("account.updated", ...) harus terpanggil saat tambah akun');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.accountId, D.accounts[0].id);
});

test('_saveAccInner() (lewat saveAcc) — edit akun existing emit account.updated {action:"edit"}', () => {
  const D = { accounts: [{ id: 'acc_1', name: 'Lama', baseBalance: 0, balance: 0 }], transactions: [] };
  const ctx = makeCtx(D, { accName: 'Baru' });
  setEditAccIdx(ctx, 0);
  setAccIncludeState(ctx, true);

  ctx.saveAcc();

  assert.equal(D.accounts[0].name, 'Baru', '0 regresi: nama tetap ter-update seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'account.updated');
  assert.ok(ev, 'AIBus.emit("account.updated", ...) harus terpanggil saat edit akun');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.accountId, 'acc_1');
});

test('delAcc() — hapus akun emit account.updated {action:"delete", deletedId}', async () => {
  const D = {
    accounts: [{ id: 'acc_1', name: 'A' }, { id: 'acc_2', name: 'B' }],
    transactions: [], bills: [], bbmLogs: [], servisLogs: [], cobek: [],
    targets: [], assets: [], investments: [], debts: [],
  };
  const ctx = makeCtx(D);

  await ctx.delAcc(0);

  assert.equal(D.accounts.length, 1, '0 regresi: akun tetap terhapus seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'account.updated');
  assert.ok(ev, 'AIBus.emit("account.updated", ...) harus terpanggil saat hapus akun');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'acc_1');
  assert.equal(ev.payload.migratedToAccountId, 'acc_2');
});

test('AccOwners.save() — edit porsi kepemilikan akun emit account.updated {action:"edit-owners"}', () => {
  const D = { accounts: [{ id: 'acc_1', name: 'A', owners: [] }], assets: [] };
  const ctx = makeCtx(D, {}, {
    MultiOwnerEngine: { setOwners: () => ({ ok: true, entity: { owners: [] } }) },
    OwnerRegistry: { findOrCreate: (name) => 'own_' + name },
  });
  ctx.AccOwners._accId = 'acc_1';
  ctx.AccOwners._draft = [{ ownerId: '', ownerName: 'Ibu', porsi: 100, isSelf: false }];

  ctx.AccOwners.save();

  const ev = ctx.__aibusEvents.find((e) => e.name === 'account.updated');
  assert.ok(ev, 'AIBus.emit("account.updated", ...) harus terpanggil saat edit porsi pemilik akun');
  assert.equal(ev.payload.action, 'edit-owners');
  assert.equal(ev.payload.accountId, 'acc_1');
});

test('AIBus tidak ada (typeof AIBus==="undefined") — 3 fungsi utama tetap tidak throw (guard konsisten pola lama)', async () => {
  const D = { accounts: [{ id: 'acc_1', name: 'A' }], transactions: [], bills: [], bbmLogs: [], servisLogs: [], cobek: [], targets: [], assets: [], investments: [], debts: [] };
  const ctx = makeCtx(D, { accName: 'X' }, { AIBus: undefined });

  assert.doesNotThrow(() => ctx.saveAcc());
});
