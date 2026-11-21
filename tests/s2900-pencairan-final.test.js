'use strict';
/** S2900 — pencairan laba FINAL sekali: laba = penerimaan - biaya; bagi per pemilik; masuk rekening masing-masing. */
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
      { id: 'bri', name: 'BRI', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] },
      { id: 'cash', name: 'Cash', owners: [{ ownerId: 'SELF', porsi: 100, isSelf: true }] },
      { id: 'hi', name: 'Rek home in', ownership: 'h1', owners: [{ ownerId: 'h1', porsi: 100 }] },
    ],
    transactions: [
      { id: 'dp1', type: 'income', amount: 7000000, accountId: 'bri', date: '2026-11-14', renovDpProjectId: 'p1' },
      { id: 'e1', type: 'expense', amount: 4332418, accountId: 'bri', date: '2026-11-15' },
    ],
    renovProjects: [{
      id: 'p1', name: 'wallpanel', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true },
      items: [
        { harga: 4332418, payments: [{ txId: 'e1', amount: 4332418, sumberDana: 'proyek' }] },
        { harga: 304482 },
      ],
      labaLedger: opts.ledger || [],
      bagiHasil: { labaManual: null, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 40, isSelf: true }, { ownerId: 'h1', ownerName: 'home in', porsi: 60, isSelf: false }] },
    }],
  };
  let n = 0;
  const FinanceTxSOT = { createMany(rows) { rows.forEach((r) => { D.transactions.push(r); created.push(r); }); }, removeById(id) { D.transactions = D.transactions.filter((t) => t.id !== id); } };
  const r = loadSource(['modules/home/renovasi.js'], {
    D, sameId, todayStr: () => '2026-11-21', uid: () => 'u' + (++n), save: opts.save || (() => true), toast() {},
    escapeHtml: String, fmt: (x) => 'Rp' + Math.round(x), fmtFull: String, document: { getElementById: () => null }, totalSaldoAkun: () => 0, FinanceTxSOT,
    renovAccountOwners: (id) => ((D.accounts.find((x) => x.id === id) || {}).owners || []).filter((o) => o && o.ownerId),
  }, ['renovCairkanFinal', 'renovLabaFinalHitung', 'renovLabaSummary', 'renovClientFundState', 'renovLabaPanelHtml', 'renovBagiHasilRows', 'renovAkuiLaba', 'renovCairkanLaba', 'renovBatalCairkan', 'renovPencairanIncome']);
  return { D, p: D.renovProjects[0], r, created };
}
const rek = { 0: 'cash', 1: 'hi' };

test('laba = penerimaan - SEMUA biaya (termasuk item belum terbayar)', () => {
  const { p, r } = setup();
  const h = r.renovLabaFinalHitung(p);
  assert.equal(h.penerimaan, 7000000);
  assert.equal(h.biaya, 4636900);
  assert.equal(h.laba, 2363100);
});

test('cairkan final: bagi per porsi, masuk rekening masing-masing, transfer dibuat, utang pemilik lunas', () => {
  const { D, p, r, created } = setup();
  const out = r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, true, out.reason);
  const f = p.pencairanFinal;
  assert.equal(f.laba, 2363100);
  assert.deepEqual(f.rows.map((x) => x.jumlah), [945240, 1417860]);
  assert.deepEqual(f.rows.map((x) => x.accountId), ['cash', 'hi']);
  // transfer BRI->cash (W) dan BRI->rek home in
  assert.equal(created.length, 4);
  assert.equal(created.filter((t) => t.type === 'transfer_out' && t.accountId === 'bri').length, 2);
  assert.equal(created.find((t) => t.type === 'transfer_in' && t.accountId === 'hi').amount, 1417860);
  // W = pendapatan pribadi lewat ledger; laba diakui = laba penuh
  const sm = r.renovLabaSummary(p);
  assert.equal(sm.labaDiakuiBersih, 2363100);
  assert.equal(sm.pencairanValid, 945240);
  assert.equal(r.renovPencairanIncome('2026-11-01', '2026-11-30'), 945240);
  // utang bagi hasil home in lunas
  const d = D.debts.filter((x) => x.renovBagiProjectId === 'p1');
  assert.equal(d.length, 1);
  assert.equal(d[0].lunas, true);
  assert.equal(d[0].nilai, 1417860);
  // dana tertahan tinggal sisa biaya belum terbayar
  assert.equal(r.renovClientFundState(p).danaTertahan, 304482);
});

