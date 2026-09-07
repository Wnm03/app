# AUDIT S1588 — Atribut event inline yang di-generate dinamis (di luar cakupan SA1-SA9/SA10a)

**Kenapa dokumen ini ada:** disclaimer CSP di `index.html`/`app_production.html`
menyatakan migrasi atribut event inline "TUNTAS 100%" (SA1-SA9) dan sisa 105
blok `<script>` inline "TUNTAS" (SA10a). Kedua klaim itu **benar untuk 2 file
HTML statis itu saja** (diverifikasi ulang sesi ini, tetap 0 baris). Tapi
dibaca sebagai "seluruh aplikasi", klaimnya **salah** — audit repo-wide sesi
ini menemukan atribut event inline asli yang di-generate dinamis oleh
`modules/*.js` lalu di-inject ke DOM lewat `.innerHTML=`, jadi tidak pernah
kena grep yang cuma menyisir file HTML.

## Metode audit

```
grep -rocP '(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)="' \
  --include="*.js" . \
  | grep -v "/tests/" | grep -v "^\./docs/" | grep -v "^\./backups/" \
  | grep -vE "app-bundle-[ab]\.min\.js"
```
(`docs/`, `backups/`, dan `app-bundle-*.min.js` dikecualikan karena isinya
salinan/cermin dari source `modules/*.js` yang sudah dihitung — bukan sumber
independen, supaya tidak dobel-hitung.)

Satu contoh dikonfirmasi manual sampai ke titik injeksi DOM-nya (bukan cuma
tebak dari pola teks): `modules/asset/aset-owners.js`, fungsi
`_ownerNameFieldHtml()` mengembalikan string berisi
`oninput="Aset.onOwnerNameInput(...)"`, lalu dipakai lewat
`listBox.innerHTML=...` di `_renderOwnersList()`.

## Hasil: 123 kemunculan nyata di 38 file

| File | Jumlah |
|---|---|
| modules/asset/investasi-view.js | 10 |
| modules/asset/aset-owners.js | 10 |
| modules/shared/modules-render.js | 9 |
| modules/finance/akun.js | 7 |
| modules/asset/aset-reports.js | 6 |
| modules/vehicle/vehicle-catalog-import-ui.js | 5 |
| modules/vehicle/honda-pdf-import-ui.js | 5 |
| modules/finance/dana-titipan-portfolio-render.js | 5 |
| modules/vehicle/vehicle-catalog-web-import-ui.js | 4 |
| modules/shared/scan-ocr-b.js | 4 |
| modules/finance/titipan-expense-ui.js | 4 |
| modules/finance/cashflow-projection-presenter.js | 4 |
| modules/business/shop-scan-ui.js | 4 |
| modules/business/shop-pdf-import-ui.js | 4 |
| modules/asset/investasi-list-view.js | 4 |
| modules/asset/aset.js | 4 |
| modules/shop/modules-render.js | 3 |
| modules/modules-render.js | 3 |
| budget.js | 3 |
| modules/shop/cobek-tx-cart.js | 2 |
| modules/shared/data-archive.js | 2 |
| modules/finance/tx-bbm.js | 2 |
| modules/dashboard-hub/dashboard-hub-settings.js | 2 |
| modules/asset/aset-emas-impor.js | 2 |
| modules/ai/kategorisasi-ai.js | 2 |
| modules/vehicle/vehicle-core.js | 1 |
| modules/shop/cobek-order.js | 1 |
| modules/shared/scan-ocr.js | 1 |
| modules/shared/pengaturan-search.js | 1 |
| modules/shared/onboarding.js | 1 |
| modules/shared/modules-calc.js | 1 |
| modules/finance/tx-stok-sparepart.js | 1 |
| modules/finance/transaksi.js | 1 |
| modules/finance/filter-laporan.js | 1 |
| modules/finance/cicilan.js | 1 |
| modules/business/tukang-absensi.js | 1 |
| car-notes.js | 1 |
| ai-chat.js | 1 |
| **TOTAL** | **123** |

## Kenapa ini serius, bukan cuma soal dokumentasi

CSP aktif saat ini (lihat meta tag `Content-Security-Policy` di
`index.html`) sudah:
- `script-src` **tanpa** `'unsafe-inline'`
- `script-src-attr 'none'`

Kalau pemahaman soal `script-src-attr` yang tertulis di paragraf SA10a benar
(didukung Chrome/Edge/Firefox), maka atribut `onclick=`/`onchange=`/
`oninput=` dst yang di-inject lewat `innerHTML` **seharusnya ditolak
browser modern** — artinya ke-123 titik di atas berisiko sudah tidak
merespons interaksi user (klik, ketik, ubah dropdown) di Chrome/Edge/
Firefox saat ini, sejak SA10a mengunci CSP tanpa `'unsafe-inline'`.

**Status: BELUM dikonfirmasi lewat pengujian browser sungguhan** — sandbox
sesi S1588 tidak punya akses browser. Ini "risiko tinggi belum
diverifikasi", bukan "sudah pasti rusak" dan bukan "aman diabaikan".

## Rekomendasi tindak lanjut (BUKAN dikerjakan sesi ini — audit-only)

1. **Prioritas tertinggi:** uji manual di browser sungguhan (Chrome/Edge/
   Firefox terbaru) — buka salah satu fitur di tabel atas (mis. "Atur Porsi
   Kepemilikan" aset → ubah nama pemilik) dan lihat apakah input benar-benar
   merespons atau console menunjukkan error CSP
   `Refused to execute inline event handler`. Ini konfirmasi/bantah paling
   cepat & murah sebelum epic migrasi besar dimulai.
2. Kalau terkonfirmasi rusak: ini bukan lagi "boleh ditunda", karena artinya
   fitur produksi sudah patah sejak SA10a naik. Prioritaskan di atas
   backlog W lain yang sifatnya perbaikan test/dokumentasi.
3. Migrasi 123 titik ini ke pola `data-onclick`/`data-oninput`/
   `data-onchange` + dispatcher terpusat (pola yang sama persis dipakai utk
   SA1-SA9 di HTML statis) — ini epic terpisah lagi (beda cakupan dari
   saran #1 SESSION-NOTE-S1588 yang cuma soal 10 field
   `simpleAutocompleteInput`).
4. Setelah migrasi tuntas & diverifikasi ulang dgn grep repo-wide yang sama
   di dokumen ini menghasilkan 0, BARU disclaimer CSP di `index.html` boleh
   ditulis ulang jadi klaim "TUNTAS 100%" tanpa kualifikasi cakupan.
