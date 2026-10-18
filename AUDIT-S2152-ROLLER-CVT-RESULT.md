# AUDIT S2152 — Kebijakan Interval Roller CVT

## Keputusan kebijakan
- Pemeriksaan Roller CVT: setiap 12.000 km.
- Penggantian default: setiap 24.000 km.
- Interval penggantian dapat diubah manual per kendaraan; SOT `manual` tetap otoritatif.
- Sumbu inspeksi dan penggantian independen. Penggantian memperbarui baseline penggantian tanpa menonaktifkan cadence inspeksi.

## Perubahan
- `data/database-kategori-komponen-servis.json`: `roller-cvt` ditetapkan `intervalAxes: independent`, `intervalKm: 24000`, label inspeksi/penggantian diperbarui, dan `needsReview` ditutup untuk konflik kebijakan ini.
- `car-notes.js`: aturan inspeksi 12.000 km dan penggantian 24.000 km.
- `modules/vehicle/service-master-data.generated.js`: diregenerasi dari JSON; checksum `44e8bc240b84e5088a4be108078462e54366151d4a63ab01086b1a80f45efb69`.
- `tests/service-reminder-roller-cvt-policy-s2152.test.js`: verifikasi cadence 12.000/24.000, override manual 18.000 km, dan reset baseline terpisah.
- `tests/servis-checklist-groups-sesi1a.test.js`: review flag Roller CVT dihapus setelah kebijakan ditentukan.
- `tests/service-master-data-lazy-s2397.test.js`: checksum yang diharapkan diperbarui.

## Verifikasi
- Build versi 2568: lulus.
- Service SOT integrity gate (pemeriksaan full-regression gate dilewati karena full regression dijalankan terpisah): 10/10 pemeriksaan non-regression lulus.
- Tes terarah: 23/23 lulus.
- Audit chain S2151 yang dijalankan terhadap master S2152: 102 komponen, 0 temuan struktural/runtime.
- Bundle freshness: kedua bundle cocok dengan sumber.
- Full regression (64 shard): **8.916 tes, 8.915 lulus, 0 gagal, 1 dilewati**; semua shard lulus.

## Catatan batas
Tidak menyatakan aplikasi secara universal bebas bug. Status 0 temuan hanya berlaku untuk audit struktural/runtime pada rantai master–runtime–SOT–bundle yang diperiksa. Peringatan dokumentasi `AUDIT_MATRIX.md` dan file sumber besar adalah warning build lama, bukan blocker pada perubahan Roller CVT.
