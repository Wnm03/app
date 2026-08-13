'use strict';
// tests/s514-dana-titipan-exact-principal-guard.test.js — Sesi 514
// (Exact Principal Regression Guard, lihat PROMPT-S514-...md).
//
// STATUS: S514 adalah sesi IMPLEMENTASI, tapi setelah baseline
// diverifikasi (v1245/s512, 3353/3353 test pass, 0 collision S514 di
// docs/RELEASE-GATE-LOG.md) & pipeline direproduksi PENUH pakai source
// ASLI (bukan re-implementasi logic di test) via loadSource harness:
//
//   "1.700.000.000" --safeCalc/normalizeAmtToken--> 1700000000
//     --saveCommitment--> D.titipanCommitments[].principalAmount === 1700000000
//     --build()--> o.principalAmount === 1700000000 (utuh, tidak disentuh
//       allocation/over-allocation/return)
//     --fmtFull--> "Rp 1.700.000.000"
//
// ...TIDAK ditemukan divergensi ke 1699999999 atau bentuk floating-error
// lain di baseline ini — ROOT CAUSE UNRESOLVED (tidak ada bug utk
// diperbaiki). Sesuai HARD RULE 15 (NO BUILD IF UNRESOLVED) & RULE 9 (NO
// CORE REFACTOR), 0 baris source diubah sesi ini. Test di bawah adalah
// REGRESSION GUARD murni: mengunci perilaku exact-integer yang SUDAH
// benar supaya sesi-sesi berikutnya (termasuk flow Owner->Nominal->
// Asset->Kuota->Porsi yang ditunda) tidak diam-diam merusaknya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- Group A: parser murni (kalkulator-input.js) — TIDAK menyentuh DOM,
// aman dipakai lewat loadSource sesuai batasan harness (lihat komentar
// loadSource.js).
function loadCalc() {
  return loadSource(['modules/shared/kalkulator-input.js'], {}, []);
}

// --- Group B: fmt/fmtFull murni (format-tema.js). fmt()/fmtFull() tidak
// baca DOM sama sekali (cuma Number/toLocaleString), jadi aman juga.
function loadFmt() {
  return loadSource(['modules/shared/format-tema.js'], { D: {}, save: () => {} }, []);
}

