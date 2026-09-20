# COVERAGE-PER-MODULE.md — test coverage per module family (AUTO-GENERATED, JANGAN EDIT MANUAL)

> Di-generate otomatis oleh `node scripts/generate-coverage-per-module.js` —
> dipanggil juga otomatis di akhir setiap `node build.js` yang sukses. S331,
> tindak lanjut poin #3 (TERAKHIR) dari daftar saran maintainability user
> pasca-audit S324 ("coverage per modul") — lihat komentar header
> `scripts/generate-coverage-per-module.js` untuk metodologi lengkap & batasannya.
>
> **Batasan penting**: ini cakupan STRUKTURAL (berapa file test yang secara
> LANGSUNG me-load minimal 1 file di family itu lewat `loadSource([...])`/
> literal path lain), BUKAN code-coverage ter-instrumentasi (mis. istanbul/c8).
> Family dgn "0 test file" belum tentu 0% teruji sungguhan (bisa saja diuji
> tidak langsung lewat modul lain yang memanggilnya) — anggap sbg sinyal awal
> utk ditinjau, bukan vonis akhir. Kalau file ini kelihatan tidak sinkron,
> jalankan ulang generatornya, JANGAN diedit tangan.

Terakhir digenerate: 2026-09-20T01:55:23.143Z
Total file test (`tests/*.test.js`): 864 · Total module family: 17

| Module family | File source (.js) | File test yang menyentuh | Status |
|---|---:|---:|---|
| `economic-intelligence` | 20 | 2 |  |
| `modules/modals.js` | 1 | 2 |  |
| `modules/self-reward` | 3 | 2 |  |
| `lifeos` | 30 | 4 |  |
| `modules/logistics` | 2 | 4 |  |
| `modules/home` | 3 | 7 |  |
| `modules/cross` | 17 | 10 |  |
| `modules/dashboard-hub` | 6 | 11 |  |
| `modules/ai` | 7 | 17 |  |
| `modules/engine` | 1 | 20 |  |
| `modules/business` | 11 | 31 |  |
| `modules/shop` | 26 | 78 |  |
| `modules/asset` | 26 | 192 |  |
| `modules/vehicle` | 123 | 209 |  |
| `root` | 20 | 227 |  |
| `modules/finance` | 59 | 285 |  |
| `modules/shared` | 44 | 372 |  |
