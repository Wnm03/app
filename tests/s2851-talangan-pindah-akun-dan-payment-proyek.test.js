'use strict';
// S2851 — (a) pindah akun sumber pada pembayaran tagihan titipan: talangan <-> potong porsi mengikuti porsi pemilik di akun BARU;
// (b) modul Renovasi lazy: hapus/edit transaksi bertaut proyek memuatnya dulu (tanpa payment/piutang yatim); (c) edit tagihan proyek menyinkron payment item.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const KNOWN = [{ ownerId: 'H', ownerName: 'home in' }];
const OWNERS = { acc_cash: [{ ownerId: 'SELF', isSelf: true }], acc_gopay: [{ ownerId: 'SELF', isSelf: true }], acc_bri: [{ ownerId: 'H', ownerName: 'home in', isSelf: false }] };
function mkCtx(extra) {
  const txs = [];
  const toasts = [];
  const D = { accounts: Object.keys(OWNERS).map((id) => ({ id, name: id })), piutang: [], transactions: txs, renovProjects: [] };
  let n = 0;
  const writer = {
    ensure() {}, add(kind, row) { D[kind].push(row); },
    updateById(kind, id, fn) { const r = D[kind].find((x) => x.id === id); if (r) fn(r); },
    removeByPredicate(kind, pred) { D[kind] = D[kind].filter((x, i) => !pred(x, i)); },
  };
  const ctx = loadSource(['modules/finance/tx-renov.js', 'modules/finance/piutang-utang.js'], {
    D, uid: () => 'u' + (++n), todayStr: () => '2026-11-19', sameId: (a, b) => String(a) === String(b), fmtFull: (v) => 'Rp' + Math.round(v),
    toast: (m) => toasts.push(String(m)),
    getAccOwnersRaw: (id) => ({ ok: true, owners: OWNERS[id] || [] }), BillDebtPiutangCanonicalWriter: writer,
    FinanceTxSOT: {
      findById: (id) => txs.find((t) => String(t.id) === String(id)) || null,
      create: (t) => { txs.push(t); return t; },
      patchMetaById: (id, m) => { const t = txs.find((x) => String(x.id) === String(id)); if (t) Object.keys(m).forEach((k) => (m[k] === undefined ? delete t[k] : (t[k] = m[k]))); return t; },
      removeById: (id) => { const i = txs.findIndex((x) => String(x.id) === String(id)); return i < 0 ? null : txs.splice(i, 1)[0]; },
    },
    FinanceCategorySOT: { ensureCategory() {} },
    resolveTxTitipanOwner: (id) => KNOWN.find((o) => o.ownerId === id) || null,
    DanaTitipanPortfolioAPI: { listExistingOwners: () => KNOWN },
    ...(extra || {}),
  });
  return { ctx, D, txs, toasts };
}
const billTx = (over) => ({ id: 't1', type: 'expense', amount: 100000, accountId: 'acc_cash', date: '2026-11-05', note: 'Bayar: wifi', billLinkId: 7, deductionOwnerId: 'H', ...(over || {}) });
const talTx = (over) => billTx({ titipanLinkId: 'H', titipanTalangan: true, ...(over || {}) });

test('S2851 pindah akun: talangan (Cash) -> BRI memuat porsi pemilik = potong porsi; piutang belum lunas dibatalkan, penanda dilepas', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  ctx.billEnsureTalanganPiutang('t1');
  assert.equal(D.piutang.length, 1);
  txs[0].accountId = 'acc_bri';
  assert.equal(ctx.talanganSyncOnAccountChange(txs[0], 'acc_cash', 'H'), 'toPorsi');
  assert.equal(D.piutang.length, 0);
  assert.equal(txs[0].titipanTalangan, undefined);
  assert.equal(txs[0].titipanLinkId, undefined);
  assert.equal(txs[0].deductionOwnerId, 'H'); // tetap non-pribadi
});

test('S2851 pindah akun: talangan ke akun lain tanpa porsi pemilik tetap talangan (piutang tidak berubah)', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  ctx.billEnsureTalanganPiutang('t1');
  txs[0].accountId = 'acc_gopay';
  assert.equal(ctx.talanganSyncOnAccountChange(txs[0], 'acc_cash', 'H'), null);
  assert.equal(D.piutang.length, 1);
  assert.equal(txs[0].titipanTalangan, true);
});

