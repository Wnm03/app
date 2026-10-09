# E2E headless (opt-in) — S2551

Tidak bagian dari `npm test`. Tanpa dependensi baru: Chrome/Chromium via CDP (Node >= 22).

    npm run test:e2e
    E2E_CHROME=/path/ke/chrome npm run test:e2e
    E2E_SKIP_OK=1 npm run test:e2e   # exit 0 jika browser/Node tidak tersedia
    E2E_ROOT=/path/repo-lain npm run test:e2e

Skenario S2550: kartu fuel Car Notes tidak tertahan role-hide setelah pindah halaman; fuel bar/petunjuk sesuai profil tangki. Fixture sintetis, tidak membaca backup asli. Exit: 0 lulus, 1 gagal, 2 error, 3 dilewati.
Belum menjadi gate wajib; jadikan job CI terpisah setelah stabil beberapa sesi.
