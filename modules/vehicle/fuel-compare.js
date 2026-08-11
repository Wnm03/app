// fuel-compare.js — Multi Vehicle Fuel Comparison (TASK-154).
// + Export All FuelCompare (TASK-155A, exportFleetHTML()/exportFleetJSON(),
// lihat blok "TASK-155A: Export (Fleet)" di bawah).
//
// PRINSIP: presentation only, 0 UI baru rumus/kalkulasi. 100% REUSE:
//   - FuelInsightEngine.getSummary(vehicleId) (TASK-149/150A) -> healthScore/
//     efficiencyScore/monthlyCost/remainingDistance/maintenanceRisk/fuel/
//     highestInsight SEMUA dibaca APA ADANYA per kendaraan, 0 kalkulasi ulang
//     di sini (pola SAMA PERSIS fuel-dashboard.js).
//   - FuelFleetSelector.selectVehicle() (TASK-151A) -> dipakai HANYA utk
//     menandai kendaraan mana yang paling butuh perhatian fleet-wide (badge
//     "⚠️ Prioritas Tertinggi"), 0 logic seleksi/prioritas baru ditulis di
//     sini — insight & vehicleId-nya dibaca APA ADANYA dari hasil selector.
//   - FuelCostAnalytics/FuelPredictionEngine/FuelMaintenanceEngine -> TIDAK
//     dipanggil LANGSUNG di sini (sudah 100% dibungkus lewat
//     FuelInsightEngine.getSummary()), disebut di daftar Reuse task krn jadi
//     dependency transitif engine tsb.
//   - FuelModal.open(vehicleId) (SUDAH ADA, TASK-141) -> dipanggil saat 1
//     baris kendaraan di-tap ("Selecting a vehicle opens the existing Fuel
//     Intelligence Modal" — requirement task), 0 modal baru dibuat.
//
// TIDAK disentuh sama sekali (sesuai batasan task): FuelInsightEngine,
// FuelFleetSelector, FuelCostAnalytics, FuelPredictionEngine,
// FuelMaintenanceEngine (logic masing-masing), D.vehicles/D.bbmLogs/
// D.servisLogs (data). 0 storage baru dibuat (tidak pernah panggil save()
// atau menulis ke D) — state sort (this.sortKey/this.sortDir) murni state
// presenter di memori, pola sama persis this.curVehicleId di
// fuel-dashboard.js (hilang saat reload, tidak perlu persist).
//
// KONTRAK render(sortKey?): baca SEMUA D.vehicles, ambil getSummary() tiap
// kendaraan APA ADANYA. Kendaraan yang getSummary()-nya {ok:false} DILEWATI
// (bukan bikin seluruh comparison gagal) — pola sama persis
// FuelFleetSelector._candidates(). Wrap disembunyikan HANYA kalau: (a) 0
// kendaraan sama sekali ("No vehicles"), atau (b) FuelInsightEngine belum
// dimuat, atau (c) getSummary() {ok:false} utk SEMUA kendaraan yang dicoba —
// TIDAK PERNAH throw ke pemanggil.
const FuelCompare = {

curVehicleId: null, // dipakai HANYA utk highlight baris terakhir dibuka, pola sama persis FuelDashboard.curVehicleId
sortKey: 'healthScore', // default: Highest Health Risk -> Lowest (healthScore ASC = risk tertinggi dulu)
sortDir: 'asc',

// _vehicles() (Sesi 197, Ownership Sync — Report): TAMBAH 1 filter
// isVehicleOwnershipSelf(v.id) di atas D.vehicles (0 logic lama diubah) —
// kendaraan ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan
// dari Multi Vehicle Fuel Comparison & Export All (exportFleetJSON/
// exportFleetHTML) — SATU titik ubah ini otomatis mencakup render()/_rows()/
// kedua fungsi export, karena semuanya memanggil _vehicles() ini. Pola sama
// persis isVehicleOwnershipSelf() di vehicle-core.js (Sesi 196)/_vehicles()
// di vehicle-reminder.js (Sesi 196). Guard typeof: kalau helper belum
// dimuat, anggap semua SELF (tidak exclude apa pun).
_vehicles() {
  const all = (typeof D !== 'undefined' && Array.isArray(D.vehicles)) ? D.vehicles : [];
  return all.filter((v) => typeof isVehicleOwnershipSelf !== 'function' || isVehicleOwnershipSelf(v.id));
},

// _rows() — kumpulkan {vehicle, summary} utk tiap kendaraan yang valid
// (FuelInsightEngine.getSummary() {ok:true}). Kendaraan invalid/gagal
// DILEWATI, bukan bikin seluruh rows gagal — pola sama persis
// FuelFleetSelector._candidates().
_rows() {
  const out = [];
  if (typeof FuelInsightEngine === 'undefined' || typeof FuelInsightEngine.getSummary !== 'function') return out;
  const vehicles = this._vehicles();
  for (let i = 0; i < vehicles.length; i++) {
    const veh = vehicles[i];
    if (!veh || !veh.id) continue;
    let summary;
    try {
      summary = FuelInsightEngine.getSummary(veh.id);
    } catch (e) {
      continue; // tidak pernah throw ke pemanggil, lewati kendaraan ini
    }
    if (!summary || !summary.ok) continue;
    out.push({ vehicle: veh, summary });
  }
  return out;
},

// _sortValue(row, key) — ambil 1 nilai pembanding dari row sesuai kunci
// sort yang didukung. Murni ekstraksi field yang SUDAH ADA di summary
// (getSummary()) / veh.name — 0 kalkulasi baru.
_sortValue(row, key) {
  switch (key) {
    case 'name': return (row.vehicle.name || '').toLowerCase();
    case 'monthlyCost': return row.summary.monthlyCost;
    case 'remainingFuel': return row.summary.fuel ? row.summary.fuel.remainingLiter : null;
    case 'healthScore':
    default: return row.summary.healthScore;
  }
},

// _sortRows(rows, key, dir) — sort menaik/menurun berdasarkan _sortValue().
// Nilai null/undefined SELALU ditaruh di akhir (data belum tersedia,
// bukan diperlakukan sebagai 0/terkecil) supaya urutan tetap masuk akal
// walau sebagian kendaraan datanya belum lengkap.
_sortRows(rows, key, dir) {
  const mul = dir === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => {
    const va = this._sortValue(a, key);
    const vb = this._sortValue(b, key);
    const aNull = va === null || va === undefined;
    const bNull = vb === null || vb === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return 1; // null selalu di akhir, apa pun arah sortnya
    if (bNull) return -1;
    if (typeof va === 'string' || typeof vb === 'string') {
      return String(va).localeCompare(String(vb)) * mul;
    }
    return (va - vb) * mul;
  });
},

