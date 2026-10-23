# AUDIT S2705 — `getCachedTxDateMs` cek cache lebih dulu

Baseline: `app-main (36)` SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`. Build: `...-2659`.

| ID | Prioritas | Modul | Ringkasan |
|----|-----------|-------|-----------|
| S2705-P1-1 | P1 | `modules/shared/features-helpers-global-security.js` | Regex + closure dibuat tiap panggilan sebelum cek cache. Dibalik: cache dulu. |

Kontrak: nilai identik (NaN, string ISO, format lain, Date, angka); cache tetap per objek dan invalid saat `t.date` berubah.
Ukuran: benchmark Node terisolasi 25.000 objek x 20 putaran, median 5 ulangan: lama 91–105 ms, baru 29–36 ms. Belum diukur end-to-end di browser.

## Belum dikerjakan
- `goalSourceFI→annualExpense→targetNominal` (±156 ms), `_buildSaveJson` (±94 ms), snapshot `JSON.stringify(D)` di `_saveTxInner` (±85 ms), `predictService` via decision engine (±206 ms). Butuh uji browser dan perubahan struktur penyimpanan.

## Rollback
Kembalikan `modules/shared/features-helpers-global-security.js` dari baseline, `npm run build`, `refresh-file-hashes.py --write`.
