// modules/finance/cashflow-projection-settings.js — Cash Flow Projection
// Settings (lanjutan Sesi 93/Batch 10 — CashFlowProjectionAPI/Presenter).
//
// LATAR: kartu "🏦 Proyeksi Saldo Kas" (CashFlowProjectionPresenter) selama
// ini SELALU pakai jendela tagihan tetap 30 hari ke depan
// (computeCashflowForecast(), tx-list-cashflow.js) — tidak cocok utk
// tagihan yang siklus penagihannya potong di TENGAH bulan (mis. kartu
// kredit/listrik pascabayar: tagihan jatuh tempo tgl 1-15 sebenarnya masih
// bagian dari siklus pemakaian yang MULAI tgl 16 bulan sebelumnya, bukan
// bulan kalender berjalan). Modul ini murni PENYIMPANAN preferensi user
// (rentang bulan rata-rata, filter akun, mode jendela tagihan) — 0 rumus
// proyeksi baru di sini, itu tetap 100% tanggung jawab
// computeCashflowForecast() (lihat parameter opsional `opts` di sana,
// tx-list-cashflow.js).
//
// Disimpan di D.profile.cashflowProjSettings (pola sama persis
// D.profile.aiFinanceOverspendThresholdPct dkk di tx-list-cashflow.js) —
// TIDAK ada struktur data baru di luar D.profile, jadi otomatis ikut
// backup/restore yang sudah ada.
//
// Default (CASHFLOW_PROJ_SETTINGS_DEFAULT) SENGAJA identik dgn perilaku
// LAMA computeCashflowForecast() sebelum sesi ini (months:null -> fallback
// BudgetReko, accountId:'semua' -> totalSaldoAkun(), billWindowMode:
// '30hari' -> jendela 30 hari) — user yang belum pernah buka panel "⚙️
// Atur" TIDAK akan melihat perubahan angka sama sekali.
const CASHFLOW_PROJ_SETTINGS_DEFAULT = Object.freeze({
  months: null,              // null = otomatis (BudgetReko.effectiveMonths())
  accountId: 'semua',        // 'semua' atau id 1 akun spesifik
  billWindowMode: '30hari',  // '30hari' | 'kalender' | 'siklus'
  cycleStartDay: 16,         // dipakai kalau billWindowMode==='siklus' (1-28)
});

const CashflowProjSettings = {

  // get() — balikin setting AKTIF (tersimpan digabung dgn default utk field
  // yang belum pernah diisi user, mis. setelah update app nambah field
  // baru). Guard typeof D: aman dipanggil sebelum D ke-load (headless test).
  get() {
    const saved = (typeof D !== 'undefined' && D.profile && D.profile.cashflowProjSettings) || {};
    return Object.assign({}, CASHFLOW_PROJ_SETTINGS_DEFAULT, saved);
  },

  // set(partial) — merge partial ke setting tersimpan (bukan replace penuh,
  // supaya panel bisa nyimpan 1 field per interaksi tanpa perlu selalu kirim
  // semua field), invalidate cache computeCashflowForecast() supaya kartu
  // langsung kebaca ulang dgn setting baru, lalu save() persist ke
  // localStorage. Diam2 no-op (balikin get() apa adanya) kalau D.profile
  // belum ada (headless test) -- tidak throw.
  set(partial) {
    if (typeof D === 'undefined' || !D.profile) return this.get();
    const merged = Object.assign({}, this.get(), partial || {});
    D.profile.cashflowProjSettings = merged;
    if (typeof invalidateCashflowForecastCache === 'function') invalidateCashflowForecastCache();
    if (typeof save === 'function') save();
    return merged;
  },

  // reset() — hapus override tersimpan, balik ke default (pola sama
  // resetKeuFilter() di filter-laporan.js).
  reset() {
    if (typeof D !== 'undefined' && D.profile) delete D.profile.cashflowProjSettings;
    if (typeof invalidateCashflowForecastCache === 'function') invalidateCashflowForecastCache();
    if (typeof save === 'function') save();
    return this.get();
  },

  // isCustomized() — dipakai presenter utk nampilin badge/indikator kecil di
  // tombol "⚙️ Atur" kalau user sudah pernah ubah dari default (murni
  // presentasi, 0 kalkulasi baru — sekadar bandingkan ke default).
  isCustomized() {
    const s = this.get();
    return Object.keys(CASHFLOW_PROJ_SETTINGS_DEFAULT).some((k) => s[k] !== CASHFLOW_PROJ_SETTINGS_DEFAULT[k]);
  },

  defaults() {
    return Object.assign({}, CASHFLOW_PROJ_SETTINGS_DEFAULT);
  },

};