// setSort(key) — dipanggil dari tap header kolom sortable (data-action).
// Tap kunci yang SAMA membalik arah (asc<->desc), tap kunci BARU reset ke
// asc — pola umum tabel sortable, 0 logic sort baru (delegasi ke
// _sortRows() lewat render()).
setSort(key) {
  if (this.sortKey === key) {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    this.sortKey = key;
    this.sortDir = 'asc';
  }
  this.render();
},

// openVehicle(vehicleId) — "Selecting a vehicle opens the existing Fuel
// Intelligence Modal" (requirement task). 100% REUSE FuelModal.open()
// (SUDAH ADA, TASK-141) — 0 modal/logic buka baru, termasuk penanganan
// "Invalid vehicle" (FuelModal.open() sendiri sudah toast + tidak jadi
// buka modal kalau vehicleId tidak ditemukan, dibaca APA ADANYA).
openVehicle(vehicleId) {
  this.curVehicleId = vehicleId;
  if (typeof FuelModal !== 'undefined' && typeof FuelModal.open === 'function') {
    FuelModal.open(vehicleId);
  }
},

// _riskColor(riskLevel) — mapping tampilan murni (bukan rumus baru), pola
// sama persis _priorityColor() di fuel-dashboard.js.
_riskColor(riskLevel) {
  const map = { tinggi: 'red', sedang: 'orange', rendah: '' };
  return map[riskLevel] || '';
},

_fmtNum(v, suffix) {
  if (v === null || v === undefined) return '-';
  return Math.round(v).toLocaleString('id-ID') + (suffix || '');
},

_fmtRp(v) {
  if (v === null || v === undefined) return '-';
  return 'Rp' + Math.round(v).toLocaleString('id-ID');
},

_fmtFuel(fuel) {
  if (!fuel) return '-';
  if (fuel.remainingLiter === null || fuel.remainingLiter === undefined) return '-';
  return fuel.remainingLiter + ' L';
},

