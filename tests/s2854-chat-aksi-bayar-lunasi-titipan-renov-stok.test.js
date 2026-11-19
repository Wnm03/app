'use strict';
// S2854 — Aksi Chat AI baru: pay_tagihan (markBillPaid dengan dialog dijawab otomatis), pay_piutang, add_titipan, add_renov_proyek,
// add_renov_item, add_stok_cobek, plus add_tagihan tertaut proyek renovasi. Handler pay_* tidak menduplikasi logika pembayaran/pelunasan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ACCOUNTS = [{ id: 'acc_cash', name: 'Cash' }, { id: 'acc_bri', name: 'BRI' }];

function mk(over = {}) {
  const txs = [];
  const D = {
    accounts: ACCOUNTS, piutang: over.piutang || [], debts: [], bills: over.bills || [], transactions: txs,
    renovProjects: over.renovProjects || [], products: over.products || [], titipanCommitments: [], cobek: over.cobek || [],
  };
  let n = 0;
  const calls = { save: 0, dialogs: [] };
  const writer = {
    ensure() {}, add(kind, row) { D[kind].push(row); },
    updateById(kind, id, fn) { const r = D[kind].find((x) => String(x.id) === String(id)); if (r) fn(r); },
    removeByPredicate(kind, pred) { D[kind] = D[kind].filter((x, i) => !pred(x, i)); },
    replace(kind, rows) { D[kind] = rows; },
  };
  const ctx = loadSource(['modules/ai/chat-action.js', 'chat-action-handlers.js', 'modules/finance/tx-renov.js', 'modules/finance/piutang-utang.js'], {
    D,
    uid: () => 'u' + (++n),
    todayStr: () => '2026-11-19',
    sameId: (a, b) => String(a) === String(b),
    fmtFull: (v) => 'Rp' + Math.round(v),
    escapeHtml: (s) => String(s),
    save: () => { calls.save++; return over.saveResult === undefined ? true : over.saveResult; },
    refreshCurrentPage: () => {},
    BillDebtPiutangCanonicalWriter: writer,
    FinanceTxSOT: {
      findById: (id) => txs.find((t) => String(t.id) === String(id)) || null,
      create: (t) => { txs.push(t); return t; },
      replaceSnapshot: (arr) => { txs.length = 0; arr.forEach((t) => txs.push(t)); },
      patchMetaById: (id, m) => { const t = txs.find((x) => String(x.id) === String(id)); if (t) Object.assign(t, m); return t; },
    },
    askConfirm: async (m) => { calls.dialogs.push('orig-confirm'); return true; },
    showPromptModal: async () => 'orig-prompt',
    FinanceEventOutbox: { emitOrEnqueue() {} },
    AIBus: {},
    ...over.globals,
  }, ['CHAT_ACTION_HANDLERS', 'CHAT_ACTION_LABELS', 'CHAT_ACTION_EDIT_FIELDS']);
  return { ctx, D, txs, calls };
}
const H = (ctx) => ctx.CHAT_ACTION_HANDLERS;

test('S2854: tipe aksi baru terdaftar di handler, label, dan form edit', () => {
  const { ctx } = mk();
  ['pay_tagihan', 'pay_piutang', 'add_titipan', 'add_renov_proyek', 'add_renov_item', 'add_stok_cobek'].forEach((t) => {
    assert.equal(typeof H(ctx)[t], 'function', t);
    assert.ok(ctx.CHAT_ACTION_LABELS[t], 'label ' + t);
    assert.ok(Array.isArray(ctx.CHAT_ACTION_EDIT_FIELDS[t]), 'edit ' + t);
    assert.ok(ctx.chatActionSummary(t, { name: 'x', ownerName: 'x', productName: 'x', projectName: 'x', amount: 1, qty: 1, harga: 1 }).length > 0, 'summary ' + t);
  });
});

test('S2854: pay_tagihan — dialog tanggal/nominal dijawab otomatis, dialog asli dipulihkan', async () => {
  const bill = { id: 'b1', name: 'Listrik', amount: 200000, kind: 'tagihan', freq: 'bulanan' };
  let seen = null;
  const { ctx, D, txs } = mk({ bills: [bill] });
  ctx.markBillPaid = async (id) => {
    const b = D.bills.find((x) => x.id === id);
    const date = await ctx.showPromptModal({ title: 'Tanggal Pembayaran', inputType: 'date' });
    seen = date;
    txs.push({ id: 't1', type: 'expense', amount: b.amount, date, billLinkId: b.id });
  };
  const origPrompt = ctx.showPromptModal;
  const msg = await H(ctx).pay_tagihan({ name: 'listrik', date: '2026-11-18' });
  assert.equal(seen, '2026-11-18');
  assert.match(msg, /Listrik/);
  assert.match(msg, /Rp200000/);
  assert.equal(ctx.showPromptModal, origPrompt, 'showPromptModal dipulihkan');
  assert.equal(await ctx.showPromptModal({ title: 'x' }), 'orig-prompt');
});

