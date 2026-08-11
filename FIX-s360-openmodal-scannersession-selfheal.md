# FIX s360 — openModal() tidak self-heal ScannerSession (tab Kelola Kendaraan / Katalog Suku Cadang tidak respon, 0 toast)

## Laporan
User melaporkan tombol **+ Kelola Kendaraan** dan **📦 Katalog Suku Cadang**
tidak bereaksi — nol toast, nol error terlihat.

## Root Cause
Self-heal ScannerSession (`_scannerSessionSelfHeal()`, dipanggil via
`isActive()`) sebelumnya HANYA dipanggil dari 2 tempat:
- `showPage()` (pindah tab bawah)
- `ScannerSession.enter()` (user coba buka scanner lagi)

Kalau `_scannerSessionActive` nyangkut `true` (skenario yang sudah
didokumentasikan di `scanner-session.js`: proses tutup kamera terputus —
izin kamera ditolak/app di-minimize/tab di-suspend saat scan berlangsung),
`body.scanner-session-active` nempel permanen di DOM. CSS-nya:

```css
body.scanner-session-active .overlay.open{display:none !important;}
body.scanner-session-active #toast{display:none !important;}
```

`openModal()` (dipanggil `openVehicleModal()`/`VehicleCatalogUI.open()` dkk)
TIDAK pernah memicu self-heal ini. Jadi kalau user tap tombol buka modal
langsung — tanpa pindah tab dulu, tanpa coba buka scanner dulu —
`openModal()` tetap sukses menambahkan class `open` secara JS, tapi CSS
memaksa `display:none` ke overlay-nya **dan ke `#toast` sekaligus**. Hasil:
modal tidak kelihatan, toast pun ikut disembunyikan → persis gejala "tidak
respon, tidak ada toast".

Kelola Kendaraan & Katalog Sparepart adalah 2 modul yang paling sering kena
karena keduanya yang punya fitur scan kamera (`VehicleScanner`/
`SparepartScanner`), jadi paling sering jadi titik state nyangkut ini
terjadi.

## Fix
`openModal()` (`modules/shared/modal-navigasi.js`) sekarang juga memanggil
`ScannerSession.isActive()` di awal — pola SAMA PERSIS yang sudah dipasang
di `showPage()` sejak fix v1025 sebelumnya. 1 guard `typeof`, 0 perubahan
API `ScannerSession`, 0 breaking change ke pemanggil existing.

## File yang berubah
- `modules/shared/modal-navigasi.js` (`openModal()`, source)
- `app-bundle-b.min.js` (hasil build — `modal-navigasi.js` masuk GROUP_B)
- `tests/openmodal-scannersession-selfheal.test.js` (baru — 3 test regresi)
- `sw.js`, `index.html`, `app_production.html` — versi `?v=1025` → `?v=1026`

## Verifikasi
- `node --test tests/openmodal-scannersession-selfheal.test.js` — 3/3 pass.
- Full suite: `node --test tests/*.test.js` — 2167/2169 pass (baseline 2164
  + 3 baru), 2 fail sisanya PRE-EXISTING & tidak terkait (`tests/dashboard-hub-goto-subtab.test.js`,
  cuma load `dashboard-hub.js`, tidak menyentuh `modal-navigasi.js`).
- `node scripts/build.js` — sukses, sintaks bundle valid, versi konsisten 1026.

## Catatan penting (temuan terpisah, sudah ikut kebereskan di build ini)
Bundle `app-bundle-a/b.min.js` di rilis v1025 sebelumnya TIDAK pernah
di-rebuild setelah patch race-condition scan-ocr (`_modalEpoch`) diterapkan
ke source — fix itu sempat TIDAK live di app sungguhan. Build s360 ini
sekaligus meregenerasi bundle, jadi fix race-condition OCR ikut aktif
sekarang (sebelumnya cuma ada di source, bukan di app-bundle-b.min.js yang
dimuat browser).

## Unblock cepat (kalau user kejadian lagi di device sebelum update ter-install)
```js
document.body.classList.remove('scanner-session-active');
document.querySelectorAll('.keu-fab').forEach(f => f.style.display = '');
```
