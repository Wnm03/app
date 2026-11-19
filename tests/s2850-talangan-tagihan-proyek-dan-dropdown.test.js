'use strict';
// S2850 — (1) tagihan tertaut Proyek Renovasi NON-klien menghormati pemilik tersimpan: dibayar dari akun tanpa porsi pemilik itu = talangan,
// tanpa dialog pemilik, tetap tertaut ke item proyek; proyek dana==='klien' tetap perilaku lama. (4) dropdown pemilik form Tagihan menawarkan
// "ditalangi" untuk pemilik titipan yang tidak punya porsi di akun; audit penanda tidak menandai talangan sebagai penanggung asing.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', isSelf: true }] },
  { id: 'acc_bri', name: 'BRI', owners: [{ ownerId: 'H', ownerName: 'home in', isSelf: false }] },
  { id: 'acc_plain', name: 'Plain' },
];
const KNOWN = [{ ownerId: 'H', ownerName: 'home in' }, { ownerId: 'R', ownerName: 'renov' }];

function mkCtx(projects) {
  const txs = [];
  const D = { accounts: ACCOUNTS, piutang: [], transactions: txs, renovProjects: projects || [] };
  let n = 0;
  const ctx = loadSource(['modules/finance/tx-renov.js'], {
    D,
    uid: () => 'u' + (++n),
    todayStr: () => '2026-11-19',
    sameId: (a, b) => String(a) === String(b),
    escapeHtml: (v) => String(v),
    getAccOwnersRaw: (id) => { const a = ACCOUNTS.find((x) => x.id === id); return { ok: true, owners: a && a.owners ? a.owners : [] }; },
    resolveTxTitipanOwner: (id) => KNOWN.find((o) => o.ownerId === id) || null,
    DanaTitipanPortfolioAPI: { listExistingOwners: () => KNOWN },
  });
  return { ctx, D, txs };
}
const bill = (accountId, owner) => ({ id: 1, name: 'wallpanel', amount: 212000, accountId, kind: 'tagihan', renovProjectLinkId: 'P1', ...(owner ? { deductionOwnerId: owner } : {}) });
const PROJ = (dana) => ({ id: 'P1', name: 'Wallpanel', items: [], ...(dana ? { dana } : {}) });

test('S2850 item 1: billRenovTalanganMeta — proyek non-klien + pemilik bukan pemilik akun = talangan', () => {
  for (const dana of [undefined, 'pribadi']) {
    const { ctx } = mkCtx([PROJ(dana)]);
    const p = ctx.D.renovProjects[0];
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.billRenovTalanganMeta(bill('acc_cash', 'H'), p))), { titipanLinkId: 'H', titipanTalangan: true, deductionOwnerId: 'H' });
    assert.ok(ctx.billRenovTalanganMeta(bill('acc_plain', 'H'), p));
    assert.equal(ctx.billRenovTalanganMeta(bill('acc_bri', 'H'), p), null); // BRI memuat porsi home in = potong porsi
    assert.equal(ctx.billRenovTalanganMeta(bill('acc_cash', 'SELF'), p), null);
    assert.equal(ctx.billRenovTalanganMeta(bill('acc_cash'), p), null); // tanpa pemilik tersimpan: perilaku lama
    assert.equal(ctx.billRenovTalanganMeta(bill('acc_cash', 'X'), p), null); // pemilik tak dikenal: tanpa piutang hantu
  }
});

test('S2850 item 1: proyek dana klien tetap perilaku lama (bukan talangan otomatis)', () => {
  const { ctx } = mkCtx([PROJ('klien')]);
  assert.equal(ctx.billRenovTalanganMeta(bill('acc_cash', 'H'), ctx.D.renovProjects[0]), null);
  assert.equal(ctx.billRenovTalanganMeta(bill('acc_cash', 'H'), null), null);
});

