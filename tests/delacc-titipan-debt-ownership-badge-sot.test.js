'use strict';
// tests/delacc-titipan-debt-ownership-badge-sot.test.js — Patch susulan
// (permintaan user: "aset holding yg ditautkan ke akun metode pembayaran
// porsinya belum sync di akun metode pembayaran, sama dropdownnya seharusnya
// 1 SOT dengan dana titipan dan akun terpotong").
//
// Root cause: badge/chip "Kepemilikan" (acc-chip, renderAccGrid) & dropdown
// Filter Kepemilikan (accOwnFilterVal) baca `acc.ownership` (OwnershipEngine,
// tipe TUNGGAL SELF/INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY, diisi manual lewat
// modal Edit Akun) -- field ini TIDAK PERNAH disentuh oleh porsi REAL akun
// (Holding tertaut via findLinkedHoldingForAccount(), atau acc.owners[]
// standalone via modal "⚖️ Atur Porsi Kepemilikan Akun") -- 2 sumber data
// independen. Selain itu baris "👥 Porsi:" (linkedPorsiLine) SEBELUM ini
// HANYA tampil utk akun `linked` (tertaut Aset/Holding) -- akun BERDIRI-
// SENDIRI dgn acc.owners[] eksplisit (mis. skenario BRI di screenshot user)
// TIDAK PERNAH dapat baris porsi sama sekali.
//
// Fix (additive, 0 rumus porsi baru -- 100% reuse
// findLinkedHoldingForAccount()/Investment.getOwners()/getAccOwnersRaw(),
// SUMBER SAMA PERSIS resolveOwnerDefaultForAccount() transaksi.js):
//   1. resolveAccOwnershipBadgeState(accId) baru (akun.js) -- baca porsi real
//      efektif (Holding > acc.owners eksplisit) & deteksi mismatch vs badge.
//   2. renderAccGrid() (modules-render.js): badge ganti jadi "⚠️ Belum
//      diklasifikasi" kalau mismatch (bukan "Milik Sendiri" yang menyesatkan).
//   3. renderAccGrid(): baris "👥 Porsi:" sekarang JUGA tampil utk akun
//      standalone (acc.owners eksplisit, bukan cuma yg `linked`).
//   4. renderAccGrid(): filter "SELF" (Milik Sendiri) mengecualikan akun yang
//      mismatch (porsi real non-SELF tapi badge masih default).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDocument(filterVal) {
  const accGridEl = { innerHTML: '' };
  const filterEl = filterVal !== undefined ? { value: filterVal } : null;
  return {
    el: accGridEl,
    document: {
      getElementById(id) {
        if (id === 'accGrid') return accGridEl;
        if (id === 'accOwnFilter') return filterEl;
        return null;
      },
    },
  };
}

function makeCtx(D, filterVal) {
  const fake = makeFakeDocument(filterVal);
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/shared/format-tema.js',
      'modules/asset/investasi.js',
      'modules/finance/transaksi.js',
      'modules/finance/akun.js',
      'modules/shared/modules-render.js',
    ],
    {
      D,
      document: fake.document,
      escapeHtml: (s) => String(s),
      sameId: (a, b) => String(a) === String(b),
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Investment', 'recalcAccBalance', 'findLinkedHoldingForAccount', 'resolveAccOwnershipBadgeState']
  );
  return { ctx, el: fake.el };
}

test('resolveAccOwnershipBadgeState() — akun tertaut Holding non-SELF, badge belum diklasifikasi -> mismatch:true', () => {
  const D = {
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'sihab', ownerName: 'mas sihab', porsi: 100 }] }],
    accounts: [{ id: 'acc1', name: 'Majoris' }],
  };
  const { ctx } = makeCtx(D);
  const res = ctx.resolveAccOwnershipBadgeState('acc1');
  assert.equal(res.source, 'holding');
  assert.equal(res.isAllSelf, false);
  assert.equal(res.isDefault, true);
  assert.equal(res.mismatch, true);
});

test('resolveAccOwnershipBadgeState() — akun standalone acc.owners 100% SELF -> mismatch:false', () => {
  const D = {
    investments: [],
    accounts: [{ id: 'acc1', name: 'BRI', owners: [{ ownerId: 'SELF', ownerName: 'Keluarga', porsi: 100, isSelf: true }] }],
  };
  const { ctx } = makeCtx(D);
  const res = ctx.resolveAccOwnershipBadgeState('acc1');
  assert.equal(res.source, 'account');
  assert.equal(res.isAllSelf, true);
  assert.equal(res.mismatch, false);
});

