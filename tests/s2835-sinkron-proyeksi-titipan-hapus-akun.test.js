'use strict';
// S2835 — (1) proyeksi kas memperhitungkan tagihan dibayar di muka (tx bertanggal masa depan),
// (2) pergantian hari menyegarkan baris Dana Titipan Akun, (3) hapus akun memindahkan Dana Edukasi & Sewa Kios.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const now = new Date();
const addDays = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };

function mkCash(extraTx) {
  const due = iso(addDays(0)); // jatuh tempo hari ini + 1 diatur di bawah
  void due;
  const D = {
    accounts: [{ id: 'a1', name: 'Kas', baseBalance: 1000000, includeInBalance: true }],
    transactions: [], workDays: [], assets: [], debts: [], piutang: [], profile: {},
    bills: [{ id: 'b1', name: 'Listrik', kind: 'tagihan', freq: 'bulanan', amount: 100000, accountId: 'a1', nextDue: iso(addDays(5)) }],
  };
  const ctx = loadSource(['modules/finance/akun.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'], { D, todayStr: () => iso(now) });
  return { D, ctx };
}

test('S2835: tagihan dibayar di muka (tx masa depan) mengurangi proyeksi saldo akhir bulan', () => {
  const { D, ctx } = mkCash();
  const dueOld = D.bills[0].nextDue;
  const sameMonth = new Date(dueOld + 'T00:00:00').getMonth() === now.getMonth();
  D.transactions.push({ id: 't1', type: 'expense', amount: 100000, accountId: 'a1', date: dueOld, category: 'Tagihan', billLinkId: 'b1', payMethod: 'tagihan', billPrevNextDue: dueOld });
  const nd = new Date(dueOld + 'T00:00:00'); nd.setMonth(nd.getMonth() + 1); D.bills[0].nextDue = iso(nd);
  const p = ctx.getMonthlyCashProjection(now.getMonth(), now.getFullYear(), {});
  assert.equal(p.sisaKewajiban, 0);
  assert.equal(p.saldoKasSekarang, 1000000);
  if (sameMonth) { assert.equal(p.billPaidFutureTotal, 100000); assert.equal(p.proyeksiSaldoAkhirBulan, 900000); }
  else assert.equal(p.billPaidFutureTotal, 0);
});

test('S2835: transaksi non-tagihan bertanggal masa depan & tagihan sudah lewat tidak ikut dikurangkan', () => {
  const { D, ctx } = mkCash();
  D.bills.length = 0;
  D.transactions.push({ id: 't2', type: 'expense', amount: 50000, accountId: 'a1', date: iso(addDays(1)), category: 'Lain' });
  D.transactions.push({ id: 't3', type: 'expense', amount: 70000, accountId: 'a1', date: iso(addDays(-1)), category: 'Tagihan', billLinkId: 'b9' });
  const p = ctx.getMonthlyCashProjection(now.getMonth(), now.getFullYear(), {});
  assert.equal(p.billPaidFutureTotal, 0);
});

test('S2835: pergantian hari menyegarkan baris Dana Titipan Akun & menyimpan sekali', () => {
  const state = { today: '2026-11-15' };
  const D = {
    accounts: [{ id: 'a1', name: 'Kas', baseBalance: 1000000, includeInBalance: true, owners: [
      { ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true }, { ownerId: 'budi', porsi: 50, ownerName: 'Budi' }] }],
    transactions: [{ id: 't1', accountId: 'a1', type: 'expense', amount: 400000, date: '2026-11-16' }],
    debts: [], assets: [], bills: [], piutang: [],
  };
  let saves = 0;
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/finance/titipan-sync.js'],
    { D, todayStr: () => state.today, save: () => { saves++; }, window: { __KW_NO_DAY_ROLLOVER: true } }, ['TitipanSync']);
  ctx.TitipanSync.reconcileAccounts();
  assert.equal(D.debts.find(d => d.linkedOwnerId === 'budi').nilai, 500000);
  state.today = '2026-11-16';
  ctx._accHandleDayChange();
  assert.equal(ctx.recalcAccBalance('a1'), 600000);
  assert.equal(D.debts.find(d => d.linkedOwnerId === 'budi').nilai, 300000);
  assert.equal(saves, 1);
  // hari yang sama lagi: tidak ada perubahan -> tidak menyimpan lagi
  state.today = '2026-11-17';
  ctx._accHandleDayChange();
  assert.equal(saves, 1);
});

test('S2835: hapus akun memindahkan Dana Edukasi & Sewa Kios ke akun tujuan', async () => {
  const D = {
    accounts: [{ id: 'a1', name: 'Lama', baseBalance: 0 }, { id: 'a2', name: 'Baru', baseBalance: 0 }],
    transactions: [], bills: [], debts: [], assets: [], investments: [], targets: [], bbmLogs: [], servisLogs: [], cobek: [], renovProjects: [],
    eduFunds: [{ id: 'e1', name: 'Kuliah', accountId: 'a1', terkumpul: 0 }, { id: 'e2', name: 'Lain', accountId: 'a2', terkumpul: 0 }],
    sewaKios: { units: [{ id: 'k1', name: 'Kios A', accountId: 'a1' }] },
  };
  const ctx = loadSource(['modules/finance/akun.js'], {
    D, todayStr: () => iso(now), askConfirm: async () => true, showChoiceModal: async () => 0, toast: () => {}, save: () => true,
    FinanceTxSOT: { updateById() {}, replaceSnapshot() {} },
    escapeHtml: s => String(s), fmt: n => String(n), recalcAccBalance: () => 0,
    populateKeuFilters() {}, renderAccGrid() {}, populateAccFilters() {}, renderDashAccList() {}, renderLapAccList() {}, refreshBillEverywhere() {}, renderCnTab() {},
    window: { __KW_NO_DAY_ROLLOVER: true },
  });
  const r = await ctx.delAcc(0);
  assert.notEqual(r, false);
  assert.equal(D.accounts.length, 1);
  assert.equal(D.eduFunds[0].accountId, 'a2');
  assert.equal(D.sewaKios.units[0].accountId, 'a2');
});
