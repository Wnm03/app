# Fase 1C — S2760 (akumulasi di atas S2759)

## Dasar bukti
Capture browser nyata (Playwright 1.63 + Chromium bawaan, `tools/capture-fase1b-extended.py`, data seed sintetis, 3 viewport, service worker diblokir): 60 screenshot, 0 `missing_controls`, 0 error console, 0 page error, 0 overflow horizontal.
Hasil di `docs/screenshots-fase1b/` (`capture-report.json` memuat metrik per screenshot).

## Perbaikan runner (tools/capture-fase1b-extended.py)
- Modal tambah transaksi: tombol `openTxModal` hanya tampil di Kelola -> sub-tab Transaksi; runner S2759 tetap di Ringkasan sehingga 3 modal masuk `missing_controls`. Sekarang membuka sub-tab Transaksi lebih dulu.
- Metrik per screenshot (`metrics`): teks <12px, kontrol <40px, overflow horizontal. Sebelumnya overflow/error hanya mencerminkan screenshot terakhir.

## Perubahan CSS (hanya CSS; tanpa markup/logic)
Teks: `tokens.css` blok "FASE 1C (S2760)" — lantai 12px (`var(--fs-xs)`) untuk `.tx-meta`, `.bbm-lbl`, `.shop-stock-pill`, `.shop-price-label`, `#keuBillStatGrid .stat-label`, `.pwa-domain-page .pwa-action-card small`, `.pwa-domain-page .pwa-status-pill` (+ varian ber-ID). Penyebab: `[data-theme] .tx-meta{10px}`, `.bbm-lbl,.tx-meta{11px}`, `.shop-stock-pill{10.5px}`, `.shop-price-label{9.5px}`, aturan ber-ID di Tagihan dan `pwa-ui-layer.css` hero Shop. Spesifisitas dinaikkan, tanpa `!important`.
Sentuh: `modern-ui-layer.css` blok "FASE 1C (S2760)" (<=1024px / pointer:coarse) — tombol aksi produk Shop, `.acc-card-edit/.acc-card-del` 44x44 (tombol edit digeser ke `right:56px` agar tidak bertumpuk), `.export-half` min-height 44px. Tanpa selector `[data-action]`.

## Perbaikan sinkron versi (regresi S2757)
S2757 menaikkan `?v=` HTML dan cache `sw.js` ke 2757 tanpa menaikkan `APP_BUILD_VERSION` (tetap ...2756), sehingga tes `SA13` (`build-version-cache-sync-sa13`) gagal sejak S2757. S2760 menjalankan `SKIP_LINT=1 node scripts/build.js s2433-fase1c-touch-floor-2760`: lima source berkonstanta versi, kedua bundle, HTML, `sw.js` (`kw-cache-v2760`), FILE-MAP dan COVERAGE ikut dibangun ulang dan sinkron. SA13 kini PASS.

## Hasil ukur (jumlah dari semua keadaan yang ditangkap)
| Viewport | Teks <12px sebelum -> sesudah | Kontrol <40px sebelum -> sesudah |
|---|---|---|
| mobile 390 | 45 -> 7 | 61 -> 33 |
| tablet 768 | 47 -> 9 | 52 -> 24 |
| desktop 1440 | 87 -> 9 | 127 -> 127 (Fase 4, tidak disentuh) |

## Sisa (tidak diperbaiki di S2760, dengan alasan)
- Teks 11px dari atribut `style="font-size:11px"` inline yang ditulis renderer JS (Arus Kas `.cat-bar`, hint Kasir): butuh ubah JS/markup, bukan CSS aman.
- Kontrol <40px berupa utility class + `data-action` (`.u-fs12.u-pointer`, baris `goToList`, `resetLaporanFilter`, `.cat-bar`): selector aman tidak ada tanpa menyentuh markup.
- Desktop: kontrol <40px menunggu Fase 4 (layout desktop).
- `!important` tetap 185; `@layer` belum.

## Verifikasi
- Tes fokus Fase 0/1/1B/1C + SA13: 15/15 PASS.
- Full suite dan browser capture: lihat PATCH-MANIFEST.md (angka dicatat apa adanya).
- Release lint/minify penuh belum dijalankan (`SKIP_LINT=1`; jaringan tidak tersedia).
