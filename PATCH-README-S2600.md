# PATCH S2600 — Drive/Sheets: guard data kosong, guard stuck, (di atas app-main (17))
1. `_gdriveLocalDataLooksEmpty()` (gdrive-backup.js): akun bawaan saldo 0 tidak dihitung data; semua modul SHEETS_MODULES ikut dicek. Memperbaiki: Tarik dari Sheets di device baru menghapus isi Sheets; Backup device baru menimpa backup Drive tanpa peringatan.
2. sheets-sync.js: sheetsEnsureAuth(afterAuth,onAbort) — guard sheetsPull/sheetsSync direset bila GSI belum dimuat / popup ditutup / error auth.
Test baru: tests/s2600-gdrive-sheets-empty-guard-authabort.test.js. Bundle dibangun ulang. Full suite 8857/8858 pass (0 fail).
Belum diperbaiki (perilaku desain): Tarik di device stale push data lokal dulu (menghidupkan lagi baris yang dihapus, menimpa edit di Sheets).
