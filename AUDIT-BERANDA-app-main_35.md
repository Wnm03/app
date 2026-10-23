> **DIPULIHKAN di S2650:** penghapusan blok Beranda pada §5 (eieWrap, danaKelolaanWrap, personalOverviewWrap, crossWidgetsWrap, lifePriorityWrap, ticker modern, Quick Action "Cari Fitur") dan tile "Transaksi Terakhir" dibatalkan karena di luar ruang lingkup perbaikan Shop/Car Notes/Renovasi. Sumber dikembalikan ke baseline (app-main 35). Lihat `AUDIT-VALIDASI-PEMULIHAN-S2650.md`. Temuan audit lain di dokumen ini tetap sebagai catatan, belum diterapkan.

# Audit Beranda (Dashboard Hub) — app-main_35

Metode: app dijalankan di Chromium (viewport HP 390×844, onboarding dilewati), diisi 8 transaksi, 2 akun berisi saldo, dan 2 tagihan. Angka kartu dicocokkan dengan hitungan manual. Waktu render diukur di browser. Pembanding aplikasi sejenis dari pengetahuan umum (tidak dicek ulang di web): Monarch, YNAB, Money Manager, Money Lover, Wallet, Finansialku, Jenius.

## 1. Akurasi kartu (data uji)

| Kartu | Hasil |
|---|---|
| Saldo Semua Akun Rp 5.800.000 | Akurat (5,0 jt + 0,8 jt) |
| Arus Kas: Masuk 4,4 jt, Keluar 1,37 jt, Bersih 3,03 jt, Tabungan 69% | Akurat |
| Kekayaan Bersih 2,2 jt (kas 5,8 jt − cicilan 3,6 jt) | Akurat |
| Tagihan: total bulan ini, lewat jatuh tempo, ≤7 hari, sisa cicilan | Akurat (600 rb × 6 = 3,6 jt) |
| Pengeluaran vs bulan lalu | Konsisten |
| **Perlu Perhatian → "Risiko Keuangan: Rasio Utang masih rendah — kontribusi 38%"** | **MENYESATKAN** |

Catatan: selisih 1 hari pada tanggal tagihan berasal dari data uji saya (UTC vs WIB), bukan bug app.

### Temuan akurasi
- **A1 (tinggi).** Pesan "Rasio Utang masih rendah" sebenarnya berarti skor komponen rasio utang rendah (38% dari bobot maksimal). Pembaca mengartikannya "utang rendah", yang berarti bagus.
  - Sumber: `financial-health-score-api.js:113`.
  - `priority-engine.js:129` memaksa semua `riskFactors` menjadi severity `warning`, jadi komponen skor biasa ikut menambah badge "Perlu Perhatian".
  - Contoh data uji: badge menunjukkan 4, padahal hanya 1 tagihan yang benar-benar lewat tempo.
- **A2 (sedang).** Hint di Pengaturan (`index.html:2086`) bilang kartu inti "Saldo Akun" dan "Transaksi Terakhir" selalu tampil di Beranda. Kenyataannya keduanya tidak ada di Beranda.
- **A3 (rendah).** "Kesehatan Finansial 69/100" di Pantau Domain dan "Risiko Keuangan" di Perlu Perhatian membaca sumber skor yang sama, jadi muncul dua kali.

## 2. Kelebihan beban (bukti dari browser)

- **B1. 9 section selalu tersembunyi tapi tetap dirender.** Semuanya `display:none` di tab Insight, namun sebagian tetap berisi konten:
  - Berisi konten: `crossBriefWrap` (175 karakter), `crossInsightWrap` (228), `actionQueueWrap` (1.304).
  - Kosong atau tersembunyi: `personalOverviewWrap`, `crossWidgetsWrap`, `lifePriorityWrap`, `recommendationPanelWrap`, `danaKelolaanWrap`, `eieWrap`.
  - Semuanya hasil `DashboardInsightDedup`, yaitu MutationObserver dengan kemiripan teks yang menyembunyikan kartu setelah dirender. Ini komputasi sia-sia dan sulit dirawat.
- **B2. Tab Insight butuh 461 ms untuk render**, sedangkan Ringkasan hanya 85 ms dan Widget 108 ms. Penyebabnya presenter yang hasilnya akhirnya disembunyikan (B1).
- **B3. Tab Widget setinggi 3.101 px** (±4 layar HP):
  - Proyeksi Kas 921 px (mengulang Arus Kas di Ringkasan)
  - Skor Hidup Seimbang 533 px
  - Kebebasan Finansial 528 px
  - Absensi 422 px
  - Penasihat 295 px
