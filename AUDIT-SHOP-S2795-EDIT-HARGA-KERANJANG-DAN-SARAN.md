# Audit Shop — edit harga keranjang (Kasir AI & Manual) + saran rekomendasi — build 2794 (S2795)
Basis: app-main (7) + patch audit-browser B1–B14 (build 2793). Kode sumber dibaca langsung; perilaku diuji lewat vm (Node) + tes unit.

## Temuan
| # | Jalur | Temuan | Status |
|---|-------|--------|--------|
| K-1 | **Kasir AI** (`modules/business/kasir.js`) | `hargaOverride` sudah ada di model keranjang, `computeTotals`, dan Tahan/Pulihkan keranjang, tetapi **tidak ada UI** untuk mengubahnya. Kasir tidak bisa nego / ubah harga per baris. | Diperbaiki |
| K-2 | **Manual — Order** (`cobek-order.js`) | Input harga inline ada, tetapi: `parseFloat('1e999')` = Infinity lolos `h>0` → total Infinity; angka 0/negatif diam-diam kembali ke harga default tanpa pesan; label "(diedit, default …)" tidak ikut berubah saat mengetik. | Diperbaiki |
| K-3 | **Manual — Penjualan di modal Transaksi** (`cobek-tx-cart.js`, `cobek-io.js`) | Edit harga (S2754) sudah ada, tetapi `harga>0` meloloskan Infinity (tambah ke keranjang maupun simpan edit). | Diperbaiki |
| K-4 | Ketiganya | Tidak ada peringatan jual di bawah modal **per baris** (hanya estimasi untung/rugi total). | Ditambah |
| K-5 | Saran AI Kasir | Prompt tidak tahu harga edit/modal; hanya upsell & stok; tidak ada saran apa pun tanpa API key. | Ditambah saran lokal + prompt diperkaya |

## Perubahan
- `cobek-pricing.js`: `ShopCartAdvice` baru (read-only, tanpa AI/API key): `parsePrice` (satu pintu validasi harga: kosong/NaN/Infinity/≤0/>Rp10 miliar ditolak, desimal dibulatkan ke rupiah), `analyze` (saran), `renderHtml`.
- Kasir AI: tombol ✏️ per baris keranjang → panel harga per pcs (khusus transaksi ini; harga Etalase tidak berubah), tombol cepat "Harga normal" & "Reko Etalase", hint live (total baris, untung, margin), konfirmasi bila di bawah modal, label "(diedit, normal …)", peringatan ⚠️ di bawah modal, kotak "💡 Saran cepat". Draft harga bertahan saat Diskon/Ongkir diketik. Prompt 🤖 Saran AI kini menyertakan harga edit + modal + usulan harga minimum/bundling.
- Order manual: validasi lewat `parsePrice` (angka tidak valid diabaikan, harga lama dipertahankan + pesan di baris; kosong = default), label/peringatan baris diperbarui live, kotak saran.
- Penjualan di modal Transaksi: tolak Infinity, peringatan di bawah modal per baris, saran cepat di bawah subtotal.

## Aturan saran lokal (`ShopCartAdvice.analyze`, maks 5, peringatan dulu)
1. Harga < modal → ⚠️ rugi per pcs. 2. Margin < 10% → margin tipis. 3. Harga diturunkan ≥ 20% dari normal → tawarkan bundling. 4. Harga edit < 90% rekomendasi Etalase. 5. Stok ≤ 3 / habis setelah transaksi → restok. 6. Total transaksi rugi → ⚠️.

## Tidak diubah (catatan / perlu keputusan)
- `shopDiscountedPrice` dipanggil di Kasir dengan guard `typeof` tetapi tidak didefinisikan di file mana pun → selalu jatuh ke rumus inline (sama dengan Order). Kode mati, hasil identik.
- Sumber modal beda: Order memakai `PricingService.getCost`, Kasir memakai `p.hargaBeli` langsung. Sama selama PricingService tidak memodifikasi biaya; usul disamakan.
- Struk Kasir hanya menampilkan total per baris (tanpa `@harga`).

## Saran rekomendasi lanjutan (belum dikerjakan)
1. Opsi "Jadikan harga jual produk" di Kasir (sudah ada di modal Transaksi).
2. Batas diskon/harga minimum atau PIN otorisasi untuk jual di bawah modal.
3. Laporan "penjualan dengan harga diedit" (selisih dari harga normal) untuk memantau kebocoran margin.
4. Saran bundling berdasarkan riwayat produk yang sering dibeli bersama (bukan hanya katalog).
5. Tampilkan `@harga × qty` di struk bila harga diedit.
6. Samakan sumber modal Kasir dengan Order (PricingService).

## Verifikasi
- Tes baru: `tests/audit-shop-s2795-edit-harga-keranjang-saran.test.js` (9).
- Belum diuji di browser nyata (Playwright tidak dijalankan di sesi ini): tata letak panel edit di layar HP perlu dicek mata.

## Lanjutan (build 2795, S2796) — saran lanjutan yang dikerjakan
- Saran #1: panel edit harga Kasir punya centang "Jadikan harga jual/reseller produk". Etalase baru ditimpa SETELAH penjualan & pembayaran sukses (gate `ProductRepository.mutateSetPrice`); gagal checkout = Etalase tidak berubah. Tanda "(jadi harga produk)" di baris.
- Saran #5: struk Kasir menampilkan `@harga` pada baris yang harganya diedit.
- Saran #6: modal Kasir kini memakai `PricingService.getCost` (fallback `hargaBeli`) = sumber sama dgn Order; estimasi untung & peringatan di bawah modal konsisten.
- Masih terbuka (butuh keputusan/fitur lebih besar): #2 batas diskon/PIN, #3 laporan harga diedit, #4 bundling dari riwayat.
