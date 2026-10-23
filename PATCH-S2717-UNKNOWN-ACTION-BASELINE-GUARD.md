# PATCH S2717 — Unknown Action Must Not Reset Service Baseline

## Temuan yang direproduksi
`ServiceLegacyMaintenance.componentAction()` sebelumnya memakai `ganti` sebagai fallback ketika `actionType` tidak ada pada baris riwayat maupun checklist komponen. Akibatnya, riwayat yang hanya berisi komponen/tanggal/odometer tanpa tindakan eksplisit dapat dipilih oleh `latestByAction(..., 'ganti')` dan dianggap sebagai penggantian. Itu dapat membuat jadwal interval penggantian tampak memiliki baseline yang sebenarnya tidak didukung data.

## Perubahan
- Aksi kosong sekarang dinormalisasi sebagai string kosong/unknown, bukan `ganti`.
- Baris riwayat tanpa tindakan eksplisit tidak memenuhi pencarian tindakan penggantian.
- Tidak ada riwayat lama yang ditulis ulang; data yang ambigu tetap tersimpan dan status baseline tetap perlu diketahui.
- Cache PWA dan bundle dibangun ulang pada versi `2679`.

## Verifikasi
- `node --test tests/service-legacy-maintenance-s2040.test.js tests/reminder-baseline-neutral-legacy.test.js tests/service-reminder-single-sot-notification-s2711.test.js`: **14/14 lulus**.
- `node scripts/verify-bundle-freshness.js`: **lulus**, kedua bundle segar.
- `npm run build`: selesai dan kedua bundle lolos `node --check`.

## Batasan audit
Ini memperbaiki satu jalur yang direproduksi, bukan bukti bahwa seluruh aplikasi bebas bug. Audit runtime browser/WebView dan uji penuh seluruh suite belum dilakukan. Build masih memberi peringatan bahwa `docs/AUDIT_MATRIX.md` mempunyai baseline inventaris lama; bukan kegagalan build.
