// dana-titipan-portfolio-render-b.js — bagian KEDUA dari
// modules/finance/dana-titipan-portfolio-render.js (audit ukuran file, sesi
// lanjutan setelah split scan-ocr.js). Titik potong bersih: TEPAT SETELAH
// penutup object `DanaTitipanPortfolioPresenter` (`};`), persis di depan
// header komentar `DanaTitipanCommitmentUI`. Murni deklarasi const
// top-level (bukan mixin di object literal), TIDAK butuh Object.assign —
// cukup dimuat SETELAH dana-titipan-portfolio-render.js (urutan dijaga di
// scripts/build.js, entri baru tepat setelah file utama).
//
// Isi: object `DanaTitipanCommitmentUI` (modal CRUD "Pokok Dana Titipan"),
// `DanaTitipanReturnUI` (modal imbal hasil), & `DanaTitipanPoolUI` (modal
// kolam dana). Semua MURNI konsumsi API `DanaTitipanPortfolioAPI.xxx()`
// (fully-qualified, bukan `this.xxx()`), sama seperti bagian PERTAMA.
//
// Pemanggilan balik ke `DanaTitipanPortfolioPresenter` (didefinisikan di
// dana-titipan-portfolio-render.js, bagian PERTAMA) tetap aman: di browser,
// const top-level pada <script> klasik berbagi satu global lexical scope
// lintas file, dan method di sini baru dieksekusi (bukan diparse) setelah
// kedua file selesai dimuat.

