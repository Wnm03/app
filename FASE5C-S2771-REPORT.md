# Fase 5C — S2771 (akumulasi di atas S2769): layar kunci PIN

> Catatan: nomor 2770 terlewati (build kedua menaikkan versi otomatis); patch ini berversi 2771. Kode/tes yang memakai label "S2770" adalah bagian dari patch ini.

## Perubahan
- `modules/shared/keamanan-pin.js`: PIN salah kini memberi umpan balik visual — titik berwarna error + getar 0,4 dtk + pesan inline "PIN salah (n/5)" (aria-live). Pesan dihapus saat digit pertama diketik. Logika verifikasi/penguncian tidak diubah.
- `index.html`, `app_production.html`: `#pinLockMsg` tanpa warna inline (#ef4444, ±3,7:1 di tema terang), kini `role="status" aria-live="polite"`.
- `tokens.css` (blok FASE 5C, tanpa pemaksaan prioritas): token `--pin-error` per tema (Dark/Graphite #f87171, Light/Modern #b91c1c); tombol PIN memakai `--card-radius`+4px, `--font-num`, tinggi ≥ `--touch-min`; titik 14→16px. Getar otomatis mati oleh aturan global `prefers-reduced-motion`.

## Terukur (Chromium, 4 tema × mobile 390/desktop 1440, PIN salah 1×)
- Kontras pesan: Dark 7,20 · Light 5,95 · Graphite 6,73 · Modern 6,20 (≥4,5).
- Tombol 85×61px; radius 18px (Dark/Light) dan 14px (Graphite/Modern); font angka mengikuti tema.
- Titik error aktif lalu padam otomatis; pesan hilang saat ketik lagi; 0 error console, 0 scroll horizontal.
- Screenshot + metrik: `docs/screenshots-fase5c/`.

## Belum
- Sisa Fase 5: empty state, skeleton loading, transisi halaman. Tidak diuji: Safari/Firefox, Android, VoiceOver/TalkBack, alur 5× salah → kunci (logika tidak diubah).
