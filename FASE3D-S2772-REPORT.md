# Fase 3D — Keuangan maks. 2 baris tab (S2772)

Rujukan: RENCANA-UPGRADE-FRONTEND.md §A#2, §D Fase 3 ("Rampingkan ke 2 tingkat; tingkat 3–4 jadi filter dalam konten").

## Temuan audit statis (index.html, Keuangan & Aset)
- Aset: 1 baris tab (`setAsetTab`); chip lain hanya filter dalam konten. Sudah ≤2 baris, tidak diubah.
- Keuangan > Kelola > Transaksi: tab utama + sub-tab Kelola + chip periode (`#txListPeriodeChips`) = 3 baris.
- Keuangan > Laporan: tab utama + chip periode (`#periodeChips`) + sub-tab Laporan = 3 baris.
- Keuangan > Tagihan / Budget / Piutang-Utang: 2 baris (sudah sesuai).

## Perubahan
- `modules/shared/pwa-ux-performance.js`: dua chip periode di atas dilipat jadi satu dropdown "Periode" di dalam konten (pola sama dgn Fase 3C). Chip asli tetap di DOM (disembunyikan) dan tetap sumber kebenaran: dropdown hanya meneruskan klik, sehingga `setTxListPeriode()`, `setPeriode()`, `qsLaporanBulanIni/TahunIni()` dan status aktif chip tidak berubah. Opsi "Custom" tetap memunculkan rentang tanggal.
- `tokens.css`: blok "FASE 3D (S2772)" (`.kw-chips-folded`, `.kw-periode-select`, target sentuh 44px), tanpa `!important`.
- Tes baru: `tests/fase3d-s2772-keuangan-periode.test.js` (5 tes; 3 di antaranya menjalankan kode lipat di DOM palsu).
- Build resmi 2772 (`SKIP_LINT=1`): bundle, HTML, `sw.js` (kw-cache-v2772), konstanta versi, FILE-MAP, COVERAGE; `refresh-file-hashes.py --write`.

## Verifikasi yang benar-benar dijalankan
- Full suite `node --test tests/*.test.js` (overlay di baseline app-main (5)): 9552 tes, 9536 lulus, 15 gagal. 15 itu identik dengan S2771 (juga gagal di baseline); 0 kegagalan baru.
- `verify-bundle-freshness` dan `verify-window-expose` lulus.

## Belum / batas klaim
- Jumlah baris tab TIDAK diukur di browser (Chromium tidak tersedia di sandbox sesi ini); klaim 3→2 berdasar analisis markup statis + tes perilaku di DOM palsu. Jalankan `tools/capture-baseline.py` / `capture-fase1b-extended.py` di mesin dengan Chromium.
- Sub-tab Kelola (3) dan Laporan (4) tetap sebagai baris kedua (konvensi ≤2 baris seperti Mobil di 3C).
- Lint/minify penuh, Safari/Firefox, Android belum. `!important` 186, `@layer` belum.