// DanaTitipanCommitmentUI — Sesi 485d (Gap #3 audit, langkah 4/5 dari
// rencana multi-sesi — lihat RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md):
// modal CRUD "💰 Pokok Dana Titipan" (`titipanCommitmentModal`,
// modals.js), pola gabungan `investmentOwnersModal` (dropdown owner
// via listExistingOwners(), TIDAK BOLEH ketik nama bebas) +
// `investmentTxModal` (form tambah sederhana). MURNI konsumsi API sesi
// 485a-c (`DanaTitipanPortfolioAPI.listExistingOwners()`/
// `getCommitments()`/`saveCommitment()`) — 0 logika CRUD/projection
// baru ditulis di sini, file ini hanya baca input DOM & panggil API
// yang sudah ada + validasi (SUDAH ADA di saveCommitment()).
const DanaTitipanCommitmentUI = {

  // editingOwnerId — Sesi 522, pola SAMA PERSIS `InvestmentListUI.editId`
  // (investasi-list-view.js): ownerId yang SEDANG dibuka di modal ini
  // dalam mode edit (record commitment sudah ada), `null` kalau mode
  // tambah baru. Dipakai `deleteCommitment()` supaya tombol 🗑 Hapus
  // tahu owner mana yang mau dihapus tanpa perlu data-args statis (form
  // dropdown owner tidak dikunci setelah dibuka, jadi TIDAK aman baca
  // dari `#titipanCommitOwner` langsung saat delete — orang bisa saja
  // sempat ganti pilihan dropdown sebelum tap Hapus).
  editingOwnerId: null,

  // open(ownerId) — Sesi 485d. Isi dropdown owner dari
  // listExistingOwners() (bukan free-text — cegah user bikin identity
  // baru yang tidak nyambung ke holding manapun, sama alasan
  // listExistingOwners() sendiri, S485a). Kalau `ownerId` diberikan &
  // sudah punya record commitment tersimpan (getCommitments()), field
  // Pokok/Tanggal/Catatan diisi otomatis dari situ (mode edit) — kalau
  // tidak, form kosong (mode tambah baru, owner dipilih manual dari
  // dropdown).
  open(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pokok dana titipan belum siap dimuat'); return; }
    const owners = DanaTitipanPortfolioAPI.listExistingOwners();
    const sel = document.getElementById('titipanCommitOwner');
    if (sel) {
      if (!owners.length) {
        sel.innerHTML = '<option value="">— Belum ada owner di holding investasi —</option>';
      } else {
        sel.innerHTML = owners.map((o) => `<option value="${escapeHtml(o.ownerId)}">${escapeHtml(o.ownerName)}</option>`).join('');
      }
      if (ownerId) sel.value = ownerId;
    }
    const existing = ownerId
      ? DanaTitipanPortfolioAPI.getCommitments().find((c) => c && c.ownerId === ownerId)
      : null;
    const principalEl = document.getElementById('titipanCommitPrincipal');
    if (principalEl) principalEl.value = existing ? existing.principalAmount : '';
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanCommitPrincipal', 'titipanCommitPrincipalPreview');
    const dateEl = document.getElementById('titipanCommitDate');
    if (dateEl) dateEl.value = existing ? (existing.committedDate || '') : '';
    const notesEl = document.getElementById('titipanCommitNotes');
    if (notesEl) notesEl.value = existing ? (existing.notes || '') : '';
    // Sesi 522: tandai mode edit + tampilkan tombol 🗑 Hapus HANYA kalau
    // record commitment sudah ada utk owner ini (mode tambah baru -> 0
    // apa pun utk dihapus, tombol tetap disembunyikan, pola sama
    // `investmentModal`/`investmentDeleteBtn`).
    DanaTitipanCommitmentUI.editingOwnerId = existing ? ownerId : null;
    const delBtn = document.getElementById('titipanCommitDelBtn');
    if (delBtn && delBtn.style) delBtn.style.display = existing ? '' : 'none';
    // Sesi 5 ("Isi dari Sisa", MASTER_HANDOFF §11/§13.2/§19): tombol HANYA
    // muncul saat status pool `OK` DAN sisa>0 (§19 acceptance criteria).
    // Angka `sisa` dibaca LIVE di sini (saat modal dibuka) — TAPI §11
    // rule 2 tetap mewajibkan baca ULANG lagi persis di titik klik
    // (`fillFromRemaining()` di bawah, BUKAN pakai closure/angka dari
    // sini), krn render bisa stale kalau ada perubahan pool/commitment
    // di tab lain sebelum user benar-benar klik (skenario K, §18).
    DanaTitipanCommitmentUI._refreshFillRemainingBtn();
    if (typeof openModal === 'function') openModal('titipanCommitmentModal');
  },

  // _refreshFillRemainingBtn() — helper internal Sesi 5, dipanggil dari
  // `open()` (saat modal dibuka) supaya tombol+label langsung sesuai
  // status pool terkini. Guard `typeof DanaTitipanPoolAPI==='undefined'`
  // (build.js Sesi 6 belum jalan, lihat catatan di
  // `DanaTitipanPoolUI.save()`) -> tombol disembunyikan diam-diam (bukan
  // toast error, krn ini bukan aksi user, cuma render pasif saat buka
  // modal).
  _refreshFillRemainingBtn() {
    const btn = document.getElementById('titipanCommitFillRemainingBtn');
    if (!btn || !btn.style) return;
    if (typeof DanaTitipanPoolAPI === 'undefined') { btn.style.display = 'none'; return; }
    const status = DanaTitipanPoolAPI.status();
    const sisa = DanaTitipanPoolAPI.sisaAlokasi();
    if (status === 'OK' && typeof sisa === 'number' && sisa > 0) {
      const label = document.getElementById('titipanCommitFillRemainingLabel');
      if (label) label.textContent = 'Isi dari Sisa ' + DanaTitipanPortfolioPresenter._money(sisa);
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  },

  // fillFromRemaining() — Sesi 5 (§11, skenario J/K). WAJIB baca ulang
  // `DanaTitipanPoolAPI.status()`/`.sisaAlokasi()` LIVE di titik klik ini
  // (bukan pakai label yang sudah dirender `open()`/nilai closure lain)
  // — kalau antara modal dibuka & tombol diklik ada perubahan pool/
  // commitment di tempat lain (skenario K), angka yang dipakai HARUS
  // yang terbaru. Field `principalAmount` tetap EDITABLE setelah diisi
  // (§11 rule 4) -- ini cuma isi nilai awal, bukan lock field. Validasi
  // final tetap di titik save() (§11 rule 5), 0 validasi baru ditulis di
  // sini.
  fillFromRemaining() {
    if (typeof DanaTitipanPoolAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur Dana Titipan Pool belum siap dimuat'); return; }
    const status = DanaTitipanPoolAPI.status();
    const sisa = DanaTitipanPoolAPI.sisaAlokasi();
    if (status !== 'OK' || typeof sisa !== 'number' || sisa <= 0) {
      // Skenario K: data sempat berubah antara modal dibuka & klik
      // (mis. owner lain baru saja disimpan di tab lain, sisa jadi 0).
      // Refresh tombol supaya konsisten (auto-sembunyi) + kasih toast
      // jelas, BUKAN mengisi field dgn angka basi.
      DanaTitipanCommitmentUI._refreshFillRemainingBtn();
      if (typeof toast === 'function') toast('⚠️ Sisa dana titipan sudah berubah (mis. baru saja dialokasikan di tempat lain) — silakan isi manual.');
      return;
    }
    const principalEl = document.getElementById('titipanCommitPrincipal');
    if (principalEl) principalEl.value = sisa;
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanCommitPrincipal', 'titipanCommitPrincipalPreview');
  },

  // addNewOwner() — Sesi 523-B (BUG-01). Modal ini sebelumnya HANYA bisa
  // pilih owner existing dari listExistingOwners() (dropdown read-only,
  // Design Lock S485d) -- tidak ada jalan membuat owner baru langsung
  // dari sini, harus muter dulu lewat "⚖️ Atur Porsi Kepemilikan" di
  // Investasi/Aset. Fix ini TIDAK melanggar Design Lock: tetap 0 free-text
  // langsung ke saveCommitment() (ownerId masih wajib dari
  // listExistingOwners()) -- yang baru cuma jalur MEMBUAT owner itu lebih
  // dulu via OwnerRegistry.findOrCreate() (S489, API resmi, sama seperti
  // dipakai assetOwnersModal/investmentOwnersModal), lalu open() dipanggil
  // ulang supaya dropdown ter-refresh dan owner baru otomatis dipilih
  // (listExistingOwners() sudah include OwnerRegistry.listAll() sejak
  // S492, jadi owner baru ini langsung muncul di union).
  async addNewOwner() {
    if (typeof OwnerRegistry === 'undefined' || typeof OwnerRegistry.findOrCreate !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur tambah pemilik belum siap dimuat');
      return;
    }
    const name = typeof showPromptModal === 'function'
      ? await showPromptModal({ title: 'Tambah Pemilik Baru', message: 'Nama pemilik dana titipan', placeholder: 'Budi, Ibu, dll' })
      : (typeof prompt === 'function' ? prompt('Nama pemilik dana titipan') : null);
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const ownerId = OwnerRegistry.findOrCreate(trimmed);
    DanaTitipanCommitmentUI.open(ownerId);
    if (typeof toast === 'function') toast('✅ Pemilik "' + trimmed + '" ditambahkan');
  },

  // save() — Sesi 485d. Baca form, panggil
  // `DanaTitipanPortfolioAPI.saveCommitment()` (S485b, validasi
  // existing-owner-only + principal>=0 SUDAH ADA di sana — 0 validasi
  // baru ditulis di sini). `saveCommitment()` melempar Error kalau
  // validasi gagal, dibungkus try/catch pola sama
  // `InvestmentUI.saveOwners()`.
  save() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pokok dana titipan belum siap dimuat'); return; }
    const sel = document.getElementById('titipanCommitOwner');
    const ownerId = sel ? sel.value : '';
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner wajib dipilih'); return; }
    const ownerName = sel && sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
    const principalEl = document.getElementById('titipanCommitPrincipal');
    const principalAmount = principalEl ? principalEl.value : '';
    const committedDate = (document.getElementById('titipanCommitDate') || {}).value || '';
    const notes = (document.getElementById('titipanCommitNotes') || {}).value || '';
    try {
      DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName, principalAmount, committedDate, notes });
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan pokok dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanCommitmentModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // Sesi 550 (FIX-S550-DANA-TITIPAN-TABLIST-SYNC-COMMITMENT-UI): sinkron
    // container #danaTitipanTabList (sub-tab Laporan > Dana Titipan, Sesi
    // 498) setelah save() commitment — pola PERSIS sama seperti panggilan
    // di renderLaporan() (modules-render.js), 0 logic baru, hanya
    // memastikan container BARU ini ikut ter-refresh saat commitment
    // diubah lewat modal (sebelumnya cuma render() ke container LAMA
    // #danaTitipanPortfolioList yang ke-refresh, #danaTitipanTabList baru
    // ikut update di render berikutnya lewat renderLaporan()).
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('✅ Pokok dana titipan tersimpan');
  },

  // deleteCommitment() — Sesi 522 (FIX-S521-DANA-TITIPAN-UI-MULTIOWNER,
  // gap #2). Hapus record commitment owner yang SEDANG dibuka
  // (`editingOwnerId`, di-set di `open()` — TIDAK baca ulang dropdown,
  // lihat komentar `editingOwnerId` di atas), `askConfirm()` dulu (pola
  // sama `DanaTitipanReturnUI.deleteEntry()`), 100% reuse
  // `DanaTitipanPortfolioAPI.deleteCommitment()` (0 logic baru).
  async deleteCommitment() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    const ownerId = DanaTitipanCommitmentUI.editingOwnerId;
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Belum ada pokok dana titipan tersimpan utk owner ini'); return; }
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm('Hapus pokok dana titipan owner ini?', { okText: 'Ya, Hapus' });
      if (!ok) return;
    }
    DanaTitipanPortfolioAPI.deleteCommitment(ownerId);
    DanaTitipanCommitmentUI.editingOwnerId = null;
    if (typeof closeModal === 'function') closeModal('titipanCommitmentModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // Sesi 550 (FIX-S550-DANA-TITIPAN-TABLIST-SYNC-COMMITMENT-UI): sama
    // seperti save() di atas — sinkron #danaTitipanTabList setelah hapus
    // commitment, pola PERSIS sama dgn renderLaporan() (0 logic baru).
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('🗑️ Pokok dana titipan dihapus');
  },

  // removeOwnerLinkage(ownerId) — Sesi 523-C (BUG-02/BUG-06). Dipanggil
  // LANGSUNG dari kartu owner di dashboard (tombol "🔓 Lepas Keterikatan
  // Dana Titipan") — TIDAK perlu buka modal `titipanCommitmentModal`
  // dulu (beda dari `deleteCommitment()` di atas yang baca
  // `editingOwnerId`, HANYA valid kalau modal itu sedang terbuka).
  // `ownerId` diberikan LANGSUNG dari `data-args` kartu (pola sama
  // `DanaTitipanReturnUI.open(ownerId)`), 0 baca state modal tersembunyi.
  // 100% reuse `DanaTitipanPortfolioAPI.removeOwnerLinkage()` (0 logic
  // baru) + `askConfirm()` dulu (pola sama `deleteCommitment()`/
  // `DanaTitipanReturnUI.deleteEntry()`). Pesan konfirmasi eksplisit
  // menyebutkan bedanya dari delete commitment biasa (porsi Investasi/
  // Aset & identitas owner TIDAK ikut hilang) supaya user tidak salah
  // duga ini "hapus owner".
  async removeOwnerLinkage(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner tidak dikenali'); return; }
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm(
        'Lepas keterikatan owner ini dari Dana Titipan?\nPokok dana titipan yang tercatat akan dihapus. Porsi kepemilikan di Investasi/Aset TIDAK ikut berubah, dan identitas pemilik ini tetap ada (bisa dipakai lagi kapan saja).',
        { okText: 'Ya, Lepas' },
      );
      if (!ok) return;
    }
    const removed = DanaTitipanPortfolioAPI.removeOwnerLinkage(ownerId);
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // FIX (audit tombol "Lepas Keterikatan"): sama seperti save()/
    // deleteCommitment() di atas (Sesi 550, FIX-S550-DANA-TITIPAN-TABLIST-
    // SYNC-COMMITMENT-UI) — tombol ini dirender dgn markup yg SAMA di 2
    // container (#danaTitipanPortfolioList lama & #danaTitipanTabList
    // baru/sub-tab Laporan > Dana Titipan). render() di atas cuma
    // refresh container lama; kalau user klik tombol ini dari
    // #danaTitipanTabList, tampilan yg sedang dilihat jadi stale sampai
    // pindah tab. Sync eksplisit, pola PERSIS sama dgn save()/
    // deleteCommitment(), 0 logic baru.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') {
      toast(removed ? '🔓 Keterikatan Dana Titipan dilepas' : 'ℹ️ Owner ini belum punya pokok dana titipan tercatat');
    }
  },

  // openAssetPorsi(i) — SESI 515 (Owner -> Nominal -> Asset -> Kuota ->
  // Porsi). Wrapper navigasi TIPIS dari kartu Dana Titipan ke
  // `assetOwnersModal` (aset.js, S392a+, live Kuota S505) utk aset yang
  // dipilih dari dropdown picker `renderInto()`
  // (`DanaTitipanPortfolioPresenter._assetOptionsHtml()`). `i` = index urutan
  // kartu owner SAAT render() ini — dipakai HANYA utk cari elemen DOM
  // picker-nya sendiri (`#titipanAssetPick_{i}`), BUKAN identity
  // owner/aset. 0 logika CRUD/porsi baru di sini — 100% delegasi ke
  // `Aset.openOwnersModalById()` (baru, aset.js Sesi 515) yang sendiri
  // 100% reuse `Aset.openOwnersModal()` existing (S392a).
  // SESI 544 — sama root cause & fix dgn `onAssetPickChange()` di atas
  // (duplikat ID `titipanAssetPick_N` di 2 container render bersamaan).
  // Dual-mode: elemen tombol (`$el`, dipakai markup baru) ATAU angka
  // index (fallback lama, 0 breaking change utk caller/test existing).
  openAssetPorsi(target) {
    let sel = null;
    if (target && typeof target === 'object' && typeof target.closest === 'function') {
      const card = target.closest('details');
      sel = card && typeof card.querySelector === 'function' ? card.querySelector('select[id^="titipanAssetPick_"]') : null;
    } else {
      sel = document.getElementById('titipanAssetPick_' + target);
    }
    const assetId = sel ? sel.value : '';
    if (!assetId) { if (typeof toast === 'function') toast('⚠️ Pilih aset dulu'); return; }
    this._routeAssetPorsi(assetId);
  },

  // openAssetPorsiDirect(assetId) — SESI 631. Jalur BARU: dipanggil
  // langsung dari klik nama instrumen di baris holding (_holdingRowHtml())
  // — TANPA lewat dropdown "Pilih Aset" dulu, karena assetId-nya SUDAH
  // pasti (baris ini sendiri representasi aset/holding itu). 100%
  // delegasi ke `_routeAssetPorsi()` yang sama dipakai `openAssetPorsi()`
  // (dropdown lama) — 0 logic routing baru, cuma 1 pintu masuk tambahan.
  openAssetPorsiDirect(assetId) {
    if (!assetId) { if (typeof toast === 'function') toast('⚠️ Aset tidak ditemukan'); return; }
    this._routeAssetPorsi(assetId);
  },

  // _routeAssetPorsi(assetId) — SESI 631: routing asli `openAssetPorsi()`
  // (s608, opsi Holding prefix `h:` -> InvestmentUI.openOwnersModal(),
  // opsi Buku Aset -> Aset.openOwnersModalById()) DIEKSTRAK apa adanya
  // supaya dipakai bareng oleh `openAssetPorsi()` (dropdown) DAN
  // `openAssetPorsiDirect()` (klik nama baris holding) — 0 perubahan
  // perilaku routing, murni dedup.
  _routeAssetPorsi(assetId) {
    // FIX (S648, bug report toast "TypeError: assetId.indexOf is not a
    // function"): openAssetPorsiDirect() (S631, klik nama instrumen di
    // baris holding) mengoper `hh.linkedAssetId` MENTAH -- nilai itu
    // berasal dari `D.assets[].id` yang di app ini berupa angka
    // (uid()-based), bukan string. Jalur dropdown lama (openAssetPorsi(),
    // baca `<select>.value`) selalu string krn itu memang perilaku native
    // DOM, jadi bug ini cuma kena jalur klik-nama-langsung. Koersi
    // String() SEKALI di titik masuk bersama ini (0 perubahan ke 2
    // caller-nya) supaya kedua jalur konsisten aman utk assetId
    // angka/string apa pun.
    const id = String(assetId);
    if (id.indexOf('h:') === 0) {
      const holdingId = id.slice(2);
      if (typeof InvestmentUI === 'undefined' || typeof InvestmentUI.openOwnersModal !== 'function') {
        if (typeof toast === 'function') toast('⚠️ Fitur Holding Investasi belum siap dimuat');
        return;
      }
      InvestmentUI.openOwnersModal(holdingId);
      return;
    }
    if (typeof Aset === 'undefined' || typeof Aset.openOwnersModalById !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur Buku Aset belum siap dimuat');
      return;
    }
    Aset.openOwnersModalById(id);
  },

};

