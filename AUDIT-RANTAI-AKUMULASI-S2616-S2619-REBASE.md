# Audit Rantai Perbaikan dan Akumulasi S2616–S2619

Tanggal audit: 2026-10-22

## Temuan lineage
Overlay kumulatif v2623 tidak kompatibel penuh dengan baseline yang dinyatakan (`app-main (33).zip`). Bukti: `index.html` overlay lebih kecil dan kehilangan elemen yang ada di baseline, termasuk `lapAccList`, `periodeChips`, `lapMonthNav`, dan `lap-subtabs`; `styles.css` overlay 180,572 byte dan melewati budget 180,000 byte. Ini menyebabkan kegagalan struktural pada navigasi laporan, tab Dana Titipan, FAB, dan kontrak CSS.

## Tindakan korektif
1. Memulai kembali dari baseline bersih `app-main (33).zip`.
2. Mempertahankan patch kumulatif Dashboard S2616, Finance S2617, Shop S2618, dan target S2619 melalui file sumber yang diubah serta dokumen lineage.
3. Menggabungkan perubahan HTML yang dibutuhkan secara aditif, bukan menimpa halaman baseline dengan HTML dari lineage berbeda.
4. Mempertahankan fitur laporan lama, menambahkan kontrol omzet dan BI Shop, serta mempertahankan subtab Dana Titipan.
5. Memindahkan CSS dashboard tambahan ke lapisan UI dan mempertahankan FAB guard pada `styles.css` dalam budget.
6. Membangun ulang produksi dari sumber hasil rebase; menyinkronkan versi/cache ke v2627.
7. Memperbarui kontrak tes untuk perubahan perilaku yang disengaja dan memvalidasi hash manifest.

## Hasil pengujian
- Full test: 9,110 tests; 9,109 pass; 0 fail; 1 skip.
- Tes terpilih rebase: 82/82 pass.
- Tes tambahan kontrol omzet: 18/18 pass.
- Build/minifikasi, sintaks bundle, window expose, bundle freshness, ukuran sumber, dan hash manifest: pass.
- ESLint file terkait: 0 error, 74 warning.
- Browser E2E tidak dapat dijalankan karena kebijakan lingkungan memblokir navigasi lokal.

## Risiko substantif yang belum ditutup
- Atomisitas stok/order dengan posting transaksi/piutang belum terbukti lintas semua koleksi saat kegagalan runtime.
- E2E nyata untuk enam jalur impor, pembayaran bertahap/edit/cancel, serta pergantian mode omzet belum dijalankan.
- Transaksi lama tanpa field ongkir tidak dapat direkonstruksi secara pasti; UI menandai keterbatasan tersebut dan tidak mengubah data sumber.

Kesimpulan: lineage telah direkonsiliasi dan suite penuh lulus; status rilis tetap PARTIAL sampai E2E di browser yang diizinkan serta uji kegagalan transaksi lintas koleksi selesai.
