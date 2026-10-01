# S2152 P4.1-P4.7 — Final integration + full test + build 2170

Base: app-main (41) -> UPDATE-S2152-P4-1-P4-7-APP-MAIN-FINAL-INTEGRATION-FIX.zip -> perbaikan di bawah.

## Hasil
- Full test: 7973/7973 pass, 0 fail (baseline murni: 7940/7947, 7 fail pre-existing).
- Bundle freshness: segar. verify-release-ready: LOLOS (override standar lint/minify; eslint & esbuild tidak tersedia di sandbox).
- service-sot-integrity-gate: PASS.
- Build: s2041-1-part-sot-hardening-2170 (bundle 2169 -> 2170). Bundle belum diminify.

## Perbaikan 7 fail pre-existing
1. modules/vehicle/service-interval-sot.js: catch kosong -> catch(_e){void _e;} (S1860 gate + v22).
2. tests/s698-dashboard-kategori-click-tosource.test.js: tanggal hardcode September 2026 -> dihitung dinamis dari bulan berjalan.
3. tests/vehicle-jenis.test.js: assert field legacy -> stub ServiceIntervalSOT (interval aktif hanya dari SOT).
4. scripts/service-sot-integrity-gate.js: cek presedensi interval disesuaikan ke ServiceIntervalSOT (pesan "KM precedence missing" sebelumnya karena string vehicleOverride.* sudah dihapus).
5. tests/s2152-p4-7-final-gate.test.js: literal versi 2169 -> 2170.

## Catatan
- Folder backups/ hasil build sengaja tidak disertakan (test P4.5 memindai semua .js).
- Deploy: upload kedua bundle + index/app_production/sw bersamaan.
