// modules/finance/finance-allocation-api.js — Salary Protection & Surplus Allocation
// S2601: orchestration READ-ONLY di atas API keuangan yang sudah ada.
// Tidak membuat transaksi, tidak mengubah saldo/schema/storage, tidak melakukan
// transfer/pembayaran otomatis, dan tidak menghitung ulang saldo/tagihan.
// PENTING: proyeksi saldo 30 hari bukan kas bebas yang telah direkonsiliasi.
// Nominal investasi hanya boleh dibuka setelah saldo, tagihan 30 hari, utang,
// dan akun cadangan lolos rekonsiliasi kanonis; setiap ambiguitas tetap fail-closed.
const FinanceAllocationAPI = {
  _forecast(existingCashflow) {
    // FinanceDashboard sudah memiliki hasil FinanceIntelligence.summary() pada
    // siklus render yang sama. Pakai hasil itu bila diberikan agar tidak
    // menghitung ulang forecast hanya untuk kartu ini.
    if (existingCashflow !== undefined) {
      if (!existingCashflow || !existingCashflow.ok) {
        return { ok: false, reason: (existingCashflow && existingCashflow.reason) || 'Proyeksi kas belum tersedia' };
      }
      const projected = existingCashflow.projected;
      if (typeof projected !== 'number' || !Number.isFinite(projected)) {
        return { ok: false, reason: 'Saldo proyeksi tidak valid atau belum tersedia' };
      }
      return { ok: true, projected, source: 'FinanceIntelligence.summary().cashflow' };
    }
    if (typeof FinancialForecastAPI === 'undefined' || typeof FinancialForecastAPI.summary !== 'function') {
      return { ok: false, reason: 'FinancialForecastAPI belum tersedia' };
    }
    try {
      const result = FinancialForecastAPI.summary();
      if (!result || !result.ok) return result || { ok: false, reason: 'Proyeksi keuangan tidak tersedia' };
      const projected = result.cashflowProjection && result.cashflowProjection.projected;
      if (typeof projected !== 'number' || !Number.isFinite(projected)) {
        return { ok: false, reason: 'Saldo proyeksi tidak valid atau belum tersedia' };
      }
      return { ok: true, projected, source: 'FinancialForecastAPI.summary()' };
    } catch (e) {
      return { ok: false, reason: 'Proyeksi keuangan gagal dibaca' };
    }
  },

  _actualCashReconciliation() {
    const blocked = (code, reason) => ({ ok: false, code, reason, actualFreeCashVerified: false, safeInvestableAmount: null, investmentAllowed: false });
    if (typeof D === 'undefined' || !Array.isArray(D.accounts) || !Array.isArray(D.transactions) || !Array.isArray(D.bills) || !Array.isArray(D.debts) || !Array.isArray(D.targets)) {
      return blocked('FINANCE_DATA_UNAVAILABLE', 'Data akun, transaksi, tagihan, utang, atau target belum lengkap.');
    }
    if ((typeof _crossTabStateStale !== 'undefined' && _crossTabStateStale) || (typeof window !== 'undefined' && window.__kwPersistenceRecoveryRequired === true)) {
      return blocked('PERSISTENCE_STATE_NOT_CURRENT', 'Data sedang stale lintas-tab atau pemulihan persistence belum selesai. Muat ulang/pulihkan data sebelum alokasi.');
    }
    if (typeof totalSaldoAkun !== 'function' || typeof recalcAccBalance !== 'function' || typeof linkedAssetAccountIds !== 'function' || typeof isAccOwnershipSelf !== 'function' || typeof computeCashflowForecast !== 'function' || typeof getMonthlyCashProjection !== 'function' || typeof getBillPaidThisPeriodInfo !== 'function') {
      return blocked('CANONICAL_SOURCE_UNAVAILABLE', 'Sumber saldo, tagihan, atau proyeksi kanonis belum tersedia.');
    }

    // Kiriman global belum punya kontrak paid-this-period yang setara dengan tagihan.
    // Jangan mengurangi estimasi sebulan penuh dari saldo aktual atau menganggapnya lunas.
    const remittance = Number((D.profile && D.profile.kiriman) || 0);
    if (!Number.isFinite(remittance) || remittance < 0) return blocked('INVALID_REMITTANCE', 'Nilai kiriman mingguan tidak valid.');
    if (remittance > 0) return blocked('REMITTANCE_PERIOD_AMBIGUOUS', 'Kiriman mingguan aktif, tetapi sisa kiriman periode ini belum dapat direkonsiliasi tanpa hitung ganda.');

    // Invalid active bill data can hide a due obligation from the 30-day canonical forecast.
    for (const bill of D.bills) {
      const rawBillAmount = bill && bill.amount;
      const billAmountTypeValid = typeof rawBillAmount === 'number' || typeof rawBillAmount === 'string';
      if (!bill || rawBillAmount == null || !billAmountTypeValid || (typeof rawBillAmount === 'string' && rawBillAmount.trim() === '') || !Number.isFinite(Number(rawBillAmount)) || Number(rawBillAmount) < 0) {
        return blocked('INVALID_BILL_AMOUNT', 'Ada nominal tagihan yang tidak valid.');
      }
      const due = bill.nextDue ? new Date(bill.nextDue) : new Date(NaN);
      if (!Number.isFinite(due.getTime())) return blocked('INVALID_BILL_DUE_DATE', 'Ada tagihan aktif tanpa tanggal jatuh tempo yang dapat diverifikasi.');
    }

    // Scheduled real debts must be represented by their exact canonical bill link.
    // Unscheduled titipan debts are handled only by getMonthlyCashProjection(); other
    // unscheduled debts have no verified cash due-date contract and therefore block.
    const debtById = new Map(D.debts.filter(Boolean).map((debt) => [String(debt.id), debt]));
    for (const debt of D.debts) {
      if (!debt || debt.lunas) continue;
      const rawDebtAmount = debt.nilai;
      const debtAmountTypeValid = typeof rawDebtAmount === 'number' || typeof rawDebtAmount === 'string';
      const debtAmount = Number(rawDebtAmount);
      if (rawDebtAmount == null || !debtAmountTypeValid || (typeof rawDebtAmount === 'string' && rawDebtAmount.trim() === '') || !Number.isFinite(debtAmount) || debtAmount < 0) {
        return blocked('INVALID_ACTIVE_DEBT_AMOUNT', 'Ada utang aktif dengan nominal tidak valid; kas bebas belum aman dihitung.');
      }
      if (debtAmount === 0) continue;
      if (debt.linkedAssetId || debt.linkedInvestmentId || debt.linkedAccountId) continue;
      // Missing/null installment keeps the legacy unscheduled-debt path (which
      // fails closed below). Explicit malformed values must not be coerced to 0/1.
      const rawInstallment = debt.cicilanBulanan;
      const installmentTypeValid = rawInstallment == null || typeof rawInstallment === 'number' || typeof rawInstallment === 'string';
      if (!installmentTypeValid || (typeof rawInstallment === 'string' && rawInstallment.trim() === '')) {
        return blocked('INVALID_DEBT_INSTALLMENT', 'Ada nilai cicilan utang yang tidak valid.');
      }
      const installment = rawInstallment == null ? 0 : Number(rawInstallment);
      if (!Number.isFinite(installment) || installment < 0) return blocked('INVALID_DEBT_INSTALLMENT', 'Ada nilai cicilan utang yang tidak valid.');
      if (installment > 0) {
        const linkedBill = D.bills.find((bill) => bill && String(bill.id) === String(debt.billId) && String(bill.debtId) === String(debt.id) && bill.kind === 'utang');
        if (!debt.billId || !linkedBill) return blocked('DEBT_BILL_LINK_MISSING', 'Ada cicilan utang yang tidak terhubung ke tagihan kanonisnya.');
      } else if (!(debt.autoTitipanOwnerId && !debt.billId)) {
        return blocked('UNSCHEDULED_DEBT', 'Ada utang aktif tanpa jadwal pembayaran kanonis; kas bebas belum aman dihitung.');
      }
    }
    for (const bill of D.bills) {
      if (bill && bill.kind === 'utang' && bill.debtId) {
        const linkedDebt = debtById.get(String(bill.debtId));
        if (!linkedDebt || String(linkedDebt.billId) !== String(bill.id)) {
          return blocked('ORPHAN_DEBT_BILL', 'Ada tagihan cicilan yang tautan utang kanonisnya tidak cocok.');
        }
      }
    }

    // The emergency reserve must be a dedicated SELF-owned cash account included in
    // totalSaldoAkun. A manual saved snapshot cannot prove which cash is actually reserved.
    const emergencyTargets = D.targets.filter((target) => target && target.isDanaDarurat);
    if (emergencyTargets.length !== 1) return blocked('EMERGENCY_TARGET_NOT_UNIQUE', 'Harus ada tepat satu target dana darurat untuk menetapkan prioritas cadangan.');
    const target = emergencyTargets[0];
    const reserveAccount = D.accounts.find((account) => account && String(account.id) === String(target.accountId));
    if (!reserveAccount || target.accountId == null || !(Number(target.amount) > 0) || !Number.isFinite(Number(target.amount))) {
      return blocked('EMERGENCY_ACCOUNT_UNLINKED', 'Target dana darurat harus memiliki akun cadangan dan nominal target yang valid.');
    }
    if (typeof OwnershipEngine === 'undefined' || !OwnershipEngine || typeof OwnershipEngine.resolve !== 'function') {
      return blocked('OWNERSHIP_SOURCE_UNAVAILABLE', 'OwnershipEngine belum tersedia untuk memverifikasi akun cadangan.');
    }
    let linkedAssets;
    let reserveIsSelf;
    try {
      linkedAssets = linkedAssetAccountIds();
      reserveIsSelf = isAccOwnershipSelf(reserveAccount);
    } catch (e) {
      return blocked('OWNERSHIP_RECONCILIATION_FAILED', 'Kepemilikan akun cadangan gagal diverifikasi.');
    }
    if (!linkedAssets || typeof linkedAssets.has !== 'function' || reserveAccount.includeInBalance === false || linkedAssets.has(String(reserveAccount.id)) || !reserveIsSelf) {
      return blocked('EMERGENCY_ACCOUNT_NOT_IN_CASH_TOTAL', 'Akun dana darurat tidak termasuk dalam agregat kas SELF kanonis.');
    }

    let cashForecast;
    let monthlyProjection;
    let currentCash;
    let reserveBalance;
    try {
      cashForecast = computeCashflowForecast();
      monthlyProjection = getMonthlyCashProjection();
      currentCash = totalSaldoAkun();
      reserveBalance = recalcAccBalance(reserveAccount.id);
    } catch (e) {
      return blocked('CANONICAL_RECONCILIATION_FAILED', 'Sumber kanonis gagal direkonsiliasi.');
    }
    if (!cashForecast || !Number.isFinite(cashForecast.saldoNow) || !Number.isFinite(cashForecast.billsDue) || cashForecast.billsDue < 0 || !Array.isArray(cashForecast.upcoming) || !Number.isFinite(currentCash) || !Number.isFinite(reserveBalance) || reserveBalance < 0) {
      return blocked('NON_FINITE_CASH_SOURCE', 'Saldo aktual, cadangan, atau daftar tagihan 30 hari tidak valid.');
    }
    if (Math.abs(cashForecast.saldoNow - currentCash) > 0.01) return blocked('CASH_SNAPSHOT_MISMATCH', 'Snapshot saldo proyeksi berbeda dari agregat saldo akun kanonis.');
    const unscheduledTitipan = monthlyProjection && Number(monthlyProjection.titipanPinjamUnscheduledTotal);
    if (!Number.isFinite(unscheduledTitipan) || unscheduledTitipan < 0) return blocked('UNSCHEDULED_TITIPAN_UNVERIFIED', 'Kewajiban titipan tanpa jadwal belum dapat diverifikasi.');

    // computeCashflowForecast() owns the canonical 30-day due window. Refine only
    // its upcoming list using the existing exact-link paid-period helper, and only
    // for bills whose due date is in the current month; avoid fuzzy name/amount matching.
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    let verifiedBillsDue = 0;
    let listedBillsDue = 0;
    for (const bill of cashForecast.upcoming) {
      const rawUpcomingAmount = bill && bill.amount;
      const upcomingAmountTypeValid = typeof rawUpcomingAmount === 'number' || typeof rawUpcomingAmount === 'string';
      if (!bill || rawUpcomingAmount == null || !upcomingAmountTypeValid || (typeof rawUpcomingAmount === 'string' && rawUpcomingAmount.trim() === '') || !Number.isFinite(Number(rawUpcomingAmount)) || Number(rawUpcomingAmount) < 0) {
        return blocked('INVALID_UPCOMING_BILL', 'Daftar tagihan 30 hari mengandung nominal tidak valid.');
      }
      const upcomingAmount = Number(rawUpcomingAmount);
      const upcomingDue = new Date(bill.nextDue);
      if (!Number.isFinite(upcomingDue.getTime())) return blocked('INVALID_UPCOMING_BILL', 'Daftar tagihan 30 hari mengandung tanggal jatuh tempo tidak valid.');
      listedBillsDue += upcomingAmount;
      const due = new Date(bill.nextDue);
      const isCurrentMonth = due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
      const isCurrentWeek = due >= weekStart && due < weekEnd;
      const canVerifyPaidPeriod = (bill.freq === 'mingguan' && isCurrentWeek) || ((bill.freq === 'bulanan' || bill.freq === 'tahunan') && isCurrentMonth);
      let paidThisPeriod = null;
      if (canVerifyPaidPeriod) {
        try { paidThisPeriod = getBillPaidThisPeriodInfo(bill, due.getMonth(), due.getFullYear()); }
        catch (e) { return blocked('BILL_PAYMENT_RECONCILIATION_FAILED', 'Status pembayaran tagihan tidak dapat diverifikasi.'); }
      }
      if (paidThisPeriod == null) verifiedBillsDue += upcomingAmount;
    }
    if (Math.abs(listedBillsDue - cashForecast.billsDue) > 0.01) return blocked('BILL_FORECAST_MISMATCH', 'Total tagihan dari forecast tidak cocok dengan daftar tagihan jatuh tempo.');

    const afterObligations = currentCash - verifiedBillsDue - unscheduledTitipan - reserveBalance;
    const reserveGap = Math.max(0, Number(target.amount) - reserveBalance);
    if (reserveGap > 0) {
      return {
        ok: true, code: 'EMERGENCY_RESERVE_INCOMPLETE', reason: 'Kas dan kewajiban terjadwal terbaca, tetapi cadangan dana darurat belum mencapai target; investasi tetap dikunci.',
        actualFreeCashVerified: true, cashAfterObligations: afterObligations, emergencyReserveBalance: reserveBalance,
        emergencyReserveTarget: Number(target.amount), emergencyReserveGap: reserveGap,
        safeInvestableAmount: 0, investmentAllowed: false,
      };
    }
    const safeAmount = Math.max(0, afterObligations);
    return {
      ok: true, code: safeAmount > 0 ? 'VERIFIED_SURPLUS' : 'NO_VERIFIED_SURPLUS',
      reason: safeAmount > 0 ? 'Kas setelah kewajiban 30 hari dan cadangan dana darurat telah direkonsiliasi.' : 'Tidak ada kas tersisa setelah kewajiban 30 hari dan cadangan dana darurat.',
      actualFreeCashVerified: true, cashAfterObligations: afterObligations, emergencyReserveBalance: reserveBalance,
      emergencyReserveTarget: Number(target.amount), emergencyReserveGap: 0,
      safeInvestableAmount: safeAmount, investmentAllowed: safeAmount > 0,
    };
  },

  summary(existingCashflow) {
    const forecast = this._forecast(existingCashflow);
    if (!forecast.ok) {
      return {
        ok: false,
        status: 'INSUFFICIENT_DATA',
        reason: forecast.reason || 'Data proyeksi belum cukup',
        basis: '30-day-projection',
        actualFreeCashVerified: false,
        safeInvestableAmount: null,
        investmentAllowed: false,
        recommendations: [{ priority: 1, code: 'verify-data', title: 'Periksa data kas dan kewajiban', detail: 'Lengkapi saldo akun, transaksi, dan status tagihan sebelum membuat keputusan alokasi.' }],
      };
    }

    const projected = forecast.projected;
    const status = projected < 0 ? 'DEFICIT' : (projected === 0 ? 'NO_FREE_CASH' : 'SURPLUS');
    const recommendations = [];

    if (status === 'DEFICIT') {
      recommendations.push({ priority: 1, code: 'protect-essentials', title: 'Lindungi kebutuhan pokok', detail: 'Dahulukan kebutuhan pokok dan kewajiban dengan jatuh tempo atau konsekuensi paling dekat.' });
      recommendations.push({ priority: 2, code: 'reduce-flexible', title: 'Tinjau pengeluaran fleksibel', detail: 'Cari pengeluaran yang dapat ditunda; jangan menutup kekurangan dengan investasi atau utang baru otomatis.' });
    } else if (status === 'NO_FREE_CASH') {
      recommendations.push({ priority: 1, code: 'cover-obligations', title: 'Jaga agar kas tidak terikat ganda', detail: 'Saldo proyeksi nol bukan dana bebas; pastikan tagihan dan kebutuhan dasar tetap tertutup.' });
    } else {
      recommendations.push({ priority: 1, code: 'review-budget', title: 'Tinjau anggaran yang sudah ada', detail: 'Gunakan Budget Recommendation untuk memastikan pengeluaran tidak melewati batas sebelum menambah alokasi.' });
      recommendations.push({ priority: 2, code: 'review-obligations-goals', title: 'Tinjau kewajiban dan target yang sudah tercatat', detail: 'Gunakan Debt Optimizer dan target keuangan yang sudah ada; jangan membuat fitur atau target duplikat.' });
      recommendations.push({ priority: 3, code: 'verify-free-cash', title: 'Validasi kas bebas sebelum investasi', detail: 'Surplus di sini adalah proyeksi, bukan nominal kas bebas aktual. Sisihkan cadangan dan kebutuhan dekat terlebih dahulu.' });
    }

    const actualCash = this._actualCashReconciliation();
    if (!actualCash.ok) {
      recommendations.unshift({ priority: 1, code: 'verify-actual-cash', title: 'Verifikasi kas bebas aktual', detail: actualCash.reason });
    } else if (actualCash.code === 'EMERGENCY_RESERVE_INCOMPLETE') {
      recommendations.unshift({ priority: 1, code: 'complete-emergency-reserve', title: 'Lengkapi dana darurat sebelum investasi', detail: `Kekurangan cadangan: ${Math.round(actualCash.emergencyReserveGap)}. Kas untuk investasi tetap Rp0.` });
    } else if (actualCash.investmentAllowed && status === 'SURPLUS') {
      recommendations.unshift({ priority: 1, code: 'review-verified-surplus', title: 'Tinjau surplus kas yang sudah diverifikasi', detail: `Nominal yang dapat dipertimbangkan: ${Math.round(actualCash.safeInvestableAmount)}. Ini rekomendasi, bukan transaksi otomatis.` });
    } else if (actualCash.investmentAllowed && status !== 'SURPLUS') {
      recommendations.unshift({ priority: 1, code: 'protect-projected-deficit', title: 'Tahan alokasi investasi', detail: 'Kas tersedia saat ini, tetapi proyeksi belum menunjukkan surplus. Pertahankan kas untuk kebutuhan dan kewajiban mendatang.' });
    }
    const finalInvestmentAllowed = actualCash.investmentAllowed && status === 'SURPLUS';
    const finalSafeInvestableAmount = actualCash.ok ? (finalInvestmentAllowed ? actualCash.safeInvestableAmount : 0) : null;

    return {
      ok: true,
      status,
      basis: '30-day-projection',
      projectedEndingBalance: projected,
      actualFreeCashVerified: actualCash.actualFreeCashVerified,
      cashAfterObligations: actualCash.cashAfterObligations,
      emergencyReserveBalance: actualCash.emergencyReserveBalance,
      emergencyReserveTarget: actualCash.emergencyReserveTarget,
      emergencyReserveGap: actualCash.emergencyReserveGap,
      safeInvestableAmount: finalSafeInvestableAmount,
      investmentAllowed: finalInvestmentAllowed,
      actualCashBlockCode: actualCash.ok ? null : actualCash.code,
      actualCashReason: actualCash.reason,
      recommendations,
      sources: [forecast.source, ...(actualCash.ok ? ['totalSaldoAkun()', 'computeCashflowForecast()', 'getBillPaidThisPeriodInfo()', 'getMonthlyCashProjection()', 'recalcAccBalance()'] : [])],
      reason: actualCash.reason || 'Kas bebas aktual belum dapat diverifikasi.',
    };
  },
};
