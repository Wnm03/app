# PATCH S2742 — Laporan Keuangan: 4 kartu inti + grup "Lainnya" (build 2716, di atas S2741)

Hanya presentasi/render; tidak menyentuh SOT, rumus, atau data. Presenter, id kartu, dan `data-action` tidak berubah.

## Masalah
Tab Laporan menampilkan 10 kartu insight berurutan (semuanya terlipat tapi tetap 10 header), di bawah filter/sub-tab. Padat dan menenggelamkan kartu yang paling sering dipakai.

## Keputusan: kartu inti (tetap tampil)
| Kartu | Alasan inti |
|---|---|
| Dasbor Keuangan (`findashWrap`) | Ringkasan kekayaan bersih, arus kas, anggaran. Pintu masuk utama. |
| Proyeksi Arus Kas (`cashflowProjWrap`) | Satu-satunya pandangan ke depan yang dipertahankan; "Perkiraan Keuangan" tumpang tindih (sama-sama proyeksi saldo). |
| Skor Kesehatan Keuangan (`financialHealthScoreWrap`) | Satu angka + komponen terlemah, cepat dibaca. |
| Risiko Keuangan (`financialRiskDashboardWrap`) | Peringatan yang perlu ditindak sekarang. |

## Dilipat ke "Lainnya (6)" (tertutup bawaan)
Perkiraan Keuangan, Saran Anggaran, Target Keuangan, Rencana Investasi, Strategi Pelunasan Utang, Rencana Pensiun. Ini kartu perencanaan jangka menengah/panjang yang dibuka sesekali.

## Perubahan
- `modules/shared/pwa-ux-performance.js` (lapisan S2652): `foldLainnya()` memindahkan 6 pembungkus ke satu `<details id="kbLainnyaFold">` setelah kartu Risiko. Idempoten (aman dipanggil ulang oleh MutationObserver). Status buka/tutup disimpan di `cardCollapsePrefs` (kunci `kbLainnyaFold`); otomatis terbuka bila pengguna sebelumnya pernah membuka salah satu kartu di dalamnya.
- `modules/dashboard-hub/dashboard-hub.js`: `goTo` membuka "Lainnya" lebih dulu bila kartu tujuan ada di dalamnya (mis. tombol dari kartu lain ke Rencana Investasi), sebelum `scrollIntoView`.
- `modern-ui-layer.css`: gaya grup `.kb-lainnya` (urutan flex sama dengan kartu insight lain, target sentuh 44px).
- Tes baru: `tests/keuangan-lainnya-fold-s2742.test.js` (7 tes: pembagian inti/sisa, idempoten, buka otomatis, penyimpanan pref, goTo, CSS).
- Hasil build: bundle a/b, index.html, app_production.html, sw.js, file versi, FILE-MAP, COVERAGE-PER-MODULE. `FILE-HASHES-SHA256.txt` di-refresh (`scripts/refresh-file-hashes.py --write`).

## Batas yang disengaja
- Kartu inti tetap terlipat bawaan seperti sekarang (lapisan S2652 `KEU_OPEN` tidak diubah); barisan intip `kb-peek` tetap menampilkan 2 angka teratas.
- Tidak ada kartu yang dihapus atau dimatikan; semua masih bisa dibuka satu ketukan.
- Mengganti daftar inti cukup mengubah `KEU_CORE` di `foldLainnya()`.

Terapkan: salin semua file di ZIP ke root proyek (timpa). Tidak ada file yang dihapus. Kumulatif: sudah memuat S2740 dan S2741.
