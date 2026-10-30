# S542 — Rename/Hapus Kustodian dari Registry (item ringan #2, lanjutan S540/S541)

## Ringkasan
Sesi lanjutan (non-goal S540/S541, item ringan #2 dari 2 yang tercatat
setelah S540 selesai) dari `DESIGN-S540-CUSTODIAN-GROUPING.md`. `CustodianRegistry`
(`modules/shared/custodian-registry.js`, S540-A) sebelumnya cuma punya
`listAll()`/`findOrCreate()` — tidak ada cara mengubah nama atau menghapus
entri kustodian selain lewat data langsung. Sesi ini menambah 2 method
baru: `rename(id, newName)` dan `remove(id)`, plus UI trigger-nya di
`investmentModal`.

**Keputusan kecil yang diambil sesi ini** (2 pertanyaan yang tercatat di
`s541-SESSION-NOTE.md` §Non-goals):
1. **Titik UI trigger** — 2 link teks kecil ("✏️ Ubah Nama Kustodian" /
   "🗑️ Hapus Kustodian") ditaruh langsung di bawah dropdown
   `#investCustodian` (investmentModal), pola sama persis link aksi kecil
   yang sudah ada di modal lain (mis. "🔄 Isi dari rata-rata BBM" di
   productModal — `font-size:11px;color:var(--accent);cursor:pointer`).
   Link ini HANYA tampil kalau dropdown sedang terpilih ke entri kustodian
   yang NYATA ada di registry (bukan opsi kosong, bukan `"__new__"` yang
   belum ke-resolve, bukan opsi legacy "(kustodian tidak ditemukan)") —
   dikontrol lewat `InvestmentListUI._syncCustodianActionButtons()` baru,
   dipanggil tiap kali dropdown di-render ulang atau selection-nya berubah.
