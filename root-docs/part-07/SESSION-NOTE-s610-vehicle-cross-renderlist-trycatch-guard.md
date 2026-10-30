# Sesi s610 — Sisa renderer try/catch per-baris: modules/vehicle/, modules/cross/ (versi 1451)

Lanjutan backlog item #2 dari sesi s608 ("sisa renderer di luar cakupan hari
itu — `modules/vehicle/`, `modules/cross/`, dashboard presenter — kalau mau
disisir juga"). Pola audit sama persis S601/S608: renderer list yang pakai
`list.map(item=>fn(item)).join('')` -> `el.innerHTML=...` TANPA try/catch
per-item — 1 item dengan data yang bikin fungsi per-baris throw akan
menjatuhkan SELURUH `.map()` sebelum `innerHTML` sempat ke-assign, container
tetap menampilkan render sukses SEBELUMNYA (data-action basi, tap = 0
reaksi).

## File yang diperbaiki (try/catch per-item + fallback baris aman)
- `modules/vehicle/fuel-history.js` — `FuelHistory.render()` (delegasi ke `_row(b)`)
- `modules/vehicle/fuel-compare.js` — `FuelCompare.render()` (delegasi ke `_rowHtml(r, priorityVehicleId)`)
- `modules/vehicle/vehicle-attention-presenter.js` — `render()`, 2 blok terpisah: `actionRows` (delegasi `_actionRow(r)`) & `insightRows` (delegasi `_insightRow(item)`)
- `modules/vehicle/vehicle-decision-presenter.js` — `render()` (delegasi ke `_row(r)`)
- `modules/cross/life-priority-panel.js` — `render()` (delegasi ke `_row(item)`)
- `modules/cross/action-queue.js` — `render()` (delegasi ke `_label(item)`/`_vehicleIcon()`)

Fallback dipilih sesuai konteks kartu: renderer list transaksi/kendaraan
(FuelHistory, FuelCompare) pakai baris ⚠️ eksplisit (konsisten pola s608);
renderer kartu ringkas/insight (attention/decision/priority/queue) pakai
string kosong (item yang gagal cukup dilewati, tidak menampilkan baris
kosong yang aneh di kartu ringkas) — sama-sama TIDAK menjatuhkan render
keseluruhan, cuma beda presentasi fallback sesuai jenis kartunya.

## Sengaja TIDAK disentuh (audit dicek eksplisit, bukan terlewat)
- `modules/dashboard-hub/dashboard-hub.js` — mayoritas `.map().join('')`
  beroperasi atas array kecil TETAP (4-5 kartu statis: Pemasukan/
  Pengeluaran/Bersih/Transaksi bulan ini, 5 tipe ownership SELF/INVESTOR/
  CUSTOMER/FAMILY/THIRD_PARTY) — bukan daftar dinamis panjang dari data
  user, risiko throw per-item minim, sudah banyak di-guard `typeof`.
- `modules/cross/cross-insight-presenter.js`, `modules/cross/recommendation-panel.js`,
  `modules/cross/cross-dashboard-card.js`, `modules/cross/cross-module-widgets.js` —
  per-item cuma lookup emoji (`_icon(type)`, ada fallback default) +
  `escapeHtml()`, 0 kalkulasi/derivasi lanjutan yang realistis bisa throw.

## Test
- Baru: `tests/s610-vehicle-cross-renderlist-trycatch-guard.test.js` (4 test:
  FuelHistory, VehicleDecisionPresenter, LifePriorityPanel, ActionQueue —
  masing-masing verifikasi 1 item rusak tidak menjatuhkan render, item lain
  tetap tampil).
- Full suite: **4911/4911 pass, 0 fail** (`node --test tests/*.test.js`).
- Build: `node scripts/build.js` — semua gate lolos, versi disinkron ke
  **1451**. `verify-bundle-freshness.js` — lolos (hash source cocok).

## Isi patch zip ini
Hanya file yang berubah/baru, struktur folder sama persis dengan zip yang
diupload:
- 6 file source yang diperbaiki (lihat daftar di atas)
- 1 file test baru: `tests/s610-vehicle-cross-renderlist-trycatch-guard.test.js`
- 5 file version-sync otomatis dari `build.js`: `modules/shared/modules-render.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (belum diminify, esbuild
  tidak tersedia di sandbox — tetap 100% valid & aman dipakai)
- `app_production.html`, `index.html`, `sw.js` (versi disinkron ke 1451)
- `CHANGELOG.md` (diperbarui)

Catatan: upload SEMUA file di patch ini, jangan cuma HTML/sw.js.

## Backlog s608 — status
Kedua item backlog s608 sudah diselesaikan (audit alur pembayaran
utang/piutang di sesi s609, sisa renderer di sesi ini). Tidak ada item
menggantung dari s608 lagi.
