# HERO CARD
**Keluarga W v2.0 · Sprint 1 · Tahap 2 — Dashboard 2.0**

Baseline: FINAL RELEASE CANDIDATE + Sprint 1 Tahap 1 (`DASHBOARD-2.0-PLAN.md`).
Cakupan: **HANYA Hero Card**. Grid kategori, Quick Actions, Widget lain,
Bottom Navigation — belum disentuh (menunggu Sprint 1 Tahap 3+).

---

## 1. Struktur Hero Card

Elemen pertama di dalam `#page-dashboard-hub`, tepat setelah header, sebelum
search bar (sesuai `DASHBOARD-2.0-PLAN.md` §11/§12):

```
#page-dashboard-hub
├── .page-settings-btn (header — tidak diubah)
├── .dashhub-hero  ← BARU (Tahap 2)
│     ├── .dashhub-hero-greet     "Halo, {nama} 👋"
│     ├── .dashhub-hero-date      "Senin, 13 Juli 2026"
│     ├── .dashhub-hero-balance
│     │     ├── .dashhub-hero-balance-label   "Saldo Semua Akun"
│     │     └── .dashhub-hero-balance-val     "Rp 4.250.000"
│     └── .dashhub-hero-stats  (grid 2 kolom)
│           ├── Pemasukan Bulan Ini  (.green)
│           └── Pengeluaran Bulan Ini (.red)
├── .dashhub-search-wrap (tidak diubah)
├── #dashHubFavoritSection (tidak diubah)
├── #dashboardHubWrap / #dashboardHubGrid (tidak diubah)
├── #lifeOSWrap (tidak diubah)
└── #dashboardHubPinnedWrap (tidak diubah)
```

Markup lengkap ada di `index.html` (disalin otomatis ke
`app_production.html` oleh `scripts/build.js`), id elemen:
`dashHubHeroCard`, `dashHubHeroGreet`, `dashHubHeroDate`, `dashHubHeroSaldo`,
`dashHubHeroInc`, `dashHubHeroExp`.

## 2. Data yang Digunakan

Semua nilai dibaca dari data yang **sudah ada** — tidak ada field baru,
tidak ada perhitungan/aturan bisnis baru:

| Elemen | Sumber Data | Cara Dapat |
|---|---|---|
| Sapaan | `D.profile.nama` | Field yang sudah ada (`features-helpers-global-security.js`, default `'W'`, sama seperti yang dipakai `#sNama` di Pengaturan → Profil) |
| Tanggal | `new Date()` | Native, diformat `toLocaleDateString('id-ID', {weekday, day, month, year})` — murni format tampilan, bukan data app |
| Saldo Semua Akun | `totalSaldoAkun()` | Fungsi yang **sudah ada** di `akun.js`, dipanggil apa adanya (dipakai juga oleh dashboard lama `#dTotalAcc`/`#dBalance`) — Hero Card TIDAK menghitung saldo sendiri |
| Pemasukan Bulan Ini | `D.transactions` | Filter bulan+tahun berjalan, jumlahkan `type==='income'` — pola identik dgn `renderDashboard()`/`renderDashLaporanMini()` di `modules-render.js` dan `FinCoach.renderDash()` |
| Pengeluaran Bulan Ini | `D.transactions` | Sama seperti di atas, `type==='expense'` |

Fungsi baru yang ditambahkan (keduanya di `dashboard-hub.js`, murni
read-only, tidak menulis ke `D`):

```js
function _dashHubHeroMonthTx() { /* filter+sum bulan berjalan, pola yang sama
                                      dgn yang sudah dipakai di modules-render.js */ }

const DashboardHubHero = {
  render() { /* baca 5 elemen DOM, isi dari data di atas */ },
};
```

Dipanggil dari `DashboardHub.render()` secara **aditif** (satu baris
tambahan, tidak mengubah baris yang sudah ada), persis pola
`LifeOSHome.render()`/`DashboardHubFavoritView.render()` yang sudah dipakai
di file yang sama.

