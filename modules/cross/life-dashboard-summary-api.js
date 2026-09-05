// modules/cross/life-dashboard-summary-api.js — Personal Life Dashboard
// Summary API (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE UnifiedSummaryAPI.summary()
// (modules/cross/unified-summary-api.js, Sesi 88 — sendiri gabungan
// CrossAIHook.getAIHook() apa adanya) + UnifiedAIBriefing.generate()
// (modules/cross/unified-ai-briefing.js, Sesi 88) — TIDAK ada rumus baru,
// TIDAK duplikasi logic, TIDAK framework baru, TIDAK membaca D langsung
// sama sekali. LifeDashboardSummaryAPI HANYA menyiapkan SATU pintu masuk
// gabungan utk seluruh lapisan "Personal Life Dashboard" (presenter-nya
// file terpisah, sesi ini juga) — meneruskan finance/vehicle/insightCount
// APA ADANYA dari UnifiedSummaryAPI, ditambah `briefing` (teks siap-pakai
// dari UnifiedAIBriefing, APA ADANYA) & `priorityCount` (PENJUMLAHAN MURNI
// 2 counter yang SUDAH ADA — finance.budget.overCount +
// (vehicle.reminder.overdueCount + vehicle.reminder.dueSoonCount) — BUKAN
// ambang/skoring baru, pola SAMA PERSIS insightCount milik
// UnifiedSummaryAPI sendiri yang juga cuma menjumlah panjang 2 array yang
// sudah ada).
//
// TIDAK ada UI di file ini — presenter-presenter Personal Life Dashboard
// (Personal Overview/Cross Module Widgets/Priority Panel/Unified Dashboard
// Home) ada di file terpisah, sesi ini juga, 100% konsumsi objek ini.
//
// piutangUtang (sesi lanjutan, lihat DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md):
// ditambahkan sebagai field SEJAJAR finance/vehicle (BUKAN nested di bawah
// UnifiedSummaryAPI/CrossAIHook — keduanya khusus wrapper "AI Hook"
// finance+vehicle, menambah domain ke-3 di situ berarti mengubah kontrak
// yang sudah dites di layer lebih dalam; PiutangUtangReminder.summary()
// dipanggil LANGSUNG di sini, pola paling minim-risiko, 0 file lain
// disentuh selain yang benar-benar perlu).
//
// tagihan (sesi lanjutan berikutnya, antrian §"Audit kesiapan per modul"):
// pola SAMA PERSIS piutangUtang di atas — TagihanReminder.summary()
// dipanggil LANGSUNG, field SEJAJAR, guard typeof, default kosong kalau
// belum dimuat. overdueCount/dueSoonCount ikut priorityCount, pola sama.
//
// shopRestock (sesi lanjutan berikutnya, §"Sesi berikutnya" — konsolidasi
// widget ad-hoc dashboard-hub.js): pola SAMA PERSIS tagihan di atas —
// ShopRestockReminder.summary() dipanggil LANGSUNG, field SEJAJAR, guard
// typeof, default kosong kalau belum dimuat. Widget lama ShopMiniSummary
// (dashboard-hub.js, angka "Stok Menipis") TETAP ADA APA ADANYA — ini
// jalur KEDUA dari sumber yang sama (InventoryEngine.restockScan()),
// bukan pengganti.
// danaTitipan (sesi lanjutan, antrian yang sama dengan tagihan): BEDA bentuk
// dari piutangUtang/tagihan — TitipanReconcile.checkAll() BUKAN reminder
// due-date, tapi audit "gap data" (missing/orphan/mismatch), sudah FINAL
// & sudah punya tombol "Perbaiki Gap" sendiri. Sesuai keputusan Design
// Lock ("Tidak — tinggal reuse checkAll() apa adanya sebagai severity
// 'warning' kalau !ok"): checkAll() dipanggil APA ADANYA, 0 rumus baru,
// hasil {ok} dibungkus jadi SATU item severity 'warning' (bukan itemized
// per-gap — checkAll() sendiri tidak menghasilkan list per-gap yang siap
// tampil sebagai pesan), supaya PriorityEngine tinggal reuse bentuk yang
// sama (`.all` array) seperti piutangUtang/tagihan tanpa filter khusus.
//
// financialRisk (sesi lanjutan, antrian AUDIT-DASHBOARD-INSIGHT-COVERAGE.md
// §5 "1 modul finance-analytics per sesi", dimulai dari
// FinancialRiskDashboardAPI karena sudah ada presenter siap): 100% REUSE
// FinancialRiskDashboardAPI.summary() (financial-risk-dashboard-api.js) —
// modul ini SENDIRI sudah pure gabungan dari 4 sumber lain (Debt/Health/
// Cashflow/EmergencyFund), 0 rumus/ambang baru ditambah di sini. Ditambah
// sebagai field SEJAJAR (bukan itemized per-severity due-date seperti
// piutangUtang/tagihan — riskFactors() TIDAK punya overdue/due-soon, semua
// itemnya type:'warning' saja), pola guard typeof sama persis field lain.
//
// zakat (sesi lanjutan, antrian AUDIT-DASHBOARD-INSIGHT-COVERAGE.md §2
// "Zakat" — dikonfirmasi user: Penghasilan & Maal masuk sesi ini, Fitrah
// DITUNDA): pola BEDA bentuk sama seperti danaTitipan/financialRisk (semua
// item severity 'warning', bukan due-date) — ZakatReminder.summary()
// dipanggil LANGSUNG (lihat zakat-reminder.js utk alasan kenapa modul
// terpisah, bukan reuse langsung Zakat.hitungPenghasilan()/hitungMaal()
// yang DOM-bound & (khusus Maal) py side-effect nulis haulMaalMulai).
const LifeDashboardSummaryAPI = {

// summary() — Life Dashboard Summary API. Reuse 100% UnifiedSummaryAPI.
// summary() (finance+vehicle+insightCount, TANPA parameter). {ok:false}
// kalau UnifiedSummaryAPI belum dimuat, ATAU diteruskan apa adanya kalau
// UnifiedSummaryAPI.summary() sendiri {ok:false} (pola sama persis
// UnifiedAIBriefing.generate() yang meneruskan {ok:false} dari layer di
// bawahnya tanpa membungkus ulang).
summary() {
  if (typeof UnifiedSummaryAPI === 'undefined') {
    return { ok: false, reason: 'UnifiedSummaryAPI belum dimuat' };
  }
  const s = UnifiedSummaryAPI.summary();
  if (!s.ok) return s;

  const briefing = (typeof UnifiedAIBriefing !== 'undefined')
    ? UnifiedAIBriefing.generate()
    : { ok: false, reason: 'UnifiedAIBriefing belum dimuat' };

  const piutangUtang = (typeof PiutangUtangReminder !== 'undefined')
    ? PiutangUtangReminder.summary()
    : { total: 0, overdueCount: 0, dueSoonCount: 0, receivable: [], debt: [], all: [] };

  const tagihan = (typeof TagihanReminder !== 'undefined')
    ? TagihanReminder.summary()
    : { total: 0, overdueCount: 0, dueSoonCount: 0, all: [] };

  const shopRestock = (typeof ShopRestockReminder !== 'undefined')
    ? ShopRestockReminder.summary()
    : { total: 0, overdueCount: 0, dueSoonCount: 0, all: [] };

  const danaTitipanCheck = (typeof TitipanReconcile !== 'undefined' && typeof TitipanReconcile.checkAll === 'function')
    ? TitipanReconcile.checkAll() : { ok: true };
  const danaTitipanGap = !danaTitipanCheck.ok;
  const danaTitipan = {
    ok: danaTitipanCheck.ok,
    warningCount: danaTitipanGap ? 1 : 0,
    all: danaTitipanGap
      ? [{ type: 'danaTitipan', severity: 'warning', message: 'Ada gap data Dana Titipan yang perlu diperiksa (menu Perbaiki Gap Dana Titipan).' }]
      : [],
  };

  const financialRisk = (typeof FinancialRiskDashboardAPI !== 'undefined')
    ? FinancialRiskDashboardAPI.summary()
    : { ok: true, riskFactors: [], riskLevel: { count: 0, level: 'low', label: 'Rendah' } };

  const zakat = (typeof ZakatReminder !== 'undefined')
    ? ZakatReminder.summary()
    : { total: 0, warningCount: 0, all: [] };

  const budgetOver = (s.finance && s.finance.ok && s.finance.budget && s.finance.budget.ok)
    ? (s.finance.budget.overCount || 0) : 0;
  const vehicleOverdue = (s.vehicle && s.vehicle.ok && s.vehicle.reminder)
    ? (s.vehicle.reminder.overdueCount || 0) : 0;
  const vehicleDueSoon = (s.vehicle && s.vehicle.ok && s.vehicle.reminder)
    ? (s.vehicle.reminder.dueSoonCount || 0) : 0;

  return {
    ok: true,
    finance: s.finance,
    vehicle: s.vehicle,
    piutangUtang,
    tagihan,
    shopRestock,
    danaTitipan,
    financialRisk,
    zakat,
    insightCount: s.insightCount,
    briefing,
    priorityCount: budgetOver + vehicleOverdue + vehicleDueSoon
      + (piutangUtang.overdueCount || 0) + (piutangUtang.dueSoonCount || 0)
      + (tagihan.overdueCount || 0) + (tagihan.dueSoonCount || 0)
      + (shopRestock.overdueCount || 0) + (shopRestock.dueSoonCount || 0)
      + danaTitipan.warningCount
      + ((financialRisk.riskFactors && financialRisk.riskFactors.length) || 0)
      + (zakat.warningCount || 0),
  };
},

};
