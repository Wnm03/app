'use strict';
// S2853 — Perluasan aksi Chat AI: banyak blok [[ACTION]] per balasan, add_piutang, add_utang, dan add_transaksi/add_tagihan dengan
// accountName + ownerName (potong porsi / talangan lewat jalur yang sama dengan Bayar Tagihan S2848). Nama akun/pemilik yang disebut tapi
// tidak dikenal = error (tidak diam-diam jatuh ke akun pertama).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', owners: [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', isSelf: true }] },
  { id: 'acc_bri', name: 'BRI', owners: [{ ownerId: 'H', ownerName: 'home in', isSelf: false }] },
  { id: 'acc_bca1', name: 'BCA Utama' },
  { id: 'acc_bca2', name: 'BCA Cadangan' },
];
const KNOWN = [{ ownerId: 'H', ownerName: 'home in' }, { ownerId: 'R', ownerName: 'renov' }];

function mk(over = {}) {
  const txs = [];
  const D = { accounts: ACCOUNTS, piutang: [], debts: [], bills: [], transactions: txs, renovProjects: [] };
  let n = 0;
  const calls = { save: 0 };
  const writer = {
    ensure() {}, add(kind, row) { if (over.addThrows === kind) throw new Error('boom'); D[kind].push(row); },
    updateById(kind, id, fn) { const r = D[kind].find((x) => x.id === id); if (r) fn(r); },
    removeByPredicate(kind, pred) { D[kind] = D[kind].filter((x, i) => !pred(x, i)); },
  };
  const ctx = loadSource(['modules/ai/chat-action.js', 'chat-action-handlers.js', 'modules/finance/tx-renov.js', 'modules/finance/piutang-utang.js'], {
    D,
    uid: () => 'u' + (++n),
    todayStr: () => '2026-11-19',
    sameId: (a, b) => String(a) === String(b),
    fmtFull: (v) => 'Rp' + Math.round(v),
    escapeHtml: (s) => String(s),
    save: () => { calls.save++; return true; },
    refreshCurrentPage: () => {},
    getAccOwnersRaw: (id) => { const a = ACCOUNTS.find((x) => x.id === id); return { ok: true, owners: a && a.owners ? a.owners : [] }; },
    BillDebtPiutangCanonicalWriter: writer,
    FinanceTxSOT: {
      findById: (id) => txs.find((t) => String(t.id) === String(id)) || null,
      create: (t) => { txs.push(t); return t; },
      replaceSnapshot: (arr) => { txs.length = 0; arr.forEach((t) => txs.push(t)); },
      patchMetaById: (id, m) => { const t = txs.find((x) => String(x.id) === String(id)); if (t) Object.assign(t, m); return t; },
    },
    resolveTxTitipanOwner: (id) => KNOWN.find((o) => o.ownerId === id) || null,
    DanaTitipanPortfolioAPI: { listExistingOwners: () => KNOWN },
    FinanceEventOutbox: { emitOrEnqueue() {} },
    AIBus: {},
    ...over.globals,
  }, ['CHAT_ACTION_HANDLERS', 'CHAT_ACTION_LABELS', 'CHAT_ACTION_EDIT_FIELDS']);
  return { ctx, D, txs, calls };
}
const H = (ctx) => ctx.CHAT_ACTION_HANDLERS;
const blk = (o) => '[[ACTION]]' + JSON.stringify(o) + '[[/ACTION]]';

test('S2853: extractChatActions — banyak blok, blok rusak/tipe asing dilewati, teks bersih', () => {
  const { ctx } = mk();
  const r = ctx.extractChatActions('Oke ya\n' + blk({ type: 'add_transaksi', data: { amount: 1000 } }) + '\n' + blk({ type: 'add_piutang', data: { name: 'a', amount: 5 } }) + '\n[[ACTION]]{rusak[[/ACTION]]\n' + blk({ type: 'hapus_semua', data: {} }));
  assert.equal(r.text, 'Oke ya');
  assert.deepEqual(JSON.parse(JSON.stringify(r.actions.map((a) => a.type))), ['add_transaksi', 'add_piutang']);
  assert.equal(r.actionError, true);
  assert.equal(r.tooMany, false);
});

test('S2853: extractChatActions — tanpa blok, batas 20 blok, nama prototype ditolak', () => {
  const { ctx } = mk();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.extractChatActions('halo'))), { text: 'halo', actions: [], actionError: false, tooMany: false });
  const many = Array.from({ length: 25 }, (_, i) => blk({ type: 'add_target', data: { name: 't' + i, amount: 10 } })).join('\n');
  const r = ctx.extractChatActions(many);
  assert.equal(r.actions.length, 20);
  assert.equal(r.tooMany, true);
  const p = ctx.extractChatActions(blk({ type: 'constructor', data: {} }) + blk({ type: 'toString', data: {} }));
  assert.equal(p.actions.length, 0);
  assert.equal(p.actionError, true);
});

