# PATCH S2743 — Login Google terpadu untuk Drive + Sheets (build 2717, di atas S2742)

Hanya alur autentikasi di sisi aplikasi (`gdrive-backup.js`, `sheets-sync.js`). Tidak menyentuh SOT, rumus, atau format data.

## Masalah
- Drive dan Sheets punya klien login terpisah dengan izin berbeda; pindah Drive -> Sheets memicu login ulang ("upgrade scope").
- Token Google (±1 jam) hanya di memori: muat ulang halaman = login ulang.
- Tidak ada `login_hint`, jadi layar "pilih akun" selalu muncul.
- Sambung diam-diam hanya jalan bila `autoSync` hidup.

## Perubahan
- `GDRIVE_ALL_SCOPES`: satu paket izin (drive.file + spreadsheets + email) dipakai kedua klien. Scope dibaca dari respons Google (`resp.scope`); bila pengguna mencabut izin Sheets di dialog Google, scope tetap `drive` dan Sheets meminta lagi seperti sebelumnya.
- `D.googleDrive.accountHint`: email akun terakhir (ikut backup, bukan rahasia). Dipakai sebagai `login_hint` + `prompt:''` pada semua `requestAccessToken`. Dihapus oleh tombol Putuskan.
- Token sesi di `sessionStorage` (`kw_google_session_token_v1`), dipulihkan saat buka aplikasi bila belum kedaluwarsa (sisa >60 dtk) dan Client ID sama; dibersihkan pada `gdriveResetTokenState()` (termasuk 401). Sengaja sessionStorage, bukan localStorage.
- `gdriveTrySilentReconnectOnLoad()`: jalan bila `autoSync` hidup ATAU `accountHint` ada. Backup otomatis ke Drive setelah sambung diam-diam sekarang hanya bila `autoSync` hidup (sebelumnya selalu, karena hanya jalan saat autoSync hidup).
- Label status: pesan "upgrade" diganti petunjuk izin Sheets.
- Tes baru: `tests/s2743-google-unified-auth.test.js` (10 tes).

## Batas yang disengaja
- Aplikasi tanpa server: Google tidak memberi refresh token, jadi token tetap diperbarui tiap ±1 jam. Pembaruan biasanya tanpa popup/satu ketuk; Brave Shields/pemblokir cookie pihak ketiga dapat menggagalkan sambung diam-diam (tidak ada pesan error, kembali ke satu ketuk).
- Layar persetujuan Google Cloud harus sudah mencantumkan scope Spreadsheets (sudah dipakai Sheets sebelumnya).
- Tidak diuji terhadap OAuth Google nyata.

## Verifikasi
`npm run build` PASS (build 2717, `kw-cache-v2717`); suite penuh `node --test tests/*.test.js`: 9343 lulus, 0 gagal, 1 dilewati; ESLint 0 error pada file terkait.
