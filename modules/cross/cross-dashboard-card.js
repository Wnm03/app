// modules/cross/cross-dashboard-card.js — Finance & Vehicle Unified
// Dashboard Card (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// CrossAIHook.getAIHook() (modules/cross/cross-ai-hook.js, sesi ini) —
// TIDAK ada rumus baru, TIDAK menghitung ulang health score/fleet
// summary/reminder, TIDAK membaca D langsung sama sekali (pola sama
// persis VehicleDashboard/VehicleInsightPresenter — 0 pembacaan D
// tambahan, beda dari FinanceDashboard._netWorthCard()).
//
// Satu-satunya aritmatika di file ini adalah PENJUMLAHAN 2 counter yang
// SUDAH ADA (budget.overCount milik FinanceIntelligence.budgetSummary() +
// reminder.overdueCount milik VehicleReminder.summary(), keduanya dibaca
// APA ADANYA dari hook) utk kartu "Total Perhatian Gabungan" — pola sama
// persis VehicleReminder.summary() sendiri yg menjumlah overdueCount+
// dueSoonCount+infoCount jadi total; BUKAN rumus/skoring baru, murni
// penjumlahan counter existing lintas-domain.
//
// Dipanggil dari DashboardHub.render() & live-wiring renderDashboard()
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru —
// pola SAMA PERSIS VehicleDashboard.render()/FinanceDashboard.render().
//
// CSS: 1 class baru `.findash-card-sub-link` (styles.css) — reuse penuh
// sisanya dari .findash-grid/.findash-card* (Sesi 75) apa adanya.
//
// KLIK->SUMBER (Sesi 691, lanjutan AUDIT-RENCANA-kartu-klik-ke-sumber-
// v1503.md GAP #2): _combinedAttentionCard menggabung 2 counter dari 2
// domain BEDA (budget Keuangan + reminder Kendaraan) jadi 1 angka --
// beda dari 4 kartu FinanceDashboard (S690) yang tiap kartu = 1 sumber,
// klik 1x ke 1 tujuan sudah cukup mewakili. Keputusan produk (dipilih
// user, bukan Architect call sesi ini): PECAH baris `sub` jadi 2 SPAN
// terpisah yang MASING-MASING clickable ke sumbernya sendiri (bukan 1
// klik ke tujuan dominan/gabungan) -- kartu (`.findash-card`) SENDIRI
// TETAP TIDAK clickable (beda dari FinanceDashboard/VehicleDashboard,
// yang clickable di level div terluar), cuma 2 span di baris `sub` yang
// carry `data-action`/`data-args`. Ini AMAN dipakai bareng dispatcher
// generik `_dataActionClickHandler` (features-helpers-global-security.js)
// yang pakai `e.target.closest('[data-action]')` -- closest() otomatis
// berhenti di span terdekat duluan sebelum naik ke div kartu, jadi 0
// perubahan ke dispatcher, 0 stopPropagation baru dibutuhkan (div kartu
// memang sengaja tidak diberi data-action sama sekali).
// Target navigasi REUSE PENUH const yang SUDAH ADA di file lain (0
// duplikat literal target): `FINANCE_DASHBOARD_CARD_NAV_TARGETS.budget`
// (finance-dashboard.js, S690) & `VEHICLE_DASHBOARD_NAV_TARGETS.service`
// (vehicle-dashboard.js, S253) -- urutan load scripts/build.js SUDAH
// menjamin kedua file itu load SEBELUM cross-dashboard-card.js (baris
// 567/657 vs 831), jadi kedua const ini pasti sudah ada sbg global saat
// file ini jalan di app sungguhan. Guard `typeof ... !== 'undefined'`
// tetap dipasang (pola sama `typeof CrossAIHook==='undefined'` di
// render()) utk kasus file ini di-load sendirian (headless/test) --
// kalau target belum ada, span tetap tampil TAPI TANPA onClick (teks
// biasa, bukan crash, bukan duplikat objek target).
const CrossDashboardCard = {

  render() {
    const el = document.getElementById('crossDashGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof CrossAIHook === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data cross summary belum tersedia</div></div>';
      return;
    }
    const hook = CrossAIHook.getAIHook();
    if (!hook.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data cross summary belum tersedia</div></div>';
      return;
    }

    // FIX DEDUP (lihat DASHBOARD-DEDUP.md § CrossDashboardCard): kartu
    // "Skor Kesehatan Finansial" & "Skor Kesehatan Armada" DIHAPUS dari
    // output di sini — keduanya 100% duplikat dengan kartu yang SUDAH
    // tampil di FinanceDashboard (tab Keuangan, #findashWrap) &
    // VehicleDashboard (tab Car Notes, #vehdashWrap), yang membaca sumber
    // data PERSIS SAMA (FinanceIntelligence.healthScore()/
    // VehicleIntelligence.fleetSummary() lewat CrossAIHook.getAIHook()).
    // _financeHealthCard()/_vehicleHealthCard() TETAP ada di bawah (tidak
    // dihapus, biar tidak ada breaking change kalau ada pemanggil lain di
    // masa depan) — cuma tidak lagi dipanggil dari render(). Yang tersisa
    // di tab Insight cuma "Total Perhatian Gabungan", satu-satunya angka
    // di kartu ini yang memang BELUM ada di kartu manapun (gabungan
    // budget lewat batas + servis/pajak/BBM lewat jatuh tempo).
    const cards = [
      this._combinedAttentionCard(hook.finance, hook.vehicle),
    ];

    el.innerHTML = cards.map((c) => `
      <div class="findash-card">
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
          ${this._renderSub(c)}
        </div>
      </div>
    `).join('');
  },

  // _renderSub(c) — baris `sub` findash-card. Kalau `c.subParts` ada
  // (kartu gabungan lintas-domain, S691), render tiap bagian sbg SPAN
  // terpisah yang carry data-action/data-args sendiri kalau `p.onClick`
  // ada (kalau tidak, span polos tanpa class link -- fallback aman).
  // Kalau tidak, fallback ke `c.sub` string biasa (perilaku LAMA, 0
  // breaking change utk _financeHealthCard()/_vehicleHealthCard()).
  _renderSub(c) {
    if (c.subParts) {
      const parts = c.subParts.map((p, i) => {
        const attrs = p.onClick
          ? ` data-action="${escapeHtml(p.onClick.action)}" data-args="${escapeHtml(JSON.stringify(p.onClick.args))}"`
          : '';
        const cls = p.onClick ? ' findash-card-sub-link' : '';
        return `${i > 0 ? ' &middot; ' : ''}<span class="${cls.trim()}"${attrs}>${escapeHtml(p.text)}</span>`;
      }).join('');
      return `<div class="findash-card-sub">${parts}</div>`;
    }
    return c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : '';
  },

  // _financeHealthCard(finance) — finance = CrossAIHook.getAIHook().finance
  // (hasil FinanceDashboard.getAIHook() apa adanya). score/label dari
  // FinanceIntelligence.healthScore() — 0 recompute di sini, pola sama
  // persis _healthCard() milik FinanceDashboard sendiri.
  _financeHealthCard(finance) {
    const hs = finance && finance.ok && finance.healthScore;
    if (!hs) {
      return { icon: '❤️', label: 'Skor Kesehatan Finansial', value: '—', cls: '' };
    }
    const cls = hs.score >= 80 ? 'green' : hs.score >= 60 ? '' : hs.score >= 40 ? 'orange' : 'red';
    return { icon: '❤️', label: 'Skor Kesehatan Finansial', value: `${hs.score}/100`, cls, sub: hs.label };
  },

  // _vehicleHealthCard(vehicle) — vehicle = CrossAIHook.getAIHook().vehicle
  // (hasil VehicleAIHook.fleetSummary() apa adanya). avgHealth dari
  // VehicleIntelligence.fleetSummary() — 0 recompute di sini, pola sama
  // persis _healthCard() milik VehicleDashboard sendiri.
  _vehicleHealthCard(vehicle) {
    const fleet = vehicle && vehicle.ok && vehicle.intelligence && vehicle.intelligence.fleet;
    if (!fleet || !fleet.totalVehicles) {
      return { icon: '🚗', label: 'Skor Kesehatan Armada', value: '—', cls: '' };
    }
    const score = fleet.avgHealth;
    const cls = score >= 80 ? 'green' : score >= 60 ? '' : score >= 40 ? 'orange' : 'red';
    return { icon: '🚗', label: 'Skor Kesehatan Armada', value: `${score}/100`, cls, sub: `${fleet.totalVehicles} kendaraan` };
  },

  // _combinedAttentionCard(finance, vehicle) — penjumlahan MURNI 2 counter
  // yang SUDAH ADA (lihat catatan header file): budget.overCount
  // (FinanceIntelligence.budgetSummary()) + reminder.overdueCount
  // (VehicleReminder.summary()). 0 threshold/skoring baru — kalau salah
  // satu sisi belum ok, dianggap 0 dari sisi itu (pola guard sama persis
  // fleetSummary()/getAIHook() lain di file ini).
  //
  // subParts (S691, lihat catatan header file § KLIK->SUMBER): 2 bagian
  // klik terpisah, BUKAN 1 onClick gabungan di level kartu. Target
  // REUSE 100% const yang sudah ada di file lain, 0 literal baru.
  _combinedAttentionCard(finance, vehicle) {
    const budgetOver = (finance && finance.ok && finance.budget && finance.budget.ok) ? (finance.budget.overCount || 0) : 0;
    const vehicleOverdue = (vehicle && vehicle.ok && vehicle.reminder) ? (vehicle.reminder.overdueCount || 0) : 0;
    const total = budgetOver + vehicleOverdue;
    const budgetTarget = (typeof FINANCE_DASHBOARD_CARD_NAV_TARGETS !== 'undefined') ? FINANCE_DASHBOARD_CARD_NAV_TARGETS.budget : null;
    const serviceTarget = (typeof VEHICLE_DASHBOARD_NAV_TARGETS !== 'undefined') ? VEHICLE_DASHBOARD_NAV_TARGETS.service : null;
    return {
      icon: '⚠️',
      label: 'Total Perhatian Gabungan',
      value: String(total),
      cls: total > 0 ? 'orange' : 'green',
      subParts: [
        {
          text: `${budgetOver} anggaran lewat batas`,
          onClick: budgetTarget ? { action: 'dashHubNavigateToFeature', args: [budgetTarget] } : null,
        },
        {
          text: `${vehicleOverdue} servis/pajak/BBM lewat jatuh tempo`,
          onClick: serviceTarget ? { action: 'dashHubNavigateToFeature', args: [serviceTarget] } : null,
        },
      ],
    };
  },

};