test('S2854: pay_tagihan — dialog tak terduga (sudah dibayar periode ini) dibatalkan dan dilaporkan', async () => {
  const bill = { id: 'b1', name: 'Internet', amount: 300000, kind: 'tagihan', freq: 'bulanan' };
  const { ctx, D, txs } = mk({ bills: [bill] });
  ctx.markBillPaid = async (id) => {
    const ok = await ctx.askConfirm('"Internet" sudah dibayar utk periode ini. Tetap bayar lagi?');
    if (!ok) return;
    txs.push({ id: 'tx', billLinkId: id, amount: 1 });
  };
  await assert.rejects(() => H(ctx).pay_tagihan({ name: 'Internet' }), /tidak dilakukan.*sudah dibayar/);
  assert.equal(txs.length, 0);
  assert.equal(await ctx.askConfirm('x'), true, 'askConfirm asli dipulihkan');
  assert.equal(D.bills.length, 1);
});

test('S2854: pay_tagihan — nama ambigu/tak dikenal dan nominal beda utk non-utang ditolak; utang boleh beda nominal', async () => {
  const bills = [
    { id: 'b1', name: 'Cicilan Motor', amount: 500000, kind: 'cicilan', freq: 'bulanan' },
    { id: 'b2', name: 'Cicilan HP', amount: 100000, kind: 'cicilan', freq: 'bulanan' },
    { id: 'b3', name: 'Pinjaman Budi', amount: 250000, kind: 'utang', freq: 'bulanan' },
  ];
  const { ctx, txs } = mk({ bills });
  let amountSeen = null;
  ctx.markBillPaid = async (id) => {
    amountSeen = await ctx.showPromptModal({ title: 'Jumlah Pembayaran' });
    const date = await ctx.showPromptModal({ title: 'Tanggal Pembayaran' });
    txs.push({ id: 'tt' + txs.length, billLinkId: id, amount: Number(amountSeen), date });
  };
  await assert.rejects(() => H(ctx).pay_tagihan({ name: 'Cicilan' }), /ambigu/);
  await assert.rejects(() => H(ctx).pay_tagihan({ name: 'Zzz' }), /tidak ditemukan/);
  await assert.rejects(() => H(ctx).pay_tagihan({ name: 'Cicilan Motor', amount: 1 }), /tetap/);
  await H(ctx).pay_tagihan({ name: 'Pinjaman Budi', amount: 900000 });
  assert.equal(amountSeen, '900000');
});

test('S2854: pay_piutang — piutang biasa: lunas penuh dan pelunasan sebagian', async () => {
  const { ctx, D, txs } = mk({ piutang: [{ id: 'p1', name: 'Andi', nilai: 100000, lunas: false }, { id: 'p2', name: 'Budi', nilai: 300000, lunas: false }] });
  const m1 = H(ctx).pay_piutang({ name: 'Andi' });
  assert.equal(D.piutang[0].lunas, true);
  assert.match(m1, /dilunasi/);
  const m2 = H(ctx).pay_piutang({ name: 'Budi', amount: 120000, date: '2026-11-18' });
  assert.equal(D.piutang[1].lunas, false);
  assert.equal(D.piutang[1].nilai, 180000);
  assert.match(m2, /sebagian/);
  assert.equal(txs.length, 0);
  assert.throws(() => H(ctx).pay_piutang({ name: 'Budi', amount: 999999 }), /melebihi sisa/);
  assert.throws(() => H(ctx).pay_piutang({ name: 'Andi' }), /tidak ditemukan/, 'yang sudah lunas tidak dicari');
});

test('S2854: pay_piutang — tertaut transaksi kas: lunas = pemasukan ke akun asal; sebagian ditolak', () => {
  const { ctx, D, txs } = mk({ piutang: [{ id: 'p1', name: 'Citra', nilai: 50000, lunas: false, linkedTxId: 'orig' }] });
  txs.push({ id: 'orig', type: 'expense', amount: 50000, accountId: 'acc_bri' });
  assert.throws(() => H(ctx).pay_piutang({ name: 'Citra', amount: 10 }), /sebagian/);
  H(ctx).pay_piutang({ name: 'Citra', date: '2026-11-18' });
  const inc = txs.find((t) => t.type === 'income');
  assert.ok(inc && inc.accountId === 'acc_bri' && inc.amount === 50000 && inc.date === '2026-11-18');
  assert.equal(D.piutang[0].lunas, true);
  assert.equal(D.piutang[0].linkedPayoffTxId, inc.id);
});

