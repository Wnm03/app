# Fase 1B — S2759 (akumulasi di atas S2758)

## Tujuan tahap

Melanjutkan persiapan validasi visual yang tertunda pada S2758. Cakupan yang belum memiliki screenshot adalah sub-tab Keuangan, empat sub-tab Laporan (termasuk Dana Titipan), delapan tab Shop, dan modal tambah transaksi.

## Perubahan S2759

- Menambahkan `tools/capture-fase1b-extended.py`, runner Playwright yang menyiapkan seed sintetis in-memory dan menangkap seluruh tab Keuangan, sub-tab Laporan, tab Shop, serta modal tambah transaksi pada viewport 390×844, 768×1024, dan 1440×900.
- Runner memblokir service worker, merekam error console/page, memeriksa horizontal overflow, dan menulis `capture-report.json` bersama screenshot di `docs/screenshots-fase1b/`.
- Menambahkan tes statis untuk memastikan daftar tab pada HTML dan cakupan runner tidak terlewat.
- Tidak mengubah runtime HTML/CSS/JS, data aplikasi, navigasi, transaksi, service worker, cache key, atau bundle.

## Verifikasi yang benar-benar dijalankan

- `node --test tests/fase0-fase1-ui-tokens.test.js tests/fase1b-important-reduction.test.js tests/fase1b-extended-capture-coverage.test.js`: **10/10 PASS**.
- `python -m py_compile tools/capture-fase1b-extended.py`: **PASS**.
- Overlay S2758 ke baseline `app-main (5).zip` berhasil disiapkan untuk pengujian.
- Browser capture belum dijalankan sampai menghasilkan screenshot di sandbox ini. Capture terdahulu pada S2758 terhalang kebijakan Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`); runner S2759 disediakan untuk mesin pengembangan yang mengizinkan Chromium dan localhost.
- Full test suite, release lint/minify, dan audit visual browser belum diklaim PASS.

## Status teknis yang belum berubah

- `!important`: masih 185 (106 `styles.css`, 76 `modern-ui-layer.css`, 3 `pwa-ui-layer.css` menurut inventaris S2758). S2759 tidak menghapus deklarasi secara spekulatif.
- `@layer`: belum dimigrasikan karena perubahan parsial berisiko mengubah cascade.
- Gate screenshot lengkap sebelum Fase 2 masih terbuka.

## Cara menjalankan capture

Dari root proyek `app-main` pada mesin pengembangan:

```bash
pip install playwright
playwright install chromium
python3 tools/capture-fase1b-extended.py
```

Output disimpan ke `docs/screenshots-fase1b/`. Periksa `capture-report.json`, `missing_controls`, `errors`, error console, dan horizontal overflow sebelum menggunakan screenshot sebagai dasar perubahan CSS.
