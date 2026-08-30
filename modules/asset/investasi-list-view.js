// investasi-list-view.js — InvestmentListUI: halaman/tab "💹 Investasi" di bawah #page-aset
// (Fase 1, implementasi BUG-INV-001 Opsi 3 — lihat AUDIT-BUILD-UI-INVESTASI-OPSI3.md &
// docs/BUG_REGISTRY.md §0a-8). File BARU, terpisah dari investasi.js (logika murni, 0 DOM)
// & investasi-view.js (InvestmentUI, modal "⚖️ Atur Porsi Kepemilikan") — pola sama persis
// dashboard-hub-favorit.js vs dashboard-hub-favorit-view.js, supaya investasi.js sendiri
// tetap gampang dites lewat loadSource() tanpa DOM.
//
// Scope Fase 1 (sesuai §5 audit "Estimasi & Breakdown Sesi"): halaman list holding + kartu
// ringkasan portofolio (100% reuse Investment.portfolioSummary(), 0 rumus baru) + modal
// tambah/edit holding + wiring CRUD dasar (Investment.addHolding()/updateHolding()/
// deleteHolding(), SUDAH ADA sejak awal, 0 perubahan) + tombol pemicu "⚖️ Atur Porsi
// Kepemilikan" (InvestmentUI.openOwnersModal(), SUDAH ADA sejak S464, cuma 0 caller sampai
// sesi ini). UI Transaksi Beli/Jual/Dividen (§3.3 audit) & UI Watchlist (§3.5 audit) SENGAJA
// di luar scope sesi ini — menyusul di sesi terpisah sesuai breakdown fase di audit.
//
// Keputusan desain (mengikuti rekomendasi §3.2 audit): modal utama (investmentModal) TIDAK
// punya field titipan manual (fundSource/titipanOwner) — delegasi penuh ke owners modal yang
// sudah ada, pola SAMA PERSIS assetModal (yang sejak Sesi C juga membuang input titipan
// manual demi 1 sumber kebenaran a.owners[]/h.owners[]). Field Unit/Harga Rata-rata di modal
// ini SENGAJA tetap bisa diisi manual (beda dari komentar "SELALU diturunkan ulang dari
// riwayat transaksi" di investasi.js) — Fase 1 belum punya UI transaksi (§3.3), jadi input
// manual di sini adalah SATU-SATUNYA cara mengisi data holding sampai Fase 2 selesai; begitu
// UI transaksi ada, recomputeHolding() akan mengambil alih & menimpa nilai manual ini lewat
// jalur normal (0 konflik — recomputeHolding() memang didesain menimpa unit/avgPrice).

