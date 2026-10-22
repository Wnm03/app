# Manifest kumulatif S2603 — berbasis patch S2601-v2602

Baseline: `app-main (32).zip` (SHA-256 `2ac36b3381fcb22ec1ae8cf8cda8e9df540b6c5bc4ec1629b59202567ac9f781`).

Patch ini mempertahankan seluruh isi `PATCH-APP-MAIN-32-CUMULATIVE-FINANCE-S2601-v2602.zip`, lalu menambahkan:

- `tests/s2603-finance-allocation-sot-ownership-guard.test.js` — tes regresi fail-closed dan batas agar API alokasi tidak mengambil alih SOT/kepemilikan.
- `AUDIT-S2603-GUARD-SOT-OWNERSHIP-APP-MAIN-32.md` — laporan hasil tahap.
- `PATCH-MANIFEST-APP-MAIN-32-CUMULATIVE-FINANCE-S2603-v2602.md` — manifest kumulatif ini.

Tidak ada file yang dihapus. Pada S2603 tidak ada perubahan source produksi, bundle, aturan SOT, aturan OwnershipEngine, skema data, maupun penyimpanan. `DELETE-FILES.txt` tidak diperlukan karena tidak ada penghapusan.

Validasi tahap: tes terpilih 58/58 lulus; UI gate, SOT integrity, bundle freshness, contamination, dan performance budget lulus. Full suite/build penuh tidak dijalankan pada tahap ini.
