# SESSION-NOTE-S716-FILTER-PREFS-STORE-SHARED-HELPER — Ekstraksi helper
# bersama `FilterPrefsStore` dari 3 salinan identik `_loadFilterPrefsOnce()`/
# `_saveFilterPrefs()`

Base: app-main snapshot v1531 (S715 — persist filter Owner+Status Buku Aset
& Dana Titipan ke localStorage). **Versi aplikasi: 1531 → 1532.**

## Konteks

Bukan dari backlog tercatat — murni housekeeping/dedup yang ketahuan pas
mengerjakan S715: setelah S715 selesai, pola `_loadFilterPrefsOnce()`/
`_saveFilterPrefs()` (baca/tulis filter Owner+Status ke localStorage, guard
baca-sekali per lifetime halaman, validasi bentuk data, try/catch permisif)
ada **3 SALINAN yang SAMA PERSIS** isinya (cuma beda nama objek target &
storage key):

1. `InvestmentListUI` — `modules/asset/investasi-list-view.js` (S672,
   yang PERTAMA ada).
2. `Aset` — `modules/asset/aset.js` (S715, di-copy dari #1).
3. `DanaTitipanPortfolioPresenter` —
   `modules/finance/dana-titipan-portfolio-render.js` (S715, di-copy dari
   #1 juga).

Sesi ini pindahkan LOGIKANYA ke 1 tempat, ketiga consumer jadi thin
delegating wrapper.

## Perubahan

**`modules/shared/filter-prefs-store.js`** (baru) — `FilterPrefsStore`:
- `loadOnce(target)` — versi generik dari `_loadFilterPrefsOnce()`, ambil
  `target` (objek apa pun yang punya `filterOwnerIds`/`filterSettlement`/
  `_filterPrefsLoaded`/`_filterStorageKey`) sbg parameter. 0 perubahan
  logika dari 3 versi sebelumnya (guard baca-sekali, `Array.isArray` utk
  `filterOwnerIds`, whitelist `'milik'/'titipan'` utk `filterSettlement`,
  try/catch permisif).
- `save(target)` — versi generik dari `_saveFilterPrefs()`, sama pola.
- Ditaruh di `modules/shared/` (bukan `modules/asset/` atau
  `modules/finance/`) karena dipakai lintas domain (asset DAN finance).

**`modules/asset/aset.js`** — `Aset._loadFilterPrefsOnce()`/
`_saveFilterPrefs()` sekarang tinggal 1 baris delegasi
(`FilterPrefsStore.loadOnce(Aset)`/`FilterPrefsStore.save(Aset)`). Nama
method, field (`filterOwnerIds`/`filterSettlement`/`_filterPrefsLoaded`/
`_filterStorageKey`), dan titik panggil (`renderList()`,
`onFilterOwnerToggle()` dkk) **0 berubah** — murni body method yang dipindah.

**`modules/asset/investasi-list-view.js`** — `InvestmentListUI`, perubahan
sama pola persis di atas (delegasi ke `FilterPrefsStore`).

**`modules/finance/dana-titipan-portfolio-render.js`** —
`DanaTitipanPortfolioPresenter`, perubahan sama pola persis di atas.

**`scripts/build.js`** — registrasi `modules/shared/filter-prefs-store.js`,
ditaruh tepat setelah `modules/shared/owner-registry.js` (blok
`modules/shared/` awal, sebelum ketiga consumer di-load lebih jauh ke
bawah) — komentar penjelasan urutan/alasan ditambahkan di titik itu.

**`modules/shared/modals.js`** — update `MODAL_VERSION` (bagian rutin
`bumpVersionEverywhere()`).

## Test

**43 file test existing** (yang `loadSource()`-nya memuat salah satu dari
3 file consumer: `modules/asset/aset.js`,
`modules/asset/investasi-list-view.js`,
`modules/finance/dana-titipan-portfolio-render.js`) ditambal — tiap array
`loadSource([...])` yang memuat salah satu dari ketiganya kini juga memuat
`modules/shared/filter-prefs-store.js` TEPAT SEBELUM file consumer itu
(dependency baru). **49 baris disisipkan** (beberapa file test punya lebih
dari satu titik `loadSource()` yang butuh, mis. yang test-nya sengaja
memuat 2 consumer sekaligus, atau punya lebih dari satu fungsi
`makeCtx()`). 0 perubahan lain di file-file ini — assertion, mock,
skenario semua tetap sama persis dgn sebelum sesi ini, murni nambah 1
dependency di array `loadSource()`.

**`tests/s716-filter-prefs-store-shared-helper.test.js`** (baru, 18 test)
— test langsung ke `FilterPrefsStore` itu sendiri pakai `target` palsu
(plain object, bukan `Aset`/`InvestmentListUI`/
`DanaTitipanPortfolioPresenter` sungguhan) supaya terisolasi dari domain
masing-masing consumer:
- `save()`: roundtrip tulis JSON ke key `target._filterStorageKey`;
  tidak melempar kalau `localStorage.setItem()` melempar (penuh/diblokir),
  kalau `localStorage` tidak tersedia, atau kalau `target` null/undefined.
- `loadOnce()`: baca balik nilai tersimpan; guard baca-sekali per target
  (panggilan kedua tidak menimpa balik perubahan live); 2 target dgn
  `_filterStorageKey` berbeda tidak saling bocor (namespace independen);
  localStorage kosong/data JSON korup/`filterOwnerIds` bukan array/
  `filterSettlement` di luar whitelist — semua diabaikan dgn aman, 0
  crash; `filterOwnerIds` berisi angka dikonversi ke string; validasi
  `filterOwnerIds` & `filterSettlement` terbukti INDEPENDEN satu sama
  lain (bukan saling menggantikan — lihat catatan di bawah);
  `localStorage` tidak tersedia / `getItem()` melempar / `target`
  null-undefined — semua tidak melempar.
- 1 test roundtrip end-to-end: `save()` di 1 target, `loadOnce()` di
  target BARU (simulasi reload halaman) — nilai persis sama.

**Catatan koreksi pemahaman saat menulis test** (bukan bug source, murni
klarifikasi perilaku yg sudah benar sejak S672/S715): draf awal test
mengira `filterOwnerIds` & `filterSettlement` divalidasi sbg 1 paket
("kalau salah satu invalid, keduanya diabaikan"). Setelah baca source
ulang & jalankan test, ternyata KEDUANYA divalidasi TERPISAH —
`filterSettlement` yg lolos whitelist (`'milik'`/`'titipan'`) TETAP
dipakai walau `filterOwnerIds` di storage gagal validasi (bukan array),
dan sebaliknya. Guard "kosongkan `filterSettlement` kalau
`filterOwnerIds` kosong" HANYA fallback saat `filterSettlement` SENDIRI
tidak lolos whitelist. 2 test di draf awal (baris ~186 & ~214) diperbaiki
supaya assert sesuai perilaku sungguhan, bukan menambal source untuk
mengikuti asumsi test yang salah.

**Full suite: 5375/5375 lolos, 0 gagal** (naik dari 5357 baseline S715 +
18 test baru sesi ini).

## Build

`node scripts/build.js s716-filter-prefs-store-shared-helper` — versi
`1531 → 1532`. Release Gate: **lint-unavailable** & **unminified-bundle**
override dipakai (sandbox tanpa akses jaringan keluar, eslint/esbuild
tidak bisa diinstall — sama seperti seluruh sesi S714/S715 sebelumnya),
dicatat di `docs/RELEASE-GATE-LOG.md`. Sintaks kedua bundle lolos
`node --check`. `index.html`/`app_production.html`/`sw.js` disinkronkan
ke `?v=1532`/`kw-cache-v1532`.

## File yang berubah (Mode PATCH ZIP)

- `modules/shared/filter-prefs-store.js` (baru)
- `modules/asset/aset.js` (delegasi ke `FilterPrefsStore`)
- `modules/asset/investasi-list-view.js` (delegasi ke `FilterPrefsStore`)
- `modules/finance/dana-titipan-portfolio-render.js` (delegasi ke
  `FilterPrefsStore`)
- `scripts/build.js` (registrasi file baru)
- `modules/shared/modals.js` (update `MODAL_VERSION`, rutin)
- `tests/s716-filter-prefs-store-shared-helper.test.js` (baru, 18 test)
- 43 file `tests/*.test.js` existing — daftar lengkap:
  `investasi-ghost-migration-and-summary-guard-s614.test.js`,
  `investasi-watch-render-guard-audit-tombol-investasi.test.js`,
  `investment-list-ui-s466.test.js`,
  `investment-tx-watch-ui-s467.test.js`,
  `patch-2026-08-14-b-majoris-deductionowner-sync.test.js`,
  `s483-investment-tx-akun-sumber-dana.test.js`,
  `s485d-titipan-commitment-ui.test.js`,
  `s486-titipan-commitment-return.test.js`,
  `s498-dana-titipan-tab-terpadu.test.js`,
  `s500-dana-titipan-f2-opsib-hide-gain-aset.test.js`,
  `s515-dana-titipan-owner-nominal-asset-kuota-porsi.test.js`,
  `s516-dana-titipan-commitment-ownerid-escaping.test.js`,
  `s519-dana-titipan-transaksi-talangan-linkage.test.js`,
  `s521-titipan-expense-flow.test.js`, `s521-titipan-expense-ui.test.js`,
  `s540d-investasi-custodian-grouping.test.js`,
  `s541-titipan-custodian-group-subtotal.test.js`,
  `s543-titipan-asset-pick-preserve-selection.test.js`,
  `s547-self-owner-identity-unification.test.js`,
  `s550-titipan-commitment-ui-tablist-sync.test.js`,
  `s595-titipan-majoris-renov-reconcile.test.js`,
  `s608-renderlist-per-row-trycatch-guard.test.js`,
  `s631-titipan-holding-name-direct-porsi.test.js`,
  `s632-titipan-detail-grid-collapsed.test.js`,
  `s633-titipan-linkasset-toggle-collapsed.test.js`,
  `s634-titipan-gain-signed-minus.test.js`,
  `s638-dana-titipan-money-class-modern.test.js`,
  `s645-dana-titipan-owner-list-tabel-modern.test.js`,
  `s662-investmentlistui-owner-settlement-filter.test.js`,
  `s663-investmentlistui-summary-filter-note.test.js`,
  `s667-aset-owner-status-filter.test.js`,
  `s668-dana-titipan-owner-status-filter.test.js`,
  `s669-investmentlistui-multiselect-owner-filter.test.js`,
  `s670-dana-titipan-ringkas-filter.test.js`,
  `s671-investmentlistui-filter-select-all-clear.test.js`,
  `s672-investmentlistui-filter-persist-localstorage.test.js`,
  `s705-aset-report-cards-trycatch-guard.test.js`,
  `s709-titipan-catat-dana-keluar-button.test.js`,
  `s714-titipan-pinjam-utang-linkage.test.js`,
  `s714-titipan-pinjam-utang-sesi3-grid-row.test.js`,
  `s715-aset-filter-persist-localstorage.test.js`,
  `s715-dana-titipan-filter-persist-localstorage.test.js`,
  `session04a-dana-titipan-pool-ui-summary.test.js`
  — semua HANYA dapat 1-2 baris tambahan di array `loadSource()`, 0
  perubahan lain.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (hasil build v1532,
  unminified — lihat Release Gate override di atas)
- `index.html`, `app_production.html`, `sw.js` (versi bump ke 1532)
- `docs/RELEASE-GATE-LOG.md` (append entry override sesi ini)
- `SESSION-NOTE-S716-FILTER-PREFS-STORE-SHARED-HELPER.md` (file ini)

**Cara pakai:** timpa file dgn nama sama di project existing (ZIP ini
sudah kumulatif dari S715, tidak perlu apply patch sesi-sesi sebelumnya
secara terpisah lagi kalau pakai ZIP ini), lalu upload/refresh seperti
biasa. Tidak ada migrasi data — perilaku persist filter Owner+Status
(Buku Aset/Investasi/Dana Titipan) 100% sama dgn sebelum sesi ini, murni
refactor internal (dedup kode), 0 perubahan yang terlihat user.

## Status akhir

Housekeeping selesai — 3 salinan identik jadi 1 helper bersama, semua
consumer & test tetap hijau. Tidak ada backlog baru yang tercatat dari
sesi ini.
