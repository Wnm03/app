# FINANCE 2.0
**Keluarga W · Sprint 2 · Tahap 1 — FAB Halaman Keuangan**

Baseline: Sprint 1 Tahap 7 selesai (Dashboard Analytics), `node --test`
**1271/1271 PASS** (baseline diverifikasi ulang di lingkungan ini —
bukan 1270 seperti disebut di laporan sebelumnya; lihat catatan di
bagian "Baseline" di bawah).

Cakupan: **HANYA FAB (Floating Action Button) tambah transaksi cepat di
Halaman Keuangan**. Redesign layout Keuangan yang lebih luas, Shop, Car
Notes, dan Laporan — belum disentuh (menunggu instruksi Sprint 2 Tahap
2+).

---

## 0. Catatan Baseline (penting)

Audit ulang terhadap project yang diupload menemukan bahwa **tidak ada
satu pun** artefak "Finance 2.0" (FAB, CSS Finance 2.0,
`finance-2.0.test.js`, redesign Halaman Keuangan) yang benar-benar ada
di source code, meskipun sempat dilaporkan "sudah selesai" di ringkasan
sebelumnya. Project yang diupload adalah snapshot akhir **Sprint 1
Tahap 7 (Dashboard Analytics)**. Dokumen ini dan seluruh perubahan
Tahap 1 Sprint 2 dibangun dari baseline aktual tersebut, bukan dari
laporan yang tidak sesuai kode.

## 1. Tujuan

Mempercepat pencatatan transaksi dari Halaman Keuangan tanpa membuka
menu ⚙️ Pengaturan Keuangan (`qsKeuangan`) yang isinya campur dengan
aksi lain (akun, transfer, kategori, tagihan, target, export). FAB
memberi jalan pintas 1-tap khusus untuk 2 aksi paling sering dipakai:
tambah Pemasukan dan tambah Pengeluaran.

## 2. Layout Baru

FAB ditaruh sebagai elemen `position:fixed` di dalam `#page-keuangan`,
tepat setelah `.cn-tabs` (tab "💰 Kelola" / "📊 Laporan") dan **sebelum**
`#keuanganTab-kelola` — supaya FAB tetap tampil di kedua tab (tidak ikut
ter-`u-dnone` saat `setKeuanganTab()` pindah tab, lihat
`tx-list-cashflow.js`).

```
#page-keuangan
├── .cn-tabs (tidak diubah)
├── .keu-fab  ← BARU (Tahap 1 Sprint 2)
│   ├── .keu-fab-actions (2 tombol: Pemasukan, Pengeluaran)
│   └── .keu-fab-main (tombol ＋ utama)
├── #keuanganTab-kelola (tidak diubah)
└── #keuanganTab-laporan (tidak diubah)
```

Posisi: `right: var(--sp-9)` (20px), `bottom: 84px` — di atas bottom
navigation (`.nav`) supaya tidak tertutup/menutupi.

## 3. Perubahan Visual

- Tombol utama bulat 52px, warna `var(--accent)` (tema-aware, ikut 9
  tema yang sudah ada), ikon "＋" yang berubah jadi "×" (rotate 45°)
  saat FAB terbuka.
- 2 tombol aksi berbentuk pill (label + ikon emoji 💚/🔴), muncul dengan
  transisi opacity saat FAB di-tap, memakai `--surface3`/`--border2`
  yang sudah ada supaya konsisten dengan modal/quick-settings lain.
- Tidak ada perubahan visual apa pun di luar elemen FAB baru ini —
  Hero Dashboard, Dashboard, seluruh isi Halaman Keuangan yang sudah
  ada (Anggaran, Dana Pensiun, Proyek Renovasi, Sewa Kios, dll.) persis
  sama seperti sebelumnya.

## 4. FAB (Floating Action Button)

- **Toggle buka/tutup**: memakai mekanisme `data-onclick` generik yang
  sudah ada di seluruh app (`features-helpers-global-security.js`,
  **tidak diubah**) — `classList.toggle('open')` pada `#keuFab`. **Tidak
  ada fungsi JavaScript baru** yang ditambahkan di file `.js` mana pun.
- **Aksi tombol**: memanggil `openTxModal('income')` dan
  `openTxModal('expense')` — fungsi ini **sudah ada** di `transaksi.js`
  (dipakai juga oleh Quick Actions Dashboard & menu qsDashboard) dan
  **tidak disentuh/diubah sama sekali**.
- **Aksesibilitas**: `aria-label` pada tiap tombol, `aria-expanded`
  pada tombol utama di-update lewat `data-onclick` yang sama (tanpa
  fungsi baru).

## 5. Responsive

- Mobile (default, <600px): FAB menempel `right: 20px` dari tepi kanan
  viewport, konsisten dengan pola `.toast`/`.qs-modal-overlay` yang
  sudah ada (semua pakai lebar viewport penuh).
  <br>
