# SESSION-NOTE-S1589 — Perbaiki disclaimer "SA1-SA9 TUNTAS 100%" yang menyesatkan di index.html

**Basis:** dibangun di atas hasil sesi sebelumnya (versi 1588,
`s757-fuel-jenis-unknown-edit-legacy`, lihat
`SESSION-NOTE-S1588-fix-s750-s751-s752-stale-regex.md`). Timpa semua file di
ZIP patch ini ke project asli. Versi baru: **1589**,
`s758-fuel-jenis-unknown-edit-legacy`.

## Kenapa sesi ini (permintaan W langsung, prioritas darurat)

W eksplisit minta perbaiki disclaimer "SA1-SA9 TUNTAS 100%" di `index.html`
secepatnya — bukan cuma soal kerapian teks, tapi risiko sesi
developer/AI berikutnya PERCAYA klaim itu lalu skip audit yang harusnya
dilakukan. Ini item #6/saran-#6 dari daftar rekomendasi S1587/S1588 yang
sebelumnya belum disentuh. Sesuai disiplin one-task-per-session, HANYA poin
ini yang dikerjakan sesi ini.

## Yang diaudit dulu (bukan langsung percaya/langsung edit teks)

1. Re-run persis grep yang disebut disclaimer:
   `grep -oP '(?<!data-)\bon[a-z]+="[^"]*"' index.html` dan
   `app_production.html` → **0 baris di keduanya**. Klaim SA1-SA9 soal 2
   file HTML statis ini TERNYATA BENAR, terverifikasi ulang.
2. Cek klaim SA10a (105 blok `<script>` inline dipindah ke
   `modal-write.js`/`boot-early.js`, 0 blok `<script>` inline tersisa) →
   juga **TERVERIFIKASI BENAR** di kedua file HTML (semua tag `<script>`
   nyata di file pakai `src=`; satu-satunya kemunculan
   `document.write(MODAL_HTML` di `index.html` cuma teks di dalam komentar
   dokumentasi, bukan kode).
3. **Tapi** disclaimer menyiratkan "TUNTAS 100%" itu berlaku untuk seluruh
   aplikasi, bukan cuma 2 file HTML statis yang di-grep. Jadi diperluas
   audit ke `modules/*.js` (tempat markup fitur di-generate dinamis lalu
   di-`innerHTML=`) — DAN DI SITU klaimnya runtuh: **123 kemunculan nyata
   atribut event inline (`onclick=`/`onchange=`/`oninput=`/dst) di 38 file
   `modules/*.js`**, dikonfirmasi sampai titik injeksi DOM-nya lewat 1
   contoh (`modules/asset/aset-owners.js` → `listBox.innerHTML=`).
   Rincian lengkap: `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` (baru,
   dibuat sesi ini).
4. Temuan konsekuensi: CSP aktif sekarang sudah `script-src` tanpa
   `'unsafe-inline'` + `script-src-attr 'none'`. Kalau catatan SA10a sendiri
   soal dukungan browser itu benar, 123 titik ini BERISIKO sudah tidak
   merespons interaksi di Chrome/Edge/Firefox sejak SA10a mengunci CSP —
   **BELUM dites di browser sungguhan** (sandbox sesi ini tidak ada akses
   browser), jadi ditandai "risiko tinggi belum diverifikasi", BUKAN
   "sudah pasti rusak" dan BUKAN "aman diabaikan". Tidak melebih-lebihkan
   ke arah manapun.

## Perbaikan yang dilakukan

Di `index.html`, SEBELUM paragraf SA10a lama (yang dibiarkan apa adanya,
karena isinya sendiri akurat untuk scope-nya), disisipkan blok
"KOREKSI S1588" yang:
- Menjelaskan klaim "TUNTAS 100%"/"0 atribut inline" HANYA valid utk 2 file
  HTML statis, terverifikasi ulang sesi ini.
- Menyebut angka konkret (123 kemunculan / 38 file) dan menunjuk ke
  `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` untuk daftar lengkap.
- Menjelaskan konsekuensi CSP di atas beserta status "belum diverifikasi".
- Melarang eksplisit menganggap SA1-SA9/SA10a menutup seluruh migrasi
  inline-event sebelum audit ini ditindaklanjuti.

Paragraf histori SA1-SA9 (baris "Histori migrasi atribut event...") juga
disunting: kata "SUDAH TUNTAS" diberi kualifikasi "untuk markup statis di
index.html & app_production.html", ditambah rujukan balik ke blok koreksi,
dan verifikasi grep sekarang eksplisit mencantumkan KEDUA file (dulu cuma
`index.html` yang disebut, padahal klaimnya soal 2 file).

