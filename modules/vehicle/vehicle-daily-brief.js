// modules/vehicle/vehicle-daily-brief.js — Vehicle Daily Brief
// (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleAIHook.fleetSummary() (modules/vehicle/vehicle-ai-hook.js, Sesi
// 79) — TIDAK ada rumus baru, TIDAK menghitung ulang fleet/health/
// reminder, TIDAK membaca D langsung sama sekali. Pola SAMA PERSIS
// AIDailyBriefingCard (ai-chat.js, Sesi 15) — kartu ringkasan 1-2 kalimat,
// SILENT (kosongkan body) kalau tidak ada apa pun buat diceritakan (di
// sini: 0 kendaraan) — beda dari VehicleDashboard/VehicleInsightPresenter
// yang tampilkan empty-state eksplisit, krn Daily Brief posisinya "cerita
// singkat" bukan panel data, jadi lebih pas menghilang kalau kosong (sama
// persis AIDailyBriefingCard saat decisionCount 0 & tidak ada
// deliverySummary).
//
// Dipanggil dari renderCnTab() (modules/shared/modules-render.js) — DIPINDAH dari
// DashboardHub.render() di Sesi 133, live-wiring renderDashboard() DIHAPUS di Sesi 134
// (gap fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134)
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
//
// TASK-151 (Sesi 151B) — Fuel AI Daily Briefing Integration. Dulu di sini
// ada section "Fuel Briefing" 1 kendaraan (dipilih FuelFleetSelector.
// selectVehicle()) yang ditambahkan setelah ringkasan armada.
//
// KONSOLIDASI (Sesi 156d, permintaan eksplisit user): section Fuel
// Briefing itu DIPINDAH ke modules/vehicle/fuel-card.js (FuelCard,
// #fuelIntelWrap) supaya jadi SATU card dgn Fuel Intelligence — dua-duanya
// soal BBM kendaraan aktif, tidak perlu 2 card terpisah yang muncul
// berurutan (#vehBriefWrap lalu #fuelIntelWrap). Lihat catatan konsolidasi
// lengkap di fuel-card.js. Akibatnya: FuelFleetSelector TIDAK lagi dipakai
// sama sekali di file ini (0 import/typeof-check FuelFleetSelector
// tersisa) — #vehBriefBody sekarang HANYA berisi ringkasan armada harian
// (blok di bawah), pola SAMA PERSIS sebelum TASK-151B. FuelFleetSelector
// sendiri TIDAK dihapus (masih dipakai fuel-compare.js) — hanya
// referensinya di file presenter ini yang dicabut.
const VehicleDailyBrief = {

  render() {
    const el = document.getElementById('vehBriefBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof VehicleAIHook === 'undefined') { el.innerHTML = ''; return; }
    const hook = VehicleAIHook.fleetSummary();
    if (!hook.ok) { el.innerHTML = ''; return; }

    const fleet = hook.intelligence.fleet;
    const reminder = hook.reminder;
    if (!fleet || !fleet.totalVehicles) { el.innerHTML = ''; return; }

    const parts = [];
    parts.push(`${fleet.totalVehicles} kendaraan terpantau, skor kesehatan armada ${fleet.avgHealth}/100.`);
    if (fleet.totalOverdue > 0) {
      parts.push(`${fleet.totalOverdue} item servis sudah lewat jatuh tempo.`);
    }
    if (reminder && reminder.total > 0) {
      parts.push(`${reminder.total} reminder aktif${reminder.overdueCount > 0 ? ` (${reminder.overdueCount} lewat jatuh tempo)` : ''}.`);
    } else {
      parts.push('Tidak ada reminder aktif saat ini.');
    }

    const html = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">🚗 Ringkasan Harian Kendaraan</div>`
      + `<div class="u-fs12 u-lh15 u-t2">${escapeHtml(parts.join(' '))}</div>`;

    el.innerHTML = html;
  },

};
