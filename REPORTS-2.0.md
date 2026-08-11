# REPORTS 2.0
**Keluarga W · Sprint 2 · Tahap 4 — FAB Halaman Laporan**

Baseline: Sprint 2 Tahap 3 selesai (Car Notes FAB), `node --test`
**1316/1316 PASS**.

Cakupan: **HANYA FAB (Floating Action Button) aksi cepat di tab
Laporan**, menyamakan standar UI dengan Finance 2.0 (Tahap 1), Shop 2.0
(Tahap 2), dan Car Notes 2.0 (Tahap 3). Redesign kartu/grafik Laporan
yang lebih luas — belum disentuh (menunggu instruksi Sprint 2 Tahap
5+).

---

## 1. Audit Halaman Laporan (sebelum implementasi)

Temuan audit paling penting: **"Halaman Laporan" bukan `<div
class="page">` terpisah** seperti Keuangan/Shop/Car Notes. Laporan
adalah **tab kedua** di dalam `#page-keuangan`
(`#keuanganTab-laporan`), bersebelahan dengan tab `#keuanganTab-kelola`
— keduanya di-toggle lewat `setKeuanganTab()` (`tx-list-cashflow.js`,
tidak disentuh) dengan mekanisme class `u-dnone` yang sama seperti
`setShopTab()` dan `setCnTab()`.

Konsekuensinya: **FAB Keuangan (`#keuFab`, Sprint 2 Tahap 1) sudah
tampil di tab Laporan juga**, karena sejak Tahap 1 elemen itu memang
ditaruh **di luar** kedua tab (`#keuanganTab-kelola` maupun
`#keuanganTab-laporan`) supaya tampil di keduanya. Namun 2 aksi
`#keuFab` (Tambah Pemasukan/Pengeluaran) adalah aksi "Kelola", bukan
aksi yang kontekstual untuk "melihat/mengekspor laporan".

Fungsi "aksi cepat" yang **sudah ada** dan relevan khusus untuk konteks
Laporan (diaudit lewat `grep` ke source, bukan bundle), ditemukan di
card "💾 Export" (baris paling bawah tab Laporan):
- `exportCSV()` (`backup-restore.js:23`) — download data transaksi
  sebagai CSV, sudah dipakai tombol `📄 CSV`.
- `exportJSON()` (`backup-restore.js:34`) — download backup JSON,
  sudah dipakai tombol `📦 JSON`.
- `exportLaporanPDF()` (`features-aiwidget-reminder-gdrive-search.js:794`)
  — generate & download laporan PDF, sudah dipakai tombol `🧾 PDF`.
- `exportLaporanImage()` (`…:859`) — generate & download laporan
  gambar, sudah dipakai tombol `🖼️ Gambar`.

Dari 4 fungsi export yang ada, **2 dipilih untuk FAB** (mengikuti pola
2-aksi FAB sebelumnya): `exportLaporanPDF()` (laporan siap-cetak/bagi,
paling representatif untuk "Laporan") dan `exportCSV()` (data mentah,
paling sering dipakai untuk olah data lanjutan). `exportJSON()` dan
`exportLaporanImage()` tetap bisa diakses lewat card "💾 Export" yang
sudah ada — tidak dihapus/dipindah.

## 2. Keputusan Desain: FAB Kontekstual per Tab (bukan reuse `#keuFab`)

Alih-alih menambah tombol ke `#keuFab` yang sudah ada (yang akan
membuat aksi Pemasukan/Pengeluaran/Export tercampur di 1 FAB dan tampil
di kedua tab tanpa dibedakan konteksnya), dibuat **FAB baru
`#laporanFab`** dengan filosofi "Contextual FAB" yang konsisten dengan
audit Tahap 2/3: setiap FAB hanya menawarkan aksi yang relevan untuk
konteks yang sedang dilihat.

Supaya `#laporanFab` **hanya tampil saat tab Laporan aktif** tanpa
perlu JS baru sama sekali, elemen ini **sengaja ditaruh DI DALAM**
`#keuanganTab-laporan` (bukan di luar seperti `#keuFab`) — sehingga
otomatis ikut ter-`u-dnone` ketika `setKeuanganTab()` (yang sudah ada,
tidak disentuh) berpindah ke tab Kelola. Ini murni konsekuensi struktur
DOM (elemen anak dari parent `display:none` ikut tersembunyi apa pun
posisi CSS-nya, termasuk `position:fixed`), bukan logic baru.

`#keuFab` (Tahap 1) **tidak diubah sama sekali** — tetap tampil di
kedua tab seperti sebelumnya, dengan 2 aksi originalnya
(Pemasukan/Pengeluaran).

## 3. Fungsi/Komponen yang Digunakan Kembali (reuse)

- **CSS**: `.keu-fab`, `.keu-fab-actions`, `.keu-fab-action`,
  `.keu-fab-action-icon`, `.keu-fab-action-label`, `.keu-fab-main`,
  `.keu-fab-main-icon` — **100% reuse dari Sprint 2 Tahap 1**, **tidak
  ada class CSS baru** yang dibuat untuk Laporan.
- **Toggle buka/tutup**: mekanisme `data-onclick` generik yang sudah
  ada (`features-helpers-global-security.js`, tidak disentuh) — sama
  seperti FAB Keuangan/Shop/Car Notes.
- **Visibilitas kontekstual**: `setKeuanganTab()` yang sudah ada
  (`tx-list-cashflow.js`, tidak disentuh) — dipakai ulang lewat
  penempatan DOM, bukan lewat logic baru.
- **Aksi**: `exportLaporanPDF()` dan `exportCSV()` — fungsi yang sudah
  ada, tidak diubah, tidak ada logic bisnis baru.

## 4. FAB (Floating Action Button)

