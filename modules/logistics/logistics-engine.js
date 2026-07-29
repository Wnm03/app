// logistics-engine.js — Smart Delivery Engine, Sesi 3/6: mesin hitung logistik.
//
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Sesi ini TIDAK butuh
// ai-core.js/ai-decision-engine.js/ai-service.js (Sesi 1-2) sama sekali —
// murni fungsi hitung berbasis D & rumus yang SUDAH ADA (OngkirCalc di
// cobek-pricing.js, PriceReko di file yang sama, estimateRpPerKm di
// vehicle-core.js). Baru dipakai bareng AI di Sesi 6 (wiring).
//
// Kenapa 1 file, bukan 6 (logistics-storage.js + logistics-route.js +
// logistics-load.js + logistics-fuel.js + logistics-pricing.js +
// logistics-engine.js) — lihat RENCANA-SESI-RINGKAS.md bagian "Kenapa
// dipangkas". TIDAK ADA storage sendiri di sini (beda dari AIStore Sesi 1):
// engine ini sengaja stateless/pure — semua hasil dihitung ulang dari
// parameter yang dikasih pemanggil + baca D read-only, TIDAK ada yang
// dipersist ke IndexedDB oleh file ini. Kalau nanti (Sesi 4+) hasil
// LogisticsEngine perlu disimpan (mis. jadi rekomendasi AI), itu lewat
// AIStore Sesi 1 (AIDecision.recommend / dst), bukan storage baru di sini.
//
// ATURAN WAJIB (sama seperti ai-core.js):
// - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada
//   perubahan struktur D sedikit pun — HANYA membaca (mis. D.vehicles lewat
//   estimateRpPerKm()).
// - Tidak pernah memanggil save().
// - Tidak duplikat rumus OngkirCalc/PriceReko — SELALU panggil fungsi
//   aslinya (OngkirCalc.leg, PriceReko.roundNice, estimateRpPerKm), supaya
//   kalau rumus itu berubah di kw190/kw191, hasil di sini otomatis ikut
//   berubah juga (satu sumber kebenaran).
// - TIDAK menyentuh DOM sama sekali (beda dari OngkirCalc/PriceReko yang
//   baca document.getElementById(...) langsung) — semua input lewat
//   parameter object, supaya bisa dites murni & dipakai dari mana saja
//   (mis. rule AI di Sesi 4-5) tanpa perlu modal/form terbuka dulu.

