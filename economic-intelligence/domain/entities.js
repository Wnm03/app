// domain/entities.js — Definisi bentuk data EIE (JSDoc typedef murni).
//
// ATURAN DOMAIN LAYER: file ini TIDAK BOLEH import/reference apa pun dari
// adapters/ atau eie-store.js. Tidak ada I/O. Tidak ada IndexedDB/API.
// 100% deklaratif, dipakai sbg referensi bentuk objek oleh layer lain.

/**
 * @typedef {Object} MacroSnapshot
 * @property {string} indicatorId   // 'usdidr' | 'inflasi' | 'bi_rate' | 'ihsg' | 'emas' | 'bbm' | 'oil_wti' | 'komoditas:<nama>'
 * @property {number} value
 * @property {number} prevValue
 * @property {number} changePct     // (value-prevValue)/prevValue * 100
 * @property {'up'|'down'|'flat'} trend
 * @property {string} unit          // 'IDR', '%', 'poin', 'USD/barrel'
 * @property {string} source        // 'manual-cache' | 'bi.go.id' | 'yahoo-finance' dst
 * @property {number} fetchedAt     // epoch ms
 * @property {boolean} isStale      // true jika data lama / belum pernah di-refresh
 */

/**
 * @typedef {Object} UserFinanceSnapshot
 * @property {number} incomeMonthly
 * @property {number} expenseMonthly
 * @property {number} cashflowNet
 * @property {number} emergencyFundMonths
 * @property {number} savingsTotal
 * @property {number} investmentTotal
 * @property {Object} investmentBreakdown   // { saham, reksadana, emas, crypto, obligasi, deposito, lainnya }
 * @property {number} debtTotal
 * @property {number} debtMonthlyInstallment
 * @property {number} debtToIncomeRatio     // DSR (0-1)
 * @property {Object[]} debts               // [{ id, name, balance, installment, hasInterest }]
 * @property {number} incomeStabilityScore  // 0-100 (dari histori cashflow, disederhanakan fase 1)
 * @property {number} importDependencyRatio // estimasi 0-1, dari kategori transaksi BBM/impor
 */

/**
 * @typedef {Object} EIEScoreSnapshot
 * @property {string} date
 * @property {number} economicExposureScore
 * @property {number} personalEconomicHealthScore
 * @property {number} economicRiskIndex
 * @property {'normal'|'waspada'|'risiko_tinggi'} status
 * @property {Object} breakdown
 */

/**
 * @typedef {Object} Insight
 * @property {string} id
 * @property {string} ruleId
 * @property {'info'|'warning'|'critical'} severity
 * @property {string} message
 * @property {string} [recommendationId]
 * @property {number} createdAt
 * @property {boolean} read
 * @property {boolean} dismissed
 */

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} category
 * @property {Function} condition   // (macro, user, ctx) => boolean
 * @property {Function} action      // (macro, user, ctx) => { message, recommendationId }
 * @property {'info'|'warning'|'critical'} severity
 * @property {number} weight
 * @property {boolean} enabled
 * @property {number} cooldownDays
 */
