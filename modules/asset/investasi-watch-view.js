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
  render() {
    const el = document.getElementById('investmentWatchlist');
    if (!el) return;
    if (typeof Investment === 'undefined') { el.innerHTML = ''; return; }
    const list = Investment.getWatchlist();
    if (!list.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📈</div><div class="empty-text">Belum ada instrumen dipantau</div></div>';
      return;
    }
    const alertIds = new Set(Investment.watchlistAlerts().map((w) => String(w.id)));
    el.innerHTML = list.map((w) => {
      const hit = alertIds.has(String(w.id));
      const badge = hit
        ? ' <span class="acc-chip" style="color:var(--accent3);border-color:var(--accent3)">🎯 Target tercapai</span>'
        : '';
      return '<div class="tx-item u-pointer" data-action="InvestmentWatchUI.openModal" data-args="' + escapeHtml(JSON.stringify([w.id])) + '">'
        + '<div class="tx-icon u-bgaccsoft">📈</div>'
        + '<div class="tx-info">'
        + '<div class="tx-name">' + escapeHtml(w.name) + badge + '</div>'
        + '<div class="tx-meta"><span class="acc-chip">' + escapeHtml(w.type) + '</span> Terakhir: ' + fmt(w.lastPrice) + ' · Target: ' + fmt(w.targetPrice) + '</div>'
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
