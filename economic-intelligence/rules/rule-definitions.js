// rules/rule-definitions.js — rule IF-THEN prioritas tertinggi. 16 rule
// awal dari fase 1 MVP (§22 dokumen desain) + 7 rule tambahan fase 3
// (ditandai FASE 3 di komentar masing-masing, per kategori yang sudah
// ada — tidak ada kategori baru). DATA-ONLY: condition/action adalah
// function murni, tidak menyimpan apa pun, tidak ada I/O. Menambah rule
// baru = 1 entry array baru (lewat EIERegistry.registerRule(), §20) —
// TIDAK PERNAH hardcode logic rule di engine/rule-engine.js atau di ui/*.
//
// `macro` di sini adalah hasil MacroDataAdapter.getLatest() — object
// { usdidr, inflasi, bi_rate, ihsg, emas, bbm } (lihat domain/entities.js).
// `user` adalah UserFinanceSnapshot dari UserFinanceAdapter.getSnapshot().

function fmtIDR(n) {
  return 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
}

const EIE_RULES = [
  // --- A. USD/IDR ---
  {
    id: 'R-USD-001', category: 'usdidr', enabled: true, weight: 8, severity: 'warning', cooldownDays: 14,
    description: 'Kurs naik tajam & importDependencyRatio tinggi',
    condition: (macro, user) => macro.usdidr && macro.usdidr.changePct > 3 && (user.importDependencyRatio || 0) > 0.2,
    action: (macro, user) => ({
      message: `USD/IDR naik ${macro.usdidr.changePct.toFixed(1)}%. Estimasi tambahan pengeluaran bulan ini ~${fmtIDR(user.expenseMonthly * user.importDependencyRatio * (macro.usdidr.changePct / 100))} dari kategori BBM/barang impor.`,
      recommendationId: 'REC-REVIEW-BUDGET-IMPORT',
    }),
  },
  {
    id: 'R-USD-002', category: 'usdidr', enabled: true, weight: 5, severity: 'info', cooldownDays: 30,
    description: 'Kurs naik >5%, umum (tanpa syarat tambahan)',
    condition: (macro) => macro.usdidr && macro.usdidr.changePct > 5,
    action: (macro) => ({
      message: `USD/IDR naik ${macro.usdidr.changePct.toFixed(1)}% dari periode sebelumnya. Kalau berencana beli barang/kendaraan impor, harga berpotensi ikut naik.`,
      recommendationId: 'REC-DELAY-VEHICLE-PURCHASE',
    }),
  },

  {
    // FASE 3: kebalikan R-USD-002 — kurs turun tajam, kabar baik utk yg
    // beli barang/kendaraan impor. Belum ada rule "kurs turun" sebelumnya.
    id: 'R-USD-003', category: 'usdidr', enabled: true, weight: 2, severity: 'info', cooldownDays: 30,
    description: 'Kurs turun tajam (kabar baik, bukan cuma peringatan naik)',
    condition: (macro) => macro.usdidr && macro.usdidr.changePct < -3,
    action: (macro) => ({
      message: `USD/IDR turun ${Math.abs(macro.usdidr.changePct).toFixed(1)}%. Kalau ada rencana beli barang/kendaraan impor, ini momentum harga yang relatif lebih ringan.`,
      recommendationId: null,
    }),
  },

  // --- B. Inflasi ---
  {
    id: 'R-INF-001', category: 'inflasi', enabled: true, weight: 6, severity: 'warning', cooldownDays: 21,
    description: 'Inflasi naik signifikan & buffer dana darurat tipis',
    condition: (macro, user) => macro.inflasi && macro.inflasi.changePct > 10 && (user.emergencyFundMonths || 0) < 3,
    action: (macro, user) => ({
      message: `Inflasi naik ${macro.inflasi.changePct.toFixed(1)}% sementara dana daruratmu baru ${(user.emergencyFundMonths || 0).toFixed(1)} bulan (target 6 bulan). Daya beli & bantalan darurat sama-sama tertekan.`,
      recommendationId: 'REC-BOOST-EMERGENCY-FUND',
    }),
  },
  {
    id: 'R-INF-002', category: 'inflasi', enabled: true, weight: 3, severity: 'info', cooldownDays: 30,
    description: 'Inflasi menyimpang jauh dari target BI (2.5%±1%)',
    condition: (macro) => macro.inflasi && (macro.inflasi.value > 3.5 || macro.inflasi.value < 1.5),
    action: (macro) => ({
      message: `Inflasi saat ini ${macro.inflasi.value.toFixed(1)}%, di luar rentang target BI (2.5%±1%). Harga kebutuhan pokok berpotensi naik lebih cepat dari biasanya.`,
      recommendationId: 'REC-REVIEW-BUDGET-IMPORT',
    }),
  },

  {
    // FASE 3: risiko bertumpuk — inflasi naik BERSAMAAN stabilitas income
    // rendah (proxy: incomeStabilityScore dari histori cashflow, bukan
    // dari kondisi utang/dana darurat seperti R-INF-001, jadi tidak
    // duplikat kondisi).
    id: 'R-INF-003', category: 'inflasi', enabled: true, weight: 5, severity: 'warning', cooldownDays: 21,
    description: 'Inflasi naik & stabilitas income rendah (risiko daya beli + risiko income bertumpuk)',
    condition: (macro, user) => macro.inflasi && macro.inflasi.changePct > 5 && (user.incomeStabilityScore ?? 100) < 40,
    action: (macro, user) => ({
      message: `Inflasi naik ${macro.inflasi.changePct.toFixed(1)}% di saat stabilitas incomemu sedang rendah (skor ${Math.round(user.incomeStabilityScore || 0)}/100). Dua tekanan ini bertumpuk — prioritaskan pengeluaran esensial dulu.`,
      recommendationId: 'REC-BOOST-EMERGENCY-FUND',
    }),
  },

  // --- C. BI Rate ---
  {
    id: 'R-BI-001', category: 'bi_rate', enabled: true, weight: 9, severity: 'critical', cooldownDays: 14,
    description: 'BI Rate naik & ada utang berbunga (proxy floating)',
    condition: (macro, user) => macro.bi_rate && macro.bi_rate.changePct > 0 && (user.floatingRateDebtRatio || 0) > 0,
    action: (macro, user) => {
      const deltaPoin = macro.bi_rate.value - macro.bi_rate.prevValue;
      const estImpact = (user.debtTotal || 0) * (user.floatingRateDebtRatio || 0) * (deltaPoin / 100) / 12;
      return {
        message: `BI Rate naik ${deltaPoin.toFixed(2)} poin. Cicilan berbunga-mu berpotensi naik ~${fmtIDR(estImpact)}/bulan.`,
        recommendationId: 'REC-REVIEW-FLOATING-DEBT',
      };
    },
  },
  {
    id: 'R-BI-002', category: 'bi_rate', enabled: true, weight: 4, severity: 'info', cooldownDays: 30,
    description: 'BI Rate naik & DSR sudah tinggi',
    condition: (macro, user) => macro.bi_rate && macro.bi_rate.changePct > 0 && (user.debtToIncomeRatio || 0) > 0.35,
    action: (macro, user) => ({
      message: `BI Rate naik lagi, sementara rasio cicilanmu terhadap income sudah ${((user.debtToIncomeRatio || 0) * 100).toFixed(0)}%. Pertimbangkan menunda utang baru dulu.`,
      recommendationId: 'REC-REVIEW-FLOATING-DEBT',
    }),
  },

  {
    // FASE 3: kebalikan R-BI-001/002 — BI Rate turun, momentum utk review
    // refinancing/pindah ke bunga tetap sebelum naik lagi.
    id: 'R-BI-003', category: 'bi_rate', enabled: true, weight: 3, severity: 'info', cooldownDays: 30,
    description: 'BI Rate turun & user punya utang berbunga (peluang refinancing)',
    condition: (macro, user) => macro.bi_rate && macro.bi_rate.changePct < 0 && (user.floatingRateDebtRatio || 0) > 0,
    action: (macro) => ({
      message: `BI Rate turun ${Math.abs(macro.bi_rate.changePct).toFixed(1)}%. Momentum yang relatif baik untuk cek ulang bunga cicilan/refinancing sebelum tren naik lagi.`,
      recommendationId: 'REC-REVIEW-FLOATING-DEBT',
    }),
  },

  // --- D. IHSG ---
  {
    id: 'R-IHSG-001', category: 'ihsg', enabled: true, weight: 7, severity: 'warning', cooldownDays: 14,
    description: 'IHSG turun tajam & porsi aset volatil besar',
    condition: (macro, user) => macro.ihsg && macro.ihsg.changePct < -3 && (() => {
      const total = (user.savingsTotal || 0) + (user.investmentTotal || 0);
      const volatile = ((user.investmentBreakdown && (user.investmentBreakdown.saham + user.investmentBreakdown.reksadana)) || 0);
      return total > 0 && (volatile / total) > 0.15;
    })(),
    action: (macro, user) => {
      const volatile = (user.investmentBreakdown.saham || 0) + (user.investmentBreakdown.reksadana || 0);
      const estImpact = volatile * (macro.ihsg.changePct / 100);
      return {
        message: `IHSG turun ${Math.abs(macro.ihsg.changePct).toFixed(1)}%. Portofolio saham/reksadana-mu berpotensi turun ~${fmtIDR(Math.abs(estImpact))} secara nilai pasar (belum tentu realized loss).`,
        recommendationId: 'REC-REVIEW-PORTFOLIO',
      };
    },
  },
  {
    id: 'R-IHSG-002', category: 'ihsg', enabled: true, weight: 2, severity: 'info', cooldownDays: 21,
    description: 'IHSG naik tajam (kabar baik, bukan cuma warning)',
    condition: (macro) => macro.ihsg && macro.ihsg.changePct > 5,
    action: (macro) => ({
      message: `IHSG naik ${macro.ihsg.changePct.toFixed(1)}%. Kalau kamu punya reksadana saham, ini momentum baik untuk cek kembali alokasi asetmu.`,
      recommendationId: 'REC-REVIEW-PORTFOLIO',
    }),
  },

  {
    // FASE 3: IHSG turun tajam TAPI buffer & alokasi volatil user justru
    // rendah — beda kondisi dari R-IHSG-001 (yang butuh alokasi volatil
    // TINGGI), jadi tidak saling tumpang tindih pemicunya.
    id: 'R-IHSG-003', category: 'ihsg', enabled: true, weight: 3, severity: 'info', cooldownDays: 21,
    description: 'IHSG turun tajam, buffer dana darurat kuat & alokasi saham/reksadana masih rendah (potensi peluang beli saat harga turun)',
    condition: (macro, user) => macro.ihsg && macro.ihsg.changePct < -3 && (user.emergencyFundMonths || 0) >= 6 && (() => {
      const total = (user.savingsTotal || 0) + (user.investmentTotal || 0);
      const volatile = ((user.investmentBreakdown && (user.investmentBreakdown.saham + user.investmentBreakdown.reksadana)) || 0);
      return total === 0 || (volatile / total) <= 0.15;
    })(),
    action: (macro) => ({
      message: `IHSG turun ${Math.abs(macro.ihsg.changePct).toFixed(1)}% sementara dana daruratmu sudah aman & alokasi saham/reksadana masih tipis. Kalau sesuai profil risikomu, ini periode yang relatif lebih murah untuk mulai/nambah alokasi.`,
      recommendationId: 'REC-REVIEW-PORTFOLIO',
    }),
  },

  // --- E. Emas ---
  {
    id: 'R-EMAS-001', category: 'emas', enabled: true, weight: 3, severity: 'info', cooldownDays: 21,
    description: 'Harga emas naik & user punya alokasi emas',
    condition: (macro, user) => macro.emas && macro.emas.changePct > 5 && (user.investmentBreakdown && user.investmentBreakdown.emas > 0),
    action: (macro, user) => ({
      message: `Harga emas naik ${macro.emas.changePct.toFixed(1)}%. Nilai emas yang kamu pegang (${fmtIDR(user.investmentBreakdown.emas)}) ikut naik mengikuti harga pasar.`,
      recommendationId: 'REC-REVIEW-PORTFOLIO',
    }),
  },
  {
    id: 'R-EMAS-002', category: 'emas', enabled: true, weight: 2, severity: 'info', cooldownDays: 30,
    description: 'Harga emas turun tajam, user belum punya alokasi emas',
    condition: (macro, user) => macro.emas && macro.emas.changePct < -5 && (!user.investmentBreakdown || !user.investmentBreakdown.emas),
    action: (macro) => ({
      message: `Harga emas turun ${Math.abs(macro.emas.changePct).toFixed(1)}%. Kalau kamu berencana mulai investasi emas, ini bisa jadi harga masuk yang lebih menarik.`,
      recommendationId: null,
    }),
  },

  {
    // FASE 3: alokasi emas kebanyakan justru berisiko konsentrasi saat
    // harga sedang naik tajam — beda pemicu dari R-EMAS-001 (yg cuma
    // butuh alokasi emas > 0, bukan proporsi besar).
    id: 'R-EMAS-003', category: 'emas', enabled: true, weight: 4, severity: 'warning', cooldownDays: 30,
    description: 'Harga emas naik tajam & alokasi emas user sudah terlalu terkonsentrasi (>50% dari total investasi)',
    condition: (macro, user) => macro.emas && macro.emas.changePct > 5 && (() => {
      const investasi = user.investmentTotal || 0;
      const emas = (user.investmentBreakdown && user.investmentBreakdown.emas) || 0;
      return investasi > 0 && (emas / investasi) > 0.5;
    })(),
    action: (macro, user) => ({
      message: `Harga emas naik ${macro.emas.changePct.toFixed(1)}% dan porsi emasmu sudah ${(((user.investmentBreakdown.emas || 0) / (user.investmentTotal || 1)) * 100).toFixed(0)}% dari total investasi. Kenaikan harga menguntungkan, tapi konsentrasi setinggi ini juga bikin portofolio lebih rentan kalau harga emas berbalik turun.`,
      recommendationId: 'REC-REVIEW-PORTFOLIO',
    }),
  },

  // --- F. BBM ---
  {
    id: 'R-BBM-001', category: 'bbm', enabled: true, weight: 5, severity: 'warning', cooldownDays: 21,
    description: 'Harga BBM naik & pengeluaran BBM/impor cukup besar',
    condition: (macro, user) => macro.bbm && macro.bbm.changePct > 3 && (user.importDependencyRatio || 0) > 0.1,
    action: (macro, user) => ({
      message: `Harga BBM naik ${macro.bbm.changePct.toFixed(1)}%. Estimasi tambahan pengeluaran BBM bulan ini ~${fmtIDR(user.expenseMonthly * user.importDependencyRatio * (macro.bbm.changePct / 100))}.`,
      recommendationId: 'REC-REVIEW-BUDGET-IMPORT',
    }),
  },
  {
    // FASE 3: kebalikan R-BBM-001 — BBM turun tajam, kabar baik umum
    // (tidak digate importDependencyRatio, karena berlaku hampir semua
    // orang yang pakai kendaraan).
    id: 'R-BBM-002', category: 'bbm', enabled: true, weight: 2, severity: 'info', cooldownDays: 30,
    description: 'Harga BBM turun tajam (kabar baik)',
    condition: (macro) => macro.bbm && macro.bbm.changePct < -3,
    action: (macro) => ({
      message: `Harga BBM turun ${Math.abs(macro.bbm.changePct).toFixed(1)}%. Pengeluaran BBM bulan ini berpotensi sedikit lebih ringan dari biasanya.`,
      recommendationId: null,
    }),
  },

  // --- G. Komposit (gabungan >1 indikator) ---
  {
    id: 'R-COMP-001', category: 'composite', enabled: true, weight: 10, severity: 'critical', cooldownDays: 14,
    description: 'Kurs & BI Rate naik bersamaan, DSR tinggi (skenario "resesi ringan")',
    condition: (macro, user) => macro.usdidr && macro.bi_rate
      && macro.usdidr.changePct > 3 && macro.bi_rate.changePct > 0 && (user.debtToIncomeRatio || 0) > 0.30,
    action: (macro, user) => ({
      message: `Kurs naik ${macro.usdidr.changePct.toFixed(1)}% & BI Rate ikut naik, sementara DSR kamu ${((user.debtToIncomeRatio || 0) * 100).toFixed(0)}%. Kombinasi ini paling terasa di cicilan & barang impor sekaligus — pertimbangkan mitigasi ganda.`,
      recommendationId: 'REC-REVIEW-FLOATING-DEBT',
    }),
  },
  {
    id: 'R-COMP-002', category: 'composite', enabled: true, weight: 6, severity: 'warning', cooldownDays: 21,
    description: 'IHSG turun & inflasi naik bersamaan (tekanan ganda: aset & daya beli)',
    condition: (macro) => macro.ihsg && macro.inflasi && macro.ihsg.changePct < -3 && macro.inflasi.changePct > 5,
    action: (macro) => ({
      message: `IHSG turun ${Math.abs(macro.ihsg.changePct).toFixed(1)}% bersamaan inflasi naik ${macro.inflasi.changePct.toFixed(1)}% — nilai investasi & daya beli sama-sama tertekan bulan ini.`,
      recommendationId: 'REC-REVIEW-PORTFOLIO',
    }),
  },
  {
    id: 'R-COMP-003', category: 'composite', enabled: true, weight: 4, severity: 'info', cooldownDays: 30,
    description: 'Buffer dana darurat sangat tipis, terlepas dari kondisi makro (baseline PEHS)',
    condition: (macro, user) => (user.emergencyFundMonths || 0) < 1,
    action: (macro, user) => ({
      message: `Dana daruratmu saat ini setara ${(user.emergencyFundMonths || 0).toFixed(1)} bulan pengeluaran — di bawah 1 bulan. Ini bikin kondisi makro apa pun terasa lebih berisiko dari yang seharusnya.`,
      recommendationId: 'REC-BOOST-EMERGENCY-FUND',
    }),
  },
  {
    id: 'R-COMP-004', category: 'composite', enabled: true, weight: 3, severity: 'info', cooldownDays: 30,
    description: 'Cashflow negatif, terlepas dari kondisi makro',
    condition: (macro, user) => (user.cashflowNet || 0) < 0,
    action: (macro, user) => ({
      message: `Cashflow bulanan kamu negatif (${fmtIDR(user.cashflowNet)}). Ini baseline personal yang perlu diperbaiki dulu sebelum eksposur makro jadi masalah tambahan.`,
      recommendationId: null,
    }),
  },
  {
    id: 'R-COMP-005', category: 'composite', enabled: true, weight: 2, severity: 'info', cooldownDays: 60,
    description: 'Kondisi makro & personal sama-sama sehat (kabar baik, bukan cuma peringatan)',
    condition: (macro, user) => macro.usdidr && Math.abs(macro.usdidr.changePct) < 2
      && macro.ihsg && Math.abs(macro.ihsg.changePct) < 3
      && (user.emergencyFundMonths || 0) >= 6 && (user.debtToIncomeRatio || 0) < 0.2,
    action: () => ({
      message: `Kondisi makro relatif stabil & fondasi keuanganmu (dana darurat, DSR) sehat. Waktu yang baik untuk fokus ke tujuan jangka panjang.`,
      recommendationId: null,
    }),
  },
  {
    // FASE 3: baseline personal lain (terlepas dari makro, sama seperti
    // R-COMP-003/004) — stabilitas income rendah BERSAMAAN DSR tinggi,
    // dua sinyal risiko personal yang saling memperkuat.
    id: 'R-COMP-006', category: 'composite', enabled: true, weight: 5, severity: 'warning', cooldownDays: 30,
    description: 'Stabilitas income rendah & DSR tinggi bersamaan, terlepas dari kondisi makro',
    condition: (macro, user) => (user.incomeStabilityScore ?? 100) < 40 && (user.debtToIncomeRatio || 0) > 0.35,
    action: (macro, user) => ({
      message: `Stabilitas incomemu sedang rendah (skor ${Math.round(user.incomeStabilityScore || 0)}/100) sementara rasio cicilan terhadap income sudah ${((user.debtToIncomeRatio || 0) * 100).toFixed(0)}%. Kombinasi ini bikin cicilan lebih berisiko kalau income sempat terganggu — pertimbangkan tunda utang baru & perkuat dana darurat.`,
      recommendationId: 'REC-REVIEW-FLOATING-DEBT',
    }),
  },
];
