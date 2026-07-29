// fuel-dashboard.js — Fuel Dashboard (TASK-150, Fuel Dashboard Integration).
// + Export Fuel Dashboard (TASK-155A, exportVehicleHTML()/exportVehicleJSON(),
// lihat blok "TASK-155A: Export (Single Vehicle)" di bawah).
//
// PRINSIP: UI HANYA presenter, 0 rumus/skoring baru. 100% REUSE:
//   - FuelInsightEngine.getSummary(vehicleId) (TASK-149/150A) -> healthScore/
//     fuel (bar/liter/persen/reserve)/highestInsight SEMUA dibaca APA
//     ADANYA, 0 kalkulasi ulang di sini.
//   - FuelModal.open()/FuelBarCorrection.open() (SUDAH ADA, TASK-141/144)
//     -> CTA "Lihat Detail"/"⚙️ Koreksi", pola SAMA PERSIS fuel-card.js.
//   - Class CSS SUDAH ADA (dashhub-cat-head/dashhub-cat-icon/
//     dashhub-cat-label/dashhub-cat-desc/btn/btn-ghost/btn-sm/btn-row/
//     chip-btn) — 0 CSS baru ditulis.
//   - Vehicle switcher (multi-kendaraan) pakai pola chip yang SAMA PERSIS
//     renderDashServisVehChips() (modules-render.js) — 0 komponen switcher
//     baru dibuat dari nol.
//
// TIDAK disentuh sama sekali (sesuai batasan TASK-150): FuelInsightEngine,
// FuelFleetSelector — dashboard ini mengelola kendaraan aktifnya SENDIRI
// (this.curVehicleId, pola sama persis FuelModal.curVehicleId/
// FuelBarCorrection.curVehicleId, SUDAH ADA) supaya tidak perlu mengubah
// FuelFleetSelector ataupun variabel global curVehicleId (dipakai tab Car
// Notes) sama sekali. 0 storage baru (tidak menulis ke D).
//
// KONTRAK render(vehicleId?): vehicleId opsional. Kalau tidak diberikan,
// pakai this.curVehicleId (kendaraan terakhir dipilih di dashboard ini)
// atau curVehicleId global (kendaraan aktif Car Notes, SUDAH ADA) sbg
// default, pola sama persis FuelModal.open()/FuelBarCorrection.open().
// Kalau vehicleId yang diminta tidak ditemukan di D.vehicles ("Invalid
// vehicle"), fallback ke kendaraan pertama (BUKAN menyembunyikan dashboard
// begitu saja) — supaya dashboard tetap berguna walau caller memberi id
// yang sudah tidak valid (mis. kendaraan baru saja dihapus). Dashboard
// disembunyikan (wrap.style.display='none') HANYA kalau: (a) 0 kendaraan
// sama sekali ("No vehicle"), atau (b) FuelInsightEngine belum dimuat, atau
// (c) FuelInsightEngine.getSummary() balikin {ok:false} utk SEMUA kendaraan
// yang dicoba (harusnya tidak pernah terjadi selama D.vehicles konsisten,
// tapi dijaga TIDAK PERNAH throw ke pemanggil).
const FuelDashboard = {

curVehicleId: null,

_vehicles() {
  return (typeof D !== 'undefined' && Array.isArray(D.vehicles)) ? D.vehicles : [];
},

// render(vehicleId?) — API publik satu-satunya utk menggambar dashboard.
// Dipanggil dari modules/shared/modules-render.js (renderCnTab(), pola
// sama persis FuelCard.render()) & FuelBarCorrection.save() (refresh
// setelah koreksi bar tersimpan).
render(vehicleId) {
  const wrap = document.getElementById('fuelDashWrap');
  const body = document.getElementById('fuelDashBody');
  if (!wrap || !body) return;

  const vehicles = this._vehicles();
  if (!vehicles.length) { wrap.style.display = 'none'; return; }
  if (typeof FuelInsightEngine === 'undefined' || typeof FuelInsightEngine.getSummary !== 'function') {
    wrap.style.display = 'none';
    return;
  }

  // Tentukan kendaraan aktif: parameter -> state dashboard sendiri ->
  // curVehicleId global (kendaraan aktif Car Notes, SUDAH ADA) -> fallback
  // kendaraan pertama kalau semuanya tidak valid/tidak ada di D.vehicles
  // ("Invalid vehicle" case — TIDAK menyembunyikan dashboard begitu saja).
  let vid = vehicleId || this.curVehicleId || (typeof curVehicleId !== 'undefined' ? curVehicleId : null);
  if (!vid || !vehicles.find((v) => v.id === vid)) vid = vehicles[0].id;

  let summary;
  try {
    summary = FuelInsightEngine.getSummary(vid);
  } catch (e) {
    wrap.style.display = 'none';
    return;
  }
  if (!summary || !summary.ok) {
    wrap.style.display = 'none';
    return;
  }

  this.curVehicleId = vid;
  wrap.style.display = '';
  body.innerHTML = this._body(vid, vehicles, summary);
},

// switchVehicle(vehicleId) — dipanggil dari tap chip kendaraan (data-action,
// lihat _vehicleChips()). Murni delegasi ke render() dgn vehicleId baru —
// 0 logic baru, supaya perilaku "kendaraan tidak ditemukan"/dsb konsisten
// dgn render() langsung.
switchVehicle(vehicleId) {
  this.render(vehicleId);
},

// _vehicleChips(vehicles, activeId) — switcher multi-kendaraan, pola SAMA
// PERSIS renderDashServisVehChips() (modules-render.js, SUDAH ADA) — 0
// komponen chip baru. Disembunyikan kalau cuma 1 kendaraan (Single
// vehicle case — tidak ada yang perlu di-switch).
_vehicleChips(vehicles, activeId) {
  if (vehicles.length < 2) return '';
  return `<div class="u-flex u-gap6 u-mb10" style="overflow-x:auto;padding-bottom:2px">`
    + vehicles.map((v) => `<button type="button" class="chip-btn${v.id === activeId ? ' active' : ''}" data-action="FuelDashboard.switchVehicle" data-args="${escapeHtml(JSON.stringify([v.id]))}">${escapeHtml(v.emoji ? v.emoji + ' ' : '')}${escapeHtml(v.name)}</button>`).join('')
    + `</div>`;
},

// _priorityColor(priority) — mapping tampilan murni (bukan rumus/skoring
// baru), pola sama persis statusCls di fuel-card.js (overdue->red/
// due-soon->orange).
_priorityColor(priority) {
  const map = { CRITICAL: 'red', HIGH: 'red', MEDIUM: 'orange', LOW: '', INFO: '' };
  return map[priority] || '';
},

// _fuelGaugeHtml(fuel) — fuel dari summary.fuel (FuelInsightEngine.
// getSummary(), TASK-150A) APA ADANYA — 0 rumus bar/liter/persen/reserve
// baru dihitung di sini. `null` (belum ada fuelState tersimpan) -> ajakan
// koreksi, pola sama persis pesan "Catat isi BBM" di fuel-card.js.
_fuelGaugeHtml(fuel) {
  if (!fuel) {
    return `<div class="u-fs12 u-t2" style="margin-bottom:10px">Belum ada estimasi BBM tersimpan — koreksi dulu dengan speedometer.</div>`;
  }
  const barLabel = (fuel.currentBar !== null && fuel.currentBar !== undefined && fuel.maxBar !== null && fuel.maxBar !== undefined)
    ? `${Math.round(fuel.currentBar)} / ${fuel.maxBar} Bar` : '-';
  const literLabel = (fuel.remainingLiter !== null && fuel.remainingLiter !== undefined) ? `${fuel.remainingLiter} Liter` : '-';
  const pctLabel = (fuel.fuelPercent !== null && fuel.fuelPercent !== undefined) ? `${fuel.fuelPercent}%` : '-';
  const reserveHtml = fuel.reserve
    ? `<div class="u-fs12 red" style="margin-top:4px;font-weight:700">⚠️ Sudah masuk cadangan (reserve)</div>`
    : '';
  return `
    <div style="background:var(--surface3);border-radius:12px;padding:14px;text-align:center;margin-bottom:10px">
      <div class="u-fs11 u-t2" style="text-transform:uppercase;letter-spacing:0.8px;font-weight:700">Sisa BBM</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:800;color:var(--accent);margin-top:4px">${escapeHtml(barLabel)}</div>
      <div class="u-fs13 u-t2" style="margin-top:2px">${escapeHtml(literLabel)} · ${escapeHtml(pctLabel)}</div>
      ${reserveHtml}
    </div>`;
},

// _healthHtml(healthScore) — healthScore dari summary APA ADANYA (0 skor
// baru dihitung di sini). `null`/`undefined` (dependency belum
// dimuat/data belum cukup) -> baris ini dilewati, TIDAK memblokir bagian
// dashboard lain.
_healthHtml(healthScore) {
  if (healthScore === null || healthScore === undefined) return '';
  const col = healthScore >= 80 ? 'green' : (healthScore >= 50 ? 'orange' : 'red');
  return `<div class="u-flex u-jcb u-aic" style="margin-bottom:10px"><span class="u-fs12 u-t2">Skor Kesehatan BBM</span><span class="u-fw800 ${col}">${healthScore}/100</span></div>`;
},

// _highestInsightHtml(insight) — summary.highestInsight APA ADANYA
// (FuelInsightEngine.getInsights(), sudah diurutkan prioritas oleh engine
// itu sendiri) — 0 logic sortir/prioritas baru ditulis di sini. `null`
// (belum ada insight sama sekali) -> baris ini dilewati.
_highestInsightHtml(insight) {
  if (!insight) return '';
  const col = this._priorityColor(insight.priority);
  return `<div class="u-fs12${col ? ' ' + col : ''}" style="margin-bottom:10px;line-height:1.5"><b>${escapeHtml(insight.title)}</b><br>${escapeHtml(insight.description)}</div>`;
},

// _body(vid, vehicles, summary) — susun 1 kartu dashboard: header + (kalau
// >1 kendaraan) switcher + gauge BBM + skor kesehatan + insight prioritas
// tertinggi + CTA (100% reuse FuelModal.open()/FuelBarCorrection.open(),
// pola SAMA PERSIS baris CTA fuel-card.js).
_body(vid, vehicles, summary) {
  const veh = vehicles.find((v) => v.id === vid);
  const name = veh ? (veh.emoji ? veh.emoji + ' ' : '') + veh.name : '';
  return `
    <div class="dashhub-cat-head">
      <div class="dashhub-cat-icon">⛽</div>
      <div>
        <div class="dashhub-cat-label">Fuel Dashboard</div>
        <div class="dashhub-cat-desc">${escapeHtml(name)}</div>
      </div>
    </div>
    ${this._vehicleChips(vehicles, vid)}
    ${this._fuelGaugeHtml(summary.fuel)}
    ${this._healthHtml(summary.healthScore)}
    ${this._highestInsightHtml(summary.highestInsight)}
    <div class="btn-row" style="margin-bottom:0">
      <button class="btn btn-ghost btn-sm" data-action="FuelModal.open" data-args="${escapeHtml(JSON.stringify([vid]))}">📊 Lihat Detail</button>
      <button class="btn btn-ghost btn-sm" data-action="FuelBarCorrection.open" data-args="${escapeHtml(JSON.stringify([vid]))}" aria-label="Koreksi estimasi BBM dengan speedometer">⚙️ Koreksi</button>
      <button class="btn btn-ghost btn-sm" data-action="FuelDashboard.exportVehicleHTML" data-args="${escapeHtml(JSON.stringify([vid]))}" aria-label="Export Fuel Dashboard kendaraan ini">⬇️ Export</button>
    </div>
  `;
},

// ===================== TASK-155A: Export (Single Vehicle) =====================
// PRINSIP (sama persis prinsip file ini): 0 rumus/kalkulasi baru. Seluruh
// field export dibaca APA ADANYA dari FuelInsightEngine.getSummary(vid)
// (dependency yang SUDAH dipakai render() di atas) — export HANYA
// menyalin/menyusun ulang field yang sudah ada jadi JSON/HTML, tidak pernah
// menghitung ulang healthScore/fuel/monthlyCost/dst. 0 storage baru (tidak
// pernah menulis ke D) — pola download murni file-blob-di-browser, SAMA
// PERSIS pola modules/shared/data-archive.js / backup-restore.js
// (Blob + URL.createObjectURL + <a download> + click()).

// _buildExportData(vid) — kumpulkan 1 objek data export utk 1 kendaraan.
// `null` kalau kendaraan tidak ditemukan di D.vehicles ATAU
// FuelInsightEngine belum dimuat ATAU getSummary() {ok:false}/throw
// ("Invalid vehicle" case) — TIDAK PERNAH throw ke pemanggil.
_buildExportData(vid) {
  if (!vid) return null;
  const vehicles = this._vehicles();
  const veh = vehicles.find((v) => v.id === vid);
  if (!veh) return null;
  if (typeof FuelInsightEngine === 'undefined' || typeof FuelInsightEngine.getSummary !== 'function') return null;
  let summary;
  try {
    summary = FuelInsightEngine.getSummary(vid);
  } catch (e) {
    return null;
  }
  if (!summary || !summary.ok) return null;
  return {
    exportedAt: new Date().toISOString(),
    vehicle: { id: veh.id, name: veh.name || '', emoji: veh.emoji || null },
    healthScore: summary.healthScore,
    efficiencyScore: summary.efficiencyScore,
    monthlyCost: summary.monthlyCost,
    remainingDistance: summary.remainingDistance,
    maintenanceRisk: summary.maintenanceRisk,
    fuel: summary.fuel,
    highestInsight: summary.highestInsight,
  };
},

// _dateTag()/_slug() — helper murni format nama file, 0 logic bisnis.
_dateTag() {
  return new Date().toISOString().split('T')[0];
},

_slug(name) {
  const s = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'kendaraan';
},

// _downloadFile(filename, content, mime) — trigger download via Blob +
// <a download>, pola SAMA PERSIS data-archive.js/backup-restore.js. `false`
// (bukan throw) kalau environment tidak mendukung (mis. Blob/URL/document
// tidak tersedia, seperti di harness test murni-logika) — dipakai caller
// utk memutuskan toast sukses/gagal.
_downloadFile(filename, content, mime) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  try {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    return true;
  } catch (e) {
    return false;
  }
},

