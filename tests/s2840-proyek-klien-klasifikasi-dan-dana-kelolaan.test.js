'use strict';
// S2840 — audit Proyek -> Dana Titipan/Dana Kelolaan/Kepemilikan.
// (1) klasifikasi klien->pribadi tak boleh membuat DP hilang dari pembukuan; (2) dana klien tertahan tampil di Dana Kelolaan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const TODAY = '2026-11-10';
function mkRenov(dana, withDp = true) {
  const p = { id: 'p1', name: 'R', klien: 'B', dana, rab: 200, status: 'aktif', items: [] };
  const D = { renovProjects: [p], accounts: [{ id: 'a1', ownership: 'SELF', includeInBalance: true }], piutang: [],
    transactions: withDp ? [{ id: 'dp', type: 'income', amount: 200, accountId: 'a1', date: TODAY, renovDpProjectId: 'p1' }] : [] };
  const r = loadSource(['modules/home/renovasi.js'], { D, sameId: (a, b) => String(a) === String(b), todayStr: () => TODAY, uid: () => 'u', save: () => true, totalSaldoAkun: () => 200, renovAccountOwners: () => [{ ownerId: 'SELF', porsi: 100 }] }, ['Renov']);
  return { p, D, r };
}
test('klien -> pribadi DITOLAK bila sudah ada DP; klasifikasi & dana tertahan tidak berubah', () => {
  const { p, D, r } = mkRenov('klien');
  const res = r.renovClassifyProject(p, 'pribadi', 't');
  assert.equal(res.ok, false);
  assert.equal(p.dana, 'klien');
  assert.equal(r.renovDanaTertahan(p), 200);
  assert.equal(r.isAliranKlien(D.transactions[0]), true);
});
test('klien -> pribadi tetap boleh bila belum ada DP/refund', () => {
  const { p, r } = mkRenov('klien', false);
  assert.equal(r.renovClassifyProject(p, 'pribadi', 't').ok, true);
  assert.equal(p.dana, 'pribadi');
});
test('data lama sudah terlanjur pribadi: DP tidak lagi disembunyikan dari pemasukan (konsisten dgn dana tertahan 0)', () => {
  const { p, D, r } = mkRenov('pribadi');
  assert.equal(r.renovDanaTertahan(p), 0);
  assert.equal(r.isAliranKlien(D.transactions[0]), false);
});
test('DP proyek yatim (proyek tak ada) tetap dianggap aliran klien', () => {
  const { D, r } = mkRenov('klien');
  D.renovProjects.length = 0;
  assert.equal(r.isAliranKlien(D.transactions[0]), true);
});
function mkKelolaan(projects, tertahanFn, extra = {}) {
  return loadSource(['modules/finance/dana-kelolaan.js'], Object.assign({ D: { renovProjects: projects, accounts: [], assets: [], cobek: [], piutang: [], debts: [] }, renovDanaTertahanUntukKelolaan: tertahanFn }, extra), ['DanaKelolaan']);
}
test('Dana Kelolaan: dana klien proyek masuk summary & total tanpa mengubah komponen lain', () => {
  const ctx = mkKelolaan([{ id: 'p1', dana: 'klien' }, { id: 'p2', dana: 'pribadi' }, { id: 'p3', dana: 'klien' }], (p) => (p.id === 'p1' ? 800 : p.id === 'p3' ? 200 : 999));
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.danaProyekKlien, 1000);
  assert.equal(s.total, 1000);
});
test('Dana Kelolaan: tanpa proyek klien = 0 dan tak memuat mesin; mesin belum dimuat = 0 + minta muat', () => {
  let asked = 0;
  const a = mkKelolaan([{ id: 'p', dana: 'pribadi' }], () => 5, { ensureKlienEngineSafe: () => { asked++; } });
  assert.equal(a.DanaKelolaan.summary().danaProyekKlien, 0);
  assert.equal(asked, 0);
  const b = mkKelolaan([{ id: 'p', dana: 'klien' }], undefined, { renovDanaTertahanUntukKelolaan: undefined, ensureKlienEngineSafe: () => { asked++; } });
  assert.equal(b.DanaKelolaan.summary().danaProyekKlien, 0);
  assert.equal(asked, 1);
});
