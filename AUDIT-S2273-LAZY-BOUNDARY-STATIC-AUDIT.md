# S2273 — Lazy Boundary Static Audit

## Tujuan

Mencegah regression kelas S2271/S2272: modul dipindahkan ke lazy residency tetapi consumer eager tetap menganggap global modul sudah tersedia pada cold start.

## Kontrak

` scripts/audit-lazy-boundaries.js ` memeriksa:

- setiap file pada lazy-feature registry tetap ada;
- file lazy tidak kembali ke `scripts/build.js`/GROUP_B;
- setiap file lazy tetap dimiliki loader canonical;
- consumer penting memiliki demand-load/dispatcher contract;
- `txStockScanPartVia()` memuat scanner sebelum `SparepartScanner.scan()`;
- self-test memuat lazy diagnostic boundaries sebelum menjalankan cases;
- dispatcher `data-action` memiliki owner loader untuk lazy actions.

## Batasan

Audit ini adalah **static contract audit**, bukan pengganti browser cold-start E2E. Pengujian cold-start nyata dengan cache/SW/browser tetap menjadi tahap terpisah.

## Exit criterion

`node scripts/audit-lazy-boundaries.js` harus exit `0` dan melaporkan seluruh known contracts PASS.
