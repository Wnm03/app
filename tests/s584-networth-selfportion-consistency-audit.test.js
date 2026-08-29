'use strict';
// tests/s584-networth-selfportion-consistency-audit.test.js — Sesi 584,
// implementasi `docs/AUDIT-S583-NETWORTH-SELFPORTION-CONSISTENCY.md`.
//
// Audit S583 (murni verifikasi, 0 kode diubah) mengonfirmasi 5 fungsi
// agregat yang menyusun Net Worth (Aset.totalValue(), totalSaldoAkun(),
// Investment.zakatableValue()/selfOwnedTotalValue(), Piutang.totalValue(),
// Debt.totalValue()) SEMUANYA konsisten pakai 2 lapis filter (binary
// include/exclude + skala porsi) dan 0 titik dobel-hitung silang. Sesi ini
// MENGUNCI temuan itu jadi test otomatis satu file (SEBELUMNYA cuma
// diverifikasi manual baca source), supaya perubahan mendatang yang
// merusak invariant ini langsung ketahuan dari regression, bukan dari
// audit manual ulang. 0 logic produksi diubah — murni test baru.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const stub = { escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), save: () => {}, sameId: (a, b) => String(a) === String(b) };

function ctxAset(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'],
    { D, ...stub },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset'],
  );
}
function ctxAkun(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js'],
    { D, ...stub },
    ['OwnershipEngine', 'MultiOwnerEngine'],
  );
}
function ctxInvestasi(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js'],
    { D, ...stub, uid: () => 'u' + (D._n = (D._n || 0) + 1) },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Investment'],
  );
}
function ctxPiutangUtang(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/piutang-utang.js'],
    { D, ...stub },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Piutang', 'Debt'],
  );
}

// --- 1. Aset.totalValue() — binary filter + skala porsi -------------------
test('AUDIT-S583 §1 — Aset.totalValue(): non-SELF dikecualikan, multi-owner diskalakan, holding hasil migrasi dikecualikan', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Tanah Sendiri', nilai: 100000000 },
      { id: 'a2', name: 'Ruko Patungan', nilai: 200000000, owners: [{ ownerId: 'SELF', porsi: 50 }, { ownerId: 'budi', porsi: 50 }] },
      { id: 'a3', name: 'Emas Titipan', nilai: 30000000, ownership: 'CUSTOMER' },
      { id: 'a4', name: 'Migrasi ke Holding', nilai: 999999999, investmentId: 'inv1' },
    ],
    accounts: [], transactions: [],
  };
  const ctx = ctxAset(D);
  // 100jt (a1 penuh) + 100jt (50% dari a2) ; a3 non-SELF exclude, a4 exclude (investmentId)
  assert.equal(ctx.Aset.totalValue(), 200000000);
});

// --- 2. totalSaldoAkun() — akun tertaut aset SELALU dikecualikan penuh ----
test('AUDIT-S583 §2 — totalSaldoAkun(): akun tertaut aset dikecualikan penuh (anti dobel-hitung dgn Aset.totalValue())', () => {
  const D = {
    accounts: [
      { id: 'acc1', name: 'Kas', baseBalance: 5000000, includeInBalance: true },
      { id: 'acc2', name: 'Rek Tertaut Aset', baseBalance: 200000000, includeInBalance: true },
    ],
    assets: [{ id: 'a1', name: 'Ruko', nilai: 200000000, accountId: 'acc2', owners: [{ ownerId: 'SELF', porsi: 50 }, { ownerId: 'budi', porsi: 50 }] }],
    transactions: [],
  };
  const ctx = ctxAkun(D);
  // acc2 dikecualikan PENUH apa pun isi baseBalance-nya / status ownership aset yg menautkannya
  assert.equal(ctx.totalSaldoAkun(), 5000000);
});

// --- 3. Investment.zakatableValue()/selfOwnedTotalValue() -----------------
test('AUDIT-S583 §3 — Investment.selfOwnedTotalValue()/zakatableValue(): non-SELF dikecualikan, diskalakan per porsi', () => {
  const D = { investments: [], investmentTx: [], investmentWatchlist: [], debts: [] };
  const ctx = ctxInvestasi(D);
  D.investments.push(
    { id: 'h1', name: 'Reksadana Sendiri', unit: 1, avgPrice: 50000000, currentPrice: 50000000, zakatable: true },
    { id: 'h2', name: 'Saham Patungan', unit: 1, avgPrice: 100000000, currentPrice: 100000000, zakatable: true, owners: [{ ownerId: 'SELF', porsi: 40 }, { ownerId: 'budi', porsi: 60 }] },
    { id: 'h3', name: 'Emas Titipan Customer', unit: 1, avgPrice: 20000000, currentPrice: 20000000, zakatable: true, ownership: 'CUSTOMER' },
  );
  // 50jt (h1 penuh) + 40jt (40% dari h2) ; h3 non-SELF exclude
  assert.equal(ctx.Investment.selfOwnedTotalValue(), 90000000);
  assert.equal(ctx.Investment.zakatableValue(), 90000000);
});

