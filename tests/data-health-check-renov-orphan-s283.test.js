'use strict';
// tests/data-health-check-renov-orphan-s283.test.js — cakupan untuk cek baru
// "accountId/txId orphan pada item Proyek Renovasi" di runDataHealthCheck()
// (data-health-check.js), ditambah Sesi 283 sbg tindak lanjut audit data
// integrity (temuan: D.renovProjects[].items[].accountId & .txId belum
// pernah dicek orphan, padahal pola persis sudah ada utk bills/wishlist).
// Pola test identik tests/data-health-check-catalog-orphan-s276.test.js
// (harness loadSource biasa, bukan smoke-test/DOM).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD({ accounts = [], transactions = [], renovProjects = [] }) {
  return {
    accounts, vehicles: [], transactions, bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects,
  };
}

function run(data) {
  const D = makeD(data);
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'data-health-check.js'],
    { D, openModal: () => {} }
  );
  return ctx.runDataHealthCheck();
}

const ACC_TITLE = 'Item Renovasi dengan akun tidak valid';
const TX_TITLE = 'Item Renovasi kehilangan transaksi tertaut';

test('runDataHealthCheck: warn kalau item renovasi menunjuk akun yang sudah dihapus', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'it1', name: 'Keramik', accountId: 'acc_gone' }] }],
  });
  const found = issues.filter((i) => i.title === ACC_TITLE);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Keramik/);
  assert.match(found[0].detail, /Renov Dapur/);
});

test('runDataHealthCheck: TIDAK warn kalau accountId item renovasi masih valid', () => {
  const issues = run({
    accounts: [{ id: 'acc_a' }],
    renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'it1', name: 'Keramik', accountId: 'acc_a' }] }],
  });
  assert.equal(issues.filter((i) => i.title === ACC_TITLE).length, 0);
});

test('runDataHealthCheck: warn kalau txId item renovasi tidak ditemukan di transaksi', () => {
  const issues = run({
    transactions: [],
    renovProjects: [{ id: 'p1', name: 'Renov Kamar', items: [{ id: 'it1', name: 'Cat Tembok', txId: 'tx_gone' }] }],
  });
  const found = issues.filter((i) => i.title === TX_TITLE);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'warn');
  assert.match(found[0].detail, /Cat Tembok/);
});

test('runDataHealthCheck: TIDAK warn kalau txId item renovasi masih valid', () => {
  const issues = run({
    transactions: [{ id: 'tx_1' }],
    renovProjects: [{ id: 'p1', name: 'Renov Kamar', items: [{ id: 'it1', name: 'Cat Tembok', txId: 'tx_1' }] }],
  });
  assert.equal(issues.filter((i) => i.title === TX_TITLE).length, 0);
});

test('runDataHealthCheck: item renovasi tanpa accountId/txId (belum dibayar) tidak pernah di-flag', () => {
  const issues = run({
    renovProjects: [{ id: 'p1', name: 'Renov Garasi', items: [{ id: 'it1', name: 'Cat', accountId: null, txId: null }] }],
  });
  assert.equal(issues.filter((i) => i.title === ACC_TITLE || i.title === TX_TITLE).length, 0);
});

test('runDataHealthCheck: D.renovProjects kosong/tidak ada -> tidak crash, 0 issue renov', () => {
  const issues = run({});
  assert.equal(issues.filter((i) => i.title === ACC_TITLE || i.title === TX_TITLE).length, 0);
});

test('S2767: Data Health mendeteksi cicilan yatim, duplikat, dan kelebihan bayar tanpa auto-repair',()=>{
  const payment={id:'pay1',txId:'missing',amount:150};
  const issues=run({
    transactions:[{id:'tx-orphan',type:'expense',renovPaymentId:'p-orphan',renovProjectLinkId:'p1',renovItemLinkId:'it1'}],
    renovProjects:[{id:'p1',name:'Renov',items:[{id:'it1',name:'Cat',harga:100,paid:true,payments:[payment,{id:'pay2',txId:'missing',amount:60}]}]}],
  });
  assert.ok(issues.some(i=>i.title==='Pembayaran cicilan Renovasi kehilangan transaksi'));
  assert.ok(issues.some(i=>i.title==='Transaksi pembayaran Renovasi duplikat'));
  assert.ok(issues.some(i=>i.title==='Item Renovasi kelebihan bayar'));
  assert.ok(issues.some(i=>i.title==='Transaksi Renovasi tanpa baris pembayaran'));
  assert.equal(payment.amount,150,'pemeriksaan hanya baca dan tidak memperbaiki data otomatis');
});
