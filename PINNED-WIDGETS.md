# PINNED WIDGETS MODERN
**Keluarga W v2.0 · Sprint 1 · Tahap 6 — Dashboard 2.0**

Baseline: Sprint 1 Tahap 5 selesai (Hero Card + Quick Actions + Summary
Cards + Modern Dashboard Grid), `node --test` 1252/1252 PASS.
Cakupan: **HANYA modernisasi visual Pinned Widgets**. AI Insight,
Dashboard Analytics, Drag & Drop — belum disentuh (menunggu Sprint 1
Tahap 7+).

---

## 1. Yang Dimodernisasi

Area `#dashboardHubPinnedWrap` (6 widget lama, urutan DOM tidak berubah):

```
#dashboardHubPinnedWrap
├── .dashhub-cat-head        "📌 Pinned Widgets" (sudah ada sejak awal, tidak diubah)
├── .card#advisorCard        🧭 Penasihat
├── .card#lifeBalanceCard    🎯 Skor Hidup Seimbang
├── .card#refleksiCard       🌱 Refleksi & Self-Care
├── .card#dashFiCard         🎯 Kebebasan Finansial
├── .card#dashPensiunCard    🏖️ Dana Pensiun
└── .card#dashAbsensiCard    📅 Absensi Harian
```

**Tidak ada satu baris HTML pun yang diubah** di `index.html`/
`app_production.html` — isi, id, `data-action`, urutan widget, dan
markup internal tiap kartu **sama persis** dengan Tahap 5. Modernisasi
Tahap 6 murni CSS, memakai selector descendant `#dashboardHubPinnedWrap
.card`/`#dashboardHubPinnedWrap .card-title` di `styles.css`.

## 2. Kenapa Murni CSS (Tidak Ada Perubahan `dashboard-hub.js`/HTML)

`.card` dan `.card-title` adalah class **global** yang dipakai ~40+
kartu di seluruh aplikasi (Dashboard lama, Keuangan, Shop, Car Notes,
Pajak, Pengaturan, dst — bukan cuma 6 widget Pinned). Instruksi Tahap 6
eksplisit membatasi "Fokus HANYA pada tampilan Pinned Widgets" dan
"Jangan mengubah widget lain" — karena itu, **tidak ada satu baris pun
dari definisi dasar `.card`/`.card-title` yang diedit**. Sebagai
gantinya, seluruh aturan baru memakai selector descendant
`#dashboardHubPinnedWrap .card{...}` sehingga override HANYA berlaku
untuk 6 kartu di dalam Pinned Widgets — kartu dengan class `.card` yang
sama di halaman/section lain (mis. `dashBillCard` di dashboard lama,
`shopModalStokCard` di Shop, dll) **sama sekali tidak terdampak**.

Isi widget (data yang ditampilkan lewat `finCoachBody`, `lbScoreNum`,
`fiPct`, dst) dirender oleh modul JS masing-masing (`Advisor`,
`LifeBalance`, `FI`, dkk) yang sudah ada — tidak dipanggil dari
`DashboardHub.render()` di `dashboard-hub.js` sama sekali, sehingga
tidak ada yang perlu diubah di file itu untuk modernisasi ini.

## 3. CSS Baru

Ditambahkan ke `styles.css`, scoped seluruhnya ke
`#dashboardHubPinnedWrap` (tidak ada deklarasi `.card`/`.card-title`
dasar yang diubah):

```css
#dashboardHubPinnedWrap .card{
  border-radius:var(--r-2xl);
  padding:var(--sp-8) var(--sp-7);
  margin-bottom:var(--sp-7);
  box-shadow:0 2px 10px rgba(0,0,0,.06);
}
#dashboardHubPinnedWrap .card-title{
  font-size:var(--fs-body-lg);
  font-weight:700;
  text-transform:none;
  letter-spacing:normal;
  color:var(--text);
  gap:var(--sp-3);
  margin-bottom:var(--sp-6);
  padding-bottom:var(--sp-5);
  border-bottom:1px solid var(--border);
}
@media (min-width:600px){
  #dashboardHubPinnedWrap{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-6);align-items:start;}
  #dashboardHubPinnedWrap > .dashhub-cat-head{grid-column:1/-1;}
  #dashboardHubPinnedWrap .card{margin-bottom:0;}
}
@media (min-width:1024px){
  #dashboardHubPinnedWrap{grid-template-columns:repeat(3,1fr);}
}
@media (hover:hover) and (pointer:fine){
  #dashboardHubPinnedWrap .card:hover{border-color:var(--accent);box-shadow:0 6px 18px rgba(0,0,0,.1);}
}
```

**Token yang dipakai** — semuanya sudah ada di `:root`, tidak ada token
baru: `--r-2xl` (16px), `--sp-3/5/6/7/8`, `--fs-body-lg`. Transisi
`box-shadow`/`border-color` saat hover memakai properti transition yang
**sudah ada** di definisi dasar `.card` (`var(--dur-moderate)
var(--ease-standard)`) — tidak ditulis ulang di sini.

## 4. Alasan Desain (Checklist Target Tahap 6)

- **Card lebih modern / Radius besar** — `border-radius` diubah dari
  nilai literal `16px` (di definisi dasar `.card`) menjadi token
  `var(--r-2xl)` (nilai sama, 16px, tapi sekarang eksplisit lewat Design
  System) khusus di dalam Pinned Widgets, konsisten dgn radius Hero Card.
