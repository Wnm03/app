'use strict';
// S2848 — Talangan titipan dari pembayaran tagihan (fase 1-2). Tagihan titipan "home in" dibayar dari akun TANPA porsi "home in"
// (mis. Cash) = talangan: tx ditandai titipanLinkId/titipanTalangan, piutang otomatis (mekanisme S519), keluar dari basis pribadi.
// Potong porsi (akun memuat pemilik) tidak berubah. Identitas "renov" dan "home in" tidak pernah digabung.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', isSelf: true }] },
  { id: 'acc_bri', name: 'BRI', owners: [{ ownerId: 'H', ownerName: 'home in', isSelf: false }] },
  { id: 'acc_multi', name: 'Multi', owners: [{ ownerId: 'R', ownerName: 'renov', isSelf: false }, { ownerId: 'H', ownerName: 'home in', isSelf: false }] },
  { id: 'acc_plain', name: 'Plain' },
];
const KNOWN = [{ ownerId: 'H', ownerName: 'home in' }, { ownerId: 'R', ownerName: 'renov' }];

function mkCtx() {
  const txs = [];
  const D = { accounts: ACCOUNTS, piutang: [], transactions: txs, renovProjects: [] };
  let n = 0;
  const writer = {
    ensure() {}, add(kind, row) { D[kind].push(row); },
    updateById(kind, id, fn) { const r = D[kind].find((x) => x.id === id); if (r) fn(r); },
    removeByPredicate(kind, pred) { D[kind] = D[kind].filter((x, i) => !pred(x, i)); },
  };
  const ctx = loadSource(['modules/finance/tx-renov.js', 'modules/finance/piutang-utang.js'], {
    D,
    uid: () => 'u' + (++n),
    todayStr: () => '2026-11-19',
    sameId: (a, b) => String(a) === String(b),
    fmtFull: (v) => 'Rp' + Math.round(v),
    getAccOwnersRaw: (id) => { const a = ACCOUNTS.find((x) => x.id === id); return { ok: true, owners: a && a.owners ? a.owners : [] }; },
    BillDebtPiutangCanonicalWriter: writer,
    FinanceTxSOT: {
      findById: (id) => txs.find((t) => String(t.id) === String(id)) || null,
      create: (t) => { txs.push(t); return t; },
      patchMetaById: (id, m) => { const t = txs.find((x) => String(x.id) === String(id)); if (t) Object.assign(t, m); return t; },
      removeById: (id) => { const i = txs.findIndex((x) => String(x.id) === String(id)); return i < 0 ? null : txs.splice(i, 1)[0]; },
    },
    resolveTxTitipanOwner: (id) => KNOWN.find((o) => o.ownerId === id) || null,
    DanaTitipanPortfolioAPI: { listExistingOwners: () => KNOWN },
  });
  return { ctx, D, txs };
}
const bill = (accountId, owner) => ({ id: 1, name: 'wallpanel', amount: 212000, accountId, kind: 'tagihan', ...(owner ? { deductionOwnerId: owner } : {}) });

test('S2848: billTalanganOwnerForPay — talangan hanya bila pemilik tersimpan bukan pemilik akun sumber', () => {
  const { ctx } = mkCtx();
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_cash', 'H')), 'H'); // Cash tanpa porsi home in = talangan
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_plain', 'H')), 'H'); // akun tanpa pemilik = talangan
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_bri', 'H')), ''); // potong porsi, bukan talangan
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_multi', 'H')), ''); // multi-pemilik: H punya porsi
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_multi', 'X')), ''); // pemilik tak dikenal Dana Titipan: tanpa piutang hantu
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_cash', 'SELF')), '');
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_cash')), '');
  assert.equal(ctx.billTalanganOwnerForPay(null), '');
});

test('S2848: renov dan home in tidak digabung — masing-masing talangan atas namanya sendiri', () => {
  const { ctx } = mkCtx();
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_cash', 'R')), 'R');
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_bri', 'R')), 'R'); // BRI hanya memuat home in: renov ditalangi
  assert.equal(ctx.billTalanganOwnerForPay(bill('acc_cash', 'H')), 'H');
});

