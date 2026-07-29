# DASHBOARD SUMMARY CARDS
**Keluarga W v2.0 · Sprint 1 · Tahap 5 — Dashboard 2.0**

Baseline: Sprint 1 Tahap 4 selesai (Hero Card + Quick Actions + Modern
Dashboard Grid), `node --test` 1246/1246 PASS.
Cakupan: **HANYA Summary Cards**. AI Insight, Statistik, dan tahap
lainnya — belum disentuh (menunggu Sprint 1 Tahap 6+).

---

## 1. Struktur Summary Cards

Tepat di bawah Quick Actions, sebelum search bar:

```
#page-dashboard-hub
├── .page-settings-btn (header — tidak diubah)
├── .dashhub-hero (Tahap 2 — tidak diubah)
├── .dashhub-qa-row (Tahap 3 — tidak diubah)
├── .dashhub-summary-grid  ← BARU (Tahap 5)
│     ├── .dashhub-summary-card  "Pemasukan Bulan Ini"
│     ├── .dashhub-summary-card  "Pengeluaran Bulan Ini"
│     ├── .dashhub-summary-card  "Bersih Bulan Ini"
│     └── .dashhub-summary-card  "Jumlah Transaksi"
├── .dashhub-search-wrap (tidak diubah)
├── #dashHubFavoritSection (tidak diubah)
├── #dashboardHubWrap / #dashboardHubGrid (Tahap 1/4 — tidak diubah)
├── #lifeOSWrap (tidak diubah)
└── #dashboardHubPinnedWrap (tidak diubah)
```

Markup ada di `index.html`, disinkronkan manual (byte-identik, `diff`
kosong) ke `app_production.html` — bukan lewat `scripts/build.js` (lihat
§5). Id container: `dashHubSummaryGrid`.

## 2. Sumber Data & Alasan "Bukan Business Logic Baru"

Keempat angka dibaca dari `D.transactions` bulan berjalan lewat
`_dashHubSummaryMonthTx()` (fungsi baru murni-baca di `dashboard-hub.js`),
memakai **pola filter yang sudah dipakai berulang** di aplikasi ini:

- Pola filter bulan berjalan (`date.getMonth()===m && date.getFullYear()===y`,
  lalu jumlahkan per `type`) **identik** dengan `_dashHubHeroMonthTx()`
  (Hero Card, Tahap 2) dan `renderDashboard()`/`FinCoach.renderDash()`
  (`modules-render.js`, `features-aiwidget-reminder-gdrive-search.js`).
- "Bersih" (`inc - exp`) dan "Jumlah Transaksi" (`txM.length`) **sudah
  ditampilkan** sebagai metrik siap-pakai di tempat lain, mis. baris ini
  di `features-aiwidget-reminder-gdrive-search.js`:
  `Pemasukan: ... | Pengeluaran: ... | Bersih: ... | Jumlah transaksi: ${txM.length}`.

Karena itu, Summary Cards **tidak memperkenalkan aturan bisnis baru** —
hanya membaca ulang data yang sudah dihitung dengan cara yang sama di
banyak tempat lain, ditampilkan dalam bentuk kartu.

### Kenapa fungsi baru, bukan reuse langsung `_dashHubHeroMonthTx()`

`_dashHubSummaryMonthTx()` **sengaja menduplikasi** logika filter bulan
berjalan milik Hero Card, alih-alih memanggil/mengimpor
`_dashHubHeroMonthTx()` secara langsung. Ini murni untuk memenuhi
constraint eksplisit "Hero Card tidak diubah" — dengan fungsi terpisah,
tidak ada satu baris pun di jalur kode Hero Card yang disentuh atau
berisiko terpengaruh oleh perubahan Summary Cards di masa depan.
Trade-off-nya adalah duplikasi logic ~6 baris; ini dianggap dapat
diterima mengingat prioritas constraint isolasi antar-tahap.

## 3. CSS Baru

Ditambahkan ke `styles.css`, scoped seluruhnya ke class
`.dashhub-summary*` (tidak ada deklarasi `.dashhub-*` lama yang diubah):

```css
.dashhub-summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-3);margin-bottom:var(--sp-6);}
.dashhub-summary-card{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-xl);padding:var(--sp-5);}
.dashhub-summary-label{font-size:var(--fs-caption);color:var(--text2);margin-bottom:2px;}
.dashhub-summary-val{font-size:var(--fs-title-sm);font-weight:700;color:var(--text);}
@media (min-width:600px){
  .dashhub-summary-grid{grid-template-columns:repeat(4,1fr);}
}
```

