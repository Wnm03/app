// ai-core.js — Smart Delivery Engine, Sesi 1/6: fondasi murni.
//
// Lihat RENCANA-SESI-RINGKAS.md (Smart Delivery Engine) untuk peta 6 sesi
// lengkap. Sesi ini CUMA fondasi (bus + storage + context) — TANPA fitur,
// TANPA decision/rule/recommend/learn (itu Sesi 2), TANPA logistics
// (Sesi 3), TANPA wiring ke modul lain (Sesi 6). File ini sengaja tidak
// berefek apa pun ke app yang berjalan sampai Sesi 2+ mulai memakainya.
//
// Kenapa 1 file, bukan 3 (ai-core.js + ai-context.js + ai-storage.js +
// ai-event-engine.js) seperti blueprint asli — lihat RENCANA-SESI-RINGKAS.md
// bagian "Kenapa dipangkas". Isinya tetap 3 lapisan terpisah, cuma
// dikumpulkan jadi 1 file lewat 3 namespace: AIBus, AIStore, AIContext.
//
// ATURAN WAJIB (sama persis pola eie-bus.js/eie-store.js yang sudah
// terbukti dipakai di economic-intelligence/):
// - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada
//   perubahan struktur D sedikit pun.
// - Tidak pernah memanggil save() milik D.
// - Persist lewat IDBStore (reuse instance global yang sama dgn app), key
//   'ai:store', terpisah total dari siklus save/load milik D, LifeOSStore,
//   & EIEStore.
// - Modul lain di modules/ai/ (ai-decision-engine.js dkk, Sesi 2+) mengakses
//   store ini HANYA lewat aiLoad()/aiSave()/aiGetStore() di file ini —
//   jangan import/re-declare state terpisah di file lain.

// ------------------------------------------------------------------------
// AIBus — event bus internal Smart Delivery Engine. Pub/sub sederhana,
// TIDAK bergantung library luar, TIDAK menyentuh IndexedDB. Dipakai supaya
// decision-engine/logistics-engine (Sesi 2-3) bisa "memancarkan" event
// (mis. 'ai:recommendation-ready', 'ai:decision-made') tanpa listener
// (service/UI) perlu polling.
//
// PENTING (Sesi 1 — "senyap"): bus ini TIDAK auto-listen ke apa pun secara
// default. Tidak ada notifikasi/toast yang terpasang di file ini. Modul
// lain baru aktif kalau di-subscribe eksplisit (Sesi 2+).
// ------------------------------------------------------------------------
const AIBus = {
  _listeners: Object.create(null),

  on(eventName, handler) {
    if (!this._listeners[eventName]) this._listeners[eventName] = [];
    this._listeners[eventName].push(handler);
    return () => this.off(eventName, handler); // unsubscribe helper
  },

  off(eventName, handler) {
    const arr = this._listeners[eventName];
    if (!arr) return;
    this._listeners[eventName] = arr.filter((h) => h !== handler);
  },

  emit(eventName, payload) {
    const arr = this._listeners[eventName];
    if (!arr || !arr.length) return;
    // Salin array supaya handler yang unsubscribe di tengah iterasi aman.
    arr.slice().forEach((handler) => {
      try {
        handler(payload);
      } catch (e) {
        // AI Core tidak boleh menjatuhkan app utama kalau 1 listener error.
        console.warn('[AICore] Listener error untuk event "' + eventName + '":', e);
      }
    });
  },
};

// ------------------------------------------------------------------------
// AIStore — SATU-SATUNYA tempat Smart Delivery Engine boleh MENULIS/MEMBACA
// persistensi. Struktur field disiapkan longgar dari sekarang (Sesi 1)
// supaya Sesi 2 (decision/rule/recommend/learn) & Sesi 3 (logistics) tinggal
// mengisi, bukan menambah key baru yang berisiko lupa didaftarkan.
// ------------------------------------------------------------------------
let AIStore = {
  decisionLog: [],   // DecisionLogEntry[] — riwayat keputusan AI (diisi Sesi 2)
  recommendations: [], // Recommendation[] — rekomendasi aktif (diisi Sesi 2)
  learningData: {},   // { [key]: any } — data pembelajaran ringan (diisi Sesi 2)
  ruleCooldowns: {},  // { [ruleId]: epochMsTerakhirTrigger } (diisi Sesi 2)
  lastRunAt: null,
};

