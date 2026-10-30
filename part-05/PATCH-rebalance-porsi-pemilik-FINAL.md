# Patch: Auto-Rebalance Porsi Pemilik — FINAL (gap markup ditutup)

Lanjutan dari `PATCH-rebalance-porsi-pemilik.md` (sesi s600–s601). Sesi ini
menutup satu-satunya item "Belum dikerjakan" yang tersisa:

## Yang diperbaiki sesi ini

**Markup `assetOwnersModal` (`modules/shared/modals.js`) disamakan dgn id
baru fitur Auto-Rebalance di `aset.js`.**

`Aset._renderRebalancePanel()` (aset.js) sudah di-refactor pakai pola box
STATIS `document.getElementById('assetOwnersRebalanceBox')` (tanpa
fallback `insertAdjacentElement`) — beda dari pola self-healing yang masih
dipakai `InvestmentUI`/`AccOwners`. Ini berarti kalau box itu tidak ada di
template modal, panel Auto-Rebalance untuk domain Aset diam-diam tidak
pernah muncul (`if(!box)return;`).

Diverifikasi: `<div id="assetOwnersRebalanceBox"></div>` sekarang sudah ada
tepat setelah `#assetOwnersList` di template `assetOwnersModal`. Semua id
lain yang direferensikan `aset.js` (`assetOwnersAssetName`,
`assetOwnersReadOnlyHint`, `assetOwnersEditControls`, `assetOwnersTotalBox`,
`assetOwnersSaveBtn`) juga sudah cocok dgn markup. **Gap-check #114
tertutup — tidak ada perubahan kode lain yang diperlukan.**

## Catatan konsistensi (tidak diubah, di luar scope)

Domain **Investasi** (`InvestmentUI._renderRebalancePanel()`,
investasi-view.js) dan **Akun** (`AccOwners._renderRebalancePanel()`,
akun.js) masih pakai pola lama: box dibuat otomatis via
`insertAdjacentElement('afterend', box)` kalau belum ada di DOM. Pola ini
tetap aman & tidak butuh markup tambahan di modals.js — beda arsitektur
dari Aset, tapi sama-sama berfungsi. Kalau suatu saat mau disamakan ke pola
statis Aset (utk konsistensi kode), itu perlu sesi terpisah (nambah
`investmentOwnersRebalanceBox` & `accountOwnersRebalanceBox` ke
masing-masing template modal + hapus logic auto-create-nya).

## Isi ZIP ini (hanya file final/terbaru)

- `modules/asset/aset.js` — sudah lengkap (fitur Auto-Rebalance + box
  statis), tidak ada perubahan dari yang diupload.
- `modules/shared/modals.js` — sudah lengkap (`assetOwnersRebalanceBox`
  sudah ada), tidak ada perubahan dari yang diupload.
- `modules/shared/modules-calc.js` — SSOT `calculateRebalance()`, tidak
  ada perubahan dari yang diupload.
- `modules/asset/investasi-view.js` — versi terbaru sesi s600 (migrasi
  on-open + wiring penuh domain Investasi).
- `modules/finance/akun.js` — versi terbaru sesi s601 (migrasi on-open +
  wiring penuh domain Akun).
- `tests/rebalance-porsi-pemilik.test.js` — Bagian 1–5 lengkap (Aset,
  Akun, Investasi, migrasi-on-open ketiga domain).

## Status akhir

Ketiga modal porsi kepemilikan (Aset, Akun, Investasi) sekarang punya
fitur Auto-Rebalance yang konsisten secara fungsional, di atas
`calculateRebalance()` SSOT tunggal, dan markup `assetOwnersModal` sudah
sinkron — tidak ada item "belum dikerjakan" yang tersisa dari sesi
rebalance ini.
