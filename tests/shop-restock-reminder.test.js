'use strict';
// tests/shop-restock-reminder.test.js — Regression test untuk
// modules/shop/shop-restock-reminder.js (sesi lanjutan Fix #3
// DASHBOARD-DEDUP.md, "Poin 1": konsolidasi widget ad-hoc
// dashboard-hub.js ke PriorityEngine). Lihat
// DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md §"Sesi berikutnya".

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(InventoryEngine) {
  const ctx = loadSource(
    ['modules/shop/shop-restock-reminder.js'],
    { InventoryEngine },
    ['ShopRestockReminder'],
  );
  return ctx.ShopRestockReminder;
}

test('ShopRestockReminder.restockReminders(): InventoryEngine belum dimuat -> array kosong, tidak throw', () => {
  const ctx = loadSource(['modules/shop/shop-restock-reminder.js'], {}, ['ShopRestockReminder']);
  assert.equal(ctx.ShopRestockReminder.restockReminders().length, 0);
});

test('ShopRestockReminder.restockReminders(): restockScan() {ok:false} -> array kosong, tidak throw', () => {
  const SR = makeCtx({ restockScan: () => ({ ok: false, reason: 'belum dimuat', items: [] }) });
  assert.equal(SR.restockReminders().length, 0);
});

test('ShopRestockReminder.restockReminders(): restockScan() kosong -> array kosong', () => {
  const SR = makeCtx({ restockScan: () => ({ ok: true, items: [] }) });
  assert.equal(SR.restockReminders().length, 0);
});

test('ShopRestockReminder.restockReminders(): daysLeft<=0 -> severity overdue', () => {
  const SR = makeCtx({ restockScan: () => ({ ok: true, items: [
    { product: { id: 'p1', name: 'Lumpang 20cm' }, daysLeft: 0, restockQty: 10 },
  ] }) });
  const r = SR.restockReminders();
  assert.equal(r.length, 1);
  assert.equal(r[0].type, 'restock');
  assert.equal(r[0].severity, 'overdue');
  assert.equal(r[0].name, 'Lumpang 20cm');
  assert.match(r[0].message, /sudah\/hampir habis/);
});

test('ShopRestockReminder.restockReminders(): daysLeft>0 -> severity due-soon', () => {
  const SR = makeCtx({ restockScan: () => ({ ok: true, items: [
    { product: { id: 'p2', name: 'Cobek Batu' }, daysLeft: 5.4, restockQty: 3 },
  ] }) });
  const r = SR.restockReminders();
  assert.equal(r[0].severity, 'due-soon');
  assert.match(r[0].message, /diperkirakan habis dalam 6 hari/);
});

test('ShopRestockReminder.restockReminders(): produk tanpa nama -> fallback "Produk", tidak throw', () => {
  const SR = makeCtx({ restockScan: () => ({ ok: true, items: [
    { product: null, daysLeft: 1, restockQty: 1 },
  ] }) });
  const r = SR.restockReminders();
  assert.equal(r[0].name, 'Produk');
  assert.equal(r[0].id, null);
});

test('ShopRestockReminder.summary(): overdueCount/dueSoonCount murni menjumlah panjang array by severity', () => {
  const SR = makeCtx({ restockScan: () => ({ ok: true, items: [
    { product: { id: '1', name: 'A' }, daysLeft: -1, restockQty: 5 },
    { product: { id: '2', name: 'B' }, daysLeft: 10, restockQty: 2 },
    { product: { id: '3', name: 'C' }, daysLeft: 0, restockQty: 1 },
  ] }) });
  const s = SR.summary();
  assert.equal(s.total, 3);
  assert.equal(s.overdueCount, 2);
  assert.equal(s.dueSoonCount, 1);
  assert.equal(s.all.length, 3);
});
