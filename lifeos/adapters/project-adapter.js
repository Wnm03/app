// adapters/project-adapter.js — merge READ-ONLY antara dua sumber:
//   1. D.renovProjects        (legacy, milik renovasi.js — tidak disentuh)
//   2. LifeOSStore.projects   (generic, milik Life OS — lihat services/project-service.js untuk tulis)
//
// Adapter ini hanya membaca kedua sumber & menyatukan bentuknya. Tidak
// pernah menulis ke D.renovProjects. Penulisan project generik lewat
// project-service.js, bukan di sini.
//
// Sesi 36 (target eksplisit user: "Registry Driven Project Adapter"):
// bagian legacy SEKARANG registry-driven — pola SAMA dgn
// today-adapter.js/TODAY_SOURCE_BUILDERS & goal-adapter.js/
// GOAL_SOURCE_BUILDERS (dispatch per `key` registry, key tanpa builder
// dilewati aman/tidak throw), disesuaikan dgn bentuk registry project yang
// SUDAH ADA (`LIFEOS_PROJECT_LEGACY_SOURCE`, lifeos-registry.js — 1 objek,
// bukan array, krn baru ada 1 sumber legacy sejauh ini). String
// 'renovasi'/'business'/'renovProjects' yang sebelumnya hardcode di badan
// fungsi sekarang dibaca dari `src.key`/`src.areaKey`/`src.dArr` — kalau
// registry ini nanti berubah jadi array (>1 sumber legacy), builder di
// bawah tinggal didaftarkan di `PROJECT_LEGACY_SOURCE_BUILDERS` tanpa ubah
// `projectAdapterList()`. Bagian generic (LifeOSStore.projects) TIDAK
// disentuh — itu bukan "sumber D" yang perlu didaftarkan di registry,
// melainkan penyimpanan generik Life OS sendiri (lihat project-service.js).
//
// Depends on: lifeos-registry.js (LIFEOS_PROJECT_LEGACY_SOURCE).

function projectSourceRenovasi(D, src) {
  return (D[src.dArr] || []).map((p) => ({
    id: `${src.key}:${p.id}`, kind: src.key, sourceRef: { arr: src.dArr, id: p.id },
    name: p.name, areaKey: src.areaKey, status: 'active',
    dueDate: null, createdAt: p.createdAt,
    checklistCount: (p.items || []).length,
  }));
}

const PROJECT_LEGACY_SOURCE_BUILDERS = {
  renovasi: projectSourceRenovasi,
};

function projectAdapterLegacyList(D) {
  const src = typeof LIFEOS_PROJECT_LEGACY_SOURCE !== 'undefined' ? LIFEOS_PROJECT_LEGACY_SOURCE : null;
  if (!src) return [];
  const builder = PROJECT_LEGACY_SOURCE_BUILDERS[src.key];
  if (typeof builder !== 'function') return [];
  return builder(D, src);
}

function projectAdapterList(D, lifeOSStore) {
  const legacy = projectAdapterLegacyList(D);

  const generic = (lifeOSStore.projects || []).map((p) => ({
    id: `generic:${p.id}`, kind: 'generic', sourceRef: null,
    name: p.name, areaKey: p.areaKey, status: p.status,
    dueDate: p.dueDate || null, createdAt: p.createdAt,
    checklistCount: (p.checklist || []).length,
  }));

  return [...legacy, ...generic];
}

function projectAdapterFindOne(D, lifeOSStore, id) {
  return projectAdapterList(D, lifeOSStore).find((p) => p.id === id) || null;
}