test('S2848: billTalanganPayMeta — field tx talangan, null bila bukan talangan', () => {
  const { ctx } = mkCtx();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.billTalanganPayMeta(bill('acc_cash', 'H')))), { titipanLinkId: 'H', titipanTalangan: true, deductionOwnerId: 'H' });
  assert.equal(ctx.billTalanganPayMeta(bill('acc_bri', 'H')), null);
});

test('S2848: billEnsureTalanganPiutang — 1 piutang per transaksi, nilai = transaksi aktual, idempotent, tertaut autoTxId', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push({ id: 't1', type: 'expense', amount: 212000, accountId: 'acc_cash', note: 'Bayar: wallpanel', ...ctx.billTalanganPayMeta(bill('acc_cash', 'H')) });
  const p = ctx.billEnsureTalanganPiutang('t1');
  assert.ok(p);
  assert.equal(p.nilai, 212000);
  assert.equal(p.autoTxId, 't1');
  assert.equal(p.autoTitipanOwnerId, 'H');
  assert.equal(p.lunas, false);
  assert.match(p.name, /home in/);
  ctx.billEnsureTalanganPiutang('t1');
  assert.equal(D.piutang.length, 1);
});

test('S2848: bukan talangan (potong porsi / tanpa tanda) tidak membuat piutang', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push({ id: 't2', type: 'expense', amount: 212000, accountId: 'acc_bri', deductionOwnerId: 'H' });
  assert.equal(ctx.billEnsureTalanganPiutang('t2'), null);
  assert.equal(ctx.billEnsureTalanganPiutang('tidak-ada'), null);
  assert.equal(D.piutang.length, 0);
});

test('S2848: billTalanganNote — teks toast hanya untuk pembayaran talangan', () => {
  const { ctx, txs } = mkCtx();
  txs.push({ id: 't3', type: 'expense', amount: 212000, accountId: 'acc_cash', ...ctx.billTalanganPayMeta(bill('acc_cash', 'H')) });
  assert.equal(ctx.billTalanganNote('t3'), '');
  ctx.billEnsureTalanganPiutang('t3');
  assert.match(ctx.billTalanganNote('t3'), /talangan ke home in Rp212000/);
  assert.equal(ctx.billTalanganNote('lain'), '');
});

test('S2848: edit nominal & hapus transaksi talangan ikut menyinkronkan piutang (lifecycle S519 dipakai ulang)', () => {
  const { ctx, D, txs } = mkCtx();
  txs.push({ id: 't4', type: 'expense', amount: 212000, accountId: 'acc_cash', ...ctx.billTalanganPayMeta(bill('acc_cash', 'H')) });
  ctx.billEnsureTalanganPiutang('t4');
  ctx.syncTitipanTalanganPiutangOnEdit('t4', 212000, 200000);
  assert.equal(D.piutang[0].nilai, 200000);
  assert.equal(ctx.removeUnpaidTitipanTalanganPiutangForTx('t4'), true);
  assert.equal(D.piutang.length, 0);
});

test('S2848: transaksi talangan keluar dari basis pribadi (isAliranKlienSafe), pembayaran Cash biasa tetap pribadi', () => {
  const D = { accounts: ACCOUNTS, transactions: [], renovProjects: [] };
  const ctx = loadSource(['modules/finance/akun.js'], {
    D,
    sameId: (a, b) => String(a) === String(b),
    isAccOwnershipSelf: () => true,
    renovAccountOwners: (id) => { const a = ACCOUNTS.find((x) => x.id === id); return (a && a.owners) || []; },
  });
  const plain = { id: 1, type: 'expense', amount: 1000, accountId: 'acc_cash' };
  const talangan = { id: 2, type: 'expense', amount: 212000, accountId: 'acc_cash', deductionOwnerId: 'H', titipanLinkId: 'H', titipanTalangan: true };
  assert.equal(ctx.isAliranKlienSafe(plain), false);
  assert.equal(ctx.isAliranKlienSafe(talangan), true);
});

