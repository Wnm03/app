'use strict';
/** S2812 — Proyek Renovasi 1 SOT: (1) AI Chat terbayar = payments[], (2) lepas tautan tx cicilan, (3) hapus akun memigrasi accountId item/payment. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const root = path.join(__dirname, '..');

test('AI Chat: terbayar proyek memakai payments[] (sama dgn Renov.totals)', () => {
  const src = fs.readFileSync(path.join(root, 'ai-chat.js'), 'utf8');
  const line = src.split('\n').find((l) => l.startsWith('const renovInfo='));
  assert.ok(line, 'renovInfo tidak ditemukan');
  const D = { renovProjects: [{ name: 'P', items: [
    { harga: 1000000, paid: true, payments: [{ amount: 400000 }, { amount: 600000 }] },
    { harga: 1000000, paid: false, payments: [{ amount: 400000 }] },
    { harga: 500000, paid: true },
  ] }] };
  const out = new Function('D', 'escapeHtml', 'fmtFull', line + ';return renovInfo;')(D, (s) => s, (n) => String(n));
  assert.equal(out, 'P: 1900000/2500000 terbayar (3 item)');
});

function ctxFor(D) {
  const metas = [];
  const ctx = loadSource(['modules/finance/tx-renov.js'], {
    D, sameId: (a, b) => String(a) === String(b), uid: () => 1, escapeHtml: (s) => s, toast() {}, save() {},
    FinanceTxSOT: { patchMetaById(id, m) { metas.push([id, m]); return true; }, findById: () => ({}) },
    document: { getElementById: () => null },
  });
  return { ctx, metas };
}

test('lepas tautan tx cicilan: payment dibuang, paid dihitung ulang, renovPaymentId dilepas', () => {
  const D = { renovProjects: [{ id: 'p', items: [{ id: 'i', harga: 1000000, paid: true, payments: [
    { id: 'a', txId: 't1', amount: 400000 }, { id: 'b', txId: 't2', amount: 600000 }] }] }] };
  const { ctx, metas } = ctxFor(D);
  const tx = { id: 't1', renovProjectLinkId: 'p', renovItemLinkId: 'i', renovPaymentId: 'a' };
  ctx.unlinkTxRenovFromTx(tx);
  const it = D.renovProjects[0].items[0];
  assert.deepEqual(it.payments.map((x) => x.id), ['b']);
  assert.equal(it.paid, false);
  assert.ok('renovPaymentId' in metas[0][1] && metas[0][1].renovPaymentId === undefined);
});

test('lepas tautan tx legacy tetap: item kembali belum lunas', () => {
  const D = { renovProjects: [{ id: 'p', items: [{ id: 'i', harga: 5, paid: true, txId: 't1', paidDate: 'x' }] }] };
  const { ctx } = ctxFor(D);
  ctx.unlinkTxRenovFromTx({ id: 't1', renovProjectLinkId: 'p', renovItemLinkId: 'i' });
  const it = D.renovProjects[0].items[0];
  assert.equal(it.paid, false); assert.equal(it.txId, null);
});

test('hapus akun: migrasi item.accountId & payments[].accountId + rollback snapshot', () => {
  const src = fs.readFileSync(path.join(root, 'modules/finance/akun.js'), 'utf8');
  assert.match(src, /D\.renovProjects\|\|\[\]\)\.forEach\(p=>\(p&&p\.items\|\|\[\]\)\.forEach\(it=>\{if\(it\.accountId===acc\.id\)it\.accountId=target\.id;/);
  assert.match(src, /renovProjects:JSON\.stringify\(D\.renovProjects\|\|\[\]\)/);
  assert.match(src, /D\.renovProjects=JSON\.parse\(_accountDeleteSnapshot\.renovProjects\)/);
});