test('S2851 pindah akun: piutang talangan sudah lunas / ada pelunasan sebagian -> dibiarkan, tidak ada pemasukan dihapus, pengguna diberi tahu', () => {
  for (const mode of ['lunas', 'sebagian']) {
    const { ctx, D, txs, toasts } = mkCtx();
    txs.push(talTx());
    const p = ctx.billEnsureTalanganPiutang('t1');
    if (mode === 'lunas') p.lunas = true; else ctx.talanganPayoffCreate(p, 30000);
    const nTx = txs.length;
    txs.find((t) => t.id === 't1').accountId = 'acc_bri';
    assert.equal(ctx.talanganSyncOnAccountChange(txs.find((t) => t.id === 't1'), 'acc_cash', 'H'), 'kept', mode);
    assert.equal(D.piutang.length, 1, mode);
    assert.equal(txs.length, nTx, mode);
    assert.equal(txs.find((t) => t.id === 't1').titipanTalangan, true, mode);
    assert.ok(toasts.some((m) => /pelunasan/.test(m)), mode);
  }
});

test('S2851 pindah akun: potong porsi (BRI) -> Cash tanpa porsi pemilik = talangan baru (penanda + piutang otomatis); form yang menghapus pemilik tak menghalangi', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(billTx({ accountId: 'acc_bri' }));
  txs[0].accountId = 'acc_cash';
  delete txs[0].deductionOwnerId; // form edit menghapusnya sebelum hook
  assert.equal(ctx.talanganSyncOnAccountChange(txs[0], 'acc_bri', 'H'), 'toTalangan');
  assert.equal(txs[0].titipanTalangan, true);
  assert.equal(txs[0].titipanLinkId, 'H');
  assert.equal(txs[0].deductionOwnerId, 'H');
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].nilai, 100000);
  assert.equal(D.piutang[0].autoTxId, 't1');
});

test('S2851 pindah akun: tanpa pemilik / SELF / pemilik tak dikenal / akun tak berubah / bukan pembayaran tagihan = tidak disentuh', () => {
  const cases = [
    billTx({ deductionOwnerId: undefined }), billTx({ deductionOwnerId: 'SELF' }), billTx({ deductionOwnerId: 'X' }),
    billTx({ billLinkId: undefined }), billTx({ type: 'income' }),
  ];
  for (const c of cases) {
    const { ctx, D, txs } = mkCtx();
    txs.push(c);
    assert.equal(ctx.talanganSyncOnAccountChange(txs[0], 'acc_bri', c.deductionOwnerId), null);
    assert.equal(D.piutang.length, 0);
    assert.equal(txs[0].titipanTalangan, undefined);
  }
  const { ctx, txs } = mkCtx();
  txs.push(billTx());
  assert.equal(ctx.talanganSyncOnAccountChange(txs[0], 'acc_cash', 'H'), null); // akun sama
});

test('S2851 talanganSyncOnTxEdit memakai dasar edit yang diingat (akun lama) dan sekali pakai; tanpa dasar perilaku S2849 tetap', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  ctx.billEnsureTalanganPiutang('t1');
  ctx.talanganRememberEditBase(txs[0]);
  txs[0].accountId = 'acc_bri';
  ctx.talanganSyncOnTxEdit(txs[0], 100000);
  assert.equal(D.piutang.length, 0);
  assert.equal(txs[0].titipanTalangan, undefined);
  // dasar sudah terpakai: panggilan kedua tidak mengulang
  txs[0].accountId = 'acc_cash';
  assert.equal(ctx.talanganSyncOnTxEdit(txs[0], 100000), false);
  assert.equal(D.piutang.length, 0);
});

test('S2851 renovEnsureForTx: modul Renovasi dimuat bila transaksi bertaut proyek dan Renov belum ada; tidak dimuat bila tak perlu', async () => {
  let loads = 0;
  const { ctx } = mkCtx({ ensureRenov: async () => { loads++; ctx2.Renov = {}; } });
  const ctx2 = ctx;
  assert.equal(ctx.renovTxNeedsModule({ renovItemLinkId: 1 }), true);
  assert.equal(ctx.renovTxNeedsModule({ renovPaymentId: 0 }), true);
  assert.equal(ctx.renovTxNeedsModule({ renovDpProjectId: 'P' }), true);
  assert.equal(ctx.renovTxNeedsModule({ id: 1 }), false);
  assert.equal(await ctx.renovEnsureForTx({ id: 1 }), true);
  assert.equal(loads, 0);
  assert.equal(await ctx.renovEnsureForTx({ id: 2, renovItemLinkId: 1 }), true);
  assert.equal(loads, 1);
  const bad = mkCtx({ ensureRenov: async () => { throw new Error('offline'); } });
  assert.equal(await bad.ctx.renovEnsureForTx({ renovItemLinkId: 1 }), false);
  const none = mkCtx();
  assert.equal(await none.ctx.renovEnsureForTx({ renovItemLinkId: 1 }), false); // tanpa Renov & tanpa loader
});

