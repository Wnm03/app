# AUDIT S2706 — `FI.annualExpense` / `monthsOfDataAvailable` tanpa alokasi Date

Baseline `app-main (36)` SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`. Build `...-2660`.

| ID | Prioritas | Modul | Ringkasan |
|----|-----------|-------|-----------|
| S2706-P1-1 | P1 | `modules/shared/modules-calc.js` | `new Date()` per transaksi di dua loop panas; diganti perbandingan ms. |

## Jaminan tidak mengubah fungsi/alur sinkron
- Tetap fungsi sinkron, nama/argumen/nilai kembali sama; tidak ada cache, memo, state global, atau efek samping baru.
- Urutan evaluasi kondisi sama (tanggal → `hitungKas` → `budgetMatchesTx`), NaN/tanggal tak valid berperilaku sama (diuji diferensial).
- Ukuran: Node, 25.000 transaksi, median: ±40 ms → ±16 ms per `annualExpense`. Belum diukur di browser.

## Sengaja tidak diubah
- `JSON.stringify(D)` rollback di `_saveTxInner` (atomisitas transaksi) dan `_buildSaveJson` (sudah ber-cache per versi simpan).
- `Budget.matchesTx` (budget.js).

## Rollback
Kembalikan `modules/shared/modules-calc.js` dari baseline, `npm run build`, `refresh-file-hashes.py --write`.
