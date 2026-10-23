# S2721 — Checklist Edit Snapshot & Action Isolation

## Temuan terkonfirmasi

Pada jalur edit checklist, baris komponen baru ditambahkan ke `servisLogs` sebelum snapshot jatuh tempo dibuat. Resolver snapshot dapat membaca baris yang sedang diedit sebagai riwayat sebelumnya, sehingga menghasilkan due snapshot seolah baseline sudah diketahui. Aksi fallback juga dapat berubah selama iterasi karena row pertama dapat memutasi aksi parent yang dipakai komponen berikutnya.

## Perbaikan

- Aksi sesi disimpan sekali sebelum iterasi checklist; fallback komponen yang tidak memiliki properti `actionType` menggunakan nilai awal ini.
- Jika `actionType` hadir eksplisit tetapi kosong, aksi komponen tetap kosong dan snapshot event baru tidak dibuat.
- Saat menghitung snapshot untuk aksi yang diketahui, baris dari sesi yang sedang diedit dikeluarkan sementara dari input riwayat agar sesi tidak menjadi baseline bagi dirinya sendiri; data dipulihkan dalam blok `finally`.
- Tidak ada migrasi massal atau mutasi terhadap riwayat sesi lain.
- `docs/AUDIT_MATRIX.md` diperbarui ke inventaris yang terhitung pada replay ini.

## Verifikasi

- Tes terfokus: 13/13 lulus (`servis-checklist-edit-session-reminder-s2036`, `s2719-checklist-action-scope`, `reminder-baseline-neutral-legacy`).
- `node --check modules/vehicle/service-history-checklist-edit-s2036.js`: lulus.
- `npm run build`: lulus; bundle A/B valid, versi 2683 sinkron.
- `npm test`: dimulai, tetapi mencapai batas waktu 240 detik sebelum runner mengeluarkan ringkasan akhir. Ini bukan hasil full-suite pass.
- Browser/WebView E2E: belum dijalankan.

## Batas klaim

Patch memperbaiki dan menguji jalur checklist-edit yang direproduksi. Belum ada bukti bahwa semua bug substantif di seluruh aplikasi sudah nol.
