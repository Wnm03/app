# KNOWN-ISSUES.md — Keluarga W (Final Release Candidate)

Daftar seluruh isu yang **sengaja belum diperbaiki** di Release
Candidate ini, terkumpul dari audit Tahap 1–8 (terutama `FINAL-QA.md`
Tahap 8). Dokumen ini murni **dokumentasi** — tidak ada perbaikan
dilakukan di sini. Untuk rencana perbaikan, lihat `ROADMAP-v1.1.md`.

Setiap isu ditandai kategori risiko perbaikannya:
- 🟢 **CSS-only, risiko rendah** — value-preserving, aman dikerjakan kapan saja.
- 🟡 **CSS/token warna, risiko sedang** — perlu review visual lintas tema sebelum dieksekusi.
- 🔴 **Butuh perubahan JavaScript** — di luar batas seluruh program modernisasi UI Tahap 1–8 (yang eksplisit "tanpa mengubah JS").

---

## 1. Accessibility

### 1.1 Kontras warna `--text3` di bawah standar WCAG AA 🟡
Diukur pada 4 tema sampel (dark, light, ocean, mono) memakai formula
relative luminance resmi WCAG: rasio kontras `--text3` terhadap
`--bg`/`--surface2` berkisar **2.45–3.8:1**, di bawah ambang AA untuk
teks normal (4.5:1). Masih di atas 3:1 (ambang teks besar) di sebagian
tema, tapi `--text3` sering dipakai untuk teks kecil (caption, label
sekunder pada `.nav-item`, dll.), sehingga berisiko sulit dibaca bagi
pengguna low-vision.

**Kenapa belum diperbaiki**: menaikkan luminance `--text3` berarti
mengubah nilai warna di 10 blok tema sekaligus — butuh review visual
per tema untuk memastikan tetap harmonis dengan palet masing-masing,
di luar scope "tanpa redesign" Tahap 8.

### 1.2 ✅ SELESAI (Sprint 2 Tahap 13) — Touch target sekunder di bawah rekomendasi 44×44px 🟢
Diverifikasi ulang (Sesi 279): `styles.css` sudah punya `.chip-btn{padding:
11px 14px}`/`.qs-btn{padding:12px 12px}` (naik dari 6px/7px semula) —
dokumen ini basi, catatan "belum diperbaiki" di bawah tidak lagi sesuai
kode. Lihat `TOUCH-TARGET-PADDING.md` untuk detail perubahan asli.

---

## 2. Consistency (CSS)

