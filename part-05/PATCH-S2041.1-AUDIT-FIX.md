# S2041.1 — Audit fix (kumulatif S2040 + S2041 + S2041.1)

Basis: app-main__40_ (v2145) + patch S2040/S2041. Hasil build: **v2150**.
Semua perubahan additive; tidak ada redesign UI, tidak ada fungsi legacy dihapus, tanpa KPB.

## Perbaikan (rujukan temuan audit)
- C1: picker mempertahankan Part yang sedang terpilih walau qty 0 / arsip (label "· habis" / "· arsip") → Edit Servis/Transaksi lama tidak lagi kehilangan referensi Part.
- C2: opsi sentinel `__new__` ("➕ Sparepart Baru") di picker Transaksi dipertahankan.
- C3: "Hapus Semua" stok tidak lagi hard-delete Part berhistory; di-archive.
- R1: Part manual baru menyimpan OEM + komponen; context picker dipakai sekali (tidak bocor); save yang ditolak validasi tidak menyentuh data; tanpa ensurePart ganda.
- R2: Part arsip keluar dari picker/matching/dashboard; Stock Master punya toggle kecil "Tampilkan part arsip", badge "📦 Arsip", tombol ♻️ pulihkan (jurnal `restore`).
- R3/W1: archive menjurnal `qtyBefore→0` (`reason:'archive'`), `archivedQtyBefore`; ledger punya `source` + `at`.
- W2: kompatibilitas kendaraan picker didelegasikan ke `Sparepart.isPartForVehicle` (tetap mendukung `vehicleIds`).
- W6/R4: `part-crud-s2041.js` didaftarkan di `scripts/build.js` (GROUP_B, setelah sparepart-servis-ui.js), loader standalone dihapus dari index/app_production, load-guard idempoten; versi disinkronkan via build → 2150.

## Verifikasi
- Tes baru: `tests/part-crud-s2041-behavior.test.js` — 12 tes (fake DOM+vm); 7 gagal di kode lama, semua lolos sekarang.
- `tests/part-crud-s2041.test.js` disesuaikan (loader kini lewat bundle).
- Full suite: baseline 7925 pass / 5 fail → akhir **7942 pass / 5 fail**; 5 gagal identik baseline (S1860, v22 empty-catch `service-interval-sot.js:159`, 3 tes vehicle-jenis). **0 regresi baru**; 11 gagal sinkron-versi dari patch lama hilang.
- Gate rilis: bundle-freshness PASS. Tidak lolos: lint & minify (esbuild/eslint tidak ada, perlu override standar) dan service-sot-integrity (gagal identik di base).

## Level verifikasi
STATIC VERIFIED · UNIT VERIFIED (fake DOM) · INTEGRATION: NOT VERIFIED · BROWSER UI: NOT VERIFIED (perlu cek manual: form servis, form transaksi, modal stok, daftar stok mobile/desktop).

## Belum dikerjakan (di luar scope additive ini)
W3 inferensi berbasis nama (pra-ada), W4 fallback id kategori→komponen di urgency legacy, W5 perbandingan multi-engine due, W9 field partType, W10 deteksi duplikat Part.

## Rollback
Kembalikan file dari ZIP patch S2041 sebelumnya (bundle, index, app_production, sw.js, build.js, part-crud-s2041.js, tes); atau hapus entri part-crud-s2041 dari build.js lalu rebuild.