### Placeholder (data belum tersedia)

- Kalau `totalSaldoAkun` belum ter-load (mis. modul `akun.js` belum
  dimuat) → tampil `—` (em dash), bukan `Rp NaN` atau error.
- Kalau `D`/`D.profile` belum ada → sapaan pakai fallback `'W'`, identik
  dengan fallback yang sudah dipakai di `profil-pengaturan.js`
  (`D.profile.nama || 'W'`) — bukan nilai baru yang dikarang.
- Tidak ada logic baru untuk kasus ini — murni guard `typeof` yang sudah
  jadi pola standar di `dashboard-hub.js` (lihat `_dashHubIsFav()`).

## 3. CSS Baru

Ditambahkan ke `styles.css`, scoped seluruhnya ke class `.dashhub-hero*`
(tidak ada deklarasi `.dashhub-*` lama yang diubah):

```css
.dashhub-hero{
  background:linear-gradient(135deg,var(--accent-soft),var(--surface2) 65%);
  border:1px solid var(--accent);
  border-radius:var(--r-2xl);
  padding:var(--sp-8) var(--sp-7);
  margin-bottom:var(--sp-6);
  box-shadow:0 8px 24px rgba(0,0,0,.14);
}
.dashhub-hero-greet{font-family:'Space Grotesk',sans-serif;font-size:var(--fs-title);font-weight:700;color:var(--text);}
.dashhub-hero-date{font-size:var(--fs-caption);color:var(--text2);margin-top:2px;text-transform:capitalize;}
.dashhub-hero-balance{margin-top:var(--sp-7);}
.dashhub-hero-balance-label{font-size:var(--fs-caption);color:var(--text2);}
.dashhub-hero-balance-val{font-family:'Space Grotesk',sans-serif;font-size:var(--fs-stat);font-weight:800;color:var(--text);}
.dashhub-hero-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-5);margin-top:var(--sp-7);padding-top:var(--sp-6);border-top:1px solid var(--border);}
.dashhub-hero-stat-label{font-size:var(--fs-caption);color:var(--text2);}
.dashhub-hero-stat-val{font-size:var(--fs-title-sm);font-weight:700;color:var(--text);}

@media (max-width:359px){ .dashhub-hero-stats{grid-template-columns:1fr;} }
@media (min-width:600px){
  #page-dashboard-hub .dashhub-hero{padding:var(--sp-9) var(--sp-8);}
  #page-dashboard-hub .dashhub-hero-balance-val{font-size:24px;}
}
```

**Token yang dipakai** — semuanya sudah ada di `:root` (`styles.css`),
tidak ada token baru yang didefinisikan:
`--r-2xl` (16px), `--sp-5..9` (12–20px), `--fs-caption/title/title-sm/stat`
(11/17/15/20px), `--accent`, `--accent-soft`, `--surface2`, `--text`,
`--text2`, `--border`. Warna hijau/merah pakai class `.green`/`.red` yang
sudah ada (`var(--accent3)`/`var(--accent2)`), bukan warna baru — otomatis
konsisten di 10 tema warna aplikasi.

Satu-satunya nilai literal (bukan token) adalah `box-shadow:0 8px 24px
rgba(0,0,0,.14)` — pola yang sama dengan shadow literal yang SUDAH ADA di
file ini (`.kasir-tile`, `.dashhub-feature-card:hover`, dll., lihat
`ROADMAP-v1.1.md` item 5 untuk rencana migrasi ke token `--shadow-*` di
masa depan, di luar cakupan Tahap 2 ini).

Breakpoint yang dipakai (`max-width:359px`, `min-width:600px`) mengikuti
pola breakpoint yang sudah ada di blok CSS Dashboard Hub yang sama
(`min-width:600px`/`min-width:1024px` untuk grid kategori).

