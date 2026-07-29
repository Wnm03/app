# Sprint 1 — Tahap 4: Modern Dashboard Grid

Baseline: Sprint 1 Tahap 3 selesai (Hero Card + Quick Actions), `node --test`
1245/1245 PASS. Tahap ini **hanya** menyentuh Dashboard Grid (grid
kategori/fitur di bawah Hero Card & Quick Actions) — Hero Card, Quick
Actions, Bottom Navigation, AI, Statistik, Widget Drag & Drop, dan Search
**tidak disentuh sama sekali**.

## Tujuan

Modernisasi tampilan Dashboard Grid supaya terasa lebih seperti aplikasi
premium Material Design 3, memakai token desain yang **sudah ada** di
`styles.css` (tidak ada token baru).

## Ruang Lingkup Perubahan

Class yang dimodernisasi (semua sudah ada sejak Tahap 1, tidak ada class
baru selain satu badge kecil):

| Class | Perubahan |
|---|---|
| `.dashhub-cat` | Jarak antar kategori ditambah (16px → 22px) supaya hierarki antar grup lebih jelas. |
| `.dashhub-cat-head` | Gap diperbesar (10px → 12px), margin bawah ditambah. |
| `.dashhub-cat-icon` | Kontainer ikon diperbesar (36px → 40px), radius M3 (`--r-xl`), tambah shadow tipis (elevation level-1). |
| `.dashhub-cat-label` | Dijadikan flex row supaya bisa menampung badge baru di sebelahnya. |
| `.dashhub-cat-badge` **(baru)** | Chip bulat kecil menampilkan jumlah fitur per kategori — lihat bagian Badge di bawah. |
| `.dashhub-feature-grid` | Gap grid mengikuti token spacing (`--sp-4`) sebagai ganti angka literal `9px` — nilai visual hampir sama, kini konsisten dgn skala spacing lain. |
| `.dashhub-feature-card` | Radius diperbesar (`--r-lg` → `--r-xl`), padding mengikuti token (`--sp-6`/`--sp-5`), ditambah elevation shadow tipis (default & saat ditekan) — pola "card elevated" khas Material 3. |
| `.dashhub-feature-name` / `-desc` | Line-height & letter-spacing dirapikan untuk hierarki tipografi yang lebih jelas (nama fitur vs deskripsi). |
| `.dashhub-fav-star` | Diubah dari teks bintang polos menjadi chip bulat kecil (icon-button M3) dengan latar `--surface3`, & latar oranye lembut saat aktif — favorite indicator jadi lebih terlihat & area tap lebih jelas. |
| `:hover` (desktop only, guard `hover:hover` sudah ada) | Elevation saat hover diperkuat + sedikit terangkat (`translateY(-1px)`), efek "card lift" khas M3. |

## Badge (jumlah fitur per kategori)

Ditambahkan satu badge bulat kecil di sebelah label kategori yang
menampilkan jumlah fitur di kategori tsb (mis. "🚗 Kendaraan `6`"). Ini
**murni tampilan** — memakai `cat.features.length` yang sudah tersedia
saat render (bukan data/struktur baru, **tidak menyentuh
`FEATURE_REGISTRY`** sama sekali). Perubahan JS hanya menambah 1 elemen
`<span>` di dalam `dashboard-hub.js`, murni render/layout.

## Responsive

Breakpoint 2 kolom (mobile) / 3 kolom (tablet ≥600px) / 5 kolom (desktop
≥1024px) dari Tahap 5 sebelumnya **tidak diubah** — hanya jarak
antar-card (gap) yang kini pakai token spacing.

## Yang TIDAK diubah

- Hero Card (`.dashhub-hero*`) — tetap tampil & berfungsi seperti Tahap 2.
- Quick Actions (`.dashhub-qa*`) — tetap tampil & berfungsi seperti Tahap 3.
- Bottom Navigation, AI, Statistik, Widget Drag & Drop, Search.
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `scripts/build.js` (tidak dijalankan), `sw.js`, `docs/FILE-MAP.md`, versi
  aplikasi, dan kedua file bundle (`app-bundle-a.min.js` /
  `app-bundle-b.min.js`).

## File Berubah

1. `styles.css` — modernisasi CSS card/grid/badge/favorite indicator (lihat
   tabel di atas).
2. `dashboard-hub.js` — 1 baris ditambah (badge jumlah fitur, render-only).

Total: **2 file kode**, jauh di bawah batas 5 file / 350 baris perubahan.

## Validasi

```
node --test
```

Hasil: **1246/1246 PASS** (seluruh test lama tetap hijau; tidak ada test
yang gagal akibat perubahan CSS/markup ini). Diverifikasi manual:

- ✅ Hero Card tetap tampil
- ✅ Quick Actions tetap tampil
- ✅ Dashboard Grid tetap berfungsi (buka fitur, toggle favorit, search,
  favorit section, LifeOS section, Pinned Widgets — semua memakai class
  yang sama yang dimodernisasi di sini)

`scripts/build.js` **tidak dijalankan** sesuai instruksi.