_sortHeaderBtn(label, key, activeKey, dir) {
  const active = key === activeKey;
  const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';
  return `<button type="button" class="chip-btn${active ? ' active' : ''}" data-action="FuelCompare.setSort" data-args="${escapeHtml(JSON.stringify([key]))}">${escapeHtml(label)}${arrow}</button>`;
},

// _rowHtml(row, priorityVehicleId) — 1 baris kendaraan. priorityVehicleId
// dari FuelFleetSelector.selectVehicle() (APA ADANYA) -> badge tambahan
// kalau baris ini kendaraan dgn insight prioritas tertinggi fleet-wide, 0
// logic prioritas baru ditulis di sini.
_rowHtml(row, priorityVehicleId) {
  const veh = row.vehicle;
  const s = row.summary;
  const name = (veh.emoji ? veh.emoji + ' ' : '') + veh.name;
  const healthCol = (s.healthScore === null || s.healthScore === undefined) ? ''
    : (s.healthScore >= 80 ? 'green' : (s.healthScore >= 50 ? 'orange' : 'red'));
  const riskCol = this._riskColor(s.maintenanceRisk);
  const insightHtml = s.highestInsight
    ? `<div class="u-fs11${this._riskColor(s.highestInsight.priority === 'CRITICAL' || s.highestInsight.priority === 'HIGH' ? 'tinggi' : '') ? ' red' : ''}" style="margin-top:2px;line-height:1.4">${escapeHtml(s.highestInsight.title)}</div>`
    : `<div class="u-fs11 u-t2" style="margin-top:2px">-</div>`;
  const priorityBadge = (priorityVehicleId && veh.id === priorityVehicleId)
    ? `<span class="u-fs11 red" style="font-weight:700;margin-left:6px">⚠️ Prioritas Tertinggi</span>` : '';
  return `
    <div class="u-flex u-jcb u-aic" style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" data-action="FuelCompare.openVehicle" data-args="${escapeHtml(JSON.stringify([veh.id]))}">
      <div style="flex:1;min-width:0">
        <div class="u-fw700">${escapeHtml(name)}${priorityBadge}</div>
        <div class="u-fs12 u-t2" style="margin-top:2px">
          Sisa: ${escapeHtml(this._fmtFuel(s.fuel))} · Jarak: ${escapeHtml(this._fmtNum(s.remainingDistance, ' km'))} · Biaya/bln: ${escapeHtml(this._fmtRp(s.monthlyCost))}
        </div>
        <div class="u-fs12 u-t2" style="margin-top:2px">
          Efisiensi: ${escapeHtml(this._fmtNum(s.efficiencyScore))} · Risiko Servis: <span class="${riskCol}">${escapeHtml(s.maintenanceRisk || '-')}</span>
        </div>
        ${insightHtml}
      </div>
      <div class="u-fw800 ${healthCol}" style="font-size:18px;margin-left:10px;white-space:nowrap">${this._fmtNum(s.healthScore)}${s.healthScore !== null && s.healthScore !== undefined ? '/100' : ''}</div>
    </div>`;
},