// --- 4. Piutang.totalValue() — binary filter + skala via aset tertaut -----
test('AUDIT-S583 §4 — Piutang.totalValue(): non-SELF dikecualikan, piutang tertaut aset patungan diskalakan', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Aset Patungan', nilai: 10000000, owners: [{ ownerId: 'SELF', porsi: 70 }, { ownerId: 'budi', porsi: 30 }] }],
    piutang: [
      { id: 'p1', name: 'Piutang Biasa', nilai: 1000000, lunas: false },
      { id: 'p2', name: 'Piutang Terkait Aset Patungan', nilai: 2000000, lunas: false, assetId: 'a1' },
      { id: 'p3', name: 'Piutang Titipan Customer', nilai: 500000, lunas: false, ownership: 'CUSTOMER' },
      { id: 'p4', name: 'Piutang Lunas (exclude)', nilai: 900000, lunas: true },
    ],
    debts: [],
  };
  const ctx = ctxPiutangUtang(D);
  // 1jt (p1 penuh) + 1.4jt (70% dari p2) ; p3 non-SELF exclude, p4 lunas exclude
  assert.equal(ctx.Piutang.totalValue(), 2400000);
});

// --- 5. Debt.totalValue() — binary filter + skala + exclude linked -------
test('AUDIT-S583 §5 — Debt.totalValue(): non-SELF dikecualikan, diskalakan via aset tertaut, DAN exclude linkedAssetId/linkedInvestmentId (anti double-subtraction)', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Aset Patungan', nilai: 10000000, owners: [{ ownerId: 'SELF', porsi: 70 }, { ownerId: 'budi', porsi: 30 }] }],
    piutang: [],
    debts: [
      { id: 'd1', name: 'Utang Biasa', nilai: 3000000, lunas: false },
      { id: 'd2', name: 'Utang Terkait Aset Patungan', nilai: 4000000, lunas: false, assetId: 'a1' },
      { id: 'd3', name: 'Utang Titipan Customer', nilai: 1000000, lunas: false, ownership: 'CUSTOMER' },
      { id: 'd4', name: 'Auto-sync dari Aset Titipan (BUG-016)', nilai: 999999999, lunas: false, linkedAssetId: 'a1' },
      { id: 'd5', name: 'Auto-sync dari Holding Titipan', nilai: 999999999, lunas: false, linkedInvestmentId: 'h1' },
    ],
  };
  const ctx = ctxPiutangUtang(D);
  // 3jt (d1 penuh) + 2.8jt (70% dari d2) ; d3 non-SELF exclude, d4/d5 linked-auto-sync exclude
  assert.equal(ctx.Debt.totalValue(), 5800000);
});

// --- 6. Integrasi lintas-domain — 0 dobel-hitung di seluruh rantai --------
test('AUDIT-S583 §Integrasi — skenario gabungan 5 domain, dijumlah manual, 0 dobel-hitung', () => {
  const assetD = { id: 'as1', name: 'Ruko Patungan (tertaut akun + linked debt)', nilai: 100000000, accountId: 'accLinked', owners: [{ ownerId: 'SELF', porsi: 60 }, { ownerId: 'budi', porsi: 40 }] };

  const asetCtx = ctxAset({ assets: [assetD], accounts: [], transactions: [] });
  const akunCtx = ctxAkun({ accounts: [{ id: 'accKas', name: 'Kas', baseBalance: 5000000, includeInBalance: true }, { id: 'accLinked', name: 'Rek Tertaut', baseBalance: 100000000, includeInBalance: true }], assets: [assetD], transactions: [] });

  const aset = asetCtx.Aset.totalValue();       // 60% dari 100jt = 60jt
  const akun = akunCtx.totalSaldoAkun();        // hanya Kas 5jt (accLinked exclude penuh)
  assert.equal(aset, 60000000);
  assert.equal(akun, 5000000);

  const debtCtx = ctxPiutangUtang({
    assets: [assetD],
    piutang: [],
    debts: [
      { id: 'd1', name: 'Utang Pihak Ketiga', nilai: 10000000, lunas: false },
      { id: 'd2', name: 'Auto-sync titipan dari Ruko', nilai: 40000000, lunas: false, linkedAssetId: 'as1' },
    ],
  });
  const debt = debtCtx.Debt.totalValue();       // hanya 10jt (d2 exclude, sudah terwakili di porsi non-SELF Aset)
  assert.equal(debt, 10000000);

  // Net worth kontribusi domain ini: 60jt (Aset) + 5jt (Akun/Kas) − 10jt (Debt) = 55jt
  // Porsi 40% milik "budi" (40jt) TIDAK muncul di manapun -- 0 dobel-hitung, 0 kebocoran.
  assert.equal(aset + akun - debt, 55000000);
});
