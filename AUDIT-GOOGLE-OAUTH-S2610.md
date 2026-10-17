# Audit dan Patch Google Drive / Google Sheets — S2610

Baseline: `app-main (18).zip`  
Build hasil patch: `s2041-1-part-sot-hardening-2336` (`kw-cache-v2336`)

## Temuan yang diperbaiki

1. **Race saat memuat Google Identity Services (GSI).** Jalur autentikasi memanggil `ensureGoogleGSI()` tanpa menunggu hasilnya, lalu langsung memeriksa `google.accounts.oauth2`. Pada koneksi lambat, pengguna harus menekan tombol berkali-kali. Jalur Drive, Sheets, dan silent reconnect kini menunggu pemuatan GSI sebelum membuat token client.
2. **Error pemuatan GSI tidak selalu menyelesaikan alur abort Sheets.** Callback abort sekarang dipasang sebelum operasi asynchronous, agar kegagalan jaringan tetap membersihkan proses yang menunggu dan guard sync/pull dapat dilepas.
3. **Token client OAuth dapat kedaluwarsa secara logis saat Client ID diganti.** Cache client kini dikaitkan dengan Client ID yang dipakai untuk membuatnya dan dibuat ulang jika ID berubah; menyimpan Client ID baru juga membersihkan state token lama.
4. **Tombol koneksi dapat menyatakan sudah terhubung meskipun token kedaluwarsa.** Pemeriksaan tombol Drive dan Sheets sekarang mempertimbangkan waktu kedaluwarsa token.
5. **Diagnosis pemuatan GSI.** Kegagalan memuat pustaka ditampilkan ke pengguna dengan pesan error yang tersedia, bukan hanya ditelan.

## File perubahan

- `gdrive-backup.js`
- `sheets-sync.js`
- `tests/s2610-google-oauth-load-and-clientid.test.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `index.html`, `app_production.html`, `sw.js`
- lima file sumber versi yang otomatis diselaraskan build: `modules/shared/modules-render.js`, `modules/shared/modals.js`, `modules/shared/modules-calc.js`, `modules/shared/features-helpers-global-security.js`, `chat-action-handlers.js`

## Verifikasi

- Build produksi `npm run build`: **PASS**, kedua bundle lolos `node --check`; HTML produksi dan development sinkron; cache service worker `kw-cache-v2336`.
- `npm run verify-bundle`: **PASS**, kedua bundle segar.
- Tes terarah S2271 + S2600 + S2610: **12/12 PASS**.
- ESLint pada file terkait: **0 error**, ada warning `no-unused-vars` pada fungsi global yang pola wiring-nya melalui HTML/bundle dan beberapa warning yang sudah ada.
- `npm test` suite penuh sempat berjalan hingga sekitar tes ke-3455 sebelum proses mencapai batas waktu eksekusi; tidak ada ringkasan final sehingga hasil suite penuh **belum dapat dinyatakan PASS**.

## Batas audit

Patch memperbaiki bug alur di sisi aplikasi. Koneksi nyata tetap bergantung pada konfigurasi eksternal Google Cloud: Client ID Web yang benar, Authorized JavaScript origins, Drive API dan Sheets API aktif, consent screen/test user sesuai, serta izin popup/jaringan pada browser. Pengujian di sini tidak melakukan OAuth ke akun Google pengguna dan tidak dapat membuktikan konfigurasi cloud tersebut benar.