// render(sortKey?) — API publik satu-satunya utk menggambar comparison
// view. Dipanggil dari renderCnTab() (modules-render.js, pola sama persis
// FuelDashboard.render()) + refresh setelah transaksi BBM/servis (renderCnTab
// sendiri dipanggil ulang tiap ada perubahan tab kendaraan, pola sama
// persis refresh FuelCard/FuelDashboard).
render(sortKey) {
  const wrap = document.getElementById('fuelCompareWrap');
  const body = document.getElementById('fuelCompareBody');
  if (!wrap || !body) return;

  if (sortKey) this.sortKey = sortKey;

  const vehicles = this._vehicles();
  if (!vehicles.length) { wrap.style.display = 'none'; return; } // No vehicles

  const rows = this._rows();
  if (!rows.length) { wrap.style.display = 'none'; return; } // semua kendaraan invalid/gagal

  let priorityVehicleId = null;
  if (typeof FuelFleetSelector !== 'undefined' && typeof FuelFleetSelector.selectVehicle === 'function') {
    let sel;
    try {
      sel = FuelFleetSelector.selectVehicle();
    } catch (e) {
      sel = null;
    }
    if (sel && sel.ok) priorityVehicleId = sel.vehicleId;
  }

  const sorted = this._sortRows(rows, this.sortKey, this.sortDir);

  wrap.style.display = '';
  body.innerHTML = `
    <div class="dashhub-cat-head">
      <div class="dashhub-cat-icon">⛽</div>
      <div>
        <div class="dashhub-cat-label">Perbandingan Bahan Bakar Kendaraan</div>
        <div class="dashhub-cat-desc">${sorted.length} kendaraan</div>
      </div>
    </div>
    <div class="btn-row" style="margin-bottom:10px">
      <button class="btn btn-ghost btn-sm" data-action="FuelCompare.exportFleetHTML" aria-label="Export perbandingan seluruh armada">⬇️ Export All</button>
    </div>
    <div class="u-flex u-gap6 u-mb10" style="overflow-x:auto;padding-bottom:2px">
      ${this._sortHeaderBtn('Nama', 'name', this.sortKey, this.sortDir)}
      ${this._sortHeaderBtn('Skor Kesehatan', 'healthScore', this.sortKey, this.sortDir)}
      ${this._sortHeaderBtn('Biaya/Bulan', 'monthlyCost', this.sortKey, this.sortDir)}
      ${this._sortHeaderBtn('Sisa BBM', 'remainingFuel', this.sortKey, this.sortDir)}
    </div>
    <div>${sorted.map((r) => this._rowHtml(r, priorityVehicleId)).join('')}</div>
  `;
},

// ===================== TASK-155A: Export (Fleet) =====================
// PRINSIP (sama persis fuel-dashboard.js): 0 rumus/kalkulasi baru. Seluruh
// field export dibaca APA ADANYA dari _rows() (yang sendiri 100% reuse
// FuelInsightEngine.getSummary() per kendaraan, dependency yang SUDAH
// dipakai render() di atas) — export HANYA menyalin/menyusun ulang field
// yang sudah ada + urutan sort aktif (this.sortKey/this.sortDir, SUDAH
// ADA) jadi JSON/HTML. 0 storage baru. Pola download SAMA PERSIS
// fuel-dashboard.js (Blob + URL.createObjectURL + <a download> + click()).

// _buildFleetExportData() — kumpulkan 1 objek data export utk SELURUH
// armada, memakai urutan sort yang SEDANG aktif (this.sortKey/sortDir).
// `null` kalau "empty fleet" (0 kendaraan) ATAU "empty data" (semua
// kendaraan {ok:false}/tidak valid, _rows() balikin array kosong) — pola
// sama persis kondisi wrap disembunyikan di render().
_buildFleetExportData() {
  const rows = this._rows();
  if (!rows.length) return null;
  const sorted = this._sortRows(rows, this.sortKey, this.sortDir);
  return {
    exportedAt: new Date().toISOString(),
    sortKey: this.sortKey,
    sortDir: this.sortDir,
    vehicles: sorted.map((r) => ({
      id: r.vehicle.id,
      name: r.vehicle.name || '',
      emoji: r.vehicle.emoji || null,
      healthScore: r.summary.healthScore,
      efficiencyScore: r.summary.efficiencyScore,
      monthlyCost: r.summary.monthlyCost,
      remainingDistance: r.summary.remainingDistance,
      maintenanceRisk: r.summary.maintenanceRisk,
      fuel: r.summary.fuel,
      highestInsight: r.summary.highestInsight,
    })),
  };
},

// _dateTag()/_downloadFile() — helper murni, DUPLIKAT SENGAJA dari
// fuel-dashboard.js (pola yang sama dipakai project ini utk helper
// presentasi kecil, lihat _riskColor() vs _priorityColor() — bukan
// diekstrak jadi util bersama supaya kedua file tetap 100% independen,
// sama persis alasan duplikasi yang sudah ada di file ini).
_dateTag() {
  return new Date().toISOString().split('T')[0];
},

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