const InvestmentListUI = {
  // editId — id holding yang sedang dibuka di investmentModal, null kalau lagi mode Tambah.
  // Dipakai openOwnersModalForEdit()/deleteFromModal() supaya tombol di dalam modal tahu
  // holding mana yang sedang diedit tanpa perlu data-args statis (pola sama persis
  // Aset.editId -> Aset.openOwnersModal()/Aset.save()).
  editId: null,

  // render() — dipanggil dari setAsetTab('investasi') & renderPageContent('aset') (SSOT,
  // sama pola AlokasiAset.init()/renderWealthSnapshots() yang dipanggil di 2 titik yang
  // sama). Aman dipanggil berkali-kali, murni re-render dari D.investments apa adanya.
  render() {
    InvestmentListUI._renderSummary();
    InvestmentListUI._renderList();
    // Fase 3 (BUG-INV-001 Opsi 3, §3.5 audit): render Watchlist bareng di titik SSOT yang
    // sama, pola sama persis kartu ringkasan & daftar holding di atas -- InvestmentWatchUI
    // hidup di file terpisah (investasi-watch-view.js) tapi tetap 1 entry point render()
    // supaya kedua tab call-site yang sudah ada (modules-render.js & aset.js setAsetTab)
    // otomatis ikut me-refresh watchlist tanpa perlu disentuh.
    if (typeof InvestmentWatchUI !== 'undefined') InvestmentWatchUI.render();
  },

  // _renderSummary() — kartu ringkasan portofolio, 100% reuse Investment.portfolioSummary()
  // (SUDAH ADA & sudah difilter ownership-self sejak S193, 0 rumus baru ditulis di sini).
  _renderSummary() {
    const valBox = document.getElementById('investSummaryValue');
    if (!valBox) return; // halaman ini belum ada di DOM (mis. dites via loadSource() tanpa DOM)
    if (typeof Investment === 'undefined') return;
    // BUGFIX (audit user "tab Investasi tidak respon sama sekali, tap = 0 reaksi"):
    // Investment.portfolioSummary() (investasi.js) me-reduce SEMUA holding sekaligus
    // TANPA try/catch per-holding (beda dari _renderList() di bawah yang sudah dilindungi
    // sejak fix sebelumnya) -- kalau SATU holding punya data yang bikin salah satu
    // hitungan (holdingValue/holdingCost/dividendTotal/realizedGainLoss/holdingYieldPct)
    // throw, exception itu merambat keluar SEBELUM render() sempat lanjut ke
    // _renderList() sama sekali (lihat render() di atas: _renderSummary() dipanggil
    // LEBIH DULU). Efeknya: seluruh tab Investasi gagal render dari titik ini, tapi
    // karena render() dipanggil langsung dari setAsetTab()/renderPageContent('aset')
    // (bukan lewat dispatcher data-action yang punya try/catch+toast), tidak ada toast
    // error sama sekali -- gejalanya persis "tidak respon", tap apa pun 0 reaksi (karena
    // _renderList() yang seharusnya mem-bind ulang data-action pada baris holding tidak
    // pernah sempat jalan). Fix: bungkus dgn try/catch -- 1 holding bermasalah fallback
    // ke kartu ringkasan kosong/aman (bukan skip total), TIDAK menjatuhkan render()
    // secara keseluruhan, supaya _renderList() di bawah tetap sempat jalan & tab tetap
    // bisa dipakai.
    let s;
    let summaryFailed = false;
    try {
      s = Investment.portfolioSummary();
    } catch (err) {
      summaryFailed = true;
      if (typeof console !== 'undefined' && console.error) console.error('[InvestmentListUI._renderSummary] gagal hitung portfolioSummary', err);
      s = { holdingsCount: 0, totalValue: 0, totalCost: 0, totalGainLoss: 0, roiPct: 0, yieldPct: null, totalDividend: 0, totalRealizedGain: 0 };
    }
    if (summaryFailed) {
      valBox.innerHTML = '<span class="u-t2" style="font-size:13px">⚠️ Gagal menghitung — cek daftar holding di bawah</span>';
    } else {
      valBox.textContent = fmt(s.totalValue);
    }
    const costBox = document.getElementById('investSummaryCost');
    if (costBox) costBox.textContent = fmt(s.totalCost);
    const gainBox = document.getElementById('investSummaryGain');
    if (gainBox) {
      const cls = s.totalGainLoss >= 0 ? 'green' : 'red';
      gainBox.innerHTML = 'Untung/Rugi belum direalisasi: <b class="' + cls + '">'
        + (s.totalGainLoss >= 0 ? '+' : '') + fmt(s.totalGainLoss)
        + ' (' + (s.roiPct >= 0 ? '+' : '') + s.roiPct.toFixed(2) + '%)</b>';
    }
    const metaBox = document.getElementById('investSummaryMeta');
    if (metaBox) {
      metaBox.textContent = s.holdingsCount + ' holding · Dividen: ' + fmt(s.totalDividend)
        + ' · Realized Gain: ' + fmt(s.totalRealizedGain);
    }
    // investSummaryYield (s476a2) — CAGR tahunan tertimbang, setara "assetInvestasiYield"
    // yang dulu ada di dashboard Buku Aset lama (aset.js renderInvestasi()) supaya paritas
    // fitur terjaga begitu Buku Aset lama disembunyikan (lihat AUDIT ROI/CAGR di
    // docs/s476-PLAN-migrate-investasi-to-holdings.md). Elemen ini opsional di DOM -- kalau
    // belum ditambahkan ke markup, baris ini aman di-skip (guard sama pola box lain di atas).
    const yieldBox = document.getElementById('investSummaryYield');
    if (yieldBox) {
      yieldBox.innerHTML = (s.yieldPct == null)
        ? '<span class="u-t2">Yield/CAGR belum bisa dihitung (isi Tanggal Perolehan di holding masing-masing)</span>'
        : 'Setara ~<b class="' + (s.yieldPct >= 0 ? 'green' : 'red') + '">' + (s.yieldPct >= 0 ? '+' : '') + s.yieldPct.toFixed(2) + '%/tahun</b> (CAGR)';
    }
  },

  // _renderList() — daftar holding, 1 baris per holding (pola tx-item SAMA PERSIS
  // Aset.renderList()) -- tap baris = buka investmentModal dalam mode Edit (bukan sub-menu
  // "⋮" spt Buku Aset, biar Fase 1 tetap sederhana; delete dilakukan dari DALAM modal lewat
  // deleteFromModal(), sesuai scope yang diminta).
  _renderList() {
    const el = document.getElementById('investmentHoldingList');
    if (!el) return;
    // BUGFIX (audit user, konfirmasi ke data backup: Vario 125 nyangkut jadi Holding):
    // banner peringatan utk holding "hantu" hasil bug lama migrateAssetInvestmentsToHoldings()
    // (aset-misc.js) sebelum gate `!!ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis]` ada -- aset
    // non-investasi (mis. Kendaraan) bisa kadung ikut termigrasi jadi Holding. Fix sumbernya
    // TIDAK retroaktif, jadi holding yg sudah kadung ke-migrasi sebelumnya tetap nyangkut di
    // sini. findGhostMigratedAssets() (aset-misc.js, SUDAH ADA) mendeteksi kandidatnya (read
    // only, 0 auto-fix); tombol di banner panggil InvestmentListUI.unmigrateGhost() ->
    // unmigrateAssetFromInvestment() (SUDAH ADA) supaya keputusan pulihkan tetap di tangan
    // user. Dirender di ATAS daftar holding biasa & TETAP tampil walau holdings kosong,
    // supaya tidak ketinggalan kalau semua holding user memang cuma holding hantu ini.
    let ghostBanner = '';
    if (typeof findGhostMigratedAssets === 'function') {
      const ghosts = findGhostMigratedAssets();
      if (ghosts.length) {
        ghostBanner = ghosts.map((a) => (
          '<div class="card" style="border:1px solid var(--accent4);background:var(--accent4-soft);margin-bottom:10px;padding:12px 14px">'
          + '<div style="font-size:12.5px;line-height:1.6;margin-bottom:8px">⚠️ "' + escapeHtml(a.name || '(tanpa nama)') + '" kemungkinan salah ke-migrasi ke sini dari Buku Aset (bukan aset investasi, mis. Kendaraan) akibat bug lama. Pulihkan ke Buku Aset?</div>'
          + '<button type="button" class="btn btn-ghost btn-sm" data-action="InvestmentListUI.unmigrateGhost" data-args="' + escapeHtml(JSON.stringify([a.id])) + '">↩️ Pulihkan ke Buku Aset</button>'
          + '</div>'
        )).join('');
      }
    }
    if (typeof Investment === 'undefined') { el.innerHTML = ghostBanner; return; }
    const holdings = Investment.getHoldings();
    if (!holdings.length) {
      el.innerHTML = ghostBanner + '<div class="empty"><div class="empty-icon">💹</div><div class="empty-text">Belum ada holding investasi tercatat</div></div>';
      return;
    }
    // BUGFIX (audit user "tap holding hasil migrasi = 0 reaksi, 0 toast"): sebelumnya
    // `.map()` di sini TANPA try/catch per-baris -- kalau SATU holding punya data yang
    // bikin salah satu hitungan (holdingValue/holdingGainLoss/holdingROI/
    // investmentCrossCheckWarning) throw, exception itu merambat keluar dari `.map()`
    // SEBELUM `el.innerHTml=...` sempat jalan sama sekali. Efeknya: render_List() ini
    // sendiri throw tanpa pernah ditangkap (dipanggil langsung dari render()/setAsetTab(),
    // bukan lewat dispatcher data-action yang punya try/catch+toast), `console.error` yang
    // muncul gampang tenggelam di HP, dan `#investmentHoldingList` tetap berisi HTML dari
    // render SUKSES sebelumnya -- termasuk data-action yang tampak normal & bisa
    // "diklik", tapi bindingnya sudah basi terhadap data holding yang sekarang (mis. row
    // untuk holding yang sudah dihapus/berubah id). Gejalanya persis: kelihatan normal,
    // tap = 0 reaksi, 0 toast (karena dispatcher pun tidak pernah kebagian action yang
    // valid). Fix: bungkus hitungan PER HOLDING dgn try/catch -- 1 holding bermasalah
    // fallback ke nilai aman (0/null) dan tetap dirender sbg row yang BISA di-tap (badge
    // ⚠️ muncul di baris itu sbg penanda), tidak menjatuhkan seluruh render list.
    el.innerHTML = ghostBanner + holdings.map((h) => {
      let value = 0, gain = 0, roi = 0, warn = null, renderError = false;
      try {
        value = Investment.holdingValue(h);
        gain = Investment.holdingGainLoss(h);
        roi = Investment.holdingROI(h);
        // S552 (diaktifkan) — badge cross-check kepemilikan Aset<->Investasi, reuse
        // investmentCrossCheckWarning() (investasi.js) apa adanya, 0 rumus baru di sini.
        warn = (typeof investmentCrossCheckWarning === 'function') ? investmentCrossCheckWarning(h) : null;
      } catch (err) {
        renderError = true;
        if (typeof console !== 'undefined' && console.error) console.error('[InvestmentListUI._renderList] gagal hitung holding', h && h.id, err);
      }
      const cls = gain >= 0 ? 'green' : 'red';
      const warnText = renderError ? 'Gagal menghitung nilai holding ini — tap untuk buka & cek datanya' : warn;
      const warnChip = warnText ? ' <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="' + escapeHtml(warnText) + '">⚠️</span>' : '';
      return '<div class="tx-item u-pointer" data-action="InvestmentListUI.openModal" data-args="' + escapeHtml(JSON.stringify([h.id])) + '">'
        + '<div class="tx-icon u-bgaccsoft">💹</div>'
        + '<div class="tx-info">'
        + '<div class="tx-name">' + escapeHtml(h.name || '(tanpa nama)') + warnChip + '</div>'
        + '<div class="tx-meta"><span class="acc-chip">' + escapeHtml(h.type || '-') + '</span> ' + (h.unit || 0) + ' unit · ROI ' + (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%</div>'
        + '</div>'
        + '<div class="tx-amount"><div>' + fmt(value) + '</div><div class="u-fs11 ' + cls + '">' + (gain >= 0 ? '+' : '') + fmt(gain) + '</div></div>'
        + '</div>';
    }).join('');
  },

  // _resolveLinkedAsset(h) — B10: Investasi -> Aset Reverse Navigation (simetris dgn
  // B3 Aset -> Investasi). Cari SATU entry D.assets yang investmentId-nya menunjuk ke
  // holding ini (link dibuat dari sisi Aset lewat dropdown B1, "🔗 Hubungkan ke Holding
  // Investasi"). PURE/READ-ONLY, baca LIVE dari D.assets tiap panggilan (0 snapshot/cache
  // di h) — pola sama persis Aset._resolveLinkedInvestment() (kebalikannya, aset.js).
  // Balikin objek aset (a) kalau ketemu, null kalau tidak ada aset manapun yang tertaut
  // ke holding ini (normal, bukan data rusak — tidak semua holding harus punya aset
  // tertaut baliknya).
  _resolveLinkedAsset(h) {
    if (!h) return null;
    return (D.assets || []).find((a) => a.investmentId && sameId(a.investmentId, h.id)) || null;
  },

  // _renderAssetLinkAction(h) — B10: bangun tombol navigasi "🔗 Lihat di Aset" di
  // investmentModal, HANYA tampil kalau holding ini SUDAH ditautkan balik oleh SATU
  // entry Buku Aset (via _resolveLinkedAsset() di atas). Pola PERSIS
  // Aset._renderVehicleLinkAction() (S509c, aset.js) — container div disembunyikan
  // (u-dnone) kalau tidak ada match, ditampilkan (innerHTML tombol) kalau ada. 100%
  // reuse Aset.openModal() (sudah ada sejak awal) lewat dispatcher data-action generik
  // yang sudah ada — TIDAK ada modal baru, TIDAK ada router baru.
  _renderAssetLinkAction(h) {
    const box = document.getElementById('investmentAssetLinkAction');
    if (!box) return;
    const a = InvestmentListUI._resolveLinkedAsset(h);
    if (!a) { box.innerHTML = ''; box.classList.toggle('u-dnone', true); return; }
    box.innerHTML = '<button type="button" class="btn btn-ghost btn-full btn-sm" data-action="Aset.openModal" data-args="' + escapeHtml(JSON.stringify([a.id])) + '">🔗 Lihat di Aset</button>';
    box.classList.toggle('u-dnone', false);
  },

  // _renderAssetLinkWarning(h) — S552 (diaktifkan). Isi/kosongkan
  // #investAssetLinkWarning di investmentModal, reuse investmentCrossCheckWarning(h)
  // (investasi.js) apa adanya — 0 rumus baru. h=null (mode Tambah) atau tidak ada
  // mismatch -> kosong & disembunyikan, pola sama persis _renderAssetLinkAction() di
  // atas (toggle u-dnone, tidak pernah dihapus dari DOM).
  _renderAssetLinkWarning(h) {
    const box = document.getElementById('investAssetLinkWarning');
    if (!box) return;
    const warn = (h && typeof investmentCrossCheckWarning === 'function') ? investmentCrossCheckWarning(h) : null;
    box.textContent = warn || '';
    box.classList.toggle('u-dnone', !warn);
  },

  // onAssetLinkChange() — onchange handler dropdown #investAssetId. Live-preview badge
  // mismatch SEBELUM disimpan (dgn cara sementara "meminjam" h.assetId draft dari nilai
  // dropdown, TANPA menulis ke D.investments — mutasi sesungguhnya baru terjadi saat
  // save()). Pola sama persis Aset.onInvestmentLinkChange() (aset.js, B1) tapi arah
  // kebalikannya. Mode Tambah (editId kosong) -> tidak ada holding utk dibandingkan,
  // badge tetap kosong (guard di _renderAssetLinkWarning via h=null).
  onAssetLinkChange() {
    const assetIdEl = document.getElementById('investAssetId');
    const draftAssetId = assetIdEl ? assetIdEl.value : '';
    const h = InvestmentListUI.editId && typeof Investment !== 'undefined' ? Investment.getHolding(InvestmentListUI.editId) : null;
    if (!h) { InvestmentListUI._renderAssetLinkWarning(null); return; }
    // Bandingkan pakai draft assetId (bukan h.assetId tersimpan) supaya badge langsung
    // update begitu user ganti pilihan, tanpa perlu save dulu — 0 mutasi h di sini.
    const linked = draftAssetId ? (typeof resolveInvestmentAssetLink === 'function' ? resolveInvestmentAssetLink(draftAssetId) : null) : null;
    const warn = linked && typeof assetInvestmentMismatch === 'function' && assetInvestmentMismatch(linked, h)
      ? '⚠️ Kepemilikan beda dgn Buku Aset yang ditautkan' : null;
    const box = document.getElementById('investAssetLinkWarning');
    if (box) { box.textContent = warn || ''; box.classList.toggle('u-dnone', !warn); }
  },

  // openModal(id) — buka investmentModal, mode Tambah kalau id kosong, mode Edit (prefill
  // dari holding yang sudah ada) kalau id diisi. Pola SAMA PERSIS Aset.openModal().
  openModal(id) {
    InvestmentListUI.editId = id || null;
    const h = (id && typeof Investment !== 'undefined') ? Investment.getHolding(id) : null;
    const titleEl = document.getElementById('investmentModalTitle');
    if (titleEl) titleEl.textContent = h ? 'Edit Holding' : 'Tambah Holding';
    const nameEl = document.getElementById('investName');
    if (nameEl) nameEl.value = h ? h.name : '';
    const jenisEl = document.getElementById('investJenis');
    if (jenisEl) {
      if (typeof INVESTMENT_TYPES !== 'undefined') {
        jenisEl.innerHTML = INVESTMENT_TYPES.map((t) => '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>').join('');
      }
      jenisEl.value = h ? h.type : 'Saham';
    }
    const unitEl = document.getElementById('investUnit');
    if (unitEl) unitEl.value = (h && h.unit != null) ? h.unit : '';
    const avgEl = document.getElementById('investAvgPrice');
    if (avgEl) avgEl.value = (h && h.avgPrice != null) ? h.avgPrice : '';
    const curEl = document.getElementById('investCurrentPrice');
    if (curEl) curEl.value = (h && h.currentPrice != null) ? h.currentPrice : '';
    const notesEl = document.getElementById('investNotes');
    if (notesEl) notesEl.value = h ? (h.notes || '') : '';
    // investPurchaseDate (s476a2) — opsional, dipakai Investment.holdingYieldPct() utk
    // hitung CAGR holding ini (lihat docs/s476-PLAN-migrate-investasi-to-holdings.md, bagian
    // AUDIT ROI/CAGR). Kosong = CAGR holding ini tidak bisa dihitung (sama pola a.tanggal
    // opsional di Buku Aset lama).
    const dateEl = document.getElementById('investPurchaseDate');
    if (dateEl) dateEl.value = h ? (h.purchaseDate || '') : '';
    // investCustodian (S540-C, Tahap 3/4 DESIGN-S540-CUSTODIAN-GROUPING.md):
    // dropdown "Pilih/Buat Kustodian", pola dropdown SAMA PERSIS
    // InvestmentUI._ownerNameFieldHtml() (S491) tapi disederhanakan jadi
    // <select> statis (elemen ini sudah ada di modals.js, bukan
    // di-render ulang per baris spt owners list) -- opsi diisi ulang tiap
    // openModal() dari CustodianRegistry.listAll() (S540-A). Holding tanpa
    // custodianId (h.custodianId null/undefined, termasuk SEMUA data lama)
    // -> value kosong terpilih ("— Tidak ada —"), 0 dipaksa assign apa pun.
    InvestmentListUI._renderCustodianOptions(h ? h.custodianId : null);
    // investmentAssetLinkAction (B10) — tombol "🔗 Lihat di Aset", lihat
    // _renderAssetLinkAction() di atas. Dipanggil di sini (bukan cuma di mode Edit)
    // supaya mode Tambah (h=null) otomatis ikut menyembunyikan kontainer lewat guard
    // di _resolveLinkedAsset(null)->null, pola sama persis _renderCustodianOptions()
    // di atas yang juga dipanggil tanpa cabang if/else terpisah.
    InvestmentListUI._renderAssetLinkAction(h);
    // investAssetId (S552, diaktifkan) — dropdown "🔗 Hubungkan ke Buku Aset", arah
    // Investment -> Asset (h.assetId), kebalikan dari assetInvestmentId (arah Asset ->
    // Investment, a.investmentId, sudah live sejak B1). Opsi dibangun dari
    // investmentAssetLinkOptionsHtml() (investasi.js, S552, sudah ada & tidak diubah).
    const assetIdEl = document.getElementById('investAssetId');
    if (assetIdEl) {
      assetIdEl.innerHTML = (typeof investmentAssetLinkOptionsHtml === 'function')
        ? investmentAssetLinkOptionsHtml(h ? h.assetId : null)
        : '<option value="">— Tidak terhubung —</option>';
      assetIdEl.value = (h && h.assetId) ? h.assetId : '';
    }
    InvestmentListUI._renderAssetLinkWarning(h);
    // investAccId (S601-3, DL-S601-3) — dropdown "🔗 Hubungkan ke Akun", pola
    // TULIS/BACA sama persis investAssetId di atas (populate via
    // populateAccFilters(), yang juga mengisi opsi ini -- lihat
    // modules/finance/akun.js). Holding tanpa accountId (h.accountId
    // null/undefined, termasuk SEMUA holding lama) -> value kosong terpilih.
    const accIdEl = document.getElementById('investAccId');
    if (accIdEl) accIdEl.value = (h && h.accountId) ? h.accountId : '';
    // Tombol "⚖️ Atur Porsi Kepemilikan" & "🗑️ Hapus Holding" cuma masuk akal utk holding
    // yang SUDAH tersimpan (butuh id) — disembunyikan di mode Tambah, pola sama persis
    // assetModal (openOwnersModal cuma jalan kalau Aset.editId terisi).
    const ownersBtn = document.getElementById('investmentOwnersBtn');
    if (ownersBtn) ownersBtn.classList.toggle('u-dnone', !h);
    // investmentTxBtn (Fase 2, BUG-INV-001 Opsi 3 §3.3) -- tombol pemicu "💱 Riwayat
    // Transaksi" ke InvestmentTxUI.openFromEdit(), sama pola persis ownersBtn di atas:
    // cuma masuk akal utk holding yang SUDAH tersimpan (butuh id), disembunyikan di mode
    // Tambah.
    const txBtn = document.getElementById('investmentTxBtn');
    if (txBtn) txBtn.classList.toggle('u-dnone', !h);
    const delBtn = document.getElementById('investmentDeleteBtn');
    if (delBtn) delBtn.classList.toggle('u-dnone', !h);
    openModal('investmentModal');
  },

  // _renderCustodianOptions(selectedId) — S540-C. Isi ulang <select id="investCustodian">
  // dari CustodianRegistry.listAll() (S540-A) + 1 opsi kosong ("— Tidak ada —", default,
  // dipilih otomatis utk holding tanpa custodianId -- termasuk SEMUA holding lama, S540-B)
  // + 1 opsi "➕ Buat kustodian baru..." (value "__new__", ditangani onCustodianSelectChange()
  // di bawah). Kalau holding SUDAH punya custodianId yang custodian-nya sudah dihapus dari
  // registry (kasus tepi, belum ada fitur hapus kustodian sesi ini tapi dijaga defensif) --
  // tetap disertakan sbg opsi tersendiri (pola sama persis InvestmentUI._ownerNameFieldHtml()
  // utk ownerId legacy yang tidak ketemu di registry) supaya buka modal tidak diam-diam
  // "melepas" kustodian yang sudah tersimpan.
  _renderCustodianOptions(selectedId) {
    const sel = document.getElementById('investCustodian');
    if (!sel) return;
    const list = (typeof CustodianRegistry !== 'undefined') ? CustodianRegistry.listAll() : [];
    let matched = false;
    let opts = '<option value="">— Tidak ada / belum dikelompokkan —</option>';
    list.forEach((c) => {
      const sel2 = (selectedId && String(selectedId) === String(c.id)) ? ' selected' : '';
      if (sel2) matched = true;
      opts += '<option value="' + escapeHtml(c.id) + '"' + sel2 + '>' + escapeHtml(c.name) + '</option>';
    });
    if (selectedId && !matched) {
      opts += '<option value="' + escapeHtml(selectedId) + '" selected>(kustodian tidak ditemukan)</option>';
    }
    opts += '<option value="__new__">➕ Buat kustodian baru…</option>';
    sel.innerHTML = opts;
    if (!selectedId) sel.value = '';
    InvestmentListUI._syncCustodianActionButtons();
  },

  // _syncCustodianActionButtons() — S542 (follow-up ringan #2 pasca-S541,
  // lihat s541-SESSION-NOTE.md §Non-goals: rename/hapus kustodian dari
  // registry). Tampilkan link "✏️ Ubah Nama Kustodian" / "🗑️ Hapus
  // Kustodian" (#investCustodianActions di modals.js) HANYA kalau dropdown
  // #investCustodian sedang terpilih ke entri kustodian yang NYATA ADA di
  // registry -- bukan opsi kosong ("— Tidak ada —"), bukan "__new__" yang
  // belum ke-resolve, dan bukan id legacy yang custodian-nya sudah pernah
  // dihapus (opsi "(kustodian tidak ditemukan)" di _renderCustodianOptions()
  // di atas -- 0 tombol aksi utk entri yang memang sudah tidak ada).
  // Dipanggil dari _renderCustodianOptions() (tiap kali dropdown di-render
  // ulang: buka modal & sesudah pilih/buat kustodian baru).
  _syncCustodianActionButtons() {
    const sel = document.getElementById('investCustodian');
    const wrap = document.getElementById('investCustodianActions');
    if (!sel || !wrap) return;
    const val = sel.value;
    const list = (typeof CustodianRegistry !== 'undefined') ? CustodianRegistry.listAll() : [];
    const isReal = !!val && val !== '__new__' && list.some((c) => c && String(c.id) === String(val));
    wrap.classList.toggle('u-dnone', !isReal);
  },

  // renameCustodian() — S542. Prompt nama baru (prefill nama lama lewat
  // showPromptModal defaultValue) utk entri kustodian yang SEDANG terpilih
  // di dropdown, delegasi ke CustodianRegistry.rename() (S542, id TIDAK
  // berubah -- 0 holding lain perlu di-update krn semua baca nama lewat
  // lookup id, bukan salinan string). Setelah sukses, render ulang dropdown
  // supaya label baru langsung kelihatan di opsi yang sedang terpilih.
  async renameCustodian() {
    const sel = document.getElementById('investCustodian');
    if (!sel || !sel.value || sel.value === '__new__') return;
    if (typeof CustodianRegistry === 'undefined' || typeof CustodianRegistry.rename !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur kustodian belum siap dimuat');
      return;
    }
    const current = (CustodianRegistry.listAll().find((c) => c && String(c.id) === String(sel.value)) || {}).name || '';
    const name = typeof showPromptModal === 'function'
      ? await showPromptModal({ title: 'Ubah Nama Kustodian', message: 'Nama baru utk platform/institusi kustodian ini', defaultValue: current, placeholder: 'Majoris, Bibit, IPOT, dll' })
      : (typeof prompt === 'function' ? prompt('Nama baru kustodian', current) : null);
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const ok = CustodianRegistry.rename(sel.value, trimmed);
    if (!ok) { if (typeof toast === 'function') toast('⚠️ Kustodian tidak ditemukan'); return; }
    InvestmentListUI._renderCustodianOptions(sel.value);
    // FIX sD (laporan user: nama kustodian lama "menempel" di tab Dana
    // Titipan setelah di-rename di sini) — rename hanya mengubah
    // D.investmentCustodians & re-render dropdown DI DALAM modal ini;
    // DanaTitipanPortfolioPresenter (tab terpisah, sudah ter-render
    // duluan dgn nama LAMA) tidak pernah diberi tahu ada perubahan.
    // Semua mutasi lain yang mempengaruhi kartu Dana Titipan (commitment,
    // return, expense) SELALU diikuti panggilan render() ini juga (lihat
    // dana-titipan-portfolio-render.js/titipan-expense-ui.js) — custodian
    // rename/delete ketinggalan pola yang sama. Guarded typeof, pola sama
    // persis semua caller lain, 0 perubahan pada CustodianRegistry itu
    // sendiri.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('✅ Nama kustodian diubah ke "' + trimmed + '"');
  },

  // deleteCustodian() — S542. Hapus entri kustodian yang SEDANG terpilih di
  // dropdown dari registry (CustodianRegistry.remove(), S542) SETELAH
  // konfirmasi eksplisit yang menjelaskan holding terkait TIDAK ikut
  // terhapus (cuma "lepas" dari grup & fallback label "Kustodian" -- pola
  // aman yang sudah ada sejak S540-D, lihat catatan di
  // custodian-registry.js). Setelah sukses, render ulang dropdown
  // (kustodian yang baru dihapus otomatis hilang dari daftar opsi, holding
  // yang tadinya terpilih ke situ balik ke opsi kosong).
  async deleteCustodian() {
    const sel = document.getElementById('investCustodian');
    if (!sel || !sel.value || sel.value === '__new__') return;
    if (typeof CustodianRegistry === 'undefined' || typeof CustodianRegistry.remove !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur kustodian belum siap dimuat');
      return;
    }
    const current = (CustodianRegistry.listAll().find((c) => c && String(c.id) === String(sel.value)) || {}).name || 'kustodian ini';
    const confirmed = typeof askConfirm === 'function'
      ? await askConfirm('Hapus "' + current + '" dari daftar kustodian? Holding investasi yang masih terkait TIDAK ikut terhapus & tetap tersimpan normal -- hanya labelnya berubah jadi "Kustodian" (generik) & tidak lagi terkelompok di grup ini.', { title: 'Hapus Kustodian', okText: 'Ya, Hapus' })
      : (typeof confirm === 'function' ? confirm('Hapus kustodian "' + current + '"?') : true);
    if (!confirmed) return;
    const removedId = sel.value;
    const ok = CustodianRegistry.remove(removedId);
    if (!ok) { if (typeof toast === 'function') toast('⚠️ Kustodian tidak ditemukan'); return; }
    InvestmentListUI._renderCustodianOptions(null);
    // FIX sD — sama seperti renameCustodian() di atas: hapus kustodian
    // TIDAK pernah memberi tahu DanaTitipanPortfolioPresenter, jadi grup
    // "🏦 <nama kustodian>" di tab Dana Titipan tetap tampak (DOM lama)
    // walau CustodianRegistry.remove() sudah sukses & holding-nya sudah
    // fallback ke label generik "Kustodian" secara data (bug laporan
    // user: "Majoris masih render padahal sudah dihapus"). Render ulang
    // di sini supaya tab Dana Titipan langsung konsisten dgn data
    // terbaru begitu modal ditutup, tanpa perlu ganti tab manual dulu.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('🗑️ Kustodian "' + current + '" dihapus');
  },

  // onCustodianSelectChange(val) — S540-C. Dipanggil dari onchange dropdown
  // #investCustodian. val==="__new__" -> prompt nama kustodian baru (pola sama persis
  // DanaTitipanCommitmentUI.addNewOwner(), S523-B), CustodianRegistry.findOrCreate()
  // (S540-A, dedup by nama), lalu render ulang dropdown dgn entri baru itu terpilih.
  // Batal/nama kosong -> dropdown dikembalikan ke opsi kosong (tidak nyangkut di
  // "__new__"). Murni UI state -- 0 tulis ke holding di sini, penulisan sesungguhnya
  // terjadi saat InvestmentListUI.save() (custodianId dibaca dari value select ini).
  async onCustodianSelectChange(val) {
    if (val !== '__new__') { InvestmentListUI._syncCustodianActionButtons(); return; }
    if (typeof CustodianRegistry === 'undefined' || typeof CustodianRegistry.findOrCreate !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur kustodian belum siap dimuat');
      InvestmentListUI._renderCustodianOptions(null);
      return;
    }
    const name = typeof showPromptModal === 'function'
      ? await showPromptModal({ title: 'Tambah Kustodian Baru', message: 'Nama platform/institusi kustodian', placeholder: 'Majoris, Bibit, IPOT, dll' })
      : (typeof prompt === 'function' ? prompt('Nama platform/institusi kustodian') : null);
    const trimmed = (name || '').trim();
    if (!trimmed) { InvestmentListUI._renderCustodianOptions(null); return; }
    const id = CustodianRegistry.findOrCreate(trimmed);
    InvestmentListUI._renderCustodianOptions(id);
    if (typeof toast === 'function') toast('✅ Kustodian "' + trimmed + '" ditambahkan');
  },

  // openOwnersModalForEdit() — wrapper tipis yang membaca InvestmentListUI.editId lalu
  // delegasi PENUH ke InvestmentUI.openOwnersModal(id) (SUDAH ADA sejak S464, 0 logic baru
  // ditulis di sini) — dibutuhkan krn tombol di dalam modal ini dipasang statis lewat
  // modals.js (bukan di-render ulang tiap buka), jadi tidak bisa langsung
  // data-args='["<id-dinamis>"]' seperti caller yang tahu id-nya dari closure render.
  openOwnersModalForEdit() {
    if (!InvestmentListUI.editId) { toast('⚠️ Simpan holding ini dulu sebelum atur porsi kepemilikan'); return; }
    if (typeof InvestmentUI === 'undefined') { toast('⚠️ Fitur porsi kepemilikan investasi belum siap dimuat'); return; }
    InvestmentUI.openOwnersModal(InvestmentListUI.editId);
  },

  // save() — baca form investmentModal, wire ke Investment.addHolding()/updateHolding()
  // (SUDAH ADA, 0 validasi/rumus baru ditulis di sini — addHolding() sendiri yang melempar
  // Error kalau nama kosong). unit/avgPrice ditulis manual (lihat catatan scope di kepala
  // file) langsung ke object holding setelah updateHolding()/addHolding() (keduanya TIDAK
  // menerima patch unit/avgPrice lewat argumen resmi — field itu didesain diturunkan dari
  // recomputeHolding(), belum ada di Fase 1 ini), lalu save() dipanggil eksplisit supaya
  // perubahan manual ini tetap tersimpan bareng.
  save() {
    if (typeof Investment === 'undefined') { toast('⚠️ Fitur investasi belum siap dimuat'); return; }
    const nameEl = document.getElementById('investName');
    const name = nameEl ? nameEl.value.trim() : '';
    const jenisEl = document.getElementById('investJenis');
    const type = jenisEl ? jenisEl.value : 'Lainnya';
    const unitEl = document.getElementById('investUnit');
    const unit = (unitEl && unitEl.value !== '') ? parseDecStr(unitEl.value) : 0;
    const avgEl = document.getElementById('investAvgPrice');
    const avgPrice = (avgEl && avgEl.value !== '') ? parseDecStr(avgEl.value) : 0;
    const curEl = document.getElementById('investCurrentPrice');
    const currentPrice = (curEl && curEl.value !== '') ? parseDecStr(curEl.value) : 0;
    const notesEl = document.getElementById('investNotes');
    const notes = notesEl ? notesEl.value : '';
    const dateEl = document.getElementById('investPurchaseDate');
    const purchaseDate = dateEl ? (dateEl.value || null) : null;
    // custodianId (S540-C) -- dibaca dari dropdown #investCustodian. "" (opsi kosong)
    // atau "__new__" yang kebetulan belum ke-resolve (mis. user submit form tanpa
    // menunggu prompt "Buat kustodian baru" selesai) DIPERLAKUKAN sbg "tidak ada
    // kustodian" (updateHolding() sendiri sudah menormalkan falsy -> null, lihat
    // investasi.js) -- 0 kemungkinan literal string "__new__" tersimpan sbg id.
    const custodianEl = document.getElementById('investCustodian');
    const custodianId = (custodianEl && custodianEl.value !== '__new__') ? custodianEl.value : '';
    // assetId (S552, diaktifkan) -- dibaca dari dropdown #investAssetId, "" (opsi
    // "— Tidak terhubung —") dinormalisasi jadi null lewat updateHolding() sendiri
    // (patch.assetId !== undefined -> h.assetId = patch.assetId || null, investasi.js),
    // pola SAMA PERSIS custodianId di atas.
    const assetIdEl = document.getElementById('investAssetId');
    const assetId = assetIdEl ? assetIdEl.value : '';
    // accountId (S601-3) -- dibaca dari dropdown #investAccId, pola SAMA PERSIS
    // assetId/custodianId di atas (falsy dinormalisasi jadi null lewat
    // updateHolding()/patch di bawah).
    const accIdEl = document.getElementById('investAccId');
    const accountId = accIdEl ? accIdEl.value : '';
    let h;
    try {
      if (InvestmentListUI.editId) {
        h = Investment.updateHolding(InvestmentListUI.editId, { name, type, currentPrice, notes, purchaseDate, custodianId, assetId, accountId });
      } else {
        h = Investment.addHolding({ name, type, unit, avgPrice, currentPrice: currentPrice || avgPrice, notes, purchaseDate });
      }
    } catch (e) {
      toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan holding'));
      return;
    }
    if (InvestmentListUI.editId && h) {
      h.unit = unit;
      h.avgPrice = avgPrice;
      if (typeof save === 'function') save();
    } else if (h) {
      // addHolding() (investasi.js) belum menerima custodianId/assetId lewat argumen
      // resmi (holding baru selalu mulai custodianId:null & assetId:null, sesuai
      // default S540-B/S552) -- kustodian & tautan Buku Aset yang dipilih di form
      // Tambah Holding ditulis lewat updateHolding() TERPISAH langsung setelah
      // addHolding() sukses, supaya jalur normalisasi falsy->null (investasi.js) tetap
      // 1 sumber kebenaran, bukan assignment manual field mentah spt unit/avgPrice di
      // atas (yang memang belum ada jalur updateHolding()-nya).
      const patch = {};
      if (custodianId) patch.custodianId = custodianId;
      if (assetId) patch.assetId = assetId;
      if (accountId) patch.accountId = accountId;
      if (Object.keys(patch).length) Investment.updateHolding(h.id, patch);
    }
    closeModal('investmentModal');
    InvestmentListUI.render();
    if (typeof renderKekayaanBersih === 'function') renderKekayaanBersih();
    if (typeof hitungZakatMaal === 'function') hitungZakatMaal();
    if (typeof AIBus !== 'undefined') AIBus.emit('investment.updated', { holdingId: h && h.id });
    toast('✅ Holding tersimpan');
  },

  // deleteFromModal() — hapus holding yang SEDANG dibuka di investmentModal (baca
  // InvestmentListUI.editId, bukan argumen — tombolnya statis di modals.js, pola sama
  // openOwnersModalForEdit() di atas). 100% reuse Investment.deleteHolding() (SUDAH ADA,
  // sudah membersihkan D.investmentTx & entry Buku Utang tertaut, 0 logic baru).
  async deleteFromModal() {
    const targetId = InvestmentListUI.editId;
    if (!targetId || typeof Investment === 'undefined') return;
    if (!await askConfirm('Hapus holding investasi ini? Riwayat transaksi & entry Buku Utang titipan yang tertaut ikut terhapus.', { okText: 'Ya, Hapus' })) return;
    Investment.deleteHolding(targetId);
    InvestmentListUI.editId = null;
    closeModal('investmentModal');
    InvestmentListUI.render();
    if (typeof renderKekayaanBersih === 'function') renderKekayaanBersih();
    if (typeof hitungZakatMaal === 'function') hitungZakatMaal();
    if (typeof renderDebtList === 'function') renderDebtList();
    if (typeof AIBus !== 'undefined') AIBus.emit('investment.updated', { deletedId: targetId });
    toast('🗑️ Holding dihapus');
  },

  // unmigrateGhost(assetId) — pasangan banner "holding hantu" di _renderList() di atas:
  // konfirmasi dulu (data user, keputusan bukan otomatis), lalu panggil
  // unmigrateAssetFromInvestment() (aset-misc.js, SUDAH ADA, 0 logic baru di sini) yang
  // menghapus holding tujuan & membersihkan `_migratedToInvestmentId` di asetnya. Refresh
  // KEDUA sisi (Investasi & Buku Aset) + agregat turunan supaya konsisten sesegera
  // mungkin, pola sama deleteFromModal()/saveFromModal() di atas.
  async unmigrateGhost(assetId) {
    if (typeof unmigrateAssetFromInvestment !== 'function') return;
    if (!await askConfirm('Pulihkan aset ini ke Buku Aset? Holding investasinya akan dihapus (riwayat transaksi holding & entry Buku Utang titipan yang tertaut ikut terhapus), datanya kembali normal sbg entry Buku Aset biasa.', { okText: 'Ya, Pulihkan' })) return;
    const ok = unmigrateAssetFromInvestment(assetId);
    if (!ok) { toast('⚠️ Gagal memulihkan — aset tidak ditemukan'); return; }
    InvestmentListUI.render();
    if (typeof Aset !== 'undefined' && typeof Aset.renderList === 'function') Aset.renderList();
    if (typeof renderKekayaanBersih === 'function') renderKekayaanBersih();
    if (typeof hitungZakatMaal === 'function') hitungZakatMaal();
    toast('✅ Aset dipulihkan ke Buku Aset');
  },
};

if (typeof window !== 'undefined') {
  window.InvestmentListUI = InvestmentListUI;
}
