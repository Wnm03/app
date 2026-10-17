# Patch akumulasi (basis: app-main (17))
Memuat sekaligus: S256BE/S256BF (backup-restore.js + test s256bf + .test-checkpoints), S2600 (guard data kosong, guard auth Sheets, test s2600). dan S2601 (SOT riwayat servis = pengingat; keyboard tidak menutup saat ketik interval/qty). Tidak ada perbaikan yang dibuang: gdrive-backup.js dan sheets-sync.js = versi S2600 utuh.
Bundle/HTML/sw.js dibangun ulang dari source (17)+patch. FILE-HASHES-SHA256.txt diregenerasi (4 entri S256AX yang tidak ada di (17) dibuang oleh refresh-file-hashes.py).
Hasil: npm test 8869 test, 8868 pass, 0 fail, 1 skipped. Real-browser (Chromium, Google ditiru): 32/33; satu sisa = perilaku desain Tarik di device stale (push lokal dulu), belum diubah.
Terapkan: salin seluruh isi ZIP ke root app-main (17), lalu python3 scripts/refresh-file-hashes.py --check
