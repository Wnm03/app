'use strict';
// S2844 — Tagihan per kepemilikan (Pribadi / Titipan), pemilik tersimpan di SEMUA tagihan, "home in" tampil di Dana Titipan
// lewat pemilik akun, teks UI basi dibersihkan, saldo negatif bertanda minus. Identitas "renov" dan "home in" TIDAK pernah digabung.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] },
  { id: 'acc_bri', name: 'BRI', owners: [{ ownerId: 'H', porsi: 100, ownerName: 'home in', isSelf: false }] },
  { id: 'acc_multi', name: 'Multi', owners: [{ ownerId: 'R', porsi: 60, ownerName: 'renov', isSelf: false }, { ownerId: 'H', porsi: 40, ownerName: 'home in', isSelf: false }] },
  { id: 'acc_plain', name: 'Plain' },
];

function mkCtx(bills, extra) {
  const D = { accounts: ACCOUNTS, bills, billsArchive: [], transactions: [], renovProjects: [] };
  const owners = (accId) => {
    const a = ACCOUNTS.find((x) => x.id === accId);
    return a && Array.isArray(a.owners) ? a.owners.filter((o) => o && o.ownerId) : [];
  };
  return loadSource(['modules/finance/tx-renov.js', 'modules/finance/tagihan-kalender.js'], {
    D,
    getAccOwnersRaw: (accId) => ({ ok: true, owners: owners(accId) }),
    sameId: (a, b) => String(a) === String(b),
    escapeHtml: (x) => String(x),
    MONTHS_FULL: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...extra,
  });
}
const bill = (id, name, amount, accountId, extra) => ({ id, name, amount, accountId, kind: 'tagihan', freq: 'bulanan', nextDue: '2026-12-05', ...extra });

test('S2844: billOwnershipOf — pribadi, titipan tersimpan, titipan otomatis dari akun 1 pemilik, multi belum dipilih', () => {
  const ctx = mkCtx([]);
  assert.equal(ctx.billOwnershipOf(bill(1, 'a', 1, 'acc_cash')).scope, 'pribadi');
  assert.equal(ctx.billOwnershipOf(bill(2, 'b', 1, 'acc_plain')).scope, 'pribadi');
  const stored = ctx.billOwnershipOf(bill(3, 'c', 1, 'acc_multi', { deductionOwnerId: 'R' }));
  assert.deepEqual([stored.scope, stored.ownerId, stored.ownerName, stored.source], ['titipan', 'R', 'renov', 'bill']);
  const auto = ctx.billOwnershipOf(bill(4, 'd', 1, 'acc_bri'));
  assert.deepEqual([auto.scope, auto.ownerId, auto.ownerName, auto.source], ['titipan', 'H', 'home in', 'akun']);
  const multi = ctx.billOwnershipOf(bill(5, 'e', 1, 'acc_multi'));
  assert.deepEqual([multi.scope, multi.ownerId, multi.source], ['titipan', '', 'multi']);
  assert.equal(ctx.billOwnershipOf(bill(6, 'f', 1, 'acc_cash', { deductionOwnerId: 'SELF' })).scope, 'pribadi');
});

test('S2844: getBillOwnershipSplit — total sama dgn getBillStats().monthTotal; "renov" dan "home in" tidak digabung', () => {
  const ctx = mkCtx([
    bill(1, 'bpjs', 72500, 'acc_cash'),
    bill(2, 'wifi', 50000, 'acc_cash'),
    bill(3, 'lem', 212000, 'acc_bri', { deductionOwnerId: 'H' }),
    bill(4, 'fisher', 40404, 'acc_bri'),
    bill(5, 'cat', 100000, 'acc_multi', { deductionOwnerId: 'R' }),
  ]);
  const sp = ctx.getBillOwnershipSplit(11, 2026);
  assert.equal(sp.pribadi, 122500);
  assert.equal(sp.titipan, 212000 + 40404 + 100000);
  assert.equal(sp.total, sp.pribadi + sp.titipan);
  assert.equal(sp.total, ctx.getBillStats(11, 2026).monthTotal);
  const byName = Object.fromEntries(sp.owners.map((o) => [o.ownerName, o.amount]));
  assert.equal(byName['home in'], 252404);
  assert.equal(byName['renov'], 100000);
  assert.equal(sp.owners.length, 2);
});

test('S2844: tanpa tagihan titipan -> kartu tidak muncul (tampilan lama persis)', () => {
  const ctx = mkCtx([bill(1, 'bpjs', 72500, 'acc_cash')]);
  const sp = ctx.getBillOwnershipSplit(11, 2026);
  assert.equal(sp.titipan, 0);
  assert.equal(sp.owners.length, 0);
});