test('S2854: pay_piutang — talangan titipan: pemasukan non-pribadi; sebagian mengurangi sisa; gagal simpan = rollback', () => {
  const mkTal = (over) => mk({ piutang: [{ id: 'p1', name: 'home in', nilai: 400000, lunas: false, autoTxId: 'tal', autoTitipanOwnerId: 'H' }], ...over });
  const a = mkTal();
  a.txs.push({ id: 'tal', type: 'expense', amount: 400000, accountId: 'acc_cash' });
  H(a.ctx).pay_piutang({ name: 'home in', amount: 150000 });
  assert.equal(a.D.piutang[0].nilai, 250000);
  assert.equal(a.D.piutang[0].lunas, false);
  const inc1 = a.txs.find((t) => t.type === 'income');
  assert.equal(inc1.talanganPelunasanOwnerId, 'H');
  assert.equal(inc1.amount, 150000);
  H(a.ctx).pay_piutang({ name: 'home in' });
  assert.equal(a.D.piutang[0].lunas, true);
  assert.equal(a.txs.filter((t) => t.type === 'income').length, 2);

  const b = mkTal({ saveResult: false });
  b.txs.push({ id: 'tal', type: 'expense', amount: 400000, accountId: 'acc_cash' });
  assert.throws(() => H(b.ctx).pay_piutang({ name: 'home in' }), /Gagal menyimpan/);
  assert.equal(b.txs.filter((t) => t.type === 'income').length, 0, 'pemasukan dikembalikan');
  assert.equal(b.D.piutang[0].lunas, false);
});

test('S2854: pay_piutang — piutang dari order Shop ditolak', () => {
  const { ctx } = mk({ piutang: [{ id: 'p1', name: 'Pembeli', nilai: 90000, lunas: false }], cobek: [{ id: 'c1', piutangLinkId: 'p1' }], globals: { _shopReceivableOwner: (p) => ({ id: 'c1' }) } });
  assert.throws(() => H(ctx).pay_piutang({ name: 'Pembeli' }), /order Shop/);
});

test('S2854: add_titipan — pemilik baru dibuat lewat OwnerRegistry lalu saveCommitment; upsert diberitahukan', () => {
  const saved = [];
  const reg = { findOrCreate: (name) => 'own_' + name.toLowerCase().replace(/\s+/g, '') };
  const api = { saveCommitment: (x) => { saved.push(x); return { id: 'c', ...x }; }, listExistingOwners: () => [] };
  const { ctx, D } = mk({ globals: { OwnerRegistry: reg, DanaTitipanPortfolioAPI: api } });
  const m = H(ctx).add_titipan({ ownerName: 'Pak Budi', amount: 5000000, date: '2026-11-10', note: 'renov' });
  assert.equal(saved[0].ownerId, 'own_pakbudi');
  assert.equal(saved[0].principalAmount, 5000000);
  assert.equal(saved[0].committedDate, '2026-11-10');
  assert.match(m, /tersimpan/);
  D.titipanCommitments.push({ ownerId: 'own_pakbudi', principalAmount: 5000000 });
  assert.match(H(ctx).add_titipan({ ownerName: 'Pak Budi', amount: 6000000 }), /diperbarui \(sebelumnya Rp5000000\)/);
  assert.throws(() => H(ctx).add_titipan({ ownerName: '', amount: 1 }), /Nama pemilik/);
  assert.throws(() => H(ctx).add_titipan({ ownerName: 'X', amount: -1 }), /angka/);
  api.saveCommitment = () => ({ ok: false, code: 'PERSISTENCE_FAILED' });
  assert.throws(() => H(ctx).add_titipan({ ownerName: 'Pak Budi', amount: 1 }), /PERSISTENCE_FAILED/);
});