- **Elevation ringan** — `box-shadow:0 2px 10px rgba(0,0,0,.06)` sebagai
  default (sebelumnya kartu Pinned sama sekali flat, elevation hanya
  muncul saat `:hover` lewat rule global `.card:hover`), + elevation
  lebih kuat saat hover (`0 6px 18px`) khusus perangkat pointer halus
  (`@media (hover:hover) and (pointer:fine)`, pola sama dgn
  `.dashhub-feature-card:hover` di Dashboard Grid) — tanpa mengubah rule
  `.card:hover` global yang sudah ada.
- **Header lebih jelas** — `.card-title` di dalam Pinned Widgets
  diperbesar (`--fs-body-lg` vs `--fs-label` bawaan), huruf normal
  (bukan UPPERCASE kecil), + garis pemisah (`border-bottom`) dari isi
  kartu di bawahnya — membuat judul tiap widget lebih menonjol sebagai
  header kartu premium, bukan label kecil generik.
- **Icon lebih konsisten** — icon section-level ("📌 Pinned Widgets")
  **sudah** memakai `.dashhub-cat-icon`/`.dashhub-cat-head` yang sama
  persis dengan Life OS & Dashboard Grid sejak Tahap 1/4 (tidak perlu
  diubah). Icon emoji per-kartu (🧭🎯🌱🎯🏖️📅) tetap sebagai teks polos
  di awal `.card-title` (tidak dibungkus elemen baru) — ukurannya kini
  otomatis konsisten karena mewarisi `font-size` header yang seragam
  (`--fs-body-lg`) di seluruh 6 kartu.
- **Spacing lebih lega** — padding kartu naik dari `16px` literal ke
  `var(--sp-8) var(--sp-7)` (18px/16px, lebih lega secara vertikal),
  jarak antar kartu naik dari `12px` ke `var(--sp-7)` (16px).
- **Responsive** — mobile (<600px) tetap 1 kolom (daftar vertikal,
  hanya kartunya yang lebih modern); ≥600px berubah jadi grid 2 kolom;
  ≥1024px jadi 3 kolom — mengikuti pola breakpoint yang sama persis
  dengan Dashboard Grid (Tahap 5: 1→3→5 kolom). Header section
  (`.dashhub-cat-head`) di-span penuh (`grid-column:1/-1`) supaya tetap
  jadi judul section yang membentang di atas grid kartu. **Urutan DOM
  tidak diubah** — grid auto-flow murni mengikuti urutan sumber HTML,
  jadi 6 widget tetap tampil dalam urutan yang sama, hanya posisi
  visualnya yang menyesuaikan lebar layar.

## 5. Yang TIDAK Disentuh

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Summary
  Cards (`.dashhub-summary*`), Dashboard Grid
  (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`) — 0 baris
  berubah pada komponen-komponen ini.
- Isi widget (`finCoachBody`, `aiWidgetBody`, `lbScoreNum`, `lbBars`,
  `fiPct`, `dashPensiunBody`, `dashAbsensiHariCount`, dst), event
  (`data-action`), data (`D.*`), dan **urutan** 6 widget — tidak diubah.
- `.card`/`.card-title` **dasar** (dipakai ~40+ kartu lain di seluruh
  app) — 0 baris berubah; hanya di-override lewat descendant selector
  scoped ke Pinned Widgets.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`), ADR-001, business
  logic, routing, database — tidak disentuh.
- `scripts/build.js` — **tidak dijalankan**. Konsekuensinya sama seperti
  Tahap 4/5: `app-bundle-a.min.js`/`app-bundle-b.min.js` (bundle yang
  benar-benar dimuat browser), `sw.js` (`CACHE_NAME`), `docs/FILE-MAP.md`,
  dan versi aplikasi **tidak ikut ter-refresh** pada Tahap 6 ini — akan
  aktif di browser nyata setelah build dijalankan pada tahap konsolidasi
  berikutnya.

## 6. Batas Perubahan

Total file kode berubah: **1** (`styles.css`, ~47 baris tambahan).
Jauh di bawah batas 5 file / 350 baris.

## 7. Validasi

- `node --test` → **1263/1263 PASS** (baseline Tahap 5 diverifikasi ulang
  di lingkungan ini = 1252/1252 PASS, + 11 test baru dari
  `tests/dashboard-hub-pinnedwidgets.test.js`, 0 gagal/dihapus).
- Hero Card, Quick Actions, Summary Cards, Dashboard Grid tetap tampil —
  diverifikasi test markup memastikan keempatnya masih ada persis
  seperti Tahap 5.
- Pinned Widgets tampil lebih modern — diverifikasi test memastikan
  override `#dashboardHubPinnedWrap .card`/`.card-title` ada, hanya
  memakai token yang sudah ada di `:root`, dan definisi dasar
  `.card`/`.card-title` global tidak berubah sedikit pun.
- 6 widget lama (`advisorCard`, `lifeBalanceCard`, `refleksiCard`,
  `dashFiCard`, `dashPensiunCard`, `dashAbsensiCard`) tetap ada, urutan
  DOM tidak berubah, dan markup internal (judul, `data-action`) sama
  persis dengan sebelum Tahap 6.