// DanaTitipanReturnUI — Sesi 486 (Case F: Partial Return / Pengembalian
// Dana Titipan, lihat RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md,
// lanjutan Gap #3 yang SUDAH SELESAI S485a-e). Modal "↩️ Catat
// Pengembalian" (`titipanReturnModal`, modals.js) — beda dari
// `titipanCommitmentModal`: field Owner di sini READONLY DISPLAY (bukan
// dropdown), karena pengembalian SELALU terikat ke owner yang sedang
// dibuka dari kartunya sendiri (bukan record baru bebas pilih owner).
// MURNI konsumsi API Sesi 486 (`DanaTitipanPortfolioAPI.recordReturn()`/
// `getReturns()`/`deleteReturn()`) — 0 logika CRUD baru ditulis di sini,
// pola SAMA PERSIS `DanaTitipanCommitmentUI` (S485d).
const DanaTitipanReturnUI = {

  // open(ownerId) — isi tampilan owner (readonly) dari
  // listExistingOwners() + kosongkan form (SELALU mode tambah baru —
  // riwayat pengembalian TIDAK PERNAH diedit, hanya ditambah/dihapus,
  // pola sama InvestmentTxUI "hapus lalu catat ulang").
  open(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pengembalian dana titipan belum siap dimuat'); return; }
    const known = DanaTitipanPortfolioAPI.listExistingOwners().find((o) => o.ownerId === ownerId);
    const ownerDisplayEl = document.getElementById('titipanReturnOwnerDisplay');
    if (ownerDisplayEl) ownerDisplayEl.textContent = known ? known.ownerName : '';
    const ownerIdEl = document.getElementById('titipanReturnOwnerId');
    if (ownerIdEl) ownerIdEl.value = ownerId || '';
    const amountEl = document.getElementById('titipanReturnAmount');
    if (amountEl) amountEl.value = '';
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanReturnAmount', 'titipanReturnAmountPreview');
    const dateEl = document.getElementById('titipanReturnDate');
    if (dateEl) dateEl.value = '';
    const notesEl = document.getElementById('titipanReturnNotes');
    if (notesEl) notesEl.value = '';
    if (typeof openModal === 'function') openModal('titipanReturnModal');
  },

  // save() — baca form, panggil `DanaTitipanPortfolioAPI.recordReturn()`
  // (validasi existing-owner-only + amount>=0 SUDAH ADA di sana — 0
  // validasi baru di sini). `recordReturn()` melempar Error kalau
  // validasi gagal, dibungkus try/catch pola sama
  // `DanaTitipanCommitmentUI.save()`.
  save() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pengembalian dana titipan belum siap dimuat'); return; }
    const ownerIdEl = document.getElementById('titipanReturnOwnerId');
    const ownerId = ownerIdEl ? ownerIdEl.value : '';
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner wajib dipilih'); return; }
    const ownerDisplayEl = document.getElementById('titipanReturnOwnerDisplay');
    const ownerName = ownerDisplayEl ? ownerDisplayEl.textContent : '';
    const amountEl = document.getElementById('titipanReturnAmount');
    const amount = amountEl ? amountEl.value : '';
    const returnDate = (document.getElementById('titipanReturnDate') || {}).value || '';
    const notes = (document.getElementById('titipanReturnNotes') || {}).value || '';
    try {
      DanaTitipanPortfolioAPI.recordReturn({ ownerId, ownerName, amount, returnDate, notes });
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal mencatat pengembalian dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanReturnModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // FIX (audit lanjutan tombol "Lepas Keterikatan" — bug sekelas di
    // fungsi mutasi lain file ini): sama seperti save()/deleteCommitment()/
    // removeOwnerLinkage() di atas (Sesi 550 + fix ini) — sync eksplisit
    // ke #danaTitipanTabList (sub-tab Laporan > Dana Titipan), pola
    // PERSIS sama, 0 logic baru.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('✅ Pengembalian dana titipan tercatat');
  },

  // deleteEntry(id) — hapus 1 baris riwayat pengembalian, `askConfirm()`
  // dulu (pola sama `InvestmentTxUI.deleteTx()`), 100% reuse
  // `DanaTitipanPortfolioAPI.deleteReturn()` (0 logic baru).
  async deleteEntry(id) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm('Hapus riwayat pengembalian ini?', { okText: 'Ya, Hapus' });
      if (!ok) return;
    }
    DanaTitipanPortfolioAPI.deleteReturn(id);
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // FIX (audit lanjutan, bug sekelas — lihat catatan di save() di atas):
    // sync eksplisit ke #danaTitipanTabList, pola PERSIS sama.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('🗑️ Riwayat pengembalian dihapus');
  },

};

