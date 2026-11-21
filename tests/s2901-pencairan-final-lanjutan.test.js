'use strict';
/** S2901 — lanjutan pencairan final: cek saldo asal, buat rekening pemilik, integritas, catatan laba manual. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);

function setup(opts) {
  opts = opts || {};
  const D = {
    profile: { nama: 'W' }, piutang: [], debts: [],
    accounts: [{ id: 'bri', name: 'BRI', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }, { id: 'cash', name: 'Cash', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] }].concat(opts.noHi ? [] : [{ id: 'hi', name: 'Rek home in', ownership: 'INVESTOR', owners: [{ ownerId: 'h1', porsi: 100 }] }]),
    transactions: [
      { id: 'dp1', type: 'income', amount: 7000000, accountId: 'bri', date: '2026-11-14', renovDpProjectId: 'p1' },
      { id: 'e1', type: 'expense', amount: 4332418, accountId: 'bri', date: '2026-11-15' },
    ],
    renovProjects: [{
      id: 'p1', name: 'wallpanel', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true },
      items: [{ harga: 4332418, payments: [{ txId: 'e1', amount: 4332418, sumberDana: 'proyek' }] }, { harga: 304482 }],
      labaLedger: [],
      bagiHasil: { labaManual: opts.manual === undefined ? null : opts.manual, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 40, isSelf: true }, { ownerId: 'h1', ownerName: 'home in', porsi: 60, isSelf: false }] },
    }],
  };
  let n = 0;
  const FinanceTxSOT = { createMany(rows) { rows.forEach((r) => D.transactions.push(r)); }, removeById(id) { D.transactions = D.transactions.filter((t) => t.id !== id); } };
  const g = {
    D, sameId, todayStr: () => '2026-11-21', uid: () => 'u' + (++n), save: opts.save || (() => true), toast() {},
    escapeHtml: String, fmt: (x) => 'Rp' + Math.round(x), fmtFull: String, document: { getElementById: () => null }, totalSaldoAkun: () => 0, FinanceTxSOT,
    renovAccountOwners: (id) => ((D.accounts.find((x) => x.id === id) || {}).owners || []).filter((o) => o && o.ownerId),
  };
  if (opts.saldo !== undefined) g.recalcAccBalance = () => opts.saldo;
  const r = loadSource(['modules/home/renovasi.js'], g, ['renovCairkanFinal', 'renovBuatRekeningPemilik', 'renovLedgerIssues', 'renovLabaPanelHtml', 'renovLabaSummary']);
  return { D, p: D.renovProjects[0], r };
}
const rek = { 0: 'cash', 1: 'hi' };

test('saldo rekening asal kurang dari total transfer -> ditolak (minus:true); izinkanMinus melanjutkan', () => {
  const { p, r } = setup({ saldo: 1000000 });
  const a = r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(a.ok, false);
  assert.equal(a.minus, true);
  assert.equal(a.keluar, 2363100);
  assert.equal(p.pencairanFinal, undefined);
  const b = r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k2', izinkanMinus: true });
  assert.equal(b.ok, true, b.reason);
});

test('saldo cukup -> lanjut tanpa konfirmasi; bagian di rekening asal tidak dihitung keluar', () => {
  const s1 = setup({ saldo: 3000000 });
  assert.equal(s1.r.renovCairkanFinal(s1.p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' }).ok, true);
  const s2 = setup({ saldo: 1600000 });
  assert.equal(s2.r.renovCairkanFinal(s2.p, { rekening: { 0: 'bri', 1: 'hi' }, sumberAkunId: 'bri', kunci: 'k1' }).ok, true);
});

test('buat rekening pemilik: ownership INVESTOR, owner 100%, idempoten, SELF ditolak, rollback bila simpan gagal', () => {
  const { D, r } = setup({ noHi: true });
  const x = r.renovBuatRekeningPemilik('h1', 'home in');
  assert.equal(x.ok, true);
  assert.equal(x.account.ownership, 'INVESTOR');
  assert.equal(JSON.stringify(x.account.owners.map((o) => [o.ownerId, o.porsi])), '[["h1",100]]');
  const n = D.accounts.length;
  const y = r.renovBuatRekeningPemilik('h1', 'home in');
  assert.equal(y.existing, true);
  assert.equal(D.accounts.length, n);
  assert.equal(r.renovBuatRekeningPemilik('SELF', 'W').ok, false);
  const f = setup({ noHi: true, save: () => false });
  const z = f.r.renovBuatRekeningPemilik('h1', 'home in');
  assert.equal(z.ok, false);
  assert.equal(f.D.accounts.some((a) => a.ownership === 'INVESTOR'), false);
});

test('rekening yang baru dibuat langsung bisa dipakai pencairan final', () => {
  const { D, p, r } = setup({ noHi: true });
  const acc = r.renovBuatRekeningPemilik('h1', 'home in').account;
  const out = r.renovCairkanFinal(p, { rekening: { 0: 'cash', 1: acc.id }, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, true, out.reason);
  assert.equal(D.transactions.find((t) => t.type === 'transfer_in' && t.accountId === acc.id).amount, 1417860);
});

test('integritas: normal kosong; total bagian/ledger/transfer yang rusak terdeteksi', () => {
  const { D, p, r } = setup();
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(r.renovLedgerIssues(p).length, 0);
  p.pencairanFinal.rows[1].jumlah += 10;
  assert.ok(r.renovLedgerIssues(p).some((m) => /total bagian/.test(m)));
  p.pencairanFinal.rows[1].jumlah -= 10;
  D.transactions = D.transactions.filter((t) => !(t.type === 'transfer_in'));
  assert.ok(r.renovLedgerIssues(p).some((m) => /tidak lengkap/.test(m)));
});

test('panel: catatan laba manual berbeda sebelum final; sisa dana tertahan setelah final', () => {
  const a = setup({ manual: 2388100 });
  assert.match(a.r.renovLabaPanelHtml(a.p), /Laba manual .* tidak dipakai/);
  const b = setup();
  assert.doesNotMatch(b.r.renovLabaPanelHtml(b.p), /Laba manual/);
  b.r.renovCairkanFinal(b.p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.match(b.r.renovLabaPanelHtml(b.p), /Sisa dana proyek tertahan Rp304482/);
});