// _fleetHtmlReport(data) — laporan HTML standalone (self-contained, inline
// style, sama alasan/pola persis fuel-dashboard.js._vehicleHtmlReport()).
// Seluruh angka/teks dibaca APA ADANYA dari `data`.
_fleetHtmlReport(data) {
  const rowsHtml = data.vehicles.map((v) => `
    <tr>
      <td>${escapeHtml((v.emoji ? v.emoji + ' ' : '') + v.name)}</td>
      <td>${(v.healthScore !== null && v.healthScore !== undefined) ? v.healthScore + '/100' : '-'}</td>
      <td>${(v.fuel && v.fuel.remainingLiter !== null && v.fuel.remainingLiter !== undefined) ? v.fuel.remainingLiter + ' L' : '-'}</td>
      <td>${(v.remainingDistance !== null && v.remainingDistance !== undefined) ? Math.round(v.remainingDistance) + ' km' : '-'}</td>
      <td>${(v.monthlyCost !== null && v.monthlyCost !== undefined) ? 'Rp' + Math.round(v.monthlyCost).toLocaleString('id-ID') : '-'}</td>
      <td>${(v.efficiencyScore !== null && v.efficiencyScore !== undefined) ? v.efficiencyScore : '-'}</td>
      <td>${escapeHtml(v.maintenanceRisk || '-')}</td>
      <td>${v.highestInsight ? escapeHtml(v.highestInsight.title) : '-'}</td>
    </tr>`).join('');
  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Fuel Fleet Comparison</title>
<style>body{font-family:Arial,Helvetica,sans-serif;background:#f5f5f7;color:#1a1a2e;padding:24px;margin:0}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden}
th,td{padding:8px 10px;font-size:13px;text-align:left;border-bottom:1px solid #eee}
th{background:#7c6fef;color:#fff}
.sub{color:#888;font-size:12px;margin-bottom:16px}
h1{font-size:20px;margin:0 0 4px}
</style></head>
<body>
<h1>⛽ Perbandingan Bahan Bakar Armada</h1>
<div class="sub">${data.vehicles.length} kendaraan &middot; Export ${escapeHtml(data.exportedAt)}</div>
<table><thead><tr><th>Kendaraan</th><th>Skor Kesehatan</th><th>Sisa BBM</th><th>Estimasi Jarak</th><th>Biaya/Bulan</th><th>Efisiensi</th><th>Risiko Servis</th><th>Insight Prioritas</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
</body></html>`;
},

// exportFleetJSON() — API publik. "Empty fleet"/"empty data" (0 kendaraan
// valid) -> toast peringatan + {ok:false}, TIDAK throw. Mengembalikan
// {ok,data} (data === objek export yang sama dipakai HTML) supaya bisa
// diverifikasi programatik tanpa membaca file yang diunduh.
exportFleetJSON() {
  const data = this._buildFleetExportData();
  if (!data) {
    if (typeof toast === 'function') toast('⚠️ Tidak ada data armada untuk diekspor');
    return { ok: false, reason: 'Armada kosong' };
  }
  const fname = 'fuel-fleet-' + this._dateTag() + '.json';
  const downloaded = this._downloadFile(fname, JSON.stringify(data, null, 2), 'application/json');
  if (downloaded && typeof toast === 'function') toast('✅ Export JSON armada berhasil');
  return { ok: downloaded, data };
},

// exportFleetHTML() — sama kontraknya dgn exportFleetJSON(), bedanya isi
// file yang diunduh (tabel HTML, bukan JSON mentah).
exportFleetHTML() {
  const data = this._buildFleetExportData();
  if (!data) {
    if (typeof toast === 'function') toast('⚠️ Tidak ada data armada untuk diekspor');
    return { ok: false, reason: 'Armada kosong' };
  }
  const fname = 'fuel-fleet-' + this._dateTag() + '.html';
  const downloaded = this._downloadFile(fname, this._fleetHtmlReport(data), 'text/html');
  if (downloaded && typeof toast === 'function') toast('✅ Export HTML armada berhasil');
  return { ok: downloaded, data };
},

};

// Ekspos ke window — WAJIB supaya delegasi klik global (data-action) bisa
// menemukan modul ini lewat window['FuelCompare']['setSort'] dst.
// `const FuelCompare = {...}` di atas HANYA membuat binding lexical-scope
// (bukan properti window), pola fix sama persis window.DashboardHub di
// dashboard-hub-search.js. Tanpa baris ini, tombol sort/urutan armada &
// "⬇️ Export All" tidak akan pernah berfungsi meski test lolos (test
// memanggil FuelCompare.setSort() langsung, bukan lewat jalur klik
// data-action yang sesungguhnya).
if (typeof FuelCompare !== 'undefined') window.FuelCompare = FuelCompare;
