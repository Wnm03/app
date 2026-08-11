# CAR NOTES 2.0
**Keluarga W · Sprint 2 · Tahap 3 — FAB Halaman Car Notes**

Baseline: Sprint 2 Tahap 2 selesai (Shop FAB), `node --test`
**1299/1299 PASS**.

Cakupan: **HANYA FAB (Floating Action Button) aksi cepat di Halaman
Car Notes**, menyamakan standar UI dengan Finance 2.0 (Tahap 1) & Shop
2.0 (Tahap 2). Redesign kartu/layout Car Notes yang lebih luas dan
Laporan — belum disentuh (menunggu instruksi Sprint 2 Tahap 4+).

---

## 1. Audit Halaman Car Notes (sebelum implementasi)

`#page-carnotes` (`index.html`) punya 2 tab (`setCnTab()`, di
`vehicle-core.js`, tidak disentuh): ⛽ BBM dan 🔧 Servis — masing-masing
div `#cnTab-bbm` / `#cnTab-servis` di-toggle lewat class `u-dnone`,
persis pola yang sama dengan `setKeuanganTab()` (Tahap 1) dan
`setShopTab()` (Tahap 2).

Fungsi "tambah/catat" yang **sudah ada** dan relevan untuk FAB (diaudit
lewat `grep` ke source, bukan bundle):
- `openBbmModal(editId)` (`vehicle-core.js:422`) — buka modal catat isi
  BBM (tab "⛽ BBM"), sudah dipakai tombol `+ Catat Isi BBM` yang ada.
- `openServisModal(editId, prefillItem)` (`sparepart-servis.js:235`) —
  buka modal catat servis/sparepart (tab "🔧 Servis"), sudah dipakai
  tombol `+ Catat Servis/Sparepart` yang ada (dipanggil tanpa argumen
  untuk catatan baru, sama seperti tombol existing-nya).

Berbeda dari halaman Shop, halaman Car Notes **tidak punya** elemen
`position:fixed` lain seperti `.kasir-floatbar` — jadi tidak ada risiko
tumpang tindih dan tidak dibutuhkan override posisi CSS sama sekali.

## 2. Fungsi/Komponen yang Digunakan Kembali (reuse)

- **CSS**: `.keu-fab`, `.keu-fab-actions`, `.keu-fab-action`,
  `.keu-fab-action-icon`, `.keu-fab-action-label`, `.keu-fab-main`,
  `.keu-fab-main-icon` — **100% reuse dari Sprint 2 Tahap 1**, **tidak
  ada class CSS baru** yang dibuat untuk Car Notes. FAB Car Notes
  memakai class yang sama persis dengan FAB Keuangan & FAB Shop (aman
  karena ketiga halaman tidak pernah tampil bersamaan —
  `.page{display:none}` / `.page.active`).
- **Toggle buka/tutup**: mekanisme `data-onclick` generik yang sudah
  ada (`features-helpers-global-security.js`, tidak disentuh) — sama
  seperti FAB Keuangan & FAB Shop.
- **Aksi**: `openBbmModal()` dan `openServisModal()` — fungsi yang
  sudah ada, tidak diubah, tidak ada logic bisnis baru.

## 3. Modernisasi UI

Karena standar visual "Dashboard V2 / Finance 2.0" untuk aksi cepat
sudah ditetapkan lewat komponen `.keu-fab*` di Sprint 2 Tahap 1 dan
dipakai ulang di Tahap 2, cara paling konsisten (dan paling minim
risiko/duplikasi) untuk "menyamakan pengalaman UI" Car Notes dengan
standar tersebut adalah **reuse langsung komponen yang sama**, bukan
membuat ulang komponen serupa dengan nama/CSS berbeda. Redesign
kartu/layout Car Notes yang sudah ada (`.bbm-stat-grid`, `.vehicle-
select`, dll.) di luar cakupan Tahap 3 ini.

## 4. FAB (Floating Action Button)

- **Posisi**: sama persis seperti FAB Keuangan
  (`right: var(--sp-9); bottom: 84px`) — **tanpa override tambahan**,
  karena halaman Car Notes tidak punya elemen fixed lain yang bisa
  bentrok (tidak ada padanan `.kasir-floatbar` di halaman ini). Rule
  `.keu-fab{...}` asli dari Tahap 1 dan override `#page-shop .keu-fab`
  dari Tahap 2 **tidak diubah** nilainya.
- **2 aksi**: ⛽ Isi BBM (`openBbmModal()`), 🔧 Servis
  (`openServisModal()`).
