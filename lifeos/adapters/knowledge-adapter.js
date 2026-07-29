// adapters/knowledge-adapter.js — READ-ONLY. D.catatan (catatan privat
// manual, milik keamanan-pin.js/refleksi-selfcare.js dll) dibaca sebagai
// REFERENSI saja — Knowledge base Life OS yang sebenarnya (insight AI
// tersimpan) hidup di LifeOSStore.knowledge, ditulis lewat
// services/knowledge-service.js. Tidak pernah menulis ke D.catatan.
//
// Sesi 38 (target eksplisit user: "Registry Driven Knowledge Adapter"):
// bagian referensi D SEKARANG registry-driven — pola SAMA dgn
// projectAdapterLegacyList()/PROJECT_LEGACY_SOURCE_BUILDERS
// (project-adapter.js, Sesi 36): dispatch per `key` registry lewat
// KNOWLEDGE_REF_SOURCE_BUILDERS, disesuaikan dgn bentuk registry knowledge
// yang SUDAH ADA (`LIFEOS_KNOWLEDGE_REF_SOURCE`, lifeos-registry.js — 1
// objek, bukan array, krn baru ada 1 sumber referensi sejauh ini, sama
// persis kasusnya dgn LIFEOS_PROJECT_LEGACY_SOURCE). String 'catatan' yang
// sebelumnya hardcode di badan fungsi (`D.catatan`) sekarang dibaca dari
// `src.dArr` — kalau registry ini nanti berubah jadi array (>1 sumber
// referensi), builder di bawah tinggal didaftarkan di
// `KNOWLEDGE_REF_SOURCE_BUILDERS` tanpa ubah `knowledgeAdapterCatatanRef()`.
// Bagian utama (LifeOSStore.knowledge, knowledgeAdapterList/ByTag) TIDAK
// disentuh — itu bukan "sumber D" yang perlu didaftarkan di registry,
// melainkan penyimpanan Knowledge base Life OS sendiri (lihat
// services/knowledge-service.js). 0 perubahan output, TIDAK ada
// registry/helper/adapter/storage baru.
//
// Depends on: lifeos-registry.js (LIFEOS_KNOWLEDGE_REF_SOURCE).

function knowledgeAdapterList(lifeOSStore) {
  return (lifeOSStore.knowledge || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function knowledgeAdapterByTag(lifeOSStore, tag) {
  return knowledgeAdapterList(lifeOSStore).filter((k) => (k.tags || []).includes(tag));
}

function knowledgeRefSourceCatatan(D, src) {
  return D[src.dArr] || {};
}

const KNOWLEDGE_REF_SOURCE_BUILDERS = {
  catatan: knowledgeRefSourceCatatan,
};

function knowledgeAdapterCatatanRef(D) {
  // Referensi read-only ke catatan privat lama — ditampilkan sebagai
  // "lihat juga", bukan dimigrasikan/disalin ke LifeOSStore.
  const src = typeof LIFEOS_KNOWLEDGE_REF_SOURCE !== 'undefined' ? LIFEOS_KNOWLEDGE_REF_SOURCE : null;
  if (!src) return {};
  const builder = KNOWLEDGE_REF_SOURCE_BUILDERS[src.key];
  if (typeof builder !== 'function') return {};
  return builder(D, src);
}
