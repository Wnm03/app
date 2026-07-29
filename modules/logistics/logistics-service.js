// logistics-service.js — Smart Delivery Engine, Sesi 3/6: facade logistik.
//
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Butuh logistics-engine.js
// (di atas, Sesi 3 ini) sudah dimuat lebih dulu — lihat urutan di
// scripts/build.js.
//
// Kenapa 1 file, bukan 3 (logistics-service.js + logistics-ui.js +
// logistics-modal.js) — lihat RENCANA-SESI-RINGKAS.md bagian "Kenapa
// dipangkas". TIDAK ada modal baru dibikin di sini sama sekali: kalau nanti
// (Sesi 4+) hasil LogisticsService perlu ditampilkan ke user, pemanggilnya
// makai modal generik yang SUDAH ADA di modules/shared/modal-navigasi.js
// (showChoiceModal/askConfirm/showInfoModal dkk) — LogisticsService cuma
// menyediakan data terstruktur + ringkasan teks siap tampil lewat
// formatSummary(), TIDAK merender HTML/DOM apa pun sendiri.
//
// PENTING (Sesi 3 — masih "senyap", sama seperti Sesi 1-2): tidak ada
// wiring otomatis ke modul lain, tidak ada tombol/menu baru. Method di
// bawah baru "hidup" kalau dipanggil eksplisit oleh kode lain (Sesi 4-6).