- **Tampil di seluruh tab Car Notes**: markup FAB ditaruh di luar
  `#cnTab-bbm` dan `#cnTab-servis`, tepat setelah `.cn-tabs`, sebelum
  komentar `<!-- BBM TAB -->` — sehingga tidak ikut ter-`u-dnone` saat
  pindah tab (`setCnTab()` tidak disentuh).

## 5. Responsive

Diwarisi otomatis dari media query `@media (min-width:600px)` yang
sudah ada di `styles.css` untuk `.keu-fab` (Tahap 1) — karena FAB Car
Notes memakai class yang sama persis, tidak perlu media query baru.

## 6. Design Token yang Dipakai

Tidak ada token baru. Seluruhnya diwarisi dari `.keu-fab*` (Tahap 1):
`--sp-9`, `--sp-4`, `--sp-3`, `--sp-6`, `--r-full`, `--r-pill`,
`--fs-icon`, `--fs-icon-lg`, `--fs-body`, `--z-dropdown`, `--accent`,
`--surface3`, `--border2`, `--text`, `--dur-fast`, `--ease-standard`.

## 7. File yang Berubah

| File | Jenis | Ukuran perubahan | Keterangan |
|---|---|---|---|
| `index.html` | Diubah | +19 baris (tambah) | Blok `<div class="keu-fab" id="carNotesFab">...</div>` di dalam `#page-carnotes`, setelah `.cn-tabs`, sebelum `<!-- BBM TAB -->`. Reuse class CSS `.keu-fab*` & fungsi `openBbmModal()`/`openServisModal()` yang sudah ada. Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | +19 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — bukan lewat `scripts/build.js` (tidak dijalankan). |
| `tests/car-notes-fab.test.js` | **Baru** | 122 baris | 17 test struktural: FAB ada di `#page-carnotes`, reuse class `.keu-fab*` (bukan class baru), berada di luar kedua tab (tampil di seluruh tab Car Notes), reuse `openBbmModal()`/`openServisModal()`, reuse `data-onclick` (bukan `data-action`), parity `index.html`/`app_production.html`, guard eksplisit tidak ada class CSS baru & tidak ada override posisi baru di `styles.css`, dan guard `vehicle-core.js`/`sparepart-servis.js`/`dashboard-hub-registry.js`/`dashboard-hub.js` tidak disentuh. |
| `CAR-NOTES-2.0.md` | **Baru** | — | Dokumen ini. |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 3 (aditif). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 3 (aditif). |

**Total perubahan kode**: 2 file diubah (`index.html`,
`app_production.html`) + 1 file test baru = **3 file kode**, di bawah
batas 5. `styles.css` **tidak disentuh sama sekali** (tidak butuh
override posisi, berbeda dari Tahap 2).

## 8. Alasan Business Logic Tidak Disentuh

- `openBbmModal()` (`vehicle-core.js`) dan `openServisModal()`
  (`sparepart-servis.js`) dipanggil ulang (reuse) dari lokasi UI baru —
  tidak ada baris di kedua file itu yang diubah (diverifikasi `diff`).
- Toggle buka/tutup FAB adalah state UI murni (class CSS `open`), tidak
  disimpan ke `D`/localStorage, tidak mempengaruhi data kendaraan, BBM,
  servis, sparepart, atau laporan Car Notes mana pun.
- `setCnTab()` (`vehicle-core.js`) tidak disentuh — FAB sengaja ditaruh
  di luar struktur tab supaya tidak perlu mengubah fungsi navigasi tab
  yang sudah ada.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`) tidak
  relevan/tidak disentuh — FAB bukan entri baru di Dashboard Grid.
- `dashboard-hub.js`, ADR-001, Dashboard V2, Hero Dashboard, Business
  Logic Kendaraan, Build System — tidak disentuh.
- `scripts/build.js` tidak dijalankan, sesuai instruksi — bundle
  (`app-bundle-a.min.js`/`app-bundle-b.min.js`) belum memuat markup FAB
  ini sampai build berikutnya dijalankan (sama seperti catatan Tahap 1
  & 2).

## 9. Hasil Test

```
node --test
# tests 1316
# pass 1316
# fail 0
```

Baseline (1299/1299, akhir Sprint 2 Tahap 2) tetap 100% lulus tanpa
perubahan; 17 test baru murni aditif.

## 10. Status

FAB Halaman Car Notes selesai, sesuai cakupan Sprint 2 Tahap 3. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke
Sprint 2 Tahap 4.
