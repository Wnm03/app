# S2638 — Form transaksi & kartu Tagihan (tampilan saja; fungsi & SOT tetap)

Diukur di Chromium 390×844 (build 2639), scroll total modal transaksi:

| Skenario | Sebelum | Sesudah |
|---|---|---|
| Makanan | 861 | 861 |
| Kendaraan > Parkir | 1.037 | 1.037 (panel tetap) |
| Kendaraan > Sparepart | 1.037 | 1.037 (Stok + Servis relevan) |
| Kendaraan > Servis & Oli | 1.620 | 1.331 |
| Posisi Keterangan, Servis & Oli | 1.411 | 652 |
| Kendaraan > Bensin | 949 | 949 |

Perubahan: aturan subkategori yang memunculkan panel Part/Shop/Servis TIDAK diubah (sesuai ralat);
field lanjutan Servis dilipat; Keterangan+Tanggal naik; label "Jadwalkan, bayar nanti" / "Bayar di Muka" /
"Cicilan ke-1 (dibayar sekarang) · Tanggal" + pratinjau cicilan ke-2; kartu maks 2 chip (sisanya di ▾), nama 2 baris,
tombol "✅ Bayar"; empty state "Berikutnya: …"; header/pil Tagihan tidak pecah di 390 px.
Tes: 9.133 lulus, 0 gagal. Belum diuji: alur "Bayar di Muka" sampai selesai.
