// ui/lifeos-home.js — halaman masuk Life OS. Hanya membaca lewat adapter,
// menulis (kalau ada aksi) hanya lewat services/*.js. Tidak pernah akses D
// atau LifeOSStore langsung dari file UI — selalu lewat adapter/service.
//
// CATATAN NAVIGASI (keputusan sesi ini): LifeOS BUKAN page terpisah — dia
// section di dalam #page-dashboard-hub (lihat index.html/app_production.html
// wrapper #lifeOSWrap). showPage() tidak dipakai sama sekali di sini karena
// showPage() akses document.getElementById('page-'+name) TANPA null-check
// (lihat modal-navigasi.js) dan renderPageContent() (modules-render.js)
// tidak punya case untuk page LifeOS — menambah case di situ berarti
// mengubah modul lama, dilarang. Sebagai gantinya dipakai switchPanel()
// lokal, cuma toggle class 'u-dnone' (utility class yang sudah ada) di
// antara panel-panel sibling di dalam #lifeOSWrap. Router lama tidak
// disentuh sama sekali.

// Preferensi tampil/sembunyi section Life OS di Dashboard Hub (Setelan →
// Profil & Tampilan → 🌱 Life OS di Dashboard Hub). Disimpan di localStorage
// (bukan D atau LifeOSStore) — pola sama persis dengan `dashHubMainTab`
// (lihat dashboard-hub.js applyMainTab()): preferensi tampilan murni,
// bukan data pengguna, jadi tidak perlu ikut siklus save()/IDBStore.
// DEFAULT: false (tersembunyi) — LifeOS sebelumnya sengaja disembunyikan
// permanen lewat class u-dnone hardcoded di index.html/app_production.html
// (lihat komentar lama di situ); default ini menjaga perilaku existing user
// tetap sama persis sebelum mereka aktifkan sendiri lewat Setelan.
const LIFEOS_VISIBLE_KEY = 'lifeOSVisible';

