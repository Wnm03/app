# PATCH SHOP — S2728–S2735 (kumulatif, revisi R3)

Baseline: `app-main (1).zip` · Acuan: `PATCH-S2727-rencana-perapian-shop.zip` (tidak disertakan dalam upload; keputusan desain mengikuti ringkasan sesi sebelumnya).
Mode: overlay-only, BUKAN full release. Versi build tetap `s2433-shop-stock-prevtx-cathint-2739` / `?v=2739` / `kw-cache-v2739`.

## Koreksi terhadap revisi sebelumnya (R1)
1. Bundle R1 tidak diminifikasi (A 1,7 MB, B 5,2 MB). R2 dibangun ulang dengan esbuild 0.24.0 yang tersedia di `node_modules` baseline: `REQUIRE_MINIFY=1 node scripts/build.js 2739` → A 1.135.650 B, B 2.555.650 B (ukuran setara baseline).
2. `DELETE-FILES.txt` R1 hanya berisi komentar dan akan MENIMPA manifest kumulatif baseline. R2 membawa isi baseline apa adanya (tidak ada penghapusan baru).
3. `FILE-HASHES-SHA256.txt`: hash `modern-ui-layer.css` diperbarui (satu baris) agar tes S256AU lolos.

## Perubahan Shop (tidak berubah dari R1)
- Isi visual FAB Shop yang mati dihapus; anchor `#shopFab` dipertahankan. `shopFabOpenOrder`/`shopFabOpenProduct` tetap.
- Kontrol impor/ekspor Etalase dibungkus `<details>`; semua `data-action` utuh.
- Kartu tren duplikat di Laporan dihapus; kartu tren di Riwayat tetap.
- CSS Shop ditambahkan di `modern-ui-layer.css` (bukan `styles.css`).
- `shop-sot-governance.js` dan `shop-professional-audit.js` tetap dormant.

## Verifikasi (overlay di atas baseline, bukan file patch terpisah)
- Build minify wajib: PASS. `verify-bundle-freshness`, `verify-window-expose`, `verify-version-integrity`: PASS.
- Tes Shop/Cobek: 410/410 PASS.
- Full suite `node --test tests/*.test.js` setelah overlay + penerapan `DELETE-FILES.txt`: 9418 tes, 0 gagal.
- Baseline murni: 3 tes gagal (S1780, s1608, S2308) karena file retired S2720 belum dihapus dari zip. Penerapan `DELETE-FILES.txt` kumulatif menyelesaikannya. Tanpa penerapan itu, hasil overlay sama persis (3 gagal, bukan regresi patch).
- Browser E2E: DIJALANKAN di Chromium (Playwright 1.56, `/opt/pw-browsers`). Lihat bagian Audit browser. (Catatan R2 awal yang menyebut Chromium tidak tersedia keliru.)

## Langkah aplikasi
1. Ekstrak ZIP ini di atas repo (timpa).
2. Jalankan `node scripts/apply-delete-manifest.js` (hapus file retired kumulatif).
3. Jalankan E2E smoke di mesin ber-Chromium sebelum deploy.

## Belum diimplementasikan (ditahan, sama seperti R1)
- S2728: 7 wrapper mati — referensi lintas-file/source guard belum dipetakan.
- S2732: lipat field opsional modal — perlu audit markup/handler per field.
- S2734: konsolidasi guard `typeof` — fallback mungkin bagian kontrak VM tests.
- S2735: mutasi DOM `pwa-ux-performance.js` — butuh browser E2E.

