# AUDIT S2195 — Bill/Debt/Piutang Concurrency & Idempotency

## Scope
Audit mutation boundary `BillDebtPiutangCanonicalWriter` untuk repeated delete, duplicate retry, archive collision, dan retry setelah collision.

## Temuan
`moveById()` sebelumnya menghapus row dari collection sumber sebelum `add()` ke destination. Bila destination sudah memiliki ID yang sama, `add()` melempar exception setelah source terhapus. Ini dapat meninggalkan state setengah-mutasi pada retry/archive collision.

## Repair
`moveById()` sekarang:
1. Memeriksa collision destination terhadap ID source sebelum mutasi.
2. Menjalankan transform sebelum source dihapus.
3. Memeriksa collision destination terhadap ID hasil transform.
4. Baru setelah semua guard lolos, menghapus source dan menambahkan destination.

Tidak ada perubahan schema atau UI.

## Idempotency invariants
- repeated delete terhadap ID yang sudah hilang => no-op (`0`).
- duplicate create dengan ID canonical yang sama => ditolak tanpa row kedua.
- archive collision => source tetap utuh.
- transform collision => source dan destination tetap utuh.
- setelah collision diselesaikan, retry archive menghasilkan tepat satu row destination.

## Verification
- S2186 writer regression + S2195 concurrency/idempotency: **9/9 PASS**.
- Combined S2186–S2195 targeted suite: **27/27 PASS**.
- `node --check` canonical writer: **PASS**.
- `node scripts/build.js`: **PASS**.
- Bundle A/B syntax: **PASS**.
- esbuild tidak tersedia; bundle hasil build tidak diminify.
- Generated bundle/version/HTML/SW artifacts tidak termasuk patch S2195.
