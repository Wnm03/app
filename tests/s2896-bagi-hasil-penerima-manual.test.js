'use strict';
/** S2896 — penerima bagi hasil ditambah manual (nama baru / dari registry), porsi % atau nominal, simpan, lalu utang tercatat. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const sameId = (a, b) => String(a) === String(b);

function setup(registry) {
  const p = { id: 'p1', name: 'wallpanel', klien: 'k', dana: 'klien', rab: 7000000, status: 'selesai', atestasi: { semuaBiayaTercatat: true }, labaLedger: [],
    items: [{ id: 'i1', harga: 4611900, paid: true, txId: 't1' }] };
  const D = { profile: { nama: 'W' }, renovProjects: [p], accounts: [{ id: 'bri', ownership: 'SELF', includeInBalance: true }], piutang: [], debts: [], ownerRegistry: registry || [],
    transactions: [
      { id: 'd1', type: 'income', amount: 7000000, accountId: 'bri', renovDpProjectId: 'p1', date: '2026-11-14' },
      { id: 't1', type: 'expense', amount: 4611900, accountId: 'bri', renovProjectLinkId: 'p1', renovItemLinkId: 'i1', deductionOwnerId: 'SELF', date: '2026-11-16' }] };
  let n = 0; const toasts = [];
  const c = loadSource(['modules/shared/owner-registry.js', 'modules/home/renovasi.js'], {
    D, sameId, todayStr: () => '2026-11-20', uid: () => 'u' + (++n), save: () => true, toast: (m) => toasts.push(m),
    escapeHtml: String, fmt: String, fmtFull: String, document: { getElementById: () => null }, totalSaldoAkun: () => 0, closeModal() {}, openModal() {},
  }, ['Renov', 'OwnerRegistry', 'renovAkuiLaba', 'renovCairkanLaba', 'renovHakSelf']);
  c.Renov.curId = 'p1'; c.Renov.renderFundPanel = () => {};
  return { c, D, p, toasts, R: Object.assign(c.Renov, { renovAkuiLaba: c.renovAkuiLaba, renovCairkanLaba: c.renovCairkanLaba, renovHakSelf: c.renovHakSelf }) };
}

test('tambah penerima manual: nama baru + porsi % -> tersimpan, terdaftar di registry, total 100%', () => {
  const { D, p, R, toasts } = setup();
  R.bhLabaInput('2388100');                       // draft belum ada -> no-op aman, tidak error
  R._bh = { pid: 'p1', labaManual: 2388100, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 100, isSelf: true, _touched: false }] };
  R.bhAdd(); assert.equal(R._bh.owners.length, 2);
  R.bhNameInput(1, 'Pak Budi');
  assert.equal(R._bh.owners[1].ownerId, '');       // belum ada di registry
  R.bhPorsiInput(1, '40');                         // 2 baris -> baris lain otomatis sisa
  assert.equal(R._bh.owners[0].porsi, 60);
  R.bhSave();
  assert.deepEqual(toasts.filter((m) => /⚠️/.test(m)), []);
  const b = p.bagiHasil.owners;
  assert.equal(b[1].ownerName, 'Pak Budi'); assert.equal(b[1].porsi, 40); assert.ok(b[1].ownerId, 'ownerId terisi');
  assert.ok(D.ownerRegistry.some((o) => o.name === 'Pak Budi' && String(o.id) === String(b[1].ownerId)));
});

test('tambah penerima manual dengan NOMINAL -> porsi dihitung dari laba; penerima 2: sisa', () => {
  const { p, R, toasts } = setup();
  R._bh = { pid: 'p1', labaManual: 2388100, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 100, isSelf: true, _touched: false }] };
  R.bhAdd(); R.bhNameInput(1, 'home in');
  R.bhNominalInput(1, '1.588.100'.replace(/\./g, ''));
  assert.ok(Math.abs(R._bh.owners[1].porsi - 66.5005653) < 1e-4);
  assert.ok(Math.abs(R._bh.owners[0].porsi - 33.4994347) < 1e-4);
  R.bhSave();
  assert.deepEqual(toasts.filter((m) => /⚠️/.test(m)), []);
  assert.equal(p.bagiHasil.owners[1].ownerName, 'home in');
  assert.ok(Math.abs(p.bagiHasil.owners[1].porsi - 66.5005653) < 1e-4);
});

test('3 penerima: porsi manual, total salah ditolak, nama kosong ditolak', () => {
  const { p, R, toasts } = setup();
  R._bh = { pid: 'p1', labaManual: 1000000, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 50, isSelf: true, _touched: true }] };
  R.bhAdd(); R.bhAdd();
  R.bhNameInput(1, 'A'); R.bhPorsiInput(1, '30'); R.bhPorsiInput(2, '10');
  R.bhSave();
  assert.ok(toasts.some((m) => /pas 100/.test(m)), 'total 90% ditolak');
  assert.equal(p.bagiHasil, undefined);
  R.bhPorsiInput(2, '20'); R.bhNameInput(2, '');
  R.bhSave();
  assert.ok(toasts.some((m) => /Nama penerima/.test(m)));
  R.bhNameInput(2, 'B'); R.bhSave();
  assert.equal(p.bagiHasil.owners.length, 3);
  assert.equal(p.bagiHasil.owners.reduce((s, o) => s + o.porsi, 0), 100);
});

test('nama sama dengan registry dipakai ulang (tidak dobel); alur penuh: simpan -> akui laba -> utang per penerima', () => {
  const { D, p, R } = setup([{ id: 'home1', name: 'home in' }]);
  R._bh = { pid: 'p1', labaManual: 2388100, owners: [{ ownerId: 'SELF', ownerName: 'W', porsi: 100, isSelf: true, _touched: false }] };
  R.bhAdd(); R.bhAdd();
  R.bhNameInput(1, 'HOME IN'); R.bhNameInput(2, 'Pak Budi');
  R.bhPorsiInput(0, '30'); R.bhPorsiInput(1, '50'); R.bhPorsiInput(2, '20');
  R.bhSave();
  assert.equal(p.bagiHasil.owners[1].ownerId, 'home1');
  assert.equal(D.ownerRegistry.filter((o) => o.name.toLowerCase() === 'home in').length, 1);
  assert.equal(R.renovAkuiLaba(p, 2388100, { kunci: 'k1' }).ok, true);
  const debts = D.debts.filter((d) => d.renovBagiProjectId === 'p1');
  assert.equal(debts.length, 2);
  assert.equal(debts.find((d) => d.linkedOwnerId === 'home1').nilai, 1194050);
  assert.equal(debts.find((d) => d.name === 'Pak Budi').nilai, 477620);
  assert.equal(R.renovHakSelf(p).hak, 716430);
  assert.equal(R.renovCairkanLaba(p, 716431, { kunci: 'c' }).ok, false);
  assert.equal(R.renovCairkanLaba(p, 716430, { kunci: 'c2' }).ok, true);
});