const AI_STORE_KEY = 'ai:store';
const AI_STORE_DEFAULT = {
  decisionLog: [], recommendations: [], learningData: {},
  ruleCooldowns: {}, lastRunAt: null,
};

async function aiLoad() {
  // CATATAN: sama seperti eie-store.js/lifeos-store.js — IDBStore.get()
  // cuma terima 1 argumen, default diterapkan manual di sini.
  const raw = await IDBStore.get(AI_STORE_KEY);
  // Merge dgn default supaya field baru yg ditambah sesi selanjutnya
  // (mis. learningData isi baru di Sesi 2) tidak bikin `undefined` di
  // data lama user.
  AIStore = Object.assign({}, AI_STORE_DEFAULT, raw || {});
  return AIStore;
}

let _aiLoaded = false;
// Dipanggil oleh SATU entry point (service Sesi 2+) — load dari IDBStore
// SEKALI per sesi app, bukan tiap render, supaya tidak round-trip
// IndexedDB tiap kali fitur AI dibuka.
async function aiEnsureLoaded() {
  if (!_aiLoaded) {
    await aiLoad();
    _aiLoaded = true;
  }
  return AIStore;
}

async function aiSave() {
  return IDBStore.set(AI_STORE_KEY, AIStore);
}

function aiGetStore() {
  return AIStore;
}

/** Invalidate cache "sudah dimuat sekali per sesi" (lihat aiEnsureLoaded()
 * di atas). Pemanggil yang sah: applyRestoredData() (backup-restore.js),
 * setelah menulis ulang key 'ai:store' di IndexedDB dari file backup —
 * supaya render berikutnya baca ULANG dari IndexedDB, bukan state lama di
 * memori dari SEBELUM restore. Dipanggil lewat guard
 * `typeof aiInvalidateCache==='function'`, pola yang sama dgn cross-module
 * check lain di app ini. Wiring pemanggilan sebenarnya baru di Sesi 6. */
function aiInvalidateCache() {
  _aiLoaded = false;
}

// ------------------------------------------------------------------------
// AIContext — pembaca READ-ONLY ringkasan state app yang relevan buat AI
// (finance/shop/vehicle dst), TANPA menyentuh/menulis D sama sekali. Dipakai
// decision-engine (Sesi 2) & logistics-engine (Sesi 3) supaya tidak
// masing-masing baca D langsung dgn cara berbeda-beda.
//
// Sesi 1: hanya kerangka + snapshot() umum (timestamp + hasAppData).
// Sesi 13: Context Collector per-domain (lihat 4 builder `_aiContext*` di
// bawah) — fondasi wajib sebelum rule Cross Module Finance+Delivery
// (TODO.md #2) bisa membaca 2+ domain dalam 1 condition(). Lihat komentar
// di atas tiap builder untuk sumber fungsi yang di-reuse per domain.
// ------------------------------------------------------------------------

// _aiContextFinance() — reuse computeCashflowForecast() (tx-list-cashflow.js,
// Sesi 5) APA ADANYA, ambil field yang relevan buat rule cross-module
// (saldo & rata-rata arus kas). TIDAK menghitung ulang rumus apa pun di
// sini. Guard: skip (`available:false`) kalau D belum ada ATAU
// computeCashflowForecast belum di-load (mis. test yang cuma load
// ai-core.js sendirian) — TIDAK melempar error.
function _aiContextFinance() {
  if (typeof D === 'undefined' || !D || typeof computeCashflowForecast !== 'function') {
    return { available: false };
  }
  const cf = computeCashflowForecast();
  return {
    available: true,
    saldoNow: cf.saldoNow,
    incAvgBulanan: cf.incAvg,
    expAvgBulanan: cf.expAvg,
    billsDue30Hari: cf.billsDue,
    billsDueCount: (cf.upcoming || []).length,
    projected30Hari: cf.projected,
  };
}

