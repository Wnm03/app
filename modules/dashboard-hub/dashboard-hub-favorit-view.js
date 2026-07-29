// dashboard-hub-favorit-view.js — Favorit (Tahap 3, Langkah 7-8): render +
// Dipindah ke modules/dashboard-hub/dashboard-hub-favorit-view.js (Sesi 11 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// toggle button wiring. Sengaja file TERPISAH dari dashboard-hub-favorit.js
// (storage murni, Langkah 6) supaya guard test "window.DashboardHubFavorit
// HANYA mengekspos getFavoritKeys & toggleFavorit" (tests/
// dashboard-hub-favorit.test.js) tidak perlu diubah — object window baru
// (DashboardHubFavoritView) dipakai utk API yang menyentuh DOM, bukan
// menambah method ke DashboardHubFavorit yang sudah dites & disepakati.
//
// ADR-001 kepatuhan (lihat tahap3-favorit-design-review.md §2):
//   §3 — kartu Favorit resolve label/icon/desc/target dari FEATURE_REGISTRY
//        SETIAP render (bukan snapshot yang disalin ke penyimpanan Favorit).
//   §4 — satu-satunya cara "membuka" kartu Favorit tetap
//        data-action="DashboardHub.open" data-args=[key]. Tidak ada
//        Favorit.open()/launch()/navigate() di file ini.
//   §5 — resolveFavoritEntries() TIDAK memutasi FEATURE_REGISTRY maupun
//        D (lewat DashboardHubFavorit.getFavoritKeys()) — baca saja.

// resolveFavoritEntries — cari tiap key favorit ke FEATURE_REGISTRY,
// urutan pencarian SAMA PERSIS dgn DashboardHub.open() (cat.key dulu, baru
// f.key di seluruh cat.features) supaya "yang bisa di-resolve di sini" =
// "yang beneran bisa dibuka DashboardHub.open()" (§4.1/§4.2 desain: kategori
// tanpa target & key yang sudah tidak ada di registry SENGAJA di-skip dari
// hasil, bukan ditampilkan rusak/basi). Urutan HASIL mengikuti urutan
// favoritKeys (bukan urutan registry) — §4.4.
function resolveFavoritEntries(favoritKeys, registry) {
  const entries = [];
  if (!Array.isArray(favoritKeys) || !Array.isArray(registry)) return entries;
  for (const key of favoritKeys) {
    const cat = registry.find((c) => c && c.key === key);
    if (cat) {
      if (cat.target) {
        entries.push({ key: cat.key, label: cat.label, desc: cat.desc, icon: cat.icon, target: cat.target });
      }
      // Kategori tanpa target: SENGAJA di-skip (§4.2) — bukan sesuatu yang
      // bisa dibuka lewat DashboardHub.open(), jadi tidak layak jadi kartu
      // Favorit walau key-nya "valid" secara taksonomi.
      continue;
    }
    let found = null;
    for (const c of registry) {
      if (!c || !Array.isArray(c.features)) continue;
      const f = c.features.find((x) => x && x.key === key);
      if (f) { found = f; break; }
    }
    if (found) {
      entries.push({ key: found.key, label: found.label, desc: found.desc, icon: found.icon || null, target: found.target });
    }
    // Key tidak ketemu di kategori maupun leaf manapun -> fitur/kategori itu
    // sudah dihapus developer dari registry -> di-skip diam-diam (§4.1
    // opsi A, direkomendasikan desain: filter saat render, TIDAK membersihkan
    // state favorit dari sini supaya tidak ada side-effect nulis saat render).
  }
  return entries;
}

const DashboardHubFavoritView = {
  render() {
    const section = document.getElementById('dashHubFavoritSection');
    const list = document.getElementById('dashHubFavoritList');
    if (!section || !list) return;
    if (typeof FEATURE_REGISTRY === 'undefined' || typeof DashboardHubFavorit === 'undefined') {
      list.innerHTML = '';
      section.classList.add('u-dnone');
      return;
    }
    const entries = resolveFavoritEntries(DashboardHubFavorit.getFavoritKeys(), FEATURE_REGISTRY);
    if (!entries.length) {
      // Bukan cuma u-dnone — innerHTML juga dikosongkan, supaya "sengaja
      // kosong" tidak bisa disalahartikan sbg "bug render" kalau nanti
      // ada yang inspect DOM langsung (lihat rencana pengujian §5).
      list.innerHTML = '';
      section.classList.add('u-dnone');
      return;
    }
    section.classList.remove('u-dnone');
    list.innerHTML = entries.map((it) => `
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="DashboardHub.open" data-args='${escapeHtml(JSON.stringify([it.key]))}' title="${escapeHtml(it.desc || '')}">
        <div class="dashhub-fav-star is-fav" data-stop data-action="DashboardHubFavoritView.toggle" data-args='${escapeHtml(JSON.stringify([it.key]))}' role="button" tabindex="0" aria-label="${'Hapus dari favorit: ' + escapeHtml(it.label)}">★</div>
        <div class="dashhub-feature-icon">${(typeof FeatureIcons !== 'undefined') ? FeatureIcons.render(it.icon || '⭐') : (it.icon || '⭐')}</div>
        <div class="dashhub-feature-name">${escapeHtml(it.label)}</div>
      </div>
    `).join('');
  },

  // toggle(key) — SATU-SATUNYA jalur UI utk nambah/hapus Favorit (Langkah 8,
  // tombol ★). Delegasi mutasi ke DashboardHubFavorit.toggleFavorit(key)
  // (satu pintu mutasi, lihat dashboard-hub-favorit.js) lalu
  // re-render SECTION FAVORIT SAJA (§4.5) — TIDAK memanggil DashboardHub.
  // render() penuh, supaya scroll position / hasil Search yang sedang
  // terbuka tidak ikut ke-reset.
  toggle(key) {
    if (typeof DashboardHubFavorit === 'undefined') return;
    DashboardHubFavorit.toggleFavorit(key);
    this.render();
    // Sinkronkan ★ di kartu asal (grid Hub biasa & hasil Search) kalau kartu
    // itu sedang visible di DOM — murni kosmetik class toggle, BUKAN
    // re-render ulang grid/Search (§4.5, alasan sama seperti di atas).
    if (typeof document !== 'undefined') {
      const isFav = typeof DashboardHubFavorit !== 'undefined' && DashboardHubFavorit.getFavoritKeys().indexOf(key) !== -1;
      const stars = document.querySelectorAll ? document.querySelectorAll('.dashhub-fav-star[data-args=\'["' + key + '"]\']') : [];
      stars.forEach((starEl) => {
        if (starEl.closest && starEl.closest('#dashHubFavoritSection')) return; // sudah di-render ulang di atas
        starEl.classList.toggle('is-fav', isFav);
      });
    }
  },
};

if (typeof window !== 'undefined') {
  window.DashboardHubFavoritView = DashboardHubFavoritView;
}