// DanaTitipanPoolUI — SESI 4 (UI POOL, MASTER_HANDOFF_DANA_TITIPAN_POOL_
// PORSI.md §13.4), BAGIAN 2/2. Bagian 1 (session-04a) membuat STUB kedua
// method di bawah (toast "belum tersedia") supaya lint statis
// `tests/data-action-resolvable-s285.test.js` lolos & tombol tidak dead-
// click. Bagian 2 ini ISI ULANG badan kedua method dengan modal
// `titipanPoolModal` sungguhan (§13.4: field nominal/tanggal/catatan,
// pola persis sama `titipanCommitmentModal` — amt-wrap+fi-calc-only utk
// nominal, `evalAmtExpr`/`updateAmtPreview`, `openModal`/`closeModal`),
// submit -> `DanaTitipanPoolAPI.addOpeningBalance()`/`.addDeposit()`
// (Sesi 1/2, sudah ada & tested, TIDAK diubah di sini).
//
// `_mode` menyimpan mode terakhir (`'opening_balance'`|`'deposit'`) yang
// dipilih lewat `openSetSaldoAwal()`/`openTambahDeposit()` — dibaca ulang
// oleh `save()` supaya 1 modal fisik (`titipanPoolModal`) bisa dipakai utk
// 2 aksi berbeda tanpa 2 modal terpisah (pola sama `Bill.setBillType`/
// `WorthIt.switchTab`, bukan pola baru).
//
// [AUDIT PENTING utk Sesi 6/Integration]: `dana-titipan-pool-api.js`
// (Sesi 1/2) BELUM terdaftar di `scripts/build.js` GROUP_A/GROUP_B — ini
// SESUAI rencana MASTER_HANDOFF §15/§20 (registrasi build.js adalah scope
// Sesi 6, BUKAN Bagian 2 ini). Konsekuensinya: sampai Sesi 6 selesai,
// `DanaTitipanPoolAPI` TIDAK ada di bundle produksi (`app-bundle-*.min.js`)
// walau modal & wiring di bawah ini sudah lengkap & lolos build lint —
// `save()` di bawah SUDAH menggate `typeof DanaTitipanPoolAPI === 'undefined'`
// (pola sama `DanaTitipanCommitmentUI.save()`) supaya kalau modal ini
// sempat ke-deploy sendirian sebelum Sesi 6, user dapat toast jelas
// ("fitur belum siap dimuat"), BUKAN error JS mentah/crash. Sesi 6 WAJIB
// menambah `'modules/finance/dana-titipan-pool-api.js'` ke build.js
// (sebelum `dana-titipan-commitment-return-api.js`, urutan §15) SEBELUM
// fitur ini benar-benar bisa dipakai user nyata.
const DanaTitipanPoolUI = {

  _mode: 'opening_balance',

  // _resetForm() — helper internal, kosongkan field & set tanggal default
  // hari ini (pola sama `Piutang.openModal()`/`DanaTitipanCommitmentUI.
  // open()` utk mode "tambah baru" — modal ini TIDAK punya mode edit,
  // tiap submit = 1 entry pool baru, MASTER_HANDOFF §14 `_addEntry()`
  // sengaja tidak upsert).
  _resetForm() {
    const amtEl = document.getElementById('titipanPoolAmt');
    if (amtEl) amtEl.value = '';
    const previewEl = document.getElementById('titipanPoolAmtPreview');
    if (previewEl) previewEl.textContent = '';
    const dateEl = document.getElementById('titipanPoolDate');
    if (dateEl) dateEl.value = (typeof todayStr === 'function') ? todayStr() : '';
    const notesEl = document.getElementById('titipanPoolNotes');
    if (notesEl) notesEl.value = '';
  },

  // openSetSaldoAwal() — Bagian 2. Buka `titipanPoolModal` mode
  // "opening balance", submit -> `DanaTitipanPoolAPI.addOpeningBalance()`.
  // Sesuai MASTER_HANDOFF §19 (acceptance criteria), tombol ini HANYA
  // dirender saat status `NOT_MIGRATED` (lihat `_poolSummaryHtml()`,
  // Bagian 1, tidak diubah di sini) -- method ini sendiri TIDAK perlu
  // cek ulang status, cukup buka modal dgn label yang sesuai.
  openSetSaldoAwal() {
    DanaTitipanPoolUI._mode = 'opening_balance';
    const titleEl = document.getElementById('titipanPoolModalTitle');
    if (titleEl) titleEl.textContent = '💰 Set Saldo Awal Dana Titipan';
    const hintEl = document.getElementById('titipanPoolModalHint');
    if (hintEl) hintEl.textContent = 'Catat saldo awal dana titipan yang sudah ada saat ini (baseline pool pertama kali) — dipakai buat validasi supaya total pokok yang dialokasikan ke tiap pemilik tidak melebihi dana yang benar-benar ada. Bukan transaksi keuangan, tidak menyentuh Kas/Akun/Investasi.';
    DanaTitipanPoolUI._resetForm();
    if (typeof openModal === 'function') openModal('titipanPoolModal');
  },

  // openTambahDeposit() — Bagian 2. Buka `titipanPoolModal` mode
  // "deposit", submit -> `DanaTitipanPoolAPI.addDeposit()`. Dirender saat
  // status `OK`/`OVER_ALLOCATED` (pool sudah pernah diisi, §19).
  openTambahDeposit() {
    DanaTitipanPoolUI._mode = 'deposit';
    const titleEl = document.getElementById('titipanPoolModalTitle');
    if (titleEl) titleEl.textContent = '➕ Tambah Deposit Dana Titipan';
    const hintEl = document.getElementById('titipanPoolModalHint');
    if (hintEl) hintEl.textContent = 'Catat tambahan dana titipan yang baru masuk (menambah pool yang sudah ada) — dipakai buat validasi supaya total pokok yang dialokasikan ke tiap pemilik tidak melebihi dana yang benar-benar ada. Bukan transaksi keuangan, tidak menyentuh Kas/Akun/Investasi.';
    DanaTitipanPoolUI._resetForm();
    if (typeof openModal === 'function') openModal('titipanPoolModal');
  },

  // save() — baca form, panggil `DanaTitipanPoolAPI.addOpeningBalance()`/
  // `.addDeposit()` sesuai `_mode` (Sesi 1/2, sudah tested, 0 logic baru
  // ditulis di sini). API melempar Error kalau validasi gagal (amount
  // bukan angka >=0, MASTER_HANDOFF §14 `_validateAmount()`), dibungkus
  // try/catch pola sama `DanaTitipanCommitmentUI.save()`/`InvestmentUI.
  // saveOwners()`. Setelah sukses: tutup modal, re-render dashboard
  // Dana Titipan (pola re-render sama persis `DanaTitipanCommitmentUI.
  // save()` di atas -- `DanaTitipanPortfolioPresenter.render()` +
  // `renderInto('danaTitipanTabList')`, supaya kartu ringkasan pool baru
  // ikut ter-refresh di KEDUA container, bukan cuma satu).
  save() {
    if (typeof DanaTitipanPoolAPI === 'undefined') {
      if (typeof toast === 'function') toast('⚠️ Fitur Dana Titipan Pool belum siap dimuat (menunggu registrasi build.js Sesi 6)');
      return;
    }
    const amtEl = document.getElementById('titipanPoolAmt');
    const amount = amtEl ? amtEl.value : '';
    const date = (document.getElementById('titipanPoolDate') || {}).value || '';
    const notes = (document.getElementById('titipanPoolNotes') || {}).value || '';
    try {
      if (DanaTitipanPoolUI._mode === 'deposit') {
        DanaTitipanPoolAPI.addDeposit({ amount, date, notes });
      } else {
        DanaTitipanPoolAPI.addOpeningBalance({ amount, date, notes });
      }
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanPoolModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast(DanaTitipanPoolUI._mode === 'deposit' ? '✅ Deposit dana titipan tersimpan' : '✅ Saldo awal dana titipan tersimpan');
  },

};

if (typeof window !== 'undefined') {
  window.DanaTitipanCommitmentUI = DanaTitipanCommitmentUI;
  window.DanaTitipanReturnUI = DanaTitipanReturnUI;
  window.DanaTitipanPoolUI = DanaTitipanPoolUI;
}
