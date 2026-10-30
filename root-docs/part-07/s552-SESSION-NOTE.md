# S552 — Banner "✅ Samakan Porsi dari Aset Ini & Tautkan"

Rekomendasi #2 dari `AUDIT-S540-B1B12-DOUBLECOUNT`, sengaja dipisah dari
S551 (lihat `RENCANA-SESI-S552-BANNER-SAMAKAN-PORSI.md`).

## Latar belakang
Patch B1-B12 menambahkan field satu-arah `a.investmentId` di Buku Aset
(`modules/asset/aset.js`) untuk menautkan 1 record Aset ke 1 holding
Investasi (mencegah dobel-catat instrumen yang sama di 2 tempat). Link ini
harus dibuat manual lewat dropdown "🔗 Hubungkan ke Holding Investasi" di
`assetModal`. Sesi B4 sudah menambah alat bantu SARAN (bukan auto-link) di
🩺 Data Health Check: `Aset._findInvestmentMigrationCandidates()` — cari
pasangan Aset (belum tertaut) & holding (belum ditautkan aset manapun)
yang namanya mirip.

Sesi ini menaruh saran yang sama itu di tempat yang lebih kontekstual:
langsung di `investmentOwnersModal` (modal "⚖️ Atur Porsi Kepemilikan"
punya holding Investasi), supaya user yang sedang mengatur porsi holding
langsung ditawari untuk menautkan & menyamakan porsinya kalau memang ada
pasangan di Buku Aset.

## Apa yang dikerjakan
- `modules/shared/modals.js` — tambah 1 div kosong
  `#investmentOwnersLinkBanner` di `investmentOwnersModal`, tepat di bawah
  nama holding, di atas hint porsi. Diisi/dikosongkan lewat
  `InvestmentUI._renderLinkBanner()`.
- `modules/asset/investasi-view.js` (`InvestmentUI`):
  - `_linkBannerDismissed` — object in-memory (bukan disimpan ke `D`,
    keputusan produk sengaja SEMENTARA per sesi app) nyimpen holding id
    yang bannernya sudah di-dismiss user.
  - `_findLinkCandidate(holding)` — PURE. 100% REUSE
    `Aset._findInvestmentMigrationCandidates()` (SUDAH ADA dari B1-B12/B4,
    0 rumus fuzzy-match baru) difilter ke holding yang sedang dibuka.
    Guard `typeof Aset` (module aset.js belum tentu selalu dimuat bareng
    investasi-view.js) & guard dismiss state.
  - `_renderLinkBanner()` — render/kosongkan `#investmentOwnersLinkBanner`
    berdasarkan `_findLinkCandidate()`. Dipanggil dari `openOwnersModal()`
    (kedua cabang: holding valid & tidak ditemukan) dan diulang dari
    `applySamakanPorsiFromAsset()`/`dismissLinkBanner()` supaya banner
    langsung update tanpa perlu tutup-buka modal lagi.
  - `dismissLinkBanner()` — tandai dismiss utk holding aktif, render ulang
    banner (jadi kosong). 0 penulisan ke `D`.
  - `applySamakanPorsiFromAsset(assetId)` — aksi tombol banner:
    1. **Tautkan**: set `a.investmentId = holding.id` langsung di record
       `D.assets` yang cocok (pola persis blok save di `Aset._saveInner()`
       hasil patch B1-B12: field ada di SISI ASET, bukan holding) +
       `save()`.
    2. **Salin porsi ke DRAFT SAJA**: baca porsi Aset lewat
       `MultiOwnerEngine.getOwners(a)` (SUDAH ADA, 100% reuse — toleran
       baca `a.owners`/legacy titipan/`ownership`) lalu isi
       `InvestmentUI._ownersDraft` dengan hasilnya. **TIDAK** memanggil
       `Investment.setOwners()` — commit final ke holding tetap lewat
       tombol "✅ Simpan Porsi" existing, sesuai instruksi eksplisit user
       (cegah auto-overwrite diam-diam).
    3. Render ulang list (`_renderOwnersList()`, otomatis ikut me-refresh
       Nominal (Rp) dari S551) & banner (hilang karena aset ini sekarang
       sudah `investmentId`-nya terisi).
- `tests/s552-banner-samakan-porsi.test.js` — baru, 11 test: kandidat
  ketemu/tidak ketemu/holding lain, guard Aset belum dimuat, wiring
  `openOwnersModal()`, dismiss, link+save, salin ke draft TANPA commit ke
  holding, banner hilang setelah link, dan guard aset tidak ditemukan.

## Keputusan produk yang diambil sesi ini (dicatat, bukan diasumsikan sepihak)
- **Dismiss banner bersifat sementara** (in-memory per holding id, reset
  tiap reload app) — bukan disimpan permanen ke `D`. Alasan: kalau user
  salah tap "bukan ini" padahal kandidatnya sebenarnya cocok, saran itu
  tidak hilang selamanya; cukup muncul lagi di sesi berikutnya.
- **Arah link**: `investmentId` di record Aset (bukan field baru di sisi
  holding) — konsisten 100% dengan arsitektur B1-B12 yang sudah ada,
  tidak menambah skema baru.

## Yang SENGAJA TIDAK diubah
- Algoritma pencocokan nama (`_normalizeInstrumentName`/exact+substring,
  guard panjang min 4 karakter) — 0 rumus baru, 100% reuse fungsi B1-B12.
- `Investment.setOwners()`/`MultiOwnerEngine` — tidak disentuh, commit
  final tetap manual lewat tombol existing.
- Tidak ada perubahan pada alur assetModal / dropdown link B1 — sesi ini
  hanya menambah 1 jalur pintas alternatif (dari sisi holding, bukan dari
  sisi Aset) yang berujung ke mutasi field yang sama (`a.investmentId`).

## Belum dikerjakan sesi ini
- `app-bundle-a.min.js`/`app-bundle-b.min.js`/`app_production.html`/
  `index.html` **belum di-rebuild** dari source hasil sesi ini (sandbox
  sesi ini tidak menjalankan `scripts/build.js`) — jalankan
  `node scripts/build.js` di lingkungan yang punya akses penuh sebelum
  rilis, supaya bundle & versi (`?v=`, `CACHE_NAME`) tersinkron dengan
  perubahan `investasi-view.js`/`modals.js` di atas.

## Status
- 11/11 test baru PASS (`node --test tests/s552-banner-samakan-porsi.test.js`).
- 7/7 test S551 tetap PASS setelah perubahan sesi ini (tidak ada regresi).
- `node --check` lolos untuk `modules/asset/investasi-view.js` &
  `modules/shared/modals.js`.
- **Catatan penting**: sesi ini HANYA menyertakan file yang diubah sesi
  ini (`investasi-view.js`, `modals.js`, test baru) + dokumen. File
  `modules/asset/aset.js` hasil patch B1-B12 (sumber
  `_findInvestmentMigrationCandidates()`/field `investmentId`) TIDAK
  disertakan ulang di sini — pastikan patch B1-B12 sudah ter-merge di
  basis kode sebelum menerapkan patch sesi ini, atau `_findLinkCandidate()`
  akan selalu balik `null` (guard `typeof Aset`) dan banner tidak akan
  pernah muncul (aman, degradasi anggun, bukan error).
