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

Terakhir digenerate: 2026-09-03T05:21:27.206Z
Total file test (`tests/*.test.js`): 532 · Total module family: 17

| Module family | File source (.js) | File test yang menyentuh | Status |
|---|---:|---:|---|
| `modules/modals.js` | 1 | 0 | ⚠️ 0 test file |
| `modules/modules-render.js` | 1 | 0 | ⚠️ 0 test file |
| `economic-intelligence` | 20 | 2 |  |
| `modules/self-reward` | 3 | 2 |  |
| `lifeos` | 30 | 4 |  |
| `modules/logistics` | 2 | 4 |  |
| `modules/home` | 3 | 5 |  |
| `modules/cross` | 17 | 6 |  |
| `modules/dashboard-hub` | 6 | 9 |  |
| `modules/ai` | 7 | 11 |  |
| `modules/business` | 10 | 20 |  |
| `modules/shop` | 25 | 62 |  |
| `modules/vehicle` | 81 | 83 |  |
| `root` | 19 | 96 |  |
| `modules/asset` | 26 | 174 |  |
| `modules/finance` | 56 | 232 |  |
| `modules/shared` | 38 | 275 |  |

## Family tanpa test file yang menyentuhnya langsung (2)

Kandidat prioritas kalau mau menambah test baru — urutan lain sama validnya,
ini murni titik awal, bukan urutan wajib:

- `modules/modals.js` (1 file source)
- `modules/modules-render.js` (1 file source)
