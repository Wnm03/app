// fuel-history.js — Fuel History (TASK-141, Fuel Intelligence Card).
//
// PRINSIP: UI HANYA presenter. 100% REUSE FuelStorage.recent() (sesi ini
// — sendiri 100% reuse D.bbmLogs apa adanya) utk daftar catatan isi BBM
// terbaru. Tap 1 baris membuka bbmModal (BBM.openModal(), car-notes.js,
// SUDAH ADA) utk lihat/edit detail — TIDAK ada form/CRUD baru di sini,
// murni daftar ringkas. Markup reuse class tx-item/tx-icon/tx-info/
// tx-name/tx-meta/tx-amount (SUDAH ADA, dipakai BBM.renderList() sendiri)
// apa adanya — 0 class CSS baru.
const FuelHistory = {

// render(vehicleId) — isi #fuelIntelHistoryList dengan sampai 8 catatan
// BBM terbaru kendaraan ini. Silent (kosongkan diam-diam) kalau container
// belum ada di halaman (pola sama persis presenter lain di project ini).
render(vehicleId) {
  const el = document.getElementById('fuelIntelHistoryList');
  if (!el) return;
  if (typeof FuelStorage === 'undefined') { el.innerHTML = ''; return; }
  const rows = FuelStorage.recent(vehicleId, 8);
  if (!rows.length) {
    el.innerHTML = '<div class="empty"><div class="empty-text">Belum ada catatan BBM</div></div>';
    return;
  }
  el.innerHTML = rows.map((b) => this._row(b)).join('');
},

// _row(b) — 1 baris riwayat, format & data-action SAMA PERSIS baris
// BBM.renderList() (car-notes.js) supaya tap-nya membuka modal edit yang
// sama, cuma daftarnya lebih ringkas (8 terbaru, tanpa pagination/hapus
// inline — hapus/edit didelegasikan ke bbmModal yang terbuka).
_row(b) {
  const money = (typeof fmt === 'function') ? fmt(b.cost) : ('Rp ' + Math.round(b.cost || 0));
  const km = (b.km != null) ? b.km.toLocaleString('id-ID') + ' km' : '(km tidak dicatat)';
  return `<div class="tx-item u-pointer" data-action="openBbmModal" data-args="${escapeHtml(JSON.stringify([b.id]))}">
    <div class="tx-icon" style="background:var(--accent4-soft)">⛽</div>
    <div class="tx-info"><div class="tx-name">${km} · ${b.liter}L</div><div class="tx-meta">${escapeHtml(b.date)}${b.spbu ? ' · ' + escapeHtml(b.spbu) : ''}${b.fullTank ? ' · Full Tank' : ' · Isi sebagian'}</div></div>
    <div class="tx-amount red">${money}</div>
  </div>`;
},

};
