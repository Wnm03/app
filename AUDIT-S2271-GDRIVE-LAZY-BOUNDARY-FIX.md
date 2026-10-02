# AUDIT S2271 — Google Drive state vs lazy laporan-export

## Temuan
`laporan-export.js` (S2264) adalah modul demand-loaded, tetapi sebelumnya menjadi owner variabel state Google Drive (`gdriveAccessToken`, `gdrivePendingAfterAuth`, scope/expiry/email/token client). Consumer Google Drive yang eager (`gdrive-backup.js`, renderer/settings, runtime auto-sync, dan self-test) dapat berjalan sebelum laporan-export pernah dimuat. Pada deployment `app-main (48)` hal ini menghasilkan `ReferenceError: gdriveAccessToken is not defined`.

## Perbaikan
- State sesi Google Drive dipindahkan ke `gdrive-backup.js`, yang memang eager.
- Deklarasi state dihapus dari `laporan-export.js`; batas lazy S2264 tetap dipertahankan.
- `self-test.js` sekarang demand-load `laporan-export.js` sebelum menjalankan contract test `buildLaporanExportData()`, sehingga self-test tidak menganggap modul lazy sebagai eager.

## Dampak Bundle-B
Payload GROUP_B berubah dari **4,893,036** menjadi **4,893,496 bytes** raw (+460 bytes). Kenaikan ini berasal dari state Google Drive yang sengaja dikembalikan ke eager owner untuk correctness; bukan penghapusan lazy boundary laporan-export.

## Verifikasi
- S2253 lazy residency/retry: PASS
- S2264 laporan-export lazy boundary: PASS
- S2267 retry hardening: PASS
- S2271 boundary tests: PASS
- Bundle freshness: PASS
- window-expose: PASS
- architecture/persistence/PWA/feature regression: PASS
- Replay `app-main (47) + cumulative S2271`: **0 missing / 0 extra / 0 mismatch**

Full aggregate `node --test --test-concurrency=8 tests/*.test.js` belum dapat dinyatakan PASS karena runner timeout; sebelum timeout, failure yang terdeteksi adalah kontrak ukuran GROUP_B lama (4,893,036) yang belum diperbarui untuk perubahan correctness S2271.
