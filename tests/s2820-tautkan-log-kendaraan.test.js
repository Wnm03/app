'use strict';
// S2820 — F6: log BBM/servis berbiaya yang belum tertaut ke transaksi. Tautkan hanya yang cocok aman; sisanya tidak pernah dibuatkan transaksi otomatis.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function setup(over) {
  const D = Object.assign({
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    transactions: [
      { id: 1, type: 'expense', amount: 46000, date: '2025-09-07', category: 'Vario 125', accountId: 'acc_cash' },
      { id: 2, type: 'expense', amount: 30000, date: '2025-07-17', category: 'Hadiah', accountId: 'acc_cash' },
      { id: 3, type: 'expense', amount: 10000, date: '2025-08-01', category: 'Vario 125', accountId: 'acc_cash' },
      { id: 4, type: 'expense', amount: 10000, date: '2025-08-01', category: 'Vario 125', accountId: 'acc_cash' },
      { id: 5, type: 'expense', amount: 120000, date: '2025-07-10', category: 'Vario 125', accountId: 'acc_cash', servisLinkId: 's9' },
    ],
    bbmLogs: [
      { id: 'b1', vehicleId: 'v1', date: '2025-09-07', cost: 46000, accountId: 'acc_cash', txLinkId: null },
      { id: 'b2', vehicleId: 'v1', date: '2025-07-17', cost: 30000, accountId: 'acc_cash', txLinkId: null }, // cocok tgl+nominal, beda kategori -> sisa
      { id: 'b3', vehicleId: 'v1', date: '2025-08-01', cost: 10000, accountId: 'acc_cash', txLinkId: null }, // 2 kandidat -> sisa
      { id: 'b4', vehicleId: 'v1', date: '2025-01-01', cost: 99000, accountId: 'acc_cash', txLinkId: null }, // tanpa tx -> sisa
      { id: 'b5', vehicleId: 'v1', date: '2025-01-02', cost: 0, accountId: 'acc_cash', txLinkId: null }, // tanpa biaya -> diabaikan
    ],
    servisLogs: [{ id: 's1', vehicleId: 'v1', date: '2025-07-10', cost: 120000, accountId: 'acc_cash', txLinkId: null }],
  }, over || {});
  const msgs = [];
  const patched = [];
  const FinanceTxSOT = { patchMetaById: (id, p) => { const t = D.transactions.find(x => x.id === id); Object.assign(t, p); patched.push(id); return t; } };
  // runDataHealthCheck asli ikut jalan setelah aksi: kunci D yang tidak ada -> array kosong.
  D.categories = D.categories || { expense: [], income: [] };
  const Dp = new Proxy(D, { get: (o, k) => (k in o ? o[k] : (typeof k === 'string' ? [] : undefined)) });
  const ctx = loadSource(['data-health-check.js'], { D: Dp, escapeHtml: s => String(s), toast: m => msgs.push(m), save: () => true, askConfirm: async () => true, FinanceTxSOT, openModal() {},
    document: { getElementById: () => null, querySelectorAll: () => [] } });
  return { D, ctx, msgs, patched };
}

test('S2820: hanya log dgn tanggal+nominal+akun+kategori kendaraan yg cocok & unik dianggap bisa ditautkan', (t) => {
  const { ctx } = setup();
  const DataHealth = ctx.DataHealth; if (!DataHealth) return t.skip('DataHealth tidak terekspos');
  const r = DataHealth._collectUnlinkedVehicleLogs();
  assert.deepEqual(Array.from(r.matched.map(m => m.log.id)), ['b1']); // s1 tidak: tx 5 sudah tertaut ke servis lain
  assert.deepEqual(Array.from(r.rest.map(x => x.log.id)).sort(), ['b2', 'b3', 'b4', 's1']);
});

test('S2820: linkVehicleLogs menautkan dua arah tanpa mengubah nominal/jumlah transaksi', async (t) => {
  const { D, ctx, patched } = setup();
  const DataHealth = ctx.DataHealth; if (!DataHealth) return t.skip('DataHealth tidak terekspos');
  const before = JSON.stringify(D.transactions.map(x => [x.id, x.amount]));
  await DataHealth.linkVehicleLogs();
  assert.equal(D.bbmLogs[0].txLinkId, 1);
  assert.equal(D.transactions[0].bbmLinkId, 'b1');
  assert.deepEqual(Array.from(patched), [1]);
  assert.equal(JSON.stringify(D.transactions.map(x => [x.id, x.amount])), before);
  assert.equal(D.transactions.length, 5, 'tidak ada transaksi baru');
  assert.equal(D.bbmLogs[1].txLinkId, null, 'kasus beda kategori tidak ditautkan');
});

test('S2820: ignoreVehicleLogsWithoutTx hanya menandai txSkip; tidak membuat transaksi; log yang ditandai tidak muncul lagi', async (t) => {
  const { D, ctx } = setup();
  const DataHealth = ctx.DataHealth; if (!DataHealth) return t.skip('DataHealth tidak terekspos');
  await DataHealth.linkVehicleLogs();
  await DataHealth.ignoreVehicleLogsWithoutTx();
  assert.equal(D.transactions.length, 5);
  assert.ok(D.bbmLogs.filter(l => l.txSkip).length === 3);
  const r = DataHealth._collectUnlinkedVehicleLogs();
  assert.equal(r.matched.length + r.rest.length, 0);
});