### 2.1 Literal `border-radius` yang tumpang tindih dengan token 🟢 SEBAGIAN SELESAI (Sesi 277)
~~Ditemukan literal `border-radius: 16px` (5×), `10px` (20×), `20px`
(8×), `12px` (7×) yang nilainya identik dengan token yang sudah ada~~ —
audit ulang Sesi 277 menemukan sebagian besar literal generasi
sebelumnya SUDAH ditoken-kan. Sisa 10 literal yang PERSIS sama dengan
nilai token (`8px`→`--r-xs`, `14px`→`--r-md`, `18px`→`--r-xl`,
`24px`→`--r-pill`, tersebar di `.wh-day-box-status`, `.u-r8`,
`.cat-emoji`, `.trs-tag-btn`, `.trs-biaya-wrap input`, `.gaji-result`,
`.import-zone`, `.trs-summary-bar`, `.kasir-receipt`, `.tgl-track`,
`.trs-calc-card`) sudah diganti jadi `var(--token)`, 0 perubahan nilai
piksel/tampilan. Literal sisa (`6px`, `3px`, `2px`, `4px`, `5px`,
`22px`, `26px`, `99px`) **sengaja dibiarkan** — tidak ada token dengan
nilai identik saat ini, menambah token baru untuk nilai-nilai ini
adalah keputusan desain terpisah (di luar cakupan "migrasi literal ke
token yang SUDAH ADA").

### 2.2 `box-shadow` tidak memakai token 🟢 SELESAI (diverifikasi ulang Sesi 277)
Diverifikasi ulang: seluruh `box-shadow` di file ini sudah memakai
`var(--shadow-card, ...)`/token sejenis dengan fallback literal (pola
CSS custom property standar, bukan "literal tanpa token"). Sisa 1
literal murni (`.vehicle-scanner-frame`, overlay dim kamera scan
`0 0 0 2000px rgba(...)`) BUKAN kandidat migrasi — bukan elevation
shadow, tidak ada token `--shadow-*` dengan bentuk/nilai yang sama.

### 2.3 Durasi `transition` tidak konsisten 🟢
≥15 variasi durasi/easing transition (`all 0.2s`, `.2s`, `transform
.2s ease`, `width .4s/.5s/.6s`, dll.) yang tidak memakai token motion
Tahap 7 (`--dur-*`/`--ease-*`).

**Diaudit ulang Sesi 277**: 12 literal durasi tersisa (`0.3s`, `0.6s`,
`.12s`, `0.5s`, `.4s`, `.22s`, dll., terutama animasi lebar progress
bar/toggle) — **sengaja TIDAK diganti**, karena tidak ada nilai token
`--dur-*` (100/150/200/250ms) yang identik; mengganti ke token
terdekat akan MENGUBAH durasi animasi sungguhan (bukan lagi
value-preserving), beda kasus dari 2.1/2.2 di atas. Tetap butuh
keputusan desain (token baru atau ubah durasi) sebelum dieksekusi.

### 2.4 Literal `font-size` kecil belum ditoken-kan 🟢 SEBAGIAN SELESAI (Sesi 277, 280)
Beberapa ukuran font kecil (11px, 12px, 13px, 8.5px pada `.nav-item`)
ditulis literal, meski nilainya konsisten dengan skala `--fs-*` yang
sudah ada.

**Sesi 277**: 8 literal yang PERSIS sama dengan token (`11px`→
`--fs-caption`, `12px`→`--fs-label`, `13px`→`--fs-body`, di
`.page-breadcrumb`, `.findash-card-sub`, `.tk-num`, `.tk-note`,
`.dashhub-fav-star`, `.dashhub-explore-link`, `.tk-title`, `.tk-mark`)
sudah diganti jadi `var(--token)`.

**Sesi 280**: lanjutan migrasi ke skala menengah — 39 literal `14px`/
`15px`/`16px`/`17px`/`18px`/`20px` yang PERSIS sama dengan token
(`--fs-body-lg`/`--fs-title-sm`/`--fs-icon`/`--fs-title`/
`--fs-icon-lg`/`--fs-stat`) diganti jadi `var(--token)` di seluruh
`styles.css` (0 perubahan nilai piksel/tampilan, token tidak
di-override per tema).

`.nav-item` (`8.5px`) **sengaja TIDAK diganti** — tidak ada token
`--fs-*` bernilai 8.5px persis, jadi mengganti berarti mengubah ukuran
font sungguhan, bukan migrasi value-preserving. Literal sisa lain
(9.5px, 10px, 10.5px, 11.5px, 12.5px, 13.5px, 14.5px, 19px, 22px,
24px, 26px, 30px, 36px, 40px, 42px, 52px, dsb.) juga sengaja tidak
disentuh — tidak ada token `--fs-*` bernilai identik; migrasi nilai
ini berarti mengubah ukuran font sungguhan, di luar cakupan sempit
"match persis" yang disepakati.

**Kenapa 2.1/2.2/2.4 kini "sebagian/selesai" tapi 2.3 masih terbuka**:
2.1/2.2/2.4 punya subset literal yang NILAINYA PERSIS SAMA dengan
token yang sudah ada — migrasi itu 100% value-preserving (var()
resolve ke angka piksel identik di SEMUA tema, tokennya didefinisikan
sekali di `:root`, tidak di-override per tema), jadi aman dieksekusi
langsung tanpa review visual. 2.3 tidak punya subset yang cocok
persis — durasi animasi asli (300–600ms) semuanya lebih panjang dari
skala token yang ada (100–250ms), sehingga mengganti = mengubah
kecepatan animasi asli, bukan cuma migrasi.

---

## 3. Responsive / Layout

### 3.1 ✅ SELESAI (Sprint 2 Tahap 15) — Container `max-width` belum konsisten di layar besar 🟢
Diverifikasi ulang (Sesi 279): `styles.css` sudah punya rule aditif
`@media (min-width:1024px){ .page{max-width:1080px;margin-left:auto;
margin-right:auto;} }` — dokumen ini basi, catatan "belum diperbaiki"
di bawah tidak lagi sesuai kode. Lihat `PAGE-CONTAINER-MAXWIDTH.md`
untuk detail perubahan asli.

---

## 4. Icon

### 4.1 Emoji sebagai data `icon:` di JavaScript 🔴 SEBAGIAN SELESAI (Sesi 281)
`dashboard-hub-registry.js` (FEATURE_REGISTRY) dan beberapa file lain
menyimpan ikon fitur sebagai emoji literal di field data `icon:`,
bukan SVG konsisten seperti ikon lain di aplikasi.

**Kenapa sebelumnya belum diperbaiki**: field ini ada di JavaScript
(data), dan mengubahnya berarti mengubah JavaScript — dilarang
eksplisit sejak Tahap 6 (program modernisasi UI Tahap 1–8 CSS-only).

**Sesi 281**: user eksplisit mengizinkan perubahan JS untuk item ini.
`FEATURE_REGISTRY` sendiri sudah lama teratasi lewat layer render
`FeatureIcons.render()` (`modules/shared/feature-icons.js`, lihat
`ROADMAP-v1.1.md` #3) — TIDAK diubah lagi sesi ini. Yang dikerjakan:
1 titik render yang tadinya sengaja dikecualikan dari scope awal
(dicatat di `ROADMAP-v1.1.md` #3: *"Emoji lain di luar FEATURE_REGISTRY
(widget AI/LifeOS Areas) sengaja tidak disentuh"*) — `LifeOSAreas.render()`
(`lifeos/ui/areas.js`) sekarang juga pakai `FeatureIcons.render()`,
pola sama persis dgn `dashboard-hub.js`. Data `icon:` sumbernya
`LIFEOS_AREAS` (`lifeos-registry.js`) — statis di source, bukan input
user, aman dipakai tanpa `escapeHtml` (sama seperti FEATURE_REGISTRY).
2 mapping SVG baru ditambah ke `FeatureIcons._MAP` (`👨‍👩‍👧` family,
`🏃` health — sebelumnya belum ada, 4/6 emoji LIFEOS_AREAS lain sudah
lama terpetakan). Widget AI (`feature-insights.js`) **sengaja TIDAK
disentuh** — emoji di sana adalah glyph inline di tengah baris teks
(bukan tile ikon tersendiri), pola berbeda yang butuh keputusan desain
terpisah soal bagaimana SVG inline diselaraskan dgn teks.

Sisa emoji `icon:` di luar 2 titik ini (AI widget, tempat lain yang
belum diaudit) masih terbuka — dicatat sbg kandidat lanjutan, bukan
ditebak sesi ini.

---

## 5. Motion

### 5.1 ✅ SELESAI (Tahap 10) — Exit/closing animation untuk overlay & bottom sheet
`.overlay` sebelumnya disembunyikan lewat `display:none` instan
setelah class `.open` dilepas — animasi keluar sekarang ada, lewat
class `.closing` (`styles.css`: `overlayOut`/`slideDown`) yang
ditambah `closeModal()` di `modal-navigasi.js` sebelum melepas `.open`,
ditunda pakai `animationend`+fallback `setTimeout`. Lihat
`MODAL-EXIT-ANIMATION.md`.

### 5.2 ✅ SELESAI — Ripple berbasis koordinat sentuh asli
Sebelumnya ripple Tahap 7 selalu berupa pulsa dari tengah elemen
(CSS-only). Sekarang posisi ripple mengikuti titik sentuh/klik asli
lewat `modules/shared/ripple-position.js` yang men-set custom property
`--ripple-x`/`--ripple-y` sebelum `:active` menyalakan animasi. Lihat
`ROADMAP-v1.1.md` item #8.

### 5.3 ✅ SELESAI (Sesi 278) — Hover/elevation tap-target sekunder
Diverifikasi ulang: `.stat-box.clickable`, `.cobek-stat.clickable`,
`.bbm-stat.clickable`, `.budget-sum-box.clickable`, `.budget-item.
clickable` **sudah** dapat hover elevation sejak Sprint 2 Tahap 16
(`--shadow-hover-sm`, sama seperti `.card:hover`) — dokumen ini basi.
Satu komponen sejenis yang kelewat waktu itu, `.shop-stat.clickable`,
ditambah hover Sesi 278 (`background:var(--surface3)`, disamakan
dgn `:active`-nya sendiri, bukan pola baru).

---

## Ringkasan Jumlah Isu

| Kategori risiko | Jumlah | Selesai/Sebagian |
|---|---|---|
| 🟢 CSS-only, risiko rendah | 6 | 6 (1.2, 2.1\*, 2.2, 2.4\*, 3.1, 5.3) — \*sebagian (subset match-persis saja, lihat detail per-item) |
| 🟡 Token warna, risiko sedang | 1 | 0 |
| 🔴 Butuh JavaScript | 3 | 2\\* (4.1 sebagian, 5.2) — \\*4.1 hanya LifeOS Areas, AI widget & lainnya masih terbuka |

Status terkini & rencana sisa item: lihat `ROADMAP-v1.1.md`.

*(Sesi 279: §1.2 & §3.1 disinkronkan dari "belum diperbaiki" jadi ✅
SELESAI — kode sudah lama benar, dokumen ini yang basi. Tidak ada
perubahan kode.)*

Semua item di atas dipetakan ke prioritas backlog di `ROADMAP-v1.1.md`.
