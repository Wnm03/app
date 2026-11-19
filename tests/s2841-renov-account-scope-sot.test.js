'use strict';
// S2841 — audit temuan 3: aturan "akun dalam cakupan saldo pribadi" Proyek Renovasi harus 1 SOT dgn totalSaldoAkun()/OwnershipEngine,
// dan DP di akun di luar cakupan tidak boleh dikurangkan dari saldo pribadi / dihitung ganda di Dana Kelolaan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const TODAY = '2026-11-10';
function mk(acc, { total = 200, linked = false } = {}) {
  const p = { id: 'p1', name: 'R', klien: 'B', dana: 'klien', rab: 200, status: 'aktif', items: [] };
  const D = { renovProjects: [p], accounts: [Object.assign({ id: 'a1', includeInBalance: true }, acc)], piutang: [],
    transactions: [{ id: 'dp', type: 'income', amount: 200, accountId: 'a1', date: TODAY, renovDpProjectId: 'p1' }] };
  let ctx;
  const g = { D, sameId: (a, b) => String(a) === String(b), todayStr: () => TODAY, uid: () => 'u', save: () => true,
    totalSaldoAkun: () => total, renovAccountOwners: () => [{ ownerId: 'SELF', porsi: 100 }],
    isAccOwnershipSelf: (a) => ctx.OwnershipEngine.resolve(a).type === 'SELF',
    isAccLinkedToAsset: () => linked };
  ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/home/renovasi.js'], g, ['OwnershipEngine', 'Renov']);
  return { p, D, r: ctx };
}
test('ownership tak valid / berspasi dianggap SELF (sama dgn OwnershipEngine & totalSaldoAkun) -> akun eligible', () => {
  assert.equal(mk({ ownership: 'garbage' }).r.renovClientAccountEligible('a1'), true);
  assert.equal(mk({ ownership: ' self ' }).r.renovClientAccountEligible('a1'), true);
});
test('field legacy ownerType (tak dibaca engine) tidak lagi menolak akun', () => {
  assert.equal(mk({ ownerType: 'INVESTOR' }).r.renovClientAccountEligible('a1'), true);
});
test('ownership non-SELF valid, akun tertaut aset, includeInBalance=false tetap ditolak', () => {
  assert.equal(mk({ ownership: 'INVESTOR' }).r.renovClientAccountEligible('a1'), false);
  assert.equal(mk({ ownership: 'SELF' }, { linked: true }).r.renovClientAccountEligible('a1'), false);
  assert.equal(mk({ ownership: 'SELF', includeInBalance: false }).r.renovClientAccountEligible('a1'), false);
});
test('renovAccountScope memberi alasan yg jelas', () => {
  assert.equal(mk({ ownership: 'SELF' }).r.renovAccountScope('a1').ok, true);
  assert.match(mk({ ownership: 'INVESTOR' }).r.renovAccountScope('a1').reason, /SELF/);
  assert.match(mk({}, { linked: true }).r.renovAccountScope('a1').reason, /tertaut/);
  assert.equal(mk({}).r.renovAccountScope('zzz').ok, false);
});
test('DP di akun NON-SELF (sudah di Dana Kelolaan byType): saldo pribadi tidak dikurangi ganda, Dana Kelolaan tidak dobel', () => {
  const { p, r } = mk({ ownership: 'INVESTOR' }, { total: 0 });
  const st = r.renovClientFundState(p);
  assert.equal(st.status, 'KUNING');
  assert.equal(st.diLuarSaldo, 200); assert.equal(st.diNonSelf, 200);
  assert.equal(r.renovDanaTertahanDalamSaldo(p), 0);
  assert.equal(r.renovDanaTertahanUntukKelolaan(p), 0);
  assert.equal(r.saldoPribadi(), 0);
});
test('DP di akun includeInBalance=false: tidak dikurangi dari saldo pribadi, tetap tampil di Dana Kelolaan', () => {
  const { p, r } = mk({ ownership: 'SELF', includeInBalance: false }, { total: 0 });
  assert.equal(r.renovDanaTertahanDalamSaldo(p), 0);
  assert.equal(r.renovDanaTertahanUntukKelolaan(p), 200);
  assert.equal(r.saldoPribadi(), 0);
});
test('DP di akun TERTAUT aset: perilaku lama dipertahankan (dana klien ikut nilai Aset; pengurangan lewat saldo pribadi menjaga Kekayaan Bersih)', () => {
  const { p, r } = mk({ ownership: 'SELF' }, { total: 500, linked: true });
  const st = r.renovClientFundState(p);
  assert.equal(st.status, 'KUNING');
  assert.equal(st.diLuarSaldo, 0);
  assert.equal(r.renovDanaTertahanDalamSaldo(p), 200);
  assert.equal(r.renovDanaTertahanUntukKelolaan(p), 200);
  assert.equal(r.saldoPribadi(), 300);
});
test('DP di akun dalam cakupan: perilaku lama tidak berubah (tertahan 200, saldo pribadi = fisik - 200)', () => {
  const { p, r } = mk({ ownership: 'SELF' }, { total: 500 });
  assert.equal(r.renovClientFundState(p).status, 'HIJAU');
  assert.equal(r.renovDanaTertahanDalamSaldo(p), 200);
  assert.equal(r.renovDanaTertahan(p), 200);
  assert.equal(r.saldoPribadi(), 300);
});
test('Dana Kelolaan memakai dana tertahan UntukKelolaan', () => {
  const ctx = loadSource(['modules/finance/dana-kelolaan.js'], { D: { renovProjects: [{ id: 'p', dana: 'klien' }], accounts: [], assets: [], cobek: [], piutang: [], debts: [] },
    renovDanaTertahan: () => 200, renovDanaTertahanUntukKelolaan: () => 0 }, ['DanaKelolaan']);
  assert.equal(ctx.DanaKelolaan.summary().danaProyekKlien, 0);
});
