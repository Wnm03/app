# QUICK ACTIONS
**Keluarga W v2.0 · Sprint 1 · Tahap 3 — Dashboard 2.0**

Baseline: Sprint 1 Tahap 2 (Hero Card, `HERO-CARD.md`).
Cakupan: **HANYA Quick Actions**. Widget Dashboard, Grid Dashboard,
Statistik, AI Insight — belum disentuh (menunggu Sprint 1 Tahap 4+).

---

## 1. Struktur Quick Actions

Tepat di bawah Hero Card, sebelum search bar:

```
#page-dashboard-hub
├── .page-settings-btn (header — tidak diubah)
├── .dashhub-hero (Tahap 2 — tidak diubah)
├── .dashhub-qa-row  ← BARU (Tahap 3)
│     ├── button.dashhub-qa-btn  "💰 Transaksi"
│     ├── button.dashhub-qa-btn  "📝 Catatan"
│     ├── button.dashhub-qa-btn  "💾 Backup"
│     ├── button.dashhub-qa-btn  "🔍 Cari"
│     └── button.dashhub-qa-btn  "🤖 AI"
├── .dashhub-search-wrap (tidak diubah)
├── #dashHubFavoritSection (tidak diubah)
├── #dashboardHubWrap / #dashboardHubGrid (tidak diubah)
├── #lifeOSWrap (tidak diubah)
└── #dashboardHubPinnedWrap (tidak diubah)
```

Markup lengkap ada di `index.html` (disalin otomatis ke
`app_production.html` oleh `scripts/build.js`), id container:
`dashHubQuickActions`.

## 2. Aksi yang Digunakan & Event yang Dipanggil

Semua tombol memanggil fungsi/elemen yang **sudah ada** — tidak ada
business logic baru, tidak ada modul JS baru:

| Tombol | Event (`data-onclick`) | Sumber fungsi | Kenapa dianggap "sudah ada" |
|---|---|---|---|
| 💰 Transaksi | `openTxModal('expense')` | `transaksi.js` | Fungsi yang sama persis dipakai tombol "- Pengeluaran" di menu Aksi Cepat lama (`qsDashboard`, `index.html`), juga dipanggil dari `worthit.js`/`tukang-absensi.js`. Modal `txModal` sendiri sudah generik ("Tambah Transaksi", ada toggle Pemasukan/Pengeluaran di dalamnya) — parameter `'expense'` hanya menentukan tab default saat dibuka, sama seperti pola default di `worthit.js`. |
| 📝 Catatan | `openCatatan('anak')` | `transaksi.js` | Satu-satunya fungsi "buka form catatan" yang sudah ada di seluruh app (`catatanModal`, sudah dipakai di alur "Catatan Anak" yang sudah ada). Tidak ada fitur catatan umum terpisah yang perlu dibuat baru — sesuai batasan "kalau salah satu aksi belum tersedia, jangan membuat fitur baru", Quick Action ini memakai fungsi catatan yang memang sudah ada apa adanya. |
| 💾 Backup | `openBackupModal()` | `backup-restore.js` | Fungsi yang sama persis dipakai 3 tombol lama lain: `qsDashboard` ("💾 Backup"), `qsShop` ("📤 Backup Shop"), `qsLaporan` ("📤 Backup Lanjutan"). |
| 🔍 Cari | `document.getElementById('dashHubSearchInput').focus()` | Native DOM | `#dashHubSearchInput` sudah ada tepat di bawah Quick Actions (`.dashhub-search-wrap`, sudah disambungkan ke `DashboardHubSearch.render()` sejak sebelum Tahap 3). Tombol ini **tidak membuka modal baru** — cukup fokus ke input yang sudah terlihat di layar yang sama, supaya keyboard langsung muncul. Murni interaksi DOM native, bukan logic baru. |
| 🤖 AI | `showPage('ai',document.querySelectorAll('.nav-item')[3])` | `modal-navigasi.js` + `PAGE_NAV_IDX` (`dashboard-hub.js`) | `showPage()` adalah fungsi navigasi generik yang sudah dipakai di seluruh app. `PAGE_NAV_IDX.ai = 3` sudah didefinisikan di `dashboard-hub.js` sejak Tahap 3 dashboard-hub (dipakai `dashHubNavigateToFeature()`). Pola pemanggilan `showPage(page, navItems[idx])` langsung dari markup persis sama dengan yang sudah dipakai di `qsAI`/`qsDashboard` (mis. `showPage('settings',document.querySelectorAll('.nav-item')[6])` untuk "Edit Profil"). |

Tidak ada `data-args`/dispatcher `data-action` yang dipakai di sini —
kelima tombol memakai `data-onclick` (bukan `data-action`), mekanisme yang
**sudah ada** di `features-helpers-global-security.js` (`el.closest('[data-action],[data-onclick]')`,
lalu `eval` isi atribut `data-onclick`) — pola yang sama persis dengan
tombol `.qs-action` di `qsDashboard`/`qsAI`/`qsShop`/`qsLaporan`.

### Kenapa tidak ada modul JS baru

Karena setiap tombol Quick Action memanggil fungsi global yang sudah ada
secara langsung (bukan lewat lapisan abstraksi baru), tidak dibutuhkan
object/module baru di `dashboard-hub.js` (berbeda dengan Hero Card di
Tahap 2 yang butuh `DashboardHubHero` untuk mengagregasi & menulis 5
elemen DOM). Quick Actions Tahap 3 murni HTML+CSS.

## 3. CSS Baru

