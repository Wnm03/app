'use strict';
// tests/dana-kelolaan.test.js — cakupan Sesi 195 (Managed Funds / Dana
// Kelolaan). Reuse OwnershipEngine (Sesi 191) mengikuti pola PERSIS sesi
// sebelumnya (S192 akun/keuangan, S193 asset/investasi, S194 shop).
//
// Target: DanaKelolaan.summary()/byType()/sumAccounts()/sumAssets()/
// sumInvestasi()/sumShop() (modules/finance/dana-kelolaan.js) — murni
// menjumlahkan entity ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY
// (SELF sengaja TIDAK dijumlahkan di sini, itu tetap masuk Kas/Aset/Net
// Worth/Dashboard Keuangan/Insight Keuangan seperti biasa).
//
// RULE yang dites di sini:
//   - SELF (eksplisit atau default/tanpa field ownership) -> TIDAK masuk
//     Dana Kelolaan sama sekali.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> dijumlahkan PER TIPE, lintas
//     4 sumber (akun/aset/investasi/shop), TIDAK menghapus/memutasi data
//     asli.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    accounts: [
      { id: 'a1', name: 'Kas SELF', balance: 100000 }, // default SELF
      { id: 'a2', name: 'Kas Investor', balance: 500000, ownership: 'INVESTOR' },
      { id: 'a3', name: 'Kas Titipan', balance: 300000, ownership: 'third_party' },
    ],
    assets: [
      { id: 's1', nilai: 1000000 }, // default SELF
      { id: 's2', nilai: 2000000, ownership: 'CUSTOMER' },
      { id: 's3', nilai: 750000, ownership: 'FAMILY' },
    ],
    transactions: [],
    investments: [
      { id: 'i1', unit: 10, avgPrice: 1000, currentPrice: 1000 }, // SELF, value 10000
      { id: 'i2', unit: 5, avgPrice: 2000, currentPrice: 2000, ownership: 'INVESTOR' }, // value 10000
    ],
    investmentTx: [],
    investmentWatchlist: [],
    cobek: [
      { id: 1, date: '2026-07-01', total: 100000, profit: 20000 }, // SELF
      { id: 2, date: '2026-07-05', total: 400000, profit: 80000, ownership: 'CUSTOMER' },
    ],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js', 'modules/asset/investasi.js', 'modules/shop/cobek-order.js', 'modules/finance/dana-kelolaan.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      uid: () => 'x',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'DanaKelolaan', 'Investment', 'recalcAccBalance', 'totalSaldoAkun', 'Aset'],
  );
}

test('DanaKelolaan.sumAccounts() — HANYA akun ber-ownership tipe yang diminta, akun SELF dikecualikan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumAccounts('INVESTOR'), 500000);
  assert.equal(ctx.DanaKelolaan.sumAccounts('THIRD_PARTY'), 300000, 'lowercase "third_party" harus dinormalisasi via OwnershipEngine');
  assert.equal(ctx.DanaKelolaan.sumAccounts('CUSTOMER'), 0);
  assert.equal(ctx.DanaKelolaan.sumAccounts('FAMILY'), 0);
});

test('DanaKelolaan.sumAssets() — HANYA aset ber-ownership tipe yang diminta', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumAssets('CUSTOMER'), 2000000);
  assert.equal(ctx.DanaKelolaan.sumAssets('FAMILY'), 750000);
  assert.equal(ctx.DanaKelolaan.sumAssets('INVESTOR'), 0);
});

test('DanaKelolaan.sumInvestasi() — HANYA holding ber-ownership tipe yang diminta, pakai Investment.holdingValue() apa adanya', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumInvestasi('INVESTOR'), 10000);
  assert.equal(ctx.DanaKelolaan.sumInvestasi('CUSTOMER'), 0);
});

test('DanaKelolaan.sumShop() — HANYA transaksi Shop ber-ownership tipe yang diminta', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.sumShop('CUSTOMER'), 400000);
  assert.equal(ctx.DanaKelolaan.sumShop('INVESTOR'), 0);
});

test('DanaKelolaan.summary() — gabungan lintas 4 sumber per tipe + total, SELF tidak pernah ikut', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.investor, 500000 + 10000, 'Kas Investor + holding Investor');
  assert.equal(s.titipan, 300000, 'Kas Titipan (THIRD_PARTY)');
  assert.equal(s.dpCustomer, 2000000 + 400000, 'Aset Customer + transaksi Shop Customer');
  assert.equal(s.keluarga, 750000, 'Aset Keluarga (FAMILY)');
  assert.equal(s.total, s.investor + s.titipan + s.dpCustomer + s.keluarga + s.titipanAset);
});