- **Posisi**: sama seperti FAB Keuangan (`right: var(--sp-9)`), dengan
  **1 override aditif** `#keuanganTab-laporan .keu-fab{bottom:170px;}`
  supaya `#laporanFab` (saat tab Laporan aktif) tidak tumpang tindih
  secara vertikal dengan `#keuFab` yang tetap tampil di posisi
  default (`bottom:84px`). Rule `.keu-fab{...bottom:84px...}` asli
  (Tahap 1) dan override `#page-shop .keu-fab{bottom:150px;}` (Tahap 2)
  **tidak diubah** nilainya — murni override tambahan bertarget
  `#keuanganTab-laporan`.
- **2 aksi**: 🧾 Export PDF (`exportLaporanPDF()`), 📄 Export CSV
  (`exportCSV()`).
- **Tampil hanya di tab Laporan**: markup FAB ditaruh **di dalam**
  `#keuanganTab-laporan`, tepat setelah pembukaan div-nya, sebelum
  `.page-settings-btn` — sehingga otomatis tersembunyi saat tab Kelola
  aktif (`setKeuanganTab()` tidak disentuh).

## 5. Responsive

Diwarisi otomatis dari media query `@media (min-width:600px)` yang
sudah ada di `styles.css` untuk `.keu-fab` (Tahap 1) — karena FAB
Laporan memakai class yang sama persis, tidak perlu media query baru.

## 6. Design Token yang Dipakai

Tidak ada token baru. Seluruhnya diwarisi dari `.keu-fab*` (Tahap 1):
`--sp-9`, `--sp-4`, `--sp-3`, `--sp-6`, `--r-full`, `--r-pill`,
`--fs-icon`, `--fs-icon-lg`, `--fs-body`, `--z-dropdown`, `--accent`,
`--surface3`, `--border2`, `--text`, `--dur-fast`, `--ease-standard`.

## 7. File yang Berubah

| File | Jenis | Ukuran perubahan | Keterangan |
|---|---|---|---|
| `index.html` | Diubah | +20 baris (tambah) | Blok `<div class="keu-fab" id="laporanFab">...</div>` di dalam `#keuanganTab-laporan`, tepat setelah pembukaan div-nya, sebelum `.page-settings-btn`. Reuse class CSS `.keu-fab*` & fungsi `exportLaporanPDF()`/`exportCSV()` yang sudah ada. `#keuFab` (Tahap 1) tidak diubah. Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | +20 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — bukan lewat `scripts/build.js` (tidak dijalankan). |
| `styles.css` | Diubah | +7 baris (tambah) | 1 rule baru `#keuanganTab-laporan .keu-fab{bottom:170px;}` (override posisi, aditif) + komentar. **Tidak ada class `.laporan-fab*`/`.reports-fab*` baru** — rule `.keu-fab` asli (Tahap 1) & override Shop (Tahap 2) tidak diubah nilainya. |
| `tests/laporan-fab.test.js` | **Baru** | 142 baris | 20 test struktural: FAB ada di `#keuanganTab-laporan` & di dalam `#page-keuangan` (bukan page terpisah), reuse class `.keu-fab*` (bukan class baru), penempatan kontekstual (di dalam tab, beda dari `#keuFab` yang di luar), reuse `exportLaporanPDF()`/`exportCSV()`, reuse `data-onclick` (bukan `data-action`), parity `index.html`/`app_production.html`, guard tidak ada class CSS baru & guard override posisi, guard `tx-list-cashflow.js`/`features-aiwidget-reminder-gdrive-search.js`/`backup-restore.js`/`dashboard-hub-registry.js`/`dashboard-hub.js` tidak disentuh. |
| `REPORTS-2.0.md` | **Baru** | — | Dokumen ini. |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 4 (aditif). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 4 (aditif). |

**Total perubahan kode**: 3 file diubah (`index.html`,
`app_production.html`, `styles.css`) + 1 file test baru = **4 file
kode**, di bawah batas 5. Total baris perubahan markup/CSS: **47
baris** (20+20+7), jauh di bawah batas ±350.

## 8. Alasan Business Logic Tidak Disentuh

- `exportLaporanPDF()` (`features-aiwidget-reminder-gdrive-search.js`)
  dan `exportCSV()` (`backup-restore.js`) dipanggil ulang (reuse) dari
  lokasi UI baru — tidak ada baris di kedua file itu yang diubah
  (diverifikasi `diff`/`grep`).
- Toggle buka/tutup FAB adalah state UI murni (class CSS `open`), tidak
  disimpan ke `D`/localStorage, tidak mempengaruhi data transaksi,
  akun, kategori, atau laporan mana pun.
- `setKeuanganTab()` (`tx-list-cashflow.js`) tidak disentuh —
  visibilitas kontekstual `#laporanFab` dicapai murni lewat penempatan
  DOM (anak dari elemen yang sudah di-toggle `u-dnone`), bukan lewat
  logic baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`) & `dashboard-hub.js`
  tidak relevan/tidak disentuh — FAB bukan entri baru di Dashboard
  Grid.
- `ADR-001` tidak disentuh.
- `scripts/build.js` tidak dijalankan, sesuai instruksi — bundle
  (`app-bundle-a.min.js`/`app-bundle-b.min.js`) belum memuat markup FAB
  ini sampai build berikutnya dijalankan (sama seperti catatan Tahap
  1–3).

## 9. Hasil Test

```
node --test
# tests 1335
# pass 1335
# fail 0
```

Baseline (1316/1316, akhir Sprint 2 Tahap 3) tetap 100% lulus tanpa
perubahan; 20 test baru murni aditif.

## 10. Status

FAB tab Laporan selesai, sesuai cakupan Sprint 2 Tahap 4. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint berikutnya.
