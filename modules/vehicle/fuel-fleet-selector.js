// fuel-fleet-selector.js — Fuel Fleet Brief Selector (TASK-151A).
//
// KONTEKS: TASK-151 (Fuel AI Daily Briefing Integration) di-STOP krn
// pipeline briefing yang ada beroperasi fleet-wide, sedangkan
// FuelInsightEngine.getSummary()/getInsights() wajib 1 vehicleId spesifik
// — tidak ada mekanisme "kendaraan mana yang diceritakan" (lihat
// AI_STATE.md § Sesi 151). Modul ini SATU-SATUNYA tujuannya: menutup gap
// itu dgn memilih 1 kendaraan lewat rule presentasi murni, TIDAK
// menyentuh FuelInsightEngine atau AI Briefing sama sekali (keduanya
// tetap TIDAK diubah sesi ini — wiring ke briefing sendiri jadi task
// lanjutan, di luar scope TASK-151A).
//
// PRINSIP: presentation helper only, 0 UI, PURE (read-only, tidak pernah
// panggil save() atau menulis ke D). 100% REUSE:
//   - FuelInsightEngine.getSummary(vehicleId) (TASK-149/150A) -> dipakai
//     APA ADANYA per kendaraan; `summary.highestInsight` (sudah diurutkan
//     prioritas oleh FuelInsightEngine sendiri via getInsights(), lihat
//     TASK-150A) dipakai LANGSUNG sbg insight prioritas tertinggi
//     kendaraan itu — 0 logic sortir insight baru ditulis di sini.
//   - curVehicleId (global SUDAH ADA — modules/shared/
//     features-helpers-global-security.js, dipakai sbg "kendaraan aktif"
//     di banyak modul lain: fuel-card.js/fuel-modal.js/fuel-intelligence-
//     ui.js/vehicle-core.js dst) -> DIBACA APA ADANYA sbg tie-breaker
//     "active/current vehicle" sesuai requirement task. TIDAK ADA state/
//     field baru dibuat utk konsep ini — curVehicleId sudah jadi
//     satu-satunya representasi "kendaraan aktif" di seluruh aplikasi.
//
// LOGIC BARU sesi ini (sesuai requirement task, bukan kalkulasi bisnis):
// (1) iterasi D.vehicles, kumpulkan highestInsight tiap kendaraan yang
// valid & punya insight; (2) bandingkan level prioritas
// (CRITICAL->HIGH->MEDIUM->LOW->INFO, urutan TEKS dari task, bukan rumus)
// utk cari kandidat teratas; (3) kalau seri, pilih curVehicleId kalau dia
// salah satu kandidat seri, else kandidat pertama sesuai urutan D.vehicles
// (deterministik). 0 rumus km/L/Rp/servis/degradasi/kesehatan apa pun
// dihitung di sini — murni pemilihan/perbandingan level prioritas yang
// SUDAH ADA di tiap insight.
//
// KONTRAK: selectVehicle() -> {ok:true, vehicleId, summary, insight} kalau
// ada kandidat terpilih. Balikin `null` (BUKAN {ok:false,...}) kalau tidak
// ada satu pun kendaraan dengan insight (0 kendaraan / seluruh kendaraan
// invalid / seluruh kendaraan tidak punya insight sama sekali) — sesuai
// rule#3 task "If no insights exist, Return null". TIDAK PERNAH throw.
const FuelFleetSelector = {

// Urutan prioritas SAMA PERSIS task/FuelInsightEngine._sortByPriority()
// (CRITICAL paling tinggi -> INFO paling rendah). Dibaca ulang di sini
// murni utk BANDINGKAN 2 kandidat vehicleId (bukan sortir insight per
// kendaraan — itu SUDAH dilakukan FuelInsightEngine.getInsights() sendiri,
// hasilnya dibaca apa adanya lewat summary.highestInsight).
_PRIORITY_ORDER: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],

_priorityIndex(priority) {
  const idx = this._PRIORITY_ORDER.indexOf(priority);
  return idx === -1 ? this._PRIORITY_ORDER.length : idx; // priority tidak dikenal -> dianggap paling rendah, tidak memblokir
},

_vehicles() {
  return (typeof D !== 'undefined' && Array.isArray(D.vehicles)) ? D.vehicles : [];
},

_activeVehicleId() {
  return (typeof curVehicleId !== 'undefined') ? curVehicleId : null;
},

// _candidates() — kumpulkan {vehicleId, summary, insight, priorityIdx}
// utk tiap kendaraan yang: (a) valid (FuelInsightEngine.getSummary()
// {ok:true}), (b) punya highestInsight (bukan null). Kendaraan invalid
// atau tanpa insight DILEWATI (bukan bikin seluruh seleksi gagal) — pola
// sama persis "insight yang sumbernya belum tersedia dilewati" di
// FuelInsightEngine sendiri.
_candidates() {
  const out = [];
  if (typeof FuelInsightEngine === 'undefined' || typeof FuelInsightEngine.getSummary !== 'function') {
    return out;
  }
  const vehicles = this._vehicles();
  for (let i = 0; i < vehicles.length; i++) {
    const veh = vehicles[i];
    if (!veh || !veh.id) continue; // entri kendaraan tidak valid, lewati
    let summary;
    try {
      summary = FuelInsightEngine.getSummary(veh.id);
    } catch (e) {
      continue; // tidak pernah throw ke pemanggil, lewati kendaraan ini
    }
    if (!summary || !summary.ok) continue; // kendaraan tidak ditemukan / gagal, lewati
    const insight = summary.highestInsight || null;
    if (!insight) continue; // kendaraan valid tapi tidak ada insight, lewati
    out.push({
      vehicleId: veh.id,
      summary,
      insight,
      priorityIdx: this._priorityIndex(insight.priority),
    });
  }
  return out;
},

// selectVehicle() — API publik satu-satunya. Lihat KONTRAK di atas.
selectVehicle() {
  const candidates = this._candidates();
  if (!candidates.length) return null; // rule#3: no insights exist -> null

  // Rule#1: highest priority wins (index terkecil = prioritas tertinggi).
  let bestIdx = candidates[0].priorityIdx;
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].priorityIdx < bestIdx) bestIdx = candidates[i].priorityIdx;
  }
  const top = candidates.filter((c) => c.priorityIdx === bestIdx);

  let chosen = top[0];
  if (top.length > 1) {
    // Rule#2: seri -> pilih kendaraan aktif/current (curVehicleId) kalau
    // dia salah satu kandidat seri; kalau tidak, kandidat pertama sesuai
    // urutan D.vehicles (deterministik, bukan tebakan acak).
    const activeId = this._activeVehicleId();
    const activeMatch = top.find((c) => c.vehicleId === activeId);
    if (activeMatch) chosen = activeMatch;
  }

  return {
    ok: true,
    vehicleId: chosen.vehicleId,
    summary: chosen.summary,
    insight: chosen.insight,
  };
},

};
