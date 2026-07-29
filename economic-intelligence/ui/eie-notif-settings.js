// ui/eie-notif-settings.js — Toggle notifikasi EIE di Pengaturan (fase 3).
// HANYA render + baca/tulis toggle lewat eie-store; tidak pernah menyentuh
// D (sama seperti ui/eie-dashboard.js & ui/eie-insight-feed.js). Menyalakan
// notifikasi sungguhan lewat NotificationService.enable()/disable() yang
// dari fase 1 memang sudah dibuat siap pakai untuk titik integrasi ini
// (lihat komentar di services/notification-service.js).
//
// Markup HTML toggle-nya ada di index.html/app_production.html, kartu
// "🌦️ Notifikasi Kondisi Ekonomi" di stgGroup4 (Notifikasi & Backup),
// dipanggil dari renderSettings() (modules-render.js) — pola sama persis
// dengan renderNotifSettings() (toggle reminder tagihan yang sudah ada).

const EIENotifSettings = {
  /** Render status toggle saat halaman Pengaturan dibuka. */
  async render() {
    const toggle = document.getElementById('eieNotifToggle');
    const status = document.getElementById('eieNotifStatus');
    if (!toggle) return; // markup belum ada di halaman ini, aman diam2.
    try {
      await eieEnsureLoaded();
      const store = eieGetStore();
      const on = !!store.notificationsEnabled;
      toggle.checked = on;
      if (status) status.textContent = on ? 'Aktif' : 'Belum aktif';
    } catch (e) {
      console.warn('[EIE] EIENotifSettings.render() gagal:', e);
    }
  },

  /** Dipanggil sekali di awal sesi (lihat EIEDashboard.render()) supaya
   * preferensi tersimpan dari sesi sebelumnya benar2 aktif lagi setelah
   * reload, bukan cuma tersimpan di store tanpa efek. */
  async bootstrap() {
    try {
      await eieEnsureLoaded();
      const store = eieGetStore();
      if (store.notificationsEnabled && typeof NotificationService !== 'undefined') {
        NotificationService.enable();
      }
    } catch (e) {
      console.warn('[EIE] EIENotifSettings.bootstrap() gagal:', e);
    }
  },

  async toggle(checked) {
    try {
      await eieEnsureLoaded();
      const store = eieGetStore();
      store.notificationsEnabled = !!checked;
      await eieSave();
      if (typeof NotificationService !== 'undefined') {
        if (checked) NotificationService.enable();
        else NotificationService.disable();
      }
      if (typeof toast === 'function') {
        toast(checked ? '🔔 Notifikasi Kondisi Ekonomi diaktifkan' : '🔕 Notifikasi Kondisi Ekonomi dimatikan');
      }
    } catch (e) {
      console.warn('[EIE] EIENotifSettings.toggle() gagal:', e);
    } finally {
      this.render();
    }
  },
};

/** Wrapper global dipanggil langsung dari onchange= di HTML (bukan lewat
 * dispatcher data-action), sama pola dgn toggleNotifEnabled() yang sudah
 * ada utk reminder tagihan. */
function toggleEieNotif(checked) {
  EIENotifSettings.toggle(checked);
}
