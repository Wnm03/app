// investasi-watch-view.js — InvestmentWatchUI: UI Watchlist instrumen investasi (Fase 3,
// implementasi BUG-INV-001 Opsi 3 -- lihat AUDIT-BUILD-UI-INVESTASI-OPSI3.md §3.5 "UI
// Watchlist"). Backend 100% reuse: Investment.getWatchlist()/addWatch()/updateWatch()/
// removeWatch()/watchlistAlerts() (investasi.js, SUDAH ADA & teruji sejak awal -- 0
// rumus/kondisi alert baru ditulis di sini, termasuk syarat lastPrice<=targetPrice yang
// sudah ada di watchlistAlerts()). File ini murni lapisan UI, pola SAMA PERSIS
// investasi-list-view.js/InvestmentListUI.
//
// render() dipanggil dari InvestmentListUI.render() (1 titik SSOT, lihat komentar di
// investasi-list-view.js) supaya kedua call-site render tab Investasi yang sudah ada
// (modules-render.js & aset.js setAsetTab) otomatis ikut me-refresh watchlist tanpa perlu
// disentuh.

const InvestmentWatchUI = {
  // editId — id item watchlist yang sedang dibuka di investmentWatchModal, null kalau lagi
  // mode Tambah. Pola SAMA PERSIS InvestmentListUI.editId.
  editId: null,

  // render() — daftar watchlist + badge "🎯 Target tercapai" utk item yang lolos
  // Investment.watchlistAlerts() (100% reuse, 0 kondisi baru ditulis di sini).
  //
  // BUGFIX (audit "tab Investasi: semua tombol tidak berfungsi, 0 toast, ada console
  // error"): render() ini dipanggil dari InvestmentListUI.render() (investasi-list-view.js)
  // SETELAH _renderSummary()/_renderList() -- kedua fungsi itu sudah dilindungi try/catch
  // sejak audit-audit sebelumnya (lihat komentar di investasi-list-view.js) justru karena
  // pola bug yang PERSIS SAMA: exception yang lolos dari sini merambat ke atas lewat
  // InvestmentListUI.render() -> setAsetTab()/renderPageContent('aset'), TIDAK PERNAH
  // lewat dispatcher data-action (yang selalu bungkus try/catch+toast) karena render()
  // dipanggil langsung, bukan lewat tap tombol. Efeknya: console.error muncul (uncaught
  // exception asli), tapi 0 toast (tidak ada jalur toast di pemanggil), DAN kode setelah
  // InvestmentListUI.render() di pemanggil (mis. langkah lain di showPage()/setAsetTab()
  // yang seharusnya menuntaskan pindah tab/re-bind halaman) ikut batal jalan -- gejala
  // yang terlihat user persis "semua tombol di tab ini tidak bereaksi". Root cause paling
  // mungkin: Investment.watchlistAlerts()/getWatchlist() atau salah satu field item
  // watchlist (w.name/w.type/w.lastPrice/w.targetPrice) bermasalah utk SATU entry data
  // lama/tidak lengkap. Fix: bungkus pengambilan alertIds & hitungan PER ITEM dgn
  // try/catch, pola SAMA PERSIS InvestmentListUI._renderSummary()/_renderList() -- 1 item
  // bermasalah fallback ke tampilan aman (badge ⚠️), TIDAK menjatuhkan render() secara
  // keseluruhan.
  render() {
    const el = document.getElementById('investmentWatchlist');
    if (!el) return;
    if (typeof Investment === 'undefined') { el.innerHTML = ''; return; }
    let list;
    try {
      list = Investment.getWatchlist();
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) console.error('[InvestmentWatchUI.render] gagal ambil watchlist', err);
      el.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal memuat daftar pantauan</div></div>';
      return;
    }
    if (!list.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📈</div><div class="empty-text">Belum ada instrumen dipantau</div></div>';
      return;
    }
    let alertIds;
    try {
      alertIds = new Set(Investment.watchlistAlerts().map((w) => String(w.id)));
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) console.error('[InvestmentWatchUI.render] gagal hitung watchlistAlerts', err);
      alertIds = new Set();
    }
    el.innerHTML = list.map((w) => {
      let name = '(tanpa nama)', type = '-', lastPrice = 0, targetPrice = 0, badge = '', renderError = false;
      try {
        const hit = alertIds.has(String(w.id));
        badge = hit
          ? ' <span class="acc-chip" style="color:var(--accent3);border-color:var(--accent3)">🎯 Target tercapai</span>'
          : '';
        name = w.name;
        type = w.type;
        lastPrice = w.lastPrice;
        targetPrice = w.targetPrice;
      } catch (err) {
        renderError = true;
        if (typeof console !== 'undefined' && console.error) console.error('[InvestmentWatchUI.render] gagal render item watchlist', w && w.id, err);
      }
      const warnChip = renderError ? ' <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="Gagal menghitung item ini — tap untuk buka & cek datanya">⚠️</span>' : '';
      return '<div class="tx-item u-pointer" data-action="InvestmentWatchUI.openModal" data-args="' + escapeHtml(JSON.stringify([w.id])) + '">'
        + '<div class="tx-icon u-bgaccsoft">📈</div>'
        + '<div class="tx-info">'
        + '<div class="tx-name">' + escapeHtml(name) + badge + warnChip + '</div>'
        + '<div class="tx-meta"><span class="acc-chip">' + escapeHtml(type) + '</span> Terakhir: ' + fmt(lastPrice) + ' · Target: ' + fmt(targetPrice) + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  },

  // openModal(id) — buka investmentWatchModal, mode Tambah kalau id kosong, mode Edit
  // (prefill dari item watchlist yang sudah ada) kalau id diisi. Pola SAMA PERSIS
  // InvestmentListUI.openModal().
  openModal(id) {
    InvestmentWatchUI.editId = id || null;
    const w = (id && typeof Investment !== 'undefined')
      ? Investment.getWatchlist().find((x) => String(x.id) === String(id))
      : null;
    const titleEl = document.getElementById('investmentWatchModalTitle');
    if (titleEl) titleEl.textContent = w ? 'Edit Pantauan' : 'Tambah Pantauan';
    const nameEl = document.getElementById('watchName');
    if (nameEl) nameEl.value = w ? w.name : '';
    const jenisEl = document.getElementById('watchJenis');
    if (jenisEl) {
      if (typeof INVESTMENT_TYPES !== 'undefined') {
        jenisEl.innerHTML = INVESTMENT_TYPES.map((t) => '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>').join('');
      }
      jenisEl.value = w ? w.type : 'Saham';
    }
    const lastEl = document.getElementById('watchLastPrice');
    if (lastEl) lastEl.value = (w && w.lastPrice != null) ? w.lastPrice : '';
    const targetEl = document.getElementById('watchTargetPrice');
    if (targetEl) targetEl.value = (w && w.targetPrice != null) ? w.targetPrice : '';
    const notesEl = document.getElementById('watchNotes');
    if (notesEl) notesEl.value = w ? (w.notes || '') : '';
    const delBtn = document.getElementById('investmentWatchDeleteBtn');
    if (delBtn) delBtn.classList.toggle('u-dnone', !w);
    if (typeof openModal === 'function') openModal('investmentWatchModal');
  },

  // save() — baca form, wire ke Investment.addWatch()/updateWatch() (SUDAH ADA, 0 validasi
  // baru ditulis di sini -- addWatch() sendiri yang melempar Error kalau nama kosong).
  save() {
    if (typeof Investment === 'undefined') { toast('⚠️ Fitur investasi belum siap dimuat'); return; }
    const nameEl = document.getElementById('watchName');
    const name = nameEl ? nameEl.value.trim() : '';
    const jenisEl = document.getElementById('watchJenis');
    const type = jenisEl ? jenisEl.value : 'Lainnya';
    const lastEl = document.getElementById('watchLastPrice');
    const lastPrice = (lastEl && lastEl.value !== '') ? parseDecStr(lastEl.value) : 0;
    const targetEl = document.getElementById('watchTargetPrice');
    const targetPrice = (targetEl && targetEl.value !== '') ? parseDecStr(targetEl.value) : 0;
    const notesEl = document.getElementById('watchNotes');
    const notes = notesEl ? notesEl.value : '';
    try {
      if (InvestmentWatchUI.editId) {
        Investment.updateWatch(InvestmentWatchUI.editId, { name, type, lastPrice, targetPrice, notes });
      } else {
        Investment.addWatch({ name, type, lastPrice, targetPrice, notes });
      }
    } catch (e) {
      toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan pantauan'));
      return;
    }
    closeModal('investmentWatchModal');
    InvestmentWatchUI.render();
    toast('✅ Pantauan tersimpan');
  },

  // deleteFromModal() — hapus item watchlist yang SEDANG dibuka di investmentWatchModal
  // (baca InvestmentWatchUI.editId, bukan argumen -- pola sama persis
  // InvestmentListUI.deleteFromModal()). 100% reuse Investment.removeWatch().
  async deleteFromModal() {
    const targetId = InvestmentWatchUI.editId;
    if (!targetId || typeof Investment === 'undefined') return;
    if (!await askConfirm('Hapus pantauan ini?', { okText: 'Ya, Hapus' })) return;
    Investment.removeWatch(targetId);
    InvestmentWatchUI.editId = null;
    closeModal('investmentWatchModal');
    InvestmentWatchUI.render();
    toast('🗑️ Pantauan dihapus');
  },
};

if (typeof window !== 'undefined') {
  window.InvestmentWatchUI = InvestmentWatchUI;
}