// --- Group C: DanaTitipanPortfolioAPI dgn fmtFull/fmt ASLI (bukan stub
// identity seperti test s484/s485x) — supaya render()/_money() sesi ini
// benar-benar lewat fmtFull production, bukan cuma String(n).
function makeCtx(D) {
  const calc = loadFmt();
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: calc.fmt,
      fmtFull: calc.fmtFull,
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

function baseD(investments) {
  return { investments, investmentTx: [], investmentWatchlist: [], debts: [], accounts: [], transactions: [] };
}

const RAW = '1.700.000.000';
const EXACT = 1700000000;
const WRONG_DECREMENT = 1699999999;

test('1. parse: normalizeAmtToken("1.700.000.000") -> "1700000000" (titik dibaca sbg ribuan, bukan desimal)', () => {
  const ctx = loadCalc();
  assert.equal(ctx.normalizeAmtToken(RAW), String(EXACT));
});

test('2. parse: safeCalc("1.700.000.000") -> 1700000000 (exact integer, bukan NaN/float error)', () => {
  const ctx = loadCalc();
  const r = ctx.safeCalc(RAW);
  assert.equal(r, EXACT);
  assert.notEqual(r, WRONG_DECREMENT);
  assert.ok(Number.isInteger(r), 'hasil safeCalc harus integer utuh, bukan float dgn sisa desimal');
});

test('3. saveCommitment(): principalAmount tersimpan exact 1700000000 (bukan 1699999999/float drift)', () => {
  const D = baseD([{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx = makeCtx(D);
  const calc = loadCalc();
  // pipeline penuh: string mentah -> safeCalc -> saveCommitment (persis alur
  // evalAmtExpr()/DanaTitipanCommitmentUI.save() di app, tanpa DOM)
  const parsed = calc.safeCalc(RAW);
  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: parsed, committedDate: '2026-01-01' });
  assert.equal(rec.principalAmount, EXACT);
  assert.equal(D.titipanCommitments[0].principalAmount, EXACT);
  assert.notEqual(D.titipanCommitments[0].principalAmount, WRONG_DECREMENT);
});

test('4. fmtFull(1700000000) -> "Rp 1.700.000.000" (titik ribuan lengkap, bukan disingkat/dibulatkan)', () => {
  const ctx = loadFmt();
  assert.equal(ctx.fmtFull(EXACT), 'Rp 1.700.000.000');
  assert.notEqual(ctx.fmtFull(EXACT), 'Rp 1.699.999.999');
});

test('5. round-trip penuh: raw string -> safeCalc -> saveCommitment -> build() -> fmtFull render, semua exact 1700000000', () => {
  const D = baseD([{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx = makeCtx(D);
  const calc = loadCalc();
  const fmtCtx = loadFmt();

  const parsed = calc.safeCalc(RAW);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: parsed });

  const p = ctx.DanaTitipanPortfolioAPI.build();
  const owner = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.principalAmount, EXACT);
  assert.equal(fmtCtx.fmtFull(owner.principalAmount), 'Rp 1.700.000.000');
});

test('6. RULE 6 (principal is SSOT): allocation (holdings) TIDAK PERNAH mengubah principalAmount, termasuk saat over-allocated', () => {
  // allocatedPrincipal (dari holding BBCA: 100*8000=800rb) jauh < principal
  // (1.7M) -> status OK, principal harus tetap utuh persis apa yg disimpan.
  const D1 = baseD([{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx1 = makeCtx(D1);
  ctx1.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: EXACT });
  const p1 = ctx1.DanaTitipanPortfolioAPI.build();
  const o1 = p1.owners.find((o) => o.ownerId === 'budi');
  assert.equal(o1.allocationStatus, 'OK');
  assert.equal(o1.principalAmount, EXACT);

  // allocatedPrincipal (100*8000=800rb) > principal (di-set sengaja kecil,
  // 500rb) -> OVER_ALLOCATED -> principalAmount TETAP tidak berubah, hanya
  // overAllocatedAmount yg berubah (field TERPISAH, bukan principalAmount).
  const D2 = baseD([{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx2 = makeCtx(D2);
  ctx2.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: 500000 });
  const p2 = ctx2.DanaTitipanPortfolioAPI.build();
  const o2 = p2.owners.find((o) => o.ownerId === 'budi');
  assert.equal(o2.allocationStatus, 'OVER_ALLOCATED');
  assert.equal(o2.principalAmount, 500000, 'principalAmount SSOT tidak boleh berubah walau over-allocated');
  assert.equal(o2.overAllocatedAmount, 800000 - 500000);
});

test('7. RULE 6: pengembalian (D.titipanReturns) TIDAK mengubah principalAmount, cuma outstandingPrincipal (derived, terpisah)', () => {
  const D = baseD([{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: EXACT });
  D.titipanReturns = [{ ownerId: 'budi', amount: 200000000 }];
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const owner = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(owner.principalAmount, EXACT, 'principalAmount tidak boleh dikurangi returnedTotal');
  assert.equal(owner.outstandingPrincipal, EXACT - 200000000);
});

test('8. no-decrement guard eksplisit: tidak ada satu pun titik di pipeline yang menghasilkan 1699999999', () => {
  const calc = loadCalc();
  const fmtCtx = loadFmt();
  const D = baseD([{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }]);
  const ctx = makeCtx(D);

  const parsed = calc.safeCalc(RAW);
  assert.notEqual(parsed, WRONG_DECREMENT);

  const rec = ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', principalAmount: parsed });
  assert.notEqual(rec.principalAmount, WRONG_DECREMENT);

  const p = ctx.DanaTitipanPortfolioAPI.build();
  const owner = p.owners.find((o) => o.ownerId === 'budi');
  assert.notEqual(owner.principalAmount, WRONG_DECREMENT);
  assert.notEqual(fmtCtx.fmtFull(owner.principalAmount), 'Rp 1.699.999.999');
});
