# FIX v1139 -> v1141 (s425) — Hapus risiko duplikasi `index.html` / `app_production.html`

## Konteks

Rencana perbaikan (item ke-3, setelah S423 lint-gate window.expose & S424
release gate lint/esbuild): `index.html` dan `app_production.html` adalah
dua file 282KB yang sebelumnya berisiko drift kalau salah satunya diedit
tanpa yang lain diikutkan — dan tidak ada penanda apapun di file itu
sendiri yang bilang "jangan edit langsung".

**Temuan penting sebelum implementasi**: `scripts/build.js` SUDAH lebih
dulu (sejak sebelum sesi ini, tidak terdokumentasi di FIX-*.md manapun)
menulis ulang `app_production.html` jadi salinan persis `index.html` di
akhir tiap build — jadi mekanisme "generate otomatis saat build" yang
diminta rencana ini **sudah ada**. Yang betul-betul hilang cuma 2 hal:
(1) tidak ada penanda di file `app_production.html` sendiri yang bilang
itu file auto-generated (predisposisi orang tanpa sadar edit file salah),
dan (2) tidak ada gate yang BLOCK rilis kalau ternyata dua file itu
sempat drift (mis. lupa jalankan build setelah edit HTML). Sesi ini fokus
menutup 2 celah itu — BUKAN mengganti mekanisme generate yang sudah ada.

## Perubahan

### 1. `scripts/build.js` — sisipkan penanda AUTO-GENERATED

Saat menulis ulang `app_production.html`, sekarang disisipkan komentar
HTML tepat setelah tag `<head>` pembuka:

```html
<!-- AUTO-GENERATED oleh scripts/build.js dari index.html — JANGAN edit file ini langsung.
     Edit index.html, lalu jalankan "node scripts/build.js" (file ini disalin ulang otomatis). -->
```

`index.html` sendiri TIDAK disentuh/ditambah apapun — tetap bersih, tetap
satu-satunya sumber kebenaran yang diedit manual.

### 2. `scripts/verify-release-ready.js` — Gate 3 baru: `html-sync`

Fungsi baru `checkHtmlSync()`: baca `index.html` & `app_production.html`,
hitung ulang "harusnya seperti apa" `app_production.html` (index.html +
marker di atas), bandingkan dgn isi sungguhan.

| Status | Kondisi |
|---|---|
| `synced` | `app_production.html` = `index.html` + marker persis |
| `drifted` | Beda (lupa build ulang, atau `app_production.html` diedit manual) |
| `missing` | Salah satu file tidak ada |

Beda dari Gate 1/2 (lint/minify): Gate 3 ini **TIDAK PUNYA opsi
override sama sekali** — perbaikannya selalu sama persis
(`node scripts/build.js`), jadi tidak ada alasan valid untuk melewatinya.

Divalidasi manual: file `app_production.html` sengaja ditambah 1 baris
iseng lewat `bash_tool`, dijalankan ulang gate -> **terbukti BLOCK**
("app_production.html BEDA dari index.html"), lalu file dikembalikan ke
kondisi semula & gate lolos lagi.

### 3. Dokumentasi

- `docs/ZIP_RULES.md` — Release Gate sekarang 3 poin (bukan 2), + section
  baru "index.html vs app_production.html" yang menjelaskan aturannya.
- `docs/SESSION_RULES.md` — catatan singkat: Gate 3 tidak perlu dicatat
  status konkret seperti lint/minify (karena tidak ada override), cukup
  pastikan lolos.

## Test

`node --test tests/*.test.js` -> **2868/2868 pass, 0 fail** (2864 lama +
4 baru di `tests/verify-release-ready-s425-html-sync.test.js`:
`checkHtmlSync()` pada repo asli -> `synced`; regression guard marker
teks sinkron antara `build.js` & `verify-release-ready.js`; simulasi
drift lewat replikasi logika; guard `fs.existsSync` sebelum baca file).

