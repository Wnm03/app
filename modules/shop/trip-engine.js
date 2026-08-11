// trip-engine.js — Shop Business Engine, S198 (Business Engine untuk Shop).
//
// TripEngine = lapisan pengiriman/rit (ongkir, berat/volume/packing, muatan
// kendaraan, BBM). SAMA POLA dgn PurchaseEngine (file sebelah) &
// LogisticsEngine (modules/logistics/logistics-engine.js, Sesi 3): pure
// wrapper, TIDAK ADA rumus baru — semuanya delegasi ke fungsi Shop existing
// (weightCalculator/volumeCalculator/packingCalculator di cobek-etalase.js;
// calculateFuel/calculateVehicleCapacity di cobek-pricing.js;
// calculateSmartDelivery di cobek-order.js; OngkirCalc.leg/LogisticsEngine.route
// yang sudah ada) supaya satu sumber kebenaran tetap terjaga.
//
// TIDAK PERNAH menyentuh D sendiri, TIDAK PERNAH panggil save(). Beberapa
// method di bawah memanggil fungsi Shop yang MEMANG membaca D read-only
// (mis. calculateSmartDelivery baca D.products/D.produsen) — itu perilaku
// ASLI fungsi tsb, bukan sesuatu yang ditambahkan di sini.
//
// Belum digunakan UI. Belum dihubungkan ke Shop (tidak dipanggil dari
// cobek-*.js mana pun sesi ini).
const TripEngine = {

  // weight/volume/packing — delegasi murni ke fungsi global yang sudah ada
  // di cobek-etalase.js (Smart Delivery Engine Sesi 4). Guard
  // `typeof fn==='function'` supaya engine ini tetap aman dipanggil kalau
  // suatu saat dimuat sendirian (tanpa cobek-etalase.js), sama pola guard
  // yang dipakai LogisticsEngine.fuel()/calculateFuel().
  weight(params) {
    if (typeof weightCalculator !== 'function') {
      return { ok: false, reason: 'weightCalculator belum dimuat' };
    }
    return Object.assign({ ok: true }, weightCalculator(params));
  },

  volume(params) {
    if (typeof volumeCalculator !== 'function') {
      return { ok: false, reason: 'volumeCalculator belum dimuat' };
    }
    return Object.assign({ ok: true }, volumeCalculator(params));
  },

  packing(params) {
    if (typeof packingCalculator !== 'function') {
      return { ok: false, reason: 'packingCalculator belum dimuat' };
    }
    return Object.assign({ ok: true }, packingCalculator(params));
  },

  // route(params) — biaya angkut/pcs, delegasi PERSIS ke LogisticsEngine.route()
  // (yang sendiri sudah delegasi ke OngkirCalc.leg()) — lihat catatan "satu
  // sumber kebenaran" di logistics-engine.js.
  route(params) {
    if (typeof LogisticsEngine === 'undefined') {
      return { ok: false, reason: 'LogisticsEngine belum dimuat' };
    }
    return Object.assign({ ok: true }, LogisticsEngine.route(params));
  },

  // fuel(vehicleId) — delegasi ke calculateFuel() (cobek-pricing.js), yang
  // sendiri delegasi ke LogisticsEngine.fuel(). Dipertahankan sbg method
  // terpisah (bukan langsung LogisticsEngine.fuel()) supaya TripEngine tetap
  // konsisten ambil dari lapisan Shop, sama seperti calculateVehicleCapacity
  // memanggil calculateFuel() (bukan LogisticsEngine.fuel() langsung).
  fuel(vehicleId) {
    if (typeof calculateFuel !== 'function') {
      return { ok: false, reason: 'calculateFuel belum dimuat' };
    }
    return calculateFuel(vehicleId);
  },

  // vehicleCapacity(params) — delegasi PERSIS ke calculateVehicleCapacity()
  // (cobek-pricing.js): gabungan packing + info BBM + status AMAN/HAMPIR
  // OVERLOAD/OVERLOAD.
  vehicleCapacity(params) {
    if (typeof calculateVehicleCapacity !== 'function') {
      return { ok: false, reason: 'calculateVehicleCapacity belum dimuat' };
    }
    return calculateVehicleCapacity(params);
  },

  // plan(params) — rencana pengiriman produk tertentu, delegasi PERSIS ke
  // calculateSmartDelivery() (cobek-order.js): resolve produsen/jarak dari
  // D, hitung ongkir lewat LogisticsEngine.plan(), & profit lewat
  // calculateProfit(). Fungsi asli MEMBACA D.products/D.produsen (read-only)
  // — TripEngine tidak menambah pembacaan D baru, cuma membungkus.
  plan(params) {
    if (typeof calculateSmartDelivery !== 'function') {
      return { ok: false, reason: 'calculateSmartDelivery belum dimuat' };
    }
    return calculateSmartDelivery(params);
  },
};