// _vehicleHtmlReport(data) — susun laporan HTML standalone (self-contained,
// inline style — file diunduh & dibuka TERPISAH dari app, jadi TIDAK bisa
// mengandalkan var(--accent)/CSS class app). Seluruh angka/teks dibaca APA
// ADANYA dari `data` (hasil _buildExportData(), 0 kalkulasi baru).
_vehicleHtmlReport(data) {
  const v = data.vehicle;
  const fuel = data.fuel;
  const fuelLine = fuel
    ? `${(fuel.currentBar !== null && fuel.currentBar !== undefined && fuel.maxBar !== null && fuel.maxBar !== undefined) ? Math.round(fuel.currentBar) + ' / ' + fuel.maxBar + ' Bar' : '-'} &middot; ${(fuel.remainingLiter !== null && fuel.remainingLiter !== undefined) ? fuel.remainingLiter + ' Liter' : '-'} &middot; ${(fuel.fuelPercent !== null && fuel.fuelPercent !== undefined) ? fuel.fuelPercent + '%' : '-'}${fuel.reserve ? ' &mdash; ⚠️ Sudah masuk cadangan' : ''}`
    : 'Belum ada estimasi BBM tersimpan';
  const insightLine = data.highestInsight
    ? `<b>${escapeHtml(data.highestInsight.title)}</b> (${escapeHtml(data.highestInsight.priority)})<br>${escapeHtml(data.highestInsight.description)}`
    : '-';
  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Fuel Dashboard - ${escapeHtml(v.name)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;background:#f5f5f7;color:#1a1a2e;padding:24px;margin:0}
.card{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
h1{font-size:20px;margin:0 0 4px}
.sub{color:#888;font-size:12px;margin-bottom:16px}
p{font-size:14px;line-height:1.6;margin:8px 0}
</style></head>
<body><div class="card">
<h1>⛽ ${escapeHtml((v.emoji ? v.emoji + ' ' : '') + v.name)}</h1>
<div class="sub">Fuel Dashboard Export &middot; ${escapeHtml(data.exportedAt)}</div>
<p><b>Skor Kesehatan BBM:</b> ${(data.healthScore !== null && data.healthScore !== undefined) ? data.healthScore + '/100' : '-'}</p>
<p><b>Skor Efisiensi:</b> ${(data.efficiencyScore !== null && data.efficiencyScore !== undefined) ? data.efficiencyScore : '-'}</p>
<p><b>Sisa BBM:</b> ${fuelLine}</p>
<p><b>Estimasi Jarak Tersisa:</b> ${(data.remainingDistance !== null && data.remainingDistance !== undefined) ? Math.round(data.remainingDistance) + ' km' : '-'}</p>
<p><b>Biaya BBM/Bulan:</b> ${(data.monthlyCost !== null && data.monthlyCost !== undefined) ? 'Rp' + Math.round(data.monthlyCost).toLocaleString('id-ID') : '-'}</p>
<p><b>Risiko Servis:</b> ${escapeHtml(data.maintenanceRisk || '-')}</p>
<p><b>Insight Prioritas Tertinggi:</b><br>${insightLine}</p>
</div></body></html>`;
},

// exportVehicleJSON(vehicleId?) — API publik. vehicleId opsional -> default
// this.curVehicleId (pola sama render()). "Invalid vehicle"/kendaraan tidak
// ditemukan -> toast peringatan + {ok:false}, TIDAK throw. Mengembalikan
// {ok,data} (data === objek export yang sama dipakai HTML) supaya bisa
// diverifikasi programatik (dites) tanpa membaca file yang diunduh.
exportVehicleJSON(vehicleId) {
  const vid = vehicleId || this.curVehicleId;
  const data = this._buildExportData(vid);
  if (!data) {
    if (typeof toast === 'function') toast('⚠️ Kendaraan tidak ditemukan, export dibatalkan');
    return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  }
  const fname = 'fuel-dashboard-' + this._slug(data.vehicle.name) + '-' + this._dateTag() + '.json';
  const downloaded = this._downloadFile(fname, JSON.stringify(data, null, 2), 'application/json');
  if (downloaded && typeof toast === 'function') toast('✅ Export JSON berhasil');
  return { ok: downloaded, data };
},

// exportVehicleHTML(vehicleId?) — sama kontraknya dgn exportVehicleJSON(),
// bedanya isi file yang diunduh (laporan HTML, bukan JSON mentah).
exportVehicleHTML(vehicleId) {
  const vid = vehicleId || this.curVehicleId;
  const data = this._buildExportData(vid);
  if (!data) {
    if (typeof toast === 'function') toast('⚠️ Kendaraan tidak ditemukan, export dibatalkan');
    return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  }
  const fname = 'fuel-dashboard-' + this._slug(data.vehicle.name) + '-' + this._dateTag() + '.html';
  const downloaded = this._downloadFile(fname, this._vehicleHtmlReport(data), 'text/html');
  if (downloaded && typeof toast === 'function') toast('✅ Export HTML berhasil');
  return { ok: downloaded, data };
},

};

// Ekspos ke window — WAJIB supaya delegasi klik global (data-action) bisa
// menemukan modul ini lewat window['FuelDashboard']['switchVehicle'] dst.
// `const FuelDashboard = {...}` di atas HANYA membuat binding lexical-
// scope (bukan properti window), pola fix sama persis window.DashboardHub
// di dashboard-hub-search.js. Tanpa baris ini, chip pilih kendaraan,
// "📊 Lihat Detail", "⚙️ Koreksi", & "⬇️ Export" di Fuel Dashboard tidak
// akan pernah berfungsi meski test lolos (test memanggil fungsi langsung,
// bukan lewat jalur klik data-action yang sesungguhnya).
if (typeof FuelDashboard !== 'undefined') window.FuelDashboard = FuelDashboard;
