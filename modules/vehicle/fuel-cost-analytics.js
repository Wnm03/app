// fuel-cost-analytics.js — Fuel Cost Analytics Engine (TASK-147).
//
// PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save()
// atau menulis ke D/D.bbmLogs/D.vehicles). 100% REUSE modul fuel yang SUDAH
// ADA — 0 rumus km/L, Rp/km, atau proyeksi bulanan/tahunan baru dihitung
// ulang di sini:
//   - FuelStorage (TASK-141)         -> akses D.bbmLogs (histori transaksi
//                                        BBM) apa adanya, dipakai utk SUM
//                                        liter/cost per periode (bulan/
//                                        tahun/seluruh histori) & hitung
//                                        interval antar transaksi.
//   - fuelEfficiency() (vehicle-core.js, global SUDAH ADA)
//                                     -> kmPerLiter/rpPerKm/avgHarga
//                                        (dipakai APA ADANYA utk
//                                        costPerKm(), 0 recompute).
//   - FuelPredictionEngine (TASK-146) -> predictMonthlyFuelUsage()/
//                                        predictYearlyFuelUsage() (dipakai
//                                        APA ADANYA utk projectedMonthlyCost()/
//                                        projectedYearlyCost(), 0 recompute
//                                        proyeksi).
//   - D.vehicles[i].fuelState.confidenceScore (field additive TASK-144)
//                                     -> dibaca APA ADANYA (pola sama
//                                        persis FuelPredictionEngine._confidence()),
//                                        TIDAK PERNAH ditulis/diubah modul ini.
//   - Finance (D.bbmLogs[].cost, field yang sudah ditulis tx-bbm.js)
//                                     -> dibaca apa adanya, 0 field baru
//                                        ditambahkan ke D, 0 transaksi
//                                        dimodifikasi.
//
// TIDAK disentuh sama sekali (sesuai batasan task): FuelGaugeEngine,
// FuelPredictionEngine (logic), FuelTankProfile, D.bbmLogs (data),
// D.vehicles (data), business logic modul fuel-* lain mana pun.
//
// LOGIC BARU sesi ini (sesuai requirement task, bukan duplikasi formula
// existing): agregasi SUM liter/cost D.bbmLogs (via FuelStorage) per
// bulan-berjalan/tahun-berjalan/seluruh histori (murni penjumlahan field
// yang sudah ada, pola sama persis VehicleTrendAPI.monthlyCostTrend() Sesi
// 81 — bukan rumus konsumsi/efisiensi baru), dan hitung interval hari
// antar transaksi BBM berurutan (refillFrequency()).
//
// FUTURE READY: shape return tiap method HANYA menambah field baru di masa
// depan (Fuel Inflation Trend/Fuel Price Comparison/Fuel Station
// Analytics/Province-City Comparison/AI Recommendations bisa jadi method
// BARU di objek ini tanpa mengubah method yang sudah ada) — TIDAK ada
// method existing yang perlu diubah shape-nya utk mendukung fitur di atas.
//
// KONTRAK ERROR: semua method publik balikin {ok:false, reason} kalau
// gagal (kendaraan tidak ditemukan, dependency belum dimuat, histori BBM
// kurang/kosong) — TIDAK PERNAH throw.
const FuelCostAnalytics = {

// _vehicles()/_vehicle(vehicleId) — pola SAMA PERSIS FuelPredictionEngine/
// FuelTankProfile/VehicleIntelligence dkk: baca D.vehicles apa adanya
// lewat guard typeof, cari 1 kendaraan by id.
_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},
_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

// _roundLiter(n)/_roundCost(n) — presisi pembulatan output publik, pola
// SAMA PERSIS FuelPredictionEngine._roundLiter() (2 desimal utk liter,
// dibulatkan penuh utk Rupiah).
_roundLiter(n) {
  return Math.round(n * 100) / 100;
},
_roundCost(n) {
  return Math.round(n);
},

// _validLogs(vehicleId) — 100% REUSE FuelStorage.logs() (TASK-141) utk
// baca D.bbmLogs, difilter ke baris yang punya date/liter/cost valid
// (liter>0, cost>0) — TIDAK ada transformasi/field baru, cuma guard data
// kotor (mis. log lama tanpa cost) supaya tidak merusak SUM.
_validLogs(vehicleId) {
  if (typeof FuelStorage === 'undefined') return null;
  return FuelStorage.logs(vehicleId).filter((b) => (
    typeof b.date === 'string' && b.date.length >= 7 && b.liter > 0 && b.cost > 0
  ));
},

// _confidenceScore(vehicleId) — baca D.vehicles[i].fuelState.confidenceScore
// APA ADANYA (ditulis FuelBarCorrection.save(), TASK-144), pola SAMA
// PERSIS FuelPredictionEngine._confidence() — null kalau belum pernah
// diisi, 0 rumus confidence baru dihitung di sini.
_confidenceScore(vehicleId) {
  const veh = this._vehicle(vehicleId);
  const fs = veh && veh.fuelState;
  return (fs && typeof fs.confidenceScore === 'number') ? fs.confidenceScore : null;
},

