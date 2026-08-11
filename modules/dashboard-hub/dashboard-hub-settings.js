// dashboard-hub-settings.js — S129: "Pengaturan Dashboard" (Dashboard
// Settings). Presenter layer MURNI di atas mekanisme yang SUDAH ADA — RULE
// #1 sesi ini: ZIP sesi lalu adalah source of truth, 100% reuse modul
// existing, ZERO formula/framework baru, cuma UI presenter.
//
// Reuse map (semua SUDAH ADA sebelum sesi ini, TIDAK diubah strukturnya):
//   - DASH_CARD_DEFS / DASH_CARD_BY_KEY / DASH_RENDER_ORDER
//     (modules/shared/modules-render.js, fitur "Kartu di Beranda") — dipakai
//     ulang sbg SATU-SATUNYA sumber key+label kartu. Sesi ini TIDAK
//     menambah kartu baru, cuma menambah lapisan "urutan custom" di ATAS
//     DASH_RENDER_ORDER (default) yang sudah ada.
//   - D.dashCardPrefs (sudah ada, on/off kartu) — pola PERSIS sama dipakai
//     utk D.dashCardOrder (field baru, murni data urutan) supaya otomatis
//     ikut backup/restore TANPA menyentuh backup-restore.js sama sekali:
//     buildBackupPayload() sudah spread `{...D}` & applyRestoredData() sudah
//     merge `D={...D,...imp}` generik (lihat backup-restore.js) — field baru
//     apa pun di D otomatis ikut, ini bukan mekanisme baru.
//   - Preferensi TAMPILAN device-local (compact mode/density/tab default)
//     sengaja disimpan di localStorage, BUKAN di D — pola PERSIS sama dgn
//     LIFEOS_VISIBLE_KEY (lifeos/ui/lifeos-home.js) & dashHubSectionTab
//     (dashboard-hub.js applySectionTab()/setSectionTab()): preferensi
//     tampilan murni, bukan data pengguna, tidak perlu ikut siklus
//     save()/backup.
//   - askConfirm()/toast()/escapeHtml()/save() — semua fungsi shared yang
//     sudah ada, dipakai apa adanya.

const DASH_COMPACT_KEY = 'dashCompactMode';
const DASH_DENSITY_KEY = 'dashCardDensity';
const DASH_DEFAULT_TAB_KEY = 'dashDefaultSectionTab';
const DASH_DENSITY_VALUES = ['nyaman', 'normal', 'rapat'];
const DASH_DEFAULT_TAB_VALUES = ['ringkasan', 'fitur', 'widget', 'insight'];

