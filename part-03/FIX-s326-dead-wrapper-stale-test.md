# FIX — S326 dead wrapper + stale/contradictory test

## Temuan
`action-wrappers.js` masih menyimpan `billActionPayNow(id)` — wrapper dari
patch S326 (ganti tombol Bayar ke wrapper eksplisit). Patch S328 menemukan
wrapper ini bikin tombol Bayar/Riwayat tidak merespons kalau bundle belum
di-rebuild, lalu me-revert `modules-render.js` balik ke handler native
(`markBillPaid`/`openBillHistory`). Tapi wrapper-nya sendiri **tidak
dihapus** — jadi dead code, tidak dipanggil dari mana pun.

Test `tests/s326-click-action-pay-button.test.js` juga tidak diperbarui
setelah revert S328, sehingga isinya kontradiktif dengan dirinya sendiri:
- Test S326 menuntut render pakai `data-action="billActionPayNow"` dan
  melarang `data-action="markBillPaid"` pada tombol Bayar.
- Test S328 (di file yang sama) menuntut sebaliknya: render **harus**
  pakai `data-action="markBillPaid"`.

Akibatnya `node --test` selalu melaporkan 1 test gagal permanen
(`S326 — tombol Bayar ✅ memakai wrapper action yang eksplisit`), walau
perilaku aplikasi di browser sudah benar (S328 sudah mengarah ke handler
native yang benar).

## Fix
- `modules/shared/action-wrappers.js`: hapus fungsi `billActionPayNow()`
  (dead code, tidak pernah dipanggil render manapun).
- `tests/s326-click-action-pay-button.test.js`: hapus 2 assertion S326
  yang usang; sisakan & tambahkan assertion S328 sebagai satu-satunya
  sumber kebenaran untuk jalur klik tombol Bayar/Riwayat, plus 1 test
  baru yang memastikan wrapper mati tadi benar-benar sudah hilang dari
  source (bukan cuma tidak dipakai).

## Verifikasi
`node --test tests/s326-click-action-pay-button.test.js` → 2/2 pass.
Full suite: 2159 test, fail berkurang dari 32 → 31 (persis 1 sesuai
scope fix ini; 31 kegagalan sisanya pre-existing, tidak berkaitan
dengan patch ini, tidak disentuh).

## Catatan (di luar scope, tidak diperbaiki di patch ini)
- `scripts/build.js` mereferensikan `modules/vehicle/vehicle-intelligence.js`
  yang tidak ada di repo app-main ini — build gagal (`ENOENT`). File
  tersebut hanya ada di rilis FULL (branch/rilis vehicle-intelligence
  belum di-merge ke app-main). Bundle **tidak** di-rebuild oleh patch ini.
- 31 test lain yang sudah gagal sebelum patch ini (renderBillArchive,
  VehicleIntelligence ownership filter, saveBillHistoryEdit, dll.) —
  tidak berkaitan dengan tombol Bayar/Riwayat, di luar laporan bug awal.

## File yang berubah
- `modules/shared/action-wrappers.js`
- `tests/s326-click-action-pay-button.test.js`
