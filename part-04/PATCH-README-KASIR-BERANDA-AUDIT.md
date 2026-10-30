# Patch v2631 — Audit Kasir AI (tampilan) + Beranda (Kas/Akun)

Diuji di Chromium headless (HP 390px & desktop 1280px), data contoh, checkout Kasir sungguhan.

## Perbaikan
1. pwa-ui-layer.css — Kasir AI di HP berantakan: grid 2-kolom desktop (:not(.u-dnone), specificity lebih tinggi) mengalahkan override mobile → produk/keranjang terjepit 54px & saling timpa. Sekarang 1 kolom di HP, 2 kolom ≥861px.
2. styles.css — toggle Harga Jual/Reseller menciut 8px karena toggle tampilan grid/list melebar 100%. Toggle tampilan dikunci 96px.
3. index.html + app_production.html — ikon search kasir lepas (parent tanpa position:relative).
4. dashboard-hub-overview.js — kartu "Kekayaan Bersih": angka utama = net worth penuh, tapi baris hanya kas/aset (tidak menjumlah; Stok bisnis & Piutang tidak tampil, baris utang dihitung salah). Kini baris Stok bisnis, Piutang, Utang dari SSOT; hint diversifikasi pakai porsi riil (91%, bukan 100%).

## Diverifikasi akurat (tanpa perubahan)
Saldo semua akun, Kas & akun, Arus Kas (masuk/keluar/bersih/tabungan), Shop (omzet, untung, margin, modal stok), saldo setelah checkout Kasir + DP→Piutang, stok berkurang.

## Build/tes
node scripts/build.js → v2631. Tes UI/dashboard/aset/shop/kasir: 848+395 lulus, 0 gagal. (Suite penuh tidak dijalankan: >10 menit.)
File lain (bundle, sw.js, chat-action-handlers, modals, modules-calc, modules-render, features-helpers) hanya stempel versi hasil build.

## Addendum — audit bug serupa (v2635)
- Scan runtime 9 halaman + semua sub-tab di 390px: 0 overflow horizontal, 0 kolom grid terjepit, 0 teks terjepit, 0 kontrol menciut (selain badge/checkbox kecil yang memang kecil). Pola bug Kasir tidak ditemukan di halaman lain.
- Akurasi Beranda dengan data utang+cicilan+aset+tagihan: Kekayaan Bersih (7.895.000 = 3.250.000+10.000.000+345.000−5.700.000), Tagihan, Utang cocok dengan sumbernya.
- Fix: kartu Kesehatan Finansial menampilkan skor komponen sebagai "Rasio Utang 100%" (menyesatkan, padahal tidak ada utang) → label kini "… (skor)".
