# DESIGN_lazy-load-modules.md — Rencana Lazy-Load Modul Jarang Dipakai

## Status
Draf — belum ada kode yang diubah. Menunggu keputusan user sebelum mulai eksekusi
per tahap.

## Latar belakang
`app-bundle-b.min.js` (2.3MB, ~46.8rb baris) memuat SEMUA modul jadi 1 file, termasuk
fitur yang jarang dipakai bersamaan (Torsi/Vehicle Selector, Renovasi, Shop Business
Intelligence, dll). Ini menambah waktu parse+eksekusi sebelum app interaktif (load
pertama), walau sudah dimuat di akhir `<body>` (posisi sudah benar, bukan itu
masalahnya — masalahnya ukuran total yang harus di-parse+jalankan sebelum
`init()` selesai).

Pola lazy-load **sudah ada dan terbukti jalan** di app ini: `_loadScriptOnce()`
(index.html) dipakai untuk Tesseract OCR & jsPDF — di-fetch dari CDN cuma saat
fiturnya benar-benar dipakai. Rencana ini murni **memperluas pola yang sama**
ke modul internal, bukan mekanisme baru.

## Tujuan
Kurangi ukuran JS yang WAJIB di-parse+eksekusi saat load pertama, tanpa mengubah
perilaku/urutan render fitur apa pun dari sudut pandang user.

## Prinsip desain (non-negotiable)
1. **1 tahap = 1 modul.** Tidak boleh pindah >1 modul sekaligus ke lazy-load dalam
   1 sesi — supaya kalau ada regresi, gampang dilacak sumbernya.
2. **0 perubahan urutan/isi render.** Modul yang dipindah ke lazy-load harus tetap
   render exact sama seperti sekarang, cuma beda KAPAN kode-nya di-load.
3. **Fallback aman kalau lazy-load gagal** (mis. offline pas pertama buka tab itu) —
   reuse pola `window.__moduleLoadFail` yang sudah ada (index.html), tampilkan pesan
   jelas, jangan silent-fail seperti gap yang pernah terjadi di `app-bootstrap.js`
   (lihat komentar BUGFIX di file itu).
4. **Regression 1747 test tetap harus 100% PASS** tiap tahap, sebelum & sesudah build
   (pola baku proyek ini).
5. **Modul kandidat pertama harus yang PALING JARANG & PALING TERISOLASI** (dependency
   minim ke modul lain) — supaya tahap pertama jadi bukti-konsep berisiko rendah.

## Kandidat modul (diurut dari paling aman → paling berisiko)
> **UPDATE setelah audit dependency riil (lihat log di bawah): urutan awal draf ini
> SALAH untuk Renovasi — dipindah ke bawah setelah verifikasi.**

| Modul | Alasan aman/berisiko | Prioritas |
|---|---|---|
| `modules/business/sewakios.js` | Sudah diaudit & lazy-load selesai (Tahap 1a & 1b) — lihat "Audit dependency SewaKios" di bawah | **SELESAI** |
| `modules/home/renovasi.js` (Renov/RenovAI/RenovCalc) | **TERNYATA TIDAK AMAN dipindah tanpa kerja tambahan** — lihat "Audit dependency Renov" di bawah | Ditunda sampai guard ditambahkan |
| Torsi (Vehicle Selector, tersebar di `modules/vehicle/`) | Dipakai banyak tempat (Shop, Car Notes) → dependency lebih ramai | Tahap lanjutan |
| Shop Business Intelligence (`business-intelligence-presenter.js`) | Sudah diaudit — kedua titik panggil (`renderDashboard` live-wiring & `setShopTab`) ternyata SUDAH punya guard `typeof` sejak awal, lazy-load selesai tanpa kerja tambahan | **SELESAI** |
| `modules/shared/modules-render.js`, `modules-calc.js`, `modals.js` | Inti aplikasi, dipakai hampir semua fitur | **JANGAN dipindah** |

### Audit dependency Renov (dikerjakan, hasil: TIDAK aman tanpa kerja tambahan)
Grep semua pemakaian `Renov.`/`RenovAI.`/`RenovCalc.` di luar `renovasi.js` menemukan **7+ titik panggilan TANPA `typeof` guard**, termasuk yang paling kritis:

- **`modules/shared/modules-render.js:1048`** — `renderDashboard()` memanggil `Renov.render();` langsung, tanpa `typeof Renov!=='undefined'` check. `renderDashboard()` dipanggil dari PULUHAN titik `save()` di seluruh app (bukan cuma saat buka tab Aset/Renovasi) — kalau Renov belum ke-load, ini akan throw error dan menghentikan SISA render dashboard, bukan cuma bagian Renov-nya.
- Titik unconditional lain: `aset.js:1446` (`Renov.totals(p)`), `sewakios.js:77`, `tukang-absensi.js:658`, `linktx.js:189-190`, `tx-renov.js` (4 titik: baris 92-93, 122-123), `transaksi.js:730`.

