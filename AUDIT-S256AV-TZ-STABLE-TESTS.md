# S256AV — 15 test gagal di baseline: penyebab zona waktu & lingkungan (bukan tanggal)

Baseline `app-main (13)` gagal 15 test saat dijalankan dengan `TZ=Asia/Jakarta` (sesi sebelumnya memakai UTC sehingga tidak terlihat). Semua diperbaiki di sisi **test**; tidak ada source produksi yang diubah.

| Grup | Test | Penyebab | Perbaikan |
|---|---|---|---|
| Kalender tagihan | 1 (`bill-calendar-day-aria-label-s591`) | stub occurrence memakai `new Date(y,m,10)` (tengah malam lokal); `renderBillCalendar` memakai `toISOString()` → mundur sehari di UTC+7. Data nyata (`nextDue` `YYYY-MM-DD`, parse UTC) tidak terkena. | stub → `Date.UTC(y,m,10)` (bentuk data nyata) |
| Fixture tanggal | 12 (`ownership-sync-shop` ×3, `shop-business-engine-integration` ×2, `s2338-…` ×3, `piutang-utang-reminder` ×2, `tagihan-reminder` ×2) | fixture `new Date(…).toISOString()` / `d.setHours(0,0,0,0)…toISOString()` | helper baru `tests/helpers/localIso.js` (komponen lokal) |
| Clamp bulan | 1 (`service-master-database-s1863`) | assertion `toISOString()` pada Date lokal hasil `addMonthsClamped`; logika engine konsisten | assertion memakai komponen lokal |
| Gate rilis | 1 (`verify-release-ready-s424`) | test mengandalkan PATH `dirname(node)`; di sandbox ini `eslint` global ada di folder yang sama → "eslint TIDAK TERSEDIA" tak muncul (gagal juga di UTC) | folder sementara berisi hanya symlink `node` |

## Verifikasi
- Full suite 8603 test: **UTC dan Asia/Jakarta identik** — 8601 lulus, 1 gagal (`s2511`, bundle B basi, sudah diketahui), 1 skip.
- 11 test yang sama masih gagal di `America/New_York` (offset negatif): kode produksi mem-parse `YYYY-MM-DD` sebagai UTC lalu membaca komponen lokal. Di luar cakupan (aplikasi untuk WIB); dicatat saja.
- Test baru `s256av-tz-stable-fixtures` (3) menjaga helper dan mencegah pola `toISOString()` fixture kembali.