Ditambahkan ke `styles.css`, scoped seluruhnya ke class `.dashhub-qa*`
(tidak ada deklarasi `.dashhub-*` lama yang diubah):

```css
.dashhub-qa-row{display:grid;grid-template-columns:repeat(5,1fr);gap:var(--sp-3);margin-bottom:var(--sp-6);}
.dashhub-qa-btn{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  background:var(--surface2);
  border:1px solid var(--border);
  border-radius:var(--r-pill);
  padding:var(--sp-5) var(--sp-2);
  cursor:pointer;user-select:none;
  font-family:inherit;
  transition:transform .12s ease, border-color .12s ease, background .12s ease;
}
.dashhub-qa-btn:active{transform:scale(0.95);}
.dashhub-qa-icon{font-size:var(--fs-icon-lg);line-height:1;}
.dashhub-qa-label{font-size:10px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}

@media (max-width:359px){ .dashhub-qa-row{grid-template-columns:repeat(3,1fr);} }
@media (min-width:600px){
  #page-dashboard-hub .dashhub-qa-btn:hover{border-color:var(--accent);background:var(--surface3);}
}
```

**Token yang dipakai** — semuanya sudah ada di `:root` (`styles.css`),
tidak ada token baru yang didefinisikan: `--sp-2/3/5/6` (6–14px),
`--r-pill` (20px), `--fs-icon-lg` (18px), `--surface2`, `--surface3`,
`--border`, `--accent`, `--text2`. Satu-satunya nilai literal (bukan
token) adalah ukuran font label `10px` — lebih kecil dari `--fs-caption`
(11px) karena label harus muat di kolom sesempit ~64px pada layar 360px
saat 5 tombol berjajar; ini murni penyesuaian ukuran teks kecil, bukan
pola desain baru (masih memakai warna `--text2` yang sama dengan label
lain di Hero Card).

## 4. Alasan Desain

- **Bentuk pill (`--r-pill`, radius penuh)** — konsisten dengan bahasa
  visual Material 3 untuk "action chips"/quick-action tiles (mis. tombol
  aksi cepat di Google Assistant/Google Home), berbeda dari kartu fitur
  commodity di grid bawah (`.dashhub-feature-card` pakai `--r-lg`, sudut
  lebih tajam) dan dari Hero Card (`--r-2xl`) — menciptakan hierarki 3
  level: Hero (paling menonjol) → Quick Actions (pill, akses instan) →
  Grid fitur (kartu commodity).
- **5 kolom rata dalam 1 baris** — mengikuti pola "action row" Material
  You yang umum dipakai untuk 4–6 aksi utama, cukup lega di layar mobile
  standar (≥360px) tanpa perlu scroll horizontal.
- **Icon besar + label kecil** — hierarki visual "icon dulu, baru teks",
  konsisten dengan `.dashhub-feature-card` (emoji besar di kartu fitur)
  tapi diperkecil proporsional karena Quick Actions harus lebih ringkas
  (5 item vs 2-3 item per baris di grid fitur).
- **Warna netral (`--surface2`/`--border`), bukan warna aksen per-tombol**
  — supaya baris Quick Actions tidak "bersaing" secara visual dengan Hero
  Card (yang sudah memakai gradient `--accent-soft`) tepat di atasnya;
  warna aksen (`--accent`) baru muncul saat hover/tap, pola yang sama
  dengan `.dashhub-feature-card:hover`.
- **Breakpoint 3 kolom di layar <360px** — mengikuti pola stack Hero Card
  di Tahap 2: pada layar sangat sempit, 5 kolom bikin label harus
  dipotong; ditumpuk jadi 2 baris (3+2) supaya tetap terbaca.
- **`.focus()` native untuk "Cari", bukan modal baru** — search bar
  (`#dashHubSearchInput`) sudah ada tepat di bawah Quick Actions dan
  sudah terlihat tanpa scroll di sebagian besar layar; membuka modal
  pencarian terpisah (`globalSearchModal`) untuk aksi ini akan
  duplikasi UI, sementara instruksi eksplisit melarang membuat logic
  baru — fokus native adalah interaksi paling minimal yang tetap
  memenuhi maksud "Search" sebagai quick action.

## 5. Validasi

- `node --test tests/*.test.js` → **1245/1245 PASS** (baseline Tahap 2
  diverifikasi ulang di lingkungan ini = 1235/1235 PASS, + 10 test baru
  dari `tests/dashboard-hub-quickactions.test.js`, 0 gagal/dihapus —
  lihat `CHANGELOG.md`).
- Hero Card tetap bekerja — tidak ada elemen `.dashhub-hero*` yang
  disentuh; diverifikasi test markup memastikan `#dashHubHeroCard` masih
  ada persis seperti sebelumnya dan posisinya tetap SEBELUM Quick Actions.
- Dashboard lama (`page-dashboard`, Grid Dashboard, Pinned Widgets, Life
  OS, Bottom Navigation) tidak disentuh — diverifikasi test markup
  memastikan `#dashboardHubWrap`/`#dashboardHubGrid` tetap ada persis
  seperti sebelumnya, tepat setelah Quick Actions & Favorit (urutan tidak
  berubah).
- `node scripts/build.js` dijalankan (tanpa mengedit `scripts/build.js`
  sendiri) supaya `app-bundle-a.min.js`/`app-bundle-b.min.js` — file yang
  benar-benar dimuat `index.html`/`app_production.html` — ikut ter-refresh
  ke versi terbaru. Build lolos seluruh lint bawaan (u-dnone vs
  style.display, escapeHtml, guard Tesseract) tanpa temuan baru.
