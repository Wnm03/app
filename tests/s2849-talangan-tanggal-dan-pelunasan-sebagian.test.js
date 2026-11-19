'use strict';
// S2849 — talangan titipan: (2) tanggal piutang = tanggal bayar transaksi; (3) pelunasan sebagian/akhir konsisten (tanpa pemasukan dobel);
// hapus transaksi pelunasan langsung menyesuaikan piutang; hapus transaksi talangan ikut membersihkan pelunasan sebagian.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const KNOWN = [{ ownerId: 'H', ownerName: 'home in' }];
function mkCtx() {
  const txs = [];
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash' }], piutang: [], transactions: txs, renovProjects: [] };
  let n = 0;
  const writer = {
    ensure() {}, add(kind, row) { D[kind].push(row); },
    updateById(kind, id, fn) { const r = D[kind].find((x) => x.id === id); if (r) fn(r); },
    removeByPredicate(kind, pred) { D[kind] = D[kind].filter((x, i) => !pred(x, i)); },
  };
  const ctx = loadSource(['modules/finance/tx-renov.js', 'modules/finance/piutang-utang.js'], {
    D, uid: () => 'u' + (++n), todayStr: () => '2026-11-19', sameId: (a, b) => String(a) === String(b), fmtFull: (v) => 'Rp' + Math.round(v),
    getAccOwnersRaw: () => ({ ok: true, owners: [] }), BillDebtPiutangCanonicalWriter: writer,
    FinanceTxSOT: {
      findById: (id) => txs.find((t) => String(t.id) === String(id)) || null,
      create: (t) => { txs.push(t); return t; },
      patchMetaById: (id, m) => { const t = txs.find((x) => String(x.id) === String(id)); if (t) Object.assign(t, m); return t; },
      removeById: (id) => { const i = txs.findIndex((x) => String(x.id) === String(id)); return i < 0 ? null : txs.splice(i, 1)[0]; },
    },
    FinanceCategorySOT: { ensureCategory() {} },
    resolveTxTitipanOwner: (id) => KNOWN.find((o) => o.ownerId === id) || null,
    DanaTitipanPortfolioAPI: { listExistingOwners: () => KNOWN },
  });
  return { ctx, D, txs };
}
const talTx = (over) => ({ id: 't1', type: 'expense', amount: 100000, accountId: 'acc_cash', date: '2026-11-05', note: 'Bayar: wifi', titipanLinkId: 'H', titipanTalangan: true, deductionOwnerId: 'H', ...(over || {}) });

test('S2849: tanggal piutang talangan = tanggal bayar transaksi (bukan hari input)', () => {
  const { ctx, D } = mkCtx();
  ctx.maybeCreateTitipanTalanganPiutang(talTx());
  assert.equal(D.piutang[0].tanggal, '2026-11-05');
});

test('S2849: tanpa tanggal valid pada transaksi -> jatuh ke todayStr() (perilaku S519)', () => {
  const { ctx, D } = mkCtx();
  ctx.maybeCreateTitipanTalanganPiutang(talTx({ id: 't2', date: undefined }));
  ctx.maybeCreateTitipanTalanganPiutang(talTx({ id: 't3', date: 'bukan-tanggal' }));
  assert.equal(D.piutang[0].tanggal, '2026-11-19');
  assert.equal(D.piutang[1].tanggal, '2026-11-19');
});

test('S2849: pelunasan sebagian — pemasukan non-pribadi sebesar selisih, bertanda talanganPiutangId, terdeteksi sebagai sebagian', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  const p = ctx.billEnsureTalanganPiutang('t1');
  assert.equal(ctx.talanganIsPiutang(p), true);
  const id = ctx.talanganPayoffCreate(p, 40000);
  const tx = txs.find((t) => t.id === id);
  assert.equal(tx.type, 'income'); assert.equal(tx.amount, 40000); assert.equal(tx.talanganPelunasanOwnerId, 'H');
  assert.equal(tx.accountId, 'acc_cash'); assert.equal(tx.talanganPiutangId, p.id);
  assert.equal(ctx.talanganPartialTxs(p).length, 1);
  void D;
});

test('S2849: pelunasan akhir bukan "sebagian" (dikecualikan via linkedPayoffTxId)', () => {
  const { ctx, txs } = mkCtx();
  txs.push(talTx());
  const p = ctx.billEnsureTalanganPiutang('t1');
  p.linkedPayoffTxId = ctx.talanganPayoffCreate(p, 100000);
  assert.equal(ctx.talanganPartialTxs(p).length, 0);
});

test('S2849: hapus pemasukan pelunasan SEBAGIAN -> sisa piutang bertambah sebesar pemasukan itu', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  const p = ctx.billEnsureTalanganPiutang('t1');
  p.nilai = 60000; // sisa setelah cicilan 40.000
  const id = ctx.talanganPayoffCreate(p, 40000);
  const t = txs.splice(txs.findIndex((x) => x.id === id), 1)[0];
  assert.equal(ctx.talanganPayoffTxDeleted(t), true);
  assert.equal(D.piutang[0].nilai, 100000); assert.equal(D.piutang[0].lunas, false);
});

