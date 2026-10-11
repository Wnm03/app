# E2E headless (opt-in) — S2551

Tidak bagian dari `npm test`. Tanpa dependensi baru: Chrome/Chromium via CDP (Node >= 22).

    npm run test:e2e
    E2E_CHROME=/path/ke/chrome npm run test:e2e
    E2E_SKIP_OK=1 npm run test:e2e   # exit 0 jika browser/Node tidak tersedia
    E2E_ROOT=/path/repo-lain npm run test:e2e

Skenario S2550: kartu fuel Car Notes tidak tertahan role-hide setelah pindah halaman; fuel bar/petunjuk sesuai profil tangki. Fixture sintetis, tidak membaca backup asli. Exit: 0 lulus, 1 skenario gagal, 2 error harness, 3 browser/Node tidak tersedia (skip hanya jika `E2E_SKIP_OK=1`), 4 browser policy memblokir navigasi. Kode 4 adalah kegagalan lingkungan, bukan lulus dan bukan bukti bug aplikasi. Jika muncul `net::ERR_BLOCKED_BY_ADMINISTRATOR`, jalankan di lingkungan browser yang mengizinkan origin lokal; jangan mengubah hasil menjadi PASS/skip otomatis.
Belum menjadi gate wajib; jadikan job CI terpisah setelah stabil beberapa sesi.
