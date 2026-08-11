# FIX v1278 → v1279 — S544: 2 bug lanjutan laporan user (Dana Titipan)

## Laporan user (setelah v1278/S543 dipasang)

1. Dropdown "Pilih Aset" tiap kartu owner (tab Dana Titipan) kelihatan
   sudah terisi (mis. "Bni am"), tapi tombol "⚖️ Atur Porsi Aset" **masih**
   memunculkan toast "⚠️ Pilih aset dulu" dan gagal — walau fix S543
   (preserve-selection) sudah terpasang.
2. Nominal "Pokok"/"Kini" owner Dana Titipan tampil pecahan Rupiah yang
   membingungkan, mis. "Rp 10.012.550,539" dan "Rp 1.699.999,461" —
   padahal user mencatat pokok bulat "Rp 1.700.000".
3. Owner "Aku" dengan Pokok/Kini/semua field = 0 tetap muncul sebagai
   kartu tersendiri, tidak ada cara menghapusnya.

Item #1 & #2 diaudit & diperbaiki sesi ini. Item #3 **BELUM** diperbaiki —
lihat penjelasan di bagian akhir dokumen ini (bukan bug, keputusan desain
S523-C yang sengaja ditunda, plus 1 hipotesis teknis yang perlu
dikonfirmasi user sebelum ada perubahan kode).

---

## Item #1 — Root cause: DUPLIKAT ID lintas 2 container render

`renderLaporan()` (`modules/shared/modules-render.js`) memanggil
`DanaTitipanPortfolioPresenter.render()` (→ `#danaTitipanPortfolioList`,
kartu lama di tab Uang) **DAN**
`DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList')` (→
sub-tab Laporan > Dana Titipan, Sesi 498) **di panggilan yang sama**,
setiap kali laporan dirender ulang. Kedua container ini **permanen ada di
DOM** (`index.html`/`app_production.html`, tidak dilepas/dibuat ulang per
tab aktif — cuma disembunyikan lewat CSS saat tab tidak aktif) dan
isinya 100% sama (sumber data sama, `DanaTitipanPortfolioAPI.build()`),
jadi markup `<select id="titipanAssetPick_N">` /
`<div id="titipanHoldingsList_N">` / `<details id="titipanOwnerCard_N">`
**terduplikasi persis** di 2 tempat sekaligus.

`document.getElementById()` selalu mengembalikan elemen **pertama** yang
match di seluruh dokumen. Kalau user memilih dropdown di container KEDUA
(mis. sedang membuka sub-tab Laporan > Dana Titipan), tapi container
PERTAMA (kartu di tab Uang, belum tentu pernah disentuh user) muncul
lebih dulu di HTML, maka `onAssetPickChange()`/`openAssetPorsi()` yang
lama diam-diam membaca elemen container PERTAMA (kosong) — bukan yang
baru saja dipilih user. Toast "Pilih aset dulu" muncul walau user merasa
sudah memilih.

Bug ini **beda lapis** dari yang diperbaiki S543 (preserve-selection saat
`_renderNow()` mengganti `innerHTML` container yang SAMA) — S543 tetap
benar & tetap dibutuhkan, cuma tidak menyentuh masalah duplikasi
lintas-container ini.

### Fix

`onAssetPickChange()`/`openAssetPorsi()` sekarang menerima **elemen
pemicu langsung** (`this` dari atribut `onchange` pada `<select>`, `$el`
dari data-action dispatcher — placeholder ini sudah didukung
`features-helpers-global-security.js` sejak lama, 0 perubahan di
dispatcher itu sendiri) lalu menelusuri DOM **relatif** dari elemen itu
(`closest('details')` → `querySelector(...)` di dalam `<details>` yang
sama) — sehingga selalu mendapat elemen di **container yang sama** dengan
yang diklik user, terlepas dari urutan render 2 container tadi.

Dual-mode dipertahankan: kalau dipanggil dengan angka index (pola lama),
tetap fallback ke `getElementById()` — 0 breaking change untuk test/kode
lama yang mungkin belum sempat diupdate. Markup render (`_renderNow()`)
diubah supaya memakai jalur BARU (`this` / `"$el"`), bukan index lagi.

## Item #2 — Root cause: `fmtFull()` tidak membulatkan ke Rupiah utuh

`fmtFull(n)` = `'Rp ' + Number(Math.abs(n||0)).toLocaleString('id-ID')`.
`toLocaleString('id-ID')` tanpa opsi eksplisit **membatasi** maksimal 3
desimal, tapi **tidak membulatkan** ke satuan — kalau argumennya punya
sisa desimal kecil, sisa itu ikut tampil sebagai ",XXX".

