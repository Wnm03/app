# S1783 — Final Reliability Hardening

Tanggal: 2026-09-16

## Implementasi

1. **Test runner deterministik**
   - daftar test selalu di-sort;
   - pembagian shard round-robin deterministik;
   - concurrency dibatasi 1..8 dan dapat dioverride `TEST_CONCURRENCY`;
   - `TEST_CHECKPOINT_DIR` mendukung isolated run;
   - validator checkpoint tunggal dipakai saat reuse dan final aggregation;
   - determinism gate menjalankan shard representatif 3 kali dan membandingkan manifest + checkpoint.

2. **Crash/recovery checkpoint**
   - checkpoint ditulis ke temp file unik dengan `wx`, lalu atomic rename;
   - file `.tmp` orphan tidak pernah diperlakukan sebagai checkpoint final;
   - checkpoint rusak/parsial ditolak dan dijalankan ulang.

3. **DELETE-FILES executable gate**
   - retired paths wajib hilang;
   - duplicate manifest entries ditolak;
   - path absolute, traversal, dan backslash separator ditolak;
   - release gate memblokir pelanggaran.

4. **Version/build integrity**
   - `APP_BUILD_VERSION` menjadi sumber kebenaran build, bukan angka `?v=` terbesar di HTML;
   - source version, `index.html`, `app_production.html`, dan `sw.js` diverifikasi konsisten;
   - build berhasil pada `s1783-final-reliability-1766`;
   - kedua bundle memiliki marker hash source yang segar.

5. **Runtime lifecycle / performance guard**
   - guard listener offline Car Notes tetap singleton;
   - AIBus mencegah double subscription identik dan membersihkan event list kosong;
   - AIService menyimpan unsubscribe handles dan menyediakan `unwireEvents()`;
   - lightbox foto servis diuji 50 siklus buka/tutup tanpa listener keydown tersisa.

6. **Event Bus contract**
   - subscription idempotent untuk handler identik;
   - unsubscribe handle tetap tersedia;
   - AIService memiliki lifecycle wire/unwire eksplisit.

## Verifikasi

- 14 targeted S1780/S1783 tests: **PASS**.
- Test-runner determinism: **3 run shard representatif identik — PASS**.
- DELETE-MANIFEST: **18/18 — PASS**.
- VERSION-INTEGRITY: **PASS**.
- RUNTIME-LIFECYCLE: **PASS**.
- Bundle freshness: **2/2 — PASS**.
- `node --check` untuk file build/runner/AIBus/AIService: **PASS**.
- `modules/vehicle/servis.js`: **1595 baris**, di bawah guard 1600.

## Environment caveat

Full suite end-to-end pada sandbox 1-core belum selesai dalam batas waktu eksekusi yang tersedia; proses full-run sempat timeout. Karena itu hasil tersebut **tidak diklaim sebagai full-suite PASS**. `eslint` dan `esbuild` juga tidak tersedia di sandbox, sehingga minifikasi production dan lint penuh belum dapat diverifikasi di environment ini.
