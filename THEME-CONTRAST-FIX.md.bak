# THEME CONTRAST FIX
**Tahap 9 — Perbaikan Kontras `--text3` (ROADMAP-v1.1.md Item 1, High Priority)**

Baseline: Sprint 2 Tahap 4 selesai (Reports 2.0 FAB), `node --test`
**1336/1336 PASS**.

Cakupan: **HANYA** perbaikan kontras warna token `--text3` di seluruh
tema, agar memenuhi WCAG AA (≥4.5:1 untuk teks normal) terhadap
`--bg` dan `--surface2`. Item ini diambil dari `ROADMAP-v1.1.md` §High
Priority #1 (sumber: `KNOWN-ISSUES.md` §1.1), satu-satunya item pada
roadmap yang berstatus siap kerja (🟡, CSS-token-only, tidak butuh
perubahan JS) tanpa menunggu instruksi tambahan — berbeda dari Sprint 2
Tahap 5+ (redesign kartu/grafik Laporan) yang scope-nya eksplisit
"menunggu instruksi" di `REPORTS-2.0.md`.

---

## 1. Audit sebelum implementasi

`styles.css` mendefinisikan 9 tema (`dark`, `ocean`, `light`, `stone`,
`slate`, `mono`, `sand`, `ink`, `sage`) via selector
`[data-theme="..."]`, masing-masing dengan token `--text3` terpisah.
Diukur dengan rumus kontras WCAG (relative luminance), seluruh 9 tema
berada di bawah ambang 4.5:1 untuk teks normal (rentang aktual 2.21–
3.80:1 terhadap `--bg`/`--surface2`), sesuai temuan `KNOWN-ISSUES.md`.

*(Catatan: `ROADMAP-v1.1.md` menyebut "10 tema warna" — audit ulang di
`styles.css` hanya menemukan 9 blok `[data-theme]`; kemungkinan angka
di dokumen sumber sedikit tidak akurat. Seluruh 9 tema yang ada di
repository sudah diperbaiki, tidak ada tema yang terlewat.)*

## 2. Pendekatan

Untuk tiap tema, nilai `--text3` di-adjust **hanya pada lightness**
(HSL) — hue & saturation dipertahankan 100% agar warna tetap harmonis
dengan palet masing-masing tema (sesuai catatan roadmap "perlu review
visual per tema agar tetap harmonis"). Arah adjust: dinaikkan
(lightness) untuk tema gelap, diturunkan untuk tema terang. Target:
kontras **minimum** dari `--text3` vs `--bg` **dan** vs `--surface2`
mencapai ≥4.5:1 (dipilih titik lightness paling dekat ke nilai asli
yang tetap memenuhi kedua syarat, lewat binary search, supaya
perubahan visual seminimal mungkin).

| Tema | `--text3` lama | `--text3` baru | Kontras vs `--bg` | Kontras vs `--surface2` |
|---|---|---|---|---|
| dark | `#69698b` | `#81819f` | 4.53:1 | ≥4.5:1 |
| ocean | `#496db6` | `#6886c2` | 4.52:1 | ≥4.5:1 |
| light | `#8282c2` | `#6565b4` | 4.55:1 | ≥4.5:1 |
| stone | `#a39c8c` | `#746c5c` | 4.52:1 | ≥4.5:1 |
| slate | `#6f6f76` | `#909096` | 4.51:1 | ≥4.5:1 |
| mono | `#9c9c9c` | `#6e6e6e` | 4.55:1 | ≥4.5:1 |
| sand | `#b0a693` | `#756b56` | 4.50:1 | ≥4.5:1 |
| ink | `#5c5c5c` | `#848484` | 4.56:1 | ≥4.5:1 |
| sage | `#a3ab99` | `#68705c` | 4.50:1 | ≥4.5:1 |

Seluruh nilai lain per tema (`--bg`, `--surface`, `--surface2..4`,
`--accent*`, `--text`, `--text2`, `--border*`, `--header-bg`) **tidak
disentuh sama sekali** — perubahan murni 1 value per baris tema (9
baris total di `styles.css`), value-preserving pada semua token lain.

## 3. File berubah

- **`styles.css`** — 9 baris diubah (hanya value hex `--text3` di tiap
  blok `[data-theme="..."]`), tidak ada selector/class baru.
- **`tests/theme-text3-contrast.test.js`** — 30 test struktural baru:
  parsing token warna langsung dari `styles.css` (bukan hardcode
  independen) + hitung ulang rasio kontras WCAG untuk tiap tema vs
  `--bg` dan `--surface2`, plus guard tidak ada class baru & guard
  token lain (`--text2`, `--accent`) tetap utuh per tema.
- **`THEME-CONTRAST-FIX.md`** — dokumentasi ini.
- **`CHANGELOG.md`** — entry baru (aditif).

Total: **4 file** (di bawah batas maksimal 5 file kode per tahap).

## 4. Tidak diubah

- Hero Dashboard, Dashboard, Dashboard Analytics, Halaman Keuangan+FAB,
  Shop+FAB, Car Notes+FAB, tab Laporan+FAB — tidak disentuh sama
  sekali (perubahan murni token warna, tidak menyentuh markup/JS
  halaman manapun).
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `dashboard-hub.js`,
  ADR-001, business logic, routing, database, service worker, build
  system, `package.json`.
- `index.html`, `app_production.html` — tidak disentuh (tidak ada CSS
  inline terkait `--text3` di kedua file).
- Item lain di `ROADMAP-v1.1.md` (border-radius token, shadow token,
  transition token, dll.) — di luar cakupan tahap ini, menunggu tahap
  berikutnya.

## 5. Hasil test

```
node --test
# tests 1366
# pass 1366
# fail 0
```

Baseline (1336/1336, akhir Sprint 2 Tahap 4) tetap 100% lulus tanpa
perubahan; 30 test baru (kontras WCAG per tema) seluruhnya PASS.

## 6. Status

Item #1 `ROADMAP-v1.1.md` (kontras `--text3`) selesai. Sesuai
instruksi, pengerjaan **berhenti di sini** — tidak melanjutkan ke item
roadmap berikutnya.
