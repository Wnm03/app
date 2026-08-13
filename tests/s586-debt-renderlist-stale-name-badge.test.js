'use strict';
// tests/s586-debt-renderlist-stale-name-badge.test.js — S583 sesi-11
// (Rekomendasi #4): tampilkan hasil TitipanReconcile.checkDebtNameStaleness()
// (sesi-5) sebagai badge READ-ONLY "⚠️ nama belum sinkron" per baris di
// Debt.renderList() (Buku Utang) -- pola sama persis badge "🔒 Titipan"
// yang sudah ada (S455/S460). PURELY VISUAL: 0 mutasi ke D, 0 tombol/aksi
// baru -- murni surface audit yang SUDAH ADA (sesi-5) supaya ketahuan tanpa
// buka console/Tes Otomatis.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeDocStub() {
  let html = '';
  const totals = {};
  const el = { set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
  return {
    stub: {
      getElementById(id) {
        if (id === 'debtList') return el;
        if (id === 'debtTotalVal' || id === 'debtCicilanVal') {
          return { set textContent(v) { totals[id] = v; }, get textContent() { return totals[id]; } };
        }
        return null;
      },
    },
    getHtml: () => html,
  };
}

function makeCtx(D, extra) {
  return loadSource(
    ['modules/finance/titipan-reconcile.js', 'modules/finance/piutang-utang.js'],
    Object.assign({ D, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), save: () => {}, sameId: (a, b) => a === b }, extra || {}),
    ['Debt', 'TitipanReconcile'],
  );
}

test('Debt.renderList() — badge "⚠️ nama belum sinkron" tampil utk debt yang d.name basi vs OwnerRegistry', () => {
  const { stub, getHtml } = makeDocStub();
  const D = {
    debts: [{ id: 'd1', name: 'Budi', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedOwnerId: 'own_budi' }],
    ownerRegistry: [{ id: 'own_budi', name: 'Budi Santoso' }],
    bills: [],
  };
  makeCtx(D, { document: stub }).Debt.renderList();
  assert.ok(getHtml().includes('⚠️ nama belum sinkron'), 'badge harus muncul saat d.name ("Budi") beda dari registry ("Budi Santoso")');
});

test('Debt.renderList() — badge TIDAK tampil kalau d.name sudah sinkron dgn OwnerRegistry', () => {
  const { stub, getHtml } = makeDocStub();
  const D = {
    debts: [{ id: 'd1', name: 'Budi Santoso', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedOwnerId: 'own_budi' }],
    ownerRegistry: [{ id: 'own_budi', name: 'Budi Santoso' }],
    bills: [],
  };
  makeCtx(D, { document: stub }).Debt.renderList();
  assert.ok(!getHtml().includes('⚠️ nama belum sinkron'), 'badge TIDAK boleh muncul kalau nama sudah cocok');
});

test('Debt.renderList() — utang biasa (tanpa linkedOwnerId) tidak pernah kena badge, walau ada entri lain yang stale', () => {
  const { stub, getHtml } = makeDocStub();
  const D = {
    debts: [
      { id: 'd1', name: 'KTA Bank X', nilai: 3000000, lunas: false, bunga: 10, cicilanBulanan: 250000 },
      { id: 'd2', name: 'Budi', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedOwnerId: 'own_budi' },
    ],
    ownerRegistry: [{ id: 'own_budi', name: 'Budi Santoso' }],
    bills: [],
  };
  makeCtx(D, { document: stub }).Debt.renderList();
  const html = getHtml();
  assert.equal((html.match(/⚠️ nama belum sinkron/g) || []).length, 1, 'badge hanya muncul 1x, utk d2 saja -- d1 tidak ikut kena');
});

test('Guard: TitipanReconcile belum termuat -> Debt.renderList() tetap jalan tanpa error, 0 badge', () => {
  const { stub, getHtml } = makeDocStub();
  const D = {
    debts: [{ id: 'd1', name: 'Budi', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedOwnerId: 'own_budi' }],
    ownerRegistry: [{ id: 'own_budi', name: 'Budi Santoso' }],
    bills: [],
  };
  const ctx = loadSource(
    ['modules/finance/piutang-utang.js'], // TitipanReconcile SENGAJA tidak dimuat
    { D, document: stub, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), save: () => {}, sameId: (a, b) => a === b },
    ['Debt'],
  );
  assert.doesNotThrow(() => ctx.Debt.renderList());
  assert.ok(!getHtml().includes('⚠️ nama belum sinkron'));
});

test('Debt.renderList() — badge "🔒 Titipan" (S455/S460) tetap muncul berdampingan dgn badge baru, tidak saling timpa', () => {
  const { stub, getHtml } = makeDocStub();
  const D = {
    debts: [{ id: 'd1', name: 'Budi', nilai: 4000000, lunas: false, bunga: 0, cicilanBulanan: 0, jatuhTempo: '', linkedAssetId: 'a1', linkedOwnerId: 'own_budi' }],
    ownerRegistry: [{ id: 'own_budi', name: 'Budi Santoso' }],
    bills: [],
  };
  makeCtx(D, { document: stub }).Debt.renderList();
  const html = getHtml();
  assert.ok(html.includes('🔒 Titipan'), 'badge titipan lama tetap ada (regresi S455/S460)');
  assert.ok(html.includes('⚠️ nama belum sinkron'), 'badge baru tetap muncul berdampingan');
});
