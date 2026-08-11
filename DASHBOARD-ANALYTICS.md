# DASHBOARD ANALYTICS
**Keluarga W v2.0 · Sprint 1 · Tahap 7 — Dashboard 2.0**

Baseline: Sprint 1 Tahap 6 selesai (Hero Card + Quick Actions + Summary
Cards + Modern Dashboard Grid + Modern Pinned Widgets + Motion System +
Design System), `node --test` 1263/1263 PASS.
Cakupan: **HANYA Dashboard Analytics**. AI Insight, Drag & Drop,
Dashboard 3.0, dan tahap lainnya — belum disentuh (menunggu Sprint 2).

---

## 1. Struktur Dashboard Analytics

Tepat di bawah Summary Cards, sebelum search bar (dan karena itu juga
sebelum Dashboard Grid):

```
#page-dashboard-hub
├── .page-settings-btn (header — tidak diubah)
├── .dashhub-hero (Tahap 2 — tidak diubah)
├── .dashhub-qa-row (Tahap 3 — tidak diubah)
├── .dashhub-summary-grid (Tahap 5 — tidak diubah)
├── .dashhub-analytics-row  ← BARU (Tahap 7)
│     ├── .dashhub-analytics-card  "Transaksi Bulan Ini"
│     ├── .dashhub-analytics-card  "Total Pemasukan"
│     ├── .dashhub-analytics-card  "Total Pengeluaran"
│     ├── .dashhub-analytics-card  "Saldo Bersih"
│     └── .dashhub-analytics-card  "Pemasukan vs Pengeluaran" (%)
├── .dashhub-search-wrap (tidak diubah)
├── #dashHubFavoritSection (tidak diubah)
├── #dashboardHubWrap / #dashboardHubGrid (Tahap 1/4 — tidak diubah)
├── #lifeOSWrap (tidak diubah)
└── #dashboardHubPinnedWrap (Tahap 6 — tidak diubah)
```

Markup ada di `index.html`, disinkronkan manual (byte-identik, `diff`
kosong) ke `app_production.html` — bukan lewat `scripts/build.js` (lihat
§5). Id container: `dashHubAnalyticsRow`.

## 2. Sumber Data & Alasan "Bukan Business Logic Baru"

Kelima angka dibaca dari `D.transactions` bulan berjalan lewat
`_dashHubAnalyticsMonthTx()` (fungsi baru murni-baca di
`dashboard-hub.js`), memakai **pola filter yang sudah dipakai berulang**
di aplikasi ini — persis pola yang sama dengan `_dashHubHeroMonthTx()`
(Hero Card, Tahap 2) dan `_dashHubSummaryMonthTx()` (Summary Cards,
Tahap 5):

- Filter `D.transactions` ke bulan+tahun berjalan
  (`date.getMonth()===m && date.getFullYear()===y`), lalu jumlahkan per
  `type` (`income`/`expense`).
- "Transaksi Bulan Ini" = `txM.length` — metrik yang **sudah ditampilkan
  persis sama** sebagai "Jumlah Transaksi" di Summary Cards (Tahap 5).
- "Total Pemasukan"/"Total Pengeluaran"/"Saldo Bersih" — angka yang
  **sudah ditampilkan** di Hero Card (Tahap 2, sebagai "Pemasukan/
  Pengeluaran Bulan Ini") dan Summary Cards (Tahap 5, sebagai
  "Pemasukan/Pengeluaran/Bersih Bulan Ini").
- "Pemasukan vs Pengeluaran (%)" — satu-satunya angka yang **belum**
  ditampilkan di komponen lain, tapi murni turunan aritmatika dari dua
  angka yang sudah ada (`inc`, `exp`): `incPct = round(inc/(inc+exp)*100)`,
  `expPct = round(exp/(inc+exp)*100)`. Ini bukan aturan bisnis baru —
  hanya pembagian dua nominal yang sudah dihitung, ditampilkan sebagai
  rasio. Kalau `inc+exp === 0` (belum ada transaksi bernominal bulan
  ini), persentase ditampilkan sebagai placeholder `—` (tidak
  melakukan pembagian dengan nol).