// _aiContextAsset() — reuse netWorthForecast() (aset.js, Sesi 6) APA
// ADANYA. monthsAhead sengaja kecil (1) krn snapshot cuma butuh sinyal
// tren TERDEKAT (naik/turun), bukan proyeksi jangka panjang penuh (itu
// tugas fitur proyeksi Aset sendiri, bukan context collector ini). Skip
// kalau netWorthForecast belum di-load ATAU balikin {ok:false} (data
// histori belum cukup, lihat komentar netWorthForecast di aset.js).
// (Sesi 265, Ownership Sync — AI): assetCount SEKARANG hanya menghitung
// aset ownership SELF, reuse isAssetOwnershipSelf() (aset.js, Sesi 193),
// pola sama persis _aiContextVehicle() di bawah (Sesi 197). Guard typeof:
// kalau helper belum dimuat, anggap semua SELF (tidak exclude apa pun).
function _aiContextAsset() {
  if (typeof D === 'undefined' || !D || typeof netWorthForecast !== 'function') {
    return { available: false };
  }
  const fc = netWorthForecast({ monthsAhead: 1 });
  if (!fc.ok) return { available: false, reason: fc.reason };
  const assetSelfFilter = typeof isAssetOwnershipSelf === 'function' ? isAssetOwnershipSelf : (() => true);
  return {
    available: true,
    assetCount: Array.isArray(D.assets) ? D.assets.filter(assetSelfFilter).length : 0,
    netWorthNow: fc.netWorthNow,
    metode: fc.metode,
    trend: fc.projectedEnd >= fc.netWorthNow ? 'naik' : 'turun',
  };
}

// _aiContextVehicle() — reuse fuelEfficiency(vehicleId) (vehicle-core.js,
// Sesi 8, SUDAH dipakai rule vehicle-fuel-efficiency-drop Sesi 12) per
// kendaraan di D.vehicles. Kendaraan dgn histori kurang (fuelEfficiency
// balikin {ok:false}) TETAP masuk daftar (rpPerKm/estMonthlyCost null),
// TIDAK di-skip dari array, supaya vehicleCount tetap konsisten dgn
// D.vehicles.length.
// _aiContextVehicle() (Sesi 197, Ownership Sync — AI): TAMBAH 1 filter
// isVehicleOwnershipSelf(v.id) di atas D.vehicles (0 logic lama diubah) —
// kendaraan ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan
// dari context AI Daily Briefing, pola sama persis isVehicleOwnershipSelf()
// di vehicle-core.js (Sesi 196). Guard typeof: kalau helper belum dimuat,
// anggap semua SELF (tidak exclude apa pun).
function _aiContextVehicle() {
  if (typeof D === 'undefined' || !D || !Array.isArray(D.vehicles) || typeof fuelEfficiency !== 'function') {
    return { available: false };
  }
  const selfVehicles = D.vehicles.filter((v) => typeof isVehicleOwnershipSelf !== 'function' || isVehicleOwnershipSelf(v.id));
  const vehicles = selfVehicles.map((v) => {
    const eff = fuelEfficiency(v.id);
    return {
      id: v.id,
      name: v.name,
      rpPerKm: eff.ok ? eff.rpPerKm : null,
      estMonthlyCost: eff.ok ? eff.estMonthlyCost : null,
    };
  });
  return { available: true, vehicleCount: vehicles.length, vehicles };
}

