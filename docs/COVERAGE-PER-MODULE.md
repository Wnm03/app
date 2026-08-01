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

Terakhir digenerate: 2026-08-01T01:52:24.924Z
Total file test (`tests/*.test.js`): 181 · Total module family: 15

| Module family | File source (.js) | File test yang menyentuh | Status |
|---|---:|---:|---|
| `modules/home` | 3 | 0 | ⚠️ 0 test file |
| `economic-intelligence` | 20 | 1 |  |
| `modules/self-reward` | 3 | 1 |  |
| `lifeos` | 29 | 2 |  |
| `modules/dashboard-hub` | 6 | 3 |  |
| `modules/logistics` | 2 | 3 |  |
| `modules/cross` | 17 | 4 |  |
| `modules/business` | 10 | 7 |  |
| `modules/ai` | 7 | 10 |  |
| `modules/asset` | 14 | 15 |  |
| `modules/shop` | 14 | 29 |  |
| `modules/finance` | 41 | 36 |  |
| `root` | 19 | 51 |  |
| `modules/shared` | 29 | 59 |  |
| `modules/vehicle` | 71 | 60 |  |

## Family tanpa test file yang menyentuhnya langsung (1)

Kandidat prioritas kalau mau menambah test baru — urutan lain sama validnya,
ini murni titik awal, bukan urutan wajib:

- `modules/home` (3 file source)
