# FIX v1277 → v1278 — S543: dropdown "Pilih Aset" Dana Titipan "belum sinkron"

## Laporan user

Dropdown "Pilih Aset" di tiap kartu owner (tab Dana Titipan) kelihatan
sudah terisi (mis. "Sucorinvest"), tapi begitu tombol "⚖️ Atur Porsi
Aset" ditekan, muncul toast "Pilih aset dulu" — padahal secara visual
dropdown-nya tidak kosong.

## Root cause

`DanaTitipanPortfolioPresenter._renderNow()` mengganti **seluruh**
`el.innerHTML` (termasuk semua `<select id="titipanAssetPick_N">`)
setiap kali dipanggil ulang. `_assetOptionsHtml()` selalu menghasilkan
opsi pertama `"— Pilih Aset —"` **tanpa** `selected` sesuai pilihan
sebelumnya. `render()`/`renderInto()` dipanggil ulang dari
`renderLaporan()` setiap ada perubahan lain di halaman (mis. harga
investasi live update) — jadi urutan kejadian aslinya:

1. User pilih "Sucorinvest" di dropdown.
2. Sebelum sempat klik "Atur Porsi Aset", render ulang lain terjadi di
   background (trigger tidak terkait dropdown ini sama sekali).
3. Dropdown diam-diam ter-reset ke placeholder kosong oleh
   `el.innerHTML = ...` yang baru.
4. Klik tombol baca `sel.value === ''` → toast "Pilih aset dulu",
   padahal secara visual masih terlihat "Sucorinvest" (repaint browser
   belum tentu langsung kelihatan bedanya ke user).

## Fix

Preservasi pilihan dropdown **per `ownerId`** (bukan per index `oi`) di
sekeliling penggantian `el.innerHTML` di `_renderNow()`:

- Tiap `<select id="titipanAssetPick_${oi}">` sekarang punya atribut
  `data-owner-id="${o.ownerId}"`.
- `_captureAssetPickSelections(el)` (baru) — dipanggil di awal
  `_renderNow()`, SEBELUM `el.innerHTML` ditimpa. Baca semua
  `select[id^="titipanAssetPick_"]` yang masih ada, simpan
  `{ ownerId: assetIdTerpilih }`.
- `_restoreAssetPickSelections(el, saved)` (baru) — dipanggil di akhir
  `_renderNow()`, SETELAH `el.innerHTML` ditimpa dgn markup baru.
  Cocokkan tiap `<select>` baru via `data-owner-id` ke hasil capture,
  set `.value`-nya.

Kenapa per-`ownerId`, bukan per-index: `projection.owners` di-sort by
`allocatedPrincipal` desc (`build()`, tidak diubah) — index `oi` bisa
bergeser antar render kalau ada owner baru masuk atau urutan berubah.
Kalau preservasi dilakukan per-index, pilihan user bisa "salah pasang"
ke owner lain setelah pergeseran. Test #3 di bawah membuktikan ini
ditangani benar.

Guard `typeof el.querySelectorAll !== 'function'` di kedua fungsi baru
(pola sama guard `typeof` lain di file ini) — aman dijalankan di test
harness ringan yang tidak mengimplementasikan `querySelectorAll` (mis.
`tests/s515-*.test.js`), fallback diam-diam 0 restore tanpa crash.

**0 logika projection/aggregasi lain disentuh** — satu-satunya
perubahan perilaku adalah preservasi state dropdown ini.

## File berubah

- `modules/finance/dana-titipan-portfolio-presenter.js` —
  `_captureAssetPickSelections()`/`_restoreAssetPickSelections()` (baru),
  dipanggil dari `_renderNow()`; tambah `data-owner-id` di markup
  `<select id="titipanAssetPick_${oi}">`.
- `tests/s543-titipan-asset-pick-preserve-selection.test.js` (baru, 4
  test case: baseline tanpa interaksi, preservasi setelah render ulang,
  preservasi saat urutan owner bergeser, guard DOM tanpa
  `querySelectorAll`).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild penuh, tanpa
  minifikasi — esbuild tidak tersedia di sandbox, lihat status gate di
  bawah).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  v1278.
- `FILE-MAP.md`, `COVERAGE-PER-MODULE.md` — regenerasi otomatis dari
  `scripts/build.js`.

## Hasil test

- Test baru (`s543-titipan-asset-pick-preserve-selection.test.js`):
  4/4 lolos.
- Test terkait presenter ini + dependency langsungnya (s515, s485d,
  s486, s498, s500, s521, s540d, s541 + s543 baru): 132/132 lolos.
- **Full suite: 3757/3757 lolos, 0 regresi** (naik dari 3753 sebelum
  sesi ini karena 4 test baru).

## Status lint & release gate

`node scripts/verify-release-ready.js` (Sesi 424, WAJIB sebelum ZIP):

1. **Lint** — **tidak tersedia, di-override**. `eslint` tidak
   terpasang & sandbox ini tanpa akses jaringan (`npm install eslint`
   gagal 403 dari registry) sehingga tidak bisa dipasang/dijalankan.
   Direview manual: perubahan mengikuti gaya file existing (const,
   arrow function, single-quote string, guard `typeof`), 0 variabel
   baru yang tidak dipakai. Di-override via
   `CONFIRM_LINT_UNAVAILABLE_REASON`, dicatat otomatis di
   `docs/RELEASE-GATE-LOG.md`.
2. **Minifikasi** — **tidak tersedia, di-override**. `esbuild` tidak
   terpasang, sandbox tanpa akses jaringan. Bundle hasil build.js
   fallback unminified (lebih besar dari build sebelumnya), tapi
   `node --check` lolos untuk kedua bundle (sintaks valid, aman
   dipakai). Di-override via `CONFIRM_UNMINIFIED_REASON`, dicatat
   otomatis di `docs/RELEASE-GATE-LOG.md`.
3. **Sinkronisasi HTML** — **lolos**. `app_production.html` persis
   cermin `index.html` + komentar AUTO-GENERATED.

**Gate akhir: LOLOS** (2 dari 3 gate di-override dengan alasan
lingkungan yang tercatat, 1 gate lolos murni).

## Hasil build

`node scripts/build.js s543-titipan-assetpick-dropdown-preserve-selection`
— sukses, versi 1277 → **1278**, sintaks kedua bundle valid
(`node --check`), `verify-bundle-freshness.js` konfirmasi kedua bundle
segar (hash source cocok).

## Item #2 dari laporan user — BELUM dikerjakan, perlu klarifikasi

Soal tombol "hapus akun pemilik" (global owner deletion): dikonfirmasi
**bukan bug** — ini keputusan desain eksplisit dari sesi S523-C
(`S523-C-SESSION-NOTE.md`) yang secara sengaja **melarang** "global
owner deletion" karena `OwnerRegistry` belum punya API delete resmi &
keputusan desain terkait (§4 dokumen rekomendasi S523) belum diambil.
Sesi ini TIDAK mengubah apa pun terkait item #2 — menunggu klarifikasi
user soal keputusan produk yang dimaksud sebelum ada implementasi baru
di area ini (di luar scope 1 bug dropdown yang sudah selesai di atas).

## Next TODO

- Klarifikasi keputusan produk soal "hapus akun pemilik" (lihat di
  atas) sebelum sesi berikutnya menyentuh area ini.