const LogisticsEngine = {
  // ------------------------------------------------------------------------
  // route(params) — biaya angkut/pcs dari 2 etape (Ambil ke Produsen +
  // opsional Pekalongan->Rumah Konsumen), rumus PERSIS OngkirCalc.leg() di
  // cobek-pricing.js (kw190/kw191-ongkir-jarak), cuma dipanggil dgn
  // parameter murni (bukan baca #ongkirKmProdusen dkk dari DOM).
  // ------------------------------------------------------------------------
  route({ kmProdusen, biayaPerKmProdusen, kmKonsumen, biayaPerKmKonsumen, metode, pcs } = {}) {
    const m = metode === 'ambil' ? 'ambil' : 'antar'; // default sama seperti OngkirCalc._metode
    const legProdusen = OngkirCalc.leg(biayaPerKmProdusen, kmProdusen, pcs);
    const legKonsumen = m === 'antar' ? OngkirCalc.leg(biayaPerKmKonsumen, kmKonsumen, pcs) : 0;
    const totalPerPcs = legProdusen + legKonsumen;
    return {
      metode: m,
      pcs: parseFloat(pcs) || 0,
      legProdusen,
      legKonsumen,
      totalPerPcs,
    };
  },

  // ------------------------------------------------------------------------
  // fuel(vehicleId) — bungkus estimateRpPerKm() (vehicle-core.js) jadi
  // bentuk konsisten & aman dipanggil walau fungsinya belum ter-load
  // (mis. dari test yang cuma load file ini sendirian) — return null kalau
  // fungsi tidak ada ATAU histori BBM kendaraan itu belum cukup, TIDAK throw.
  // ------------------------------------------------------------------------
  fuel(vehicleId) {
    if (typeof estimateRpPerKm !== 'function') return null;
    const est = estimateRpPerKm(vehicleId);
    if (!est) return null;
    return {
      vehicleId,
      rpPerKm: est.rpPerKm,
      kmPerLiter: est.kmPerLiter,
      avgHargaPerLiter: est.avgHarga,
    };
  },

  // ------------------------------------------------------------------------
  // load(params) — dari total pcs yang mau dikirim & kapasitas angkut sekali
  // jalan, hitung berapa kali rit (trip) dibutuhkan & rata-rata pcs/rit.
  // Kapasitas SENGAJA jadi parameter (bukan dibaca dari D.vehicles), karena
  // D.vehicles belum punya field kapasitas muat sama sekali (lihat catatan
  // "tidak menyentuh D" di atas) — pemanggil (Sesi 4+, mis. UI produk Shop)
  // yang menentukan angka kapasitas, entah dari input manual atau field baru
  // yang ditambahkan belakangan di modul lain.
  // ------------------------------------------------------------------------
  load({ totalPcs, capacityPerTrip } = {}) {
    const total = Math.max(0, parseFloat(totalPcs) || 0);
    const cap = Math.max(1, Math.floor(parseFloat(capacityPerTrip)) || 1);
    const trips = total > 0 ? Math.ceil(total / cap) : 0;
    return {
      totalPcs: total,
      capacityPerTrip: cap,
      trips,
      pcsPerTrip: trips > 0 ? Math.ceil(total / trips) : 0,
    };
  },

  // ------------------------------------------------------------------------
  // price(params) — rekomendasi harga jual dari modal+transport+margin,
  // rumus PERSIS PriceReko.calc()/roundNice() di cobek-pricing.js, cuma
  // parameter murni (bukan baca #pBeli/#prkTransport/#prkMargin dari DOM).
  // ------------------------------------------------------------------------
  price({ modal, transport, marginPct } = {}) {
    const modalNum = parseFloat(modal) || 0;
    const transportNum = parseFloat(transport) || 0;
    const marginNum = parseFloat(marginPct) || 0;
    const base = modalNum + transportNum;
    const raw = base * (1 + marginNum / 100);
    const result = (typeof PriceReko !== 'undefined' && typeof PriceReko.roundNice === 'function')
      ? PriceReko.roundNice(raw)
      : Math.round(raw);
    return { modal: modalNum, transport: transportNum, marginPct: marginNum, base, result };
  },

  // ------------------------------------------------------------------------
  // optimizeRoute({stops, biayaPerKm, vehicleId, pcs}) — urutkan banyak
  // pelanggan (stops) jadi rute nearest-neighbor sederhana (diurutkan dari
  // km terdekat ke terjauh dari titik ambil/gudang), lalu hitung total
  // KM, total ongkir (pakai route() per etape, rumus SAMA persis dgn
  // OngkirCalc.leg(), bukan rumus baru), estimasi BBM (fuel()), & profit
  // kasar (totalOngkir - totalBiayaBBM) kalau vehicleId dikasih. Setiap
  // `stop` minimal punya {name, km}; pcs per stop opsional (default 1).
  // SENGAJA nearest-neighbor by km (bukan TSP/lat-lng) — D.customers TIDAK
  // punya koordinat, jadi ini pendekatan paling jujur dari data yg ADA,
  // bukan tebakan geografis.
  // ------------------------------------------------------------------------
  optimizeRoute({ stops, biayaPerKm, vehicleId } = {}) {
    const list = Array.isArray(stops) ? stops.filter((s) => s && isFinite(parseFloat(s.km))) : [];
    if (!list.length) return { ok: false, reason: 'Tidak ada stop dengan km valid', order: [], totalKm: 0 };

    const ordered = list
      .map((s) => ({
        name: s.name || '(tanpa nama)',
        km: Math.max(0, parseFloat(s.km) || 0),
        pcs: Math.max(0, parseFloat(s.pcs) || 1),
      }))
      .sort((a, b) => a.km - b.km);

    const rpKm = Math.max(0, parseFloat(biayaPerKm) || 0);
    let totalKm = 0;
    let totalOngkir = 0;
    const order = ordered.map((s, i) => {
      // Jarak leg ini = selisih km dari stop sebelumnya (rute menuju
      // makin jauh), stop pertama = km dari titik awal.
      const legKm = i === 0 ? s.km : Math.max(0, s.km - ordered[i - 1].km);
      const legOngkir = (typeof OngkirCalc !== 'undefined' && typeof OngkirCalc.leg === 'function')
        ? OngkirCalc.leg(rpKm, legKm, s.pcs)
        : legKm * rpKm * s.pcs;
      totalKm += legKm;
      totalOngkir += legOngkir;
      return { urutan: i + 1, name: s.name, km: s.km, legKm, pcs: s.pcs, legOngkir };
    });

    const fuel = vehicleId ? this.fuel(vehicleId) : null;
    const totalBiayaBBM = fuel ? Math.round(fuel.rpPerKm * totalKm) : null;
    const profitKasar = totalBiayaBBM !== null ? Math.round(totalOngkir - totalBiayaBBM) : null;

    return {
      ok: true,
      order,
      totalKm,
      totalOngkir: Math.round(totalOngkir),
      fuel,
      totalBiayaBBM,
      profitKasar,
    };
  },

  // ------------------------------------------------------------------------
  // plan(ctx) — orkestrator: gabungkan route+load+fuel+price jadi satu
  // "rencana pengiriman" sekali panggil. Bagian mana pun yang parameternya
  // tidak dikasih pemanggil otomatis di-skip (null), TIDAK menebak nilai
  // default yang berisiko salah (mis. tidak asal isi vehicleId). Hasil
  // route.totalPerPcs otomatis dipakai sbg `transport` di price() kalau
  // pemanggil tidak override transport-nya sendiri — supaya "harga" yang
  // keluar dari plan() ini konsisten dgn "ongkir" yang dihitung di plan yang
  // sama (bukan 2 angka lepas yang bisa beda kalau dihitung terpisah).
  // ------------------------------------------------------------------------
  plan({
    kmProdusen, biayaPerKmProdusen, kmKonsumen, biayaPerKmKonsumen, metode, pcs,
    totalPcs, capacityPerTrip, vehicleId, modal, marginPct, transport,
  } = {}) {
    const route = this.route({ kmProdusen, biayaPerKmProdusen, kmKonsumen, biayaPerKmKonsumen, metode, pcs });
    const load = (totalPcs !== undefined && capacityPerTrip !== undefined)
      ? this.load({ totalPcs, capacityPerTrip })
      : null;
    const fuel = vehicleId ? this.fuel(vehicleId) : null;
    const price = (modal !== undefined)
      ? this.price({ modal, transport: transport !== undefined ? transport : route.totalPerPcs, marginPct })
      : null;
    return { generatedAt: new Date().toISOString(), route, load, fuel, price };
  },

  // ==========================================================================
  // TAHAP 3 — SMART LOGISTICS ENGINE (blueprint "OVERRIDE IMPLEMENTATION
  // PLAN"). Layer BARU, additive — semua method di atas (route/fuel/load/
  // price/optimizeRoute/plan) TIDAK diubah/dihapus. Sesuai IMPLEMENTATION
  // RULE blueprint: pakai helper yg SUDAH ADA (weightCalculator/
  // volumeCalculator/packingCalculator di cobek-etalase.js, sudah dimuat
  // lebih dulu — lihat scripts/build.js) alih-alih menulis ulang rumusnya,
  // dan TIDAK bikin file baru.
  // ==========================================================================

  // --------------------------------------------------------------------------
  // volumeCylinder({diameter, tinggi, qty}) — helper tambahan utk produk
  // berbentuk tabung (mis. cobek gerabah bulat) yang TIDAK punya dimensi
  // panjang/lebar/tinggi kotak. volumeCalculator() (cobek-etalase.js) TETAP
  // dipakai duluan kalau dimensi kotak tersedia (sesuai instruksi blueprint
  // §3: "gunakan data dimensi produk apabila tersedia") — fungsi ini cuma
  // fallback kalau yang ada cuma diameter+tinggi.
  // --------------------------------------------------------------------------
  volumeCylinder({ diameter, tinggi, qty } = {}) {
    const d = Math.max(0, parseFloat(diameter) || 0); // cm
    const t = Math.max(0, parseFloat(tinggi) || 0); // cm
    const q = Math.max(0, parseFloat(qty) || 0);
    const r = d / 2;
    const volumeCm3PerUnit = Math.PI * r * r * t;
    const totalM3 = (volumeCm3PerUnit * q) / 1e6; // cm3 -> m3, sama konversi dgn volumeCalculator()
    return { diameter: d, tinggi: t, qty: q, volumeCm3PerUnit, totalM3 };
  },

  // --------------------------------------------------------------------------
  // fuelCalculator({jarak, konsumsiKmPerLiter, hargaBBM}) — kalkulator BBM
  // PURE dari 3 parameter (blueprint §5), BEDA dari fuel(vehicleId) di atas
  // (yg baca histori Isi Full Tank D.vehicles lewat estimateRpPerKm()).
  // Dipakai saat kendaraan belum tercatat di D.vehicles / mau simulasi
  // manual (mis. Vehicle Capacity Checker §1 di bawah, yg terima input
  // konsumsi+harga BBM langsung, bukan vehicleId).
  // --------------------------------------------------------------------------
  fuelCalculator({ jarak, konsumsiKmPerLiter, hargaBBM } = {}) {
    const km = Math.max(0, parseFloat(jarak) || 0);
    const kmPerLiter = Math.max(0, parseFloat(konsumsiKmPerLiter) || 0);
    const harga = Math.max(0, parseFloat(hargaBBM) || 0);
    const liter = kmPerLiter > 0 ? km / kmPerLiter : 0;
    const biayaBBM = Math.round(liter * harga);
    return { jarak: km, konsumsiKmPerLiter: kmPerLiter, hargaBBM: harga, liter: Math.round(liter * 100) / 100, biayaBBM };
  },

  // --------------------------------------------------------------------------
  // vehicleCapacityCheck({jenisKendaraan, merkKendaraan, kapasitasBeratKg,
  // kapasitasVolumeM3, konsumsiKmPerLiter, hargaBBM, items, totalBeratKg,
  // totalVolumeM3}) — Vehicle Capacity Checker (blueprint §1). Muatan boleh
  // dikasih lewat `items` (reuse packingCalculator() -> weightCalculator()/
  // volumeCalculator() yang sudah ada) ATAU langsung lewat totalBeratKg/
  // totalVolumeM3 kalau pemanggil sudah punya angkanya. Status HANYA 3 nilai
  // sesuai kontrak blueprint: AMAN / HAMPIR_OVERLOAD / OVERLOAD (underscore
  // -- beda dari calculateVehicleCapacity() lama di cobek-pricing.js yang
  // pakai 'HAMPIR OVERLOAD' dgn spasi; fungsi lama itu TIDAK disentuh/diubah,
  // ini kontrak baru terpisah sesuai spec Tahap 3).
  // --------------------------------------------------------------------------
  vehicleCapacityCheck({
    jenisKendaraan, merkKendaraan, kapasitasBeratKg, kapasitasVolumeM3,
    konsumsiKmPerLiter, hargaBBM, items, totalBeratKg, totalVolumeM3,
  } = {}) {
    let totalBerat = parseFloat(totalBeratKg);
    let totalVolume = parseFloat(totalVolumeM3);
    if ((!isFinite(totalBerat) || !isFinite(totalVolume)) && typeof packingCalculator === 'function') {
      const packing = packingCalculator({ items, capacityKg: kapasitasBeratKg, capacityM3: kapasitasVolumeM3 });
      if (!isFinite(totalBerat)) totalBerat = packing.totalKg;
      if (!isFinite(totalVolume)) totalVolume = packing.totalM3;
    }
    totalBerat = Math.max(0, totalBerat || 0);
    totalVolume = Math.max(0, totalVolume || 0);

    const capKg = Math.max(0, parseFloat(kapasitasBeratKg) || 0);
    const capM3 = Math.max(0, parseFloat(kapasitasVolumeM3) || 0);
    const sisaBeratKg = capKg > 0 ? capKg - totalBerat : null;
    const sisaVolumeM3 = capM3 > 0 ? capM3 - totalVolume : null;
    const percentBerat = capKg > 0 ? (totalBerat / capKg) * 100 : null;
    const percentVolume = capM3 > 0 ? (totalVolume / capM3) * 100 : null;
    const percents = [percentBerat, percentVolume].filter((p) => p !== null);
    const percentUsed = percents.length ? Math.max(...percents) : null;
    const status = percentUsed === null ? 'AMAN'
      : percentUsed > 100 ? 'OVERLOAD'
      : percentUsed >= 80 ? 'HAMPIR_OVERLOAD'
      : 'AMAN';

    const fuel = this.fuelCalculator({ jarak: 0, konsumsiKmPerLiter, hargaBBM });

    return {
      jenisKendaraan: jenisKendaraan || null,
      merkKendaraan: merkKendaraan || null,
      totalBeratKg: totalBerat,
      totalVolumeM3: totalVolume,
      kapasitasBeratKg: capKg,
      kapasitasVolumeM3: capM3,
      sisaBeratKg,
      sisaVolumeM3,
      percentUsed: percentUsed !== null ? Math.round(percentUsed * 10) / 10 : null,
      status,
      konsumsiKmPerLiter: fuel.konsumsiKmPerLiter,
      hargaBBM: fuel.hargaBBM,
    };
  },

  // --------------------------------------------------------------------------
  // operationalCost({biayaBBM, biayaSopir, biayaOperasional, biayaLain}) —
  // blueprint §6. biayaSopir eksplisit opsional (default 0), sisanya juga
  // default 0 supaya pemanggil boleh isi sebagian saja.
  // --------------------------------------------------------------------------
  operationalCost({ biayaBBM, biayaSopir, biayaOperasional, biayaLain } = {}) {
    const bbm = Math.max(0, parseFloat(biayaBBM) || 0);
    const sopir = Math.max(0, parseFloat(biayaSopir) || 0);
    const operasional = Math.max(0, parseFloat(biayaOperasional) || 0);
    const lain = Math.max(0, parseFloat(biayaLain) || 0);
    const total = bbm + sopir + operasional + lain;
    return { biayaBBM: bbm, biayaSopir: sopir, biayaOperasional: operasional, biayaLain: lain, total };
  },

  // --------------------------------------------------------------------------
  // smartOngkir({jarak, beratKg, volumeM3, jenisKendaraan, biayaPerKm,
  // biayaOperasional, marginPct}) — blueprint §7: ongkir yang
  // mempertimbangkan jarak+berat+volume+jenis kendaraan+biaya
  // operasional+margin, BUKAN cuma jarak seperti route()/OngkirCalc.leg()
  // lama (fungsi lama TIDAK diubah — lihat "BACKWARD COMPATIBILITY" di
  // blueprint). Rumus: biaya jarak (reuse OngkirCalc.leg() kalau ada, rumus
  // SAMA persis dgn route()) + faktor berat (Rp/kg) + faktor volume (Rp/m3)
  // + biaya operasional, lalu ditambah margin%.
  // --------------------------------------------------------------------------
  smartOngkir({
    jarak, biayaPerKm, pcs, beratKg, rpPerKg, volumeM3, rpPerM3,
    jenisKendaraan, biayaOperasional, marginPct,
  } = {}) {
    const km = Math.max(0, parseFloat(jarak) || 0);
    const rpKm = Math.max(0, parseFloat(biayaPerKm) || 0);
    const p = Math.max(1, parseFloat(pcs) || 1);
    const biayaJarak = (typeof OngkirCalc !== 'undefined' && typeof OngkirCalc.leg === 'function')
      ? OngkirCalc.leg(rpKm, km, p) * p // OngkirCalc.leg() balikin per-pcs, kalikan lagi jadi total etape ini
      : rpKm * km;
    const biayaBerat = Math.max(0, parseFloat(beratKg) || 0) * Math.max(0, parseFloat(rpPerKg) || 0);
    const biayaVolume = Math.max(0, parseFloat(volumeM3) || 0) * Math.max(0, parseFloat(rpPerM3) || 0);
    const opCost = Math.max(0, parseFloat(biayaOperasional) || 0);
    const subtotal = biayaJarak + biayaBerat + biayaVolume + opCost;
    const margin = Math.max(0, parseFloat(marginPct) || 0);
    const totalOngkir = Math.round(subtotal * (1 + margin / 100));
    return {
      jenisKendaraan: jenisKendaraan || null,
      jarak: km, biayaJarak: Math.round(biayaJarak),
      beratKg: parseFloat(beratKg) || 0, biayaBerat: Math.round(biayaBerat),
      volumeM3: parseFloat(volumeM3) || 0, biayaVolume: Math.round(biayaVolume),
      biayaOperasional: opCost,
      marginPct: margin,
      subtotal: Math.round(subtotal),
      totalOngkir,
    };
  },

  // --------------------------------------------------------------------------
  // profitCalculator({totalPenjualan, diskon, ongkir, biayaBBM,
  // biayaOperasional}) — blueprint §8, breakdown LENGKAP (beda dari
  // calculateProfit() lama di cobek-pricing.js yang cuma revenue-modal-
  // ongkir per produk; fungsi lama itu TIDAK diubah). Semua parameter
  // default 0 (boleh isi sebagian).
  // --------------------------------------------------------------------------
  profitCalculator({ totalPenjualan, diskon, ongkir, biayaBBM, biayaOperasional } = {}) {
    const penjualan = Math.max(0, parseFloat(totalPenjualan) || 0);
    const disc = Math.max(0, parseFloat(diskon) || 0);
    const ong = Math.max(0, parseFloat(ongkir) || 0);
    const bbm = Math.max(0, parseFloat(biayaBBM) || 0);
    const op = Math.max(0, parseFloat(biayaOperasional) || 0);
    const penjualanBersih = penjualan - disc;
    const profitBersih = penjualanBersih - ong - bbm - op;
    const marginPct = penjualan > 0 ? (profitBersih / penjualan) * 100 : 0;
    return {
      totalPenjualan: penjualan, diskon: disc, ongkir: ong, biayaBBM: bbm, biayaOperasional: op,
      penjualanBersih, profitBersih, marginPct: Math.round(marginPct * 100) / 100,
    };
  },

  // --------------------------------------------------------------------------
  // deliverySummary(ctx) — blueprint §9, orkestrator TERAKHIR yang
  // menggabungkan §1-§8 jadi satu ringkasan akhir. Sama filosofi dgn plan()
  // lama (tiap bagian yang parameternya tidak dikasih otomatis di-skip,
  // TIDAK menebak default yang berisiko salah). TIDAK memanggil AI/
  // Dashboard/Simulation apa pun (di luar scope Tahap 3 sesuai blueprint).
  // --------------------------------------------------------------------------
  deliverySummary({
    jenisKendaraan, merkKendaraan, kapasitasBeratKg, kapasitasVolumeM3,
    konsumsiKmPerLiter, hargaBBM, items, totalBeratKg, totalVolumeM3,
    jarak, biayaPerKm, pcs,
    rpPerKg, rpPerM3, biayaSopir, biayaOperasionalLain, biayaLain,
    totalPenjualan, diskon, marginPct,
  } = {}) {
    const capacity = this.vehicleCapacityCheck({
      jenisKendaraan, merkKendaraan, kapasitasBeratKg, kapasitasVolumeM3,
      konsumsiKmPerLiter, hargaBBM, items, totalBeratKg, totalVolumeM3,
    });
    const fuel = this.fuelCalculator({ jarak, konsumsiKmPerLiter, hargaBBM });
    const operational = this.operationalCost({
      biayaBBM: fuel.biayaBBM, biayaSopir, biayaOperasional: biayaOperasionalLain, biayaLain,
    });
    const ongkir = this.smartOngkir({
      jarak, biayaPerKm, pcs, beratKg: capacity.totalBeratKg, rpPerKg,
      volumeM3: capacity.totalVolumeM3, rpPerM3, jenisKendaraan,
      biayaOperasional: operational.total, marginPct,
    });
    const profit = (totalPenjualan !== undefined)
      ? this.profitCalculator({
        totalPenjualan, diskon, ongkir: ongkir.totalOngkir,
        biayaBBM: fuel.biayaBBM, biayaOperasional: operational.total - fuel.biayaBBM,
      })
      : null;
    return {
      generatedAt: new Date().toISOString(),
      berat: capacity.totalBeratKg,
      volume: capacity.totalVolumeM3,
      statusKendaraan: capacity.status,
      capacity,
      estimasiBBM: fuel,
      biayaOperasional: operational,
      ongkir,
      profit,
    };
  },
};

if (typeof window !== 'undefined') {
  window.LogisticsEngine = LogisticsEngine;
}
