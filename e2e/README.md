# E2E headless (opt-in) — S2551

Tidak bagian dari `npm test`. Tanpa dependensi baru: Chrome/Chromium via CDP (Node >= 22).

    npm run test:e2e
    E2E_CHROME=/path/ke/chrome npm run test:e2e
    E2E_SKIP_OK=1 npm run test:e2e   # exit 0 jika browser/Node tidak tersedia
    E2E_ROOT=/path/repo-lain npm run test:e2e

Skenario S2550: kartu fuel Car Notes tidak tertahan role-hide setelah pindah halaman; fuel bar/petunjuk sesuai profil tangki. Fixture sintetis, tidak membaca backup asli. Exit: 0 lulus, 1 skenario gagal, 2 error harness, 3 browser/Node tidak tersedia (skip hanya jika `E2E_SKIP_OK=1`), 4 browser policy memblokir navigasi. Kode 4 adalah kegagalan lingkungan, bukan lulus dan bukan bukti bug aplikasi. Jika muncul `net::ERR_BLOCKED_BY_ADMINISTRATOR`, jalankan di lingkungan browser yang mengizinkan origin lokal; jangan mengubah hasil menjadi PASS/skip otomatis.
Belum menjadi gate wajib; jadikan job CI terpisah setelah stabil beberapa sesi.

## E2E backup asli (S2896) — permanen, opt-in

Memakai backup pribadi asli (TIDAK ikut repo/patch; dibaca dari path env, tidak ditulis ke mana pun):

    BACKUP=/path/backup-keluarga-W.json npm run test:e2e:backup
    E2E_SKIP_OK=1 npm run test:e2e:backup     # exit 0 bila BACKUP/browser tidak ada (CI tanpa data)
    E2E_SHOTS=/dir  E2E_PROJECT=<id>          # opsional: tangkapan layar / paksa proyek

Butuh Playwright (`playwright` global atau `/opt/npm-tools`); mengunci ROOT ke repo (`ROOT=` untuk tree lain). 33 pemeriksaan: paritas dana klien (`isAliranKlien` = biaya status dana), hak W & guard pencairan (hak+1 ditolak, kunci ganda idempoten), utang bagi hasil penerima + kartu Dana Titipan, saldo pribadi naik tepat sebesar pencairan, penerima manual (OwnerRegistry, tanpa ID ganda), tanda minus, tanpa NaN/scroll horizontal/error JS. Pemeriksaan INVARIAN dihitung dari isi backup; angka emas (4.307.418 / 800.000 / 1.588.100) hanya dicek bila SHA-256 backup = backup 20 Nov 2026. Exit: 0 lulus, 1 gagal, 2 error harness, 3 dilewati.
