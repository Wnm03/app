# FIX v1012 — Sesi 348: Audit ulang, 1 modul terlewat (AlokasiAset)

## Konteks

User minta audit ulang setelah Sesi 347 (30 modul) untuk memastikan tidak
ada bug window-expose serupa yang tersisa.

## Metode audit

Scan otomatis SELURUH source tree (285 file `.js`, di luar `tests/`,
`scripts/`, `backups/`, bundle hasil build): cari semua deklarasi top-level
`const X={` / `let X={` / `var X={`, lalu cek dua hal untuk tiap `X`:

1. Apakah ada `data-action="X.xxx"` di manapun (file `.js` atau `.html`)?
2. Apakah ada `window.X=X` atau `window['X']=X` di manapun?

Modul yang lolos kriteria (1) tapi gagal kriteria (2) = kandidat bug.
Juga dicek terpisah: deklarasi dgn nama sama di >1 file (potensi ambiguitas
window-expose).

## Hasil

**1 temuan baru**: `AlokasiAset` di `modules/asset/aset.js`.

File ini punya 10 const top-level (ALOKASI_PRESETS, `AlokasiAset`,
AssetInsight, Aset, Penyusutan, PajakAset, LaporanAset, IDBStore,
PORTFOLIO_LABELS, TimelineW). Audit Sesi 346 menemukan & memperbaiki `Aset`
di file yang sama, tapi tidak mengecek const lain di file itu —
`AlokasiAset` luput.

Root cause sama persis Sesi 345/346/347: 3 tombol chip risiko alokasi aset
(🛡️ Konservatif / ⚖️ Moderat / 🚀 Agresif, di `app_production.html` &
`index.html`) pakai `data-action="AlokasiAset.setRisk"`, di-resolve
dispatcher global lewat `window['AlokasiAset']['setRisk']`. Tanpa
`window.AlokasiAset=AlokasiAset`, ketiga tombol itu gagal diam-diam (tidak
ada error, tidak ada toast) — user klik salah satu chip, tidak terjadi
apa-apa.

**Tidak ada temuan lain.** 30 modul Sesi 347 + 14 modul Sesi 345/346
diverifikasi ulang lewat `docs/FILE-MAP.md` (auto-generated) — semuanya
sudah benar, termasuk `RefAI` & `LifeOSReview` yang sempat butuh perbaikan
tooling insersi di Sesi 347.

## Fix

```js
if (typeof AlokasiAset !== 'undefined') window.AlokasiAset = AlokasiAset;
```

ditambahkan tepat setelah `}` penutup objek `AlokasiAset` (baris 99,
`modules/asset/aset.js`). 0 perubahan logic/routing lain.

## Test

`node --test tests/*.test.js` -> **2402/2402 pass, 0 fail** (2399 lama + 3
baru di `tests/window-expose-audit-s348.test.js`: window.AlokasiAset ada,
window.AlokasiAset === binding lexical, dispatcher lookup
`AlokasiAset.setRisk` berhasil resolve method nyata).

## Build

`node scripts/build.js s348-fix-window-expose-audit-alokasiaset` -> sukses,
`?v=1012`.

## File yang berubah

- `modules/asset/aset.js`
- `tests/window-expose-audit-s348.test.js` — baru, 3 test
- `docs/CHECKPOINT.md` — entri Sesi 348 ditambahkan
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  naik ke `s348-fix-window-expose-audit-alokasiaset`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis, `?v=1011`
  -> `?v=1012`
