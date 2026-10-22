# Manifest Patch Kumulatif S2605 — app-main (32)

## Baseline
- `app-main (32).zip` SHA-256: `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`
- Baseline asli tidak diubah.

## Rantai kumulatif
- Membawa isi patch `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2604-v2602.zip` apa adanya.
- Menambahkan `tests/s2605-finance-allocation-fail-closed.test.js`.
- Menambahkan `AUDIT-S2605-FAIL-CLOSED-ALLOCATION-APP-MAIN-32.md`.
- Tidak ada file produksi yang diubah atau dihapus; `DELETE-FILES.txt` tidak diperlukan.

## Tes/gate yang dijalankan
- Suite terpilih finance/projection/debt/budget/goal/SOT/residency: 113 pass, 0 fail, 0 skipped.
- Release UI, SOT integrity, bundle freshness, patch contamination, performance budget, architecture integrity: PASS.
- Full suite tidak diklaim lulus karena tidak dijalankan di S2605.
