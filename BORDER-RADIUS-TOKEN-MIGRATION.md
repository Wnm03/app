# BORDER-RADIUS TOKEN MIGRATION

**Sprint 2 Tahap 11 — `ROADMAP-v1.1.md` Item 4 (Medium Priority, 🟢
CSS-only)**

Baseline: Tahap 10 selesai (Modal Exit Animation), `node --test`
1375/1375 PASS.

## 1. Audit

Item 2 & 3 (High Priority) sudah selesai/di luar mandat (item 3
menyentuh `FEATURE_REGISTRY`, dilarang eksplisit). Item 1 sudah
selesai (Tahap 9, `THEME-CONTRAST-FIX.md`). Item berikutnya yang valid
dan tidak butuh perubahan JS: **Item 4 — migrasi literal
`border-radius` ke token `var(--r-*)`**.

Audit `styles.css` menemukan literal `border-radius` yang nilainya
identik dengan token yang sudah ada di `:root` (`--r-md:10px`,
`--r-lg:12px`, `--r-2xl:16px`, `--r-pill:20px`):

| Nilai literal | Token tujuan | Jumlah ditemukan |
|---|---|---|
| `16px` | `var(--r-2xl)` | 7 |
| `10px` | `var(--r-md)` | 20 |
| `20px` | `var(--r-pill)` | 8 |
| `12px` | `var(--r-lg)` | 7 |
| **Total** | | **42** |

(Angka di `ROADMAP-v1.1.md`/`KNOWN-ISSUES.md`, ~5/20/8/7, adalah hasil
audit lama sebelum penambahan komponen Sprint 2 Tahap 1–4/10 yang
sudah lebih dulu ditulis pakai token; jumlah aktual literal yang masih
tersisa sekarang 7/20/8/7.)

## 2. Perubahan

Seluruh 42 deklarasi diganti secara **value-preserving** (regex
tersasar hanya pada properti `border-radius: <literal>px`, tidak
menyentuh `border-*-radius` sudut-tunggal seperti `border-bottom-left-radius`
yang nilainya beda/tidak match token). Tidak ada selector, urutan
cascade, properti lain, atau nilai visual akhir yang berubah — hanya
representasi (literal → token).

Termasuk 2 utility class (`.u-r10`, `.u-r12`) yang isinya sendiri
adalah definisi radius — juga dimigrasi ke `var()` untuk konsistensi
penuh dengan pola Tahap 1 (71 deklarasi serupa).

## 3. File berubah

| File | Perubahan |
|---|---|
| `styles.css` | 42 literal `border-radius` → `var(--r-*)` (value-preserving) |
| `tests/dashboard-hub-pinnedwidgets.test.js` | 1 guard test (`.card` base, Tahap 6) diupdate: regex sebelumnya mengecek string literal `border-radius: 16px`, sekarang mengecek `border-radius: var(--r-2xl)` — nilai akhir identik (16px), guard tetap menjaga struktur/nilai `.card` tidak berubah, hanya representasinya yang mengikuti migrasi token. |
| `CHANGELOG.md` | +section Tahap 11 (aditif) |
| `BORDER-RADIUS-TOKEN-MIGRATION.md` | Dokumen ini |

## 4. Tidak diubah

`FEATURE_REGISTRY`, Dashboard V2, Hero Dashboard, business logic
(seluruh `.js` lain), build system, `package.json`, service worker,
`index.html`/`app_production.html` (tidak inline CSS, tidak perlu
disentuh).

## 5. Hasil test

```
node --test
# tests 1376
# pass 1376
# fail 0
```

(Jumlah total test terukur di baseline zip ini 1376, bukan 1375 seperti
disebut di status terakhir — kemungkinan status tersebut mengacu ke
hitungan sebelum satu test lain ditambahkan di commit yang sama dengan
Tahap 10. Tidak ada test ditambah/dihapus pada Tahap 11 ini selain 1
guard yang diupdate isinya, jumlah total tetap 1376.)

## Status

Item #4 `ROADMAP-v1.1.md` selesai. Sisa item Medium/Low priority
(5, 6, 7, 9, 10, 11 — CSS-only) & item 8 (🔴, butuh JS untuk koordinat
ripple) menunggu tahap berikutnya.