test('S2851 billRenovPaymentSyncOnEdit: edit tagihan proyek menyinkron payment item lewat Renov.onLinkedTxEdited', () => {
  const seen = [];
  const { ctx } = mkCtx({ Renov: { onLinkedTxEdited: (t) => seen.push(t.id) } });
  assert.equal(ctx.billRenovPaymentSyncOnEdit({ id: 'a', renovItemLinkId: 5 }), true);
  assert.equal(ctx.billRenovPaymentSyncOnEdit({ id: 'b' }), false);
  assert.deepEqual(seen, ['a']);
  const { ctx: c2 } = mkCtx();
  assert.equal(c2.billRenovPaymentSyncOnEdit({ id: 'c', renovItemLinkId: 5 }), false); // Renov belum dimuat: aman
});

test('S2851 kabel: delTx & _saveTxInner memuat modul Renovasi dulu; hook edit tetap 6 situs', () => {
  const dl = fs.readFileSync('modules/finance/tx-list-cashflow.js', 'utf8');
  assert.match(dl, /renovEnsureForTx\(t\)\)\)\{toast\('⚠️ Modul Renovasi belum termuat; hapus dibatalkan/);
  assert.ok(dl.indexOf('renovEnsureForTx(t)') < dl.indexOf('FinanceCrossEntityAtomic.begin'), 'muat modul sebelum batas atomik');
  const tb = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');
  assert.match(tb, /renovEnsureForTx\(existingTx\)\)\)\{toast\('⚠️ Modul Renovasi belum termuat; simpan dibatalkan/);
  assert.match(tb, /talanganRememberEditBase\(existingTx\)/);
  assert.equal((tb.match(/talanganSyncOnTxEdit\(existingTx,_talOldAmtS2849\)/g) || []).length, 6);
});

test('S2851 cabang edit umum: tanda pemilik pembayaran tagihan dipertahankan; pindah akun disinkron; tx non-tagihan / SELF tidak terpengaruh', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(billTx({ accountId: 'acc_bri' }));
  ctx.talanganRememberEditBase(txs[0]);
  assert.equal(ctx.talanganKeepsOwnerOnEdit(txs[0]), true);
  txs[0].accountId = 'acc_cash';
  assert.equal(ctx.talanganAfterGenericEdit(txs[0]), 'toTalangan');
  assert.equal(D.piutang.length, 1);
  assert.equal(ctx.talanganAfterGenericEdit(txs[0]), null); // dasar sekali pakai
  assert.equal(ctx.talanganKeepsOwnerOnEdit(txs[0]), false);
  for (const t of [billTx({ billLinkId: undefined }), billTx({ deductionOwnerId: 'SELF' }), billTx({ deductionOwnerId: undefined })]) {
    ctx.talanganRememberEditBase(t);
    assert.equal(ctx.talanganKeepsOwnerOnEdit(t), false);
  }
  const tb = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');
  assert.match(tb, /else if\(!\(typeof talanganKeepsOwnerOnEdit==='function'&&talanganKeepsOwnerOnEdit\(existingTx\)\)\)delete existingTx\.deductionOwnerId;/);
  assert.match(tb, /talanganAfterGenericEdit\(existingTx\)/);
});

test('S2851 pindah akun: talangan yang billLinkId-nya sudah lepas (edit modal sebelumnya) tetap bisa kembali ke potong porsi; arah sebaliknya butuh billLinkId', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx({ billLinkId: undefined }));
  ctx.billEnsureTalanganPiutang('t1');
  txs[0].accountId = 'acc_bri';
  assert.equal(ctx.talanganSyncOnAccountChange(txs[0], 'acc_cash', 'H'), 'toPorsi');
  assert.equal(D.piutang.length, 0);
  const b = mkCtx();
  b.txs.push(billTx({ billLinkId: undefined, accountId: 'acc_cash' }));
  assert.equal(b.ctx.talanganSyncOnAccountChange(b.txs[0], 'acc_bri', 'H'), null);
});
