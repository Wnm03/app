# SESSION-NOTE-S1587 — Fix minimal: dropdown Kategori/Subkategori (txCat/txSubCat) tidak muncul saat tap pertama

**Basis:** dibangun di atas `app-main__63_.zip` (versi 1586, APP_BUILD_VERSION
`s755-fuel-jenis-unknown-edit-legacy`). Timpa semua file di ZIP patch ini ke
project asli. Versi baru: **1587**, `s756-fuel-jenis-unknown-edit-legacy`.

## Catatan penting: klaim sesi sebelumnya TIDAK ditemukan di source

Instruksi awal sesi ini menyebut item 1 ("tambah `focus:'onfocus'` ke
dispatcher") sudah selesai di sesi sebelumnya. **Itu tidak benar untuk ZIP
`app-main__63_.zip` yang diupload** — saya cek langsung
`modules/shared/features-helpers-global-security.js` di ZIP itu maupun di
`app-main-fix-bbm-sync-PATCH.zip`, dan dispatcher `_dataActionInputChangeHandler`
di keduanya **belum** punya entri `focus` di map `attrName`, dan belum ada
`document.addEventListener('focus', ...)` di mana pun (termasuk di kedua
bundle). Jadi item 1 dikerjakan ULANG dari nol di sesi ini, bukan cuma
verifikasi.

## Root cause bug yang dilaporkan user

`txCat`/`txSubCat` di `txModal` (form Tambah/Edit Transaksi) pakai inline
`onfocus="onTxCatInput()"` / `onfocus="onTxSubCatInput()"` untuk membuka
suggest-box begitu field di-tap (sebelum user mulai mengetik). Dispatcher
data-action pusat (`_dataActionInputChangeHandler`) sebelumnya cuma
menangani event `input`/`change`/`blur`/`keydown` — **tidak ada** jalur
`data-onfocus=`. Kalau field ini dikonversi ke `data-oninput=`/`data-onblur=`
tanpa dispatcher mendukung `focus`, dropdown kategori/subkategori TIDAK
PERNAH muncul saat field pertama kali di-tap (cuma muncul setelah mulai
ngetik lewat `data-oninput=`) — persis gejala yang dilaporkan user.

## Perubahan

1. **`modules/shared/features-helpers-global-security.js`**
   - `attrName` map: tambah `focus:'onfocus'`.
   - `document.addEventListener('focus', _dataActionInputChangeHandler, true)`
     dipasang di capture phase — sama seperti pola `blur`/`keydown` yang
     sudah ada (event `focus` juga TIDAK bubble tapi capture phase
     document-level tetap menangkapnya).

2. **`modules/shared/modals.js`** — `txCat`/`txSubCat` (6 atribut inline)
   dikonversi ke `data-*`:
   - `oninput="onTxCatInput()"` → `data-oninput="onTxCatInput"`
   - `onfocus="onTxCatInput()"` → `data-onfocus="onTxCatInput"`
   - `onblur="setTimeout(()=>{hideSuggestBox('txCatSuggestBox');updateTxVehiclePanels();},150)"`
     → `data-onblur="_txCatOnBlur"` (fungsi baru, lihat poin 3)
   - Sama persis untuk `txSubCat` (`_txSubCatOnBlur`).
   - Dispatcher hanya bisa memanggil NAMA FUNGSI (bukan eval ekspresi arrow
     inline), jadi `onblur` yang tadinya `setTimeout(()=>{...},150)` inline
     tidak bisa langsung jadi `data-onblur="setTimeout"` — makanya dibungkus
     jadi 2 fungsi named kecil.

3. **`modules/finance/transaksi.js`** — 2 fungsi baru ditambahkan tepat
   setelah `selectTxSubCat()`: `_txCatOnBlur()` dan `_txSubCatOnBlur()`,
   isinya persis `setTimeout(()=>{hideSuggestBox(...);updateTxVehiclePanels();},150)`
   1:1 dari inline lama (delay 150ms dipertahankan supaya klik item di
   suggest-box masih sempat kena `onmousedown` sebelum box disembunyikan
   oleh blur). Function declaration top-level otomatis jadi global
   (window-scope) di script non-module — tidak butuh `window.X=X` eksplisit
   (beda dari pola modul `const X={...}`, sudah dicek lolos
   `verify-window-expose.js`).

4. **`tests/data-oninput-onchange-dispatcher.test.js`** — test lama
   "event.type di luar input/change/blur/keydown diabaikan" pakai `focus`
   sebagai contoh event yang diabaikan; itu SEKARANG SALAH karena `focus`
   didukung. Diganti jadi pakai `mouseover` (event yang genuinely tidak
   didukung), dan ditambah test baru yang mengunci bahwa `focus` sekarang
   benar-benar ter-dispatch ke `data-onfocus=`.

## Scope yang SENGAJA belum dikerjakan (sesuai disiplin one-task-per-session)

- **249 atribut inline sisanya** di `modals.js` (field lain: `txBbmSpbu`,
  `txShopSaleCustName`, `pName`, `prName`, `billName`, `stockName`, dll)
  masih pakai `oninput=`/`onfocus=`/`onblur=` inline — belum dikonversi.
  Field-field itu SEKARANG SUDAH BISA dikonversi kapan saja (dispatcher
  `focus` sudah siap dari sesi ini), tapi konversinya sendiri belum
  dikerjakan — cakupan sesi ini cuma `txCat`+`txSubCat` sesuai laporan bug.
- Catatan "SA1-SA9 TUNTAS 100%" di `index.html` (kalau ada) BELUM
  diperbaiki/diberi disclaimer di sesi ini — masih PR untuk sesi
  berikutnya, supaya tidak menyesatkan.

## Build & test

- `node scripts/build.js` dijalankan — versi naik dari 1586 → **1587**,
  `s755-...` → `s756-...` (nama sesi lama dipertahankan karena tidak diberi
  nama custom). Sintaks kedua bundle lolos `node --check`.
- `esbuild` TIDAK terpasang di environment build ini (sandbox tanpa akses
  jaringan) → bundle **belum diminify** (lebih besar dari versi
  sebelumnya, tapi 100% valid). `npm install --save-dev esbuild` lalu
  build ulang direkomendasikan di environment yang ada akses jaringan,
  supaya ukuran bundle kembali kecil.
- `verify-window-expose.js` → OK (0 modul yang gagal expose).
- `verify-release-ready.js` GAGAL di 2 gate (`lint`: eslint tidak
  terpasang; `minify`: esbuild tidak terpasang) — KEDUANYA murni
  keterbatasan sandbox (bukan masalah kode), di-override manual dengan
  `CONFIRM_LINT_UNAVAILABLE_REASON=...` / `CONFIRM_UNMINIFIED_REASON=...`
  (tercatat di `docs/RELEASE-GATE-LOG.md`). **Rekomendasi: jalankan ulang
  `npm run lint` & rebuild dgn esbuild di environment biasa sebelum rilis
  final**, untuk memastikan tidak ada regresi lint yang kelewat di sini.
- `node --test tests/*.test.js` (full suite, 5654 test): **5650 pass, 4
  fail** — 4 kegagalan itu SUDAH ADA sebelum sesi ini & TIDAK terkait
  perubahan di sini (semuanya soal dropdown "Jenis BBM" S750:
  `tests/fuel-jenis-dropdown-s750.test.js` x2, dan markup-freeze S751/S752
  — regex test-nya mengecek `onSelectChange('bbmJenis','bbmHarga')` 2-arg,
  padahal source aktualnya sudah 3-arg
  `onSelectChange('bbmJenis','bbmHarga',curVehicleId)`; kemungkinan test
  ini ketinggalan update saat argumen ke-3 ditambahkan di sesi lain).
  Bug pre-existing ini di luar scope sesi ini — dicatat di sini supaya
  tidak lupa, bukan diperbaiki sekarang.

## File yang berubah (masuk ZIP patch ini)

```
app-bundle-a.min.js
app-bundle-b.min.js
app_production.html
chat-action-handlers.js          (cuma sinkronisasi versi, tidak ada logic berubah)
index.html
modules/finance/transaksi.js
modules/shared/features-helpers-global-security.js
modules/shared/modals.js
modules/shared/modules-calc.js   (cuma sinkronisasi versi)
modules/shared/modules-render.js (cuma sinkronisasi versi)
sw.js
tests/data-oninput-onchange-dispatcher.test.js
docs/COVERAGE-PER-MODULE.md      (regenerated otomatis oleh build.js)
docs/FILE-MAP.md                 (regenerated otomatis oleh build.js)
docs/RELEASE-GATE-LOG.md         (log override gate, lihat di atas)
```

## Rekomendasi tindak lanjut (sesi berikutnya)

1. Audit & konversi 249 atribut inline sisanya (list di s.d.a) sekarang
   dispatcher `focus` sudah tersedia.
2. Perbaiki/beri disclaimer catatan "SA1-SA9 TUNTAS 100%" di `index.html`.
3. Investigasi & perbaiki 4 test `fuel-jenis-dropdown-s750`/S751/S752 yang
   gagal (pre-existing, di luar scope sesi ini).
4. Kalau ada akses jaringan: `npm install --save-dev eslint esbuild`, lalu
   jalankan `npm run check` penuh (lint + verify-window-expose + test +
   build minified) sebelum rilis final, supaya 2 gate yang di-override di
   sesi ini benar-benar terverifikasi (bukan cuma diasumsikan aman).
