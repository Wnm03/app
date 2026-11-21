'use strict';
/**
 * S2903 — opsi "Tahan di rekening dana proyek (titipan)" pada Pencairan Final untuk pemilik non-W.
 * Invarian pada angka backup asli (wallpanel): saldo pribadi naik TEPAT 800.000; porsi home in 1.563.100 tertahan di BRI sebagai titipan
 * (utang bagi hasil tetap terbuka, tidak dihitung dua kali); 3 tagihan 304.482 tetap dana proyek; rilis titipan = transfer + utang lunas.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);

function setup(opts) {
  opts = opts || {};
  const flags = { fail: false };
  const created = [];
  const D = {
    profile: { nama: 'W' }, piutang: [], debts: [],
    accounts: [
      { id: 'bri', name: 'BRI', owners: opts.briOwners || [{ ownerId: 'SELF', porsi: 100, isSelf: true }] },
      { id: 'hi', name: 'Rek home in', ownership: 'h1', owners: [{ ownerId: 'h1', porsi: 100, ownerName: 'home in' }] },
    ],
    transactions: [
      { id: 'dp1', type: 'income', amount: 7000000, accountId: 'bri', date: '2026-11-14', renovDpProjectId: 'p1' },
      { id: 'e1', type: 'expense', amount: 4332418, accountId: 'bri', date: '2026-11-15', ...(opts.txExtra || {}) },
    ],
    renovProjects: [{
      id: 'p1', name: 'wallpanel', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true },
      items: [
        { id: 'i0', name: 'Bahan terbayar', harga: 4332418, payments: [{ id: 'py0', txId: 'e1', amount: 4332418, sumberDana: 'proyek' }] },
        { id: 'i1', name: 'Lem Kuning Taco', harga: 212000, billLinkId: 'b1', payments: [] },
        { id: 'i2', name: 'Lem Sealant', harga: 52078, billLinkId: 'b2', payments: [] },
        { id: 'i3', name: 'Fisher + Baut', harga: 40404, billLinkId: 'b3', payments: [] },
      ],
      // seperti backup asli: laba diakui lama 800.000 (bagian W) + utang bagi hasil home in 529.169
      labaLedger: [{ id: 'l1', kunci: 'k0', tipe: 'akui', jumlah: 800000, tanggal: '2026-11-21' }],
      bagiHasil: { labaManual: null, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 33.8538360628, isSelf: true }, { ownerId: 'h1', ownerName: 'home in', porsi: 66.1461639372, isSelf: false }] },
    }],
  };
  let n = 0;
  const FinanceTxSOT = { createMany(rows) { rows.forEach((r) => { D.transactions.push(r); created.push(r); }); }, removeById(id) { D.transactions = D.transactions.filter((t) => t.id !== id); } };
  const r = loadSource(['modules/home/renovasi.js'], {
    D, sameId, todayStr: () => '2026-11-21', uid: () => 'u' + (++n), save: () => !flags.fail, toast() {},
    escapeHtml: String, fmt: (x) => 'Rp' + Math.round(x), fmtFull: String, document: { getElementById: () => null }, totalSaldoAkun: () => 0, FinanceTxSOT,
    renovAccountOwners: (id) => ((D.accounts.find((x) => x.id === id) || {}).owners || []).filter((o) => o && o.ownerId),
  }, ['renovCairkanFinal', 'renovLabaSummary', 'renovClientFundState', 'renovSaldoRincian', 'renovFinalPanelHtml', 'renovItemBelumTerbayar', 'renovLedgerIssues', 'renovCairkanTahan', 'renovTitipanDitahan', 'renovTitipanDitahanTotal', 'renovPencairanLain', 'renovBagiHasilRows', 'renovSyncBagiHasilUtang']);
  return { D, p: D.renovProjects[0], r, created, flags };
}

const tahanOpt = { rekening: { 0: 'bri' }, tahan: { 1: true }, sumberAkunId: 'bri', kunci: 'k1' };
const bal = (D, id) => D.transactions.reduce((a, t) => a + (t.accountId !== id ? 0 : (t.type === 'income' || t.type === 'transfer_in' ? t.amount : (t.type === 'expense' || t.type === 'transfer_out' ? -t.amount : 0))), 0);

test('tahan: final berhasil tanpa rekening home in, tanpa transfer, BRI tidak berubah', () => {
  const { D, p, r, created } = setup();
  const before = bal(D, 'bri');
  const out = r.renovCairkanFinal(p, tahanOpt);
  assert.equal(out.ok, true, out.reason);
  assert.equal(created.length, 0);
  assert.equal(bal(D, 'bri'), before);
  const row = p.pencairanFinal.rows.find((x) => !x.isSelf);
  assert.equal(row.tahan, true); assert.equal(row.jumlah, 1563100); assert.equal(row.accountId, 'bri');
});

test('tahan: porsi home in tetap dana tertahan (1.563.100 + 304.482 = 1.867.582), bukan pencairan', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  assert.equal(r.renovPencairanLain(p), 0);
  assert.equal(r.renovClientFundState(p).danaTertahan, 1867582);
  assert.equal(r.renovTitipanDitahanTotal(p), 1563100);
  assert.equal(r.renovClientFundState(p).status, 'HIJAU');
});

test('tahan: rincian saldo = profit 0 (bukan 1.563.100), titipan 1.563.100, proyek tertahan total 1.867.582', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  const x = r.renovSaldoRincian();
  assert.equal(x.tertahan, 1867582); assert.equal(x.profit, 0); assert.equal(x.titipan, 1563100); assert.equal(x.proyek, 304482);
});

test('tahan: INVARIAN saldo pribadi naik tepat 800.000 (fisik - tertahan)', () => {
  const { D, p, r } = setup();
  const fisik = () => bal(D, 'bri') + 5000000; // saldo fisik fiktif konstan di luar BRI
  const pribadi = () => fisik() - r.renovClientFundState(p).danaTertahan;
  const sebelum = pribadi();
  // W menerima 800.000 sebagai pendapatan pribadi lewat pencairan SELF (sudah di BRI, bukan transfer) -> tertahan turun 800.000
  r.renovCairkanFinal(p, tahanOpt);
  assert.equal(pribadi() - sebelum, 800000);
});

test('tahan: utang bagi hasil home in tetap terbuka senilai 1.563.100 (satu-satunya representasi, tanpa hitung ganda)', () => {
  const { D, p, r } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  const u = D.debts.filter((d) => d.renovBagiProjectId === p.id && String(d.renovBagiOwnerId) === 'h1');
  assert.equal(u.length, 1); assert.equal(u[0].lunas, false); assert.equal(u[0].nilai, 1563100);
  r.renovSyncBagiHasilUtang(p); // idempoten (dipanggil saat boot)
  const u2 = D.debts.filter((d) => d.renovBagiProjectId === p.id && String(d.renovBagiOwnerId) === 'h1');
  assert.equal(u2.length, 1); assert.equal(u2[0].nilai, 1563100); assert.equal(u2[0].lunas, false);
});

test('tahan: "belum dicairkan" = 1.563.100 (hak mitra ditahan), tidak ada kelebihan pencairan', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  const sm = r.renovLabaSummary(p);
  assert.equal(sm.labaBelumDicairkan, 1563100); assert.equal(sm.kelebihanPencairan, false);
});

test('tahan: panel menampilkan "ditahan" + tombol cairkan titipan + sisa proyek 304.482 (tanpa titipan)', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  const html = r.renovFinalPanelHtml(p);
  assert.match(html, /ditahan di/); assert.match(html, /Renov\.openRilisTahan/); assert.match(html, /Titipan ditahan di rekening dana proyek/);
  assert.match(html, /tertahan Rp304482 untuk 3 item/);
});

test('tahan: data lama (tanpa tahan) tidak berubah - transfer biasa tetap jalan (S2902)', () => {
  const { p, r, created } = setup();
  const out = r.renovCairkanFinal(p, { rekening: { 0: 'bri', 1: 'hi' }, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, true, out.reason);
  assert.equal(created.length, 2);
  assert.equal(r.renovClientFundState(p).danaTertahan, 304482);
  assert.equal(p.pencairanFinal.rows.some((x) => x.tahan), false);
});

test('tahan: W tidak boleh ditahan (hanya pemilik lain); baris W tetap wajib rekening pribadi', () => {
  const { p, r } = setup();
  const out = r.renovCairkanFinal(p, { rekening: { 1: 'hi' }, tahan: { 0: true }, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, false);
});

test('rilis titipan: transfer BRI -> rekening home in, utang lunas, dana tertahan turun ke 304.482', () => {
  const { D, p, r, created } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  const out = r.renovCairkanTahan(p, { ownerId: 'h1', rekeningId: 'hi', tanggal: '2026-11-22' });
  assert.equal(out.ok, true, out.reason);
  assert.equal(created.length, 2);
  assert.equal(created.filter((t) => t.type === 'transfer_out' && t.accountId === 'bri' && t.amount === 1563100).length, 1);
  assert.equal(created.filter((t) => t.type === 'transfer_in' && t.accountId === 'hi' && t.amount === 1563100).length, 1);
  assert.equal(r.renovTitipanDitahanTotal(p), 0);
  assert.equal(r.renovClientFundState(p).danaTertahan, 304482);
  const u = D.debts.filter((d) => d.renovBagiProjectId === p.id && String(d.renovBagiOwnerId) === 'h1');
  assert.equal(u.every((d) => d.lunas === true), true);
  const sm = r.renovLabaSummary(p);
  assert.equal(sm.labaBelumDicairkan, 0); assert.equal(sm.kelebihanPencairan, false);
  assert.deepEqual({ ...r.renovSaldoRincian() }, { tertahan: 304482, profit: 0, proyek: 304482, titipan: 0 });
});

test('rilis titipan: rekening tujuan harus memuat home in & berbeda dari rekening dana proyek; tidak bisa dua kali', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  assert.equal(r.renovCairkanTahan(p, { ownerId: 'h1', rekeningId: 'bri' }).ok, false);
  assert.equal(r.renovCairkanTahan(p, { ownerId: 'h1', rekeningId: '' }).ok, false);
  assert.equal(r.renovCairkanTahan(p, { ownerId: 'h1', rekeningId: 'hi' }).ok, true);
  assert.equal(r.renovCairkanTahan(p, { ownerId: 'h1', rekeningId: 'hi' }).ok, false);
});

test('rilis titipan: gagal simpan -> rollback penuh (baris tahan kembali, utang terbuka, transfer dibatalkan)', () => {
  const { D, p, r, flags } = setup();
  r.renovCairkanFinal(p, tahanOpt);
  const nTx = D.transactions.length, rows = JSON.stringify(p.pencairanFinal.rows);
  flags.fail = true;
  const out = r.renovCairkanTahan(p, { ownerId: 'h1', rekeningId: 'hi' });
  assert.equal(out.ok, false);
  assert.equal(D.transactions.length, nTx);
  assert.equal(JSON.stringify(p.pencairanFinal.rows), rows);
  assert.equal(D.debts.filter((d) => d.renovBagiProjectId === p.id && String(d.renovBagiOwnerId) === 'h1').every((d) => d.lunas !== true), true);
  assert.equal(r.renovTitipanDitahanTotal(p), 1563100);
});

test('tahan: gagal simpan saat final -> rollback (tidak ada pencairanFinal, ledger kembali)', () => {
  const { p, r, flags } = setup();
  const lg = JSON.stringify(p.labaLedger);
  flags.fail = true;
  const out = r.renovCairkanFinal(p, tahanOpt);
  assert.equal(out.ok, false);
  assert.equal(p.pencairanFinal, undefined);
  assert.equal(JSON.stringify(p.labaLedger), lg);
});
