// modules/vehicle/shop-katalog-dinamis-presenter.js — Shop Katalog
// Sparepart Dinamis Presenter. 100% REUSE ShopKatalogDinamisAPI
// (modules/vehicle/shop-katalog-dinamis-api.js) — TIDAK ada
// query/hitungan baru di sini, murni render + simpan pilihan
// kendaraan terakhir (localStorage-style var, sama pola _txAccManuallySet
// dkk di codebase: variabel modul biasa, bukan D/localStorage baru).
//
// KONTRAK HTML yang diharapkan (container HARUS sudah ada di
// halaman/modal terkait — presenter ini TIDAK membuat modal baru):
//   <select id="shopKatalogVehicleSelect"></select>
//   <div id="shopKatalogList"></div>
const ShopKatalogDinamisPresenter = {

  _selectedVehicleId: null,

  // render() — titik masuk. Isi <select> pilihan kendaraan (kalau
  // belum diisi/berubah) lalu render daftar part utk kendaraan
  // terpilih (default: kendaraan pertama).
  render() {
    const sel = document.getElementById('shopKatalogVehicleSelect');
    const list = document.getElementById('shopKatalogList');
    if (!sel || !list) return; // container belum ada di halaman ini, aman diam2.

    if (typeof ShopKatalogDinamisAPI === 'undefined') {
      list.innerHTML = '<div class="empty"><div class="empty-text">Fitur katalog belum tersedia</div></div>';
      return;
    }

    const dk = ShopKatalogDinamisAPI.daftarKendaraan();
    if (!dk.ok || dk.count === 0) {
      sel.innerHTML = '<option value="">— Belum ada kendaraan —</option>';
      list.innerHTML = '<div class="empty"><div class="empty-icon">🏍️</div><div class="empty-text">Tambahkan kendaraan dulu lewat Car Notes</div></div>';
      return;
    }

    if (!this._selectedVehicleId || !dk.list.some((v) => v.id === this._selectedVehicleId)) {
      this._selectedVehicleId = dk.list[0].id;
    }

    sel.innerHTML = dk.list.map((v) => `<option value="${escapeHtml(v.id)}"${v.id === this._selectedVehicleId ? ' selected' : ''}>${v.emoji} ${escapeHtml(v.name)}</option>`).join('');
    this._renderList(list);
  },

  // onVehicleChange(selectEl) — dipanggil dari onchange <select>.
  onVehicleChange(selectEl) {
    this._selectedVehicleId = selectEl.value || null;
    const list = document.getElementById('shopKatalogList');
    if (list) this._renderList(list);
  },

  // _renderList(el) — murni tampilkan hasil
  // ShopKatalogDinamisAPI.katalogUntuk() APA ADANYA, 0 logic tambahan.
  _renderList(el) {
    if (!this._selectedVehicleId) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Pilih kendaraan dulu</div></div>';
      return;
    }
    const res = ShopKatalogDinamisAPI.katalogUntuk(this._selectedVehicleId);
    if (!res.ok) {
      el.innerHTML = `<div class="empty"><div class="empty-text">${escapeHtml(res.reason || 'Data belum tersedia')}</div></div>`;
      return;
    }
    if (res.count === 0) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Belum ada part katalog utk kendaraan ini</div></div>';
      return;
    }
    const badge = { 'perlu-ganti': ['🔴', 'Perlu Diganti'], 'aman': ['🟢', 'Aman'], 'belum-diketahui': ['⚪', 'Belum Diketahui'] };
    el.innerHTML = res.items.map((it) => {
      const [dot, label] = badge[it.status] || badge['belum-diketahui'];
      const sub = it.intervalKm ? `Interval ${it.intervalKm.toLocaleString('id-ID')} km` : 'Interval belum diatur';
      return `<div class="tx-item"><div class="tx-icon u-bgaccsoft">🔧</div><div class="tx-info"><div class="tx-name">${escapeHtml(it.nama)}</div><div class="tx-meta">${sub}${it.kategori ? ' · ' + escapeHtml(it.kategori) : ''}</div></div><div class="tx-amount" style="font-size:11px">${dot} ${label}</div></div>`;
    }).join('');
  },

};