- **B4. Tiga pintu pencarian:** ikon 🔎 di header, kotak cari, dan tombol "Cari Fitur".
- **B5. Judul "🧭 Dashboard Hub" + kartu "Semua Fitur" (63 fitur) + Favorit** mengulang bottom-nav dan Quick Actions.
- **B6. Ticker "Masuk/Keluar/Bersih/Transaksi"** mengulang Arus Kas (hanya tampil di tema modern; kodenya tetap ikut dirender).
- **B7. Bundle 3,5 MB** (a: 1,05 MB, b: 2,53 MB). Load awal 0,39 s di lokal, jadi bukan masalah utama. Beban ada di render tab dan DOM, bukan di ukuran file.

## 3. Perbandingan dengan aplikasi sejenis

Pola beranda aplikasi keuangan yang bagus: (1) saldo atau kekayaan bersih, (2) arus kas bulan ini, (3) tagihan terdekat, (4) progres anggaran, (5) target, (6) transaksi terakhir, (7) tombol tambah transaksi, (8) satu insight singkat. Semuanya muat dalam 1–2 layar.

| Elemen standar | Status di KW |
|---|---|
| Saldo / kekayaan bersih | Ada |
| Arus kas bulan ini | Ada |
| Tagihan terdekat | Ada |
| Perlu perhatian (alert) | Ada, tapi tercampur skor (A1) |
| Quick add | Ada |
| **Progres anggaran** | **Tidak ada**, hanya muncul bila melebihi limit |
| **Transaksi terakhir** | **Tidak ada** (A2) |
| **Target tabungan** | Ada hanya di Widget (FI) |
| Satu insight utama | Tersebar di 6+ tempat |

Kekuatan KW yang tidak dimiliki kebanyakan kompetitor: lintas-domain (kendaraan, Shop, zakat, dana titipan) dalam satu "Perlu Perhatian". Itu layak dipertahankan.

## 4. Rekomendasi (belum ada yang dieksekusi)

**Hapus** (aman, hanya presentasi, tidak menyentuh data):
1. `DashboardInsightDedup` dan 7 wrapper mati: `crossBrief`, `crossInsight`, `personalOverview`, `crossWidgets`, `lifePriority`, `recommendationPanel`, `actionQueue`. Hapus juga `danaKelolaanWrap` dan `eieWrap` dari Hub; keduanya tetap ada di modulnya sendiri.
2. Ticker modern (B6).
3. Judul "Dashboard Hub" dan tombol 🔎 di header (B4).
4. Kartu Proyeksi Kas di tab Widget; ganti dengan tautan "Detail" dari tile Arus Kas.
5. Hint Pengaturan yang salah (A2).

**Perbaiki akurasi:**
6. Pisahkan `riskFactors` dari alert. Hanya yang benar-benar berisiko (misalnya DSR > ambang) yang masuk "Perlu Perhatian". Ganti kalimat menjadi "Skor rasio utang rendah (38/100)".
7. Hapus tile "Kesehatan Finansial" atau Risiko Keuangan, pilih salah satu.

**Tambah (kecil):**
8. Tile "Anggaran Bulan Ini" (progres total).
9. 3 "Transaksi Terakhir" di bawah Pantau Domain.

**Target akhir:** Ringkasan ±2 layar, satu pintu cari, 0 section tersembunyi, tab Insight < 150 ms.

Data uji: tidak memakai data asli G. Angka di app asli bisa berbeda; metode di atas bisa diulang dengan backup G.

---
## 5. Status eksekusi (build v2637, akumulatif tahap 1 + 2)

Koreksi audit: tile "Anggaran" sudah ada di Pantau Domain dan muncul bila anggaran diisi. Pada data uji anggaran memang kosong, jadi pernyataan "tidak ada" di bagian 3 keliru.

Dikerjakan:
- Pesan "Risiko Keuangan" diperjelas (A1); hint Pengaturan dikoreksi (A2).
- Render tab Insight melewati section yang sudah tersembunyi: 461 ms → ±75 ms.
- Dihapus dari HTML Hub: `eieWrap`, `danaKelolaanWrap`, `personalOverviewWrap`, `crossWidgetsWrap`, `lifePriorityWrap`, ticker modern, tombol Quick Action "Cari Fitur" ganda.
- Render `EIEDashboard`, `UnifiedDashboardHome`, `CrossDashboardCard`, `DashboardHubTickerModern` dimatikan di Hub (`'never'`). Modul sumbernya tetap ada.
- Tile baru "Transaksi Terakhir" (3 terbaru).
- DOM Hub 427 → 377 node (tab Ringkasan); tes 9133/9133 lulus (1 skip).

Tidak dikerjakan (butuh keputusan/sesi terpisah): `DashboardInsightDedup` (dipakai role-visibility halaman lain), Proyeksi Kas di tab Widget, 7 wrapper `crossBrief/crossInsight/recommendationPanel/actionQueue` (bisa tampil saat data nyata ada).
