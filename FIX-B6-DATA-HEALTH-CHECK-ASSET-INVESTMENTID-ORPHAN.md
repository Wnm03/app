# Sesi B6 — Cek Orphan `investmentId` di Data Health Check

Sesi ringan, follow-up rencana B1–B5 (Aset↔Investasi bridge). Gap yang sama persis
dengan cek `accountId` orphan Aset yang sudah ada di `data-health-check.js` — belum
pernah ada, padahal semua field tautan lain (vehAssetId, catalogId, accountId,
assetId di tx/piutang/utang, dst) sudah punya cek serupa.

## Perubahan

`data-health-check.js`: 1 kondisi baru di dalam `(D.assets||[]).forEach()` yang
sudah ada (sejajar cek `accountId`) — kalau `a.investmentId` terisi tapi holding-nya
tidak ditemukan di `D.investments` (sudah dihapus), push issue `level:'warn'`.

Murni baca (`sameId()`, pola sama cek `assetId` orphan Transaksi/Piutang/Utang), 0
mutasi data, 0 perubahan ke cek lain.

## Kenapa ini perlu

B3 sudah bikin `Aset._resolveLinkedInvestment(a)` fallback graceful (balikin `null`
kalau orphan → baris "🔗 Terhubung ke Investasi" & read-only Atur Porsi otomatis
hilang, 0 crash). Tapi user tidak pernah diberi tahu tautannya putus — field
`investmentId` basi tetap tersimpan diam-diam. Cek ini menutup gap itu, sama
disiplin dgn semua cek orphan lain di file.

## Test

`tests/data-health-check-asset-investmentid-orphan-b6.test.js` (baru, 4 test):
tidak warn kalau `investmentId` kosong; tidak warn kalau tertaut valid; warn kalau
orphan; regresi cek `accountId` lama tetap jalan.

Sekaligus perbaikan kecil di test B4 (`asset-investment-migration-candidates-b4.test.js`,
fungsi `run()`) — tambah `sameId` ke globals `loadSource()`, sebelumnya tidak
kepakai krn belum ada cek lain di `data-health-check.js` yang butuh `sameId` pada
jalur `D.assets` yang di-exercise test itu (murni gap fixture, bukan bug app).

## Regresi

Full suite (`tests/*.test.js`, 3836 test setelah B6) dijalankan ulang →
**3836/3836 lulus, 0 regresi**.
