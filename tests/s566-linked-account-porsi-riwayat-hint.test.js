'use strict';
// tests/s566-linked-account-porsi-riwayat-hint.test.js — Sesi 566.
//
// Target eksplisit user: "perjelas aset yg ditautkan untuk akun transaksi
// agar menampilkan porsi lengkap dengan riwayat transaksi modal total."
//
// Sebelum sesi ini, kartu akun berbadge "(via Aset)" di renderAccGrid()
// (🏦 Akun & Metode Pembayaran, Pengaturan > Keuangan) cuma nampilin badge
// ownership generik (mis. "Investor", 1 tipe) + invDetailLine statis dari
// a.investDetail (snapshot OCR) -- TIDAK ada baris yang nampilin porsi
// multi-owner LENGKAP dari Aset yang menautkan akun ini, dan tap-kartu utk
// riwayat transaksi (aksi lama, openAccTxHistory) TIDAK punya affordance
// visual sama sekali.
//
// Fix: 2 baris baru, PURE UI/read-only, 0 field baru, 0 rumus baru --
// 100% REUSE MultiOwnerEngine.getOwners() (sama pola linkMultiOwnerWarn di
// Aset.openActionsMenu()):
//   1. "👥 Porsi: <nama> (<porsi>%) · ..." -- HANYA muncul kalau akun linked
//      DAN asetnya ketemu di D.assets DAN MultiOwnerEngine kemuat.
//   2. "📜 Ketuk kartu untuk riwayat transaksi modal" -- HANYA muncul kalau
//      akun linked (independen dari porsi/MultiOwnerEngine), memperjelas
//      aksi klik kartu yang SUDAH ADA (data-action="openAccTxHistory").
// Akun TIDAK linked (biasa) -- 0 perubahan tampilan sama sekali.

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
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/shared/format-tema.js', 'modules/finance/akun.js', 'modules/shared/modules-render.js'],
    {
      D,
      document: fake.document,
      escapeHtml: (s) => String(s),
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'recalcAccBalance']
  );
  return { ctx, el: fake.el };
}

test('renderAccGrid() — akun tertaut ke aset multi-owner -> baris porsi lengkap ditampilkan (bukan cuma badge ownership generik)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', nilai: 11241970, accountId: 'acc1', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 84.8781 }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 15.1219 }] }],
    accounts: [{ id: 'acc1', name: 'Majoris', emoji: '📈', baseBalance: 11241970, includeInBalance: true }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('👥 Porsi:'), 'baris porsi harus tampil utk akun tertaut multi-owner');
  assert.ok(el.innerHTML.includes('renov (84.8781%)'), 'porsi owner 1 harus tampil lengkap');
  assert.ok(el.innerHTML.includes('mas sihab (15.1219%)'), 'porsi owner 2 harus tampil lengkap');
});

test('renderAccGrid() — akun tertaut ke aset -> hint riwayat transaksi modal ditampilkan', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', nilai: 5000000, accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Majoris', emoji: '📈', baseBalance: 5000000, includeInBalance: true }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('📜 Ketuk kartu untuk riwayat transaksi modal'), 'hint riwayat harus tampil utk akun tertaut');
});

test('renderAccGrid() — akun tertaut ke aset single-owner (bukan multi) -> porsi tetap tampil (1 baris, 100%)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Reksadana X', nilai: 2000000, accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Reksadana X', emoji: '📈', baseBalance: 2000000, includeInBalance: true }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(el.innerHTML.includes('👥 Porsi:'), 'baris porsi tetap tampil utk single-owner (sintesis 100%)');
  assert.ok(el.innerHTML.includes('Milik Sendiri (100%)'), 'default fallback SELF/100% harus tampil');
});

test('renderAccGrid() — akun TIDAK tertaut ke aset apa pun -> 0 baris porsi/hint riwayat (0 perubahan tampilan lama)', () => {
  const D = {
    assets: [],
    accounts: [{ id: 'acc1', name: 'Dompet Kas', emoji: '💰', baseBalance: 100000, includeInBalance: true }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(!el.innerHTML.includes('👥 Porsi:'), 'akun biasa tidak boleh dapat baris porsi');
  assert.ok(!el.innerHTML.includes('📜 Ketuk kartu untuk riwayat transaksi modal'), 'akun biasa tidak boleh dapat hint riwayat');
});

test('renderAccGrid() — akun nonaktif (includeInBalance:false, badge "(off)") -> tetap 0 baris porsi/hint walau kebetulan ada aset menunjuk ke id yang sama', () => {
  // off diprioritaskan di atas linked pada badge lama (lihat renderAccGrid()); baris
  // porsi/hint baru di sesi ini ikut pola sama (pakai variabel `linked` yang SUDAH
  // digabung dgn `!off` di kode asli), jadi harus konsisten disembunyikan juga.
  const D = {
    assets: [{ id: 'as1', name: 'Aset Off', nilai: 1000000, accountId: 'acc1' }],
    accounts: [{ id: 'acc1', name: 'Akun Off', emoji: '💰', baseBalance: 1000000, includeInBalance: false }],
    transactions: [],
  };
  const { ctx, el } = makeCtx(D);
  ctx.renderAccGrid();
  assert.ok(!el.innerHTML.includes('👥 Porsi:'), 'akun off tidak boleh dapat baris porsi');
  assert.ok(!el.innerHTML.includes('📜 Ketuk kartu untuk riwayat transaksi modal'), 'akun off tidak boleh dapat hint riwayat');
});