// _aiContextShop() — dua sinyal ringan Shop/Delivery, keduanya reuse yang
// SUDAH ADA:
// 1) lowStock: reuse _deliveryLowStockCheck() (cobek-pricing.js, Sesi 8)
//    APA ADANYA (ambang sudah bisa diatur user lewat
//    getAIDeliveryLowStockThreshold()).
// 2) recentAvgMarginPct: 5 transaksi Cobek terakhir, pola sort SAMA PERSIS
//    dgn Order.renderRecent() (cobek-order.js): `(b.id||0)-(a.id||0)`.
//    Formula margin (profit/total*100) SAMA PERSIS dgn yang dipakai emit
//    event 'delivery.created' di Order._saveInner() (cobek-order.js) —
//    field profit/total SUDAH tersimpan di tiap entri D.cobek, di sini
//    cuma dibaca ulang + dirata-rata, BUKAN rumus baru.
// _aiContextShop() (Sesi 265, Ownership Sync — AI): TAMBAH filter
// isProductOwnershipSelf/isCobekOwnershipSelf (0 logic lama diubah), pola
// sama persis prodSelfFilter/cobSelfFilter di feature-insights.js (S260) —
// produk/transaksi Cobek ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY
// dikecualikan dari context AI Daily Briefing. Guard typeof: kalau helper
// belum dimuat, anggap semua SELF (tidak exclude apa pun).
function _aiContextShop() {
  if (typeof D === 'undefined' || !D || !Array.isArray(D.cobek) || !Array.isArray(D.products)) {
    return { available: false };
  }
  const prodSelfFilter = typeof isProductOwnershipSelf === 'function' ? isProductOwnershipSelf : (() => true);
  const cobSelfFilter = typeof isCobekOwnershipSelf === 'function' ? isCobekOwnershipSelf : (() => true);
  const lowStock = (typeof _deliveryLowStockCheck === 'function') ? _deliveryLowStockCheck() : null;
  const recent = D.cobek
    .filter((c) => typeof c.profit === 'number' && typeof c.total === 'number' && c.total > 0)
    .filter(cobSelfFilter)
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 5);
  const recentAvgMarginPct = recent.length
    ? Math.round((recent.reduce((s, c) => s + (c.profit / c.total) * 100, 0) / recent.length) * 100) / 100
    : null;
  return {
    available: true,
    productCount: D.products.filter(prodSelfFilter).length,
    lowStockCount: lowStock ? lowStock.low.length : null,
    recentAvgMarginPct,
    recentOrdersConsidered: recent.length,
  };
}

// _aiMeasureMs(fn)/_aiMeasureMsAsync(fn) — Tahap 8 (Performance Check,
// TODO.md #4e). Helper timing generik TUNGGAL, dipakai ulang oleh
// AIService.healthCheck() (satu-satunya pemanggil sejauh ini) buat
// mengukur durasi eksekusi 5 fungsi yang jadi scope Performance Check
// (Context Collector/Rule Evaluation/Recommendation/Daily Briefing/
// Simulation — lihat docs/PRODUCT_DECISIONS.md § Performance Check).
// Pakai Date.now() (bukan performance.now()) supaya konsisten dgn pola
// timestamp yang sudah dipakai di seluruh modules/ai/ (mis.
// ai-decision-engine.js _inCooldown()/_markCooldown()) & tetap jalan di
// harness test (tests/helpers/loadSource.js tidak menyediakan global
// `performance` di sandbox vm-nya). Resolusi ms cukup buat "cek sehat",
// bukan micro-benchmark presisi tinggi. Murni wrapper — TIDAK menulis
// apa pun, TIDAK mengubah nilai balik fn asli (`result` dikembalikan apa
// adanya supaya pemanggil bisa tetap pakai hasilnya kalau perlu).
function _aiMeasureMs(fn) {
  const start = Date.now();
  const result = fn();
  return { result, ms: Date.now() - start };
}

async function _aiMeasureMsAsync(fn) {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

const AIContext = {
  // snapshot() — ringkasan umum (timestamp + status ketersediaan D) DITAMBAH
  // ringkasan per-domain (finance/asset/vehicle/shop, Sesi 13). Tiap domain
  // sengaja dibungkus builder terpisah (`_aiContext*` di atas) yang SELALU
  // guard lewat `typeof fn==='function'` supaya domain yang belum di-load
  // di-skip (`{available:false}`) alih-alih melempar error atau menebak
  // bentuk data. PURE/read-only — tidak pernah menulis ke D atau memanggil
  // save() di jalur ini.
  snapshot() {
    return {
      generatedAt: new Date().toISOString(),
      hasAppData: typeof D !== 'undefined' && D !== null,
      finance: _aiContextFinance(),
      asset: _aiContextAsset(),
      vehicle: _aiContextVehicle(),
      shop: _aiContextShop(),
    };
  },
};

// Expose ke window kalau dijalankan di browser (pola sama dgn EIEBus/
// EIEStore/LifeOSStore — modul lain akses lewat variabel global ini,
// bukan module.exports, karena app ini tidak pakai bundler ES module).
if (typeof window !== 'undefined') {
  window.AIBus = AIBus;
  window.AIContext = AIContext;
}
