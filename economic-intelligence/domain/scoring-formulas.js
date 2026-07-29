// domain/scoring-formulas.js — Pure function rumus EES/PEHS/ERI.
//
// ATURAN DOMAIN LAYER: TIDAK ADA I/O di file ini. Semua fungsi murni
// menerima UserFinanceSnapshot/MacroSnapshot dan mengembalikan angka —
// 100% unit-testable tanpa mock browser API/IndexedDB.
//
// Fase 1 (MVP): ERI disederhanakan jadi rule-based dari changePct macro
// (bukan z-score volatilitas histori 12 bulan — itu §7 versi penuh, butuh
// macroHistory yg baru mulai terkumpul mulai sekarang). Upgrade ke statistik
// penuh tinggal ganti isi eriSubScore* di sini, interface tidak berubah.

function clamp(n, min, max) {
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------
// 1. Economic Exposure Score (EES) — §5
// ---------------------------------------------------------------------
const EES_WEIGHTS = {
  debtExposure: 0.25,
  fxExposure: 0.20,
  marketExposure: 0.20,
  bufferInverse: 0.20,
  incomeStabilityRisk: 0.10,
  commodityExposure: 0.05,
};

function calcEES(user) {
  const debtExposure = clamp(
    (user.debtToIncomeRatio * 100 * 0.6) +
    ((user.floatingRateDebtRatio || 0) * 100 * 0.4),
    0, 100
  );
  const fxExposure = clamp((user.importDependencyRatio || 0) * 100, 0, 100);
  const totalAsset = (user.savingsTotal || 0) + (user.investmentTotal || 0);
  const volatileAsset = ((user.investmentBreakdown && (
    (user.investmentBreakdown.saham || 0) +
    (user.investmentBreakdown.reksadana || 0) +
    (user.investmentBreakdown.crypto || 0)
  )) || 0);
  const marketExposure = totalAsset > 0 ? clamp((volatileAsset / totalAsset) * 100, 0, 100) : 0;
  const bufferInverse = clamp(100 - ((user.emergencyFundMonths || 0) / 6 * 100), 0, 100);
  const incomeStabilityRisk = clamp(100 - (user.incomeStabilityScore || 0), 0, 100);
  // Belum ada sumber data usaha/Shop bahan baku impor yg terverifikasi di fase 1 -> default 0.
  const commodityExposure = clamp(user.commodityImportRatio ? user.commodityImportRatio * 100 : 0, 0, 100);

  const breakdown = { debtExposure, fxExposure, marketExposure, bufferInverse, incomeStabilityRisk, commodityExposure };
  const score = clamp(
    EES_WEIGHTS.debtExposure * debtExposure +
    EES_WEIGHTS.fxExposure * fxExposure +
    EES_WEIGHTS.marketExposure * marketExposure +
    EES_WEIGHTS.bufferInverse * bufferInverse +
    EES_WEIGHTS.incomeStabilityRisk * incomeStabilityRisk +
    EES_WEIGHTS.commodityExposure * commodityExposure,
    0, 100
  );
  return { score: Math.round(score * 10) / 10, breakdown };
}

// ---------------------------------------------------------------------
// 2. Personal Economic Health Score (PEHS) — §6
// ---------------------------------------------------------------------
const PEHS_WEIGHTS = {
  savingsRate: 0.20,
  emergencyFund: 0.20,
  debtHealth: 0.20,
  cashflow: 0.15,
  netWorthTrend: 0.15,
  goalProgress: 0.10,
};

function calcPEHS(user) {
  const savingsMonthly = clamp(user.cashflowNet || 0, 0, Infinity);
  const savingsRateScore = user.incomeMonthly > 0
    ? clamp((savingsMonthly / user.incomeMonthly) * 100 / 20 * 100, 0, 100)
    : 0;
  const emergencyFundScore = clamp((user.emergencyFundMonths || 0) / 6 * 100, 0, 100);
  const debtHealthScore = clamp(100 - (user.debtToIncomeRatio || 0) * 100 / 40 * 100, 0, 100);
  const cashflowScore = user.cashflowNet > 0
    ? 100
    : (user.expenseMonthly > 0 ? clamp(100 + (user.cashflowNet / user.expenseMonthly * 100), 0, 100) : 50);
  // netWorthTrend & goalProgress butuh histori/goals -> fase 1 pakai default netral (50)
  // kalau data belum tersedia dari adapter, supaya tidak menjatuhkan skor scr tidak adil.
  const netWorthTrendScore = typeof user.netWorthTrendScore === 'number' ? clamp(user.netWorthTrendScore, 0, 100) : 50;
  const goalProgressScore = typeof user.goalProgressScore === 'number' ? clamp(user.goalProgressScore, 0, 100) : 50;

  const breakdown = { savingsRateScore, emergencyFundScore, debtHealthScore, cashflowScore, netWorthTrendScore, goalProgressScore };
  const score = clamp(
    PEHS_WEIGHTS.savingsRate * savingsRateScore +
    PEHS_WEIGHTS.emergencyFund * emergencyFundScore +
    PEHS_WEIGHTS.debtHealth * debtHealthScore +
    PEHS_WEIGHTS.cashflow * cashflowScore +
    PEHS_WEIGHTS.netWorthTrend * netWorthTrendScore +
    PEHS_WEIGHTS.goalProgress * goalProgressScore,
    0, 100
  );
  return { score: Math.round(score * 10) / 10, breakdown };
}

// ---------------------------------------------------------------------
// 3. Economic Risk Index (ERI) — §7 (disederhanakan fase 1, rule-based
//    dari |changePct| tiap indikator, belum z-score histori 12 bulan)
// ---------------------------------------------------------------------
function _magnitudeScore(changePct, sensitivity) {
  // sensitivity = berapa % perubahan yang dianggap "ekstrem" (skor 100)
  if (typeof changePct !== 'number' || !isFinite(changePct)) return 0;
  return clamp((Math.abs(changePct) / sensitivity) * 100, 0, 100);
}

function calcERI(macro) {
  const fx = _magnitudeScore(macro.usdidr && macro.usdidr.changePct, 8);
  const inflasi = _magnitudeScore(macro.inflasi && macro.inflasi.changePct, 25);
  const rate = _magnitudeScore(macro.bi_rate && macro.bi_rate.changePct, 15);
  const market = _magnitudeScore(macro.ihsg && macro.ihsg.changePct, 12);
  const energy = _magnitudeScore(macro.bbm && macro.bbm.changePct, 15);
  const commodity = _magnitudeScore(macro.emas && macro.emas.changePct, 10);

  const breakdown = {
    fxVolatilityScore: fx, inflationTrendScore: inflasi, rateTrendScore: rate,
    marketVolatilityScore: market, energyPriceScore: energy, commodityVolatilityScore: commodity,
  };
  const score = clamp(
    0.20 * fx + 0.20 * inflasi + 0.15 * rate + 0.20 * market + 0.15 * energy + 0.10 * commodity,
    0, 100
  );
  return { score: Math.round(score * 10) / 10, breakdown };
}
