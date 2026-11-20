'use strict';
// Porsi pemilik otomatis mengikuti nominal: pengeluaran/pemasukan 1 pemilik tidak menggeser nominal pemilik lain.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function setup(extra) {
  const base = 2692582, self = 800000;
  const D = Object.assign({
    accounts: [{ id: 'bri', name: 'BRI', baseBalance: base, includeInBalance: true, owners: [
      { ownerId: 'SELF', porsi: self / base * 100, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'H', porsi: 100 - self / base * 100, ownerName: 'home in', isSelf: false }] }],
    transactions: [], assets: [], investments: [],
  }, extra || {});
  const ctx = loadSource(['modules/finance/akun.js'], { D, fmtFull: n => 'Rp ' + n, escapeHtml: s => s }, []);
  ctx.invalidateAccBalCache();
  return { D, ctx, owners: D.accounts[0].owners };
}
const nom = (o, bal) => Math.round(bal * o.porsi / 100);

test('pengeluaran pemilik lain tidak mengubah nominal Milik Sendiri', () => {
  const { D, ctx, owners } = setup();
  D.transactions.push({ id: 1, accountId: 'bri', type: 'expense', amount: 300000, deductionOwnerId: 'H', date: '2020-01-01' });
  ctx.invalidateAccBalCache();
  const bal = ctx.recalcAccBalance('bri');
  assert.equal(bal, 2392582);
  assert.equal(nom(owners[0], bal), 800000);
  assert.equal(nom(owners[1], bal), 1592582);
});

test('pengeluaran Milik Sendiri hanya mengurangi porsi sendiri; hapus transaksi mengembalikan', () => {
  const { D, ctx, owners } = setup();
  D.transactions.push({ id: 2, accountId: 'bri', type: 'expense', amount: 304482, deductionOwnerId: 'SELF', date: '2020-01-01' });
  ctx.invalidateAccBalCache();
  let bal = ctx.recalcAccBalance('bri');
  assert.equal(nom(owners[0], bal), 495518);
  assert.equal(nom(owners[1], bal), 1892582);
  D.transactions.length = 0;
  ctx.invalidateAccBalCache();
  bal = ctx.recalcAccBalance('bri');
  assert.equal(nom(owners[0], bal), 800000);
});

test('pemasukan ber-pemilik menambah hanya pemilik itu; tanpa pemilik dibagi proporsional', () => {
  const { D, ctx, owners } = setup();
  D.transactions.push({ id: 3, accountId: 'bri', type: 'income', amount: 100000, deductionOwnerId: 'H', date: '2020-01-01' });
  ctx.invalidateAccBalCache();
  let bal = ctx.recalcAccBalance('bri');
  assert.equal(nom(owners[0], bal), 800000);
  D.transactions.push({ id: 4, accountId: 'bri', type: 'expense', amount: 100000, date: '2020-01-02' });
  ctx.invalidateAccBalCache();
  const p0 = owners[0].porsi;
  bal = ctx.recalcAccBalance('bri');
  assert.ok(Math.abs(nom(owners[0], bal) - (800000 - 100000 * (800000 / 2692582))) < 2);
  assert.ok(Math.abs(owners[0].porsi - p0) < 0.2);
});

test('transaksi masa depan diabaikan sampai jatuh tempo (sama dgn saldo akun)', () => {
  const { D, ctx, owners } = setup();
  D.transactions.push({ id: 5, accountId: 'bri', type: 'expense', amount: 500000, deductionOwnerId: 'SELF', date: '2999-01-01' });
  ctx.invalidateAccBalCache();
  assert.equal(nom(owners[0], ctx.recalcAccBalance('bri')), 800000);
});

test('porsi diubah manual -> jangkar baru dari porsi manual', () => {
  const { D, ctx, owners } = setup();
  D.transactions.push({ id: 6, accountId: 'bri', type: 'expense', amount: 100000, deductionOwnerId: 'H', date: '2020-01-01' });
  ctx.invalidateAccBalCache();
  const bal = ctx.recalcAccBalance('bri');
  owners[0].porsi = 50; owners[1].porsi = 50;
  ctx.invalidateAccBalCache();
  assert.equal(owners[0].porsi, 50);
  D.transactions.push({ id: 7, accountId: 'bri', type: 'expense', amount: 100000, deductionOwnerId: 'H', date: '2020-01-02' });
  ctx.invalidateAccBalCache();
  const b2 = ctx.recalcAccBalance('bri');
  assert.equal(Math.round(b2 * owners[0].porsi / 100), Math.round(bal * 0.5));
});