## Audit browser (Chromium, overlay vs baseline, viewport 320/360/390/768/1280)
Hasil: tidak ditemukan bug regresi fungsional.
- E2E existing (domain-uang-shop-carnotes 41/41, tx-links-shop-carnotes 21/21, edit-integritas-backup 22/22, vehicle-isolation 9/9, run-e2e 26/26): hasil identik di baseline dan patch, 0 pageerror.
- Smoke Shop: tap target <40px 2 -> 0; scroll horizontal tidak ada; kartu tren 2 -> 1; modal produk/order identik; tinggi tiap tab turun ±32 px, Etalase -392 px.
- Dengan 18 transaksi seed: angka Laporan (omzet/untung/margin) dan tren Riwayat identik dengan baseline; 8 tab terender tanpa error; jumlah data-action per tab tidak berubah.
- `<details>` Impor/Ekspor: tertutup default, terbuka via keyboard (Enter), 8 tombol 179x44 px; 7 tombol membuka modal/filechooser yang benar.
- Tombol hero `shopFabOpenOrder`/`shopFabOpenProduct` membuka modal; navigasi Shop -> Beranda -> Shop tanpa error; service worker mendaftar, cache `kw-cache-v2739`, 12 entri pre-cache semua 200.
- `lapGrafikBars` dihapus dari HTML; `renderGrafik('lapGrafikBars')` di cobek-order.js tetap aman (guard `if(!el) return`).

## Gap yang tersisa (bukan regresi)
- `smoke --assert` masih melanggar 3 ambang S2727: kasir.paneTop 532 (target 400, sama dengan baseline), etalase.firstProductY 1544 (target 1100, baseline 1936), etalase.paneH 3330 (target 2600, baseline 3722).
- Kode mati: `shopFabToggleMain` di action-wrappers.js (tombolnya sudah tidak ada) — dipertahankan sesuai S2728.
- Tidak terverifikasi: Export Excel (butuh SheetJS dari cdnjs; sandbox tanpa internet, perilaku sama di baseline), WebKit/iOS dan perangkat fisik.


## R3 — pemadatan blok atas Shop + S2732 (produk)
Tiga ambang S2727 kini lolos pada `smoke --assert` (390 px): Kasir paneTop 532→393 (target 400), Etalase firstProductY 1544→1065 (1100), Etalase paneH 3330→2557 (2600).
- Hero/KPI (CSS, `modern-ui-layer.css`, ≤650 px): heading hero disembunyikan secara visual (aria-labelledby tetap valid), teks kecil kartu aksi disembunyikan, tombol tetap 48 px; KPI & kartu Modal Stok dirapatkan.
- Etalase: kartu Kategori Produk bisa dilipat (`etalaseKategoriCard`); kartu Rekomendasi Harga, Rekomendasi Restock, dan Kategori default TERTUTUP via `CARD_COLLAPSE_DEFAULT_CLOSED` (pilihan pengguna tersimpan di `cardCollapsePrefs`). Preorder sengaja tidak dilipat. `#cobekKategoriList` diberi scroll sendiri (maks 420 px).
- S2732 (modal produk): reseller, diskon, berat, dimensi dibungkus `<details id="pOptionalFold" data-fold-auto>`. Helper `_syncFoldAutoOpen` (modal-navigasi.js) membuka lipatan otomatis bila ada field terisi (mode edit) dan menutupnya saat modal baru dibuka. Nilai/handler field tidak berubah (simpan produk via lipatan terverifikasi).
- S2732 (modal order): `pwa-ux-performance.js` SUDAH melipat info pelanggan saat runtime (`orderCustomerFold`) dan mengelompokkan Pembayaran; lipatan HTML tambahan sempat dicoba lalu dibatalkan karena bertabrakan. Perubahan yang tersisa hanya menandai `orderCustomerFold` dengan `data-fold-auto` dan memanggil helper di `Order.renderItems()` agar lipatan terbuka bila terisi (edit transaksi, preorder→order).
- Hash `FILE-HASHES-SHA256.txt` disinkronkan (`scripts/refresh-file-hashes.py --write`).

## Gap yang tersisa (R3)
- Perubahan perilaku: Rekomendasi Harga/Restock kini tertutup awalnya; keluarkan kunci itu dari `CARD_COLLAPSE_DEFAULT_CLOSED` bila tak diinginkan (firstProductY akan melewati 1100).
- Tidak diverifikasi: Export Excel (SheetJS cdnjs, sandbox tanpa internet), WebKit/iOS, perangkat fisik.
- Perbandingan angka Laporan/tren dengan 18 transaksi seed tidak diulang pada R3 (tidak ada perubahan logika angka; hanya presentasi, lipatan, dan satu panggilan helper).
- `shopFabToggleMain` (kode mati) tetap dipertahankan.
