# FIX s361 — askConfirm()/showPromptModal()/showChoiceModal()/showAlertModal()/showPinPromptModal()/openQS() tidak self-heal ScannerSession (gap lanjutan audit v1026)

## Laporan
Audit lanjutan atas fix v1026 (lihat `FIX-s360-openmodal-scannersession-selfheal.md`)
menemukan gap: fix v1026 hanya memasang self-heal ScannerSession di
`openModal()`. `confirmModalOverlay` — dan 5 overlay lain — **tidak**
melewati `openModal()` sama sekali.

## Root Cause
`askConfirm()`, `showPromptModal()`, `showChoiceModal()`, `showAlertModal()`,
dan `showPinPromptModal()` semuanya memakai helper `_queueDialog()`, yang
langsung memanggil `document.getElementById(<overlayId>).classList.add('open')`
sendiri — bukan lewat `openModal()`. `openQS()` (Quick Switcher) punya pola
identik.

Kalau `_scannerSessionActive` nyangkut `true` (skenario yang sama dengan
v1026: proses tutup kamera scan terputus — izin kamera ditolak/app
di-minimize/tab di-suspend saat scan), `body.scanner-session-active` nempel
permanen di DOM. CSS-nya (`_scannerSessionEnsureStyle()` di
`scanner-session.js`):

```css
body.scanner-session-active .overlay.open{display:none !important;}
body.scanner-session-active #toast{display:none !important;}
```

Keenam overlay di atas SEMUANYA pakai class `.overlay`, jadi kena rule yang
sama. Dialog tetap sukses ditambahkan class `open` secara JS, tapi CSS
memaksa `display:none` ke overlay-nya **dan ke `#toast` sekaligus** — persis
gejala "modal/dialog tidak respon, 0 toast" yang mendasari fix v1026,
hanya beda titik masuk.

Ini krusial karena `askConfirm()` dipakai di ~20 file untuk konfirmasi aksi
DESTRUKTIF (hapus transaksi, hapus akun, hapus produk, dll) — kalau device
user kena state nyangkut ini pas mau konfirmasi, tombol "Ya, Lanjutkan"/
"Batal" tidak akan pernah muncul, tanpa jalan keluar selain reload penuh.

## Fix
Satu titik guard baru, `_dialogSelfHeal()` (`modules/shared/modal-navigasi.js`),
dipanggil dari:
- `_queueDialog()` — otomatis meng-cover SEMUA 5 dialog custom di atas
  (karena semuanya lewat helper ini), dipanggil baik saat render langsung
  (queue kosong) maupun saat dialog berikutnya di antrean digilir lewat
  `_resolveDialog()`.
- `openQS()` — pola sama persis, overlay Quick Switcher juga `.overlay.open`.

Pola implementasi identik dengan fix v1026 di `openModal()`/`showPage()`:
guard `typeof ScannerSession!=='undefined'`, 0 perubahan API `ScannerSession`,
0 breaking change ke pemanggil existing (`askConfirm()`/`showPromptModal()`/
dst tetap 1 pemanggilan = 1 Promise seperti sebelumnya).

## File yang berubah
- `modules/shared/modal-navigasi.js` (`_dialogSelfHeal()` baru, dipanggil
  dari `_queueDialog()` & `openQS()`, source)
- `app-bundle-b.min.js` (hasil build — `modal-navigasi.js` masuk GROUP_B)
- `tests/dialog-scannersession-selfheal.test.js` (baru — 5 test regresi)
- `sw.js`, `index.html`, `app_production.html` — versi `?v=1026` → `?v=1027`

## Verifikasi
- `node --test tests/dialog-scannersession-selfheal.test.js` — 5/5 pass.
- Full suite: `node --test tests/*.test.js` — 2172/2174 pass, 2 fail
  PRE-EXISTING & tidak terkait (`tests/dashboard-hub-goto-subtab.test.js`,
  sudah didokumentasikan sejak s360, tidak menyentuh `modal-navigasi.js`).
- `node scripts/build.js` — sukses, sintaks bundle valid, lint MODAL_HTML
  index drift / OCR chicken-egg / dnone-style-display semua lolos, versi
  konsisten 1027 di semua file.
- Manual trace: `grep -c "_dialogSelfHeal" app-bundle-b.min.js` → 5
  (definisi + 4 titik panggil), memastikan fix live di bundle yang dimuat
  browser, bukan cuma di source.

## Cakupan sisa (di luar scope patch ini)
Belum diaudit: apakah ada overlay `.overlay`/`.qs-modal-overlay`/
`.calc-overlay` lain di luar `modal-navigasi.js` yang juga membuka dirinya
sendiri lewat `classList.add('open')` langsung tanpa lewat `openModal()`/
`_queueDialog()`/`openQS()` (mis. di modul fitur individual). Rekomendasi:
audit lanjutan dengan `grep -rn "classList.add('open')"` di seluruh
`modules/` untuk memetakan semua titik masuk overlay yang tersisa.
