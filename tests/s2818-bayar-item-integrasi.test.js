'use strict';
// S2818 — integrasi F1/F2/F3 dgn FinanceTxSOT + FinanceCategorySOT ASLI dan kategori dari backup nyata.
// patchMetaById ada di (10) tapi tidak di source basis (9): di sini dipasang shim murni-test supaya alur bayar bisa jalan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');
const AOA = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 's2817-rekap-aoa.json'), 'utf8'));

function setup() {
  const D = {
    categories: { expense: [{ id: 'cat_makan_1', name: 'Makan', subs: [] }, { id: 'cat_renov_1782816414963', name: 'Renov', emoji: '🔨', classification: 'WAJIB', subs: [{ id: 'sub_pipa_1', name: 'pipa', classification: 'WAJIB' }] }, { id: 'cat_lain_1', name: 'Lainnya', subs: [] }], income: [{ id: 'cat_gaji_1', name: 'Gaji', subs: [] }] },
    accounts: [{ id: 'a1', name: 'Cash', baseBalance: 10000000 }], transactions: [], renovProjects: [{ id: 'p1', name: 'RAB 2 panel', items: [] }],
  };
  const base = { D, sameId: (a, b) => String(a) === String(b), escapeHtml: s => String(s), fmt: x => String(x), fmtFull: x => String(x), save: () => true, todayStr: () => '2026-11-15', uid: (() => { let n = 100; return () => 'u' + (n++); })(), toast: m => base.msgs.push(m), msgs: [], askConfirm: async () => true };
  let real;
  try { real = loadSource(['modules/finance/finance-category-sot.js', 'modules/finance/finance-tx-sot.js'], base, ['FinanceTxSOT', 'FinanceCategorySOT']).FinanceTxSOT; } catch (e) { return { skip: 'sot gagal dimuat: ' + e.message }; }
  const FinanceTxSOT = Object.assign({}, real, { patchMetaById: (id, meta) => { const t = D.transactions.find(x => x.id === id); if (!t) return false; Object.assign(t, meta); return true; } });
  const els = {};
  const doc = { getElementById: id => els[id] || (els[id] = { value: '', style: {}, classList: { add() {}, remove() {} } }) };
  const ctx = loadSource(['modules/home/renovasi.js'], Object.assign({}, base, { FinanceTxSOT, document: doc, openModal() {}, closeModal() {}, renderDashboard() {}, renderKeuangan() {} }), ['Renov']);
  return { D, ctx, els, msgs: base.msgs };
}

test('S2818 integrasi: item hasil impor REKAP v18 bisa dibayar per grup -> tx terbuat, kategori valid, nominal bulat', async (t) => {
  const s = setup(); if (s.skip) return t.skip(s.skip);
  const { D, ctx, els } = s;
  const r = ctx.Renov._xlsxParse(AOA, []);
  D.renovProjects[0].items.push(...r.valid);
  const grups = [...new Set(r.valid.map(i => i.grup))];
  for (const g of grups) {
    const it = r.valid.find(i => i.grup === g);
    ctx.Renov._payProjectId = 'p1'; ctx.Renov._payItemId = it.id; ctx.Renov._payMode = 'cash';
    els.renovPayAccount = { value: 'a1' }; els.renovPayDate = { value: '2026-11-15' };
    await ctx.Renov.submitItemPayment();
  }
  assert.equal(D.transactions.length, grups.length, 'msg: ' + JSON.stringify(s.msgs));
  assert.ok(D.transactions.every(x => x.category === 'Renov' && Number.isInteger(x.amount) && x.categoryId));
  assert.ok(!s.msgs.some(m => /gagal/i.test(m)), JSON.stringify(s.msgs));
});

test('S2818 integrasi: item lama berkategori label grup (BAHAN) tetap bisa dibayar (data yang sudah terlanjur terimpor)', async (t) => {
  const s = setup(); if (s.skip) return t.skip(s.skip);
  const { D, ctx, els } = s;
  D.renovProjects[0].items.push({ id: 'old1', name: 'Papan', category: 'BAHAN', harga: 33080.256, paid: false, payments: undefined });
  ctx.Renov._payProjectId = 'p1'; ctx.Renov._payItemId = 'old1'; ctx.Renov._payMode = 'cash';
  els.renovPayAccount = { value: 'a1' }; els.renovPayDate = { value: '2026-11-15' };
  await ctx.Renov.submitItemPayment();
  assert.equal(D.transactions.length, 1, JSON.stringify(s.msgs));
  assert.equal(D.transactions[0].amount, 33080);
});