Test lama yang membaca `index.html`/`app_production.html` langsung
(`tests/boot-pin-idempotent.test.js`, dan 2 test lain yg mengekstrak
struktur HTML) tetap **pass tanpa perubahan** — komentar tambahan di
`<head>` tidak mengganggu ekstraksi script/struktur yang dipakai test
tsb (diverifikasi lewat run penuh, bukan asumsi).

## Release Gate

`node scripts/verify-release-ready.js`:
- **Lint**: eslint tidak tersedia di sandbox ini (npm error 403, tidak
  ada akses jaringan) -> di-override manual (`CONFIRM_LINT_UNAVAILABLE_REASON`).
  Perubahan sesi ini kecil & terlokalisir, diverifikasi manual (2868/2868
  test pass). Detail lengkap di `docs/RELEASE-GATE-LOG.md`, timestamp
  `2026-08-06T21:07:22.954Z`.
- **Minify**: esbuild tidak terpasang (sandbox sama), bundle unminified
  tapi sintaks valid -> di-override manual (`CONFIRM_UNMINIFIED_REASON`),
  sama seperti kondisi s424. Dicatat di log yang sama.
- **html-sync** (BARU sesi ini): **lolos tanpa override** —
  `app_production.html` sinkron dgn `index.html` setelah build.

## Build

`node scripts/build.js s425-dedup-html-source-of-truth` -> sukses, sintaks
kedua bundle valid, versi `v1139` -> `v1141` (build dijalankan 2x selama
sesi: 1x sebelum edit dokumentasi untuk validasi awal marker, 1x final
setelah dokumentasi selesai — keduanya pakai string versi yang sama,
angka build auto-increment di tiap run sesuai perilaku `build.js` yang
sudah ada).

## File yang berubah

- `scripts/build.js` — sisip marker AUTO-GENERATED saat menulis
  `app_production.html`
- `scripts/verify-release-ready.js` — `checkHtmlSync()` baru + Gate 3,
  export ditambah
- `tests/verify-release-ready-s425-html-sync.test.js` — BARU, 4 test
- `docs/ZIP_RULES.md` — Release Gate poin 3 + section baru
- `docs/SESSION_RULES.md` — catatan Gate 3 (tanpa override)
- `docs/RELEASE-GATE-LOG.md` — 1 entri baru (append, otomatis)
- Konstanta versi (`APP_BUILD_VERSION` dkk di 8 file source yang sama
  dengan s424) naik ke `s425-dedup-html-source-of-truth`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis,
  `?v=1139` -> `?v=1141`
- `backups/` — 4 file backup bundle lama (2 dari build awal sesi ini +
  2 dari build final, otomatis oleh `build.js`)

## Belum dikerjakan / batasan yang diketahui

- Mekanisme "generate otomatis" itu sendiri (build.js overwrite
  `app_production.html` dari `index.html`) **sudah ada sebelum sesi ini**
  dan tidak terdokumentasi FIX-*.md kapan pertama kali ditambahkan — jadi
  sesi ini murni menutup 2 celah (penanda + gate), bukan membangun dari
  nol. Kalau suatu saat perlu tahu kapan mekanisme dasarnya ditambahkan,
  belum ada jejaknya.
- Opsi lain yang disebut rencana awal ("atau symlink") TIDAK dipakai —
  symlink tidak cocok dgn alur ZIP-per-sesi (ZIP umumnya tidak
  mempertahankan symlink dgn baik lintas OS/tool ekstraksi), jadi generate
  ulang penuh saat build (pendekatan yang sudah ada) tetap dipertahankan.
- **Sesi 426** (rencana berikutnya): smoke test E2E Playwright/Puppeteer
  — TIDAK disentuh sesi ini, di luar scope, dan kemungkinan butuh
  instalasi browser (network) yang sama-sama tidak tersedia di sandbox
  ini seperti eslint/esbuild.
