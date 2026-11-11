# B13 — Tindak lanjut rekomendasi B12 + audit paket pengingat (build 2792)
Basis: app-main (7) + patch B1–B12 (v2791). Full suite: 9676 tes, 9670 lolos, 5 gagal identik baseline (S1780, s1608, S2308, S256AU x2).

## Rekomendasi yang dikerjakan
1. **Edit interval dari kartu pengingat** — dibuka dari kartu kendaraan X, kategori berlaku semua kendaraan, interval diubah -> disimpan sebagai override manual kendaraan X (`ServiceIntervalSOT.setManual`). Kategori global & kendaraan lain tidak berubah. Interval tidak diubah -> tidak membuat override.
2. **Log lama `actionType` kosong** — tidak dimigrasi otomatis. Tombol "🔧 Tandai Ganti" per log di riwayat servis (dengan konfirmasi, rollback bila gagal).
3. **`renderDashboardServisReminder()`** — dihapus (+ semua pemanggil & tes yang hanya menguji fungsi itu).

## Audit yang sebelumnya belum dilakukan
| Area | Temuan | Status |
|---|---|---|
| Penyelesaian paket | DISMISSED bisa menjadi COMPLETED; COMPLETED bisa ditimpa log lain (`completedSessionId` berubah) | Diperbaiki |
| Snooze | SNOOZED tanpa batas waktu, tidak pernah aktif lagi | Diperbaiki: `transition(id,'SNOOZED',{until})`, `wakeSnoozed()` |
| Checklist paket | `done` tidak pernah ter-update; tidak ada API ubah item | Diperbaiki: ditandai saat selesai, dibatalkan saat dibuka kembali; `setChecklistItem()` |
| Picker paket (Keuangan > Servis) | Menawarkan paket COMPLETED | Diperbaiki |
| Pembuatan paket dari UI | Tidak ada kode UI yang memanggil `create()`, `transition()` (snooze/dismiss), `setChecklistItem()` | Tidak diubah: butuh keputusan/fitur baru |

## Verifikasi
- `tests/audit-browser-b13-saran-interval-ganti-paket.test.js` (15 tes).
- Browser (Chromium): bundle v2792 dimuat tanpa pageerror; log tanpa actionType menampilkan tombol, klik -> `actionType='ganti'`, tombol hilang, badge "Ganti" muncul.

## B14 (build 2793) — UI paket pengingat
Kartu Pengingat Servis: buat paket, checklist, tunda/aktifkan, abaikan (lihat CHANGELOG). Browser lolos semua langkah; full suite 9680 tes, 5 gagal = baseline.