test('S2849: hapus pemasukan pelunasan AKHIR -> piutang dibuka lagi, sisa tetap', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  const p = ctx.billEnsureTalanganPiutang('t1');
  p.nilai = 60000; p.lunas = true; p.linkedPayoffTxId = ctx.talanganPayoffCreate(p, 60000);
  const t = txs.splice(txs.findIndex((x) => x.id === p.linkedPayoffTxId), 1)[0];
  assert.equal(ctx.talanganPayoffTxDeleted(t), true);
  assert.equal(D.piutang[0].lunas, false); assert.equal(D.piutang[0].nilai, 60000); assert.equal(D.piutang[0].linkedPayoffTxId, null);
});

test('S2849: hapus pelunasan sebagian saat piutang sudah lunas -> dibuka lagi dengan sisa = nilai sebagian; pelunasan akhir jadi riwayat', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  const p = ctx.billEnsureTalanganPiutang('t1');
  p.nilai = 60000;
  const partial = ctx.talanganPayoffCreate(p, 40000);
  p.lunas = true; p.linkedPayoffTxId = ctx.talanganPayoffCreate(p, 60000);
  const t = txs.splice(txs.findIndex((x) => x.id === partial), 1)[0];
  ctx.talanganPayoffTxDeleted(t);
  assert.equal(D.piutang[0].lunas, false); assert.equal(D.piutang[0].nilai, 40000); assert.equal(D.piutang[0].linkedPayoffTxId, null);
  assert.equal(ctx.talanganPartialTxs(D.piutang[0]).length, 1); // pelunasan akhir lama kini dihitung sebagai pelunasan biasa
});

test('S2849: hapus transaksi talangan (piutang belum lunas) ikut menghapus pelunasan sebagian (tanpa pemasukan yatim)', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  const p = ctx.billEnsureTalanganPiutang('t1');
  p.nilai = 60000; ctx.talanganPayoffCreate(p, 40000);
  txs.splice(txs.findIndex((x) => x.id === 't1'), 1);
  ctx.removeUnpaidTitipanTalanganPiutangForTx('t1');
  assert.equal(D.piutang.length, 0);
  assert.equal(txs.filter((t) => t.talanganPelunasanOwnerId).length, 0);
});

test('S2849: pembayaran bukan talangan / bukan pelunasan tidak disentuh', () => {
  const { ctx, D, txs } = mkCtx();
  assert.equal(ctx.talanganPayoffTxDeleted({ type: 'income', amount: 5 }), false);
  assert.equal(ctx.talanganPayoffTxDeleted(null), false);
  txs.push(talTx());
  assert.equal(D.piutang.length, 0);
});

test('S2849: kabel sumber — save Piutang async, pilihan sebagian/koreksi, delTx memanggil talanganPayoffTxDeleted', () => {
  const pu = fs.readFileSync('modules/finance/piutang-utang.js', 'utf8');
  assert.match(pu, /withSaveGuardAsync\('piutang','piutangModal',Piutang\._saveInner\)/);
  assert.match(pu, /async _saveInner\(\)/);
  assert.match(pu, /Hanya koreksi nilai \(tanpa pemasukan\)/);
  assert.match(pu, /talanganPayoffCreate\(p,p\.nilai\)/); // lunas = sisa tersimpan
  const dl = fs.readFileSync('modules/finance/tx-list-cashflow.js', 'utf8');
  assert.match(dl, /talanganPayoffTxDeleted\(t\)/);
  assert.equal((fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8').match(/\n/g) || []).length, 1599);
});

test('S2849: talanganSyncOnTxEdit — edit nominal tx talangan menggeser sisa piutang sebesar selisih; tx biasa tak disentuh', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push(talTx());
  const p = ctx.billEnsureTalanganPiutang('t1');
  p.nilai = 60000; // sisa setelah pelunasan sebagian 40.000
  const tx = txs[0]; const old = tx.amount; tx.amount = 120000;
  assert.equal(ctx.talanganSyncOnTxEdit(tx, old), true);
  assert.equal(D.piutang[0].nilai, 80000);
  assert.equal(ctx.talanganSyncOnTxEdit(tx, 120000), false); // tak berubah
  assert.equal(ctx.talanganSyncOnTxEdit({ id: 'x', amount: 5, titipanLinkId: 'H' }, 1), false); // bukan talangan
});

test('S2849: kabel transaksi-b — cabang awal menyinkron piutang & menjaga deductionOwnerId talangan', () => {
  const src = fs.readFileSync('modules/finance/transaksi-b.js', 'utf8');
  assert.equal((src.match(/talanganSyncOnTxEdit\(existingTx,_talOldAmtS2849\)/g) || []).length, 6);
  assert.equal((src.match(/existingTx\.titipanTalangan===true&&existingTx\.titipanLinkId\)existingTx\.deductionOwnerId=existingTx\.titipanLinkId/g) || []).length, 7);
});