test('aset tertaut akun: pengeluaran renov tidak menggeser Mas Sihab', () => {
  const asset = { id: 'A', accountId: 'st', nilai: 10845758, owners: [
    { ownerId: 'R', porsi: 84.32566907725582, ownerName: 'renov', isSelf: false },
    { ownerId: 'M', porsi: 15.674330922744172, ownerName: 'mas sihab', isSelf: false }] };
  const D = { accounts: [{ id: 'st', name: 'Saldo tagihan', baseBalance: 10845758 + 1006415, includeInBalance: false }], transactions: [
    { id: 1, accountId: 'st', type: 'expense', amount: 1006415, deductionOwnerId: 'R', date: '2020-01-01' }], assets: [asset], investments: [] };
  const ctx = loadSource(['modules/finance/akun.js'], { D, fmtFull: n => 'Rp ' + n, escapeHtml: s => s }, []);
  ctx.invalidateAccBalCache();
  D.transactions.push({ id: 2, accountId: 'st', type: 'expense', amount: 500000, deductionOwnerId: 'R', date: '2020-01-02' });
  ctx.invalidateAccBalCache();
  const bal = ctx.recalcAccBalance('st');
  assert.equal(bal, 10345758);
  assert.equal(Math.round(bal * asset.owners[1].porsi / 100), 1700000);
  assert.equal(Math.round(bal * asset.owners[0].porsi / 100), 8645758);
});

test('saldo <= 0 atau nominal negatif: porsi tidak dirusak', () => {
  const { D, ctx, owners } = setup();
  D.transactions.push({ id: 8, accountId: 'bri', type: 'expense', amount: 2000000, deductionOwnerId: 'SELF', date: '2020-01-01' });
  ctx.invalidateAccBalCache();
  assert.ok(owners.every(o => Number.isFinite(o.porsi) && o.porsi >= 0));
  assert.ok(Math.abs(owners[0].porsi + owners[1].porsi - 100) < 1e-6);
});

test('ownerPorsiTextSafe menampilkan nominal Rupiah dan persen 4 desimal', () => {
  const { ctx } = setup();
  const t = ctx.ownerPorsiTextSafe([{ ownerName: 'Milik Sendiri', porsi: 29.71125856148485 }, { ownerName: 'home in', porsi: 70.28874143851515 }], 2692582);
  assert.match(t, /Milik Sendiri \(29\.7113%\) Rp 800000/);
  assert.match(t, /home in \(70\.2887%\) Rp 1892582/);
});

test('ownerPorsiAutoStatusSafe: null saat normal, {alasan} saat porsi tak bisa disesuaikan', () => {
  const { D, ctx } = setup();
  assert.equal(ctx.ownerPorsiAutoStatusSafe('bri'), null);
  D.transactions.push({ id: 20, accountId: 'bri', type: 'expense', amount: 1000000, deductionOwnerId: 'SELF', date: '2020-01-01' });
  ctx.invalidateAccBalCache();
  const st = ctx.ownerPorsiAutoStatusSafe('bri');
  assert.equal(st && st.alasan, 'negatif');
  D.transactions.length = 0;
  ctx.invalidateAccBalCache();
  assert.equal(ctx.ownerPorsiAutoStatusSafe('bri'), null);
});

test('billPorsiConfirmSafe: konfirmasi hanya utk akun berporsi tanpa pemilik pemotong', () => {
  const { D, ctx } = setup({});
  let asked = 0, ok = false;
  ctx.confirm = () => { asked++; return ok; };
  ctx.sameId = (a, b) => String(a) === String(b);
  assert.equal(ctx.billPorsiConfirmSafe({ accountId: 'bri' }, ''), false);
  assert.equal(asked, 1);
  assert.equal(ctx.billPorsiConfirmSafe({ accountId: 'bri', deductionOwnerId: 'H' }, ''), true);
  assert.equal(ctx.billPorsiConfirmSafe({ accountId: 'bri' }, 'H'), true);
  assert.equal(asked, 1);
  ok = true;
  assert.equal(ctx.billPorsiConfirmSafe({ accountId: 'bri' }, ''), true);
});

test('jangkar dibuat saat saldo pertama dihitung: transaksi pertama setelah muat data tetap menggeser porsi benar', () => {
  const { D, ctx, owners } = setup();
  D.accounts[0].ownerAnchor = undefined; delete D.accounts[0].ownerAnchor;
  ctx.invalidateAccBalCache();
  delete D.accounts[0].ownerAnchor; // simulasi data baru dimuat tanpa jangkar
  ctx.recalcAccBalance('bri');       // render pertama
  assert.ok(D.accounts[0].ownerAnchor, 'jangkar harus ada setelah saldo pertama dihitung');
  D.transactions.push({ id: 30, accountId: 'bri', type: 'expense', amount: 304482, deductionOwnerId: 'H', date: '2020-01-01' });
  ctx.invalidateAccBalCache();
  const bal = ctx.recalcAccBalance('bri');
  assert.equal(nom(owners[0], bal), 800000);
});
