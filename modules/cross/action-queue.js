// modules/cross/action-queue.js — Action Queue (Sesi 90, Batch 8). Target
// sesi: Personal Decision Center Foundation.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// DecisionCenterAPI.summary() (modules/cross/decision-center-api.js,
// sesi ini) -> s.priorityItems (item PriorityEngine.getItems() apa
// adanya, sudah terurut overdue kendaraan -> anggaran lewat limit ->
// due-soon kendaraan) — TIDAK ada rumus/urutan baru di file ini, TIDAK
// membaca D/LifeDashboardSummaryAPI/PriorityEngine langsung.
//
// Beda scope dgn LifePriorityPanel: LifePriorityPanel tampil sbg "panel
// perhatian" (rows tanpa nomor, di section Personal Life Dashboard,
// Sesi 89) — Action Queue di sini tampil sbg "antrean tindakan bernomor"
// (rows diberi nomor urut 1..N + judul jumlah total, di section Personal
// Decision Center, Sesi 90) — MURNI beda presentasi atas ITEM yang SAMA
// PERSIS dari PriorityEngine.getItems() (0 filter/urutan baru), pola
// sama dgn cara CrossDashboardCard & UnifiedAIBriefing sama-sama
// membaca ulang counter mentah yang sama (budget.overCount/reminder.
// overdueCount) utk 2 bentuk tampilan berbeda (kartu angka vs kalimat).
//
// Pola SILENT sama persis LifePriorityPanel — body dikosongkan kalau
// tidak ada item.
//
// Dipanggil dari DecisionCenterHome.render() (modules/cross/
// decision-center-home.js, sesi ini) — TIDAK ada mekanisme render baru.
//
// WIRING S115 — ActionQueue Public API Integration: getQueue()
// ditambahkan sbg SATU pintu masuk DATA publik (dipisah dari render()),
// 100% reuse DecisionCenterAPI.summary().priorityItems apa adanya (0
// sorting/filtering/mapping/komputasi baru — pola SAMA PERSIS
// RecommendationPanel.getRecommendations(), S114/Batch 13). render()
// sendiri direfaktor supaya memanggil getQueue() ini (bukan
// DecisionCenterAPI.summary() langsung), jadi HANYA ADA SATU tempat yang
// tahu cara ambil priorityItems — dipakai bareng oleh render()
// (DashboardHub, TIDAK berubah perilaku), UnifiedAIBriefing (generate(),
// unified-ai-briefing.js) & AI Chat (actionQueueChatContext(),
// ai-chat.js) — TIDAK ada API baru di layer manapun di bawah ActionQueue,
// TIDAK ada duplikasi transformasi data.
const ActionQueue = {

  // _vehicleIcon(type) — pemetaan tipe reminder ke emoji, duplikasi
  // kecil disengaja dari LifePriorityPanel._vehicleIcon() — scope
  // sempit murni presentasional, pola sama persis catatan Option (C)
  // LifeOS Life Object jump-to-source (lihat komentar
  // life-priority-panel.js).
  _vehicleIcon(type) {
    return { service: '🔧', tax: '📋', fuel: '⛽' }[type] || '⛔';
  },

  // _label(item) — teks 1 item, MURNI pemetaan field yang SUDAH FINAL
  // dari PriorityEngine.getItems() (item.name utk finance, item.message
  // apa adanya utk vehicle) — TIDAK ada logic keputusan.
  _label(item) {
    return item.kind === 'finance'
      ? `Anggaran "${escapeHtml(item.name)}" sudah melebihi limit.`
      : escapeHtml(item.message);
  },

  // getQueue() — Action Queue Data API (S115). 100% reuse
  // DecisionCenterAPI.summary().priorityItems apa adanya, 0 sorting/
  // filtering/mapping/komputasi baru — murni dipindah dari body render()
  // (dulu inline) supaya bisa dipakai ulang oleh konsumen non-DOM
  // (UnifiedAIBriefing, AI Chat). {ok:false, priorityItems:[]} kalau
  // DecisionCenterAPI belum dimuat ATAU summary() sendiri {ok:false}/
  // priorityItems bukan array (pola guard sama persis
  // RecommendationPanel.getRecommendations()).
  getQueue() {
    if (typeof DecisionCenterAPI === 'undefined') return { ok: false, priorityItems: [] };
    const s = DecisionCenterAPI.summary();
    if (!s.ok || !Array.isArray(s.priorityItems)) return { ok: false, priorityItems: [] };
    return { ok: true, priorityItems: s.priorityItems };
  },

  render() {
    const el = document.getElementById('actionQueueBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    const { ok, priorityItems } = this.getQueue();
    if (!ok || !priorityItems.length) {
      el.innerHTML = '';
      return;
    }

    const rows = priorityItems.map((item, idx) => {
      const icon = item.kind === 'finance' ? '💰' : this._vehicleIcon(item.vehicleType);
      return `
      <div class="u-fs12 u-lh15 u-t2 u-mb6" style="border-left:3px solid var(--accent4);padding-left:8px;">
        ${idx + 1}. ${icon} ${this._label(item)}
      </div>
    `;
    }).join('');

    el.innerHTML = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">🗂️ Antrean Tindakan (${priorityItems.length})</div>`
      + rows;
  },

};