2. **Bahasa konfirmasi hapus** — `askConfirm()` dgn pesan eksplisit bahwa
   holding investasi yang masih terkait **TIDAK ikut terhapus**, cuma
   labelnya fallback ke "Kustodian" (generik) & lepas dari pengelompokan —
   perilaku ini sudah aman sejak S540-D (`_custodianName()` fallback,
   dibuktikan test S540-D #8), sesi ini cuma mengomunikasikannya ke user
   lewat teks konfirmasi, TIDAK mengubah logic fallback itu sendiri.

## Perubahan
- `modules/shared/custodian-registry.js` — `CustodianRegistry`:
  - `rename(id, newName)` baru — cari entri by `id`, update `name`
    (trim), panggil `save()`. `id` TIDAK berubah, jadi semua holding yang
    sudah mereferensikan `custodianId` ini otomatis ikut tampil dgn nama
    baru di mana pun (dropdown, grup Dana Titipan) — 0 update manual per
    holding diperlukan, karena semua consumer baca nama lewat lookup
    id→registry (`_custodianName()`), bukan menyalin string. Balikin
    `false` (bukan throw) kalau `id` tidak ditemukan; throw `Error` kalau
    `newName` kosong (pola sama persis `findOrCreate()`). TIDAK
    dedup/collapse ke entri lain yg kebetulan nama jadi sama setelah
    rename (sama seperti catatan `findOrCreate()`).
  - `remove(id)` baru — hapus entri dari `D.investmentCustodians`,
    panggil `save()`. Balikin `false` kalau `id` tidak ditemukan. SENGAJA
    TIDAK menyentuh `D.investments[].custodianId` holding manapun yang
    masih mereferensikan id ini — 0 cascading delete, holding itu sendiri
    (nama, unit, nilai, dst) tetap tersimpan utuh, cuma fallback ke label
    generik & keluar dari grup (perilaku S540-D yang sudah ada, TIDAK
    disentuh sesi ini).
- `modules/asset/investasi-list-view.js` — `InvestmentListUI`:
  - `_syncCustodianActionButtons()` baru — toggle visibilitas
    `#investCustodianActions` (2 link aksi) berdasar apakah dropdown
    sedang terpilih ke entri kustodian nyata. Dipanggil dari
    `_renderCustodianOptions()` (S540-C, sudah ada) & dari
    `onCustodianSelectChange()` (S540-C, ditambah 1 panggilan di jalur
    non-`"__new__"` yang sebelumnya langsung `return` tanpa sync apa pun).
  - `renameCustodian()` baru — baca id terpilih, prompt nama baru
    (`showPromptModal()` dgn `defaultValue` = nama lama), delegasi ke
    `CustodianRegistry.rename()`, render ulang dropdown.
  - `deleteCustodian()` baru — baca id terpilih, `askConfirm()` dgn pesan
    eksplisit (lihat §Ringkasan poin 2), delegasi ke
    `CustodianRegistry.remove()`, render ulang dropdown (kembali ke opsi
    kosong).
- `modules/shared/modals.js` — `investmentModal`: tambah
  `<div id="investCustodianActions" class="u-dnone">` berisi 2 `<span>`
  aksi (`data-action="InvestmentListUI.renameCustodian"` /
  `data-action="InvestmentListUI.deleteCustodian"`) di bawah dropdown
  `#investCustodian`, sebelum hint teks yang sudah ada. 0 markup lain di
  modal ini disentuh.
- `tests/s542-custodian-rename-remove.test.js` — baru, 10 test murni
  di layer `CustodianRegistry` (`rename()`/`remove()`) — pola sama
  `tests/s540a-custodian-registry.test.js`. 0 test DOM/UI baru untuk
  `investasi-list-view.js` sendiri, konsisten pola proyek (file UI DOM-
  heavy tidak punya test file langsung, lihat `docs/COVERAGE-PER-MODULE.md`
  — logic-nya sudah 100% dilegasikan ke `CustodianRegistry` yang teruji).
- `docs/architecture/DESIGN-S540-CUSTODIAN-GROUPING.md` — tandai item
  "Rename/hapus kustodian dari registry" selesai (`[x]`) di §Follow-up
  pasca-S540.

## Kenapa aman
- `findOrCreate()` (S540-A) — 0 baris diubah.
- `_custodianName()`/`_groupHoldingsByCustodian()`/`_groupSubtotal()`
  (S540-D/S541, `dana-titipan-portfolio-presenter.js`) — 0 baris disentuh.
  Fallback label "Kustodian" untuk id yang tidak ketemu di registry
  (perilaku YANG SUDAH ADA sejak S540-D) sekarang jadi jalur yang benar-
  benar bisa dipicu user lewat UI (via `remove()`), bukan cuma kasus tepi
  defensif — tapi logic-nya sendiri 100% tidak berubah (test 9 di file
  test baru membuktikan `remove()` tidak menyentuh `D.investments[]`).
- `investasi.js` (`updateHolding()`) — 0 baris disentuh, di luar daftar
  file terproteksi yang perlu approval sesi ini krn memang tidak disentuh.
- 0 field/entity baru di skema data — `rename()`/`remove()` murni operasi
  CRUD atas struktur `D.investmentCustodians[{id,name}]` yang sudah ada
  sejak S540-A.

## Test & build
- Sebelum: 3743 pass / 0 fail (baseline S541).
- File test baru `tests/s542-custodian-rename-remove.test.js` (10 test:
  rename dasar, trim, id tidak ditemukan, validasi nama kosong, tidak
  dedup by nama, remove dasar, remove id tidak ditemukan, remove registry
  kosong, 0 cascading delete ke holding, urutan rename→remove).
- Setelah tambah test: 3753 pass / 0 fail.
- `node scripts/build.js s542-custodian-registry-rename-remove` →
  v1274→v1275, sintaks bundle valid (esbuild tidak tersedia di sandbox
  ini, bundle unminified tapi 100% valid — pola sama S541).
- Setelah build: 3753 pass / 0 fail lagi (0 perubahan angka — build.js
  hanya bump versi + regenerasi bundle).

## Non-goals sesi ini
- **Mass assign kustodian** — TETAP non-goal, sama seperti keputusan
  Design Lock S540. Masih butuh Design Lock terpisah (keputusan UX: pilih
  banyak holding sekaligus → assign 1 kustodian) sebelum dikerjakan.
- Merge/gabung 2 kustodian yang kebetulan nama-nya jadi sama setelah
  rename — TIDAK dikerjakan (lihat catatan di `rename()`), konsisten pola
  `findOrCreate()`/`OwnerRegistry` yang juga tidak collapse otomatis.