test('S2853: extractChatAction (lama) tetap mengembalikan blok pertama', () => {
  const { ctx } = mk();
  const r = ctx.extractChatAction('x ' + blk({ type: 'add_target', data: { name: 'a', amount: 5 } }) + blk({ type: 'add_target', data: { name: 'b', amount: 6 } }));
  assert.equal(r.action.data.name, 'a');
  assert.equal(ctx.extractChatAction('polos').action, null);
});

test('S2853: add_transaksi — akun disebut tapi tak dikenal/ambigu = error, tidak ada transaksi', () => {
  const { ctx, txs } = mk();
  assert.throws(() => H(ctx).add_transaksi({ amount: 1000, accountName: 'Mandiri' }), /tidak dikenali/);
  assert.throws(() => H(ctx).add_transaksi({ amount: 1000, accountName: 'bca' }), /ambigu/);
  assert.equal(txs.length, 0);
  H(ctx).add_transaksi({ amount: 1000, accountName: 'bca utama' });
  assert.equal(txs[0].accountId, 'acc_bca1');
  H(ctx).add_transaksi({ amount: 2000 }); // tanpa nama = akun pertama (perilaku lama)
  assert.equal(txs[1].accountId, 'acc_cash');
});

test('S2853: add_transaksi + ownerName dari Cash = talangan (piutang dibuat, 1:1 dengan tx)', () => {
  const { ctx, txs, D } = mk();
  const msg = H(ctx).add_transaksi({ amount: 212000, category: 'Renov', accountName: 'Cash', ownerName: 'home in', note: 'lem' });
  assert.equal(txs.length, 1);
  assert.equal(txs[0].titipanTalangan, true);
  assert.equal(txs[0].titipanLinkId, 'H');
  assert.equal(txs[0].deductionOwnerId, 'H');
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].nilai, 212000);
  assert.equal(D.piutang[0].autoTxId, txs[0].id);
  assert.equal(D.piutang[0].autoTitipanOwnerId, 'H');
  assert.match(msg, /talangan ke home in/);
});

test('S2853: add_transaksi + ownerName dari BRI (punya porsi) = potong porsi, tanpa piutang', () => {
  const { ctx, txs, D } = mk();
  const msg = H(ctx).add_transaksi({ amount: 100000, accountName: 'BRI', ownerName: 'home in' });
  assert.equal(txs[0].deductionOwnerId, 'H');
  assert.equal(txs[0].titipanTalangan, undefined);
  assert.equal(D.piutang.length, 0);
  assert.match(msg, /potong porsi/);
});

test('S2853: add_transaksi — pemilik tak dikenal, pemasukan+pemilik, dan "Milik Sendiri" ditangani', () => {
  const { ctx, txs, D } = mk();
  assert.throws(() => H(ctx).add_transaksi({ amount: 1000, ownerName: 'siapa' }), /tidak dikenali/);
  assert.throws(() => H(ctx).add_transaksi({ type: 'income', amount: 1000, ownerName: 'home in' }), /hanya untuk pengeluaran/);
  assert.equal(txs.length, 0);
  H(ctx).add_transaksi({ amount: 1000, ownerName: 'Milik Sendiri' });
  assert.equal(txs[0].deductionOwnerId, undefined);
  assert.equal(D.piutang.length, 0);
});

test('S2853: add_transaksi talangan gagal = rollback transaksi dan piutang', () => {
  const { ctx, txs, D, calls } = mk({ globals: { maybeCreateTitipanTalanganPiutang: undefined } });
  // paksa piutang tidak terbuat: stub yang tidak menulis apa pun
  ctx.maybeCreateTitipanTalanganPiutang = () => {};
  const before = calls.save;
  assert.throws(() => H(ctx).add_transaksi({ amount: 5000, accountName: 'Cash', ownerName: 'renov' }), /gagal dibuat/);
  assert.equal(txs.length, 0);
  assert.equal(D.piutang.length, 0);
  assert.equal(calls.save, before);
});

