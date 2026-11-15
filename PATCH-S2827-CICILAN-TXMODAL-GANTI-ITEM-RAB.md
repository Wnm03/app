# PATCH S2827 — Edit cicilan lewat form Transaksi bisa mengganti item RAB (AKUMULATIF S2821 s/d S2827)
Dasar: S2826 (build 2842) -> build 2843. Menutup sisa temuan S2826: "mengubah pilihan item pada cicilan yang sudah dibuat lewat form Transaksi".

## Perbaikan
- `modules/finance/tx-renov.js`: `updateTxRenovItemOptions(presetId)` — item yang sedang tertaut pada bill ikut dimuat (walau sudah lunas / item bentukan bill) dan terpilih. Tanpa preset perilaku S2826 tidak berubah. `applyTxRenovBillItemChange(bill)` (baru) menyimpan pilihan ke `bill.renovItemLinkId`; "Buat item baru otomatis" melepas tautan; tidak berbuat apa-apa bila dropdown tersembunyi, panel tak dicentang, proyek berbeda, atau pilihan tak ada di proyek.
- `modules/finance/transaksi.js`: `editTx` memanggil `updateTxRenovItemOptions(linkedBill.renovItemLinkId)` setelah Cara Bayar cicilan diset.
- `modules/finance/transaksi-b.js`: cabang edit cicilan (pembayaran terbaru) memanggil `applyTxRenovBillItemChange(existingBill)`.
- `modules/shared/modals.js`: teks bantu `txRenovItemHint`.

## Perilaku (sama dengan form Tagihan, S2825)
Pilihan baru berlaku untuk pembayaran BERIKUTNYA. Pembayaran yang sudah tercatat tetap di item lamanya (tidak dipindah, supaya item bentukan bill tidak tertinggal kosong dan total rencana tidak dobel).

## Tes & gerbang
- `tests/s2827-renov-cicilan-txmodal-ganti-item-rab.test.js`: 8 tes baru (RED -> GREEN).
- Suite penuh 9.868 tes; hanya 3 gagal BAWAAN zip (S1780, s1608, S2308). verify-bundle-freshness, verify-window-expose, `build --require-minify` OK.
- Belum diuji di browser nyata sesi ini (hanya tes unit/sumber).

## Masih terbuka (sengaja tidak dikerjakan)
- Saldo vs pengeluaran bertanggal masa depan: mengubah `recalcAccBalance` menyentuh seluruh saldo/laporan/aset tertaut; butuh keputusan desain (mis. flag "terjadwal" atau potong saldo per tanggal).
- Export/Import Excel & PDF: pustaka CDN (jsPDF, SheetJS) tak terjangkau dari lingkungan kerja; logika murni sudah dites dengan stub (S2767, S2817), unduhan nyata belum.
- Import CSV hanya membawa item rencana: DP/Termin dan cicilan membuat transaksi/saldo nyata, status lunas tanpa pembayaran akan tak sinkron dengan transaksi; butuh keputusan desain.
