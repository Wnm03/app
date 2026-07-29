// dashboard-hub-search.js — Feature Search: cari FITUR/MENU (bukan data
// Dipindah ke modules/dashboard-hub/dashboard-hub-search.js (Sesi 11 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// transaksi) lintas kategori FEATURE_REGISTRY (blueprint-dashboard-hub.md
// §2 & §6). Berbeda tujuan dari Global Search existing (`openGlobalSearch`)
// yang mencari DATA milik user (transaksi/produk/dst) — lihat blueprint §2.
//
// Perluasan POLA (bukan pemanggilan langsung) dari stgSearch() di
// pengaturan-search.js: stgSearch nge-scan DOM (.card) & langsung highlight,
// cukup buat 1 halaman Pengaturan. Feature Search di sini beda krn harus
// menghasilkan METADATA (kategori, ikon) buat dropdown lintas-halaman, jadi
// dibangun dari data FEATURE_REGISTRY (dashboard-hub-registry.js), bukan
// DOM scan.
//
// dashHubSearchFeatures() SENGAJA fungsi murni (query, registry) => array,
// tidak menyentuh DOM sama sekali — supaya gampang dites tanpa fakeDocument
// & bisa dipakai ulang di tempat lain kalau perlu (mis. command palette).
// DashboardHubSearch.render()/select() baru menyentuh DOM, dipanggil dari
// markup (oninput/data-action) — elemen `dashHubSearchResults`/
// `dashHubSearchInput` sudah tersambung di index.html/app_production.html
// sejak Tahap 2 (blueprint §5 "Hubungkan navigasi").

function dashHubSearchFeatures(queryRaw, registry) {
  const q = String(queryRaw || '').trim().toLowerCase();
  if (!q || !Array.isArray(registry)) return [];
  const results = [];
  for (const cat of registry) {
    if (!cat || !Array.isArray(cat.features)) continue;

    // Langkah 4 (ADR-001 §5): kategori yang PUNYA target ikut dicari &
    // muncul sbg hasil sendiri ("app-level open"). Kategori TANPA target
    // SENGAJA tidak pernah dimasukkan — bukan sesuatu yang bisa "dibuka"
    // lewat DashboardHub.open() (§4 poin 1: hasilnya cuma console.warn).
    if (cat.target) {
      const catHaystack = [cat.label, cat.desc].filter(Boolean).join(' ').toLowerCase();
      if (catHaystack.indexOf(q) !== -1) {
        results.push({
          key: cat.key,
          label: cat.label,
          desc: cat.desc,
          catKey: cat.key,
          catLabel: cat.label,
          catIcon: cat.icon,
          icon: cat.icon,
          target: cat.target,
        });
      }
    }

    for (const f of cat.features) {
      if (!f) continue;
      const haystack = [f.label, f.desc, cat.label].filter(Boolean).join(' ').toLowerCase();
      if (haystack.indexOf(q) !== -1) {
        results.push({
          key: f.key,
          label: f.label,
          desc: f.desc,
          catKey: cat.key,
          catLabel: cat.label,
          catIcon: cat.icon,
          icon: f.icon || cat.icon,
          target: f.target,
        });
      }
    }
  }
  return results;
}

const DashboardHubSearch = {
  search(query) {
    if (typeof FEATURE_REGISTRY === 'undefined') return [];
    return dashHubSearchFeatures(query, FEATURE_REGISTRY);
  },

  render(query) {
    const el = document.getElementById('dashHubSearchResults');
    if (!el) return;
    const q = String(query || '').trim();
    if (!q) {
      el.innerHTML = '';
      el.classList.add('u-dnone');
      return;
    }
    const matches = this.search(q);
    el.classList.remove('u-dnone');
    if (!matches.length) {
      el.innerHTML = '<div class="dashhub-search-empty">⚠️ Tidak ada fitur yang cocok</div>';
      return;
    }
    const favKeys = (typeof DashboardHubFavorit !== 'undefined') ? DashboardHubFavorit.getFavoritKeys() : [];
    el.innerHTML = matches.map((m) => `
      <div class="dashhub-search-item" data-action="DashboardHubSearch.select" data-args='${escapeHtml(JSON.stringify([m.key]))}'>
        <div class="dashhub-search-item-icon">${(typeof FeatureIcons !== 'undefined') ? FeatureIcons.render(m.icon || m.catIcon || '') : (m.icon || m.catIcon || '')}</div>
        <div>
          <div class="dashhub-search-item-label">${escapeHtml(m.label)}</div>
          <div class="dashhub-search-item-desc">${escapeHtml(m.desc)} · ${escapeHtml(m.catLabel)}</div>
        </div>
        <div class="dashhub-fav-star${favKeys.indexOf(m.key) !== -1 ? ' is-fav' : ''}" data-stop data-action="DashboardHubFavoritView.toggle" data-args='${escapeHtml(JSON.stringify([m.key]))}'>★</div>
      </div>
    `).join('');
  },

  select(featureKey) {
    const el = document.getElementById('dashHubSearchResults');
    if (el) { el.innerHTML = ''; el.classList.add('u-dnone'); }
    const input = document.getElementById('dashHubSearchInput');
    if (input) input.value = '';
    if (typeof DashboardHub !== 'undefined') DashboardHub.open(featureKey);
  },
};

// BUG NYATA ditemukan saat audit Tahap 2: Object.assign(window,{...}) di
// features-sheets-pwa-selftest.js dieksekusi SEBELUM dashboard-hub.js/
// dashboard-hub-search.js dimuat (keduanya ada di akhir GROUP_B, lihat
// scripts/build.js) — jadi `DashboardHub`/`DashboardHubSearch` TIDAK PERNAH
// jadi window.DashboardHub/window.DashboardHubSearch. Dispatcher global
// data-action (features-helpers-global-security.js) lookup lewat
// `window[p]`, jadi data-action="DashboardHub.open" di kartu fitur Hub
// (dashboard-hub.js render()) & data-action="DashboardHubSearch.select" di
// hasil Feature Search di atas DIAM saat diklik tanpa expose ini. Ditaruh
// di sini (bukan di Object.assign besar features-sheets-pwa-selftest.js)
// krn file ini file TERAKHIR yang dimuat di GROUP_B — DashboardHub &
// DashboardHubSearch keduanya sudah pasti ada saat baris ini jalan.
if (typeof window !== 'undefined') {
  if (typeof DashboardHub !== 'undefined') window.DashboardHub = DashboardHub;
  window.DashboardHubSearch = DashboardHubSearch;
}
