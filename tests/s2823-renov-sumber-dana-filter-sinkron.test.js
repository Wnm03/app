'use strict';
// S2823 — audit #3-#5: Dana Proyek per sumber dana, filter Proyek/Sumber di Laporan & Keuangan, audit+rapikan penanda tak sinkron.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

// Skenario audit: akun pribadi (A1), rekening proyek (A2, tempat DP klien 20 jt masuk), titipan Pak Budi (A3, 1 pemilik).
function scenario(extraTx) {
  const txs = [
    { id: 'dp', type: 'income', amount: 20000000, accountId: 'A2', renovDpProjectId: 7, renovDpKind: 'dp' },
    { id: 't1', type: 'expense', amount: 4000000, accountId: 'A2', renovProjectLinkId: 7, renovItemLinkId: 'i1', renovPaymentId: 'p1' },
    { id: 't2', type: 'expense', amount: 3000000, accountId: 'A1', renovProjectLinkId: 7, renovItemLinkId: 'i2', renovPaymentId: 'p2' },
    { id: 't3', type: 'expense', amount: 1000000, accountId: 'A3', renovProjectLinkId: 7, renovItemLinkId: 'i3', renovPaymentId: 'p3', deductionOwnerId: 'budi' },
    ...(extraTx || []),
  ];
  const project = { id: 7, name: 'Dapur', rab: 30000000, items: [
    { id: 'i1', name: 'Semen', harga: 4000000, payments: [{ id: 'p1', txId: 't1', amount: 4000000, accountId: 'A2' }] },
    { id: 'i2', name: 'Cat', harga: 3000000, payments: [{ id: 'p2', txId: 't2', amount: 3000000, accountId: 'A1' }] },
    { id: 'i3', name: 'Pipa', harga: 1000000, payments: [{ id: 'p3', txId: 't3', amount: 1000000, accountId: 'A3' }] },
  ] };
  const D = { renovProjects: [project], transactions: txs, accounts: [], servisLogs: [] };
  const byId = (id) => txs.find((t) => t.id === id) || null;
  const owners = { A3: [{ ownerId: 'budi', ownerName: 'Pak Budi' }] };
  const FinanceTxSOT = { findById: byId, patchMetaById: (id, m) => { const t = byId(id); Object.keys(m).forEach((k) => { if (m[k] === undefined) delete t[k]; else t[k] = m[k]; }); return t; } };
  const ctx = loadSource(['modules/finance/tx-renov.js', 'modules/finance/filter-laporan.js'], {
    D, FinanceTxSOT,
    sameId: (a, b) => String(a) === String(b),
    escapeHtml: (x) => String(x),
    resolveOwnerDefaultForAccount: (id) => ({ ok: true, owners: owners[id] || [] }),
    isRenovCatName: (c) => /renov/i.test(c || ''),
  });
  return { ctx, D, project, txs };
}

test('S2823 #3: Dana Proyek hanya dikurangi belanja dari rekening proyek, bukan dari akun mana pun', () => {
  const { ctx, project } = scenario();
  const r = ctx.renovProjectFund(project, 20000000);
  assert.equal(r.breakdown.proyek, 4000000);
  assert.equal(r.breakdown.talangan, 3000000);
  assert.equal(r.breakdown.titipan, 1000000);
  assert.equal(r.breakdown.titipanOwners['Pak Budi'], 1000000);
  assert.equal(r.fund, 16000000); // bukan 20jt - 8jt = 12jt
  assert.equal(r.breakdown.proyek + r.breakdown.talangan + r.breakdown.titipan + r.breakdown.tanpa, 8000000);
});

test('S2823 #3: tanpa DP tercatat semua belanja non-titipan = talangan; item lunas tanpa tx = tanpa catatan', () => {
  const { ctx, project, D } = scenario();
  D.transactions = D.transactions.filter((t) => t.id !== 'dp');
  project.items.push({ id: 'i4', name: 'Tukang', harga: 500000, paid: true });
  const b = ctx.renovFundBreakdown(project);
  assert.equal(b.proyek, 0);
  assert.equal(b.talangan, 7000000);
  assert.equal(b.tanpa, 500000);
});

test('S2823 #3: sumber legacy (item paid + txId, tanpa payments) ikut diklasifikasi', () => {
  const { ctx, project } = scenario();
  project.items = [{ id: 'i9', name: 'Lama', harga: 2500000, paid: true, txId: 't2' }];
  const b = ctx.renovFundBreakdown(project);
  assert.equal(b.talangan, 2500000);
});

