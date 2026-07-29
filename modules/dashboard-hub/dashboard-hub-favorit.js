// dashboard-hub-favorit.js — Favorit (Tahap 3, Langkah 6): storage + service
// Dipindah ke modules/dashboard-hub/dashboard-hub-favorit.js (Sesi 11 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// MURNI (ADR-001 §3/§4/§5, blueprint Favorit final). Tidak ada DOM/render di
// file ini — itu ada di dashboard-hub-favorit-view.js (Langkah 7-8, sudah
// diimplementasikan; lihat file itu utk render()/toggle()).
//
// Satu pintu mutasi (blueprint final §3): toggleFavorit() di file ini adalah
// SATU-SATUNYA fungsi di seluruh app yang boleh menulis ke D.favoritKeys.
// Renderer/UI handler/file lain dilarang push/splice/assign langsung.
//
// D.favoritKeys: string[] — isi NavEntry.key (cat.key ATAU f.key, ADR-001
// §2), TIDAK PERNAH target/label/icon/snapshot registry apa pun (§3, §5:
// resolve ulang ke FEATURE_REGISTRY dilakukan di layer render Langkah 7,
// bukan di sini). Urutan array = urutan tampil (user-controlled); registry
// TIDAK menentukan urutan, dan fungsi di file ini TIDAK melakukan sorting
// otomatis dalam bentuk apa pun.

function getFavoritKeys() {
  return D.favoritKeys;
}

function toggleFavorit(key) {
  if (!Array.isArray(D.favoritKeys)) D.favoritKeys = [];
  const idx = D.favoritKeys.indexOf(key);
  if (idx !== -1) {
    D.favoritKeys.splice(idx, 1);
  } else {
    D.favoritKeys.push(key);
  }
  save();
}

if (typeof window !== 'undefined') {
  window.DashboardHubFavorit = {
    getFavoritKeys,
    toggleFavorit,
  };
}