test('S2848: kabel di markBillPaid & gerbang ukuran (tagihan-kalender.js tetap <= 1600 baris)', () => {
  const src = fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8');
  assert.ok(src.split('\n').length <= 1600);
  // S2850: hook diperluas — proyek non-klien memakai billRenovTalanganMeta; tagihan non-proyek tetap billTalanganPayMeta.
  assert.match(src, /const _talMeta=_talProj\|\|\(\(!_renovBillProject&&!_renovBillOwnerId&&typeof billTalanganPayMeta==='function'\)\?billTalanganPayMeta\(b\):null\)/);
  assert.match(src, /\.\.\.\(_talMeta\|\|\{\}\)\}\);/);
  assert.match(src, /if\(_talMeta&&typeof billEnsureTalanganPiutang==='function'\)billEnsureTalanganPiutang\(_payTxId\)/);
  assert.equal((src.match(/billTalanganNote\(_payTxId\)/g) || []).length, 4);
});

function withTalangan(ctx, txs, id, owner) {
  txs.push({ id, type: 'expense', amount: 72500, accountId: 'acc_cash', ...ctx.billTalanganPayMeta(bill('acc_cash', owner)) });
  return ctx.billEnsureTalanganPiutang(id);
}

test('S2848 f3: talanganBelumDiganti — per pemilik, tidak digabung, yang lunas tidak dihitung', () => {
  const { ctx, txs } = mkCtx();
  const p1 = withTalangan(ctx, txs, 'a1', 'H');
  withTalangan(ctx, txs, 'a2', 'H');
  withTalangan(ctx, txs, 'a3', 'R');
  const r = ctx.talanganBelumDiganti();
  assert.equal(r.total, 72500 * 3);
  assert.deepEqual(JSON.parse(JSON.stringify(r.owners.map((o) => [o.ownerName, o.amount, o.count]).sort())), [['home in', 145000, 2], ['renov', 72500, 1]]);
  p1.lunas = true;
  assert.equal(ctx.talanganBelumDiganti().total, 72500 * 2);
  assert.equal(mkCtx().ctx.talanganBelumDiganti().total, 0);
});

test('S2848 f4: pelunasan talangan = pemasukan ke akun talangan, bukan pendapatan pribadi; dibuka lagi = dibatalkan', () => {
  const { ctx, txs } = mkCtx();
  const p = withTalangan(ctx, txs, 'b1', 'H');
  const id = ctx.talanganPayoffCreate(p, p.nilai);
  const t = txs.find((x) => x.id === id);
  assert.equal(t.type, 'income');
  assert.equal(t.amount, 72500);
  assert.equal(t.accountId, 'acc_cash');
  assert.equal(t.talanganPelunasanOwnerId, 'H');
  p.linkedPayoffTxId = id;
  assert.equal(ctx.talanganPayoffReverse(p), true);
  assert.equal(txs.some((x) => x.id === id), false);
  assert.equal(ctx.talanganPayoffReverse({ linkedPayoffTxId: 'xx' }), false);
  assert.equal(ctx.talanganPayoffCreate({ id: 9, autoTxId: 'tak-ada', autoTitipanOwnerId: 'H' }, 1), null);
});

test('S2848 f4: pemasukan pelunasan talangan keluar dari basis pribadi', () => {
  const D = { accounts: ACCOUNTS, transactions: [], renovProjects: [] };
  const ctx = loadSource(['modules/finance/akun.js'], { D, sameId: (a, b) => String(a) === String(b), isAccOwnershipSelf: () => true, renovAccountOwners: () => [] });
  assert.equal(ctx.isAliranKlienSafe({ id: 1, type: 'income', amount: 5, accountId: 'acc_cash' }), false);
  assert.equal(ctx.isAliranKlienSafe({ id: 2, type: 'income', amount: 5, accountId: 'acc_cash', talanganPelunasanOwnerId: 'H' }), true);
});

test('S2848 f3-4: kabel UI (kartu, Hub, chip, Buku Piutang)', () => {
  const rd = (f) => fs.readFileSync(f, 'utf8');
  assert.match(rd('modules/finance/tx-renov.js'), /Talangan belum diganti: /);
  assert.match(rd('modules/finance/akun.js'), /function catatanHubTalanganSafe\(anchor\)/);
  assert.match(rd('modules/dashboard-hub/dashboard-hub.js'), /catatanHubTalanganSafe\(saldoEl\)/);
  assert.match(rd('modules/shared/modules-render.js'), /billTalanganOwnerForPay\(b\)\)\?' · ditalangi'/);
  assert.match(rd('modules/finance/piutang-utang.js'), /talanganPayoffCreate\(p,p\.nilai\)/);
});
