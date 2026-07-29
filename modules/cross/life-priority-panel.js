// modules/cross/life-priority-panel.js — Priority Panel (Sesi 89, Batch
// 8, direfaktor Sesi 90 — Personal Decision Center Foundation). Lihat
// docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// PriorityEngine.getItems() (modules/cross/priority-engine.js, Sesi 90 —
// sendiri 100% reuse LifeDashboardSummaryAPI.summary()) — TIDAK ada
// rumus/skoring baru, TIDAK memfilter s.finance/s.vehicle sendiri lagi
// (filter+urutan SEKARANG hidup di PriorityEngine, dipindah dari sini
// Sesi 90 supaya TIDAK duplicate logic dgn DecisionCenterAPI yang sesi
// ini juga konsumsi PriorityEngine yang sama — lihat komentar
// priority-engine.js § CATATAN REFAKTOR).
//
// Pola SILENT-kalau-kosong sama persis sebelumnya (& VehicleAlertPanel)
// — panel ini murni "hal yang perlu perhatian SEKARANG", tidak nambah
// ruang kosong kalau tidak ada.
//
// Dipanggil dari UnifiedDashboardHome.render() (modules/cross/
// unified-dashboard-home.js) — TIDAK ada mekanisme render baru.
const LifePriorityPanel = {

  // _vehicleIcon(type) — pemetaan tipe reminder ('service'/'tax'/'fuel')
  // ke emoji, MURNI presentasional (pola sama persis VehicleAlertPanel.
  // _icon(), tipe itu sendiri sudah ada di tiap item PriorityEngine.
  // getItems() — duplikasi kecil disengaja, scope sempit, sama pola dgn
  // Option (C) LifeOS Life Object jump-to-source).
  _vehicleIcon(type) {
    return { service: '🔧', tax: '📋', fuel: '⛽' }[type] || '⛔';
  },

  // _row(item) — 1 baris presentasi dari 1 item PriorityEngine.getItems()
  // apa adanya (kind/severity/message/name sudah final dari layer
  // bawah), MURNI pemetaan ke markup — TIDAK ada logic keputusan.
  _row(item) {
    if (item.kind === 'finance') {
      return `
      <div class="u-fs12 u-lh15 u-t2 u-mb6" style="border-left:3px solid var(--accent4);padding-left:8px;">
        💰 Anggaran "${escapeHtml(item.name)}" sudah melebihi limit.
      </div>
    `;
    }
    const color = item.severity === 'overdue' ? 'var(--accent4)' : 'var(--accent3)';
    return `
      <div class="u-fs12 u-lh15 u-t2 u-mb6" style="border-left:3px solid ${color};padding-left:8px;">
        ${this._vehicleIcon(item.vehicleType)} ${escapeHtml(item.message)}
      </div>
    `;
  },

  render() {
    const el = document.getElementById('lifePriorityBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof PriorityEngine === 'undefined') { el.innerHTML = ''; return; }
    const p = PriorityEngine.getItems();
    if (!p.ok || !p.items.length) { el.innerHTML = ''; return; }

    const rows = p.items.map((item) => this._row(item)).join('');

    el.innerHTML = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">📌 Prioritas Hidup Pribadi</div>`
      + rows;
  },

};