test('S2853: add_tagihan — lewat writer canonical, akun + pemilik tersimpan, kind disaring', () => {
  const { ctx, D } = mk();
  const msg = H(ctx).add_tagihan({ name: 'RAB', amount: 212000, nextDue: '2026-12-05', accountName: 'Cash', ownerName: 'home in', kind: 'cicilan' });
  const b = D.bills[0];
  assert.equal(b.accountId, 'acc_cash');
  assert.equal(b.deductionOwnerId, 'H');
  assert.equal(b.kind, 'tagihan'); // cicilan/utang butuh tenor: tidak lewat chat
  assert.match(msg, /akun Cash/);
  assert.throws(() => H(ctx).add_tagihan({ name: 'x', amount: 1, nextDue: '2026-12-05', accountName: 'zzz' }), /tidak dikenali/);
  assert.throws(() => H(ctx).add_tagihan({ name: 'x', amount: 1, nextDue: 'bukan-tanggal' }), /Tanggal/);
  assert.equal(D.bills.length, 1);
  H(ctx).add_tagihan({ name: 'Netflix', amount: 50000, nextDue: '2026-12-01', kind: 'langganan' });
  assert.equal(D.bills[1].kind, 'langganan');
  assert.equal(D.bills[1].deductionOwnerId, undefined);
});

test('S2853: add_piutang — validasi, tulis lewat writer, tanpa transaksi kas, peringatan duplikat', () => {
  const { ctx, D, txs } = mk();
  assert.throws(() => H(ctx).add_piutang({ name: ' ', amount: 1000 }), /Nama/);
  assert.throws(() => H(ctx).add_piutang({ name: 'Budi', amount: 0 }), /Nominal/);
  const m1 = H(ctx).add_piutang({ name: 'Budi', amount: 500000, date: '2026-11-10', dueDate: '2026-12-10', note: 'pinjam' });
  assert.equal(D.piutang.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(D.piutang[0])), { id: D.piutang[0].id, name: 'Budi', nilai: 500000, tanggal: '2026-11-10', jatuhTempo: '2026-12-10', catatan: 'pinjam', assetId: '', lunas: false });
  assert.equal(txs.length, 0);
  assert.doesNotMatch(m1, /sudah ada/);
  const m2 = H(ctx).add_piutang({ name: 'budi', amount: 500000, date: '2026-11-10' });
  assert.match(m2, /sudah ada piutang/);
  H(ctx).add_piutang({ name: 'Ani', amount: 1000, date: '2026-13-45', dueDate: 'ngawur' });
  assert.equal(D.piutang[2].tanggal, '2026-11-19');
  assert.equal(D.piutang[2].jatuhTempo, '');
});

test('S2853: add_utang — jenis disaring, tagihan cicilan otomatis (Debt.syncBill), gagal tulis = tidak tersimpan', () => {
  const { ctx, D, calls } = mk();
  H(ctx).add_utang({ name: 'Bank', amount: 3000000, jenis: 'kpr', bunga: -5, cicilanBulanan: 250000.6 });
  assert.equal(D.debts[0].jenis, 'lainnya');
  assert.equal(D.debts[0].bunga, 0);
  assert.equal(D.debts[0].cicilanBulanan, 250001);
  assert.equal(D.debts[0].lunas, false);
  assert.equal(D.bills.filter((b) => b.kind === 'utang').length, 1); // cicilan > 0 -> tagihan utang otomatis
  H(ctx).add_utang({ name: 'Kop', amount: 1000, jenis: 'koperasi' });
  assert.equal(D.debts[1].jenis, 'koperasi');
  assert.throws(() => H(ctx).add_utang({ name: '', amount: 5 }), /Nama/);
  assert.throws(() => H(ctx).add_utang({ name: 'x', amount: -5 }), /Nominal/);
  const f = mk({ addThrows: 'debts' });
  assert.throws(() => H(f.ctx).add_utang({ name: 'Bank', amount: 100 }), /boom/);
  assert.equal(f.D.debts.length, 0);
  assert.equal(f.calls.save, 0);
  assert.equal(calls.save > 0, true);
});

test('S2853: label, field edit, dan ringkasan tersedia untuk semua tipe baru', () => {
  const { ctx } = mk();
  ['add_piutang', 'add_utang'].forEach((t) => {
    assert.ok(ctx.CHAT_ACTION_LABELS[t], 'label ' + t);
    assert.ok(ctx.CHAT_ACTION_EDIT_FIELDS[t].length >= 4, 'field edit ' + t);
    assert.equal(typeof ctx.CHAT_ACTION_HANDLERS[t], 'function');
  });
  assert.match(ctx.chatActionSummary('add_transaksi', { amount: 5000, category: 'x', accountName: 'BRI', ownerName: 'home in' }), /akun BRI.*pemilik home in/);
  assert.match(ctx.chatActionSummary('add_transaksi', { amount: 5000 }), /akun \(pertama\)/);
  assert.match(ctx.chatActionSummary('add_piutang', { name: 'Budi', amount: 5000 }), /Budi/);
  assert.match(ctx.chatActionSummary('add_utang', { name: 'Bank', amount: 5000, cicilanBulanan: 100 }), /cicilan/);
});