test('hanya SEKALI: pencairan kedua & aksi ledger lama ditolak', () => {
  const { p, r } = setup();
  assert.equal(r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' }).ok, true);
  const again = r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k2' });
  assert.equal(again.ok, false);
  assert.match(again.reason, /sekali/);
  assert.equal(r.renovAkuiLaba(p, 1000, { kunci: 'x' }).ok, false);
  assert.equal(r.renovCairkanLaba(p, 1000, { kunci: 'y' }).ok, false);
  assert.equal(r.renovBatalCairkan(p, 'apa', { kunci: 'z' }).ok, false);
});

test('laba yang sudah diakui sebagian (800.000) tidak dibatalkan: hanya selisih ditambah', () => {
  const { p, r } = setup({ ledger: [{ id: 'a1', kunci: 'a', tipe: 'akui', jumlah: 800000, tanggal: '2026-11-21' }] });
  const out = r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, true, out.reason);
  const akui = p.labaLedger.filter((e) => e.tipe === 'akui').map((e) => e.jumlah);
  assert.deepEqual(akui, [800000, 1563100]);
  assert.equal(r.renovLabaSummary(p).labaDiakuiBersih, 2363100);
});

test('rekening pemilik lain wajib memuat porsi pemilik itu; rekening W wajib pribadi', () => {
  const { p, r } = setup();
  const a = r.renovCairkanFinal(p, { rekening: { 0: 'cash', 1: 'cash' }, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(a.ok, false);
  assert.match(a.reason, /home in/);
  const b = r.renovCairkanFinal(p, { rekening: { 0: 'hi', 1: 'hi' }, sumberAkunId: 'bri', kunci: 'k2' });
  assert.equal(b.ok, false);
  assert.equal(p.pencairanFinal, undefined);
});

test('rekening W = rekening sumber: tidak ada transfer untuk bagian W', () => {
  const { p, r, created } = setup();
  const out = r.renovCairkanFinal(p, { rekening: { 0: 'bri', 1: 'hi' }, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, true, out.reason);
  assert.equal(created.length, 2);
});

test('total porsi bukan 100% ditolak; syarat selesai+atestasi wajib', () => {
  const s1 = setup();
  s1.p.bagiHasil.owners[0].porsi = 30;
  assert.equal(s1.r.renovCairkanFinal(s1.p, { rekening: rek, sumberAkunId: 'bri' }).ok, false);
  const s2 = setup();
  s2.p.status = 'aktif';
  assert.equal(s2.r.renovCairkanFinal(s2.p, { rekening: rek, sumberAkunId: 'bri' }).ok, false);
});

test('simpan gagal -> semua dikembalikan (ledger, utang, transfer, kunci)', () => {
  const { D, p, r, created } = setup({ save: () => false });
  const out = r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(out.ok, false);
  assert.equal(p.pencairanFinal, undefined);
  assert.equal(p.labaLedger.length, 0);
  assert.equal(D.debts.length, 0);
  assert.equal(D.transactions.filter((t) => /^transfer/.test(t.type)).length, 0);
  assert.ok(created.length > 0);
});

test('kunci idempoten: kunci sama setelah sukses tidak menggandakan', () => {
  const { p, r, created } = setup();
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  const n = created.length;
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  assert.equal(created.length, n);
});

test('panel: tombol "Cairkan laba (sekali)" sebelum final; setelah final tanpa tombol aksi & tampil rincian per pemilik', () => {
  const { p, r } = setup();
  let html = r.renovLabaPanelHtml(p);
  assert.match(html, /Renov\.openPencairanFinal/);
  assert.doesNotMatch(html, /Renov\.openLabaAksi[^>]*akui/);
  r.renovCairkanFinal(p, { rekening: rek, sumberAkunId: 'bri', kunci: 'k1' });
  html = r.renovLabaPanelHtml(p);
  assert.doesNotMatch(html, /openPencairanFinal/);
  assert.doesNotMatch(html, /batalCairkan/);
  assert.match(html, /Laba dicairkan final/);
  assert.match(html, /home in/);
  const rows = r.renovBagiHasilRows(p).rows;
  assert.equal(rows[1].dicairkan, 1417860);
  assert.equal(rows[1].belum, 0);
});
