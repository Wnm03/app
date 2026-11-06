# W — APK pribadi (TWA) untuk Keluarga W

Aplikasi tetap berjalan dari https://wnm03.github.io/app/app_production.html lewat Chrome (Trusted Web Activity).
Data, PIN, Google Drive/Sheets, kamera, dan unduhan berperilaku sama seperti PWA di Chrome.
Tidak ada kode aplikasi (JS/HTML/SW) yang diubah.

## Langkah
1. **1-app-patch/** → timpa ke root repo `app`, commit, push. Tunggu GitHub Pages selesai deploy.
2. **3-android/** → buat repo **privat** baru (mis. `w-android`), unggah isinya (termasuk folder `.github`).
3. Di repo itu: Actions → **Generate W keystore** → Run. Unduh artifact `W-keystore-RAHASIA`.
   Isi dua secret repo: `W_KEYSTORE_B64` (isi W_KEYSTORE_B64.txt) dan `W_KEYSTORE_PASSWORD` (isi W_KEYSTORE_PASSWORD.txt). Lalu hapus artifact itu.
4. **2-root-site/** → unggah ke repo `wnm03.github.io` (termasuk `.nojekyll` dan `.well-known/`). Ganti isi `assetlinks.json` dengan `assetlinks.json` dari artifact langkah 3.
   Cek di Chrome: https://wnm03.github.io/.well-known/assetlinks.json harus tampil.
5. Actions → **Build W APK** → Run → unduh artifact `W-release-apk` → install `app-release.apk`.

## Uji setelah install
- W terbuka **tanpa address bar** (kalau ada bar, assetlinks belum cocok).
- Data lama tetap ada (disimpan di Chrome, bukan di APK). Kalau PWA lama Anda dibuka di Brave/browser lain, data ada di sana: Backup dulu lalu Restore.
- Login Google Drive, kamera scanner, backup/restore, ekspor XLSX/CSV.

## Isi perubahan
- `manifest.json`: tambah `id` (sama dengan start_url, identitas PWA tidak berubah), `categories`, ikon PNG 192/512/maskable. Ikon SVG lama tetap.
- Keystore tetap di Secrets → update APK selalu menimpa versi lama tanpa uninstall.
- Gradle dipin 8.9, tanpa izin Android tambahan.
