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

  // filterOwnerIds / filterSettlement — S662 (fondasi single-select), diubah jadi
  // MULTI-select owner di S669 (lanjutan eksplisit dari catatan "Belum dikerjakan"
  // SESSION-NOTE-S668.md: "S669: multi-select owner di daftar Investasi"). State UI
  // MURNI (bukan ditulis ke D), direset tiap reload halaman -- pola sama editId di
  // atas. filterOwnerIds: array ownerId non-SELF (dari Investment.getOwners(h),
  // sudah kanonik lewat OwnerRegistry sejak S491) yang SEDANG dicentang; array
  // kosong = Semua Pemilik (filter nonaktif). filterSettlement: '' = Semua Status,
  // atau 'titipan'/'milik' (Investment.getOwnerSettlement(), S660) -- HANYA relevan
  // kalau filterOwnerIds terisi (owner SELF tidak punya konsep settlement, lihat
  // _syncTitipanDebt() di investasi.js yg selalu skip owner isSelf). Semantik OR:
  // holding lolos kalau punya SALAH SATU owner dari filterOwnerIds (bukan harus
  // semua) -- keputusan user "checkbox list, tap tiap nama, ada centang" (S669).
  filterOwnerIds: [],
  filterSettlement: '',

  // _filterPrefsLoaded/_filterStorageKey — S672, penyimpanan filter Pemilik+Status ke
  // localStorage (item backlog dari SESSION-NOTE-S670.md/S671.md: "Persist pilihan
  // filter owner (filterOwnerIds dkk) ke localStorage, pola sama cardCollapsePrefs").
  // _filterPrefsLoaded murni flag runtime (bukan dipersist) supaya _loadFilterPrefsOnce()
  // di render() cuma baca localStorage SEKALI per lifetime halaman -- baca ulang tiap
  // render() akan menimpa balik perubahan live user dgn nilai lama di storage.
  _filterPrefsLoaded: false,
  _filterStorageKey: 'investmentListFilterPrefs',

  // render() — dipanggil dari setAsetTab('investasi') & renderPageContent('aset') (SSOT,
  // sama pola AlokasiAset.init()/renderWealthSnapshots() yang dipanggil di 2 titik yang
  // sama). Aman dipanggil berkali-kali, murni re-render dari D.investments apa adanya.
  render() {
    // _loadFilterPrefsOnce() — S672 (item backlog "persist filter ke localStorage" dari
    // SESSION-NOTE-S670.md/S671.md, pola sama cardCollapsePrefs di modal-navigasi.js).
    // Dipanggil di render() (satu-satunya SSOT entry point tab Investasi dibuka/dibuka
    // ulang) supaya filter tersimpan diterapkan begitu tab dibuka, TANPA menimpa
    // perubahan live user tiap kali render() dipanggil ulang -- guard _filterPrefsLoaded
    // di dalamnya bikin baca localStorage cuma terjadi SEKALI per lifetime halaman.
    InvestmentListUI._loadFilterPrefsOnce();
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
    // investSummaryFilterNote (S663, lanjutan S662) — baris kecil "Menampilkan: X
    // dari Y holding (Rp Z)" saat filter Pemilik (InvestmentListUI.filterOwnerId)
    // sedang aktif. Kartu ringkasan di ATAS (totalValue/totalCost/gain, dari
    // Investment.portfolioSummary()) SENGAJA TETAP dihitung dari SEMUA holding
    // (0 diubah) -- baris ini cuma info tambahan supaya user sadar itu ≠ hasil
    // filter yang lagi ditampilkan _renderList() di bawah, bukan pengganti kartu
    // ringkasan. Dipasang sbg elemen sibling TEPAT SETELAH #investSummaryMeta
    // lewat insertAdjacentElement (pola SAMA PERSIS
    // InvestmentUI._renderRebalancePanel(), investasi-view.js) -- dibuat sekali,
    // dipakai ulang di render berikutnya, TIDAK perlu ubah markup index.html sama
    // sekali, supaya sesi ini tetap 1 file source yang disentuh (pola "1 sesi 1
    // file" di docs/ZIP_RULES.md § Mode PATCH ZIP).
    if (metaBox) {
      let filterNoteBox = document.getElementById('investSummaryFilterNote');
      if (!filterNoteBox) {
        filterNoteBox = document.createElement('div');
        filterNoteBox.id = 'investSummaryFilterNote';
        filterNoteBox.className = 'u-fs11 u-t2 u-mt4';
        metaBox.insertAdjacentElement('afterend', filterNoteBox);
      }
      if (InvestmentListUI.filterOwnerIds.length) {
        // Reuse Investment.getHoldings()/_holdingMatchesFilter() (S662) + Investment.
        // holdingValue() (SUDAH ADA, dipakai _renderList() juga) -- 0 rumus baru.
        // Dibungkus try/catch PER HOLDING (pola sama _renderList()): 1 holding korup
        // tidak menjatuhkan baris info ini, cuma dilewati dari total nilai terfilter.
        let allHoldings = [];
        try { allHoldings = Investment.getHoldings() || []; } catch (err) { allHoldings = []; }
        const filtered = allHoldings.filter(InvestmentListUI._holdingMatchesFilter);
        let filteredValue = 0;
        filtered.forEach((h) => {
          try { filteredValue += Investment.holdingValue(h); } catch (err) { /* skip holding korup dari total, konsisten guard _renderList() */ }
        });
        filterNoteBox.textContent = 'Menampilkan: ' + filtered.length + ' dari ' + allHoldings.length + ' holding (' + fmt(filteredValue) + ')';
      } else {
        filterNoteBox.textContent = '';
      }
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
    const allHoldings = Investment.getHoldings();
    if (!allHoldings.length) {
      el.innerHTML = ghostBanner + '<div class="empty"><div class="empty-icon">💹</div><div class="empty-text">Belum ada holding investasi tercatat</div></div>';
      return;
    }
    // filterBar (S662) — dibangun dari allHoldings (SEBELUM difilter) supaya opsi
    // dropdown Pemilik tetap lengkap walau filter Status sedang aktif menyembunyikan
    // sebagian holding. _renderFilterBar() sendiri yang balikin '' kalau 0 holding
    // punya owner non-SELF (0 yg bisa difilter -> filter bar disembunyikan, bukan
    // dirender kosong/nganggur).
    const filterBar = InvestmentListUI._renderFilterBar(allHoldings);
    const holdings = allHoldings.filter(InvestmentListUI._holdingMatchesFilter);
    if (!holdings.length) {
      el.innerHTML = filterBar + ghostBanner + '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada holding yang cocok dengan filter ini</div></div>';
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
    el.innerHTML = filterBar + ghostBanner + holdings.map((h) => {
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

  // _renderFilterBar(allHoldings) — S662 (fondasi), badge jumlah holding per owner
  // S664, diubah jadi CHECKBOX LIST multi-select S669 (dari dropdown <select> single
  // sebelumnya — keputusan user "checkbox list, tap tiap nama, ada centang", native
  // <select multiple> ditolak krn tidak nyaman di HP). Bangun daftar checkbox
  // "Pemilik" + dropdown "Status" di atas daftar holding, dari Investment.getOwners(h)
  // (S491, owner non-SELF sudah kanonik lewat OwnerRegistry) + Investment.
  // getOwnerSettlement() (S660). Opsi owner dikumpulkan dari holding YANG ADA SEKARANG
  // (bukan OwnerRegistry.listAll() penuh, yg juga mencakup owner Aset/Akun yg tidak
  // relevan di sini — 0 opsi mubazir yg pas dipilih hasilnya selalu kosong). 0 owner
  // non-SELF sama sekali (mis. semua holding masih milik sendiri) -> balikin ''
  // (filter bar disembunyikan total, bukan dirender kosong/nganggur -- pola sama
  // _renderAssetLinkAction() yg juga toggle kosong/isi tergantung ada-tidaknya data
  // relevan).
  _renderFilterBar(allHoldings) {
    // ownerMap: id -> {name, count}. count = JUMLAH HOLDING (bukan jumlah baris
    // owner) di mana owner ini muncul sbg salah satu pemilik non-SELF -- dipakai
    // sbg badge "(N holding)" di tiap baris checkbox (S664), supaya user tahu
    // seberapa banyak SEBELUM tap salah satu opsi (ide user: "biar user tahu
    // seberapa banyak sebelum klik"). 1 holding dgn owner yg sama muncul >1x di
    // getOwners() (data lama/duplikat) SENGAJA cuma dihitung SEKALI per holding
    // (pakai Set per-holding di bawah) -- badge ini soal "berapa holding", bukan
    // "berapa baris kepemilikan".
    const ownerMap = new Map();
    (allHoldings || []).forEach((h) => {
      let owners;
      try { owners = Investment.getOwners(h); } catch (err) { owners = []; }
      const seenInThisHolding = new Set();
      owners.forEach((o) => {
        if (!o || o.isSelf || !o.ownerId) return;
        const id = String(o.ownerId);
        if (!ownerMap.has(id)) ownerMap.set(id, { name: o.ownerName || 'Pemilik', count: 0 });
        if (!seenInThisHolding.has(id)) {
          ownerMap.get(id).count += 1;
          seenInThisHolding.add(id);
        }
      });
    });
    if (!ownerMap.size) return '';
    const selectedIds = InvestmentListUI.filterOwnerIds;
    const ownerIdsAll = Array.from(ownerMap.keys());
    // Tombol cepat "Pilih Semua"/"Bersihkan" — S671 (item backlog dari catatan "Belum
    // dikerjakan" SESSION-NOTE-S669.md/S670.md: "kalau owner-nya banyak (>5)"). HANYA
    // dirender kalau owner non-SELF > 5 -- di bawah itu tap manual per-checkbox masih
    // cepat, tombol cuma nambah noise visual (keputusan ambang sama seperti disebut
    // eksplisit di catatan backlog). 0 perubahan pada checkbox list/predicate yang
    // sudah ada dari S669, tombol ini murni bulk-set filterOwnerIds lewat handler baru
    // di bawah (onFilterOwnerSelectAll()/onFilterOwnerClearAll()).
    const quickActionsHtml = ownerIdsAll.length > 5
      ? '<div class="btn-row u-mb4">'
        + '<button type="button" class="btn btn-ghost btn-sm u-flex1" onclick="InvestmentListUI.onFilterOwnerSelectAll()">Pilih Semua</button>'
        + '<button type="button" class="btn btn-ghost btn-sm u-flex1" onclick="InvestmentListUI.onFilterOwnerClearAll()">Bersihkan</button>'
        + '</div>'
      : '';
    const ownerChecks = Array.from(ownerMap.entries()).map(([id, info]) => {
      const checked = selectedIds.indexOf(id) !== -1;
      return '<label class="u-flex u-gap6" style="align-items:center;padding:4px 0">'
        + '<input type="checkbox" onchange="InvestmentListUI.onFilterOwnerToggle(\'' + escapeHtml(id) + '\')"' + (checked ? ' checked' : '') + '>'
        + '<span class="u-fs13">' + escapeHtml(info.name) + ' <span class="u-t2 u-fs11">(' + info.count + ' holding)</span></span>'
        + '</label>';
    }).join('');
    // Dropdown Status HANYA masuk akal kalau minimal 1 owner sudah dicentang
    // (settlement adalah properti PER owner-holding, bukan global) -- disabled +
    // balik ke '' otomatis lewat onFilterOwnerToggle() saat filterOwnerIds jadi
    // kosong lagi.
    const statusDisabled = selectedIds.length ? '' : ' disabled';
    const statusOpts = '<option value="">Semua Status</option>'
      + '<option value="titipan"' + (InvestmentListUI.filterSettlement === 'titipan' ? ' selected' : '') + '>🔒 Dana Titipan</option>'
      + '<option value="milik"' + (InvestmentListUI.filterSettlement === 'milik' ? ' selected' : '') + '>✅ Milik Sendiri</option>';
    return '<div class="card u-mb10" style="padding:8px 10px">'
      + '<div class="u-fs11 u-t2 u-mb4">👥 Filter Pemilik (bisa pilih lebih dari satu)</div>'
      + quickActionsHtml
      + ownerChecks
      + '<select class="fs u-mt6" style="width:100%"' + statusDisabled + ' onchange="InvestmentListUI.onFilterSettlementChange(this.value)">' + statusOpts + '</select>'
      + '</div>';
  },

  // _holdingMatchesFilter(h) — S662 (fondasi single-owner), diubah jadi OR multi-owner
  // S669. Query murni (0 mutasi), dipanggil per-holding dari _renderList().
  // filterOwnerIds kosong -> semua holding lolos (filter nonaktif). Holding lolos
  // kalau punya SALAH SATU owner dari filterOwnerIds (non-SELF) -- semantik OR,
  // keputusan checkbox-list S669 (bukan AND, karena "punya semua owner yang
  // dicentang sekaligus" jarang relevan & tidak diminta user). Kalau
  // filterSettlement juga diisi, status settlement (getOwnerSettlement, S660) baris
  // owner yang cocok itu harus sesuai -- pola query turunan dari
  // Investment.holdingsByOwnerSettlement() (investasi.js), cuma dipecah jadi
  // predicate per-holding supaya bisa dipakai Array.prototype.filter() langsung di
  // _renderList().
  _holdingMatchesFilter(h) {
    if (!InvestmentListUI.filterOwnerIds.length) return true;
    let owners;
    try { owners = Investment.getOwners(h); } catch (err) { return false; }
    const row = owners.find((o) => o && !o.isSelf && InvestmentListUI.filterOwnerIds.indexOf(String(o.ownerId)) !== -1);
    if (!row) return false;
    if (!InvestmentListUI.filterSettlement) return true;
    try {
      return Investment.getOwnerSettlement(h, row.ownerId) === InvestmentListUI.filterSettlement;
    } catch (err) {
      return false;
    }
  },

  // onFilterOwnerToggle(id) — S669 (ganti onFilterOwnerChange S662, checkbox
  // toggle bukan dropdown select). Tambah/hapus id dari filterOwnerIds, murni
  // state UI + render ulang list. Panggil ulang _renderSummary() (sejak S663) --
  // BUKAN supaya kartu ringkasan (totalValue/totalCost/gain) ikut terfilter (itu
  // SENGAJA tetap dari SEMUA holding, 0 diubah), tapi supaya baris info
  // #investSummaryFilterNote di bawah kartu ("Menampilkan: X dari Y holding") ikut
  // update live begitu filter diganti. Array jadi kosong (owner terakhir
  // dilepas-centang) otomatis mengosongkan filterSettlement juga (status tanpa
  // owner terpilih tidak bermakna apa-apa, lihat komentar _renderFilterBar() di
  // atas).
  onFilterOwnerToggle(id) {
    const key = String(id || '');
    if (!key) return;
    const idx = InvestmentListUI.filterOwnerIds.indexOf(key);
    if (idx === -1) InvestmentListUI.filterOwnerIds.push(key);
    else InvestmentListUI.filterOwnerIds.splice(idx, 1);
    if (!InvestmentListUI.filterOwnerIds.length) InvestmentListUI.filterSettlement = '';
    InvestmentListUI._saveFilterPrefs();
    InvestmentListUI._renderSummary();
    InvestmentListUI._renderList();
  },
  onFilterSettlementChange(val) {
    InvestmentListUI.filterSettlement = (val === 'milik' || val === 'titipan') ? val : '';
    InvestmentListUI._saveFilterPrefs();
    InvestmentListUI._renderSummary();
    InvestmentListUI._renderList();
  },

  // onFilterOwnerSelectAll()/onFilterOwnerClearAll() — S671 (item backlog "Tombol
  // cepat Pilih Semua/Bersihkan" dari SESSION-NOTE-S669.md/S670.md, dipicu tombol
  // quick-action di _renderFilterBar() yang HANYA muncul kalau owner non-SELF > 5).
  // Pola sama onFilterOwnerToggle(): murni state UI (filterOwnerIds/filterSettlement),
  // 0 mutasi ke D.investments, lalu re-render summary+list seperti toggle manual.
  // Select All mengumpulkan SEMUA ownerId non-SELF dari Investment.getHoldings()
  // saat ini (bukan cuma yang lagi kecentang) -- owner baru yang belum pernah
  // dicentang tetap ikut ter-include, konsisten sama daftar checkbox yang dirender
  // _renderFilterBar() dari sumber yang sama. Clear All juga mengosongkan
  // filterSettlement (status tanpa owner terpilih tidak bermakna, sama seperti
  // saat owner terakhir dilepas-centang manual di onFilterOwnerToggle()).
  onFilterOwnerSelectAll() {
    if (typeof Investment === 'undefined') return;
    let allHoldings;
    try { allHoldings = Investment.getHoldings(); } catch (err) { allHoldings = []; }
    const ids = new Set();
    (allHoldings || []).forEach((h) => {
      let owners;
      try { owners = Investment.getOwners(h); } catch (err) { owners = []; }
      owners.forEach((o) => { if (o && !o.isSelf && o.ownerId) ids.add(String(o.ownerId)); });
    });
    InvestmentListUI.filterOwnerIds = Array.from(ids);
    InvestmentListUI._saveFilterPrefs();
    InvestmentListUI._renderSummary();
    InvestmentListUI._renderList();
  },
  onFilterOwnerClearAll() {
    InvestmentListUI.filterOwnerIds = [];
    InvestmentListUI.filterSettlement = '';
    InvestmentListUI._saveFilterPrefs();
    InvestmentListUI._renderSummary();
    InvestmentListUI._renderList();
  },

  // _loadFilterPrefsOnce()/_saveFilterPrefs() — S672 (item backlog "Persist pilihan
  // filter owner (filterOwnerIds dkk) ke localStorage, pola sama cardCollapsePrefs" —
  // dari SESSION-NOTE-S670.md/S671.md). Reuse pola try/catch permisif yang sama persis
  // toggleCardCollapse()/applyCardCollapsePrefs() (modal-navigasi.js): localStorage
  // gagal/diblokir/korup TIDAK PERNAH melempar keluar -- filter tetap berfungsi murni
  // di state UI in-memory kalau storage bermasalah, cuma tidak ke-persist lintas
  // reload. Key `investmentListFilterPrefs` SENGAJA terpisah dari `cardCollapsePrefs`
  // (concern beda: filter data vs UI collapse), pola sama banyak key localStorage lain
  // di codebase yang masing-masing punya namespace sendiri.
  //
  // _loadFilterPrefsOnce() HANYA membaca sekali per lifetime halaman (guard
  // `_filterPrefsLoaded`) -- dipanggil dari render() (SSOT tab dibuka), BUKAN dari
  // _renderList()/_renderSummary() yang bisa dipanggil berkali-kali dari banyak titik
  // (termasuk dari dalam handler filter itu sendiri) -- baca ulang tiap render() akan
  // menimpa balik state live user dgn nilai lama di storage tiap kali salah satu
  // handler filter dipanggil (karena semuanya juga memanggil _renderList()).
  // Validasi bentuk data SEBELUM dipakai (Array.isArray utk filterOwnerIds, whitelist
  // 'milik'/'titipan' utk filterSettlement) -- localStorage bisa diedit manual dari
  // luar app (DevTools), jadi data JANGAN dipercaya mentah-mentah, pola sama validasi
  // di onFilterSettlementChange() (val yang bukan 'milik'/'titipan' otomatis '').
  _loadFilterPrefsOnce() {
    if (InvestmentListUI._filterPrefsLoaded) return;
    InvestmentListUI._filterPrefsLoaded = true;
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(InvestmentListUI._filterStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.filterOwnerIds)) {
        InvestmentListUI.filterOwnerIds = parsed.filterOwnerIds.map(String);
      }
      if (parsed && (parsed.filterSettlement === 'milik' || parsed.filterSettlement === 'titipan')) {
        InvestmentListUI.filterSettlement = parsed.filterSettlement;
      } else if (!InvestmentListUI.filterOwnerIds.length) {
        // Konsisten sama guard onFilterOwnerToggle()/onFilterOwnerClearAll(): status
        // tanpa owner terpilih tidak bermakna -- kalau data lama di storage (mis.
        // format sebelum validasi ini ada) kebetulan punya filterOwnerIds kosong tapi
        // filterSettlement terisi, jangan ikut dipakai.
        InvestmentListUI.filterSettlement = '';
      }
    } catch (err) {
      // localStorage korup/tidak tersedia -> abaikan, filter tetap default kosong
      // (0 crash, pola sama try/catch cardCollapsePrefs).
    }
  },
  _saveFilterPrefs() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(InvestmentListUI._filterStorageKey, JSON.stringify({
        filterOwnerIds: InvestmentListUI.filterOwnerIds,
        filterSettlement: InvestmentListUI.filterSettlement,
      }));
    } catch (err) {
      // localStorage penuh/diblokir (mis. mode privat) -> abaikan, filter tetap
      // jalan murni di state UI sesi ini saja (0 crash).
    }
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