// monthlyCost(vehicleId) — total liter/biaya/rata-rata harga BBM BULAN
// BERJALAN (kalender, bukan 30 hari mundur), dari SUM D.bbmLogs[].liter/
// cost via FuelStorage — 0 rumus km/L/Rp-per-km/proyeksi (beda dari
// fuelEfficiency()/FuelPredictionEngine yang MEMPREDIKSI masa depan — ini
// murni HISTORI transaksi aktual bulan ini).
// Return: {ok:true, month('YYYY-MM'), totalLiter, totalCost, averagePrice}
//   kalau ada minimal 1 transaksi valid bulan ini. {ok:false, reason}
//   kalau: kendaraan tidak ditemukan, FuelStorage belum dimuat, atau
//   belum ada transaksi BBM valid bulan ini.
monthlyCost(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const logs = this._validLogs(vehicleId);
  if (logs === null) return { ok: false, reason: 'FuelStorage belum dimuat' };
  const now = new Date();
  const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const rows = logs.filter((b) => b.date.slice(0, 7) === month);
  if (!rows.length) return { ok: false, reason: 'Belum ada transaksi BBM bulan ini' };
  const totalLiter = this._roundLiter(rows.reduce((s, b) => s + b.liter, 0));
  const totalCost = this._roundCost(rows.reduce((s, b) => s + b.cost, 0));
  return { ok: true, month, totalLiter, totalCost, averagePrice: this._roundCost(totalCost / totalLiter) };
},

// yearlyCost(vehicleId) — sama persis monthlyCost() di atas, cuma
// dikelompokkan per TAHUN kalender berjalan (bukan bulan) — pola
// agregasi identik, 0 rumus baru.
// Return: {ok:true, year('YYYY'), totalLiter, totalCost, averagePrice}
//   / {ok:false, reason} (sama persis monthlyCost(), diteruskan apa
//   adanya kecuali pesan "tahun ini").
yearlyCost(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const logs = this._validLogs(vehicleId);
  if (logs === null) return { ok: false, reason: 'FuelStorage belum dimuat' };
  const year = String(new Date().getFullYear());
  const rows = logs.filter((b) => b.date.slice(0, 4) === year);
  if (!rows.length) return { ok: false, reason: 'Belum ada transaksi BBM tahun ini' };
  const totalLiter = this._roundLiter(rows.reduce((s, b) => s + b.liter, 0));
  const totalCost = this._roundCost(rows.reduce((s, b) => s + b.cost, 0));
  return { ok: true, year, totalLiter, totalCost, averagePrice: this._roundCost(totalCost / totalLiter) };
},

// costPerKm(vehicleId) — 100% REUSE fuelEfficiency() global (vehicle-core.js)
// — rpPerKm/kmPerLiter/avgHarga SUDAH dihitung di sana (via
// estimateRpPerKm(), butuh min. 2 log "Isi Full Tank" dgn km naik),
// dipakai APA ADANYA — 0 rumus km/L atau Rp/km baru ditulis ulang.
// Return: {ok:true, costPerKm, kmPerLiter, averageFuelPrice} kalau
//   fuelEfficiency() sukses. {ok:false, reason} kalau: kendaraan tidak
//   ditemukan, fuelEfficiency belum dimuat, atau data BBM/histori km
//   kurang (reason fuelEfficiency() diteruskan apa adanya).
costPerKm(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  if (typeof fuelEfficiency !== 'function') return { ok: false, reason: 'fuelEfficiency belum dimuat' };
  const eff = fuelEfficiency(vehicleId);
  if (!eff.ok) return { ok: false, reason: eff.reason || 'Data BBM belum cukup' };
  return { ok: true, costPerKm: eff.rpPerKm, kmPerLiter: eff.kmPerLiter, averageFuelPrice: eff.avgHarga };
},

// averageFuelPrice(vehicleId) — rata-rata harga BBM (Rp/liter) TERTIMBANG
// (totalCost/totalLiter) dari SELURUH histori transaksi valid kendaraan
// ini (via FuelStorage) — beda cakupan dari avgHarga di costPerKm()
// (yang cuma 10 log terakhir, dari estimateRpPerKm() vehicle-core.js);
// di sini SEMUA transaksi dihitung, 0 batas N — tetap 0 rumus km/L/Rp-
// per-km baru, murni SUM liter & cost yang sudah ada.
// Return: {ok:true, averagePrice, totalLiter, transactionCount} kalau
//   ada minimal 1 transaksi valid. {ok:false, reason} kalau: kendaraan
//   tidak ditemukan, FuelStorage belum dimuat, atau belum ada transaksi
//   BBM valid sama sekali.
averageFuelPrice(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const logs = this._validLogs(vehicleId);
  if (logs === null) return { ok: false, reason: 'FuelStorage belum dimuat' };
  if (!logs.length) return { ok: false, reason: 'Belum ada transaksi BBM' };
  const totalLiter = this._roundLiter(logs.reduce((s, b) => s + b.liter, 0));
  const totalCost = logs.reduce((s, b) => s + b.cost, 0);
  return { ok: true, averagePrice: this._roundCost(totalCost / totalLiter), totalLiter, transactionCount: logs.length };
},

