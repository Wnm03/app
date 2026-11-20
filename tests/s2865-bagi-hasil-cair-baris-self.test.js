'use strict';
/** S2865 — "Sudah Dicairkan" panel bagi hasil: ledger = pendapatan pribadi (baris isSelf), bukan dibagi porsi. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);

function load(D) {
  return loadSource(['modules/home/renovasi.js'], {
    D, sameId, todayStr: () => '2026-11-20', uid: () => 'u' + Math.random().toString(36).slice(2), save: () => true, toast() {},
    escapeHtml: String, fmt: (n) => 'Rp' + Math.round(n), fmtFull: String, document: { getElementById: () => null }, totalSaldoAkun: () => 0,
  }, ['renovBagiHasilRows', 'renovLabaSummary']);
}
function proyek(extra) {
  return Object.assign({
    id: 'p1', name: 'W', dana: 'klien', rab: 1000, status: 'selesai', atestasi: { semuaBiayaTercatat: true }, items: [],
    labaLedger: [{ id: 'a1', tipe: 'akui', jumlah: 800, tanggal: '2026-11-20' }, { id: 'c1', tipe: 'cairkan', jumlah: 800, tanggal: '2026-11-20' }],
    bagiHasil: { labaManual: 2000, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 40, isSelf: true }, { ownerId: 'x', ownerName: 'Mitra', porsi: 60, isSelf: false }] },
  }, extra || {});
}
// Ledger diisi langsung: ringkasan memakai renovLedgerSums dari proyek ini.

test('baris isSelf: cair = total ledger, belum = nominal - cair; penerima lain null', () => {
  const p = proyek();
  const r = load({ renovProjects: [p], accounts: [], transactions: [], piutang: [], profile: {} });
  const out = r.renovBagiHasilRows(p);
  const w = out.rows[0], m = out.rows[1];
  assert.equal(w.nominal, 800);
  assert.equal(w.dicairkan, 800);
  assert.equal(w.belum, 0);
  assert.equal(m.nominal, 1200);
  assert.equal(m.dicairkan, null);
  assert.equal(m.belum, null);
});

test('baris isSelf: pencairan sebagian -> belum = sisa nominal', () => {
  const p = proyek({ labaLedger: [{ id: 'a1', tipe: 'akui', jumlah: 800, tanggal: '2026-11-20' }, { id: 'c1', tipe: 'cairkan', jumlah: 300, tanggal: '2026-11-20' }] });
  const r = load({ renovProjects: [p], accounts: [], transactions: [], piutang: [], profile: {} });
  const w = r.renovBagiHasilRows(p).rows[0];
  assert.equal(w.dicairkan, 300);
  assert.equal(w.belum, 500);
});

test('pencairan melebihi nominal W -> belum tidak negatif', () => {
  const p = proyek({ labaLedger: [{ id: 'a1', tipe: 'akui', jumlah: 900, tanggal: '2026-11-20' }, { id: 'c1', tipe: 'cairkan', jumlah: 900, tanggal: '2026-11-20' }] });
  const r = load({ renovProjects: [p], accounts: [], transactions: [], piutang: [], profile: {} });
  const w = r.renovBagiHasilRows(p).rows[0];
  assert.equal(w.dicairkan, 900);
  assert.equal(w.belum, 0);
});

test('tanpa baris isSelf: perilaku lama (proporsional, tidak null)', () => {
  const p = proyek({ bagiHasil: { labaManual: 2000, owners: [{ ownerName: 'A', porsi: 50 }, { ownerName: 'B', porsi: 50 }] } });
  const r = load({ renovProjects: [p], accounts: [], transactions: [], piutang: [], profile: {} });
  const rows = r.renovBagiHasilRows(p).rows;
  assert.equal(rows[0].dicairkan, 400);
  assert.equal(rows[1].dicairkan, 400);
  assert.notEqual(rows[0].belum, null);
});

test('proyek non-klien dengan isSelf: tetap 0 (bukan null/ledger)', () => {
  const p = proyek({ dana: 'pribadi' });
  const r = load({ renovProjects: [p], accounts: [], transactions: [], piutang: [], profile: {} });
  const w = r.renovBagiHasilRows(p).rows[0];
  assert.equal(w.dicairkan, 0);
  assert.equal(w.belum, 0);
});

test('sumber: panel & CSV menangani null (tampil —, kosong)', () => {
  const src = fs.readFileSync('modules/home/renovasi.js', 'utf8');
  assert.match(src, /r\.dicairkan==null\?'—'/);
  assert.match(src, /r\.dicairkan==null\?'':r\.dicairkan/);
});