test('S2854: add_renov_proyek + add_renov_item + add_tagihan tertaut proyek/item', () => {
  const { ctx, D } = mk({ globals: { renovClassifyProject: (p, dana) => { p.dana = dana; return { ok: true }; } } });
  const m = H(ctx).add_renov_proyek({ name: 'Dinding TV', rab: 12000000, klien: 'Bu Sari', dana: 'klien' });
  assert.match(m, /Dinding TV.*RAB Rp12000000.*klien/);
  assert.equal(D.renovProjects[0].dana, 'klien');
  assert.throws(() => H(ctx).add_renov_proyek({ name: 'dinding tv' }), /sudah ada/);
  assert.throws(() => H(ctx).add_renov_proyek({ name: 'X', rab: -5 }), /RAB/);
  H(ctx).add_renov_item({ projectName: 'dinding', name: 'WPC Panel', harga: 4500000, accountName: 'BRI' });
  const it = D.renovProjects[0].items[0];
  assert.equal(it.accountId, 'acc_bri');
  assert.equal(it.paid, false);
  assert.throws(() => H(ctx).add_renov_item({ projectName: 'dinding', name: 'wpc panel', harga: 1 }), /sudah ada/);
  assert.throws(() => H(ctx).add_renov_item({ projectName: 'nope', name: 'a', harga: 1 }), /tidak ditemukan/);
  assert.throws(() => H(ctx).add_renov_item({ projectName: 'dinding', name: 'b', harga: 0 }), /Harga/);
  H(ctx).add_tagihan({ name: 'Cicilan WPC', amount: 1000000, nextDue: '2026-12-01', projectName: 'Dinding TV', itemName: 'WPC Panel' });
  assert.equal(D.bills[0].renovProjectLinkId, D.renovProjects[0].id);
  assert.equal(D.bills[0].renovItemLinkId, it.id);
  assert.throws(() => H(ctx).add_tagihan({ name: 'Z', amount: 5, nextDue: '2026-12-01', projectName: 'Dinding TV', itemName: 'tidak ada' }), /tidak ditemukan/);
});

function mkStock(over = {}) {
  const prod = { id: 'pr1', name: 'Cobek 21-22cm', stock: 1, hargaBeli: 15000, kategoriId: 'k1' };
  const repo = {
    mutateStockDelta(p, d) { if (over.stockFail) return { ok: false, reason: 'stok ditolak' }; p.stock += d; return { ok: true, stock: p.stock }; },
    mutateSetPrice(p, f, v) { p[f] = v; return { ok: true }; },
  };
  const r = mk({ products: [prod], ...over, globals: { ProductRepository: repo, ...(over.globals || {}) } });
  return { ...r, prod };
}

test('S2854: add_stok_cobek — stok saja, atau stok + pengeluaran bertanda Bisnis/Cobek; validasi dan rollback', () => {
  const a = mkStock();
  const m1 = H(a.ctx).add_stok_cobek({ productName: 'cobek 21', qty: 5 });
  assert.equal(a.prod.stock, 6);
  assert.equal(a.txs.length, 0);
  assert.match(m1, /tanpa catatan kas/);
  const m2 = H(a.ctx).add_stok_cobek({ productName: 'Cobek 21-22cm', qty: 2, hargaBeli: 16000, accountName: 'BRI', date: '2026-11-18' });
  assert.equal(a.prod.stock, 8);
  assert.equal(a.prod.hargaBeli, 16000);
  const tx = a.txs[0];
  assert.deepEqual([tx.type, tx.amount, tx.category, tx.subcategory, tx.accountId, tx.date], ['expense', 32000, 'Bisnis', 'Cobek', 'acc_bri', '2026-11-18']);
  assert.equal(tx.stockProductId, 'pr1');
  assert.equal(tx.stockQty, 2);
  assert.equal(tx.stockRev, 1);
  assert.match(m2, /Rp32000/);
  assert.throws(() => H(a.ctx).add_stok_cobek({ productName: 'Cobek 21', qty: 0 }), /Jumlah/);
  assert.throws(() => H(a.ctx).add_stok_cobek({ productName: 'Cobek 21', qty: 1, accountName: 'BRI' }), /Harga beli/);
  assert.throws(() => H(a.ctx).add_stok_cobek({ productName: 'Cobek 21', qty: 1, hargaBeli: 1, accountName: 'Tidak Ada' }), /tidak dikenali/);
  assert.throws(() => H(a.ctx).add_stok_cobek({ productName: 'Tidak Ada', qty: 1 }), /tidak ditemukan/);

  const b = mkStock({ stockFail: true });
  assert.throws(() => H(b.ctx).add_stok_cobek({ productName: 'Cobek', qty: 3, hargaBeli: 1000, accountName: 'Cash' }), /stok ditolak/);
  assert.equal(b.txs.length, 0, 'pengeluaran dikembalikan');
  assert.equal(b.prod.stock, 1);
  const c = mkStock({ saveResult: false });
  assert.throws(() => H(c.ctx).add_stok_cobek({ productName: 'Cobek', qty: 3, hargaBeli: 1000, accountName: 'Cash' }), /Gagal menyimpan/);
  assert.equal(c.txs.length, 0);
  assert.equal(c.prod.stock, 1, 'stok dikembalikan');
});
