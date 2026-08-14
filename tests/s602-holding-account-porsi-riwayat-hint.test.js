'use strict';
// tests/s602-holding-account-porsi-riwayat-hint.test.js — Sesi S602 (lanjutan
// S566/S601-3).
//
// Bug konkret: test S566 (tests/s566-linked-account-porsi-riwayat-hint.test.js)
// sudah pakai nama "Majoris" untuk kartu Akun yang tertaut ke ASET
// (a.accountId), dan renderAccGrid() sudah menampilkan baris porsi + hint
// riwayat untuk jalur itu. TAPI jalur tertaut LANGSUNG ke HOLDING (`h.accountId`,
// dropdown "🔗 Hubungkan ke Akun" di investmentModal, S601-3) tidak pernah diberi
// perlakuan yang sama -- kartu Akun-nya 0 badge, 0 baris porsi, 0 hint riwayat,
// walau akun itu SUDAH tertaut & Holding-nya PUNYA porsi live (Investment.getOwners()).
//
// Fix: renderAccGrid() sekarang juga baca findLinkedHoldingForAccount() (100%
// REUSE fungsi S601-3 di transaksi.js) untuk menentukan `linked`, dan
// linkedPorsiLine baca porsi live dari Investment.getOwners(holding) kalau akun
// tertaut lewat Holding -- Holding MENANG kalau Aset & Holding SAMA-SAMA tertaut
// ke akun yang sama (konsisten dgn resolveOwnerDefaultForAccount()).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDocument() {
  const accGridEl = { innerHTML: '' };
  return {
    el: accGridEl,
    document: {
      getElementById(id) {
        if (id === 'accGrid') return accGridEl;
        return null;
      },
    },
  };
}

function makeCtx(D) {
  const fake = makeFakeDocument();
  const ctx = loadSource(
    ['modules/shared/owner-registry.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/transaksi.js', 'modules/finance/akun.js', 'modules/shared/modules-render.js'],
    {
      D,
      document: fake.document,
      escapeHtml: (s) => String(s),
      sameId: (a, b) => String(a) === String(b),
      uid: () => 'u' + Math.random().toString(36).slice(2),
      save: () => {},
      toast: () => {},
      fmt: (n) => String(n),
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Investment', 'findLinkedHoldingForAccount', 'recalcAccBalance', 'renderAccGrid'],
  );
  return { ctx, el: fake.el };
}

function baseD(overrides) {
  return Object.assign({ assets: [], investments: [], investmentTx: [], investmentWatchlist: [], accounts: [], debts: [], ownerRegistry: [], transactions: [] }, overrides);
}

test('renderAccGrid() — akun tertaut LANGSUNG ke Holding multi-owner (skenario Majoris) -> baris porsi lengkap ditampilkan', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 84.8781 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 15.1219 }] }],
    accounts: [{ id: 'acc1', name: 'Majoris', emoji: '📈', baseBalance: 11241970, includeInBalance: true }],
  });
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('👥 Porsi:'), 'baris porsi harus tampil utk akun tertaut langsung ke holding multi-owner');
  assert.ok(el.innerHTML.includes('renov (84.8781%)'), 'porsi owner 1 harus tampil lengkap');
  assert.ok(el.innerHTML.includes('mas sihab (15.1219%)'), 'porsi owner 2 harus tampil lengkap');
});

test('renderAccGrid() — akun tertaut langsung ke Holding -> hint riwayat transaksi modal ditampilkan', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Majoris', emoji: '📈', baseBalance: 5000000, includeInBalance: true }],
  });
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('📜 Ketuk kartu untuk riwayat transaksi modal'), 'hint riwayat harus tampil utk akun tertaut holding');
});

test('renderAccGrid() — akun tertaut ke Holding single-owner (default SELF 100%) -> porsi tetap tampil 1 baris', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Reksa Dana X', accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Reksa Dana X', emoji: '📈', baseBalance: 2000000, includeInBalance: true }],
  });
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('👥 Porsi:'), 'baris porsi tetap tampil utk holding single-owner (sintesis 100%)');
  assert.ok(el.innerHTML.includes('Milik Sendiri (100%)'), 'default fallback SELF/100% harus tampil');
});

test('renderAccGrid() — Holding DAN Aset SAMA-SAMA tertaut ke akun yang sama -> Holding MENANG (porsinya yang tampil)', () => {
  const D = baseD({
    assets: [{ id: 'as1', name: 'Majoris', nilai: 11241970, accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'porsi aset basi', porsi: 100 }] }],
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 60 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 40 }] }],
    accounts: [{ id: 'acc1', name: 'Majoris', emoji: '📈', baseBalance: 11241970, includeInBalance: true }],
  });
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('renov (60%)'), 'porsi dari Holding harus menang, bukan dari Aset');
  assert.ok(el.innerHTML.includes('mas sihab (40%)'), 'porsi owner 2 dari Holding harus tampil');
  assert.ok(!el.innerHTML.includes('porsi aset basi'), 'porsi basi dari Aset TIDAK boleh tampil ketika Holding tertaut ke akun yang sama');
});

test('renderAccGrid() — akun TIDAK tertaut Holding maupun Aset apa pun -> 0 baris porsi/hint riwayat (0 perubahan tampilan lama)', () => {
  const D = baseD({
    accounts: [{ id: 'acc1', name: 'Dompet Kas', emoji: '💰', baseBalance: 100000, includeInBalance: true }],
  });
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(!el.innerHTML.includes('👥 Porsi:'), 'akun biasa tidak boleh dapat baris porsi');
  assert.ok(!el.innerHTML.includes('📜 Ketuk kartu untuk riwayat transaksi modal'), 'akun biasa tidak boleh dapat hint riwayat');
});

test('renderAccGrid() — akun nonaktif (includeInBalance:false) tertaut Holding -> tetap 0 baris porsi/hint', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Holding Off', accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Akun Off', emoji: '💰', baseBalance: 1000000, includeInBalance: false }],
  });
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(!el.innerHTML.includes('👥 Porsi:'), 'akun off tidak boleh dapat baris porsi walau tertaut holding');
  assert.ok(!el.innerHTML.includes('📜 Ketuk kartu untuk riwayat transaksi modal'), 'akun off tidak boleh dapat hint riwayat');
});