**Implikasi**: memindahkan Renov ke lazy-load BUKAN "keluarkan dari build.js + tambah 1 baris `_loadScriptOnce()` di titik buka tab" seperti draf awal. Perlu tahap tambahan dulu:
1. **Tahap 1a (prasyarat, 0 perubahan perilaku)**: bungkus SEMUA 7+ titik panggilan di atas dengan `typeof Renov!=='undefined'` (pola sama seperti Pensiun/SewaKios yang sudah dibungkus guard di baris yang sama `tx-list-cashflow.js:189`). Ini sendiri sudah butuh regresi penuh karena menyentuh banyak file, TAPI risikonya rendah karena tidak mengubah kapan Renov di-load — cuma menambah jaring pengaman. ✅ SELESAI — lihat `docs/SESI-13-GUARD-RENOV-TYPEOF.md`.
2. **Tahap 1b**: baru setelah 1a beres & regresi hijau, keluarkan `renovasi.js` dari `build.js` & pasang `_loadScriptOnce()` sesuai mekanisme di atas. ✅ SELESAI — lihat `docs/SESI-13-LAZYLOAD-RENOV-TAHAP-1B.md`. Ternyata butuh 1 penyesuaian tak terduga di luar 4 langkah "Mekanisme teknis" di atas: `app-bootstrap.js` men-`Object.assign(window,{...})` banyak modul sekaligus dari identifier bare (`Renov,RenovAI,RenovCalc,...`) — kalau salah satu belum terdeklarasi (krn lazy-load), SELURUH baris itu gagal (ReferenceError) & modul LAIN di daftar yang sama ikut gagal ter-assign ke window. Fix: keluarkan 3 identifier itu dari daftar `Object.assign`, gantinya `renovasi.js` mendaftarkan `window.Renov/RenovAI/RenovCalc` sendiri di baris terakhir filenya begitu selesai dimuat (lazy maupun bundled).

Pelajaran untuk kandidat lain (SewaKios dkk): **jangan asumsikan "niche = aman"** dari nama fiturnya saja — WAJIB grep semua pemanggil dulu (pola: `grep -rn "\bNamaModul\." | grep -v nama-file-modul-itu-sendiri`) sebelum menetapkan prioritas, seperti yang seharusnya dilakukan dari awal untuk Renov.

### Audit dependency SewaKios (dikerjakan, hasil: sama seperti Renov — TIDAK aman tanpa guard)
Grep semua pemakaian `SewaKios.` di luar `sewakios.js` (exclude `backups/`) menemukan 2 titik **unconditional** yang berisiko sama seperti kasus Renov:

- **`modules/shared/modules-render.js` (dulu baris 1049)** — `renderDashboard()` memanggil `SewaKios.render();` langsung tanpa guard, persis pola bug Renov. ✅ **SUDAH DIPERBAIKI** — dibungkus `if(typeof SewaKios!=='undefined')`.
- **`modules/finance/transaksi.js` (dulu baris 748)** — `saveTx()` memanggil `SewaKios.applyPaymentLink(savedTxId);` tanpa guard di JALUR SETIAP transaksi baru disimpan (bukan cuma saat buka tab Sewa Kios) — kalau SewaKios belum ke-load, ini throw error & menghentikan sisa `saveTx()`. ✅ **SUDAH DIPERBAIKI** — dibungkus `typeof SewaKios!=='undefined'`.

Selain itu 2 titik lain sudah punya guard kondisional (`if(t.sewaKiosLinkId)`/`if(existingTx.sewaKiosLinkId)`) tapi belum ada `typeof` guard di dalamnya — ditambahkan juga untuk konsistensi & jaga-jaga (meski risikonya lebih rendah karena hanya kepanggil kalau field link itu sudah ada di transaksi):
- `modules/finance/tx-list-cashflow.js` — `SewaKios.onLinkedTxDeleted(t)` → sekarang `if(t&&t.sewaKiosLinkId&&typeof SewaKios!=='undefined')`.
- `modules/finance/transaksi.js` — `SewaKios.onLinkedTxEdited(existingTx)` → sekarang `if(existingTx.sewaKiosLinkId&&typeof SewaKios!=='undefined')`.

Titik lain (`modules/ai/feature-insights.js`, `renderDashboardSewaKiosReminder()` di `modules-render.js`) sudah aman: yang pertama sudah punya `typeof SewaKios!=='undefined'` guard, yang kedua hanya pernah dipanggil dari dalam `sewakios.js` sendiri (bukan dari jalur render umum), jadi tidak butuh guard tambahan.

