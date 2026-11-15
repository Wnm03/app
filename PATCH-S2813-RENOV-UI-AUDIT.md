# PATCH S2813 — Audit UI Proyek Renovasi (390x844 & 360x640, gelap+terang) — kumulatif di atas S2812
Basis: app-main (10) + PATCH-S2812. Isi zip = hanya file yang berubah (termasuk keluaran build). Unggah SEMUA file.

## Perbaikan
1. modules/home/renovasi.js — modal DP, Bayar, dan field Klien/RAB memakai class tanpa CSS (.field-label/.input) -> label & input sebaris. Diganti .fg/.fl/.fi + for= pada label; tombol simpan melebar (u-flex1); mode Cash/Cicil sama lebar; Klien/RAB kini di atas Catatan.
2. renovasi.js + modern-ui-layer.css — baris kartu proyek kena aturan tokens.css (.tx-item>.u-flex{min-width:max-content}) sehingga ⋯ terdorong keluar kartu pada nama panjang. Ditambah kelas renov-card-row + override.
3. modules/shared/pwa-ux-performance.js — ketuk ⋯ di kartu ikut membuka modal detail; kini data-action=stopPropOnly + data-stop=1, summary diberi aria-label.
4. renovasi.js — kartu Total/Terbayar/Sisa: nominal >= 1 miliar diringkas ("Rp 1,25 M"), nilai penuh di atribut title dan di panel Arus Dana.
5. modern-ui-layer.css — judul detail dibatasi 2 baris; popover Hapus nowrap; tombol panel dana grid 3 kolom (tidak patah kata); baris kategori ditumpuk; area sentuh ⋯ 44px, ikon status item +hit area; summary hint & pm-btn min 44px; kontras tema terang (hijau/pink/indigo) pada elemen Renov.
6. tests/s2813-renov-ui-audit.test.js (baru, 4 tes). FILE-HASHES-SHA256.txt disegarkan.

## Bukti
- Audit browser ulang 4 konfigurasi: 0 error JS, tanpa scroll horizontal halaman, wordOverflow 0 (sebelumnya 2 per layar detail), ketuk ⋯ kartu tidak membuka detail.
- Full suite: 9787/9792 lulus; 3 gagal sama dengan baseline (S1780, s1608, S2308).

## Belum
- Perangkat nyata/Android WebView, keyboard virtual. Ikon status item secara visual tetap 32px (hit area diperluas via ::after).
- Ringkasan "Sisa" di kartu daftar memakai item.paid, bukan payments[] (dugaan dari kode, belum diverifikasi).
- Tema 'modern' & 'auto' tidak diaudit; strip tab Keuangan memang scroll horizontal (disengaja).
