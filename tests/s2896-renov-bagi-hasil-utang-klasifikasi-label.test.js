'use strict';
/** S2896 — (1) utang bagian penerima bagi hasil + guard pencairan hak W, (2) isAliranKlien paritas dgn renovClientFundState, (3) label sumber dana SELF bukan titipan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);

function mk(D, extra) {
  let n = 0;
  return loadSource(['modules/home/renovasi.js', 'modules/finance/tx-renov.js'], Object.assign({
    D, sameId, todayStr: () => '2026-11-20', uid: () => 'u' + (++n), save: () => true, toast() {},
    escapeHtml: String, fmt: (x) => 'Rp' + Math.round(x), fmtFull: (x) => 'Rp' + Math.round(x),
    document: { getElementById: () => null }, totalSaldoAkun: () => 0, closeModal() {}, openModal() {},
    renovAccountOwners: undefined,
  }, extra || {}), ['Renov']);
}
const accSelf = (id) => ({ id, name: id, ownership: 'SELF', includeInBalance: true });

// Fixture = skenario backup 20 Nov: RAB 7jt, DP 2x3,5jt ke BRI, biaya 4.307.418 (item lama tanpa payments[]) + 304.482 belum dibayar.
function wall(extra) {
  const items = [{ id: 'i1', name: 'a', harga: 4307418, paid: true, txId: 't1' }, { id: 'i2', name: 'b', harga: 304482, paid: false, txId: null, payments: [] }];
  const p = Object.assign({
    id: 'p1', name: 'wallpanel', klien: 'mba indah', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true }, items, labaLedger: [],
    bagiHasil: { labaManual: 2388100, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 33.499434697, isSelf: true }, { ownerId: 'home1', ownerName: 'home in', porsi: 66.500565303, isSelf: false }] },
  }, extra || {});
  const D = {
    profile: { nama: 'W' }, renovProjects: [p], accounts: [accSelf('bri'), accSelf('cash')], piutang: [], debts: [],
    transactions: [
      { id: 'd1', type: 'income', amount: 3500000, accountId: 'bri', renovDpProjectId: 'p1', date: '2026-11-14' },
      { id: 'd2', type: 'income', amount: 3500000, accountId: 'bri', renovDpProjectId: 'p1', date: '2026-11-16' },
      { id: 't1', type: 'expense', amount: 4307418, accountId: 'bri', renovProjectLinkId: 'p1', renovItemLinkId: 'i1', deductionOwnerId: 'SELF', date: '2026-11-16' },
    ],
  };
  return { p, D };
}

// ---------- Poin 2: isAliranKlien ----------
test('isAliranKlien: item lama tanpa payments[] dari rekening DP = dana proyek; paritas dgn biaya status dana', () => {
  const { p, D } = wall(); const r = mk(D);
  assert.equal(r.isAliranKlien(D.transactions[2]), true);
  assert.equal(r.renovClientFundState(p).cost, 4307418);
  const flow = D.transactions.filter((t) => t.type === 'expense' && r.isAliranKlien(t)).reduce((s, t) => s + t.amount, 0);
  assert.equal(flow, r.renovClientFundState(p).cost);
});

test('isAliranKlien: bukan dana proyek bila akun lain / talangan-pribadi / penanggung non-SELF', () => {
  const { p, D } = wall(); p.items = [
    { id: 'i1', harga: 10, payments: [{ id: 'a', txId: 'x1', amount: 10 }] },
    { id: 'i2', harga: 10, payments: [{ id: 'b', txId: 'x2', amount: 10, sumberDana: 'talangan-pribadi' }] },
    { id: 'i3', harga: 10, payments: [{ id: 'c', txId: 'x3', amount: 10 }] },
    { id: 'i4', harga: 10, payments: [{ id: 'd', txId: 'x4', amount: 10, sumberDana: 'proyek' }] },
  ];
  const base = { type: 'expense', amount: 10, renovProjectLinkId: 'p1' };
  D.transactions.push({ ...base, id: 'x1', accountId: 'cash' }, { ...base, id: 'x2', accountId: 'bri' }, { ...base, id: 'x3', accountId: 'bri', deductionOwnerId: 'home1' }, { ...base, id: 'x4', accountId: 'bri' });
  const r = mk(D); const f = (id) => r.isAliranKlien(D.transactions.find((t) => t.id === id));
  assert.equal(f('x1'), false); assert.equal(f('x2'), false); assert.equal(f('x3'), false); assert.equal(f('x4'), true);
});

// ---------- Poin 3: label ----------
test('renovFundSource: akun SELF default bukan titipan; titipan sungguhan tetap', () => {
  const { D } = wall();
  const r = mk(D, { resolveOwnerDefaultForAccount: (id) => ({ ok: true, owners: id === 'tit' ? [{ ownerId: 'home1', ownerName: 'home in', porsi: 100 }] : [{ ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 100, isSelf: true }] }) });
  const acc = new Set(['bri']);
  assert.equal(r.renovFundSource({ accountId: 'bri', deductionOwnerId: 'SELF' }, acc).kind, 'proyek');
  assert.equal(r.renovFundSource({ accountId: 'cash', deductionOwnerId: 'SELF' }, acc).kind, 'talangan');
  assert.equal(r.renovFundSource({ accountId: 'tit' }, acc).kind, 'titipan');
  assert.equal(r.renovFundSource({ accountId: 'bri', deductionOwnerId: 'home1' }, acc).kind, 'titipan');
});

// ---------- Poin 1: utang bagi hasil + guard ----------
test('akui laba: utang home in dibuat (bukan W), koreksi menurunkan, koreksi penuh menghapus', () => {
  const { p, D } = wall(); const r = mk(D);
  assert.equal(r.renovAkuiLaba(p, 2388100, { kunci: 'k1' }).ok, true);
  const rows = D.debts.filter((d) => d.renovBagiProjectId === 'p1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].linkedOwnerId, 'home1'); assert.equal(rows[0].nilai, 1588100); assert.equal(rows[0].lunas, false);
  assert.equal(r.renovKoreksiLaba(p, 1000000, { kunci: 'k2', catatan: 'biaya naik' }).ok, true);
  assert.equal(D.debts.find((d) => d.renovBagiProjectId).nilai, Math.round(1388100 * 66.500565303 / 100) > 0 ? D.debts.find((d) => d.renovBagiProjectId).nilai : 0);
  assert.ok(D.debts.find((d) => d.renovBagiProjectId).nilai < 1588100);
  assert.equal(r.renovKoreksiLaba(p, 1388100, { kunci: 'k3', catatan: 'batal' }).ok, true);
  assert.equal(D.debts.filter((d) => d.renovBagiProjectId).length, 0);
});

test('sinkron idempoten, lunas dipertahankan, porsi diubah menyisakan selisih', () => {
  const { p, D } = wall(); const r = mk(D);
  r.renovAkuiLaba(p, 2388100, { kunci: 'k1' });
  assert.equal(r.renovSyncBagiHasilUtang(p), false);
  D.debts[0].lunas = true;
  assert.equal(r.renovSyncBagiHasilUtang(p), false);
  p.bagiHasil.owners[0].porsi = 20; p.bagiHasil.owners[1].porsi = 80;
  p.bagiHasil.labaManual = 2388100;
  r.renovSyncBagiHasilUtang(p);
  const open = D.debts.filter((d) => d.renovBagiProjectId && !d.lunas);
  assert.equal(open.length, 1);
  assert.equal(open[0].nilai, Math.round(2388100 * 0.8) - 1588100);
});

test('save gagal: ledger dan utang dikembalikan', () => {
  const { p, D } = wall(); const r = mk(D, { save: () => false });
  const res = r.renovAkuiLaba(p, 2388100, { kunci: 'k1' });
  assert.equal(res.ok, false);
  assert.equal(p.labaLedger.length, 0); assert.equal(D.debts.length, 0);
});

test('guard pencairan: tidak boleh melebihi hak W; sama dgn hak diizinkan', () => {
  const { p, D } = wall(); const r = mk(D);
  r.renovAkuiLaba(p, 2388100, { kunci: 'k1' });
  const hk = r.renovHakSelf(p);
  assert.equal(hk.hak, 800000);
  const over = r.renovCairkanLaba(p, 800001, { kunci: 'c1' });
  assert.equal(over.ok, false); assert.match(over.reason, /hak W/);
  assert.equal(r.renovCairkanLaba(p, 800000, { kunci: 'c2' }).ok, true);
  assert.equal(r.renovCairkanLaba(p, 1, { kunci: 'c3' }).ok, false);
});

test('guard pencairan: hak W dibatasi laba yang sudah diakui', () => {
  const { p, D } = wall(); const r = mk(D);
  r.renovAkuiLaba(p, 1000000, { kunci: 'k1' });
  assert.equal(r.renovHakSelf(p).hak, 335000 > 0 ? Math.round(1000000 * 33.499434697 / 100) : 0);
  assert.equal(r.renovCairkanLaba(p, 400000, { kunci: 'c1' }).ok, false);
});

test('tanpa bagi hasil: tanpa utang dan pencairan tidak dibatasi hak', () => {
  const { p, D } = wall({ bagiHasil: undefined }); delete p.bagiHasil; const r = mk(D);
  r.renovAkuiLaba(p, 2388100, { kunci: 'k1' });
  assert.equal(D.debts.length, 0);
  assert.equal(r.renovHakSelf(p), null);
  assert.equal(r.renovCairkanLaba(p, 2388100, { kunci: 'c1' }).ok, true);
});

// ---------- konsumen D.debts ----------
function debtCtx(D) {
  return loadSource(['modules/finance/piutang-utang.js'], {
    D, escapeHtml: String, fmt: String, fmtFull: String, save: () => true, sameId, askConfirm: async () => true, toast: (m) => { D._toast = m; },
    renderKekayaanBersih() {}, hitungZakatMaal() {}, renderBillList() {}, checkBills() {},
  }, ['Debt', 'DebtStrategy']);
}
const bagiDebt = () => ({ id: 'b1', name: 'home in', nilai: 1588100, lunas: false, bunga: 0, cicilanBulanan: 0, linkedOwnerId: 'home1', renovBagiProjectId: 'p1', renovBagiOwnerId: 'home1' });

test('utang bagi hasil: tidak memotong Kekayaan Bersih, bukan target strategi, tidak bisa dihapus', async () => {
  const D = { debts: [bagiDebt(), { id: 'm', name: 'KTA', nilai: 1000, lunas: false, bunga: 10, cicilanBulanan: 100 }], bills: [], piutang: [] };
  const c = debtCtx(D);
  assert.equal(c.Debt.totalValue(), 1000);
  assert.deepEqual(c.DebtStrategy.activeDebts().map((d) => d.id), ['m']);
  assert.equal(await c.Debt.delete('b1'), false);
  assert.ok(D.debts.some((d) => d.id === 'b1'));
});

test('alokasi kas: utang bagi hasil tidak memicu UNSCHEDULED_DEBT', () => {
  const D = {
    accounts: [{ id: 'daily', includeInBalance: true, ownership: { type: 'SELF' } }, { id: 'emergency', includeInBalance: true, ownership: { type: 'SELF' } }],
    transactions: [], bills: [], debts: [bagiDebt()], targets: [{ id: 't', isDanaDarurat: true, accountId: 'emergency', amount: 200 }], profile: { kiriman: 0 },
  };
  const api = loadSource(['modules/finance/finance-allocation-api.js'], {
    D, OwnershipEngine: { resolve: () => ({ type: 'SELF' }) }, FinancialForecastAPI: { summary: () => ({ ok: true, cashflowProjection: { projected: 900 } }) },
    totalSaldoAkun: () => 1000, recalcAccBalance: (id) => id === 'emergency' ? 200 : 800, linkedAssetAccountIds: () => new Set(), isAccOwnershipSelf: () => true,
    computeCashflowForecast: () => ({ saldoNow: 1000, billsDue: 0, upcoming: [] }), getBillPaidThisPeriodInfo: () => null,
    getMonthlyCashProjection: () => ({ titipanPinjamUnscheduledTotal: 0 }),
  }, ['FinanceAllocationAPI']).FinanceAllocationAPI;
  assert.notEqual(api.summary().actualCashBlockCode, 'UNSCHEDULED_DEBT');
});