test('S2844: sumber — deductionOwnerId disimpan dari form tanpa syarat proyek; SELF tidak disimpan; bayar non-proyek membawa pemilik', () => {
  const src = fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8');
  assert.match(src, /deductionOwnerId:\(typeof billOwnerIdFromForm==='function'\?billOwnerIdFromForm\(\):''\),/);
  assert.match(src, /billStoredOwnerForPay\(b\)/);
  const ctxP = mkCtx([]);
  assert.equal(ctxP.billStoredOwnerForPay({ accountId: 'acc_bri', deductionOwnerId: 'H' }), 'H');
  assert.equal(ctxP.billStoredOwnerForPay({ accountId: 'acc_cash', deductionOwnerId: 'H' }), '', 'bukan pemilik akun sumber -> tanpa penanda');
  assert.equal(ctxP.billStoredOwnerForPay({ accountId: 'acc_bri' }), '');
  const ctx = mkCtx([]);
  const els = {
    billRenovProject: { value: '' },
    billRenovOwner: { value: 'H' },
    billAcc: { value: 'acc_bri' },
  };
  const ctx2 = mkCtx([], { document: { getElementById: (id) => els[id] || null } });
  assert.equal(ctx2.billOwnerIdFromForm(), 'H');
  els.billRenovOwner.value = 'SELF'; els.billAcc.value = 'acc_cash';
  assert.equal(ctx2.billOwnerIdFromForm(), '');
  els.billRenovOwner.value = '__manage_owners__';
  assert.equal(ctx2.billOwnerIdFromForm(), '');
  els.billRenovProject.value = '7'; els.billRenovOwner.value = 'R'; els.billAcc.value = 'acc_multi';
  assert.equal(ctx2.billOwnerIdFromForm(), 'R');
  assert.ok(ctx);
});

test('S2844: Dana Titipan build() memuat pemilik yang hanya terdaftar di akun (mis. "home in"), tanpa menggabung identitas', () => {
  const D = {
    accounts: ACCOUNTS,
    assets: [],
    investments: [],
    investmentTx: [],
    investmentWatchlist: [],
    transactions: [],
    debts: [],
    titipanCommitments: [{ ownerId: 'R', ownerName: 'renov', principalAmount: 1000 }],
    titipanReturns: [],
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js'],
    { D, uid: () => 'u1', save: () => {}, escapeHtml: (x) => String(x), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
  const api = ctx.DanaTitipanPortfolioAPI;
  const out = api.build();
  const ids = out.owners.map((o) => o.ownerId).sort();
  assert.equal(JSON.stringify(ids), JSON.stringify(['H', 'R']));
  const h = out.owners.find((o) => o.ownerId === 'H');
  assert.equal(h.ownerName, 'home in');
  assert.equal(h.principalAmount, null);
  assert.equal(h.allocationStatus, 'PRINCIPAL_NOT_SET');
  const r = out.owners.find((o) => o.ownerId === 'R');
  assert.equal(r.principalAmount, 1000);
  assert.equal(out.owners.some((o) => o.ownerId === 'SELF'), false);
});

test('S2844: teks UI basi di modal Pengeluaran Dana Titipan & label pemilik tagihan sudah dibersihkan', () => {
  const src = fs.readFileSync('modules/shared/modals.js', 'utf8');
  assert.doesNotMatch(src, /DESIGN-S520/);
  assert.doesNotMatch(src, /linkage S519/);
  assert.doesNotMatch(src, /fungsinya menyusul sesi berikutnya/);
  assert.doesNotMatch(src, /kosong = dana pribadi \/ pilih saat bayar/);
  assert.match(src, /Pemilik dana \/ Penanggung \(opsional/);
});

test('S2844: saldo negatif di kartu Kekayaan Bersih bertanda minus; konstanta versi modules-render sinkron', () => {
  const dash = fs.readFileSync('modules/finance/finance-dashboard.js', 'utf8');
  assert.match(dash, /Saldo \$\{\(saldo < 0 \? '-' : ''\) \+ money\(Math\.abs\(saldo\)\)\}/);
  const r = fs.readFileSync('modules/shared/modules-render.js', 'utf8').match(/MODULE_RENDER_VERSION='([^']+)'/)[1];
  const c = fs.readFileSync('modules/shared/modules-calc.js', 'utf8').match(/MODULE_CALC_VERSION='([^']+)'/)[1];
  assert.equal(r, c);
});

test('S2844: ringkasan pool Dana Titipan punya baris penjelas "Sudah Dialokasikan" vs "Total Teralokasi" di semua status', () => {
  const src = fs.readFileSync('modules/finance/dana-titipan-portfolio-render.js', 'utf8');
  assert.equal((src.match(/\$\{hint\}/g) || []).length, 3);
  assert.match(src, /"Sudah Dialokasikan" = total Pokok yang dicatat per pemilik/);
});