test('resolveAccOwnershipBadgeState() — badge sudah diklasifikasi manual (bukan default) -> mismatch:false walau porsi non-SELF', () => {
  const D = {
    investments: [],
    accounts: [{ id: 'acc1', name: 'Majoris', ownership: 'FAMILY', owners: [{ ownerId: 'sihab', ownerName: 'mas sihab', porsi: 100 }] }],
  };
  const { ctx } = makeCtx(D);
  const res = ctx.resolveAccOwnershipBadgeState('acc1');
  assert.equal(res.isDefault, false);
  assert.equal(res.mismatch, false);
});

test('renderAccGrid() — akun tertaut Holding non-SELF & badge default -> chip "⚠️ Belum diklasifikasi" (bukan "Milik Sendiri")', () => {
  const D = {
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'sihab', ownerName: 'mas sihab', porsi: 100 }] }],
    accounts: [{ id: 'acc1', name: 'Majoris', emoji: '📈', baseBalance: 1000000, includeInBalance: true }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('⚠️ Belum diklasifikasi'), 'chip peringatan harus tampil');
  assert.ok(!el.innerHTML.includes('>Milik Sendiri<'), 'chip default menyesatkan tidak boleh tampil');
});

test('renderAccGrid() — akun standalone (acc.owners eksplisit, TIDAK linked Aset/Holding) -> baris porsi tetap tampil', () => {
  const D = {
    investments: [],
    accounts: [{ id: 'acc1', name: 'BRI', emoji: '🏦', baseBalance: 11662000, includeInBalance: true, owners: [{ ownerId: 'SELF', ownerName: 'Keluarga', porsi: 100, isSelf: true }] }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('👥 Porsi:'), 'baris porsi harus tampil utk akun standalone dgn owners eksplisit');
  assert.ok(el.innerHTML.includes('Keluarga (100%)'), 'nama & porsi harus tampil lengkap');
});

test('renderAccGrid() — akun standalone tanpa owners[] sama sekali -> 0 baris porsi (0 regresi)', () => {
  const D = {
    investments: [],
    accounts: [{ id: 'acc1', name: 'Cash', emoji: '💵', baseBalance: 500000, includeInBalance: true }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(!el.innerHTML.includes('👥 Porsi:'), 'akun tanpa owners tidak boleh dapat baris porsi');
});

test('renderAccGrid() — filter "SELF" mengecualikan akun mismatch (porsi non-SELF, badge default)', () => {
  const D = {
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'sihab', ownerName: 'mas sihab', porsi: 100 }] }],
    accounts: [
      { id: 'acc1', name: 'Majoris', emoji: '📈', baseBalance: 1000000, includeInBalance: true },
      { id: 'acc2', name: 'Cash', emoji: '💵', baseBalance: 500000, includeInBalance: true },
    ],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D, 'SELF');
  ctx.renderAccGrid();
  assert.ok(!el.innerHTML.includes('Majoris'), 'akun mismatch tidak boleh muncul di filter SELF');
  assert.ok(el.innerHTML.includes('Cash'), 'akun SELF biasa tetap muncul di filter SELF');
});

test('renderAccGrid() — filter "SELF" TIDAK mengecualikan akun yang sudah eksplisit diklasifikasi FAMILY tapi tetap owner non-SELF (bukan mismatch, sudah difilter oleh filterByType biasa)', () => {
  const D = {
    investments: [],
    accounts: [
      { id: 'acc1', name: 'Majoris', ownership: 'FAMILY', emoji: '📈', baseBalance: 1000000, includeInBalance: true, owners: [{ ownerId: 'sihab', ownerName: 'mas sihab', porsi: 100 }] },
      { id: 'acc2', name: 'Cash', emoji: '💵', baseBalance: 500000, includeInBalance: true },
    ],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D, 'SELF');
  ctx.renderAccGrid();
  assert.ok(!el.innerHTML.includes('Majoris'), 'akun FAMILY eksplisit tetap tidak masuk hasil filter SELF (via filterByType biasa)');
  assert.ok(el.innerHTML.includes('Cash'), 'akun SELF biasa tetap muncul');
});