// projectedMonthlyCost(vehicleId) — 100% REUSE
// FuelPredictionEngine.predictMonthlyFuelUsage() (TASK-146, yang sendiri
// REUSE fuelEfficiency().estMonthlyLiter/estMonthlyCost) — 0 rumus
// proyeksi baru. confidenceScore ditambahkan dari D.vehicles[i].fuelState
// (dibaca apa adanya, sama seperti FuelPredictionEngine sendiri
// membacanya) — bukan bagian shape return predictMonthlyFuelUsage(),
// jadi disatukan di sini sesuai kebutuhan API task.
// Return: {ok:true, estimatedCost, estimatedLiter, confidenceScore}
//   kalau sukses. {ok:false, reason} — diteruskan apa adanya dari
//   FuelPredictionEngine.predictMonthlyFuelUsage() (kendaraan tidak
//   ditemukan, fuelEfficiency belum dimuat, atau data BBM/pola harian
//   belum cukup).
projectedMonthlyCost(vehicleId) {
  if (typeof FuelPredictionEngine === 'undefined') return { ok: false, reason: 'FuelPredictionEngine belum dimuat' };
  const pred = FuelPredictionEngine.predictMonthlyFuelUsage(vehicleId);
  if (!pred.ok) return pred;
  return {
    ok: true,
    estimatedCost: pred.estimatedCost,
    estimatedLiter: pred.estimatedLiter,
    confidenceScore: this._confidenceScore(vehicleId),
  };
},

// projectedYearlyCost(vehicleId) — 100% REUSE
// FuelPredictionEngine.predictYearlyFuelUsage() (TASK-146, yang sendiri
// REUSE predictMonthlyFuelUsage() x12 — supaya bulanan x12 SELALU
// konsisten dgn tahunan, 0 formula tahunan independen) — pola sama
// persis projectedMonthlyCost() di atas, ditambah confidenceScore.
// Return: {ok:true, estimatedCost, estimatedLiter, confidenceScore} /
//   {ok:false, reason} (sama persis projectedMonthlyCost(), diteruskan
//   apa adanya).
projectedYearlyCost(vehicleId) {
  if (typeof FuelPredictionEngine === 'undefined') return { ok: false, reason: 'FuelPredictionEngine belum dimuat' };
  const pred = FuelPredictionEngine.predictYearlyFuelUsage(vehicleId);
  if (!pred.ok) return pred;
  return {
    ok: true,
    estimatedCost: pred.estimatedCost,
    estimatedLiter: pred.estimatedLiter,
    confidenceScore: this._confidenceScore(vehicleId),
  };
},

// refillFrequency(vehicleId) — jumlah transaksi isi BBM & rata-rata
// interval hari antar transaksi berurutan (histori penuh, via
// FuelStorage) — LOGIC BARU (bukan rumus km/L/Rp-per-km/proyeksi yang
// sudah ada di modul lain), murni selisih tanggal antar transaksi
// berurutan yang sudah tercatat. Dipakai internal (§ ANALYTICS "Refill
// frequency"/"Average interval between refills" di spesifikasi task) &
// diekspos publik supaya bisa dipakai presenter/AI recommendation masa
// depan tanpa recompute.
// Return: {ok:true, refillCount, averageIntervalDays} kalau ada minimal
//   2 transaksi bertanggal valid dgn urutan waktu naik. {ok:false, reason}
//   kalau: kendaraan tidak ditemukan, FuelStorage belum dimuat, transaksi
//   <2, atau seluruh transaksi bertanggal sama (0 interval terukur).
refillFrequency(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const logs = this._validLogs(vehicleId);
  if (logs === null) return { ok: false, reason: 'FuelStorage belum dimuat' };
  if (logs.length < 2) return { ok: false, reason: 'Data BBM belum cukup (butuh minimal 2 transaksi)' };
  const asc = logs.slice().sort((a, b) => (a.date < b.date ? -1 : (a.date > b.date ? 1 : 0)));
  let totalDays = 0;
  let gaps = 0;
  for (let i = 1; i < asc.length; i++) {
    const days = (new Date(asc[i].date) - new Date(asc[i - 1].date)) / 86400000;
    if (days > 0) { totalDays += days; gaps++; }
  }
  if (!gaps) return { ok: false, reason: 'Interval tanggal antar transaksi belum cukup utk dihitung' };
  return { ok: true, refillCount: logs.length, averageIntervalDays: Math.round((totalDays / gaps) * 10) / 10 };
},

};