const LogisticsService = {
  /** planDelivery(ctx) — satu-satunya jalur yang seharusnya dipakai modul
   * lain (Sesi 4-6) buat dapat rencana pengiriman (rute+beban+BBM+harga)
   * — mereka tidak perlu tahu/panggil LogisticsEngine langsung, supaya
   * kalau internal engine berubah nanti, kontrak publik ini tetap sama.
   * Lihat LogisticsEngine.plan() utk bentuk parameter & hasil lengkap. */
  async planDelivery(ctx = {}) {
    return LogisticsEngine.plan(ctx);
  },

  /** optimizeRoute(ctx) — satu-satunya jalur yang seharusnya dipakai modul
   * lain (Sesi 6+) buat urutan rute banyak-pelanggan; lihat
   * LogisticsEngine.optimizeRoute() utk bentuk parameter & hasil lengkap. */
  async optimizeRoute(ctx = {}) {
    return LogisticsEngine.optimizeRoute(ctx);
  },

  /** formatSummary(plan) — rangkai hasil planDelivery() jadi teks ringkas
   * siap ditampilkan lewat modal generik yang sudah ada (mis.
   * showInfoModal(judul, LogisticsService.formatSummary(plan))) — TIDAK
   * menyentuh DOM di sini, murni penyusun string, sama prinsipnya dgn
   * AIService.buildPrompt() di ai-service.js. Baris yang datanya tidak ada
   * (mis. plan.fuel null krn histori BBM belum cukup) otomatis di-skip,
   * bukan ditampilkan sbg "null"/"undefined". */
  formatSummary(plan) {
    if (!plan || typeof plan !== 'object') return 'Belum ada rencana pengiriman.';
    const lines = [];
    if (plan.route) {
      const r = plan.route;
      lines.push(`🚚 Ongkir: ${r.pcs} pcs, metode ${r.metode === 'ambil' ? 'ambil sendiri' : 'diantar'} — Rp${Math.round(r.totalPerPcs)}/pcs`);
    }
    if (plan.load) {
      const l = plan.load;
      lines.push(`📦 Muatan: ${l.totalPcs} pcs ÷ kapasitas ${l.capacityPerTrip}/rit = ${l.trips} kali jalan (≈${l.pcsPerTrip} pcs/rit)`);
    }
    if (plan.fuel) {
      const f = plan.fuel;
      lines.push(`⛽ BBM: ≈${f.kmPerLiter.toFixed(1)} km/liter, Rp${Math.round(f.rpPerKm)}/km`);
    }
    if (plan.price) {
      const p = plan.price;
      lines.push(`🏷️ Rekomendasi harga jual: Rp${Math.round(p.result)} (modal Rp${Math.round(p.modal)} + transport Rp${Math.round(p.transport)}, margin ${p.marginPct}%)`);
    }
    return lines.length ? lines.join('\n') : 'Belum cukup data untuk hitung rencana pengiriman.';
  },

  /** healthCheck() — pemeriksaan integritas ringan, non-invasif (TIDAK
   * memanggil route/load/fuel/price dgn data nyata, cuma cek fungsi &
   * dependensinya tersedia) — pola & tujuan sama dgn AIService.healthCheck()
   * di ai-service.js: cepat tahu kalau ada dependensi (OngkirCalc/PriceReko/
   * estimateRpPerKm) yang belum ter-load krn urutan build.js keliru. */
  async healthCheck() {
    const checks = {
      engineReady: typeof LogisticsEngine !== 'undefined' && typeof LogisticsEngine.plan === 'function',
      ongkirCalcReady: typeof OngkirCalc !== 'undefined' && typeof OngkirCalc.leg === 'function',
      priceRekoReady: typeof PriceReko !== 'undefined' && typeof PriceReko.roundNice === 'function',
      estimateRpPerKmReady: typeof estimateRpPerKm === 'function',
    };
    const ok = checks.engineReady && checks.ongkirCalcReady && checks.priceRekoReady;
    return { ok, checkedAt: new Date().toISOString(), checks };
  },

  // ==========================================================================
  // TAHAP 3 — SMART LOGISTICS ENGINE. Facade tipis, pola PERSIS sama dgn
  // planDelivery()/optimizeRoute() di atas: modul lain panggil lewat
  // LogisticsService (bukan LogisticsEngine langsung) supaya kontrak publik
  // tetap sama kalau internal engine berubah. Belum ada wiring/tombol UI
  // (sesuai blueprint "Belum membuat AI Chat/Simulation/Dashboard/Daily
  // Briefing" — method ini baru "hidup" kalau dipanggil eksplisit).
  // ==========================================================================

  /** vehicleCapacityCheck(ctx) — lihat LogisticsEngine.vehicleCapacityCheck()
   * utk bentuk parameter & hasil lengkap (blueprint Fitur §1). */
  async vehicleCapacityCheck(ctx = {}) {
    return LogisticsEngine.vehicleCapacityCheck(ctx);
  },

  /** fuelCalculator(ctx) — Fitur §5 (blueprint), BEDA dari fuel()/
   * calculateFuel() lama yg baca histori D.vehicles. */
  async fuelCalculator(ctx = {}) {
    return LogisticsEngine.fuelCalculator(ctx);
  },

  /** operationalCost(ctx) — Fitur §6 (blueprint). */
  async operationalCost(ctx = {}) {
    return LogisticsEngine.operationalCost(ctx);
  },

  /** smartOngkir(ctx) — Fitur §7 (blueprint): ongkir mempertimbangkan
   * jarak+berat+volume+jenis kendaraan+biaya operasional+margin. */
  async smartOngkir(ctx = {}) {
    return LogisticsEngine.smartOngkir(ctx);
  },

  /** profitCalculator(ctx) — Fitur §8 (blueprint), breakdown lengkap
   * (penjualan/diskon/ongkir/BBM/operasional/profit bersih/margin%). */
  async profitCalculator(ctx = {}) {
    return LogisticsEngine.profitCalculator(ctx);
  },

  /** deliverySummary(ctx) — Fitur §9 (blueprint), orkestrator akhir §1-§8.
   * Lihat LogisticsEngine.deliverySummary() utk bentuk parameter lengkap. */
  async deliverySummary(ctx = {}) {
    return LogisticsEngine.deliverySummary(ctx);
  },
};

if (typeof window !== 'undefined') {
  window.LogisticsService = LogisticsService;
}
