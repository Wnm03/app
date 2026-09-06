# SA9 (v1568) — Aktifkan `script-src-attr 'none'`, tanpa menyentuh 104 blok `<script>`

Lanjutan dari `SESSION-NOTE-SA1-REKONSTRUKSI-BASELINE-lanjutan.md` bagian
"Carry-forward ke SA9". SA9 di sini didefinisikan ULANG (lebih sempit &
lebih aman dari rencana asli): **cabut `unsafe-inline` HANYA untuk atribut
event inline**, lewat directive CSP Level 3 `script-src-attr`, TANPA
menyentuh `script-src` utama (yang masih perlu `unsafe-inline`/`unsafe-eval`
untuk 104 blok `<script>` inline yang belum dimigrasi — itu epic terpisah,
lihat catatan sesi sebelumnya).

## Kenapa dipersempit dari rencana asli ("cabut unsafe-inline" begitu saja)

Rencana asli SA9 (di SESSION-NOTE lama) tidak membedakan `script-src` (utk
tag `<script>`) dari atribut event — padahal CSP Level 3 punya directive
terpisah (`script-src-attr`) khusus atribut event, independen dari
`script-src`. Karena 100% atribut event sudah 0 (hasil SA1-SA8 + sesi
lanjutan), tapi 104 blok `<script>` BELUM beres, mencabut `unsafe-inline`
dari `script-src` utama akan langsung mematikan seluruh app (104 blok itu
semua akan diblokir). `script-src-attr 'none'` menghindari itu — mengeraskan
persis bagian yang sudah selesai (atribut event), tanpa menunggu bagian yang
belum selesai (blok `<script>`).

## Perubahan

`index.html` (§ meta CSP):
- Tambah `script-src-attr 'none';` ke meta tag CSP, di antara `script-src`
  dan `style-src`.
- `script-src` UTAMA TIDAK diubah — tetap `'self' 'unsafe-inline'
  'unsafe-eval' ...` (masih dibutuhkan utk 104 blok `<script>`).
- Komentar CSP di atas meta tag ditulis ulang total: status migrasi atribut
  event (tuntas), status blok `<script>` (belum, sengaja dipisah jadi epic
  lain), dan catatan kompatibilitas browser `script-src-attr` (CSP L3,
  didukung Chrome/Edge/Firefox; histori dukungan Safari/WebKit tidak
  konsisten — perlu dicek ulang sebelum mengandalkan ini sbg satu2nya
  proteksi) + penjelasan kenapa degradasinya AMAN di browser yang tidak
  kenal directive ini (browser tsb balik ke perilaku pra-CSP3: `script-src`
  utama yang menentukan boleh-tidaknya atribut, dan `script-src` utama MASIH
  punya `unsafe-inline` — jadi TIDAK ADA breaking change di browser manapun,
  cuma browser pendukung yang dapat proteksi ekstra).

Test baru `tests/csp-script-src-attr-sa9.test.js` (7 test, PERMANEN —
gate ini akan tetap jalan di sesi-sesi berikutnya, bukan cuma sekali cek):
1. Meta tag CSP `index.html` memuat `script-src-attr 'none'`.
2. `script-src` utama tetap ada (bukan dihapus, cuma ditambah directive baru).
3. `index.html` & `app_production.html` sinkron persis di meta tag CSP.
4-5. **0 atribut event inline APAPUN** (regex `(?<!data-)\bon[a-z]+="..."`,
     bukan daftar nama tertutup) di `index.html` DAN `app_production.html`,
     di luar teks dalam komentar HTML. Ini gate permanen yang direkomendasi
     di sesi SA1-REKONSTRUKSI pertama — supaya sesi mendatang yang tanpa
     sadar menambah SATU atribut `onX=` baru langsung ketahuan di CI,
     bukan baru ketahuan nanti waktu `script-src-attr 'none'` diam-diam
     mematikannya di browser produksi.
6-7. Sanity check regex-nya sendiri: harus tetap mendeteksi kasus asli
     (`onclick="..."`), dan tidak boleh salah tangkap `data-onclick=`/
     `data-onchange=`.

## Verifikasi
- `tests/csp-script-src-attr-sa9.test.js` → 7/7 pass.
- Full suite `node --test tests/*.test.js` → **5554 pass, 0 fail** (naik 7
  dari 5547, persis = 7 test baru).
- `node scripts/build.js` → versi tersinkron ke **1568**, `app_production.html`
  otomatis dicerminkan (termasuk meta CSP baru).
- `node scripts/verify-window-expose.js` → OK, tetap 78 modul (tidak ada
  perubahan modul).
- `node scripts/verify-bundle-freshness.js` → kedua bundle segar (bundle
  JS tidak berubah sesi ini, cuma `index.html`/`app_production.html`).
- `node tests/verify-release-ready.js` (override lint+minify, sandbox tanpa
  internet) → **LOLOS**.

## Carry-forward

Epic terpisah "eksternalisasi/hash/nonce 104 blok `<script>` inline" MASIH
BELUM dikerjakan — statusnya sama seperti dicatat di sesi sebelumnya, tidak
berubah oleh SA9 versi sempit ini. `script-src` utama masih `unsafe-inline`
sampai epic itu selesai; `script-src-attr 'none'` yang baru diaktifkan di
sini TIDAK bergantung pada & TIDAK memblokir progres epic itu — keduanya
independen.
