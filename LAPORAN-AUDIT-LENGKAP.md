# LAPORAN AUDIT LENGKAP — PREORDER + KASIR

Tanggal: 1 November 2026. Baseline: `app-main.zip`. Kandidat: `PATCH-KUMULATIF-PREORDER-KASIR-HARDENING-SOURCE.zip`.

## Ringkasan eksekusi
- Source/test berbeda dari baseline: **20 file** (15 berubah + 5 baru), **19 JavaScript**.
- `node --check`: **19/19 PASS**.
- Test terarah setelah tambahan test exception: **65 PASS / 0 FAIL**.
- `node scripts/build.js`: **PASS**, build lokal versi **2723**; kedua bundle lolos `node --check`; minifikasi esbuild berhasil.
- `python3 scripts/refresh-file-hashes.py --write`: exit **0**, 59 entri diproses; hasil **44 ok / 15 basi**.
- Full suite `node --test tests/*.test.js`: **TIDAK SELESAI** karena batas waktu lingkungan. Log parsial menunjukkan 3.434 event subtest, 3.416 `ok`, 18 `not ok` sebelum proses berhenti. Ini bukan total suite. Failure belum diklasifikasikan sebagai pre-existing karena baseline full-suite run yang setara belum dilakukan.
- Browser nyata: **TIDAK DIKERJAKAN**. Playwright/Puppeteer/@playwright/test tidak tersedia sebagai dependency Node. Tidak ada klaim viewport 320/390 atau nol `pageerror`.
- ZIP Etalase pendahulu tidak tersedia; tidak ada klaim byte-identik terhadap ZIP tersebut.

## Matriks P1–P4
| Item | Status awal | Tindakan/verifikasi | Status akhir | Bukti |
|---|---|---|---|---|
| P1.a Rollback Order | Sebagian; branch `!ok` ada | Test `!ok` dan test baru exception; stok, `D.cobek`, transaksi, piutang kembali; preorder tetap open | SEBAGIAN | `tests/preorder-hardening-p1-regression.test.js` |
| P1.b Hapus penjualan | Hook kedua jalur ada | Kedua jalur source diperiksa; helper idempoten diuji. Integrasi Finance/piutang/stok penuh belum diuji | SEBAGIAN | `cobek-order.js`, `tx-list-cashflow.js` |
| P1.c Hapus produk | Konfirmasi jumlah dan cancelForProduct ada | Pembatalan massal dan rollback saat save gagal diuji; delete produk dan pembatalan belum atomik end-to-end | SEBAGIAN | `cobek-etalase.js`, `preorder.js` |
| P1.d Backup/restore/import | Migrasi legacy dan merge preorders ada | Restore merge + backup tanpa `preorders` diuji; round-trip aplikasi nyata, import, dan app-wide audit belum | SEBAGIAN | `backup-restore.js`, `preorder-tahap1-v2725.test.js`, `data-health-check.js` |
| P1.e ID produk | Generator collision hardening ada | Empat produk timestamp sama dan ID caller valid/unik diuji | SELESAI DAN TERUJI | `product-repository.js`, test PASS |
| P1.f Qty preorder | Belum ada warning mismatch | Tidak diimplementasikan | BELUM DIKERJAKAN | Tidak ada assertion mismatch |
| P1.g Double-click | Belum ada bukti | Belum ada simulasi dua submit bersamaan | BELUM TERUJI | Tidak ada bukti transaksi tunggal |
| P2.a Tile habis + form preorder Kasir | Belum ada | Tidak diimplementasikan | BELUM DIKERJAKAN | `kasir.js` masih menonaktifkan tile habis |
| P2.b Satu jalur pemenuhan | Jalur Order ada | Source tetap `Preorder.beginFulfil` → modal Order → `recordShopSale`/`syncShopSalePayment` | SELESAI PADA LEVEL SOURCE | `preorder.js`, `cobek-order.js`; bukan browser E2E |
| P2.c Akses panel/responsif | Panel Etalase ada, akses/layout belum lengkap | Tidak diuji browser 320/390 dan tidak diubah | BELUM DIKERJAKAN | Tidak ada hasil viewport |
| P2.d Status stok | stockAvailabilityStatus tersedia | Engine diperiksa; pemakaian seluruh tampilan belum dibuktikan | SEBAGIAN | `inventory-engine.js`, test status stok |
| P2.e Badge preorder Riwayat | Belum ada | Tidak diimplementasikan | BELUM DIKERJAKAN | Tidak ada badge row |
| P3.a Kembalian | Belum ada | Tidak diimplementasikan; DP/preflight tidak disentuh | BELUM DIKERJAKAN | Belum ada test |
| P3.b Struk | shareReceipt/buildReceiptText ada | Tidak ditambah nomor transaksi/kasir/metode/DP/piutang/kembalian/cetak | SEBAGIAN | Fungsi existing saja |
| P3.c Parkir keranjang | Belum ada bukti | Tidak diimplementasikan | BELUM DIKERJAKAN | Tidak ada storage parkir |
| P3.d Barcode | Scan UI yang ada adalah OCR nota/import | Tidak menambah kamera/field tanpa skema barcode tervalidasi | BELUM DIKERJAKAN | `shop-scan-ui.js`; bukan barcode Kasir |
| P3.e Rekap harian | Belum ada | Tidak diimplementasikan | BELUM DIKERJAKAN | Tidak ada proyeksi rekap |
| P3.f Retur | Order.delete jalur existing | Jalur dipertahankan; UX retur khusus belum | SEBAGIAN | `Order.delete()` |
| P4 DP preorder | Dokumen desain tersedia | Hanya dokumen, tanpa mutasi DP | SELESAI SEBAGAI DESAIN SAJA | `DESAIN-P4-DP-PREORDER.md` |