test('DanaKelolaan.summary() — titipanAset: jumlah titipanAmount aset SELF, TERPISAH dari titipan (THIRD_PARTY whole-asset), tetap masuk total', () => {
  const D = makeD();
  D.assets.push({ id: 's4', nilai: 5000000, titipanAmount: 1700000 }); // SELF (default) + titipan sebagian
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanAset, 1700000);
  assert.equal(s.titipan, 300000, 'titipan (THIRD_PARTY whole-asset) tidak berubah, tidak tercampur dgn titipanAset');
  assert.equal(s.total, s.investor + s.titipan + s.dpCustomer + s.keluarga + s.titipanAset);
});

test('DanaKelolaan.summary() — titipanAset: Sesi D, baca via MultiOwnerEngine.selfPorsi() -- porsi majemuk `a.owners` (>1 baris non-SELF) ikut terhitung, bukan cuma titipanAmount tunggal', () => {
  const D = makeD();
  // aset SELF porsi majemuk: 60% SELF + 25% Budi + 15% Ayah (2 owner
  // non-SELF sekaligus -- kasus yang TIDAK BISA direpresentasikan
  // titipanAmount lama, cuma bisa lewat a.owners S390-392e).
  D.assets.push({
    id: 's6',
    nilai: 4000000,
    owners: [
      { ownerId: 'SELF', porsi: 60, ownerName: 'Milik Sendiri', isSelf: true },
      { ownerId: 'budi', porsi: 25, ownerName: 'Budi' },
      { ownerId: 'ayah', porsi: 15, ownerName: 'Ayah' },
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanAset, 4000000 * 0.4, 'porsi non-SELF (25%+15%) dari nilai aset, dijumlah lintas 2 owner sekaligus');
  assert.equal(s.total, s.investor + s.titipan + s.dpCustomer + s.keluarga + s.titipanAset);
});

test('DanaKelolaan.summary() — titipanAmount di aset NON-SELF tidak dijumlah dobel (sudah kehitung penuh via sumAssets)', () => {
  const D = makeD();
  D.assets.push({ id: 's5', nilai: 900000, ownership: 'THIRD_PARTY', titipanAmount: 900000 });
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanAset, 0, 'aset non-SELF dikecualikan dari sumTitipanAset(), sudah tercatat via titipan (THIRD_PARTY)');
  assert.equal(s.titipan, 300000 + 900000);
});

test('DanaKelolaan.summary() — titipanInvestasi (BUGFIX Sesi 458): jumlah holdingCost() holding fundSource=titipan (ownership SELF), TERPISAH dari titipan (THIRD_PARTY whole-holding), tetap masuk total', () => {
  const D = makeD();
  // holding SELF (default ownership) tapi fundSource='titipan' -- cost basis
  // (unit*avgPrice) = 20*50000 = 1000000, pola SAMA PERSIS
  // Investment._syncTitipanDebt() (investasi.js) yang catat angka ini ke
  // Buku Utang. SEBELUM Sesi 458 ini SAMA SEKALI TIDAK terhitung di
  // Dana Kelolaan.
  D.investments.push({ id: 'i3', unit: 20, avgPrice: 50000, currentPrice: 60000, fundSource: 'titipan', titipanOwner: 'Budi' });
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanInvestasi, 1000000);
  assert.equal(s.investor, 500000 + 10000, 'holding titipan SELF tidak tercampur ke investor');
  assert.equal(s.total, s.investor + s.titipan + s.dpCustomer + s.keluarga + s.titipanAset + s.titipanInvestasi);
});

test('DanaKelolaan.summary() — holding fundSource=titipan tapi ownership NON-SELF tidak dijumlah dobel (sudah kehitung penuh via sumInvestasi)', () => {
  const D = makeD();
  D.investments.push({ id: 'i4', unit: 10, avgPrice: 30000, currentPrice: 30000, ownership: 'THIRD_PARTY', fundSource: 'titipan', titipanOwner: 'Ayah' });
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanInvestasi, 0, 'holding non-SELF dikecualikan dari sumTitipanInvestasi(), sudah tercatat via titipan (THIRD_PARTY)');
  assert.equal(s.titipan, 300000 + 300000);
});