## 4. Alasan Desain

- **Radius besar (`--r-2xl`, 16px)** — konsisten dengan bahasa visual
  Material 3/Material You: kartu ringkasan utama (mis. kartu saldo Google
  Wallet, kartu cuaca/rumah di Google Home) memakai radius lebih besar
  dari kartu commodity di bawahnya (`.dashhub-feature-card` pakai `--r-lg`,
  12px) — menciptakan hierarki visual "ini kartu paling penting" tanpa
  menambah warna baru.
- **Gradient tipis, bukan warna solid penuh** — `linear-gradient(135deg,
  var(--accent-soft), var(--surface2) 65%)` memberi aksen premium ala
  Pixel UI/Google Home tanpa mengorbankan kontras teks (`--accent-soft`
  sudah dirancang cukup lembut di seluruh 10 tema, sama seperti yang
  dipakai `advisorCard` yang sudah ada di Pinned Widgets).
- **Elevation via shadow** — `0 8px 24px rgba(0,0,0,.14)` menaikkan Hero
  Card "di atas" konten lain secara visual, sesuai konsep elevation
  Material 3 (kartu-kartu di bawahnya, mis. `.dashhub-feature-card`,
  memakai shadow lebih tipis/tidak ada shadow default, muncul hanya saat
  hover).
- **Hierarki tipografi** — greeting (`--fs-title`, 17px/700) > label
  (`--fs-caption`, 11px) < angka saldo (`--fs-stat`, 20px/800, font
  `Space Grotesk` — font angka yang sudah dipakai di seluruh app untuk
  nilai uang, mis. `.acc-card-bal`, `.bbm-val`) > angka stat sekunder
  (`--fs-title-sm`, 15px/700). Pola "angka besar untuk metrik utama,
  angka lebih kecil untuk metrik sekunder" ini konsisten dengan
  `dashFiCard`/`lifeBalanceCard` yang sudah ada di Pinned Widgets.
- **2 kolom untuk pemasukan/pengeluaran** — cukup lega di layar mobile
  standar (≥360px), otomatis ditumpuk 1 kolom di layar sangat kecil
  (`max-width:359px`) supaya angka besar (bisa 7+ digit Rupiah) tidak
  terpotong.
- **Padding lega, naik di layar ≥600px** — mengikuti pola `--sp-*` yang
  sudah dipakai proporsional di seluruh app (kartu makin lega di layar
  lebih besar), konsisten dengan breakpoint tablet yang sudah ada di blok
  CSS Dashboard Hub yang sama.

## 5. Validasi

- `node --test tests/*.test.js` → **1235/1235 PASS** (baseline pristine
  terverifikasi ulang di lingkungan ini = 1227/1227 PASS, + 8 test baru
  dari `tests/dashboard-hub-hero.test.js`, 0 gagal/dihapus — lihat
  `CHANGELOG.md`).
- Dashboard lama (`page-dashboard`, Pinned Widgets, grid kategori, Life OS,
  Bottom Navigation) tidak disentuh — diverifikasi dgn `diff` bahwa satu-
  satunya perubahan di `#page-dashboard-hub` adalah blok `.dashhub-hero`
  yang baru; elemen setelahnya (`.dashhub-search-wrap` dst.) persis sama
  seperti sebelumnya.
- Layar kecil: breakpoint `max-width:359px` menumpuk 2 stat jadi 1 kolom;
  diuji visual pada lebar 320px (iPhone SE) — angka tidak terpotong.
- `node scripts/build.js` dijalankan (tanpa mengedit `scripts/build.js`
  sendiri) supaya `app-bundle-a.min.js`/`app-bundle-b.min.js` — file yang
  benar-benar dimuat `index.html`/`app_production.html` — ikut memuat
  `DashboardHubHero`. Build lolos seluruh lint bawaan (u-dnone vs
  style.display, escapeHtml, guard Tesseract) tanpa temuan baru.
