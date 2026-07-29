// adapters/review-adapter.js — READ-ONLY. Menggabungkan histori pasif
// existing (D.wealthSnapshots, D.lifeBalanceSnapshots, D.assetAllocation)
// dengan sesi review Life OS sendiri (LifeOSStore.reviewLog). Tidak pernah
// menulis ke D. Penulisan sesi review lewat services/review-service.js.
//
// Sesi 37 (target eksplisit user: "Registry Driven Review Adapter"):
// reviewAdapterLatestSnapshots() SEKARANG registry-driven — pola SAMA dgn
// today-adapter.js/TODAY_SOURCE_BUILDERS, goal-adapter.js/
// GOAL_SOURCE_BUILDERS, & project-adapter.js/PROJECT_LEGACY_SOURCE_BUILDERS
// (Sesi 36): iterasi LIFEOS_REVIEW_SOURCES (lifeos-registry.js) lalu
// dispatch ke builder di REVIEW_SOURCE_BUILDERS berdasar `key` registry —
// key tanpa builder terdaftar dilewati aman (tidak throw). String nama
// array D ('wealthSnapshots'/'lifeBalanceSnapshots'/'assetAllocation')
// yang sebelumnya hardcode 3x di badan fungsi sekarang dibaca dari
// `src.dArr`. 2 builder ('wealth'/'lifeBalance') ambil item TERAKHIR dari
// array snapshot; 1 builder ('assetAlloc') baca objek tunggal langsung
// (bukan array) — dibedakan krn bentuk datanya memang beda, bukan
// arsitektur baru. Nama field output tetap sama persis dgn sebelum
// migrasi (wealth/lifeBalance/assetAllocation, dipetakan lewat
// `REVIEW_OUTPUT_FIELD`) supaya `lifeos/ui/review.js` yang sudah baca
// `snapshots.wealth`/`snapshots.lifeBalance` TIDAK perlu berubah — 0
// perubahan output, backward compatible penuh.
//
// Depends on: lifeos-registry.js (LIFEOS_REVIEW_SOURCES).

function reviewSourceLastSnapshot(D, src) {
  return (D[src.dArr] || []).slice(-1)[0] || null;
}

function reviewSourceDirect(D, src) {
  return D[src.dArr] || null;
}

const REVIEW_SOURCE_BUILDERS = {
  wealth: reviewSourceLastSnapshot,
  lifeBalance: reviewSourceLastSnapshot,
  assetAlloc: reviewSourceDirect,
};

// Nama field output legacy (dipakai lifeos/ui/review.js) berbeda dari
// `key` registry untuk 1 sumber (`assetAlloc` -> `assetAllocation`) —
// dipetakan di sini supaya bentuk hasil TIDAK berubah, bukan hardcode
// ulang nama array D-nya (itu tetap dari `src.dArr`).
const REVIEW_OUTPUT_FIELD = {
  wealth: 'wealth',
  lifeBalance: 'lifeBalance',
  assetAlloc: 'assetAllocation',
};

function reviewAdapterLatestSnapshots(D) {
  const out = {};
  const sources = typeof LIFEOS_REVIEW_SOURCES !== 'undefined' ? LIFEOS_REVIEW_SOURCES : [];
  sources.forEach((src) => {
    const builder = REVIEW_SOURCE_BUILDERS[src.key];
    if (typeof builder !== 'function') return;
    const field = REVIEW_OUTPUT_FIELD[src.key] || src.key;
    out[field] = builder(D, src);
  });
  return out;
}

function reviewAdapterLogFor(lifeOSStore, period) {
  return (lifeOSStore.reviewLog || [])
    .filter((r) => r.period === period)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

function reviewAdapterIsOverdue(lifeOSStore, period, thresholdDays) {
  const last = reviewAdapterLogFor(lifeOSStore, period)[0];
  if (!last) return true;
  const daysSince = Math.floor((Date.now() - new Date(last.completedAt)) / (1000 * 60 * 60 * 24));
  return daysSince >= thresholdDays;
}
