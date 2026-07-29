// lifeos-nav.js — "Jump to source": item Life OS (Today/Goals/Projects)
// hanyalah LENSA baca di atas data lama (lihat komentar di
// adapters/today-adapter.js & adapters/goal-adapter.js: tiap item sudah
// bawa `sourceKind`/`sourceId`). File ini SATU-SATUNYA tempat yang tahu
// cara "pergi ke referensi aslinya" per sourceKind — supaya ui/today.js,
// ui/goals.js, ui/projects.js tidak masing-masing menebak sendiri cara
// membuka modal/halaman modul lama (yang gampang jadi tidak konsisten &
// duplikat kalau ditulis ulang di tiap file UI).
//
// Read-only murni: tidak pernah menulis ke D/LifeOSStore, cuma memanggil
// fungsi navigasi/modal yang SUDAH ADA (showPage, openModal via WorthIt/
// Renov, dst) atau menyorot+scroll ke kartu Setelan yang relevan — pola
// sorot+scroll-nya sama persis dengan stgSearch() di pengaturan-search.js,
// supaya "pergi ke referensi" terasa konsisten dengan fitur cari
// pengaturan yang sudah ada, bukan mekanisme baru.
//
// Kalau nanti nambah sumber baru di todayAdapterList/goalAdapterList/
// projectAdapterList, tambahkan entri sourceKind yang cocok di
// LIFEOS_NAV_MAP di bawah — jangan hardcode navigasi di file adapter/ui.
//
// Status cakupan (Sesi 27): SEMUA 5 sourceKind dari LIFEOS_TODAY_SOURCES
// (bills/reminders/selfcare/payroll/tukang) sudah punya entri di bawah —
// sebelum sesi ini selfcare/payroll/tukang belum dipetakan (jatuh ke
// cabang "sourceKind tidak dikenal"). Goal (target/eduFund/wishlist)
// sudah dipetakan sejak sebelumnya.
//
// Status cakupan (Sesi 50): pensiun/fi/debt SEKARANG dipetakan juga —
// builder-nya di goal-adapter.js selesai Sesi 49
// (`docs/PRODUCT_DECISIONS.md` § LifeOS — Goal source, final), tapi nav
// map-nya belum ikut diperbarui saat itu (di luar scope 1-sub-item Sesi
// 49). Kartu "referensi asli" pensiun/debt ada di DALAM tab
// `#page-keuangan` (`keuanganTab-asetproyek`/`keuanganTab-utangpiutang`,
// disembunyikan lewat `u-dnone` biasa, BUKAN `.stg-tabpanel`) — pola
// tab-switch keuangan ini SUDAH ADA (`setKeuanganTab()`,
// `tx-list-cashflow.js`) & sudah dipakai lintas-halaman lewat
// `goToList(targetId, pageName, navIdx, shopTabName, cnTabName,
// keuTabName)` (`filter-laporan.js`) — dipakai APA ADANYA di sini lewat
// `openFn` (persis pola tukang/wishlist di bawah, guard `typeof`),
// BUKAN menulis ulang logic switch-tab keuangan sendiri (itu akan
// duplicate, dilarang). `navIdx` sengaja dikosongkan (`null`) — pola
// SAMA PERSIS dgn `goToList("assetList","aset")` yang sudah ada
// (app_production.html #405): `showPage()` sendiri sudah fallback cari
// nav-item yang cocok kalau `el` tidak dikirim (lihat komentar
// `lifeOSNavigateToSource` bagian `conf.page` di bawah). FI (`#dashFiCard`)
// tidak perlu openFn — kartunya ada langsung di `page-dashboard-hub`
// (tidak di dalam tab keuangan), jadi cukup pola page+cardSelector biasa
// sama seperti selfcare/payroll.

const LIFEOS_NAV_MAP = {
  // --- Today (adapters/today-adapter.js) ---
  bills: { page: 'settings', cardSelector: '#billList' },
  reminders: { page: 'settings', cardSelector: '#reminderList' },
  // selfcare/payroll: reuse pola { page, cardSelector } yang sama persis dgn
  // bills/reminders di atas — _lifeOSHighlightSettingsCard() sebenarnya
  // generik (bukan cuma utk page:'settings'; closest('.stg-tabpanel')/
  // closest('.stg-group') otomatis no-op kalau kartu tujuan bukan di
  // Setelan), jadi aman dipakai jg utk kartu di page:'dashboard-hub'.
  // Kartu tujuan (`refleksiCard`/`dashAbsensiCard`) SUDAH ADA & sudah jadi
  // target navigasi terverifikasi di FEATURE_REGISTRY (lihat
  // dashboard-hub-registry.js key 'dash-refleksi' & 'per-absensi') — dipakai
  // ulang di sini, bukan target baru.
  selfcare: { page: 'dashboard-hub', cardSelector: '#refleksiCard' },
  payroll: { page: 'dashboard-hub', cardSelector: '#dashAbsensiCard' },
  // tukang — sourceKind ini murni modal (Tukang.openModal, data-action sama
  // persis dgn tombol "👷 Absensi Tukang" di kartu Renovasi index.html),
  // tidak attach ke page/kartu manapun — pola openFn SAMA PERSIS dgn
  // wishlist/renovasi di bawah.
  tukang: {
    openFn() {
      if (typeof Tukang !== 'undefined' && typeof Tukang.openModal === 'function') Tukang.openModal();
    },
  },

  // --- Goals (adapters/goal-adapter.js) ---
  target: { page: 'settings', cardSelector: '#targetList' },
  eduFund: { page: 'settings', cardSelector: '#eduFundList' },
  wishlist: {
    openFn() {
      if (typeof WorthIt !== 'undefined' && typeof WorthIt.open === 'function') WorthIt.open();
    },
  },
  // pensiun/debt — kartu aslinya ada di dalam tab #page-keuangan (bukan
  // stg-tabpanel), jadi reuse goToList() (filter-laporan.js) apa adanya
  // supaya tab keuangan yang benar ikut kebuka sebelum scroll+flash,
  // BUKAN nulis ulang logic switch-tab. Guard typeof sama pola dgn
  // tukang/wishlist di atas.
  pensiun: {
    openFn() {
      if (typeof goToList === 'function') goToList('pensiunBody', 'keuangan', null, null, null, 'asetproyek');
    },
  },
  fi: { page: 'dashboard-hub', cardSelector: '#dashFiCard' },
  debt: {
    openFn() {
      if (typeof goToList === 'function') goToList('debtList', 'keuangan', null, null, null, 'utangpiutang');
    },
  },

  // --- Projects (adapters/project-adapter.js) ---
  renovasi: {
    openFn(sourceId) {
      if (typeof Renov !== 'undefined' && typeof Renov.openDetail === 'function') Renov.openDetail(sourceId);
    },
  },
  // kind:'generic' (LifeOSStore.projects) SENGAJA tidak ada entri di sini —
  // project generik itu sendiri LAHIR di Life OS (lifeos/services/
  // project-service.js), tidak punya "referensi lama" di modul lain untuk
  // dituju. Ditangani terpisah di lifeOSNavigateToSource() di bawah.
};