test('DanaKelolaan.sumTitipanInvestasi() — holding fundSource="sendiri" (default/eksplisit) TIDAK ikut dijumlahkan', () => {
  const D = makeD();
  D.investments.push({ id: 'i5', unit: 10, avgPrice: 10000, currentPrice: 10000, fundSource: 'sendiri' });
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.titipanInvestasi, 0);
});

test('DanaKelolaan.summary() — data SELF/default TIDAK ikut dijumlahkan sama sekali', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const s = ctx.DanaKelolaan.summary();
  // Kas SELF (100000), Aset SELF (1000000), holding SELF (10000), Shop SELF
  // (100000) semuanya TIDAK boleh nongol di angka manapun di summary().
  const total = s.investor + s.titipan + s.dpCustomer + s.keluarga;
  assert.ok(total < 100000 + 1000000 + 10000 + 100000 + s.total, 'sanity: total Dana Kelolaan jauh lebih kecil dari total SELUM+SELF kalau SELF ikut kehitung');
  assert.equal(s.investor, 510000);
});

test('D.accounts/D.assets/D.investments/D.cobek — tidak dihapus/dimutasi oleh DanaKelolaan.summary()', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.DanaKelolaan.summary();
  assert.equal(D.accounts.length, 3);
  assert.equal(D.assets.length, 3);
  assert.equal(D.investments.length, 2);
  assert.equal(D.cobek.length, 2);
});

test('DanaKelolaan — kalau OwnershipEngine tidak dimuat, fallback semua dianggap SELF (0 masuk Dana Kelolaan)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/finance/dana-kelolaan.js'],
    { D, uid: () => 'x' },
    ['DanaKelolaan'],
  );
  const s = ctx.DanaKelolaan.summary();
  assert.equal(s.total, 0, 'tanpa engine, tidak ada yang dianggap non-SELF — Dana Kelolaan kosong (aman, tidak error)');
});

test('DanaKelolaan.sumAccounts()/sumAssets() — aman (0) kalau D.accounts/D.assets kosong/tidak ada', () => {
  const D = { cobek: [] };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/dana-kelolaan.js'],
    { D },
    ['DanaKelolaan'],
  );
  assert.equal(ctx.DanaKelolaan.summary().total, 0);
});

// ------ Regresi: memastikan agregat SELF-only existing (S192-194) TIDAK
// terpengaruh oleh kehadiran DanaKelolaan.js (exclude list sesi ini: Kas/
// Aset/Net Worth/Dashboard Keuangan/Insight Keuangan). ------

test('Regresi — totalSaldoAkun() (akun.js, S192) tetap HANYA hitung akun SELF walau DanaKelolaan.js ikut dimuat', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // totalSaldoAkun() pakai recalcAccBalance() (butuh D.transactions) - akun
  // di makeD() tidak ditautkan transaksi apa pun, recalcAccBalance akan
  // fallback ke a.balance kalau tidak ada transaksi terkait (perilaku lama,
  // tidak diubah sesi ini) — cukup pastikan hanya akun SELF (a1) yang lolos.
  const total = ctx.totalSaldoAkun();
  assert.equal(total, ctx.recalcAccBalance('a1'), 'HANYA saldo akun SELF (a1) yang masuk total, a2/a3 (INVESTOR/THIRD_PARTY) tetap dikecualikan');
});

test('Regresi — Aset.totalValue() (aset.js, S193) tetap HANYA hitung aset SELF walau DanaKelolaan.js ikut dimuat', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // s476a (docs/s476-PLAN-migrate-investasi-to-holdings.md, Blocker A):
  // Investment holdings TIDAK lagi masuk lewat Aset.totalValue() sendiri
  // (supaya tidak dobel-hitung dgn AssetPortfolioAPI.investmentValue) --
  // ditambahkan 1 titik terpisah di Kekayaan.currentNetWorth()/renderBersih()
  // (modules-calc.js) lewat Investment.selfOwnedTotalValue(). Aset.totalValue()
  // sendiri tetap HANYA aset (s1), 0 perubahan.
  assert.equal(ctx.Aset.totalValue(), 1000000, 'HANYA aset SELF (s1) yang masuk total, s2/s3 (CUSTOMER/FAMILY) tetap dikecualikan');
});
