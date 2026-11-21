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

Terakhir digenerate: 2026-11-21T03:26:50.137Z
Total file test (`tests/*.test.js`): 1615 · Total module family: 16

| Module family | File source (.js) | File test yang menyentuh | Status |
|---|---:|---:|---|
| `economic-intelligence` | 20 | 2 |  |
| `modules/self-reward` | 3 | 2 |  |
| `lifeos` | 30 | 5 |  |
| `modules/logistics` | 2 | 5 |  |
| `modules/cross` | 17 | 10 |  |
| `modules/engine` | 1 | 21 |  |
| `modules/dashboard-hub` | 8 | 27 |  |
| `modules/ai` | 7 | 29 |  |
| `modules/home` | 3 | 45 |  |
| `modules/business` | 11 | 58 |  |
| `modules/shop` | 28 | 119 |  |
| `modules/asset` | 25 | 214 |  |
| `root` | 22 | 399 |  |
| `modules/vehicle` | 193 | 440 |  |
| `modules/finance` | 68 | 473 |  |
| `modules/shared` | 55 | 583 |  |