## Bukti SOT
- Pemenuhan preorder tetap membuka modal Order.
- Order menggunakan `recordShopSale()`; pembayaran menggunakan `syncShopSalePayment()`.
- Rollback transaksi baru memakai `FinanceTxSOT.removeById`, `BillDebtPiutangCanonicalWriter.removeById`, `rollbackShopItems`, dan menghapus row `D.cobek` terkait.
- `Preorder.markFulfilled()` dilakukan setelah pembayaran berhasil.
- `Preorder.onSaleRemoved()` hanya mengubah metadata preorder.
- Tidak dibuat ledger preorder atau rumus saldo/profit/stok baru.

Batas bukti: source dan test harness, bukan transaksi aplikasi nyata. Belum ada saldo akun sebelum/sesudah untuk skenario lunas dan DP/piutang. DP preorder P4 tidak diimplementasikan.

## Validasi
| Pemeriksaan | Hasil |
|---|---|
| Test terarah | 65 PASS / 0 FAIL |
| `node --check` JS berubah | 19/19 PASS |
| Build | PASS, versi 2723, bundle syntax PASS |
| Refresh hash | exit 0; 44 ok / 15 basi |
| Full suite | timeout; hasil final tidak tersedia |
| Browser | tidak dijalankan |
| Lunas + DP sebelum/sesudah | tidak dijalankan |
| Baseline full-suite comparison | tidak dijalankan |

## Risiko tersisa
1. Full suite timeout dan tidak ada baseline full-suite run setara; 18 failure pada log parsial tidak boleh dianggap pre-existing.
2. Refresh hash melaporkan 15 entri basi (termasuk bundle, HTML, source, docs); wajib diselesaikan di release pipeline.
3. P1.c belum atomik lintas pembatalan preorder dan penghapusan produk.
4. P1.d belum memeriksa preorder di `scripts/app-wide-data-integrity-audit.js` dan belum membuktikan import/round-trip backup nyata.
5. P1.f/P1.g belum ditutup; double-click belum diuji.
6. P2.a/P2.c/P2.e belum dikerjakan; P2.d sebagian.
7. P3.a–P3.e belum dikerjakan; P3.f belum mendapat UX retur khusus.
8. Browser, reload IndexedDB, pageerror/console.error, viewport 320/390 belum diuji.
9. Saldo akun eksplisit untuk preorder lunas dan DP/piutang belum diverifikasi.
10. ZIP Etalase pendahulu tidak tersedia; byte parity tidak dapat dibuktikan.

## Keputusan release
**HOLD untuk produksi.** ZIP ini mempertahankan source preorder/Etalase/hardening yang tersedia dan menambah uji exception rollback. Ini bukan implementasi lengkap prompt P1–P4 dan bukan bukti Kasir Profesional selesai.
