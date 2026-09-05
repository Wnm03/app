// modules/cross/priority-engine.js — Priority Engine (Sesi 90, Batch 8).
// Target sesi: Personal Decision Center Foundation.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE LifeDashboardSummaryAPI.summary()
// (modules/cross/life-dashboard-summary-api.js, Sesi 89) — TIDAK ada rumus/
// skoring baru, TIDAK menghitung ulang severity/status apa pun. Satu-
// satunya operasi di sini adalah FILTER + URUTKAN 2 array yang SUDAH ADA
// ke kondisi "butuh perhatian" yang SUDAH FINAL dari layer di bawahnya:
//   - s.finance.budget.items difilter `.over === true`
//     (FinanceIntelligence.budgetSummary(), field `over` sudah final)
//   - s.vehicle.reminder.all difilter severity 'overdue'/'due-soon'
//     (VehicleReminder.summary(), field `severity` sudah final)
// Urutan hasil (overdue kendaraan -> anggaran lewat limit -> due-soon
// kendaraan) murni pengelompokan berdasar severity yang SUDAH ADA, BUKAN
// scoring/rank numerik baru.
//
// CATATAN REFAKTOR: filter+urutan ini SEBELUMNYA hidup langsung di dalam
// LifePriorityPanel.render() (Sesi 89). Sesi ini (90) dipindah ke sini
// supaya jadi SATU sumber logic yang bisa dipakai lebih dari satu
// konsumen (LifePriorityPanel — presenter UI panel yang sudah ada — &
// DecisionCenterAPI — data layer baru sesi ini) TANPA duplikasi logic
// filter yang sama di 2 tempat (WAJIB sesi ini: "Tanpa duplicate
// logic"). LifePriorityPanel.render() diubah jadi konsumen murni
// PriorityEngine.getItems(), TIDAK lagi memfilter s.finance/s.vehicle
// sendiri — lihat life-priority-panel.js.
//
// piutangUtang (sesi lanjutan, lihat
// DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md) — s.piutangUtang.all difilter
// severity 'overdue'/'due-soon' persis pola vehicleAll, field `severity`
// sudah final dari PiutangUtangReminder.summary() (0 skoring baru di sini
// juga). Ditempatkan overdue-nya di ANTARA vehicle overdue & finance over,
// due-soon-nya di PALING AKHIR setelah vehicle due-soon — dikonfirmasi
// user (Design Lock, "Pertanyaan terbuka" #2: overdue jenis apa pun
// dikelompokkan duluan, baru due-soon jenis apa pun) TANPA mengubah urutan
// vehicle/finance yang sudah ada & sudah dites eksplisit
// (tests/priority-engine-s286.test.js).
//
// tagihan/danaTitipan (sesi lanjutan berikutnya, antrian yang sama dengan
// piutangUtang): tagihan — s.tagihan.all difilter severity 'overdue'/
// 'due-soon' persis pola piutangUtangAll, disisipkan TEPAT SETELAH
// piutangUtang di tiap grup (overdue: ...vehicle,piutangUtang,tagihan;
// due-soon: ...vehicle,piutangUtang,tagihan) — urutan relatif jenis
// mengikuti urutan sesi implementasi (piutang/utang lebih dulu ada),
// TIDAK mengubah urutan vehicle/finance yang sudah ada. danaTitipan —
// BEDA bentuk (bukan due-date, lihat life-dashboard-summary-api.js),
// severity SELALU 'warning' (bukan overdue/due-soon), jadi ditempatkan
// di GRUP TERPISAH paling akhir (setelah semua due-soon), tidak
// dicampur ke pengelompokan overdue/due-soon yang sudah final.
//
// shopRestock (sesi lanjutan berikutnya, konsolidasi widget ad-hoc
// dashboard-hub.js — lihat DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md
// §"Sesi berikutnya"): s.shopRestock.all difilter severity 'overdue'/
// 'due-soon' persis pola tagihanAll, disisipkan TEPAT SETELAH tagihan di
// tiap grup (overdue: ...tagihan,shopRestock; due-soon: ...tagihan,
// shopRestock) — urutan relatif jenis mengikuti urutan sesi implementasi,
// TIDAK mengubah urutan vehicle/finance/piutangUtang/tagihan yang sudah
// ada. danaTitipan tetap di grup TERPISAH paling akhir seperti sebelumnya.
//
// financialRisk (sesi lanjutan, antrian AUDIT-DASHBOARD-INSIGHT-COVERAGE.md
// §5): s.financialRisk.riskFactors — BEDA bentuk (sama seperti danaTitipan,
// bukan due-date, semua item type:'warning' dari FinancialRiskDashboardAPI,
// TIDAK ada overdue/due-soon) — ditempatkan di GRUP TERPISAH PALING AKHIR,
// SETELAH danaTitipan (urutan relatif jenis mengikuti urutan sesi
// implementasi, danaTitipan lebih dulu ada), tidak dicampur ke
// pengelompokan overdue/due-soon yang sudah final.
//
// zakat (sesi lanjutan, antrian AUDIT-DASHBOARD-INSIGHT-COVERAGE.md §2,
// dikonfirmasi user: Penghasilan & Maal, Fitrah ditunda): s.zakat.all —
// BEDA bentuk juga (severity SELALU 'warning', "wajib sekarang" bukan
// due-date, pola SAMA PERSIS danaTitipan/financialRisk) — ditempatkan di
// GRUP TERPISAH PALING AKHIR, SETELAH financialRisk (urutan relatif jenis
// mengikuti urutan sesi implementasi — financialRisk lebih dulu
// diimplementasikan sesi ini), tidak dicampur ke pengelompokan
// overdue/due-soon yang sudah final.
//
// Murni PURE (read-only, tidak menyentuh DOM/localStorage) — pola sama
// persis lapisan Intelligence/Reminder/UnifiedSummaryAPI, bukan presenter.
const PriorityEngine = {

// getItems() — daftar item "butuh perhatian" gabungan finance+vehicle+
// piutang/utang+tagihan+shop restock+dana titipan+financial risk+zakat,
// sudah terurut (overdue kendaraan -> overdue piutang/utang -> overdue
// tagihan -> overdue shop restock -> anggaran lewat limit -> due-soon
// kendaraan -> due-soon piutang/utang -> due-soon tagihan -> due-soon shop
// restock -> warning dana titipan -> warning financial risk -> warning
// zakat). {ok:false, items:[], count:0} kalau
// LifeDashboardSummaryAPI belum dimuat ATAU summary() sendiri {ok:false}
// — bentuk items/count tetap disediakan (array kosong) supaya konsumen
// TIDAK perlu guard tambahan utk kasus gagal (pola sama
// VehicleReminder.summary() yang selalu menyediakan array meski kosong).
getItems() {
  if (typeof LifeDashboardSummaryAPI === 'undefined') {
    return { ok: false, reason: 'LifeDashboardSummaryAPI belum dimuat', items: [], count: 0 };
  }
  const s = LifeDashboardSummaryAPI.summary();
  if (!s.ok) return { ok: false, reason: s.reason, items: [], count: 0 };

  const financeOver = (s.finance && s.finance.ok && s.finance.budget && s.finance.budget.ok && Array.isArray(s.finance.budget.items))
    ? s.finance.budget.items.filter((b) => b.over) : [];
  const vehicleAll = (s.vehicle && s.vehicle.ok && s.vehicle.reminder && Array.isArray(s.vehicle.reminder.all))
    ? s.vehicle.reminder.all : [];
  const vehicleOverdue = vehicleAll.filter((r) => r.severity === 'overdue');
  const vehicleDueSoon = vehicleAll.filter((r) => r.severity === 'due-soon');
  const piutangUtangAll = (s.piutangUtang && Array.isArray(s.piutangUtang.all)) ? s.piutangUtang.all : [];
  const piutangUtangOverdue = piutangUtangAll.filter((r) => r.severity === 'overdue');
  const piutangUtangDueSoon = piutangUtangAll.filter((r) => r.severity === 'due-soon');
  const tagihanAll = (s.tagihan && Array.isArray(s.tagihan.all)) ? s.tagihan.all : [];
  const tagihanOverdue = tagihanAll.filter((r) => r.severity === 'overdue');
  const tagihanDueSoon = tagihanAll.filter((r) => r.severity === 'due-soon');
  const shopRestockAll = (s.shopRestock && Array.isArray(s.shopRestock.all)) ? s.shopRestock.all : [];
  const shopRestockOverdue = shopRestockAll.filter((r) => r.severity === 'overdue');
  const shopRestockDueSoon = shopRestockAll.filter((r) => r.severity === 'due-soon');
  const danaTitipanAll = (s.danaTitipan && Array.isArray(s.danaTitipan.all)) ? s.danaTitipan.all : [];
  const danaTitipanWarning = danaTitipanAll.filter((r) => r.severity === 'warning');
  const financialRiskAll = (s.financialRisk && Array.isArray(s.financialRisk.riskFactors)) ? s.financialRisk.riskFactors : [];
  const zakatAll = (s.zakat && Array.isArray(s.zakat.all)) ? s.zakat.all.filter((r) => r.severity === 'warning') : [];

  const items = [
    ...vehicleOverdue.map((r) => ({ kind: 'vehicle', severity: 'overdue', vehicleType: r.type, message: r.message })),
    ...piutangUtangOverdue.map((r) => ({ kind: 'piutangUtang', severity: 'overdue', piutangUtangType: r.type, name: r.name, message: r.message })),
    ...tagihanOverdue.map((r) => ({ kind: 'tagihan', severity: 'overdue', name: r.name, message: r.message })),
    ...shopRestockOverdue.map((r) => ({ kind: 'shopRestock', severity: 'overdue', name: r.name, message: r.message })),
    ...financeOver.map((b) => ({ kind: 'finance', severity: 'over', name: b.name })),
    ...vehicleDueSoon.map((r) => ({ kind: 'vehicle', severity: 'due-soon', vehicleType: r.type, message: r.message })),
    ...piutangUtangDueSoon.map((r) => ({ kind: 'piutangUtang', severity: 'due-soon', piutangUtangType: r.type, name: r.name, message: r.message })),
    ...tagihanDueSoon.map((r) => ({ kind: 'tagihan', severity: 'due-soon', name: r.name, message: r.message })),
    ...shopRestockDueSoon.map((r) => ({ kind: 'shopRestock', severity: 'due-soon', name: r.name, message: r.message })),
    ...danaTitipanWarning.map((r) => ({ kind: 'danaTitipan', severity: 'warning', message: r.message })),
    ...financialRiskAll.map((r) => ({ kind: 'financialRisk', severity: 'warning', domain: r.domain, message: r.message })),
    ...zakatAll.map((r) => ({ kind: 'zakat', severity: 'warning', zakatType: r.type, jumlah: r.jumlah, message: r.message })),
  ];

  return { ok: true, items, count: items.length };
},

};