test('S2850 item 1: kabel markBillPaid — proyek non-klien lewati dialog pemilik, tetap tertaut item, tagihan-kalender tetap 1599 baris', () => {
  const src = fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8');
  assert.match(src, /const _talProj=\(_renovBillProject&&typeof billRenovTalanganMeta==='function'\)\?billRenovTalanganMeta\(b,_renovBillProject\):null/);
  assert.match(src, /if\(_renovBillProject&&!_talProj&&typeof resolveRenovBillOwner==='function'\)\{/);
  assert.match(src, /const _talMeta=_talProj\|\|/);
  assert.match(src, /applyRenovBillPayment\(b,\{id:_payTxId/); // tautan item proyek tetap
  assert.ok((src.match(/\n/g) || []).length <= 1599, 'tagihan-kalender.js harus <= 1599 baris (gate 1600)');
});

test('S2850 item 4: billTalanganOwnerChoices — Cash menawarkan home in/renov; BRI tidak menawarkan home in; proyek klien tidak menawarkan', () => {
  const { ctx } = mkCtx([PROJ(), PROJ('klien')]);
  ctx.D.renovProjects[1].id = 'P2';
  const ids = (a, p) => Array.from(ctx.billTalanganOwnerChoices(a, p).map((o) => o.ownerId)); // Array.from: hindari deepStrictEqual lintas-realm vm
  assert.deepEqual(ids('acc_cash'), ['H', 'R']);
  assert.deepEqual(ids('acc_bri'), ['R']); // home in punya porsi di BRI -> bukan "ditalangi"
  assert.deepEqual(ids('acc_plain', 'P1'), ['H', 'R']);
  assert.deepEqual(ids('acc_cash', 'P2'), []); // proyek klien
  assert.deepEqual(ids(''), []);
});

test('S2850 item 4: updateBillRenovOwnerVisibility mengisi opsi "ditalangi" sebelum opsi kelola & mempertahankan pilihan', () => {
  const opts = [];
  const sel = {
    id: 'billRenovOwner', value: '', _a: {},
    set innerHTML(h) { opts.length = 0; String(h).replace(/<option value="([^"]*)">([^<]*)<\/option>/g, (m, v, t) => { opts.push({ value: v, textContent: t }); }); },
    setAttribute(k, v) { this._a[k] = v; },
    querySelector(q) { const m = /value="([^"]*)"/.exec(q); return opts.find((o) => o.value === m[1]) || null; },
    insertBefore(op, ref) { opts.splice(opts.indexOf(ref), 0, op); },
  };
  const wrap = { classList: { remove() {} }, style: {} };
  const els = { billRenovOwnerWrap: wrap, billRenovOwner: sel, billAcc: { value: 'acc_cash' }, billRenovProject: { value: '' } };
  const { ctx } = mkCtx([PROJ()]);
  ctx.document = { getElementById: (id) => els[id] || null, createElement: () => ({}) };
  const run = (prev) => { ctx.updateBillRenovOwnerVisibility(prev); };
  run('H');
  const labels = opts.map((o) => o.textContent);
  assert.ok(labels.includes('🤝 home in (ditalangi)'));
  assert.ok(labels.includes('🤝 renov (ditalangi)'));
  assert.equal(opts[opts.length - 1].value, '__manage_owners__');
  assert.equal(sel.value, 'H');
  els.billAcc.value = 'acc_bri';
  run('H'); // BRI memuat home in -> tanpa penanda ditalangi untuk home in
  assert.ok(!opts.some((o) => o.textContent === '🤝 home in (ditalangi)'));
});

test('S2850: audit penanda — transaksi talangan bukan penanggung asing; transaksi non-talangan tetap ditandai', () => {
  const { ctx, txs } = mkCtx([PROJ()]);
  const base = { type: 'expense', amount: 1, accountId: 'acc_bri', renovProjectLinkId: 'P1' };
  txs.push({ id: 't1', ...base, deductionOwnerId: 'R', titipanTalangan: true, titipanLinkId: 'R' });
  txs.push({ id: 't2', ...base, deductionOwnerId: 'R' });
  const kinds = Array.from(ctx.renovMarkerAudit('P1').filter((m) => m.kind === 'penanggung-asing').map((m) => m.txId));
  assert.deepEqual(kinds, ['t2']);
});
