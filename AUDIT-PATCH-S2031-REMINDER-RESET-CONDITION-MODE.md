# Audit & Implementasi — Reminder Reset Action dan Condition Mode

## Ringkasan

Implementasi berdasarkan baseline `app-main (20).zip`; patch mempertahankan perubahan sebagai patch kumulatif dan tidak menyertakan backup bundle atau checkpoint test.

### Perubahan

1. **Interval-based:** pencarian baseline pengingat sekarang mengabaikan tindakan rutin `periksa/cek`, `bersih`, dan `setel` secara default. Tindakan `ganti`, `pasang/pasang baru`, `perbaiki/perbaikan`, dan `overhaul` diperlakukan sebagai tindakan reset interval.
2. **Aksi khusus dengan interval mandiri:** kategori yang secara eksplisit memakai `actionMode` tindakan non-reset (misalnya `bersih`) tetap dapat memakai interval tindakan tersebut. Ini mempertahankan kasus cleaning-only yang memang memiliki interval sendiri.
3. **Condition-based:** kategori dengan `conditionBased: true`, `reminderMode: 'condition'`, `maintenanceMode: 'condition'`, atau aturan `maintenanceType: 'condition'` tidak menghasilkan countdown KM/bulan/hari. Kondisi rusak menampilkan status `rusak`; riwayat penggantian/pasang/perbaikan/overhaul terakhir mengembalikan status ke `normal`.
4. **Konsistensi pembaca baseline:** `Servis._matchesActionTypeForReset` dan matcher lokal reminder diselaraskan. Saat pemanggil memberikan snapshot `historyRows`, engine tidak fallback ke global `Servis` jika snapshot tidak punya tindakan reset yang cocok.
5. **Build/cache:** bundle A/B dibangun ulang; versi HTML, production shell, dan service worker disinkronkan ke `s2041-1-part-sot-hardening-2551` / cache `2551`.
6. **Regresi baru:** ditambahkan `tests/service-reminder-reset-action-contract-s2031.test.js` untuk pemeriksaan rutin yang tidak reset, pasang/overhaul yang reset, dan mode berbasis kondisi.

## Validasi

- Targeted regression suite: **32/32 PASS** (maintenance rules v2/v3, S2012, S2091-r1, interval bulan, S2031).
- Action/reset compatibility + reconciliation suite: **30/30 PASS**.
- Shard 16 full-suite: **293/293 PASS** setelah memperbaiki skema versi build yang diwajibkan tes S2423.
- `node scripts/verify-window-expose.js`: PASS.
- `node scripts/verify-bundle-freshness.js`: PASS; bundle A/B cocok dengan source.
- `node --check` kedua bundle: PASS (build script).
- Full suite seluruh repository belum terkonfirmasi selesai dalam sesi ini; run paralel melewati batas waktu eksekusi. Tidak menyatakan full-suite PASS.

## Catatan kompatibilitas

- Kategori `periksa-conditional` yang eksplisit dan memiliki `gantiResetsInterval: false` tetap mengikuti konfigurasi khusus lama.
- Kategori yang secara eksplisit mendefinisikan interval cleaning tetap menghitung interval cleaning-nya sendiri; cleaning tidak mereset interval penggantian umum.
- Tidak ada migrasi atau penulisan ulang riwayat pengguna.
