# FIX v1137 -> v1138 (s423) — Lint gate otomatis untuk `window.expose`

## Konteks

Bug class "modul dipakai lewat `data-action="X.method"` tapi tidak pernah
`window.X=X`" sudah kejadian **4 kali** (Sesi 345, 346, 347, 348), selalu
ketemu lewat audit MANUAL setelah user melapor tombol tidak berfungsi.
Root cause selalu sama: `const X={...}` top-level cuma bikin binding
lexical-scope, BUKAN properti `window` — sementara dispatcher klik global
(`features-helpers-global-security.js`) selalu resolve `data-action` lewat
`window[X][method]`. Tanpa expose, tombolnya gagal **diam-diam** (tidak
ada error console, tidak ada toast).

Sesi ini menutup celah itu secara permanen: gate otomatis, bukan audit
manual berikutnya yang harus diingat-ingat.

## Perubahan

### 1. `scripts/verify-window-expose.js` (BARU)

Script node kecil, 3 langkah:

1. Scan semua file `.js` source (di luar `tests/`, `scripts/`, `backups/`,
   bundle `.min.js`) untuk deklarasi objek top-level (`const X={` dsb.),
   pakai `maskNonTopLevel()` yang sudah ada & teruji di
   `scripts/collect-app-globals.js` (dipakai ulang, bukan implementasi
   parsing baru yang bisa beda hasil).
2. Scan semua file `.js`+`.html` untuk `data-action="X.method"`.
3. Scan semua file `.js` untuk pola `window.X=X` / `window['X']=X` /
   `window["X"]=X`.

Modul yang lolos kriteria (2) tapi gagal kriteria (3) = FAIL, exit 1
dengan daftar nama modul + file deklarasi + baris fix yang perlu
ditambahkan.

**Cakupan file SENGAJA lebih luas dari `GROUP_A`/`GROUP_B`** (daftar bundle
di `build.js`): `modules/business/sewakios.js` dan
`modules/home/renovasi.js` sengaja dikeluarkan dari bundle (lazy-load),
tapi tetap dimuat runtime & tetap butuh window-expose kalau dipakai
`data-action` — kalau scan cuma ikut daftar bundle, 2 file itu jadi blind
spot baru. Scriptnya jalan file-walk sendiri (298 file `.js`+`.html`),
bukan reuse `getAllSourceFiles()` dari `collect-app-globals.js`.

### 2. `package.json`

```json
"verify-window-expose": "node scripts/verify-window-expose.js",
"check": "npm run lint && npm run verify-window-expose && npm test && npm run build",
```

Ditaruh **sebelum** `npm test` (gagal cepat, sebelum test suite yang lebih
lambat jalan) dan sebelum `npm run build`. Sengaja TIDAK dipanggil dari
`build.js` sendiri — tanggung jawab dipisah: `build.js` compose bundle,
`check` yang jadi gate kualitas gabungan.

### 3. `tests/verify-window-expose-s423.test.js` (BARU, 6 test)

- Regression guard: `verify()` dijalankan terhadap codebase NYATA, harus
  0 failures — kalau sesi masa depan lupa expose modul baru, test ini
  merah duluan sebelum sempat build/rilis.
- Ambang minimal modul yang diperiksa (>=50) — jaga-jaga kalau scan-nya
  sendiri rusak (mis. balik 0 karena path salah) tidak lolos diam-diam
  sebagai "0 failures".
- Unit test 3 fungsi penyusun (`findTopLevelObjectDecls`,
  `findDataActionPrefixes`, `hasWindowExpose`) pakai file sementara di
  `os.tmpdir()`.
- 1 test end-to-end: bikin fixture `.js`+`.html` sementara langsung di
  root repo (nama `__tmp_s423_fixture_*`, dibersihkan di `finally`) yang
  meniru persis pola bug s345-s348 (dipakai `data-action`, tidak
  di-expose) — konfirmasi `verify()` benar-benar mendeteksinya.

## Acceptance criteria (Sesi 423)

**Dijalankan di codebase sekarang dulu untuk pastikan 0 false-positive**,
sesuai instruksi. Hasil:

```
✓ verify-window-expose: OK — 62 modul dipakai lewat data-action,
  semuanya sudah window-expose (dari 350 deklarasi objek top-level,
  299 file di-scan).
```

**0 false-positive** terhadap seluruh modul yang sudah ada (62 modul yang
benar-benar dipakai lewat `data-action`, dari 350 deklarasi objek
top-level total). Diverifikasi juga negative-case: menghapus sementara
baris `window.AlokasiAset=AlokasiAset;` (`modules/asset/aset.js` baris
100) membuat gate langsung gagal (exit 1) dengan pesan yang tepat,
mengonfirmasi gate ini benar-benar mendeteksi regresi, bukan cuma selalu
lolos. Baris dikembalikan setelah verifikasi.

## Test

`node --test tests/*.test.js` -> **2857/2857 pass, 0 fail** (2851 lama +
6 baru di `tests/verify-window-expose-s423.test.js`).

## Build

`node scripts/build.js s423-window-expose-lint-gate` -> sukses, sintaks
kedua bundle valid, versi `v1137` -> `v1138`. esbuild tidak tersedia di
environment ini, bundle UNMINIFIED (sama seperti build s422i sebelumnya) —
`npm run lint` (ESLint) juga tidak bisa dijalankan di sandbox ini (paket
tidak terpasang, tidak ada akses jaringan) sehingga TIDAK dijalankan
sesi ini; dicatat di sini apa adanya, bukan diklaim lolos.

## File yang berubah

- `scripts/verify-window-expose.js` — BARU
- `package.json` — script `verify-window-expose` baru + `check` diperbarui
- `tests/verify-window-expose-s423.test.js` — BARU, 6 test
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `modules/business/shop-data-io-api.js`,
  `chat-action-handlers.js`, `modules/shared/multi-owner-engine.js`,
  `modules/shared/features-helpers-global-security.js`,
  `modules/shop/generic/product-repository.js` — konstanta versi naik ke
  `s423-window-expose-lint-gate`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis, `?v=1137`
  -> `?v=1138`
- `backups/` — 2 file backup bundle lama dari build s422i sebelumnya
  (otomatis oleh `build.js`, bukan perubahan manual)

## Belum dikerjakan (di luar scope Sesi 423)

- **Sesi 424** (rencana berikutnya): keandalan `npm run lint`/esbuild di
  sandbox — sesi ini TIDAK mengubah itu, cuma mencatat statusnya apa
  adanya di FIX ini (bukan diam-diam dilewati).
- Gate ini cuma menangkap pola `data-action="X.method"` literal (quote
  langsung). Kalau ada `data-action` yang dirakit dinamis lewat template
  string (mis. `` `${prefix}.method` ``), TIDAK terdeteksi gate ini —
  sejauh audit s345-s348 sebelumnya, pola ini belum pernah ditemukan di
  codebase, tapi dicatat di sini sebagai batasan yang diketahui, bukan
  diklaim tercakup 100%.