**Token yang dipakai** — semuanya sudah ada di `:root` (`styles.css`),
tidak ada token baru yang didefinisikan: `--sp-3/5/6`, `--r-xl`,
`--fs-caption`, `--fs-title-sm`, `--surface2`, `--border`, `--text`,
`--text2`. Warna hijau/merah pada angka "Pemasukan"/"Pengeluaran"/"Bersih"
memakai utility class `.green`/`.red` yang **sudah ada** di `styles.css`
(dipakai juga oleh Hero Card) — tidak ada warna baru.

## 4. Alasan Desain

- **2 kolom di mobile, 4 kolom di ≥600px** — mengikuti pola breakpoint
  yang sama dengan `.dashhub-qa-row` (Quick Actions, 3→5 kolom) dan Grid
  Dashboard (blueprint §4): 2 kolom di layar sempit menjaga angka tetap
  terbaca penuh tanpa terpotong, melebar jadi 1 baris penuh di tablet/desktop.
- **Kartu netral (`--surface2`/`--border`), bukan gradient** — berbeda
  dari Hero Card (yang sudah memakai gradient `--accent-soft` sebagai
  elemen paling menonjol di halaman) supaya Summary Cards terasa sebagai
  "detail pendukung" ringkas, bukan bersaing secara visual dengan Hero.
- **Radius `--r-xl` (14px)** — satu tingkat di bawah Hero Card
  (`--r-2xl`, 16px), konsisten dengan hierarki visual yang sudah
  ditetapkan sejak Tahap 2/3 (Hero paling menonjol → Quick Actions/Summary
  → Grid fitur commodity).
- **Reuse `.green`/`.red`** — konsistensi visual dengan Hero Card yang
  sudah memakai class yang sama persis untuk Pemasukan/Pengeluaran.

## 5. Yang TIDAK Disentuh

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Dashboard
  Grid (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`) — 0 baris
  berubah pada komponen-komponen ini.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — 0 baris berubah.
- ADR-001, business logic domain manapun (`akun.js`, `transaksi.js`, dkk)
  — tidak diedit.
- `scripts/build.js` — **tidak dijalankan** (sesuai instruksi eksplisit,
  validasi cukup `node --test`). Konsekuensinya: `app-bundle-a.min.js`/
  `app-bundle-b.min.js`, `sw.js` (`CACHE_NAME`), `docs/FILE-MAP.md`, dan
  versi string di source lain **tidak ikut ter-refresh** — sama seperti
  keputusan Tahap 4. `index.html`/`app_production.html` yang diedit di
  Tahap 5 ini memuat `<script src="app-bundle-b.min.js?v=...">` versi
  LAMA, sehingga perubahan `dashboard-hub.js` baru akan aktif di browser
  nyata setelah build dijalankan pada tahap konsolidasi berikutnya. Test
  `node --test` tetap valid karena memuat `dashboard-hub.js` langsung dari
  source (lihat `tests/helpers/loadSource.js`), bukan dari bundle.

## 6. Validasi

- `node --test` → **1252/1252 PASS** (baseline Tahap 4 diverifikasi ulang
  di lingkungan ini = 1246/1246 PASS, + 6 test baru dari
  `tests/dashboard-hub-summary.test.js`, 0 gagal/dihapus — lihat
  `CHANGELOG.md`).

  Catatan: Tahap 4 mencatat baseline 1246; Tahap 5 menambah 6 test baru
  (bukan 10 seperti Tahap 3) karena cakupan Summary Cards lebih sempit
  (1 elemen kalkulasi murni + 1 kontainer render, bukan 5 tombol
  independen).
- Hero Card tetap tampil — tidak ada elemen `.dashhub-hero*` yang
  disentuh; diverifikasi test integrasi memastikan `#dashHubHeroCard`/
  `dashHubHeroGreet`/`dashHubHeroSaldo` masih terisi persis seperti
  sebelumnya.
- Quick Actions tetap tampil — `#dashHubQuickActions` & 5 tombolnya tidak
  disentuh sama sekali oleh perubahan `index.html`/`app_production.html`
  di Tahap 5 (Summary Cards disisipkan setelah blok Quick Actions, bukan
  menggantikannya).
- Dashboard Grid tetap tampil — `#dashboardHubGrid`/`#dashboardHubWrap`
  tidak disentuh; diverifikasi test integrasi memastikan grid kategori
  masih ter-render seperti sebelumnya.
