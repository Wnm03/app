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

Terakhir digenerate: 2026-08-01T14:56:01.134Z
Total file test (`tests/*.test.js`): 174 · Total module family: 15

| Module family | File source (.js) | File test yang menyentuh | Status |
|---|---:|---:|---|
| `economic-intelligence` | 20 | 1 |  |
| `modules/self-reward` | 3 | 1 |  |
| `lifeos` | 29 | 3 |  |
| `modules/dashboard-hub` | 6 | 3 |  |
| `modules/logistics` | 2 | 3 |  |
| `modules/cross` | 17 | 4 |  |
| `modules/home` | 3 | 4 |  |
| `modules/business` | 10 | 8 |  |
| `modules/ai` | 7 | 10 |  |
| `modules/asset` | 14 | 18 |  |
| `modules/shop` | 14 | 31 |  |
| `modules/finance` | 41 | 43 |  |
| `root` | 157 | 43 |  |
| `modules/vehicle` | 75 | 54 |  |
| `modules/shared` | 29 | 55 |  |
