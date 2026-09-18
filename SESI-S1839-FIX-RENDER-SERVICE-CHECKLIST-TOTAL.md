# S1839 — Fix crash Servis.renderServiceChecklist() (modal Edit Catatan Servis)

## Laporan
Screenshot user: modal "Edit Catatan Servis" -> pilih 1+ Kategori Servis ->
langsung muncul overlay debug:
`TypeError: Cannot read properties of undefined (reading 'length') | at
app-bundle-b.min.js?v=1817:34793:44`

## Root cause
`modules/vehicle/servis.js`, `Servis.renderServiceChecklist()`:

```js
const groups = ids.map(id => ServisChecklist.findGroupByMasterCategoryId(id)).filter(Boolean);
```

`ServisChecklist.findGroupByMasterCategoryId()` (servis-checklist.js) selalu
mengembalikan wrapper `{ group, groupIdx }`, bukan grup itu sendiri. Baris
`cards = groups.map(found => { const group = found.group, ... })` tepat di
atasnya sudah benar destructure `found.group` — tapi baris hitung total masih
akses `g.items` langsung:

```js
// SEBELUM (bug)
const total = groups.reduce((n,g) => n + g.items.length, 0);
// SESUDAH (fix)
const total = groups.reduce((n,g) => n + g.group.items.length, 0);
```

`g.items` selalu `undefined` (properti `items` ada di `g.group`, bukan di
`g`), sehingga `.length` throw sebelum satu pun checklist item sempat
dirender — persis error di screenshot.

## Kenapa lolos test sebelumnya
Tidak ada test yang memanggil `Servis.renderServiceChecklist()` lewat DOM
(`servisChecklistPanel`). `servis-checklist-groups-sesi1a.test.js` dan
`service-component-action-sot-s1810.test.js` cuma test API
`ServisChecklist`-nya, bukan fungsi render yang consume hasilnya — gap
coverage genuine, bukan false negative.

## Fix
- `modules/vehicle/servis.js` — 1 baris (`g.items.length` -> `g.group.items.length`).

## Test baru
- `tests/s1839-render-service-checklist-total-fix.test.js` (3 assert):
  1. Load source ASLI `servis-checklist.js` + method body
     `renderServiceChecklist()` dari `servis.js` (extract via string
     parsing, sama pola dengan `servis-riwayat-category-stale-leak-fix.test.js`)
     ke sandbox `vm` dengan DOM stub minimal (`getElementById` -> div ber-
     `innerHTML`).
  2. Set 3 kategori aktif sekaligus (`servis-mesin`, `sistem-pengereman`,
     `roda` — real `masterCategoryId` dari `SERVICE_CHECKLIST_GROUPS`,
     bukan data fiktif), pastikan tidak throw dan total item dihitung benar
     (dihitung ulang dari `ServisChecklist` API, bukan angka hardcode, biar
     ikut jebol kalau data grup berubah nanti).
  3. Regresi guard: rollback fix secara manual -> konfirmasi test ini gagal
     (bukan false-positive pass).
  4. Guard tambahan: 0 kategori dipilih -> jalur placeholder (early return)
     tetap utuh, tidak ikut kena reduce.
- Sengaja TIDAK pakai `loadSource.js` harness (helper itu eksplisit bilang
  "jangan dipakai buat fungsi yang baca/tulis DOM") — dipakai pola manual
  `vm.createContext` + `document.getElementById` stub yang sudah ada
  presedennya di `servis-riwayat-category-stale-leak-fix.test.js`.

## Regression
Full suite: **7000 test, 6998 pass, 2 fail** (99s). 2 fail sama persis
seperti setiap sesi sebelumnya (`carnotes-theme-pro-rollback`,
`delete-manifest-contract-s1780`, keduanya karena `pro-ui-layer.css`
tertinggal di baseline — TIDAK terkait sesi ini). 0 regresi baru.

## Base
Diterapkan di atas `app-main__26` + `patch-S1830-final-scan-import-export-
roundtrip` (versi APP_BUILD_VERSION `s1793-final-hardening-1817`, unchanged
— fix ini tidak menyentuh versi build).
