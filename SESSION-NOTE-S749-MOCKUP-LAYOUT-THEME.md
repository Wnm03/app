# Session S749 — Mockup layout, theme, dan release-sync fix

Akumulasi patch S749:
- Mempertahankan seluruh CSS mockup/layout/theme dari patch sebelumnya.
- Mendaftarkan tema Minimal pada `index.html` dan `app_production.html`.
- Memuat `minimal-ui-theme.css` dengan cache-buster release yang konsisten.
- Menyamakan `APP_BUILD_VERSION` dan `PRODUCTION_BUILD_SYNCED_VERSION` ke `1700`.
- Validasi: SA13 release-version sync lulus 2/2; minimal-theme audit lulus 5/5 bila dijalankan terpisah.

Tidak mengubah business logic transaksi atau data layer.
