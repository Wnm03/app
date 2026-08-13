// ghost-asset-cleanup-ui.js — Sesi 592 (lanjutan patch
// PATCH-ghost-asset-migrated-investment.md). Patch S591/ghost-asset sudah
// menyaring record ber-flag `_migratedToInvestmentId` dari dropdown
// "Kaitkan ke Aset Multi-Owner" (getMultiOwnerAssets(), piutang-utang.js),
// TAPI record lama itu sendiri TIDAK terhapus dari `D.assets` — sebelum
// sesi ini, satu-satunya jalur buangnya masih manual lewat
// Backup/Restore (export JSON -> hapus objek berflag itu -> restore).
//
// Sesi ini nambah 1 layar ringkas di Settings -> tab Kepemilikan (dekat
// "Kelola Daftar Pemilik", S561/S564) yang menampilkan SEMUA record ghost
// + tombol hapus permanen per baris. 0 logic hapus baru ditulis di sini:
// delete() delegasi PENUH ke `Aset.delete(id)` (aset.js) yang SUDAH punya
// cascade cleanup lengkap (bersihkan D.debts terkait linkedAssetId/
// titipanDebtLinkId, save(), re-render semua panel turunan) — presenter
// ini murni render list + re-render list-nya sendiri sesudah delete,
// pola sama persis OwnerRegistrySettingsUI (S564).
const GhostAssetCleanupUI = {

  // _list() — SEMUA aset berflag _migratedToInvestmentId, MURNI baca.
  _list() {
    if (typeof D === 'undefined' || !Array.isArray(D.assets)) return [];
    return D.assets.filter((a) => a && a._migratedToInvestmentId);
  },

  // render() — isi `#ghostAssetCleanupList`. Guard container/D tidak ada
  // -> aman diam-diam, pola sama semua presenter render() lain di project
  // ini (mis. OwnerRegistrySettingsUI/BackupHealthPresenter).
  render() {
    const el = typeof document !== 'undefined' ? document.getElementById('ghostAssetCleanupList') : null;
    if (!el) return;
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    const list = GhostAssetCleanupUI._list();
    const card = typeof document !== 'undefined' ? document.getElementById('ghostAssetCleanupCard') : null;
    if (!list.length) {
      // s592: kartu disembunyikan total kalau 0 ghost record -- tidak perlu
      // menampilkan card kosong ke user yang datanya sudah bersih, pola
      // sama seperti banner migratedBanner di Aset.renderList() (kondisional).
      if (card) card.classList.add('u-dnone');
      el.innerHTML = '';
      return;
    }
    if (card) card.classList.remove('u-dnone');
    const fmtFn = typeof fmt === 'function' ? fmt : (n) => String(n);
    el.innerHTML = list.map((a) => {
      const idArg = esc(JSON.stringify([String(a.id)]));
      const nama = esc(a.name || '(tanpa nama)');
      const nilai = fmtFn(a.nilai || 0);
      return '<div class="setting-item"><div><div class="setting-label">' + nama + '</div>'
        + '<div class="setting-sub">Sudah bermigrasi ke Investasi · nilai lama ' + esc(nilai) + '</div></div>'
        + '<button class="btn btn-sm btn-danger" data-action="GhostAssetCleanupUI.deleteGhost" data-args=\'' + idArg + '\'>🗑️ Hapus Permanen</button></div>';
    }).join('');
  },

  // deleteGhost(id) — 0 logic hapus baru: delegasi PENUH ke `Aset.delete()`
  // (aset.js, sudah punya askConfirm() + cascade cleanup D.debts + save()
  // + re-render semua panel turunan). Presenter ini cuma re-render list
  // ghost-nya sendiri sesudahnya (container yang tidak disentuh Aset.delete()).
  async deleteGhost(id) {
    if (typeof Aset === 'undefined' || typeof Aset.delete !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur hapus aset belum siap dimuat');
      return;
    }
    const before = (typeof D !== 'undefined' && Array.isArray(D.assets)) ? D.assets.length : -1;
    await Aset.delete(id);
    const after = (typeof D !== 'undefined' && Array.isArray(D.assets)) ? D.assets.length : -1;
    GhostAssetCleanupUI.render();
    // Aset.delete() sendiri sudah toast '✅ Aset tersimpan'-style pesan generik
    // kalau berhasil (atau diam kalau user batal konfirmasi) -- tidak
    // menambah toast dobel di sini, cukup pastikan list ghost ikut refresh.
    if (before !== -1 && after === before && typeof toast === 'function') {
      // Aset.delete() membatalkan diam2 kalau user tekan "Batal" di askConfirm()
      // -- 0 pesan tambahan diperlukan, ini bukan error.
    }
  },

};

if (typeof window !== 'undefined') {
  window.GhostAssetCleanupUI = GhostAssetCleanupUI;
}