const LifeOSHome = {
  isVisiblePref() {
    return localStorage.getItem(LIFEOS_VISIBLE_KEY) === '1';
  },

  /** Terapkan preferensi ke DOM (#lifeOSWrap) — dipanggil dari render() di
   * bawah, dan juga langsung dari toggleVisibility() saat user klik switch
   * di Setelan supaya efeknya langsung terlihat tanpa perlu buka ulang
   * Dashboard Hub. */
  applyVisibility() {
    const wrap = document.getElementById('lifeOSWrap');
    if (!wrap) return;
    wrap.classList.toggle('u-dnone', !this.isVisiblePref());
  },

  /** Dipanggil dari toggle switch di Setelan (id=lifeOSVisibleToggle, lihat
   * index.html/app_production.html stgGroup1). Tidak perlu await apa pun —
   * localStorage synchronous — supaya switch terasa instan. */
  toggleVisibility(checked) {
    localStorage.setItem(LIFEOS_VISIBLE_KEY, checked ? '1' : '0');
    this.applyVisibility();
    // Kalau baru dinyalakan dan grid belum pernah terisi (mis. user aktifkan
    // pertama kali di sesi ini), render sekarang juga supaya tidak muncul
    // section kosong sebelum Dashboard Hub dibuka ulang.
    const grid = document.getElementById('lifeOSHomeGrid');
    if (checked && grid && !grid.innerHTML.trim()) this.render();
    if (typeof toast === 'function') {
      toast(checked ? '🌱 Life OS ditampilkan di Dashboard Hub' : '🌱 Life OS disembunyikan dari Dashboard Hub');
    }
  },

  async render() {
    this.applyVisibility();
    const el = document.getElementById('lifeOSHomeGrid');
    if (!el) return;
    if (!this.isVisiblePref()) return; // tersembunyi -> tidak perlu hitung/render isinya sama sekali.

    await lifeOSEnsureLoaded();

    const store = lifeOSGetStore();

    const today = todayAdapterList(D);
    const goals = goalAdapterList(D);
    const projects = projectAdapterList(D, store);
    const knowledge = knowledgeAdapterList(store);
    const areas = areaAdapterList(D);
    const lifeObjects = typeof lifeObjectServiceList === 'function' ? lifeObjectServiceList() : [];
    const plugins = typeof LifeOSPluginRegistry !== 'undefined' ? LifeOSPluginRegistry.list() : [];
    // Reuse reviewAdapterIsOverdue() (review-adapter.js, sudah dipakai
    // LifeOSReview.render()) supaya caption kartu Review di grid ini juga
    // data-driven lewat adapter — bukan teks statis "Weekly/Monthly" yang
    // tidak mencerminkan status sebenarnya.
    const reviewOverdueCount = ['weekly', 'monthly'].filter((period) => {
      const threshold = period === 'weekly' ? 7 : 30;
      return reviewAdapterIsOverdue(store, period, threshold);
    }).length;

    // Reuse class dashhub-feature-card/-name (sudah ada di styles.css,
    // dipakai DashboardHub.render()) + modifier --icon (icon-grid) supaya
    // konsisten dgn grid fitur utama — sengaja, supaya tidak perlu CSS
    // baru selain .dashhub-feature-count kecil utk angka count (info yang
    // sebelumnya ada di .dashhub-feature-desc, tetap dipertahankan, cuma
    // dipindah ke caption pendek di bawah nama).
    //
    // Sesi 39 (target eksplisit user: "Executive Dashboard Integration"):
    // kartu "Area Summary" ditambahkan di sini — area-adapter.js sudah ada
    // & sudah dites sejak Sesi 24 tapi sebelumnya TIDAK PERNAH dikonsumsi
    // UI manapun. Sekarang seluruh 6 adapter LifeOS (area/today/goal/
    // project/review/knowledge) benar-benar terpakai di satu grid ini.
    el.innerHTML = `
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["today"]'>
        <div class="dashhub-feature-icon">📅</div>
        <div class="dashhub-feature-name">Today</div>
        <div class="dashhub-feature-count">${today.length} item</div>
      </div>
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["goals"]'>
        <div class="dashhub-feature-icon">🎯</div>
        <div class="dashhub-feature-name">Goals</div>
        <div class="dashhub-feature-count">${goals.length} goal</div>
      </div>
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["projects"]'>
        <div class="dashhub-feature-icon">📁</div>
        <div class="dashhub-feature-name">Projects</div>
        <div class="dashhub-feature-count">${projects.length} project</div>
      </div>
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["review"]'>
        <div class="dashhub-feature-icon">🔁</div>
        <div class="dashhub-feature-name">Review</div>
        <div class="dashhub-feature-count">${reviewOverdueCount > 0 ? reviewOverdueCount + ' jatuh tempo' : 'Up to date'}</div>
      </div>
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["knowledge"]'>
        <div class="dashhub-feature-icon">💡</div>
        <div class="dashhub-feature-name">Knowledge</div>
        <div class="dashhub-feature-count">${knowledge.length} insight</div>
      </div>
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["areas"]'>
        <div class="dashhub-feature-icon">🗂️</div>
        <div class="dashhub-feature-name">Area Summary</div>
        <div class="dashhub-feature-count">${areas.length} area</div>
      </div>
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["life-objects"]'>
        <div class="dashhub-feature-icon">🧩</div>
        <div class="dashhub-feature-name">Life Object</div>
        <div class="dashhub-feature-count">${lifeObjects.length} object</div>
      </div>
      <div class="dashhub-feature-card dashhub-feature-card--icon" data-action="LifeOSHome.switchPanel" data-args='["plugins"]'>
        <div class="dashhub-feature-icon">🔌</div>
        <div class="dashhub-feature-name">Plugin</div>
        <div class="dashhub-feature-count">${plugins.length} plugin</div>
      </div>
    `;

    // Render tiap panel sekali di sini (skala data personal, murah). Yang
    // aktif/terlihat ditentukan switchPanel() lewat CSS class, bukan re-render.
    if (typeof LifeOSToday !== 'undefined') LifeOSToday.render();
    if (typeof LifeOSGoals !== 'undefined') LifeOSGoals.render();
    if (typeof LifeOSProjects !== 'undefined') LifeOSProjects.render();
    if (typeof LifeOSReview !== 'undefined') LifeOSReview.render();
    if (typeof LifeOSKnowledge !== 'undefined') LifeOSKnowledge.render();
    if (typeof LifeOSAreas !== 'undefined') LifeOSAreas.render();
    if (typeof LifeOSLifeObjects !== 'undefined') LifeOSLifeObjects.render();
    if (typeof LifeOSPlugins !== 'undefined') LifeOSPlugins.render();
  },

  switchPanel(name) {
    const panels = ['today', 'goals', 'projects', 'review', 'knowledge', 'areas', 'life-objects', 'plugins'];
    panels.forEach((p) => {
      const panelEl = document.getElementById('lifeOSPanel-' + p);
      if (panelEl) panelEl.classList.toggle('u-dnone', p !== name);
    });
  },
};
