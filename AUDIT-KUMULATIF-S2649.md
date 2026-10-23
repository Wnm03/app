
> **Catatan akumulasi 2649 (2026-10-23):** bagian hasil historis di bawah mencatat validasi pada tahap sebelumnya. Run rebase terbaru memperbarui build ke 2649 dan memperbaiki tes kontrak usang, tetapi full-suite timeout dan browser interaktif belum dijalankan. Status terbaru berada di `AUDIT-RANTAI-AKUMULASI-S2649-2649.md`.

# Audit kumulatif Shop / Car Notes / Renovasi — S2649

Basis: `patch-P0-1-3-S2645-akumulatif.zip` + target `IMPLEMENTASI-PERBAIKAN-TAUTAN-SHOP-CARNOTES-RENOV.md`. Bentuk keluaran tetap overlay patch, bukan full source.

## Status target implementasi

| Kelompok target pada MD | Status implementasi pada overlay | Bukti yang ada |
|---|---|---|
| P0-1 sampai P0-3 | Diterapkan | `modules/shared/modals.js`, helper PWAUX, CSS, tes S2645 |
| P0-4 sampai P0-9 | Sudah ada dari rantai S2644/S2641 | audit S2644/S2641, CSS dan helper yang sudah ada |
| P1-1 sampai P1-13 | Sudah ada dari rantai sebelumnya | helper/CSS dan tes S2643; P1-1/7/8 juga dites S2646 |
| P1-14 sampai P1-17 | Diterapkan di helper Order/PO | tes S2646: subtotal/label aksesibel, grouping Order, pencarian produk Order, pencarian PO/stok/restock/datalist supplier |
| P1-18 sampai P1-19 | Sudah ada pada helper presentasi | tes S2646: bulk controls Scan Nota, label file Excel/CSV dan input sumber tetap |
| P1-20 sampai P1-22 | Sudah ada dari rantai sebelumnya / helper | tes S2646 mencakup hint-fold dan P1-21/22 diuji S2643 |
| P2-1 sampai P2-4 | Sudah ada pada helper/CSS | tes S2646 memeriksa empty-cart guidance, disabled reason, komponen presentasi bersama; `color-scheme` berada pada blok P0-8 |

Implementasi P1-14..17 dibatasi pada lapisan presentasi. Pencarian Order memilih opsi dari `<select>` asli lalu memicu aksi `addOrderItem`; pencarian PO hanya menyembunyikan chip yang tidak cocok. Tidak mengganti jalur penyimpanan atau aturan SOT.

## File patch tambahan / diperbarui pada tahap ini

- `app-bundle-a.min.js` — runtime decorator Order/PO diselaraskan dengan helper; perubahan bundle langsung bukan hasil build resmi.
- `modules/shared/pwa-ux-performance.js` — sumber helper presentasi.
- `modern-ui-layer.css` — styling kontrol, hasil pencarian, subtotal, scan dan input file.
- `tests/s2646-p1-14-17.test.js` — kontrak tes untuk P1-14..17 dan pemeriksaan item terkait yang telah ada.
- `AUDIT-P1-TAHAP2-S2644.md`, `AUDIT-P0-1-3-S2645.md` tetap disertakan sebagai jejak akumulasi.
- `AUDIT-KUMULATIF-S2649.md` dan `CHANGED-FILES-S2649.txt` — dokumen status dan daftar file perubahan.

## Hasil verifikasi yang benar-benar dijalankan

- `node --check modules/shared/pwa-ux-performance.js`: PASS.
- `node --check app-bundle-a.min.js`: PASS.
- `node --check app-bundle-b.min.js`: PASS.
- Tes terarah `tests/s2645-p0-1-3.test.js` + `tests/s2646-p1-14-17.test.js`: **15 lulus, 0 gagal**.
- Percobaan `node --test tests/*.test.js`: **28 lulus, 2 gagal** karena dua tes dashboard tidak menemukan `tests/helpers/loadSource` pada overlay ini. Ini keterbatasan artefak overlay saat diuji terpisah, bukan bukti full-suite aplikasi lulus. Tes terkait helper dashboard tidak bisa diverifikasi di sini.
- `npm test`, `npm run release:preflight`, browser/Playwright nyata dan uji perangkat Bagian 20.1 tidak dijalankan: ZIP basis tidak menyertakan `package.json`, `node_modules`, semua file proyek maupun skrip build lengkap.

## Penghalang rilis (tidak disembunyikan)

1. Bundle diubah langsung untuk mempertahankan runtime dalam patch; pipeline resmi harus membangun ulang bundle dari sumber.
2. Query cache `?v=2644` dan `sw.js` belum dinaikkan melalui pipeline, sehingga jangan rilis/men-deploy overlay ini apa adanya.
3. Hash pada manifest diperbarui untuk file yang ada di patch, tetapi hasil ini bukan pengganti `release:preflight` pada akar proyek penuh.
4. Belum ada bukti browser untuk alur nyata A1–A15, data hasil simpan, ukuran layar 360/390/430, keyboard Android, atau pemeriksaan SOT. Statusnya **implementasi kumulatif siap diuji pada proyek lengkap**, bukan release-ready.

## Langkah validasi wajib setelah overlay diterapkan ke akar proyek

1. Jalankan build resmi dan `npm run release:preflight` agar bundle, cache version, `sw.js`, dan hash dihasilkan konsisten dari sumber.
2. Jalankan `npm test`; pastikan dependency helper dashboard tersedia dan seluruh suite lolos.
3. Jalankan skenario Bagian 6 dan 20.2 dari MD sumber, termasuk Order/PO, Scan Nota, impor Excel/CSV/PDF, dan simpan A1–A15.
4. Ukur 360×640, 390×844, 430×932; pastikan tidak ada horizontal scroll, kontrol cari bisa dioperasikan dengan keyboard, dan aksi tambah/hapus/simpan tidak berubah.
5. Uji pada Android nyata sebelum rilis.