- Desktop/tablet (≥600px): project ini membatasi lebar konten utama ke
  ±600px di viewport lebar (pola yang sama dipakai elemen `position:
  fixed` lain di `styles.css`, mis. `.nav`/`.overlay`, yang full-width
  tapi kontennya visual dibatasi via container). Untuk FAB, ditambahkan
  1 media query `@media (min-width:600px)` supaya FAB tetap menempel di
  tepi kanan area konten (bukan tepi kanan browser window yang sangat
  lebar), memakai perhitungan `calc(50% - 300px + var(--sp-9))` yang
  konsisten dengan pola container 600px lainnya di file ini.

## 6. Design Token yang Dipakai

Seluruhnya **reuse token yang sudah ada** di `styles.css` — tidak ada
token baru yang ditambahkan:

| Token | Dipakai untuk |
|---|---|
| `--sp-9`, `--sp-4`, `--sp-3`, `--sp-6` | jarak/posisi/padding |
| `--r-full`, `--r-pill` | radius tombol bulat & pill |
| `--fs-icon`, `--fs-icon-lg`, `--fs-body` | ukuran font ikon & label |
| `--z-dropdown` | z-index (di bawah `--z-overlay-qs`/`--z-overlay-calc`, di atas konten halaman) |
| `--accent` | warna tombol utama (ikut tema aktif) |
| `--surface3`, `--border2`, `--text` | warna tombol aksi (pill) |
| `--dur-fast`, `--ease-standard` | transisi rotate & scale |

## 7. File yang Berubah

| File | Jenis | Keterangan |
|---|---|---|
| `index.html` | Diubah (aditif) | Tambah blok `.keu-fab` (~9 baris) di dalam `#page-keuangan`, sebelum `#keuanganTab-kelola`. Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | Disalin ulang persis dari `index.html` (diverifikasi `diff` kosong) — bukan lewat `scripts/build.js` (tidak dijalankan). |
| `styles.css` | Diubah (aditif) | Tambah blok CSS baru `.keu-fab*` (append di akhir file, ~13 baris efektif). 100% pakai token yang sudah ada. Tidak ada deklarasi lama yang diubah nilainya. |
| `tests/finance-2.0-fab.test.js` | **Baru** | 12 test struktural: FAB ada di `#page-keuangan`, berada di luar tab (tampil di kedua tab), reuse `openTxModal()`, reuse `data-onclick` (bukan `data-action`/fungsi baru), parity `index.html` vs `app_production.html`, CSS memakai token yang sudah ada, serta guard eksplisit bahwa `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) dan `transaksi.js` (business logic) tidak disentuh. |
| `FINANCE-2.0.md` | **Baru** | Dokumen ini. |
| `CHANGELOG.md` | Diubah | Entry Sprint 2 Tahap 1 ditambahkan di akhir file (aditif). |
| `FILES-CHANGED.md` | Diubah | Entry Sprint 2 Tahap 1 ditambahkan di akhir file (aditif). |

## 8. Alasan Tidak Mengubah Business Logic

FAB murni memanggil ulang (reuse) fungsi `openTxModal(type)` yang sudah
ada di `transaksi.js` — fungsi ini sebelumnya sudah dipanggil dari 3
tempat lain (menu `qsDashboard`, Quick Actions Dashboard
`.dashhub-qa-btn`). Menambahkan pemanggil ke-4 dari lokasi UI baru tidak
mengubah *apa* yang terjadi saat modal dibuka/transaksi disimpan — hanya
menambah *dari mana* modal itu bisa dipicu. Karena itu:

- Tidak ada baris di `transaksi.js`, `modules-calc.js`, atau file logika
  keuangan lain yang diubah.
- Tidak ada perubahan pada `FEATURE_REGISTRY` (`dashboard-hub-registry.js`)
  — FAB bukan entri baru di Dashboard Grid, jadi tidak relevan untuk
  didaftarkan di registry tersebut.
- Tidak ada perubahan pada `ADR-001`.
- Toggle buka/tutup FAB adalah state UI murni (class CSS `open`), tidak
  disimpan ke `D`/localStorage, tidak mempengaruhi perhitungan saldo,
  anggaran, atau laporan mana pun.
- `scripts/build.js` tidak dijalankan, sesuai instruksi — bundle
  (`app-bundle-a.min.js`/`app-bundle-b.min.js`) belum memuat markup FAB
  ini sampai build berikutnya dijalankan (sama seperti catatan di
  `FILES-CHANGED.md` Tahap 5/7 untuk fitur aditif lain).

## 9. Hasil Test

```
node --test
# tests 1283
# pass 1283
# fail 0
```

Baseline (1271/1271, hasil verifikasi ulang di lingkungan ini — lihat
§0) tetap 100% lulus tanpa perubahan; 12 test baru murni aditif.

## 10. Status

FAB Halaman Keuangan selesai, sesuai cakupan Sprint 2 Tahap 1. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
halaman Shop, Car Notes, atau Laporan, menunggu instruksi Sprint 2
Tahap 2.
