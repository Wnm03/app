# Sesi s477 — Tes Buka/Tutup Modal: daftarkan `investmentOwnersModal` ke sweep

Baseline: `kw_release_v1202_s477-modal-sweep-coverage-fix.zip` (sebelumnya
`kw_release_v1201_s476b-investment-planner-rewire.zip`).
Versi baru: **v1202 (s477-modal-sweep-coverage-fix)**.

## Latar belakang

"Tes Buka/Tutup Modal" (Pengaturan → Tes Buka/Tutup Modal) melaporkan
1 modal bermasalah: `investmentOwnersModal` ("⚖️ Atur Porsi Kepemilikan"
holding investasi) terdeteksi ADA di halaman (elemen `.overlay` dgn id
tsb dirender lewat `MODAL_HTML[92]`, S464) tapi **belum masuk sweep
manapun** di `self-test.js` — gap murni dokumentasi/coverage tes,
BUKAN bug fungsional (modal & fiturnya sendiri sudah jalan normal sejak
S466-468 lewat `InvestmentListUI.openOwnersModalForEdit()`).

## Perubahan

1. **`self-test.js`** (source) & **`app-bundle-b.min.js`** (embedded
   copy yang benar-benar dieksekusi runtime — self-test.js DIBUNDLE ke
   app-bundle-b.min.js oleh `build.js`, jadi kedua tempat WAJIB
   disinkronkan manual di sandbox ini karena esbuild tidak tersedia):
   1 spec baru ditambahkan ke `MODULE_METHOD_MODAL_SPECS`, tepat di
   bawah spec `Aset.openOwnersModal()` (posisi analog):
   ```js
   {label:'InvestmentUI.openOwnersModal()',id:'investmentOwnersModal',
   call:()=>{ InvestmentUI.openOwnersModal(); }},
   ```
   Beda dari spec `assetOwnersModal` (yang perlu `before`/`after`
   push+hapus 1 aset dummy ke `D.assets` supaya `Aset.editId` terisi):
   `InvestmentUI.openOwnersModal(id)` dipanggil **TANPA id** tetap aman
   — `h` jadi `null`, modal tetap render dalam mode "holding tidak
   ditemukan" lalu `openModal()` tetap terpanggil (lihat
   `investasi-list-view.js`/bundle baris terkait `InvestmentUI`,
   S464). 0 mutasi data (`D.investments` tidak disentuh sama sekali),
   konsisten dgn prinsip alat ini ("aman dijalankan kapan saja, tidak
   pernah menambah/mengubah data Anda").
2. Konstanta versi build disamakan ke `s477-modal-sweep-coverage-fix` di:
   `chat-action-handlers.js`, `modules/shared/features-helpers-global-
   security.js` (`APP_BUILD_VERSION` & `PRODUCTION_BUILD_SYNCED_VERSION`
   — dua-duanya, supaya badge "✅ Sinkron" di Tentang Aplikasi tetap
   hijau), `modules/shared/modals.js`, `modules/shared/modules-render.js`,
   `modules/shared/modules-calc.js`, plus salinan di kedua bundle
   (`app-bundle-a.min.js`, `app-bundle-b.min.js`).
3. Cache-busting query string `?v=1201` → `?v=1202` di `index.html` &
   `app_production.html` (semua `<script>`/`<link>` yang mereferensikan
   file modul + kedua bundle), dan `CACHE_NAME` di `sw.js`
   (`kw-cache-v1201` → `kw-cache-v1202`).

## Yang TIDAK diubah (sengaja)

- Tidak ada perubahan logic fungsional apa pun di luar `self-test.js`/
  `app-bundle-b.min.js` — murni menambah 1 entry coverage tes.
- `docs/s476-PLAN-migrate-investasi-to-holdings.md` &
  `s476b-SESSION-NOTE.md` — dibiarkan apa adanya (dokumen historis
  sesi sebelumnya, bukan tempat sesi ini).

## Verifikasi yang sudah dijalankan

- `node --check self-test.js` — lolos.
- `node --check app-bundle-a.min.js` / `app-bundle-b.min.js` — lolos.
- `node --check` pada 5 file sumber yang versinya di-bump — semua lolos.
- **BELUM dijalankan** (di luar kemampuan sandbox ini): `node --test
  tests/*.test.js` penuh, dan run manual "Tes Buka/Tutup Modal" di
  browser sungguhan untuk konfirmasi visual `104/115` → `105/115` modal
  aman, 0 bermasalah. Mohon N jalankan kedua ini sebelum menjadikan
  v1202 baseline sesi berikutnya.
