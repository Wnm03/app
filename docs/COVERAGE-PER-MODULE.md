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

Terakhir digenerate: 2026-09-11T03:40:34.238Z
Total file test (`tests/*.test.js`): 622 · Total module family: 18

| Module family | File source (.js) | File test yang menyentuh | Status |
|---|---:|---:|---|
| `modules/modals.js` | 1 | 1 |  |
| `modules/modules-render.js` | 1 | 1 |  |
| `economic-intelligence` | 20 | 2 |  |
| `modules/self-reward` | 3 | 2 |  |
| `lifeos` | 30 | 4 |  |
| `modules/logistics` | 2 | 4 |  |
| `modules/home` | 3 | 5 |  |
| `modules/engine` | 1 | 9 |  |
| `modules/cross` | 17 | 10 |  |
| `modules/dashboard-hub` | 6 | 10 |  |
| `modules/ai` | 7 | 12 |  |
| `modules/business` | 11 | 25 |  |
| `modules/shop` | 26 | 68 |  |
| `modules/vehicle` | 83 | 102 |  |
| `root` | 19 | 135 |  |
| `modules/asset` | 26 | 181 |  |
| `modules/finance` | 59 | 260 |  |
| `modules/shared` | 41 | 299 |  |
