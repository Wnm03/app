// modules/cross/unified-briefing-presenter.js — Finance & Vehicle
// Dashboard Briefing Presenter (Sesi 88, Batch 8). Lihat docs/BATCH_PLAN.md
// § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// UnifiedAIBriefing.generate() (modules/cross/unified-ai-briefing.js, sesi
// ini) — TIDAK ada rumus baru, TIDAK menyusun teks di file ini, TIDAK
// membaca D langsung sama sekali. Pola SAMA PERSIS VehicleDailyBrief
// (Sesi 80)/AIDailyBriefingCard (ai-chat.js, Sesi 15) — kartu ringkasan
// SILENT (body dikosongkan) kalau tidak ada apa pun buat diceritakan,
// TANPA empty-state eksplisit (beda dari CrossDashboardCard/
// FinanceDashboard/VehicleDashboard yang tampilkan empty-state
// eksplisit, krn Daily Briefing posisinya "cerita singkat" bukan panel
// data).
//
// Dipanggil dari DashboardHub.render() & live-wiring renderDashboard()
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
//
// WIRING S111 (Batch 13) — AI Daily Briefing Integration (Finance+Vehicle):
// render() sekarang JUGA menulis ke container kedua #aiUnifiedBriefBody
// (kartu "🧭 Penasihat" > tab "🩺 Insight Cepat" di ai-chat.js, DI BAWAH
// #aiStatusBody), supaya briefing finance+vehicle yang SAMA (satu kali
// UnifiedAIBriefing.generate(), TIDAK dipanggil dua kali) tampil juga di
// AI Chat/Penasihat, bukan cuma Dashboard Hub. #crossBriefBody TETAP diisi
// persis seperti sebelumnya (0 perubahan perilaku Dashboard Hub) — 0
// container baru di Dashboard Hub, 0 rumus baru, 0 pemanggilan generate()
// tambahan. Kedua container SILENT independen (masing-masing dikosongkan
// kalau tidak ada apa pun buat diceritakan, atau kalau container itu
// sendiri tidak ada di halaman yang sedang aktif).
//
// Catatan scope: "Daily Insight Feed" (salah satu target sesi ini) 100%
// REUSE CrossInsightPresenter (modules/cross/cross-insight-presenter.js,
// Sesi 87) apa adanya — modul itu SUDAH PERSIS "feed insight harian
// gabungan finance+vehicle" (reuse FinanceIntelligence.insights()+
// VehicleIntelligence.insights(), container #crossInsightBody, sudah
// wired ke DashboardHub.render()/renderDashboard() sejak Sesi 87). Modul
// baru KEDUA yang isinya ulang list-insight yang sama akan jadi duplicate
// logic (dilarang WAJIB sesi ini) — jadi TIDAK ada file/container feed
// baru utk deliverable ini, murni reuse yang sudah ada.
const UnifiedBriefingPresenter = {

  render() {
    const el = document.getElementById('crossBriefBody');
    const chatEl = document.getElementById('aiUnifiedBriefBody');
    if (!el && !chatEl) return; // tidak ada container manapun di halaman ini, aman diam2.

    const clear = () => { if (el) el.innerHTML = ''; if (chatEl) chatEl.innerHTML = ''; };

    if (typeof UnifiedAIBriefing === 'undefined') { clear(); return; }
    const briefing = UnifiedAIBriefing.generate();
    if (!briefing.ok) { clear(); return; }

    // S702 (fitur collapse, permintaan eksplisit user): judul "📋
    // Ringkasan Harian Finance & Vehicle" DIPINDAH ke markup statis
    // (.dashhub-cat-head) KHUSUS utk #crossBriefBody (kartu "Cross
    // Brief" di Dashboard Hub) supaya card itu bisa collapse (tap
    // header) — 100% reuse toggleCardCollapse(), 0 rumus baru.
    // #aiUnifiedBriefBody (kartu "🧭 Penasihat" di ai-chat.js, BUKAN
    // Dashboard Hub, TIDAK collapsible) TETAP dapat versi lengkap dgn
    // judul di dalamnya seperti sebelumnya — 0 perubahan tampilan di
    // sana, generate() TETAP dipanggil SATU KALI seperti sebelumnya.
    const bodyOnlyHtml = `<div class="u-fs12 u-lh15 u-t2">${escapeHtml(briefing.text)}</div>`;
    const fullHtml = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">📋 Ringkasan Harian Finance &amp; Vehicle</div>`
      + bodyOnlyHtml;
    if (el) el.innerHTML = bodyOnlyHtml;
    if (chatEl) chatEl.innerHTML = fullHtml;
  },

};
