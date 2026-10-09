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

Terakhir digenerate: 2026-10-09T12:59:45.441Z
Total file test (`tests/*.test.js`): 1352 · Total module family: 17

| Module family | File source (.js) | File test yang menyentuh | Status |
|---|---:|---:|---|
| `economic-intelligence` | 20 | 2 |  |
| `modules/self-reward` | 3 | 2 |  |
| `modules/modals.js` | 1 | 3 |  |
| `lifeos` | 30 | 4 |  |
| `modules/logistics` | 2 | 4 |  |
| `modules/cross` | 17 | 10 |  |
| `modules/home` | 3 | 12 |  |
| `modules/dashboard-hub` | 7 | 20 |  |
| `modules/engine` | 1 | 20 |  |
| `modules/ai` | 7 | 26 |  |
| `modules/business` | 11 | 42 |  |
| `modules/shop` | 29 | 94 |  |
| `modules/asset` | 26 | 209 |  |
| `root` | 22 | 335 |  |
| `modules/finance` | 68 | 371 |  |
| `modules/vehicle` | 193 | 378 |  |
| `modules/shared` | 54 | 510 |  |