const DashboardSettings = {

  // =====================================================================
  // Compact Mode — toggle boolean tunggal (device-local, localStorage).
  // =====================================================================
  isCompactMode() {
    return localStorage.getItem(DASH_COMPACT_KEY) === '1';
  },
  toggleCompactMode(checked) {
    localStorage.setItem(DASH_COMPACT_KEY, checked ? '1' : '0');
    this.applyDashDisplayPrefs();
    if (typeof toast === 'function') {
      toast(checked ? '🧩 Mode ringkas Dashboard Hub diaktifkan' : '🧩 Mode ringkas Dashboard Hub dimatikan');
    }
  },

  // =====================================================================
  // Card Density — 3 level kepadatan (device-local, localStorage). Invalid/
  // belum diset -> fallback 'normal' (perilaku existing sebelum sesi ini,
  // TIDAK berubah default-nya).
  // =====================================================================
  getDensity() {
    const v = localStorage.getItem(DASH_DENSITY_KEY);
    return DASH_DENSITY_VALUES.includes(v) ? v : 'normal';
  },
  setDensity(value) {
    if (!DASH_DENSITY_VALUES.includes(value)) return;
    localStorage.setItem(DASH_DENSITY_KEY, value);
    this.applyDashDisplayPrefs();
  },

  // =====================================================================
  // Default Landing Tab — sub-tab Dashboard Hub (ringkasan/fitur/widget/
  // insight, lihat DashboardHub.applySectionTab()) yang jadi FALLBACK kalau
  // belum pernah ada `dashHubSectionTab` (pilihan terakhir user) tersimpan.
  // TIDAK menggantikan/menghapus mekanisme `dashHubSectionTab` yang sudah
  // ada (tab TERAKHIR dipakai tetap menang) — cuma mengganti hardcode
  // fallback 'ringkasan' jadi bisa dipilih user. Sengaja TIDAK menyentuh
  // landing PAGE startup (page-dashboard-hub) — itu dikunci murni lewat
  // markup statis (lihat tests/dashboard-hub-default-landing.test.js §7),
  // TIDAK boleh ada mekanisme JS baru yang menentukan halaman awal.
  // =====================================================================
  getDefaultTab() {
    const v = localStorage.getItem(DASH_DEFAULT_TAB_KEY);
    return DASH_DEFAULT_TAB_VALUES.includes(v) ? v : 'ringkasan';
  },
  setDefaultTab(value) {
    if (!DASH_DEFAULT_TAB_VALUES.includes(value)) return;
    localStorage.setItem(DASH_DEFAULT_TAB_KEY, value);
    if (typeof toast === 'function') toast('🏠 Tab default Dashboard Hub disimpan');
  },

  // Terapkan Compact Mode + Card Density ke DOM (#page-dashboard-hub) lewat
  // class CSS (styles.css) — dipanggil saat render Dashboard Hub & tiap kali
  // salah satu preferensi berubah, pola sama dgn LifeOSHome.applyVisibility().
  applyDashDisplayPrefs() {
    const el = document.getElementById('page-dashboard-hub');
    if (!el) return;
    el.classList.toggle('dash-compact', this.isCompactMode());
    DASH_DENSITY_VALUES.forEach((v) => el.classList.remove('dash-density-' + v));
    el.classList.add('dash-density-' + this.getDensity());
  },

  // =====================================================================
  // Card Order — urutan custom kartu Beranda (D.dashCardOrder, IKUT
  // backup/restore, lihat catatan header file). Sumber key/label TETAP
  // DASH_CARD_DEFS/DASH_CARD_BY_KEY yang sudah ada (modules-render.js) —
  // sesi ini TIDAK menambah/menghapus satu kartu pun dari daftar itu.
  // =====================================================================

  // Urutan EFEKTIF: custom order tervalidasi (cuma key yang MASIH ada di
  // DASH_CARD_BY_KEY — kartu yang sudah dihapus dari registry otomatis
  // gugur) + key yang belum/tidak masuk custom order (kartu baru dari sesi
  // lain, atau sebelum user pernah menyusun ulang), fallback ke urutan
  // default DASH_RENDER_ORDER supaya tidak ada satu kartu pun yang "hilang"
  // (invariant yang sama dijaga tests/dash-card-registry.test.js utk
  // DASH_CARD_DEFS<->DASH_RENDER_ORDER).
  applyDashCardOrder() {
    const custom = Array.isArray(D.dashCardOrder) ? D.dashCardOrder : [];
    const validCustom = custom.filter((k) => DASH_CARD_BY_KEY[k]);
    const remaining = DASH_RENDER_ORDER.filter((k) => !validCustom.includes(k));
    return [...validCustom, ...remaining];
  },

  // Tukar posisi 1 kartu dgn tetangganya (naik/turun). Batas array dicek
  // dulu (kartu pertama tidak bisa naik, kartu terakhir tidak bisa turun) —
  // tidak melakukan apa pun kalau di luar batas, bukan error.
  reorderCard(key, direction) {
    const order = this.applyDashCardOrder();
    const idx = order.indexOf(key);
    if (idx === -1) return;
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= order.length) return;
    const tmp = order[idx];
    order[idx] = order[swapWith];
    order[swapWith] = tmp;
    D.dashCardOrder = order;
    save();
    this.renderDashCardOrderUI();
    if (document.getElementById('page-dashboard-hub')) renderDashboard();
  },

  // Render checklist urutan (id=dashCardOrderList, lihat Pengaturan → Kartu
  // di Beranda) — tiap baris punya tombol ▲▼, pola tombol sama dgn
  // tgl-switch/btn-ghost yang sudah dipakai di seluruh Pengaturan.
  renderDashCardOrderUI() {
    const wrap = document.getElementById('dashCardOrderList');
    if (!wrap) return;
    const order = this.applyDashCardOrder();
    wrap.innerHTML = order.map((key, i) => {
      const def = DASH_CARD_BY_KEY[key];
      if (!def) return '';
      return `
      <div class="setting-item">
        <div class="setting-label">${escapeHtml(def.label)}</div>
        <div class="u-flex u-gap6">
          <button type="button" class="btn btn-ghost btn-sm" ${i === 0 ? 'disabled' : ''} onclick="DashboardSettings.reorderCard('${key}','up')" aria-label="Pindah ke atas">▲</button>
          <button type="button" class="btn btn-ghost btn-sm" ${i === order.length - 1 ? 'disabled' : ''} onclick="DashboardSettings.reorderCard('${key}','down')" aria-label="Pindah ke bawah">▼</button>
        </div>
      </div>`;
    }).join('');
  },

  // =====================================================================
  // Reset — kembalikan SEMUA preferensi Dashboard Settings sesi ini
  // (urutan/density/compact/tab default) ke nilai awal. SENGAJA TIDAK
  // menyentuh D.dashCardPrefs (on/off kartu, fitur sesi lain) — scope reset
  // ini murni tampilan/urutan, bukan visibility kartu.
  // =====================================================================
  async resetDashboardLayout() {
    const ok = await askConfirm(
      'Kembalikan tata letak & tampilan Dashboard Hub ke pengaturan awal? (urutan kartu, kepadatan kartu, mode ringkas, tab default)',
      { title: 'Reset Tata Letak Dashboard', okText: 'Ya, Reset', icon: '↩️' },
    );
    if (!ok) return;
    delete D.dashCardOrder;
    save();
    localStorage.removeItem(DASH_COMPACT_KEY);
    localStorage.removeItem(DASH_DENSITY_KEY);
    localStorage.removeItem(DASH_DEFAULT_TAB_KEY);
    this.applyDashDisplayPrefs();
    this.renderSettingsUI();
    if (document.getElementById('page-dashboard-hub')) renderDashboard();
    if (typeof toast === 'function') toast('↩️ Tata letak Dashboard Hub dikembalikan ke default');
  },

  // Sinkronkan kontrol di Pengaturan (checkbox/select) supaya menunjukkan
  // nilai TERSIMPAN saat halaman Pengaturan dibuka/di-render ulang — dipanggil
  // dari renderSettings() (modules-render.js), pola sama dgn
  // renderDashCardPrefsUI() yang sudah ada.
  renderSettingsUI() {
    const compactEl = document.getElementById('dashCompactModeToggle');
    if (compactEl) compactEl.checked = this.isCompactMode();
    const densityEl = document.getElementById('dashCardDensitySelect');
    if (densityEl) densityEl.value = this.getDensity();
    const defTabEl = document.getElementById('dashDefaultTabSelect');
    if (defTabEl) defTabEl.value = this.getDefaultTab();
    this.renderDashCardOrderUI();
  },
};