`app_production.html` **TIDAK diedit manual** — sesuai aturan proyek
sendiri ("AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN
edit file ini langsung"), perbaikan dilakukan di `index.html` lalu
`node scripts/build.js` dijalankan supaya `app_production.html` jadi
cermin otomatis (termasuk blok koreksi ini).

File baru: `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` — audit lengkap
(metode, tabel 38 file, penjelasan risiko CSP, rekomendasi tindak lanjut).
Dinamai `-S1588` (bukan S1589) karena audit dikerjakan menindaklanjuti
saran #6 yang tercatat di sesi S1588; nomor session-note ini sendiri tetap
S1589 sesuai versi build.

**TIDAK ada perubahan logic/fitur apa pun sesi ini** — murni dokumentasi
(disclaimer + audit doc + session note) dan sinkronisasi versi otomatis
dari `node scripts/build.js`. 123 titik inline-event dinamis **SENGAJA
TIDAK dimigrasi** sesi ini — itu epic terpisah (lihat rekomendasi #3 di
`docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md`), di luar cakupan "1 poin 1
patch" yang diminta W sesi ini (poinnya cuma perbaikan disclaimer).

## Build & test

- `node --test tests/*.test.js` SEBELUM & SESUDAH: **5654 pass, 0 fail**
  (tidak berubah — sesi ini tidak menyentuh logic apa pun, jadi baseline
  hijau dari S1588 tetap terjaga).
- `node scripts/build.js` dijalankan — versi naik 1588 → **1589**
  (`s757-...` → `s758-fuel-jenis-unknown-edit-legacy`, penamaan slug tidak
  berubah karena tidak ada fitur baru sesi ini, cuma bump version
  otomatis). `app_production.html` ditulis ulang sebagai cermin
  `index.html` (termasuk blok KOREKSI S1588). Sintaks kedua bundle lolos
  `node --check`.
- `esbuild`/`eslint` MASIH TIDAK terpasang di sandbox ini (sama seperti 2
  sesi sebelumnya, tanpa akses jaringan) → bundle belum diminify,
  `npm run lint` belum jalan. `verify-release-ready.js` di-override manual
  utk 2 gate ini lagi — **override KE-3 kalinya berturut-turut** untuk 2
  gate yang sama (S1587, S1588, S1589). Ini SUDAH menumpuk seperti yang
  diperingatkan saran #5 W di S1588 — begitu W kerja di environment dengan
  akses jaringan, jalankan `npm install --save-dev esbuild eslint` lalu
  build ulang tanpa override; jangan tambah override ke-4.
- `verify-window-expose.js` → OK (tidak ada modul baru sesi ini).

## File yang berubah (masuk ZIP patch ini)

```
index.html                        (blok KOREKSI S1588 + edit histori SA1-SA9)
app_production.html               (auto-regenerate dari index.html via build.js)
app-bundle-a.min.js               (sinkronisasi versi, TANPA minifikasi)
app-bundle-b.min.js               (sinkronisasi versi, TANPA minifikasi)
sw.js                              (CACHE_NAME -> v1589)
chat-action-handlers.js           (sinkronisasi versi, tidak ada logic berubah)
modules/shared/features-helpers-global-security.js  (sinkronisasi versi)
modules/shared/modals.js          (sinkronisasi versi, TIDAK ada perubahan markup)
modules/shared/modules-calc.js    (sinkronisasi versi)
modules/shared/modules-render.js  (sinkronisasi versi)
docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md   (BARU — audit lengkap)
docs/COVERAGE-PER-MODULE.md       (regenerated otomatis oleh build.js)
docs/FILE-MAP.md                  (regenerated otomatis oleh build.js)
docs/RELEASE-GATE-LOG.md          (log override gate ke-3, lihat di atas)
```

Tests TIDAK berubah sesi ini (tidak ada test baru/edit — murni dokumentasi).

ZIP ini berisi AKUMULASI penuh dari sesi S1587 + S1588 + S1589 (semua file
yang berubah di ketiga sesi), sesuai instruksi "1 sesi 1 patch zip,
akumulasikan ke file patch yang sudah diupload" — timpa semua file di ZIP
ini ke project asli, tidak perlu apply ZIP S1587/S1588 secara terpisah
lagi.

## Rekomendasi tindak lanjut (sesi berikutnya)

1. **PALING URGENT — beda dari daftar W sebelumnya:** uji manual di browser
   sungguhan apakah 123 titik inline-event dinamis di
   `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` benar-benar dipatahkan CSP
   `script-src-attr 'none'`. Ini keputusan prioritas paling murah/cepat
   untuk dites duluan sebelum epic migrasi besar mana pun dimulai — kalau
   ternyata memang rusak, ini jadi P0, bukan lagi item backlog biasa.
2. Kalau #1 terkonfirmasi rusak: migrasi 123 titik ke pola
   `data-onclick`/`data-oninput`/`data-onchange` (pola sama dgn SA1-SA9),
   dipecah per-modul supaya blast radius tiap sesi tetap kecil (jangan
   coba 1 sesi 1 patch untuk 38 file sekaligus).
3. Saran #1 S1588 (10 field `simpleAutocompleteInput`) & saran #3 S1588
   (test regresi generik onfocus/data-onfocus) — masih berlaku, TIDAK
   overlap dgn 123 titik di atas (cakupannya beda modul/pola).
4. Saran #5 S1588 (`npm install --save-dev esbuild eslint`) — makin
   mendesak, sudah 3x override gate berturut-turut.
5. 104 blok `<script>` inline yang disebut di rekomendasi #6 S1588 sendiri
   **SUDAH DICEK ULANG sesi ini dan TERNYATA SUDAH 0** (SA10a memang sudah
   menuntaskannya) — catatan itu di S1588 sendiri stale, sengaja tidak
   dihapus dari S1588 (session note lama tidak diedit retroaktif), tapi
   JANGAN dikerjakan lagi di sesi mendatang karena sudah selesai.