/**
 * Pergi ke referensi data tempat 1 item Life OS sebenarnya berada.
 * @param {string} sourceKind lihat field `sourceKind` di item hasil adapter
 *   (today/goal), atau `kind` untuk item project ('renovasi'|'generic').
 * @param {string|number} [sourceId] id di array sumber lama (mis. D.bills id).
 */
function lifeOSNavigateToSource(sourceKind, sourceId) {
  if (sourceKind === 'generic') {
    if (typeof toast === 'function') toast('🌱 Project ini murni tersimpan di Life OS — belum ada halaman lama untuk ini.');
    return;
  }
  const conf = LIFEOS_NAV_MAP[sourceKind];
  if (!conf) {
    console.warn('[LifeOS] lifeOSNavigateToSource: sourceKind tidak dikenal:', sourceKind);
    if (typeof toast === 'function') toast('⚠️ Referensi untuk item ini belum diatur. Tolong laporkan ke pengembang.');
    return;
  }

  if (typeof conf.openFn === 'function') {
    conf.openFn(sourceId);
    return;
  }

  if (conf.page) {
    // Pindah halaman: REUSE dashHubNavigateToFeature() (dashboard-hub.js) —
    // fungsi ini sudah tahu cara showPage() + tandai nav-item bottom-nav yg
    // benar lewat PAGE_NAV_IDX, jadi lookup navBtns/navIndex tidak perlu
    // ditulis ulang di sini (dulu duplikat persis). goTo/tab/action SENGAJA
    // tidak dikirim — semua entri LIFEOS_NAV_MAP butuh highlight kartu
    // Setelan (cardSelector, bisa nested di dalam stg-group yang collapsed),
    // beda mekanisme dgn goTo generik dashHubNavigateToFeature (flash by id
    // saja, tidak buka stg-group/card-collapse dulu) — makanya tetap dites
    // _lifeOSHighlightSettingsCard() di bawah, bukan lewat target.goTo.
    if (typeof dashHubNavigateToFeature === 'function') {
      dashHubNavigateToFeature({ page: conf.page });
    } else if (typeof showPage === 'function') {
      // Fallback kalau dashboard-hub.js entah kenapa belum ter-load —
      // showPage() tanpa `el` tetap aman, dia sendiri fallback ke
      // querySelector nav-item yang cocok (lihat modal-navigasi.js).
      showPage(conf.page);
    }
    // showPage() me-render halaman baru secara sinkron, tapi kasih 1 tick
    // supaya DOM (termasuk stg-group yang collapsed) benar2 settle sebelum
    // dicari & disorot — pola sama persis dgn timeout 120ms di stgSearch().
    setTimeout(() => _lifeOSHighlightSettingsCard(conf.cardSelector), 120);
  }
}

/** Sorot + scroll ke kartu Setelan yang berisi elemen `selector` — pola
 * sorot/scroll-nya SAMA PERSIS dengan stgSearch() (pengaturan-search.js),
 * sengaja tidak dipanggil ulang dari sana supaya file ini tetap mandiri
 * dan tidak bergantung urutan load terhadap pengaturan-search.js. */
function _lifeOSHighlightSettingsCard(selector) {
  if (!selector) return;
  const anchor = document.querySelector(selector);
  const card = anchor ? anchor.closest('.card, .card-collapse') : null;
  if (!card) return;

  const tabPanel = card.closest('.stg-tabpanel');
  if (tabPanel && tabPanel.classList.contains('u-dnone') && typeof setSettingsTab === 'function') {
    setSettingsTab(tabPanel.dataset.tab);
  }
  const grp = card.closest('.stg-group');
  if (grp && !grp.classList.contains('open') && typeof toggleStgGroup === 'function') toggleStgGroup(grp.id);
  if (card.classList.contains('card-collapse') && !card.classList.contains('open') && typeof toggleSingleCardCollapse === 'function') {
    toggleSingleCardCollapse(card.id);
  }

  card.style.outline = '2px solid var(--accent)';
  card.style.outlineOffset = '3px';
  setTimeout(() => { card.style.outline = ''; card.style.outlineOffset = ''; }, 2500);
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

if (typeof window !== 'undefined') {
  window.lifeOSNavigateToSource = lifeOSNavigateToSource;
}
