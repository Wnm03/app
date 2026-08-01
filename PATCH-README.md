# Patch s350 — Fix race condition dialog custom ("tombol Bayar/Riwayat macet, 0 toast")

Patch ini menutup laporan user: tombol "📋 Katalog"/Import PDF tidak ada
respon/toast, dan tombol "Riwayat"/"✅ Bayar" di Tagihan delay/macet
(baru "hidup" setelah tap tombol lain).

## Akar masalah (diverifikasi ke source, bukan tebakan)

1. **`modules/shared/modal-navigasi.js`** — `askConfirm()`/`showPromptModal()`/
   `showChoiceModal()`/`showAlertModal()`/`showPinPromptModal()` masing-masing
   cuma punya SATU variabel resolver module-scope. Kalau terpanggil 2x
   sebelum jawaban pertama masuk (double-tap tombol "Bayar" — umum di HP),
   panggilan kedua **menimpa** resolver panggilan pertama -> Promise pertama
   jadi orphan permanen, tanpa toast/error (bukan reject, cuma diam
   menggantung).
   **Fix:** `_queueDialog()`/`_resolveDialog()` — antrean per-jenis dialog,
   tidak ada lagi Promise yang hilang. Signature pemanggil tidak berubah.

2. **`modules/shared/features-helpers-global-security.js`** —
   `_dataActionClickHandler()` tidak mencegah 1 elemen yang sama terpicu 2x
   nyaris bersamaan selagi action async-nya masih pending.
   **Fix:** guard `dataset.pendingAction` — klik ulang pada elemen yang
   sama diabaikan sampai action pertama selesai/gagal.

3. **`modules/asset/aset.js`** — `IDBStore._open()` (`indexedDB.open()`)
   tidak punya `onblocked` maupun timeout; kalau open request blocked,
   `_dbPromise` gantung selamanya -> semua fitur lewat IDBStore (Vehicle
   Catalog/Import PDF Katalog/dll) jadi tombol mati tanpa toast.
   **Fix:** tambah `onblocked` (log) + timeout 8 detik yang reject dgn
   pesan jelas & reset cache, supaya paling buruk muncul toast error yang
   bisa dilaporkan.

Detail lengkap: `docs/sessions/FIX-v1014-s350-dialog-resolver-race-bayar-riwayat.md`.

## Test

`tests/modal-navigasi-dialog-queue.test.js` (baru) — 2 test membuktikan
panggilan `askConfirm()`/`showPromptModal()` concurrent semuanya resolve
dengan jawaban masing-masing yang benar, tidak ada yang orphan/hang.

Full suite: **2404/2404 pass, 0 fail** (`node --test tests/*.test.js`).

## Cara pasang

Timpa file-file berikut ke lokasi yang sama persis di project:

```
modules/shared/modal-navigasi.js
modules/shared/features-helpers-global-security.js
modules/asset/aset.js
tests/modal-navigasi-dialog-queue.test.js   (baru)
app-bundle-a.min.js
app-bundle-b.min.js
index.html
app_production.html
sw.js
docs/FILE-MAP.md
docs/COVERAGE-PER-MODULE.md
```

`app-bundle-a.min.js`/`app-bundle-b.min.js` sudah di-rebuild otomatis lewat
`node scripts/build.js` (WAJIB di-upload juga — bukan cuma source-nya,
karena app_production.html/index.html memuat bundle, bukan file source
individual). Versi naik dari v1012 → **v1014** (`?v=1014` di HTML,
`kw-cache-v1014` di `sw.js`).

Setelah dipasang: hard-refresh / clear cache PWA supaya `sw.js` versi baru
kepakai (service worker lama masih bisa nyangkut cache versi lama sampai
di-update).