test('S2823 #3: panel/ekspor memakai helper sumber dana dan label Talangan pribadi', () => {
  const src = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.match(src, /function _renovFundCalc\(/);
  assert.match(src, /Sumber dana pembayaran item/);
  assert.match(src, /Talangan pribadi/);
  assert.doesNotMatch(src, /fund=incoming-paid,rab/);
  assert.doesNotMatch(src, /\['Dana Proyek',incoming-paid\]/);
});

test('S2823 #4: filter Proyek memilih tx pembayaran + DP proyek, dan "Tanpa proyek"', () => {
  const { ctx, txs } = scenario([{ id: 'x', type: 'expense', amount: 1, accountId: 'A1' }]);
  const m = (id, f) => ctx.txMatchesFilters(txs.find((t) => t.id === id), f);
  assert.equal(m('t1', { proyek: '7' }), true);
  assert.equal(m('dp', { proyek: '7' }), true);
  assert.equal(m('x', { proyek: '7' }), false);
  assert.equal(m('x', { proyek: '__none' }), true);
  assert.equal(m('t1', { proyek: '__none' }), false);
  assert.equal(m('x', { proyek: 'semua' }), true);
});

test('S2823 #4: filter Sumber Dana hanya meloloskan pengeluaran proyek sesuai sumbernya', () => {
  const { ctx, txs } = scenario([{ id: 'x', type: 'expense', amount: 1, accountId: 'A1' }]);
  const pick = (kind) => txs.filter((t) => ctx.txMatchesFilters(t, { sumber: kind })).map((t) => t.id);
  assert.deepEqual(pick('proyek'), ['t1']);
  assert.deepEqual(pick('talangan'), ['t2']);
  assert.deepEqual(pick('titipan'), ['t3']);
  assert.deepEqual(pick('semua').length, txs.length);
});

test('S2823 #4: UI — dropdown Proyek/Sumber ada di Laporan & Keuangan, ikut reset, prefs, dan badge', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  ['fProyek', 'fSumber', 'kfProyek', 'kfSumber'].forEach((id) => assert.match(html, new RegExp('id="' + id + '"')));
  const src = fs.readFileSync('modules/finance/filter-laporan.js', 'utf8');
  assert.match(src, /'fMethod','fProyek','fSumber'/);
  assert.match(src, /'kfMethod','kfProyek','kfSumber'/);
  assert.match(src, /proyek:document\.getElementById\('kfProyek'\)/g);
  assert.match(src, /populateProyekFilters\(\);\n}/);
});

test('S2823 #5: audit mendeteksi penanda tak sinkron antar proyek / penanggung / payment', () => {
  const { ctx, D, project } = scenario([
    { id: 'u1', type: 'expense', amount: 800000, accountId: 'A3', renovProjectLinkId: 7 }, // titipan tanpa penanggung (1 pemilik -> bisa diperbaiki)
    { id: 'u2', type: 'expense', amount: 100, accountId: 'A3', renovProjectLinkId: 7, deductionOwnerId: 'orang-lain' }, // penanggung bukan pemilik akun
    { id: 'u3', type: 'expense', amount: 100, accountId: 'A1', renovProjectLinkId: 999 }, // proyek hilang
    { id: 'u4', type: 'expense', amount: 100, accountId: 'A3', category: 'Renovasi', deductionOwnerId: 'budi' }, // penanggung tanpa proyek
  ]);
  project.items[0].payments.push({ id: 'pz', txId: 'hilang', amount: 1 });
  const kinds = Array.from(ctx.renovMarkerAudit(), (m) => m.kind).sort();
  assert.deepEqual(kinds, ['payment-yatim', 'penanggung-asing', 'proyek-hilang', 'tanpa-penanggung', 'tanpa-proyek']);
  // dalam lingkup satu proyek: tanpa 'proyek-hilang' & 'tanpa-proyek'
  const scoped = Array.from(ctx.renovMarkerAudit(7), (m) => m.kind).sort();
  assert.deepEqual(scoped, ['payment-yatim', 'penanggung-asing', 'tanpa-penanggung']);
  assert.ok(D.transactions.length > 0);
});

test('S2823 #5: rapikan hanya mengisi penanggung yang pasti (1 pemilik), sisanya dilaporkan', () => {
  const { ctx, txs } = scenario([
    { id: 'u1', type: 'expense', amount: 800000, accountId: 'A3', renovProjectLinkId: 7 },
    { id: 'u2', type: 'expense', amount: 100, accountId: 'A3', renovProjectLinkId: 7, deductionOwnerId: 'orang-lain' },
  ]);
  const r = ctx.renovRepairMarkers(7);
  assert.equal(r.fixed, 1);
  assert.deepEqual(Array.from(r.ids), ['u1']);
  assert.equal(r.remaining, 1);
  assert.equal(txs.find((t) => t.id === 'u1').deductionOwnerId, 'budi');
  assert.equal(ctx.renovMarkerAudit(7).filter((m) => m.kind === 'tanpa-penanggung').length, 0);
});

test('S2823 #5: data bersih tidak menghasilkan temuan; panel menampilkan tombol Periksa & Rapikan', () => {
  const { ctx } = scenario();
  assert.equal(ctx.renovMarkerAudit(7).length, 0);
  const src = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.match(src, /Renov\.repairMarkers/);
  assert.match(src, /repairMarkers\(pid\)\{/);
});