Sisa desimal itu sendiri berasal dari `MultiOwnerEngine.splitByPorsi()`
(`bagian = nilai * porsi/100`, SENGAJA tidak dibulatkan di sana —
dokumentasi fungsi itu eksplisit menyebut "pembulatan tampilan jadi
tanggung jawab caller/formatter") — jadi bukan bug di `splitByPorsi()`,
tapi `fmtFull()`/`fmtFullSigned()` (formatter yang dimaksud komentar
itu) belum benar-benar melakukan pembulatan tersebut.

Rupiah tidak punya pecahan yang dipakai user awam (sen sudah lama tidak
beredar) dan 0 tempat lain di app ini sengaja menampilkan desimal Rupiah
— diverifikasi: 0 test existing (dari 98 file test yang memanggil
`fmtFull`) meng-assert output dengan nilai desimal.

### Fix

Tambah `Math.round()` sebelum `toLocaleString()` di `fmtFull()` dan
`fmtFullSigned()` (`modules/shared/format-tema.js`) — **murni pembulatan
tampilan**. Nilai asli di `D` (mis. `o.allocatedPrincipal`) TIDAK
disentuh sama sekali; kalkulasi lain yang butuh presisi penuh tetap
presisi penuh, cuma render angkanya sekarang dibulatkan ke Rupiah utuh
seperti tempat lain di app.

## File berubah

- `modules/finance/dana-titipan-portfolio-presenter.js` —
  `onAssetPickChange()`/`openAssetPorsi()` dual-mode (elemen ATAU index),
  markup `_renderNow()` diubah kirim `this`/`"$el"`.
- `modules/shared/format-tema.js` — `fmtFull()`/`fmtFullSigned()` bulatkan
  ke Rupiah utuh sebelum `toLocaleString()`.
- `tests/s544-titipan-duplicate-container-scoped-porsi.test.js` (baru, 4
  test: resolve container yang benar walau ada duplikat id, toast tetap
  muncul kalau memang kosong, mode lama/index tetap jalan, highlight baris
  tetap scoped ke container yang benar).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild penuh, tanpa
  minifikasi — esbuild tidak tersedia di sandbox).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  v1279.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — HANYA konstanta
  versi disamakan oleh `scripts/build.js` (0 logic berubah).

## Hasil test

- Test baru (`s544-...test.js`): 4/4 lolos.
- **Full suite: 3761/3761 lolos, 0 regresi** (naik dari 3757 sebelum sesi
  ini karena 4 test baru).
- `verify-window-expose.js` — lolos.
- `verify-bundle-freshness.js` — lolos (kedua bundle segar).

## Status lint & release gate

Sama seperti S543: **lint** & **minifikasi** di-override (eslint/esbuild
tidak terpasang, sandbox tanpa akses jaringan) — dicatat otomatis di
`docs/RELEASE-GATE-LOG.md`. **Sinkronisasi HTML** lolos murni.

## Hasil build

`node scripts/build.js s544-titipan-duplicate-container-scoped-porsi-and-rupiah-rounding`
— sukses, versi 1278 → **1279**, sintaks kedua bundle valid
(`node --check`).

---

## Item #3 — Owner "Aku" (0 di semua field), belum diimplementasikan

Ini SENGAJA tidak diubah sesi ini karena dua alasan:

1. **Bukan bug — keputusan desain eksplisit.** `removeOwnerLinkage()`
   (S523-C, `dana-titipan-portfolio-presenter.js`) mendokumentasikan
   secara eksplisit: "Global owner deletion... SENGAJA TIDAK ADA...
   `OwnerRegistry` belum punya API delete/remove resmi sama sekali."
   Tombol "🔓 Lepas Keterikatan Dana Titipan" yang sudah ada di kartu
   owner HANYA menghapus record pokok dana titipan (`D.titipanCommitments`)
   — bukan identitas owner itu sendiri. Ini konsisten dengan isolasi
   domain yang didokumentasikan: "Owner bisa saja tetap muncul di kartu
   Dana Titipan setelah linkage dilepas KALAU dia masih punya porsi di
   suatu holding/aset lain — itu BUKAN bug."
2. **Hipotesis teknis yang belum terkonfirmasi.** Kartu owner hanya
   muncul di projection `build()` kalau (a) punya `porsi > 0` di
   sedikitnya 1 Investasi/Aset, ATAU (b) punya record
   `D.titipanCommitments`. Kalau owner "Aku" sudah 0 di SEMUA field tapi
   kartunya tetap muncul, kemungkinan besar dia masih punya porsi
   residu sangat kecil (bukan benar-benar 0, misal sisa pembagian float
   dari edit "Atur Porsi Kepemilikan" sebelumnya) di salah satu
   Investasi/Aset — kecil sekali sampai dibulatkan jadi "Rp 0" di
   tampilan, tapi cukup besar (`porsi > 0`) untuk tetap lolos syarat
   masuk projection.

**Rekomendasi tindak lanjut (butuh konfirmasi user dulu sebelum ada kode
diubah, sesuai disiplin proyek):**
- Cek satu per satu tiap Investasi/Aset lewat "⚖️ Atur Porsi
  Kepemilikan" — apakah owner "Aku" masih terdaftar di sana dengan porsi
  sangat kecil (mis. 0.0000x%)? Kalau ya, hapus baris itu dari modal
  porsi masing-masing instrumen (bukan dari Dana Titipan) — begitu porsi
  "Aku" benar-benar 0 di semua tempat, kartunya otomatis hilang dari
  projection tanpa perlu fitur "hapus owner" baru.
- Kalau ternyata dia TIDAK terdaftar di manapun dan kartunya tetap
  muncul, itu temuan baru yang perlu sesi audit terpisah (di luar 2 bug
  yang sudah dikonfirmasi & diperbaiki sesi ini).
- Kalau keputusan produknya memang "perlu ada fitur hapus identitas
  owner secara global", itu perlu sesi desain terpisah (nambah
  `OwnerRegistry.remove()` + guard cross-domain, ada UI trigger) — bukan
  perbaikan bug, tapi fitur baru yang sengaja ditunda sejak S523-C.
