# SHOP 2.0
**Keluarga W · Sprint 2 · Tahap 2 — FAB Halaman Shop**

Baseline: Sprint 2 Tahap 1 selesai (Finance FAB), `node --test`
**1283/1283 PASS**.

Cakupan: **HANYA FAB (Floating Action Button) aksi cepat di Halaman
Shop**, menyamakan standar UI dengan Finance 2.0. Redesign kartu/grid
Shop yang lebih luas, Car Notes, dan Laporan — belum disentuh (menunggu
instruksi Sprint 2 Tahap 3).

---

## 1. Audit Halaman Shop (sebelum implementasi)

`#page-shop` (`index.html`) punya 6 tab (`setShopTab()`, di
`cobek-io.js`, tidak disentuh): Kasir AI, Manual, Etalase, Produsen,
Riwayat, Pelanggan — masing-masing div `#shopTab-*` di-toggle lewat
class `u-dnone`, persis pola yang sama dengan `setKeuanganTab()` di
Sprint 2 Tahap 1.

Fungsi "tambah" yang **sudah ada** dan relevan untuk FAB (diaudit
lewat `grep` ke source, bukan bundle):
- `openOrderModal()` (`cobek-io.js:147`) — buka modal transaksi manual
  (tab "🛒 Manual"), sudah dipakai tombol `+ Transaksi Baru` yang ada.
- `openProductModal(idx)` (`cobek-tx-cart.js:360`) — buka modal
  tambah/edit produk (tab "📦 Etalase"), sudah dipakai tombol
  `+ Tambah Produk` yang ada (dipanggil tanpa argumen untuk produk
  baru, sama seperti tombol existing-nya).

Tab "🧠 Kasir AI" sudah punya CTA sendiri (`.kasir-floatbar`, tampil
saat keranjang terisi) — FAB tidak menduplikasi alur checkout Kasir AI,
hanya menambah jalan pintas untuk 2 aksi "tambah" yang paling relevan
lintas-tab (Transaksi Manual & Tambah Produk).

## 2. Fungsi/Komponen yang Digunakan Kembali (reuse)

- **CSS**: `.keu-fab`, `.keu-fab-actions`, `.keu-fab-action`,
  `.keu-fab-action-icon`, `.keu-fab-action-label`, `.keu-fab-main`,
  `.keu-fab-main-icon` — **100% reuse dari Sprint 2 Tahap 1**, **tidak
  ada class CSS baru** yang dibuat untuk Shop. FAB Shop memakai class
  yang sama persis dengan FAB Keuangan (aman karena kedua halaman tidak
  pernah tampil bersamaan — `.page{display:none}` / `.page.active`).
- **Toggle buka/tutup**: mekanisme `data-onclick` generik yang sudah
  ada (`features-helpers-global-security.js`, tidak disentuh) — sama
  seperti FAB Keuangan.
- **Aksi**: `openOrderModal()` dan `openProductModal()` — fungsi yang
  sudah ada, tidak diubah, tidak ada logic bisnis baru.

## 3. Modernisasi UI

Karena standar visual "Dashboard V2 / Finance 2.0" untuk aksi cepat
sudah ditetapkan lewat komponen `.keu-fab*` di Sprint 2 Tahap 1, cara
paling konsisten (dan paling minim risiko/duplikasi) untuk
"menyamakan pengalaman UI" Shop dengan standar tersebut adalah
**reuse langsung komponen yang sama**, bukan membuat ulang komponen
serupa dengan nama/CSS berbeda. Redesign kartu/grid Shop yang sudah ada
(`.shop-grid`, `.shop-stat`, `.kasir-*`) di luar cakupan Tahap 2 ini —
akan jadi rekomendasi Tahap 3 jika diperlukan.

## 4. FAB (Floating Action Button)

- **Posisi**: sama seperti FAB Keuangan (`right: var(--sp-9)`), tapi
  dengan **1 override aditif** `#page-shop .keu-fab{bottom:150px;}`
  supaya tidak tumpang tindih dengan `.kasir-floatbar` (yang muncul di
  bagian bawah saat tab Kasir AI aktif & keranjang belanja terisi).
  Rule asli `.keu-fab{...bottom:84px...}` dari Tahap 1 **tidak diubah**
  nilainya — ini murni override tambahan bertarget `#page-shop`.
- **2 aksi**: 🛒 Transaksi Baru (`openOrderModal()`), 📦 Tambah Produk
  (`openProductModal()`).
