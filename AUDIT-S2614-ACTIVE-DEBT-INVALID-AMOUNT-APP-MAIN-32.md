# Audit S2614 — nominal utang aktif tidak valid

S2614 memperkenalkan fail-closed untuk nominal utang aktif yang hilang/kosong/non-numerik/negatif. Audit lanjutan menemukan coercion yang belum ditutup untuk string whitespace, boolean, dan array kosong; nominal tagihan juga memiliki pola serupa.

Temuan tersebut ditutup pada S2615. Lihat `AUDIT-S2615-FINANCE-INVALID-NUMERIC-COERCION-APP-MAIN-32.md` dan manifest kumulatif S2615 untuk hasil validasi final. Full test dan release-final gate lulus; E2E Chromium belum terverifikasi karena diblokir kebijakan lingkungan.
