// eie-store.js — SATU-SATUNYA tempat EIE boleh MENULIS/MEMBACA persistensi.
//
// ATURAN WAJIB (sama persis dgn pola lifeos-store.js yang sudah terbukti):
// - Tidak pernah menyentuh D. Tidak ada property baru di D, tidak ada
//   perubahan struktur D sedikit pun.
// - Tidak pernah memanggil save() milik D.
// - Persist lewat IDBStore (reuse instance global yang sama dgn app), key
//   'eie:store', terpisah total dari siklus save/load milik D & LifeOSStore.
// - Semua modul lain di economic-intelligence/ (adapters, engine, services,
//   ui) mengakses store ini HANYA lewat eieLoad()/eieSave()/eieGetStore()
//   di file ini — jangan import/re-declare state terpisah di file lain.

let EIEStore = {
  macroCache: {},        // { [indicatorId]: MacroSnapshot }
  macroHistory: {},       // { [indicatorId]: MacroSnapshot[] } — dipakai statistik volatilitas (§7 ERI, fase 2)
  scoreHistory: [],       // EIEScoreSnapshot[] — 1 entry/hari
  insights: [],           // Insight[] — feed personalisasi
  ruleCooldowns: {},      // { [ruleId]: epochMsTerakhirTrigger }
  scenariosSaved: [],     // preset What-If tersimpan user (fase 2)
  lastSyncAt: null,
  notificationsEnabled: false, // fase 3: toggle user di Pengaturan, default OFF (lihat services/notification-service.js)
};

const EIE_STORE_KEY = 'eie:store';
const EIE_STORE_DEFAULT = {
  macroCache: {}, macroHistory: {}, scoreHistory: [], insights: [],
  ruleCooldowns: {}, scenariosSaved: [], lastSyncAt: null,
  notificationsEnabled: false,
};

async function eieLoad() {
  // CATATAN: sama seperti lifeos-store.js — IDBStore.get() cuma terima 1
  // argumen, default diterapkan manual di sini.
  const raw = await IDBStore.get(EIE_STORE_KEY);
  // Merge dgn default supaya field baru yg ditambah versi selanjutnya
  // (mis. scenariosSaved di fase 2) tidak bikin `undefined` di data lama user.
  EIEStore = Object.assign({}, EIE_STORE_DEFAULT, raw || {});
  return EIEStore;
}

let _eieLoaded = false;
// Dipanggil oleh SATU entry point (services/*) — load dari IDBStore SEKALI
// per sesi, bukan tiap render, supaya tidak round-trip IndexedDB tiap kali
// dashboard/status ekonomi dibuka.
async function eieEnsureLoaded() {
  if (!_eieLoaded) {
    await eieLoad();
    _eieLoaded = true;
  }
  return EIEStore;
}

async function eieSave() {
  return IDBStore.set(EIE_STORE_KEY, EIEStore);
}

function eieGetStore() {
  return EIEStore;
}

/** Invalidate cache "sudah dimuat sekali per sesi" (lihat eieEnsureLoaded()
 * di atas). SATU-SATUNYA pemanggil yang sah: applyRestoredData()
 * (backup-restore.js), setelah menulis ulang key 'eie:store' di IndexedDB
 * dari file backup — supaya render berikutnya (EIEDashboard.render()) baca
 * ULANG dari IndexedDB, bukan state lama di memori dari SEBELUM restore.
 * Dipanggil lewat guard `typeof eieInvalidateCache==='function'` di
 * pemanggil, pola yang sama dgn cross-module check lain di app ini. */
function eieInvalidateCache() {
  _eieLoaded = false;
}
