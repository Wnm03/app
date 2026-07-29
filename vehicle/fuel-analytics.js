// fuel-analytics.js — Fuel Analytics (TASK-141, Fuel Intelligence Card).
//
// PRINSIP: UI HANYA presenter. 100% REUSE VehicleFuelTrendSummary.summary()
// (Sesi 81, Batch 7 — sendiri 100% reuse VehicleTrendAPI.monthlyCostTrend()
// utk histori biaya BBM per bulan + VehicleIntelligence.vehicleOverview().fuel
// utk efisiensi saat ini) via FuelIntelligenceEngine.vehicleInsight() (sesi
// ini) — TIDAK ada rumus SUM/rata-rata/kmPerLiter/rpPerKm baru di sini.
// Bar chart digambar dgn div width% sederhana (bukan SVG BBM.svgCostBar()
// punya car-notes.js, yg formatnya beda/khusus form tambah-BBM) — murni
// tampilan, 0 data baru dihitung.
//
// FUEL_ANALYTICS_NAV_TARGETS (Sesi 253 — Batch Vehicle Navigation
// Consistency) — tujuan navigasi ketiga kartu findash-card di _effBlock().
// MURNI DATA (0 logic navigasi baru), format {page,tab,subtab,goTo} SAMA
// PERSIS format target dashHubNavigateToFeature() yang SUDAH ADA
// (dashboard-hub.js). Nama disendirikan per-file supaya tidak bentrok dgn
// const global lain (lihat kasus S251). Ketiganya (efisiensi/biaya-km/
// estimasi-bulan) sama-sama soal BBM kendaraan ini -> Kendaraan > tab BBM >
// bbmList (SAMA PERSIS target 'cn-bbm' di dashboard-hub-registry.js,
// TERVERIFIKASI ADA di index.html/app_production.html).
const FUEL_ANALYTICS_NAV_TARGETS = Object.freeze({
  efficiency: { page: 'carnotes', tab: 'bbm', subtab: 'ringkasan', goTo: 'bbmList' },
  costPerKm: { page: 'carnotes', tab: 'bbm', subtab: 'ringkasan', goTo: 'bbmList' },
  monthlyEst: { page: 'carnotes', tab: 'bbm', subtab: 'ringkasan', goTo: 'bbmList' },
});

const FuelAnalytics = {

// render(vehicleId) — isi #fuelIntelAnalyticsBody dgn ringkasan efisiensi
// saat ini (km/L, Rp/km, estimasi biaya bulanan) + bar tren biaya BBM N
// bulan terakhir. Silent (kosongkan diam-diam) kalau container belum ada.
render(vehicleId) {
  const el = document.getElementById('fuelIntelAnalyticsBody');
  if (!el) return;
  if (typeof FuelIntelligenceEngine === 'undefined') { el.innerHTML = ''; return; }
  const insight = FuelIntelligenceEngine.vehicleInsight(vehicleId);
  if (!insight.ok) {
    el.innerHTML = '<div class="empty"><div class="empty-text">Data kendaraan tidak ditemukan</div></div>';
    return;
  }
  el.innerHTML = this._effBlock(insight.current) + this._trendBlock(insight.trend);
},

_money(n) {
  return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
},

// _effBlock(current) — current = trend.current dari VehicleFuelTrendSummary
// apa adanya (hasil fuelEfficiency() via VehicleIntelligence, 0 recompute).
// S253 (Batch Vehicle Navigation Consistency): ketiga findash-card di sini
// clickable lewat pola SAMA PERSIS presenter lain (VehicleDashboard dst) —
// c.onClick -> u-pointer -> data-action -> data-args, JANGAN openCard(index).
_effBlock(current) {
  if (!current || !current.ok) {
    return '<div class="u-fs12 u-t2" style="margin-bottom:12px">Data efisiensi BBM belum cukup (butuh min. 2 log "Isi Full Tank" dgn km naik).</div>';
  }
  const cards = [
    { icon: '⚡', label: 'Efisiensi', value: `${current.kmPerLiter.toFixed(1)} km/L`, onClick: { action: 'dashHubNavigateToFeature', args: [FUEL_ANALYTICS_NAV_TARGETS.efficiency] } },
    { icon: '💸', label: 'Biaya/KM', value: this._money(current.rpPerKm), onClick: { action: 'dashHubNavigateToFeature', args: [FUEL_ANALYTICS_NAV_TARGETS.costPerKm] } },
  ];
  if (current.estMonthlyCost) {
    cards.push({ icon: '📅', label: 'Estimasi/Bulan', value: this._money(current.estMonthlyCost), onClick: { action: 'dashHubNavigateToFeature', args: [FUEL_ANALYTICS_NAV_TARGETS.monthlyEst] } });
  }
  const cardsHtml = cards.map((c) => `<div class="findash-card${c.onClick ? ' u-pointer' : ''}"${c.onClick ? ` data-action="${escapeHtml(c.onClick.action)}" data-args="${escapeHtml(JSON.stringify(c.onClick.args))}"` : ''}><div class="findash-card-icon">${c.icon}</div><div class="findash-card-body"><div class="findash-card-label">${escapeHtml(c.label)}</div><div class="findash-card-val">${escapeHtml(c.value)}</div></div></div>`).join('');
  return `<div class="findash-grid" style="margin-bottom:12px">${cardsHtml}</div>`;
},

// _trendBlock(trend) — trend = {months, rows, total} dari VehicleFuelTrendSummary
// apa adanya (rows[].total dari VehicleTrendAPI.monthlyCostTrend(type:'fuel'),
// 0 recompute). Bar width% dihitung dari nilai yang sudah ada, bukan rumus baru.
_trendBlock(trend) {
  if (!trend || !trend.rows || !trend.rows.length) {
    return '<div class="u-fs12 u-t2">Belum ada histori biaya BBM.</div>';
  }
  const max = Math.max(...trend.rows.map((r) => r.total), 1);
  const bars = trend.rows.map((r) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div class="u-fs11 u-t2" style="width:56px;flex-shrink:0">${escapeHtml(r.label)}</div>
      <div style="flex:1;background:var(--surface3);border-radius:6px;overflow:hidden;height:16px">
        <div style="width:${Math.round((r.total / max) * 100)}%;height:100%;background:var(--accent4)"></div>
      </div>
      <div class="u-fs11" style="width:84px;flex-shrink:0;text-align:right">${this._money(r.total)}</div>
    </div>`).join('');
  return `<div class="u-fs12 u-t2" style="margin-bottom:8px">Tren Biaya BBM (${trend.months} Bulan Terakhir) — Total ${this._money(trend.total)}</div>${bars}`;
},

};
