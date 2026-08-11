# Sesi s488 — Tes Buka/Tutup Modal: daftarkan `titipanCommitmentModal` & `titipanReturnModal` ke sweep

Baseline: `kw_release_v1216_s487-pmicons-badge-tagihan-utang.zip`.
Versi baru: **v1218 (s488-titipan-modal-sweep-fix)**.

## Latar belakang

"Tes Buka/Tutup Modal" (Beranda → 🧪 Tes Buka/Tutup Modal) melaporkan
1 modal bermasalah: `titipanCommitmentModal` ("💰 Pokok Dana Titipan",
S485d) & `titipanReturnModal` ("↩️ Catat Pengembalian Dana Titipan",
S486) terdeteksi ADA di halaman (elemen `.overlay` dgn id tsb dirender
lewat `MODAL_HTML`, `modules/shared/modals.js`) tapi **belum masuk
sweep manapun** di `self-test.js` — gap murni dokumentasi/coverage tes,
BUKAN bug fungsional (kedua modal & fiturnya sendiri sudah jalan normal
lewat `DanaTitipanCommitmentUI.open()`/`DanaTitipanReturnUI.open()` di
`modules/finance/dana-titipan-portfolio-presenter.js`).

## Perubahan

1. **`self-test.js`** (source) & **`app-bundle-b.min.js`** (embedded
   copy yang benar-benar dieksekusi runtime — self-test.js DIBUNDLE ke
   app-bundle-b.min.js oleh `build.js`, jadi kedua tempat WAJIB
   disinkronkan): 2 spec baru ditambahkan ke `MODULE_METHOD_MODAL_SPECS`,
   tepat di bawah spec `InvestmentWatchUI.openModal()` (posisi analog
   dgn spec-spec `investmentOwnersModal`/`investmentModal` di atasnya):
   ```js
   {label:'DanaTitipanCommitmentUI.open()',id:'titipanCommitmentModal',
   call:()=>{ DanaTitipanCommitmentUI.open(); }},
   {label:'DanaTitipanReturnUI.open()',id:'titipanReturnModal',
   call:()=>{ DanaTitipanReturnUI.open(); }},
   ```
   Sama seperti pola `InvestmentUI.openOwnersModal()` (S477):
   `DanaTitipanCommitmentUI.open(ownerId)` & `DanaTitipanReturnUI.open
   (ownerId)` dipanggil **TANPA `ownerId`** tetap aman —
   `DanaTitipanCommitmentUI.open()` render dropdown owner dgn opsi
   "— Belum ada owner di holding investasi —" kalau
   `listExistingOwners()` kosong; `DanaTitipanReturnUI.open()` render
   `titipanReturnOwnerDisplay` kosong (`known` jadi `undefined`).
   Keduanya lalu tetap memanggil `openModal()` di baris terakhir. 0
   mutasi data (`D` tidak disentuh sama sekali), jadi TIDAK perlu
   before/after seperti spec `assetOwnersModal`.
2. Konstanta versi build disamakan ke `s488-titipan-modal-sweep-fix` di:
   `chat-action-handlers.js`, `modules/shared/features-helpers-global-
   security.js` (`APP_BUILD_VERSION` & `PRODUCTION_BUILD_SYNCED_VERSION`
   — dua-duanya, supaya badge "✅ Sinkron" di Tentang Aplikasi tetap
   hijau), `modules/shared/modals.js`, `modules/shared/modules-render.js`,
   `modules/shared/modules-calc.js`, plus salinan di kedua bundle
   (`app-bundle-a.min.js`, `app-bundle-b.min.js`) — semua via
   `node scripts/build.js s488-titipan-modal-sweep-fix`.
3. Cache-busting query string `?v=1216` → `?v=1218` di `index.html` &
   `app_production.html` (semua `<script>`/`<link>` yang mereferensikan
   file modul + kedua bundle), dan `CACHE_NAME` di `sw.js`
   (`kw-cache-v1216` → `kw-cache-v1218`) — otomatis via `build.js`.

## Yang TIDAK diubah (sengaja)

- Tidak ada perubahan logic fungsional apa pun di luar `self-test.js`/
  `app-bundle-b.min.js` — murni menambah 2 entry coverage tes.
- `s487-SESSION-NOTE.md`, `PATCH-README-s487.md`, `TODO.md`,
  `docs/RELEASE-GATE-LOG.md` (entri lama) — dibiarkan apa adanya
  (dokumen historis sesi sebelumnya).

## Verifikasi yang sudah dijalankan

- `node scripts/build.js s488-titipan-modal-sweep-fix` — lolos, versi
  konstanta tersinkron di 5 file source, kedua bundle ditulis ulang
  (esbuild tidak tersedia di sandbox ini → bundle TANPA minifikasi,
  tapi 100% valid & aman dipakai — lihat catatan build.js), sintaks
  kedua bundle lolos `node --check`.
- `node --test tests/*.test.js` → **3178/3178 lolos, 0 gagal** (0
  regresi dari baseline s487).
- `node scripts/verify-window-expose.js` → lolos.
- `node scripts/verify-bundle-freshness.js` → lolos, kedua bundle segar.
- `node scripts/verify-release-ready.js` → lolos DENGAN 2 override
  manual (dicatat di `docs/RELEASE-GATE-LOG.md`):
  - `lint`: eslint tidak terpasang (sandbox tanpa akses jaringan/npm
    registry).
  - `minify`: esbuild tidak terpasang (sandbox tanpa akses jaringan) —
    bundle lebih besar dari versi ter-minify sebelumnya tapi tervalidasi
    sintaks & fungsinya identik.
- **BELUM dijalankan** (di luar kemampuan sandbox ini, perlu browser
  sungguhan): run manual "🧪 Tes Buka/Tutup Modal" di aplikasi utk
  konfirmasi visual "107/119 modal aman · 1 bermasalah" → "119/119
  modal aman · 0 bermasalah" — kalau ada esbuild di environment
  produksi, disarankan jalankan `npm install --save-dev esbuild` lalu
  `node scripts/build.js s488-titipan-modal-sweep-fix` ulang supaya
  bundle kembali terminifikasi seperti rilis-rilis sebelumnya.
