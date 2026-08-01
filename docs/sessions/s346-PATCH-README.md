# Patch s346 — Audit lanjutan: 13 modul lain juga hilang `window.Owner`

Lanjutan Sesi 345 (car-notes.js BBM/Servis/Torsi). 13 modul dikonfirmasi
punya pola bug yang sama — `const Owner={...}` top-level tanpa
`window.Owner=Owner` — sehingga semua tombol dengan
`data-action="Owner.xxx"` di modul-modul ini gagal diam-diam:

| Modul | File |
|---|---|
| `Budget` | `budget.js` |
| `Aset` | `modules/asset/aset.js` |
| `Kasir` | `modules/business/kasir.js` |
| `Payroll` | `modules/business/payroll-absensi.js` |
| `EduFund` | `modules/finance/edukasi-dana.js` |
| `LinkTx` | `modules/finance/linktx.js` |
| `WorthIt` | `modules/finance/worthit.js` |
| `LifeBalance` | `modules/home/hidup-seimbang.js` |
| `Refleksi` | `modules/home/refleksi-selfcare.js` |
| `Pensiun` | `modules/shared/modules-calc.js` |
| `Etalase` | `modules/shop/cobek-etalase.js` |
| `Order` | `modules/shop/cobek-order.js` |
| `Sparepart` | `modules/vehicle/sparepart-servis.js` |

**Fix**: tiap file di atas dapat satu baris tambahan tepat setelah
deklarasi objeknya selesai, mis. `if (typeof Budget !== 'undefined')
window.Budget = Budget;`. 0 perubahan logic/routing lain. Detail
root-cause & catatan teknis insersi (2 file butuh koreksi manual):
`FIX-v1010-s346-window-expose-audit-13-modules.md`.

File lain dalam patch ini:
- `tests/window-expose-audit-s346.test.js` — 39 test regresi baru (13
  modul × 3 assertion).
- `docs/CHECKPOINT.md` — entri Sesi 346 ditambahkan di atas (Current
  Session).
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js` (juga berisi fix `Pensiun`),
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`
  — konstanta versi naik (`s345-...` -> `s346-fix-window-expose-audit-13-modules`).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis
  (`node scripts/build.js`), `?v=1009` -> `?v=1010`.

Cara pakai: timpa semua file di atas di project kerja Anda dengan versi di
patch ini (struktur folder sama persis, termasuk yang bertumpuk dgn patch
s345 sebelumnya), lalu jalankan `npm test` untuk verifikasi (harus
2309/2309 pass). Tidak perlu jalankan `node scripts/build.js` lagi —
bundle & versi `?v=` di patch ini sudah hasil build final.

## Test

`node --test tests/*.test.js` -> **2309/2309 pass, 0 fail** (2270 lama +
39 baru), 2x (sebelum & sesudah build).

## Build

`node scripts/build.js s346-fix-window-expose-audit-13-modules` -> sukses,
`?v=1010`.
