// modules/asset/asset-portfolio-api.js — Asset Portfolio API (S101, Batch
// 10). Target sesi: Asset Portfolio Foundation.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset/Finance yang SUDAH
// ADA — TIDAK ada rumus keuangan baru, TIDAK duplikasi logic, TIDAK
// framework baru, TIDAK mengubah struktur data D. File ini murni
// MEMBACA ULANG & MENGELOMPOKKAN angka yang SUDAH FINAL dari:
//   - `Aset.totalValue()`            (modules/asset/aset.js — total nilai
//     D.assets, formula SUDAH ADA: reduce s+(a.nilai||0))
//   - `Investment.portfolioSummary()`/`Investment.assetAllocation()`
//     (modules/asset/investasi.js — total nilai holding & breakdown per
//     tipe, formula SUDAH ADA)
//   - `totalSaldoAkun()`             (modules/finance/akun.js — total
//     saldo akun cash/bank/ewallet yg includeInBalance, TIDAK termasuk
//     akun yang ditautkan ke Aset — formula SUDAH ADA)
//   - `Kekayaan.currentNetWorth()`   (modules/shared/modules-calc.js —
//     net worth gabungan seluruh domain, formula SUDAH ADA)
// pola guard berlapis (`typeof X==='undefined'` -> {ok:false,reason})
// SAMA PERSIS `FinancialGoalAPI._goals()`/`._surplus()`
// (modules/finance/financial-goal-api.js, Sesi 94) supaya file ini aman
// dimuat/dites berdiri sendiri lewat loadSource() tanpa dependency-nya.
//
// `allocationBreakdown()` di bawah BUKAN rumus baru — pct=value/total*100
// per kategori (Cash/Aset Fisik/Investasi) adalah bentuk SAMA PERSIS
// `Investment.assetAllocation()` (investasi.js) & pola
// `pct=totalValue>0?(value/totalValue)*100:0` yang sudah dipakai di sana.
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM.
const AssetPortfolioAPI = {

  // _cash() — helper internal: satu titik akses ke `totalSaldoAkun()`
  // (modules/finance/akun.js). Guard berlapis, pola sama persis
  // `FinancialGoalAPI._surplus()`.
  _cash() {
    if (typeof totalSaldoAkun !== 'function') {
      return { ok: false, reason: 'totalSaldoAkun belum dimuat' };
    }
    let value;
    try {
      value = totalSaldoAkun();
    } catch (e) {
      return { ok: false, reason: 'totalSaldoAkun gagal dipanggil' };
    }
    return { ok: true, value: value || 0 };
  },

  // _asset() — helper internal: satu titik akses ke `Aset.totalValue()`
  // (modules/asset/aset.js).
  _asset() {
    if (typeof Aset === 'undefined' || typeof Aset.totalValue !== 'function') {
      return { ok: false, reason: 'Aset belum dimuat' };
    }
    let value;
    try {
      value = Aset.totalValue();
    } catch (e) {
      return { ok: false, reason: 'Aset.totalValue gagal dipanggil' };
    }
    return { ok: true, value: value || 0 };
  },

  // _investment() — helper internal: satu titik akses ke
  // `Investment.portfolioSummary()` (modules/asset/investasi.js).
  _investment() {
    if (typeof Investment === 'undefined' || typeof Investment.portfolioSummary !== 'function') {
      return { ok: false, reason: 'Investment belum dimuat' };
    }
    let summary;
    try {
      summary = Investment.portfolioSummary();
    } catch (e) {
      return { ok: false, reason: 'Investment.portfolioSummary gagal dipanggil' };
    }
    return { ok: true, summary: summary || {} };
  },

  // _netWorth() — helper internal: satu titik akses ke
  // `Kekayaan.currentNetWorth()` (modules/shared/modules-calc.js).
  _netWorth() {
    if (typeof Kekayaan === 'undefined' || typeof Kekayaan.currentNetWorth !== 'function') {
      return { ok: false, reason: 'Kekayaan belum dimuat' };
    }
    let value;
    try {
      value = Kekayaan.currentNetWorth();
    } catch (e) {
      return { ok: false, reason: 'Kekayaan.currentNetWorth gagal dipanggil' };
    }
    return { ok: true, value: value || 0 };
  },

  // portfolioComposition() — Asset Portfolio API. Gabungan 3 sumber nilai
  // (cash/asset/investment) APA ADANYA dari helper di atas, ditambah
  // `totalValue` (murni penjumlahan ketiganya, 0 rumus baru).
  portfolioComposition() {
    const cash = this._cash();
    if (!cash.ok) return cash;
    const asset = this._asset();
    if (!asset.ok) return asset;
    const investment = this._investment();
    if (!investment.ok) return investment;
    const cashValue = cash.value;
    const assetValue = asset.value;
    const investmentValue = investment.summary.totalValue || 0;
    const totalValue = cashValue + assetValue + investmentValue;
    return {
      ok: true,
      cashValue,
      assetValue,
      investmentValue,
      totalValue,
      assetCount: (typeof D !== 'undefined' && D && Array.isArray(D.assets)) ? D.assets.filter(typeof isAssetOwnershipSelf === 'function' ? isAssetOwnershipSelf : () => true).length : 0,
      investmentHoldingsCount: investment.summary.holdingsCount || 0,
    };
  },

  // allocationBreakdown() — Portfolio Allocation Breakdown. Derivatif
  // murni dari `portfolioComposition()` di atas — pct per kategori
  // (Cash/Aset Fisik/Investasi) pakai bentuk rumus SAMA PERSIS
  // `Investment.assetAllocation()` (value/totalValue*100, guard
  // totalValue>0), diurutkan dari nilai terbesar (pola sama
  // `assetAllocation()`).
  allocationBreakdown() {
    const pc = this.portfolioComposition();
    if (!pc.ok) return pc;
    const total = pc.totalValue;
    const rows = [
      { category: 'Kas / Akun', value: pc.cashValue },
      { category: 'Aset Fisik', value: pc.assetValue },
      { category: 'Investasi', value: pc.investmentValue },
    ].map((r) => ({ ...r, pct: total > 0 ? (r.value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    return { ok: true, totalValue: total, breakdown: rows };
  },

  // investmentAllocation() — pass-through APA ADANYA ke
  // `Investment.assetAllocation()` (breakdown per tipe instrumen di
  // dalam portofolio investasi saja) — TIDAK dihitung ulang di sini,
  // pola sama persis `financialGoals()` meneruskan `goalAdapterList(D)`
  // apa adanya.
  investmentAllocation() {
    if (typeof Investment === 'undefined' || typeof Investment.assetAllocation !== 'function') {
      return { ok: false, reason: 'Investment belum dimuat' };
    }
    let list;
    try {
      list = Investment.assetAllocation();
    } catch (e) {
      return { ok: false, reason: 'Investment.assetAllocation gagal dipanggil' };
    }
    return { ok: true, breakdown: Array.isArray(list) ? list : [] };
  },

  // netWorthSnapshot() — pass-through APA ADANYA ke
  // `Kekayaan.currentNetWorth()`, ditambah `totalValue` dari
  // `portfolioComposition()` supaya presenter bisa bandingkan portofolio
  // (aset+investasi+kas) vs net worth penuh (yang juga memperhitungkan
  // piutang/inventori bisnis/utang — cakupan lebih luas, TIDAK
  // di-duplikasi rumusnya di sini).
  netWorthSnapshot() {
    const nw = this._netWorth();
    if (!nw.ok) return nw;
    const pc = this.portfolioComposition();
    return {
      ok: true,
      netWorth: nw.value,
      portfolioValue: pc.ok ? pc.totalValue : null,
    };
  },

  // summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
  // masa depan), murni memanggil fungsi-fungsi di atas, TIDAK ada logic
  // tambahan. `ok` true kalau `portfolioComposition()` ok (pola sama
  // persis `FinancialGoalAPI.summary()`).
  summary() {
    const composition = this.portfolioComposition();
    const allocation = this.allocationBreakdown();
    const investmentAllocation = this.investmentAllocation();
    const netWorth = this.netWorthSnapshot();
    return {
      ok: !!composition.ok,
      composition,
      allocation,
      investmentAllocation,
      netWorth,
    };
  },

};
