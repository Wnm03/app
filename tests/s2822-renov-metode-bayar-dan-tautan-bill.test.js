'use strict';
// S2822 — (1) metode bayar Renovasi jujur (Cicil -> 'cicilan', DP -> 'tunai', filter menormalkan metode asing),
// (2) cicilan/tagihan yang ditautkan ke Proyek Renovasi: tiap pembayaran jadi payment item + membawa penanggung.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function mkCtx(extra) {
  let n = 1000;
  const patched = [];
  const txs = {};
  const base = {
    D: { renovProjects: [{ id: 7, name: 'Dapur', items: [] }], accounts: [] },
    sameId: (a, b) => String(a) === String(b),
    uid: () => ++n,
    escapeHtml: (x) => String(x),
    FinanceTxSOT: {
      findById: (id) => txs[id] || null,
      patchMetaById: (id, m) => { patched.push([id, m]); Object.assign(txs[id], m); return true; },
    },
    ...extra,
  };
  const ctx = loadSource(['modules/finance/tx-renov.js'], base);
  return { ctx, patched, txs };
}

test('S2822: sumber — Cicil disimpan sebagai cicilan, DP klien sebagai tunai', () => {
  const src = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.match(src, /payMethod:\(mode==='installment'\?'cicilan':'tunai'\)/);
  assert.doesNotMatch(src, /payMethod:'transfer'/);
});

test('S2822: filter Metode menormalkan metode asing (DP lama "transfer") jadi tunai', () => {
  const ctx = loadSource(['modules/finance/filter-laporan.js'], { D: { servisLogs: [] } });
  const f = (m) => ({ method: m });
  assert.equal(ctx.txMatchesFilters({ payMethod: 'transfer' }, f('tunai')), true);
  assert.equal(ctx.txMatchesFilters({ payMethod: 'cicilan' }, f('cicilan')), true);
  assert.equal(ctx.txMatchesFilters({ payMethod: 'cicilan' }, f('tunai')), false);
  assert.equal(ctx.txMatchesFilters({}, f('tunai')), true);
  assert.equal(ctx.txMatchesFilters({ payMethod: 'debit' }, f('debit')), true);
});

test('S2822: applyRenovBillPayment membuat 1 item per bill dan menambah payment per pembayaran', () => {
  const { ctx, txs, patched } = mkCtx();
  const bill = { id: 55, name: 'Cicilan keramik', kind: 'cicilan', amount: 500, tenor: 3, category: 'Renovasi', renovProjectLinkId: 7 };
  txs[1] = { id: 1 }; txs[2] = { id: 2 };
  const r1 = ctx.applyRenovBillPayment(bill, { id: 1, amount: 500, date: '2026-11-01', accountId: 'a1', label: 'Cicilan ke-1' });
  const r2 = ctx.applyRenovBillPayment(bill, { id: 2, amount: 500, date: '2026-12-01', accountId: 'a1', label: 'Cicilan ke-2' });
  const items = ctx.D.renovProjects[0].items;
  assert.equal(items.length, 1);
  assert.equal(r1.itemId, r2.itemId);
  assert.equal(items[0].payments.length, 2);
  assert.equal(items[0].harga, 1500);
  assert.equal(items[0].paid, false);
  assert.equal(txs[2].renovProjectLinkId, 7);
  assert.equal(txs[2].renovItemLinkId, items[0].id);
  assert.equal(txs[2].renovPaymentId, r2.paymentId);
  assert.equal(patched.length, 2);
});

test('S2822: cicilan lunas di pembayaran terakhir; tagihan tanpa tenor ikut total terbayar', () => {
  const { ctx, txs } = mkCtx();
  const bill = { id: 56, name: 'Listrik proyek', kind: 'tagihan', amount: 800, category: 'Renovasi', renovProjectLinkId: 7 };
  txs[1] = { id: 1 };
  ctx.applyRenovBillPayment(bill, { id: 1, amount: 800, date: '2026-11-02', accountId: 'a2' });
  const it = ctx.D.renovProjects[0].items[0];
  assert.equal(it.harga, 800);
  assert.equal(it.paid, true);
});

test('S2822: bill tanpa tautan / proyek sudah dihapus tidak menyentuh data', () => {
  const { ctx } = mkCtx();
  assert.equal(ctx.applyRenovBillPayment({ id: 1, name: 'x' }, { id: 1, amount: 1 }), null);
  assert.equal(ctx.applyRenovBillPayment({ id: 1, name: 'x', renovProjectLinkId: 999 }, { id: 1, amount: 1 }), null);
  assert.equal(ctx.D.renovProjects[0].items.length, 0);
});

test('S2822: resolveRenovBillOwner — tanpa pemilik "", tunggal otomatis, tersimpan dipakai, multi ditanya', async () => {
  const owners = {
    none: [], one: [{ ownerId: 'u1', ownerName: 'Pak Budi' }],
    two: [{ ownerId: 'u1', ownerName: 'A' }, { ownerId: 'u2', ownerName: 'B' }],
  };
  const asked = [];
  const { ctx } = mkCtx({
    getAccOwnersRaw: (acc) => ({ ok: true, owners: owners[acc] || [] }),
    showChoiceModal: async (o) => { asked.push(o); return 1; },
  });
  assert.equal(await ctx.resolveRenovBillOwner({ name: 'b' }, 'none'), '');
  assert.equal(await ctx.resolveRenovBillOwner({ name: 'b' }, 'one'), 'u1');
  assert.equal(await ctx.resolveRenovBillOwner({ name: 'b', deductionOwnerId: 'u1' }, 'two'), 'u1');
  assert.equal(asked.length, 0);
  assert.equal(await ctx.resolveRenovBillOwner({ name: 'b' }, 'two'), 'u2');
  assert.equal(asked.length, 1);
});

test('S2822: batal memilih penanggung -> null (pembayaran dibatalkan)', async () => {
  const { ctx } = mkCtx({
    getAccOwnersRaw: () => ({ ok: true, owners: [{ ownerId: 'u1' }, { ownerId: 'u2' }] }),
    showChoiceModal: async () => null,
  });
  assert.equal(await ctx.resolveRenovBillOwner({ name: 'b' }, 'x'), null);
});

test('S2822: markBillPaid menautkan & atomik mencakup renovProjects (kontrak sumber)', () => {
  const src = fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8');
  assert.match(src, /begin\(\['transactions','bills','billsArchive','debts','piutang','renovProjects'\]\)/);
  assert.match(src, /applyRenovBillPayment\(b,/);
  assert.match(src, /resolveRenovBillOwner\(b,/);
  const modals = fs.readFileSync('modules/shared/modals.js', 'utf8');
  assert.match(modals, /id=\\"billRenovProject\\"/);
});