- **Tampil di seluruh tab Shop**: markup FAB ditaruh di luar semua
  `#shopTab-*`, tepat setelah `.cn-tabs`, sebelum `#shopTab-kasir` —
  sehingga tidak ikut ter-`u-dnone` saat pindah tab (`setShopTab()`
  tidak disentuh).

## 5. Responsive

Diwarisi otomatis dari media query `@media (min-width:600px)` yang
sudah ada di `styles.css` untuk `.keu-fab` (Tahap 1) — karena FAB Shop
memakai class yang sama persis, tidak perlu media query baru.

## 6. Design Token yang Dipakai

Tidak ada token baru. Seluruhnya diwarisi dari `.keu-fab*` (Tahap 1):
`--sp-9`, `--sp-4`, `--sp-3`, `--sp-6`, `--r-full`, `--r-pill`,
`--fs-icon`, `--fs-icon-lg`, `--fs-body`, `--z-dropdown`, `--accent`,
`--surface3`, `--border2`, `--text`, `--dur-fast`, `--ease-standard`.

## 7. File yang Berubah

| File | Jenis | Ukuran perubahan | Keterangan |
|---|---|---|---|
| `index.html` | Diubah | +17 baris (tambah) | Blok `<div class="keu-fab" id="shopFab">...</div>` di dalam `#page-shop`, setelah `.cn-tabs`, sebelum `#shopTab-kasir`. Reuse class CSS `.keu-fab*` & fungsi `openOrderModal()`/`openProductModal()` yang sudah ada. Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | +17 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — bukan lewat `scripts/build.js` (tidak dijalankan). |
| `styles.css` | Diubah | +5 baris (tambah) | 1 rule baru `#page-shop .keu-fab{bottom:150px;}` (override posisi, aditif) + komentar. **Tidak ada class `.shop-fab*` baru** — rule `.keu-fab` asli dari Tahap 1 tidak diubah nilainya. |
| `tests/shop-fab.test.js` | **Baru** | 114 baris | 16 test struktural: FAB ada di `#page-shop`, reuse class `.keu-fab*` (bukan class baru), berada di luar semua tab (tampil di semua tab Shop), reuse `openOrderModal()`/`openProductModal()`, reuse `data-onclick` (bukan `data-action`), parity `index.html`/`app_production.html`, guard eksplisit tidak ada `.shop-fab` baru di CSS, guard rule `.keu-fab` asli tidak berubah, dan guard `cobek-io.js`/`cobek-tx-cart.js`/`dashboard-hub-registry.js` (FEATURE_REGISTRY) tidak disentuh. |
| `SHOP-2.0.md` | **Baru** | — | Dokumen ini. |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 2 (aditif). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 2 (aditif). |

**Total perubahan kode**: 3 file diubah (`index.html`,
`app_production.html`, `styles.css`) + 1 file test baru = **4 file
kode**, di bawah batas 5. Total baris perubahan markup/CSS: **39 baris**
(17+17+5), jauh di bawah batas ±350.

## 8. Alasan Business Logic Tidak Disentuh

- `openOrderModal()` (`cobek-io.js`) dan `openProductModal()`
  (`cobek-tx-cart.js`) dipanggil ulang (reuse) dari lokasi UI baru —
  tidak ada baris di kedua file itu yang diubah (diverifikasi `diff`).
- Toggle buka/tutup FAB adalah state UI murni (class CSS `open`), tidak
  disimpan ke `D`/localStorage, tidak mempengaruhi data produk, stok,
  transaksi, atau laporan Shop mana pun.
- `setShopTab()` (`cobek-io.js`) tidak disentuh — FAB sengaja ditaruh
  di luar struktur tab supaya tidak perlu mengubah fungsi navigasi tab
  yang sudah ada.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`) tidak relevan/tidak
  disentuh — FAB bukan entri baru di Dashboard Grid.
- `ADR-001` tidak disentuh.
- `scripts/build.js` tidak dijalankan, sesuai instruksi — bundle
  (`app-bundle-a.min.js`/`app-bundle-b.min.js`) belum memuat markup FAB
  ini sampai build berikutnya dijalankan (sama seperti catatan Tahap 1
  untuk Finance FAB).

## 9. Hasil Test

```
node --test
# tests 1299
# pass 1299
# fail 0
```

Baseline (1283/1283, akhir Sprint 2 Tahap 1) tetap 100% lulus tanpa
perubahan; 16 test baru murni aditif.

## 10. Status

FAB Halaman Shop selesai, sesuai cakupan Sprint 2 Tahap 2. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint 2 Tahap 3.