Karena itu, Dashboard Analytics **tidak memperkenalkan aturan bisnis
baru** — hanya membaca ulang & menghitung rasio sederhana dari data yang
sudah dihitung dengan cara yang sama di banyak tempat lain, ditampilkan
dalam bentuk kartu horizontal.

### Kenapa fungsi baru, bukan reuse langsung Hero/Summary

`_dashHubAnalyticsMonthTx()` **sengaja menduplikasi** logika filter
bulan berjalan milik Hero Card/Summary Cards, alih-alih
memanggil/mengimpor `_dashHubHeroMonthTx()`/`_dashHubSummaryMonthTx()`
secara langsung. Ini murni untuk memenuhi constraint eksplisit "Hero
Card tetap tampil" & "Summary Cards tetap tampil" (tidak boleh diubah) —
dengan fungsi terpisah, tidak ada satu baris pun di jalur kode
Hero/Summary yang disentuh atau berisiko terpengaruh oleh perubahan
Dashboard Analytics di masa depan. Trade-off-nya adalah duplikasi logic
~6 baris (pola yang sama sudah diterima di Tahap 5 dengan alasan yang
identik); dianggap dapat diterima mengingat prioritas constraint isolasi
antar-tahap.

## 3. CSS Baru

Ditambahkan ke `styles.css`, scoped seluruhnya ke class
`.dashhub-analytics*` (tidak ada deklarasi `.dashhub-*` lama yang
diubah):

```css
.dashhub-analytics-row{display:flex;gap:var(--sp-3);overflow-x:auto;padding-bottom:2px;margin-bottom:var(--sp-6);scrollbar-width:none;-webkit-overflow-scrolling:touch;}
.dashhub-analytics-row::-webkit-scrollbar{display:none;}
.dashhub-analytics-card{flex:0 0 auto;min-width:132px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-xl);padding:var(--sp-4) var(--sp-5);}
.dashhub-analytics-label{font-size:var(--fs-caption);color:var(--text2);margin-bottom:2px;white-space:nowrap;}
.dashhub-analytics-val{font-size:var(--fs-title-sm);font-weight:700;color:var(--text);white-space:nowrap;}
```

**Token yang dipakai** — semuanya sudah ada di `:root` (`styles.css`),
tidak ada token baru yang didefinisikan: `--sp-3/4/5/6`, `--r-xl`,
`--fs-caption`, `--fs-title-sm`, `--surface2`, `--border`, `--text`,
`--text2`. Warna hijau/merah pada angka "Total Pemasukan"/"Total
Pengeluaran"/"Saldo Bersih" memakai utility class `.green`/`.red` yang
**sudah ada** di `styles.css` (dipakai juga oleh Hero Card & Summary
Cards) — tidak ada warna baru.

**Pola scroll horizontal** — reuse langsung dari pola yang **sudah ada**
di `styles.css` (mis. `.trs-chip-row`, `.kasir-kat-chips`:
`display:flex; gap; overflow-x:auto; scrollbar-width:none`) — bukan
teknik baru yang diperkenalkan di Tahap 7.

## 4. Alasan Desain

- **Kartu horizontal scroll, bukan grid statis seperti Summary Cards** —
  sesuai instruksi eksplisit "berbentuk card horizontal kecil". Dengan 5
  kartu (satu lebih banyak dari Summary Cards yang 4), grid 2/4 kolom
  akan terasa penuh/sesak di layar sempit; scroll horizontal menjaga
  setiap kartu tetap lega (`min-width:132px`) tanpa memaksa wrap ke
  baris kedua, dan otomatis scalable kalau jumlah kartu bertambah di
  tahap mendatang.
- **Kartu netral (`--surface2`/`--border`), radius `--r-xl`** — identik
  dengan gaya Summary Cards (Tahap 5), menjaga Dashboard Analytics
  terasa satu keluarga visual dengan Summary Cards yang letaknya
  bersebelahan, sama-sama "detail pendukung" ringkas di bawah Hero Card
  yang lebih menonjol (gradient `--accent-soft`).
