// adapters/user-finance-adapter.js — READ-ONLY. Menerjemahkan D.* (state
// finance existing app) jadi UserFinanceSnapshot (lihat domain/entities.js).
//
// ATURAN (sama seperti adapters/goal-adapter.js LifeOS): tidak menyimpan
// apa pun, dihitung ulang tiap dipanggil, TIDAK PERNAH memanggil D.save()
// atau save(). Kalau sumber data lama D.* belum terverifikasi bentuknya,
// field terkait sengaja diberi default netral (bukan ditebak).
//
// Sumber data yang dipakai (sudah diverifikasi di codebase existing):
// - D.accounts[].balance          -> savingsTotal
// - D.investments[] (unit*currentPrice, per `type`) -> investmentTotal/breakdown
// - D.debts[] (nilai, cicilanBulanan, bunga, lunas)  -> debtTotal/installment/DSR
// - D.targets[] (isDanaDarurat, saved, amount)       -> emergencyFundMonths
// - D.transactions[] (type, amount, date, category)  -> income/expense avg
// - WorthIt.incomeAvg() (worthit.js, guarded)        -> incomeMonthly (konsisten
//   dgn Skor Hidup Seimbang & FI yg sudah pakai fungsi yg sama)

const EIE_IMPORT_KEYWORDS = ['bbm', 'bensin', 'pertalite', 'pertamax', 'solar', 'impor'];

function _eieMonthsBack(n) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - n + 1, 1);
  return (D.transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d >= from && d <= now;
  });
}

function _eieExpenseMonthly(months) {
  const txs = _eieMonthsBack(months);
  const total = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  return months > 0 ? total / months : 0;
}

function _eieImportDependencyRatio(months) {
  const txs = _eieMonthsBack(months).filter((t) => t.type === 'expense');
  const totalExpense = txs.reduce((s, t) => s + (t.amount || 0), 0);
  if (totalExpense <= 0) return 0;
  const importExpense = txs
    .filter((t) => {
      const cat = (t.category || '').toLowerCase();
      return EIE_IMPORT_KEYWORDS.some((kw) => cat.includes(kw));
    })
    .reduce((s, t) => s + (t.amount || 0), 0);
  return Math.max(0, Math.min(1, importExpense / totalExpense));
}

function _eieInvestmentBreakdown() {
  const map = { Saham: 'saham', 'Reksa Dana': 'reksadana', Emas: 'emas', Kripto: 'crypto', Obligasi: 'obligasi', Deposito: 'deposito', Lainnya: 'lainnya' };
  const out = { saham: 0, reksadana: 0, emas: 0, crypto: 0, obligasi: 0, deposito: 0, lainnya: 0 };
  (D.investments || []).forEach((h) => {
    const key = map[h.type] || 'lainnya';
    out[key] += (h.unit || 0) * (h.currentPrice || 0);
  });
  return out;
}

function _eieEmergencyFundMonths(expenseMonthly) {
  const dd = (D.targets || []).find((t) => t.isDanaDarurat);
  if (!dd || !expenseMonthly) return 0;
  return (dd.saved || 0) / expenseMonthly;
}

function _eieDebtStats(incomeMonthly) {
  const debts = (D.debts || []).filter((d) => !d.lunas);
  const debtTotal = debts.reduce((s, d) => s + (d.nilai || 0), 0);
  // Cicilan aktif dihitung dari D.bills kind:'cicilan' (pola sama dgn
  // LifeBalance.compute() di hidup-seimbang.js) supaya konsisten dgn skor
  // Hidup Seimbang yang sudah ada, bukan angka baru yang tidak sinkron.
  const debtMonthlyInstallment = (D.bills || [])
    .filter((b) => b.kind === 'cicilan' && b.sisaTenor != null)
    .reduce((s, b) => s + (b.amount || 0), 0);
  const debtToIncomeRatio = incomeMonthly > 0 ? debtMonthlyInstallment / incomeMonthly : 0;
  // D.debts tidak punya field 'rate: fixed|floating' (beda dari asumsi awal
  // desain) — proxy: utang berbunga (bunga>0) diperlakukan sbg berpotensi
  // floating/sensitif suku bunga sampai ada field eksplisit di app utama.
  const floatingLike = debts.filter((d) => (d.bunga || 0) > 0);
  const floatingRateDebtRatio = debtTotal > 0
    ? floatingLike.reduce((s, d) => s + (d.nilai || 0), 0) / debtTotal
    : 0;
  return {
    debtTotal, debtMonthlyInstallment, debtToIncomeRatio, floatingRateDebtRatio,
    debts: debts.map((d) => ({ id: d.id, name: d.name, balance: d.nilai || 0, installment: d.cicilanBulanan || 0, hasInterest: (d.bunga || 0) > 0 })),
  };
}

const UserFinanceAdapter = {
  /** @returns {import('../domain/entities.js').UserFinanceSnapshot} */
  getSnapshot() {
    const months = 3; // window rata-rata, konsisten dgn FI.effectiveMonths() default umum
    const incomeMonthly = (typeof WorthIt !== 'undefined') ? WorthIt.incomeAvg() : 0;
    const expenseMonthly = _eieExpenseMonthly(months);
    const cashflowNet = incomeMonthly - expenseMonthly;
    const savingsTotal = (D.accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
    const investmentBreakdown = _eieInvestmentBreakdown();
    const investmentTotal = Object.values(investmentBreakdown).reduce((s, v) => s + v, 0);
    const debtStats = _eieDebtStats(incomeMonthly);
    const emergencyFundMonths = _eieEmergencyFundMonths(expenseMonthly);
    const importDependencyRatio = _eieImportDependencyRatio(months);

    return {
      incomeMonthly, expenseMonthly, cashflowNet,
      emergencyFundMonths, savingsTotal, investmentTotal, investmentBreakdown,
      debtTotal: debtStats.debtTotal,
      debtMonthlyInstallment: debtStats.debtMonthlyInstallment,
      debtToIncomeRatio: debtStats.debtToIncomeRatio,
      floatingRateDebtRatio: debtStats.floatingRateDebtRatio,
      debts: debtStats.debts,
      // incomeStabilityScore: belum ada histori variance income yg
      // terverifikasi di fase 1 -> default netral 60 (bukan 0/100 supaya
      // tidak bias EES ke ekstrem tanpa data nyata).
      incomeStabilityScore: 60,
      importDependencyRatio,
    };
  },
};
