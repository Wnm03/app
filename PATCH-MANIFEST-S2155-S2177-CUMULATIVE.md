# Patch Manifest Kumulatif S2155–S2177

## Chain
Mempertahankan patch kumulatif S2155–S2176 tanpa menghapus sesi sebelumnya. Overlay akhir S2177 memuat semua file yang harus ditimpa ke `app-main`; folder `sessions/` hanya bukti/audit historis.

## S2177 — Condition evidence untuk checklist multi-komponen
- Perbaikan `modules/vehicle/sparepart-servis.js`: pengingat condition-only membaca kondisi dari baris checklist target sebelum memakai proyeksi root sesi.
- Tes baru `tests/s2177-multicomponent-condition-evidence.test.js`.
- Laporan `docs/AUDIT-S2177-MULTICOMPONENT-CONDITION-EVIDENCE.md`.
- Perbaikan temuan full-suite: `scripts/s2171-controlled-service-backup-migration.js` kini melaporkan kegagalan cleanup rollback, bukan `catch` kosong.
- Bundel dan cache dibangun ulang ke versi 2583.

## Verifikasi
- Tes terarah: 46 tests, 46 pass, 0 fail.
- Full suite via 32 shard/checkpoint: 8.951 tests, 8.950 pass, 0 fail, 0 cancelled, 1 skipped, 0 todo.
- `npm run build`: pass; kedua bundle lolos `node --check`.
- `node scripts/verify-bundle-freshness.js`: pass.
- Backup sumber tetap tidak berubah (SHA-256 `4d73853b57b0df1d22e218dce839440cef210e3877b7d751d6dd4a0ecedcfb31`).