- **Tidak ada chart/canvas/library** — sesuai batasan eksplisit ("Tidak
  perlu chart. Tidak perlu canvas. Tidak perlu library"); rasio
  Pemasukan vs Pengeluaran ditampilkan sebagai teks `NN% : NN%`, bukan
  visual bar/pie.
- **Placeholder `—` saat belum ada nominal** — konsisten dengan pola
  "aman tanpa D" yang sudah dipakai Hero Card/Summary Cards (tampil
  `Rp 0`, bukan error/`NaN`); untuk rasio yang tidak terdefinisikan
  (`0/0`), placeholder `—` dipilih alih-alih `0% : 0%` supaya tidak
  menyiratkan data "seimbang" yang keliru.

## 5. Yang TIDAK Disentuh

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Summary
  Cards (`.dashhub-summary*`), Dashboard Grid
  (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`), Pinned
  Widgets (`#dashboardHubPinnedWrap`) — 0 baris berubah pada
  komponen-komponen ini.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — 0 baris berubah.
- ADR-001, business logic domain manapun (`akun.js`, `transaksi.js`, dkk)
  — tidak diedit. Tidak ada query baru, tidak ada source of truth baru
  — Dashboard Analytics 100% membaca `D.transactions` yang sama dengan
  Hero Card/Summary Cards.
- `scripts/build.js` — **tidak dijalankan** (sesuai instruksi eksplisit,
  validasi cukup `node --test`). Konsekuensinya: `app-bundle-a.min.js`/
  `app-bundle-b.min.js`, `sw.js` (`CACHE_NAME`), `docs/FILE-MAP.md`, dan
  versi string di source lain **tidak ikut ter-refresh** — sama seperti
  keputusan Tahap 4/5. `index.html`/`app_production.html` yang diedit di
  Tahap 7 ini memuat `<script src="app-bundle-b.min.js?v=...">` versi
  LAMA, sehingga perubahan `dashboard-hub.js` baru akan aktif di browser
  nyata setelah build dijalankan pada tahap konsolidasi berikutnya. Test
  `node --test` tetap valid karena memuat `dashboard-hub.js` langsung dari
  source (lihat `tests/helpers/loadSource.js`), bukan dari bundle.

## 6. Validasi

- `node --test` → **1270/1270 PASS** (baseline Tahap 6 diverifikasi ulang
  di lingkungan ini = 1263/1263 PASS, + 7 test baru dari
  `tests/dashboard-hub-analytics.test.js`, 0 gagal/dihapus — lihat
  `CHANGELOG.md`).
- Hero Card tetap tampil — tidak ada elemen `.dashhub-hero*` yang
  disentuh; diverifikasi test integrasi memastikan `#dashHubHeroCard`/
  `dashHubHeroGreet`/`dashHubHeroSaldo` masih terisi persis seperti
  sebelumnya.
- Quick Actions tetap tampil — `#dashHubQuickActions` & 5 tombolnya tidak
  disentuh sama sekali oleh perubahan `index.html`/`app_production.html`
  di Tahap 7 (Dashboard Analytics disisipkan setelah blok Summary Cards,
  bukan menggantikannya).
- Summary Cards tetap tampil — `#dashHubSummaryGrid` tidak disentuh;
  diverifikasi test integrasi memastikan 4 kartu ringkas masih ter-render
  seperti sebelumnya.
- Dashboard Grid tetap tampil — `#dashboardHubGrid`/`#dashboardHubWrap`
  tidak disentuh; diverifikasi test integrasi memastikan grid kategori
  masih ter-render seperti sebelumnya.
- Pinned Widgets tetap tampil — `#dashboardHubPinnedWrap` & 6 widget di
  dalamnya tidak disentuh sama sekali oleh Tahap 7.
- Analytics tampil — `#dashHubAnalyticsRow` terisi 5 kartu (Transaksi
  Bulan Ini/Total Pemasukan/Total Pengeluaran/Saldo Bersih/Pemasukan vs
  Pengeluaran), diverifikasi lewat `tests/dashboard-hub-analytics.test.js`.
