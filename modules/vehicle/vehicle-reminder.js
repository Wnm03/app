// vehicle-reminder.js — Vehicle Reminder Foundation (Sesi 78, Batch 7).
// Target sesi: lapisan reminder domain VEHICLE — Service Reminder, Tax
// Reminder, Fuel Reminder, + Reminder Summary API. Lihat docs/BATCH_PLAN.md
// § Batch 7. Pola SAMA PERSIS modules/vehicle/vehicle-intelligence.js
// (Sesi 76) & modules/finance/finance-intelligence.js (Sesi 74) — lapisan
// agregasi PURE (read-only) di atas service yang SUDAH ADA.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE sebisa mungkin, TIDAK ada
// framework/state baru, TIDAK duplikasi logic, TIDAK mengubah struktur
// data D. Sumber data dipakai apa adanya:
//   - predictService()        (modules/vehicle/sparepart-servis.js)
//   - VEHTAX_ITEMS            (car-notes.js)
//   - dateStatusBadge()/daysUntilDate() (modules/vehicle/vehicle-core.js)
//   - fuelEfficiency()/getVehicleKm()/estimateServiceDateISO() (vehicle-core.js)
//   - D.bbmLogs (mentah, HANYA untuk fuelReminders() — lihat catatan di sana)
//
// serviceReminders()/taxReminders() TIDAK menghitung ulang status apa pun —
// status 'lewat'/'segera' (servis) & warna 'red'/'orange' (pajak, dari
// dateStatusBadge() yang SUDAH ADA & sudah dipakai UI) dibaca apa adanya,
// sama persis ambang yang sudah dipakai _vehicleOverdueCheck() (rule AI
// 'vehicle-service-overdue') & checkAndFireReminders() (reminder-notif.js)
// masing-masing — reminder di sini murni membungkus ulang hasil yang sama
// jadi bentuk list yang seragam lintas 3 tipe.
//
// fuelReminders() SATU-SATUNYA logic yang genuinely baru sesi ini (belum
// ada versi murninya sebelum sesi ini, sama seperti fleetSummary() jadi
// logic baru satu-satunya di VehicleIntelligence Sesi 76) — lihat komentar
// detail di fungsi itu.
//
// TIDAK ada wiring ke reminder-notif.js/checkAndFireReminders() (yang
// nembak Notification browser), TIDAK ada UI/panel/dashboard card, TIDAK
// ada AI Hook — eksplisit di luar scope sesi ini (murni fondasi data/
// service, pola sama persis vehicle-intelligence.js Sesi 76 sebelum
// vehicle-dashboard.js Sesi 77 menyusul). Semua fungsi di bawah PURE — tidak
// pernah memanggil save() atau menulis ke D/localStorage, tidak menyentuh
// DOM/Notification.
const VehicleReminder = {

// _vehicles(vehicleId) — helper internal: baca D.vehicles apa adanya
// (array kosong kalau D/D.vehicles belum ada — guard typeof, pola sama
// persis VehicleIntelligence._vehicles()), difilter ke 1 kendaraan kalau
// vehicleId diberikan.
// _vehicles(vehicleId) (Sesi 196, Ownership Sync Vehicle): dengan
// vehicleId -> tetap balikin kendaraan itu apa adanya (TIDAK peduli
// ownership, sama pola per-akun/per-aset Sesi 192-193). TANPA vehicleId
// (fleet-wide, dipakai reminder-notif.js/VehicleNotifBridge/
// FuelNotifBridge/Dashboard) -> HANYA kendaraan ownership SELF (default/
// tanpa field ownership ikut SELF), kendaraan INVESTOR/CUSTOMER/
// THIRD_PARTY/FAMILY dikecualikan dari reminder lintas-armada.
_vehicles(vehicleId) {
  const all = (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
  if (vehicleId) return all.filter((v) => v.id === vehicleId);
  return all.filter((v) => (typeof isVehicleOwnershipSelf !== 'function') || isVehicleOwnershipSelf(v.id));
},

// serviceReminders(vehicleId?) — reminder servis lintas kendaraan (atau 1
// kendaraan kalau vehicleId diberikan), reuse predictService() apa adanya.
// Item status 'aman' TIDAK dijadikan reminder (tidak perlu diingatkan).
// status 'lewat' => severity 'overdue', status 'segera' => severity
// 'due-soon' — ambang ITU SENDIRI (sisaKm<=0 / sisaKm<=intervalKm*0.15)
// sudah dihitung di dalam predictService(), TIDAK dihitung ulang di sini.
serviceReminders(vehicleId) {
  const out = [];
  if (typeof predictService !== 'function') return out;
  this._vehicles(vehicleId).forEach((v) => {
    const pred = predictService({ vehicleId: v.id });
    if (!pred.ok || !Array.isArray(pred.items)) return;
    pred.items.filter((it) => it.status !== 'aman').forEach((it) => {
      const severity = it.status === 'lewat' ? 'overdue' : 'due-soon';
      const message = severity === 'overdue'
        ? `Servis ${it.categoryName} ${v.name} sudah lewat jatuh tempo (${Math.abs(it.sisaKm)} km lewat batas).`
        : `Servis ${it.categoryName} ${v.name} segera jatuh tempo (sisa ${it.sisaKm} km).`;
      out.push({
        type: 'service',
        vehicleId: v.id,
        vehicleName: v.name,
        severity,
        categoryName: it.categoryName,
        sisaKm: it.sisaKm,
        estDateISO: it.estDateISO,
        message,
      });
    });
  });
  return out;
},

// taxReminders(vehicleId?) — reminder pajak/dokumen kendaraan (STNK
// Tahunan, Ganti Plat 5th, Uji Kelayakan — dari VEHTAX_ITEMS apa adanya),
// reuse dateStatusBadge() (vehicle-core.js, SUDAH dipakai renderCnTab()
// & checkAndFireReminders()) utk klasifikasi status — TIDAK menghitung
// ulang ambang "H-30 hari"/lewat, cuma membaca ulang warna badge yang
// sudah ada. col 'red' (lewat) => severity 'overdue', col 'orange'
// (<=30 hari) => severity 'due-soon'. col 'green'/'' (aktif jauh/belum
// diisi) TIDAK dijadikan reminder.
taxReminders(vehicleId) {
  const out = [];
  if (typeof VEHTAX_ITEMS === 'undefined' || typeof dateStatusBadge !== 'function' || typeof daysUntilDate !== 'function') return out;
  this._vehicles(vehicleId).forEach((v) => {
    Object.entries(VEHTAX_ITEMS).forEach(([key, cfg]) => {
      const tgl = v[cfg.tglKey];
      if (!tgl) return;
      const badge = dateStatusBadge(tgl);
      if (badge.col !== 'red' && badge.col !== 'orange') return;
      const severity = badge.col === 'red' ? 'overdue' : 'due-soon';
      const label = cfg.label.replace(/^\S+\s/, '');
      out.push({
        type: 'tax',
        vehicleId: v.id,
        vehicleName: v.name,
        severity,
        taxKey: key,
        label,
        tgl,
        daysUntil: daysUntilDate(tgl),
        message: `${label} ${v.name} — ${badge.label}.`,
      });
    });
  });
  return out;
},

// fuelReminders(vehicleId?) — LOGIC BARU sesi ini (belum ada versi
// murninya sebelum sesi ini). Tujuan: ingatkan kalau kendaraan
// diperkirakan hampir mencapai jangkauan (range) BBM-nya sejak pengisian
// Full Tank terakhir, ATAU kalau histori BBM belum cukup utk estimasi
// apa pun.
//
// TIDAK menghitung ulang kmPerLiter/kmPerDay (dibaca apa adanya dari
// fuelEfficiency(), vehicle-core.js) & TIDAK menyimpan/menambah field D
// baru (tidak ada "kapasitas tangki" per kendaraan di data model — lihat
// docs/BATCH_PLAN.md, TIDAK ditambahkan sesi ini krn di luar scope
// "Foundation"). Sebagai gantinya, "jangkauan per Full Tank" diestimasi
// dari RATA-RATA liter tiap pengisian Full Tank historis (data mentah
// D.bbmLogs yang SUDAH difilter fullTank, pola filter SAMA PERSIS yang
// dipakai estimateRpPerKm()/_vehicleFuelEfficiencyDropCheck() di
// vehicle-core.js/sparepart-servis.js) dikali kmPerLiter (reuse
// fuelEfficiency()). Km yang sudah ditempuh sejak pengisian Full Tank
// TERAKHIR (curKm - lastFull.km, curKm dari getVehicleKm() yang SUDAH
// ADA) dibandingkan ke estimasi jangkauan itu. Ambang "due-soon" pakai
// rasio 15% SAMA PERSIS yang sudah dipakai predictService() (bukan
// ambang baru yang diciptakan sendiri) — supaya konsisten dgn semantik
// "segera" di seluruh app. estDateISO reuse estimateServiceDateISO()
// (vehicle-core.js — formula proyeksi tanggal dari sisaKm/kmPerDay,
// generik, bukan spesifik servis) apa adanya, TIDAK ditulis ulang.
fuelReminders(vehicleId) {
  const out = [];
  this._vehicles(vehicleId).forEach((v) => {
    const fuel = (typeof fuelEfficiency === 'function') ? fuelEfficiency(v.id) : { ok: false, reason: 'fuelEfficiency belum dimuat' };
    if (!fuel.ok) {
      out.push({
        type: 'fuel',
        vehicleId: v.id,
        vehicleName: v.name,
        severity: 'info',
        message: `Data BBM ${v.name} belum cukup utk estimasi pengingat isi BBM (${fuel.reason}).`,
      });
      return;
    }
    const fullLogs = ((typeof D !== 'undefined' && D.bbmLogs) ? D.bbmLogs : [])
      .filter((b) => b.vehicleId === v.id && b.fullTank && isFinite(b.km) && b.km > 0 && b.liter > 0)
      .sort((a, b) => a.km - b.km);
    if (!fullLogs.length) return; // fuel.ok tapi tanpa log fullTank valid (edge-case) -- tidak cukup dasar utk estimasi range.
    const lastFull = fullLogs[fullLogs.length - 1];
    const avgLiter = fullLogs.reduce((s, b) => s + b.liter, 0) / fullLogs.length;
    const rangeKm = avgLiter * fuel.kmPerLiter;
    if (!(rangeKm > 0)) return;
    const curKm = (typeof getVehicleKm === 'function') ? getVehicleKm(v.id) : lastFull.km;
    const kmSinceLastFull = curKm - lastFull.km;
    const sisaKm = rangeKm - kmSinceLastFull;
    if (sisaKm > rangeKm * 0.15) return; // masih jauh dari batas jangkauan, belum perlu diingatkan.
    const severity = sisaKm <= 0 ? 'overdue' : 'due-soon';
    const estDateISO = (typeof estimateServiceDateISO === 'function') ? estimateServiceDateISO(sisaKm, fuel.kmPerDay) : null;
    const message = severity === 'overdue'
      ? `Berdasarkan histori, ${v.name} kemungkinan sudah melewati estimasi jangkauan BBM sejak isi Full Tank terakhir.`
      : `${v.name} diperkirakan perlu isi BBM lagi dalam \u2248${Math.round(sisaKm)} km.`;
    out.push({
      type: 'fuel',
      vehicleId: v.id,
      vehicleName: v.name,
      severity,
      sisaKm: Math.round(sisaKm),
      rangeKm: Math.round(rangeKm),
      estDateISO,
      message,
    });
  });
  return out;
},

// summary(vehicleId?) — Reminder Summary API, satu pintu masuk gabungan
// (dipakai widget/AI briefing masa depan, di luar scope sesi ini), murni
// memanggil 3 fungsi di atas & menggabungkan hasilnya, TIDAK ada logic
// tambahan. all = gabungan urut service+tax+fuel (bukan diurutkan ulang
// by severity/tanggal -- pengurutan tampilan didelegasikan ke konsumen
// UI masa depan, sama seperti VehicleIntelligence.summary() yang juga
// tidak mengurutkan insights()).
summary(vehicleId) {
  const service = this.serviceReminders(vehicleId);
  const tax = this.taxReminders(vehicleId);
  const fuel = this.fuelReminders(vehicleId);
  const all = [...service, ...tax, ...fuel];
  return {
    total: all.length,
    overdueCount: all.filter((r) => r.severity === 'overdue').length,
    dueSoonCount: all.filter((r) => r.severity === 'due-soon').length,
    infoCount: all.filter((r) => r.severity === 'info').length,
    service,
    tax,
    fuel,
    all,
  };
},

};
