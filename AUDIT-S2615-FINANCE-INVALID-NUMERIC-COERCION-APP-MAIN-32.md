# Audit S2615 — invalid numeric coercion pada rekonsiliasi kas

## Temuan dan perbaikan
Audit S2614 memperketat nominal utang aktif, tetapi `Number('   ')` menghasilkan `0`; boolean `false` dan array kosong juga dapat dipaksa menjadi angka nol. Karena nominal nol dilewati, data rusak dapat lolos tanpa status blokir. Validasi nominal tagihan memiliki pola coercion serupa.

S2615 memperbaiki keduanya dengan membatasi tipe sumber ke `number`/`string`, menolak string kosong setelah `trim()`, lalu memeriksa nilai finite dan non-negatif. String numerik valid tetap didukung demi kompatibilitas.

## Bukti uji final
- Regression suite terpilih: 31/31 lulus.
- Full suite final: 9.068 total, 9.067 lulus, 0 gagal, 1 skipped.
- Build v2608, bundle freshness, reproducible build, release-final gate: PASS.
- Release readiness PASS; production readiness 14/14; release UI/performance budget PASS.
- E2E tidak terverifikasi: Chromium diblokir kebijakan lingkungan (`ERR_BLOCKED_BY_ADMINISTRATOR`).

## Status target
Celah coercion yang ditemukan telah diperbaiki, regression test lulus, full suite dan release-final gate lulus. Satu batas verifikasi tersisa adalah E2E runtime pada lingkungan browser yang mengizinkan origin lokal; karena itu paket diberi label `NOT-E2E-VERIFIED` dan tidak diklaim telah lulus E2E.
