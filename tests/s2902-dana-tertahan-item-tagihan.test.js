'use strict';
/**
 * S2902 — dana tertahan setelah pencairan final = biaya belum terbayar (3 item tagihan), BUKAN laba.
 * Kenapa: S2900/S2901 menghitung "belum dicairkan" = diakui - pencairan W saja, sehingga bagian pemilik lain (home in 1.563.100)
 * yang SUDAH dicairkan lewat pencairan final masih terhitung "laba belum dicairkan" -> sisa dana tertahan Rp 304.482 salah berlabel profit.
 * Juga: alasan status KUNING kini menyebut item + penyebab (ditanggung pemilik lain / rekening berporsi mitra) supaya kekacauan S2860 tak terulang.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);

function setup(opts) {
  opts = opts || {};
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
    D, sameId, todayStr: () => '2026-11-21', uid: () => 'u' + (++n), save: () => true, toast() {},
    escapeHtml: String, fmt: (x) => 'Rp' + Math.round(x), fmtFull: String, document: { getElementById: () => null }, totalSaldoAkun: () => 0, FinanceTxSOT,
    renovAccountOwners: (id) => ((D.accounts.find((x) => x.id === id) || {}).owners || []).filter((o) => o && o.ownerId),
  }, ['renovCairkanFinal', 'renovLabaSummary', 'renovClientFundState', 'renovSaldoRincian', 'renovFinalPanelHtml', 'renovItemBelumTerbayar', 'renovLedgerIssues']);
  return { D, p: D.renovProjects[0], r, created };
}
const rek = { 0: 'bri', 1: 'hi' };

test('sebelum final: dana tertahan = 2.667.582 dan laba belum dicairkan = laba diakui - pencairan', () => {
  const { p, r } = setup();
  const st = r.renovClientFundState(p);
  assert.equal(st.status, 'HIJAU');
  assert.equal(st.danaTertahan, 2667582);
});

test('setelah final: laba belum dicairkan = 0, tidak ada kelebihan pencairan', () => {
  const { p, r } = setup();
  const out = r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, true, out.reason);
  const sm = r.renovLabaSummary(p);
  assert.equal(sm.pencairanLain, 1563100);
  assert.equal(sm.labaBelumDicairkan, 0);
  assert.equal(sm.kelebihanPencairan, false);
});

test('setelah final: sisa dana tertahan 304.482 = DANA PROYEK (biaya belum terbayar), bukan profit', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(r.renovClientFundState(p).danaTertahan, 304482);
  const x = r.renovSaldoRincian();
  assert.deepEqual({ ...x }, { tertahan: 304482, profit: 0, proyek: 304482, titipan: 0 }); // S2903: field titipan ditambahkan (0 bila tidak ada porsi ditahan)
});

test('item belum terbayar = 3 item tagihan senilai 304.482', () => {
  const { p, r } = setup();
  const l = r.renovItemBelumTerbayar(p);
  assert.equal(l.length, 3);
  assert.equal(l.reduce((a, x) => a + x.sisa, 0), 304482);
  assert.ok(l.every((x) => x.tagihan));
});

test('panel final menyebut 3 item belum terbayar', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  const html = r.renovFinalPanelHtml(p);
  assert.match(html, /3 item biaya belum terbayar/);
  assert.match(html, /Rp304482/);
});

test('membayar 3 tagihan dari rekening dana proyek menghabiskan dana tertahan (0)', () => {
  const { D, p, r } = setup();
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  [['i1', 212000], ['i2', 52078], ['i3', 40404]].forEach(([id, amt], i) => {
    D.transactions.push({ id: 'bay' + i, type: 'expense', amount: amt, accountId: 'bri', date: '2026-11-22', renovProjectLinkId: 'p1' });
    p.items.find((x) => x.id === id).payments.push({ id: 'pp' + i, txId: 'bay' + i, amount: amt, sumberDana: 'proyek' });
  });
  const st = r.renovClientFundState(p);
  assert.equal(st.status, 'HIJAU');
  assert.equal(st.danaTertahan, 0);
  assert.equal(r.renovItemBelumTerbayar(p).length, 0);
});

test('penjaga: biaya bertanda "ditanggung home in" -> KUNING dengan alasan spesifik', () => {
  const { p, r } = setup({ txExtra: { deductionOwnerId: 'h1' } });
  const st = r.renovClientFundState(p);
  assert.equal(st.status, 'KUNING');
  assert.match(st.reason, /Bahan terbayar/);
  assert.match(st.reason, /ditanggung home in/);
  assert.match(st.reason, /Milik Sendiri/);
});

test('penjaga: rekening dana proyek memuat porsi home in -> KUNING, alasan menyuruh pindah lewat Pencairan Final', () => {
  const { p, r } = setup({ briOwners: [{ ownerId: 'SELF', porsi: 50, isSelf: true, ownerName: 'W' }, { ownerId: 'h1', porsi: 50, ownerName: 'home in' }] });
  const st = r.renovClientFundState(p);
  assert.equal(st.status, 'KUNING');
  assert.match(st.reason, /porsi home in/);
  assert.match(st.reason, /Pencairan Final/);
});

test('angka rupiah di ledger & rincian final tidak membungkus (nowrap) di layar sempit', () => {
  const { p, r } = setup();
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  const html = r.renovFinalPanelHtml(p);
  assert.match(html, /white-space:nowrap[^>]*>Rp1563100/);
});
