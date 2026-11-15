'use strict';
// S2818 — perbaikan audit sinkron keuangan: F4 (repair utang titipan), F8 (akun item Renovasi), F7 (cek kategori servis per kendaraan).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');
const TitipanReconcile = require('../modules/finance/titipan-reconcile.js');

function withGlobals(g, fn) {
  const keys = Object.keys(g), prev = {};
  keys.forEach(k => { prev[k] = global[k]; global[k] = g[k]; });
  try { return fn(); } finally { keys.forEach(k => { if (prev[k] === undefined) delete global[k]; else global[k] = prev[k]; }); }
}
const writer = D => ({ updateById: (k, id, fn) => fn(D[k].find(x => x.id === id)) });

test('S2818 F4: repairPinjamUtangLinkage menyamakan utang belum lunas dgn nominal tx, utang lunas tidak disentuh', () => {
  const D = {
    transactions: [
      { id: 't1', type: 'expense', amount: 377247, titipanPinjamUtang: true, titipanLinkId: 'renov' },
      { id: 't2', type: 'expense', amount: 200000, titipanPinjamUtang: true, titipanLinkId: 'renov' },
    ],
    debts: [
      { id: 'd1', autoTxId: 't1', autoTitipanOwnerId: 'renov', lunas: false, nilai: 827247 },
      { id: 'd2', autoTxId: 't2', autoTitipanOwnerId: 'renov', lunas: true, nilai: 999 },
    ],
  };
  withGlobals({ D, BillDebtPiutangCanonicalWriter: writer(D), save: () => true }, () => {
    const r = TitipanReconcile.repairPinjamUtangLinkage();
    assert.equal(r.fixed, 1);
    assert.equal(D.debts[0].nilai, 377247);
    assert.equal(D.debts[1].nilai, 999);
    assert.equal(TitipanReconcile.checkPinjamUtangLinkage().ok, true);
  });
});

test('S2818 F4: transaksi pinjam tanpa utang dibuatkan utangnya lewat maybeCreateTitipanPinjamUtang', () => {
  const D = { transactions: [{ id: 't9', type: 'expense', amount: 50000, titipanPinjamUtang: true, titipanLinkId: 'renov' }], debts: [] };
  const made = [];
  withGlobals({ D, BillDebtPiutangCanonicalWriter: writer(D), save: () => true, maybeCreateTitipanPinjamUtang: tx => { made.push(tx.id); D.debts.push({ id: 'dn', autoTxId: tx.id, autoTitipanOwnerId: tx.titipanLinkId, lunas: false, nilai: tx.amount }); } }, () => {
    const r = TitipanReconcile.repairPinjamUtangLinkage();
    assert.equal(r.created, 1);
    assert.deepEqual(made, ['t9']);
  });
});

test('S2818 F8: reconcileItemAccounts menyamakan akun item tidak valid dgn akun transaksi', () => {
  const D = {
    accounts: [{ id: 'acc_ok' }],
    transactions: [{ id: 'tx1', accountId: 'acc_ok' }],
    renovProjects: [{ id: 'p1', items: [{ id: 'i1', txId: 'tx1', accountId: 'acc_hilang' }, { id: 'i2', txId: 'tx1', accountId: 'acc_ok' }] }],
  };
  const ctx = loadSource(['modules/home/renovasi.js'], { D, sameId: (a, b) => String(a) === String(b), save: () => true, escapeHtml: s => s, fmt: x => x, fmtFull: x => x, toast() {}, uid: () => 'x', askConfirm: async () => true }, ['Renov']);
  assert.equal(ctx.Renov.reconcileItemAccounts(true), 1);
  assert.equal(D.renovProjects[0].items[0].accountId, 'acc_hilang');
  assert.equal(ctx.Renov.reconcileItemAccounts(false), 1);
  assert.equal(D.renovProjects[0].items[0].accountId, 'acc_ok');
  assert.equal(ctx.Renov.reconcileItemAccounts(false), 0);
});

test('S2818 F7: kategori servis ber-ID sama di dua kendaraan tidak lagi dianggap tertaut ke kendaraan lain (source check)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'data-health-check.js'), 'utf8');
  assert.match(src, /_sameId\.find\(c=>!c\.vehicleId\|\|!vehicleId\|\|c\.vehicleId===vehicleId\)/);
  assert.match(src, /DataHealth\.repairPinjamUtang/);
});