**Status SewaKios sekarang**: **SELESAI (Tahap 1a & 1b)** — sama seperti Renov. Tahap 1a: semua titik panggil di luar modul sudah aman kalau modul belum ke-load (guard `typeof`). Tahap 1b: `sewakios.js` dikeluarkan dari `GROUP_A` (`scripts/build.js`), dimuat lazy lewat `ensureSewaKios()` (`index.html`, pola sama `ensureRenov()`) yang dipicu dari `setKeuanganTab()` (`tx-list-cashflow.js`) saat tab Aset & Proyek pertama dibuka, `SewaKios` dihapus dari `Object.assign(window,{...})` di `app-bootstrap.js` & sekarang mendaftarkan diri sendiri (`window.SewaKios=SewaKios`) di akhir `sewakios.js`. Build resmi (`node scripts/build.js`) sudah dijalankan & lolos — versi naik ke `?v=872`.

### Audit dependency Shop Business Intelligence (dikerjakan, hasil: TERNYATA sudah aman)
Grep semua pemakaian `BusinessIntelligencePresenter.` di luar filenya sendiri (exclude
`backups/`, `tests/`) menemukan cuma 2 titik panggil, dan **keduanya SUDAH punya guard
`typeof` sejak awal** (beda dari Renov/SewaKios yang harus diperbaiki dulu):
- `modules/shared/modules-render.js` — lewat `_safeRender('BusinessIntelligencePresenter', function(){if(typeof BusinessIntelligencePresenter!=='undefined')BusinessIntelligencePresenter.render();})` di `renderDashboard()`.
- `modules/shop/cobek-io.js` — di `setShopTab()`, sudah `if(typeof BusinessIntelligencePresenter!=='undefined')...`.

Modul ini juga TIDAK PERNAH ada di `Object.assign(window,{...})` (`app-bootstrap.js`) —
artinya semua pemanggil sudah konsisten pakai bare identifier + `typeof` guard, cocok
langsung dengan cara kerja `_loadScriptOnce()` tanpa perlu tambahan self-registrasi
`window.X=X` seperti Renov/SewaKios.

**Status Shop Business Intelligence sekarang**: **SELESAI (Tahap 1a otomatis terpenuhi +
Tahap 1b)**. Tahap 1b: `business-intelligence-presenter.js` dikeluarkan dari `GROUP_B`
(`scripts/build.js`), dimuat lazy lewat `ensureBusinessIntelligence()` (`index.html`) yang
dipicu dari `setShopTab()` (`cobek-io.js`) saat tab Shop > Business Intelligence pertama
dibuka. Build resmi sudah dijalankan & lolos — versi naik ke `?v=873`.


## Mekanisme teknis (per modul yang dipindah)
1. Keluarkan file modul dari `GROUP_A`/`GROUP_B` di `scripts/build.js` → jadi file
   berdiri sendiri, TIDAK ikut ter-bundle ke `app-bundle-a/b.min.js`.
2. Tambah 1 baris di titik "modul ini pertama dibuka" (mis. `showPage('aset')` atau
   klik tab terkait) yang panggil `_loadScriptOnce('modules/home/renovasi.js?v=NNN')`
   sebelum fungsi render modul itu dipanggil.
3. Fungsi render pemanggil (mis. `Renov.render()`) dibungkus guard
   `if(typeof Renov==='undefined'){await _loadScriptOnce(...);}` — pola sama seperti
   `ensureTesseract()`.
4. Modul yang dipindah TETAP didaftarkan ke `Object.assign(window,{...})` di
   `app-bootstrap.js`, tapi lewat `Object.defineProperty`/lazy getter supaya tidak
   error kalau belum ke-load saat boot (detail teknis diputuskan pas eksekusi Tahap 1,
   bukan di sini).

## Kriteria selesai per tahap
- Modul yang dipindah TETAP jalan identik dari sudut pandang user (buka tab →
  fitur muncul, mungkin ada jeda sepersekian detik pertama kali).
- Regression 1747/1747 PASS.
- `app-bundle-b.min.js` berkurang ukurannya sebesar kira-kira ukuran modul yang
  dipindah (diverifikasi dengan `ls -la` sebelum/sesudah).
- Tidak ada `console.error`/banner error baru saat modul itu dibuka pertama kali
  dalam kondisi offline (uji manual 1x).

## Non-goals (sengaja TIDAK dikerjakan di rencana ini)
- Tidak migrasi ke ES Modules (`type="module"`)/bundler modern (Vite/esbuild
  code-splitting) — terlalu besar, butuh restrukturisasi build system total.
  Kalau nanti mau ke arah situ, itu dokumen desain terpisah.
- Tidak mengubah `document.write(MODAL_HTML[n])` jadi cara lain — itu keputusan
  arsitektur terpisah, di luar scope lazy-load modul fitur ini (walau disebut
  sebagai rekomendasi terpisah sebelumnya).

## Langkah berikutnya
Renovasi, SewaKios & Shop Business Intelligence sudah selesai (Tahap 1a & 1b). Kandidat
tersisa hanya **Torsi** (Vehicle Selector, tersebar di ~70 file `modules/vehicle/`) — jauh
lebih besar & berisiko (dipakai Shop, Car Notes, banyak engine saling terkait), butuh audit
dependency penuh dulu sebelum eksekusi. Tunggu keputusan user: lanjut audit Torsi, atau
cukup sampai di sini.
