# Audit Sinkron Stok Shop↔Keuangan (tambah/edit/hapus) — build 2785 (B4–B9)
Basis: app-main (7) + patch audit-browser B1–B3. Chromium (Playwright), form diisi & Simpan diklik.

## Bug terkonfirmasi
### B4 — Edit pembelian stok setelah sebagian terjual
Repro: produk stok 10; beli 10 (stok 20); jual 15 (stok 5); edit pembelian jadi 12.
Sebelum: stok 12 (seharusnya 7). Edit jadi 4: lolos, stok 4 (seharusnya ditolak).
Sebab: rollback qty lama di-clamp ke 0 oleh mutateStockDelta, lalu qty baru ditambah penuh. Jalur hapus (S2727) dan lepas-centang (S2780) sudah menolak kasus ini; jalur edit belum.
Perbaikan: precheck per produk (stok - qtyLama + qtyBaru >= 0) + urutan tambah-dulu-baru-rollback.
Sesudah: 10→12 = stok 7; 10→4 ditolak; hapus tetap diblokir.

## Lolos
Beli stok (tambah/edit qty/pindah akun/ganti produk/ubah kategori), jual (edit qty/ganti produk/lepas centang/DP+piutang), hapus beli & jual, produk sudah terhapus, Etalase +stok -> tx tertaut, edit/hapus dari layar Shop (Order), produk baru lewat tx, reload identik. Data nyata (backup 2026-11-09): 16 tx beli + 16 tx jual — edit tanpa ubah tidak mengubah stok/saldo; hapus jual memulihkan stok tepat; hapus beli diblokir bila stok < qty (12 dari 16).

## Perlu keputusan
Koreksi Stok manual (Etalase) tidak menulis ShopInventoryLedger -> ledger MISMATCH vs stok (Lumpang 21-22cm). Usul: catat entri ledger source 'stock-correction' di jalur koreksi.

## Bug terkonfirmasi (lanjutan)
### B5 — Stok komponen bundle menggelembung setelah hapus/edit penjualan
Repro (skrip vm, kode sumber nyata): bundle "Lumpang 20cm+alu" stok 5, dasar "Lumpang 20cm" stok 1. Jual 3 -> dasar 0 (terpotong hanya 1). Hapus penjualan -> dasar 3 (seharusnya 1).
Sebab: consume di-clamp ke 0 oleh mutateStockDelta, restore menambah qty penuh; add-on dipotong dari kandidat yang stoknya cukup tetapi dikembalikan ke kandidat pertama.
Perbaikan: consume mencatat jumlah terpotong sebenarnya (item.linked), restore mengembalikan persis itu ke produk yang sama; tanpa blokir baru. Data lama tanpa linked memakai perilaku lama.
Verifikasi: 7 tes unit baru; belum diuji di browser nyata (Playwright tidak dijalankan di sesi ini).

## Lanjutan: ledger Etalase & carnotes/servis/sparepart (B6–B9)
- B6 Ledger: Etalase.save (koreksi/tambah/edit/produk baru) tidak menulis ShopInventoryLedger -> kini 1 entri per perubahan stok. Pertanyaan desain di sesi sebelumnya dijawab: usul `stock-correction` dilaksanakan.
- B7 Edit belanja part terpasang: stok habis terpakai auto-link -> edit selalu gagal. Auto-link dilepas dulu bila servis memasang ulang; precheck pesan jelas bila tidak.
- B8 Hapus transaksi belanja part terpasang: stok hantu (+qty). Pemakaian dilepas dulu; revert gagal melempar error; blocker hapus untuk part terpakai.
- B9 Servis.del/delSession: belanja part tx tertaut tidak dibatalkan -> stok hantu. Kini dibatalkan setelah pemakaian dikembalikan, rollback bila gagal.
Verifikasi: repro nyata via vm di kode sumber (B7, B8, B9 gagal di baseline, lolos setelah fix) + 20 tes unit baru. Belum diuji di browser nyata.
Belum diaudit: edit transaksi saat centang Sinkron Servis dimatikan bersamaan dgn auto-link (unlink servis) -- precheck konservatif; jalur Servis.save() edit usedPart manual (SOT strict, tidak clamp).

## Status test suite
Baseline app-main (7): 5 gagal (S1780, s1608, S2308, S256AU x2). Patch B1-B5: 5 gagal yang sama persis, tanpa regresi.

## Lanjutan browser: Part, BBM/odometer, Reminder (B10) — build 2786
Diuji di Chromium (Playwright), form diisi & Simpan diklik. Lolos: beli+pasang part (tambah/edit qty/hapus dari Keuangan, Servis.del, delSession); BBM (tambah, edit dari Car Notes & Keuangan, lepas centang Sinkron BBM, hapus dari kedua sisi, ganti akun, rollback odometer).
### B10 — Servis dari form Keuangan tidak me-reset Pengingat
Sebab: recordServisLog() tanpa actionType; reset pengingat hanya menghitung ganti/pasang/overhaul. Car Notes memakai default 'ganti'.
Perbaikan (tx-servis.js): simpan actionType; update tidak menimpa nilai yang ada; default 'ganti' hanya untuk pembuatan baru tanpa paket pengingat. Log lama (actionType kosong) TIDAK dimigrasi.
### Perlu keputusan — KM manual tidak bisa dihapus/diedit
Typo KM (mis. 999.999) mengunci input BBM/servis berikutnya (pesan menyebut "catatan BBM") dan membuat pengingat "terlewat" palsu. Belum ada UI hapus/edit kmLogs.

## Lanjutan (B11–B12) — KM manual & paket pengingat — build 2791
### B11 — KM manual bisa diedit/dihapus (menutup "Perlu keputusan" B10)
Keputusan yang diambil: tombol edit/hapus di riwayat KM manual (modal Update Kilometer) + pesan penolakan menyebut sumber KM. Diuji di browser: typo 999.999 -> pengingat "terlewat" -> hapus lewat dialog konfirmasi -> KM 12.000, pengingat normal, BBM 13.000 km lolos validasi; edit menimpa record yang sama.
### B12 — Paket pengingat
Repro vm/browser: paket COMPLETED + log penyelesai dihapus -> paket tetap COMPLETED (terminal), tak pernah aktif lagi. `byId` null untuk paket buatan `create()` (id numerik vs string). Keduanya diperbaiki; 6 tes unit.
### Sudah diaudit (tanpa temuan)
- Tandai Ganti dari kartu pengingat: log baru di KM kendaraan saat ini, actionType ganti, pengingat reset.
- Ringkasan Beranda (`VehicleReminder.summary`) konsisten dgn `computeServiceUrgency` (km & bulan).
### Masih terbuka / perlu keputusan
1. Edit interval dari kartu pengingat tak berefek bila ada interval pedoman per-kendaraan (form global menampilkan nilai efektif, menyimpan ke kategori).
2. `renderDashboardServisReminder()` (kartu lama Beranda) mati: `#dashServisReminderCard` tidak ada di HTML.
3. Migrasi log servis lama ber-actionType kosong -> 'ganti' (dapat mengubah status pengingat riwayat lama).
4. Belum diaudit: UI pembuatan paket pengingat (tidak ada pemanggil `create()` di aplikasi), checklist paket, snooze/dismiss.
