# FIX — Semua tombol di Car Notes (dan berpotensi halaman manapun) tidak merespon karena overlay nyangkut "open" saat pindah tab

## Laporan
User melaporkan semua tombol di tab Car Notes tidak bereaksi (nol toast, nol
error terlihat). Audit kode (bukan reproduksi manual) diminta lebih dulu.

## Diagnosa
Dispatcher klik global (`_dataActionClickHandler` di
`features-helpers-global-security.js`) resolve tombol lewat
`e.target.closest('[data-action]')`. User mengonfirmasi lewat console:

```js
document.querySelectorAll('.overlay.open, .calc-overlay.open, .qs-modal-overlay.open')
// -> NodeList [div#catalogModal.overlay.open]
```

`#catalogModal` (dibuka dari `VehicleCatalogUI.openForm` / Katalog Suku
Cadang) tertinggal dengan class `overlay open`. Overlay ini full-viewport dan
selalu jadi target klik lebih dulu di manapun user tap — karena overlay itu
sendiri tidak match selector `[data-action]`, `e.target.closest('[data-action]')`
mengembalikan `null` dan dispatcher `return` diam-diam. Hasilnya: SEMUA
tombol di halaman manapun (bukan cuma Car Notes) berhenti merespon, tanpa
error/toast apa pun.

## Root Cause
`showPage(name, el)` di `modules/shared/modal-navigasi.js` — fungsi yang
dipanggil setiap kali user pindah tab bawah (Beranda/Keuangan/Shop/Car
Notes/dst) — **tidak pernah membersihkan overlay yang masih class="open"**.
Fungsi ini cuma toggle `.page.active` / `.nav-item.active` lalu
`renderPageContent()`. Kalau modal apa pun (catalogModal, servisModal,
torsiModal, dll) masih terbuka saat user pindah tab — misalnya lewat gesture
back, tombol nav bawah, atau link navigasi di dalam modal itu sendiri yang
tidak lebih dulu memanggil `closeModal()` — overlay-nya nyangkut permanen di
DOM dengan class `open`, mengunci seluruh app sampai direload manual.

Catatan: `openModal()`/`closeModal()` sendiri SUDAH solid (ada fallback
`setTimeout(finish,260)` independen dari `animationend` sejak fix
sebelumnya) — bug ini bukan di situ, tapi di `showPage()` yang tidak punya
jaring pengaman untuk modal yang ketinggalan terbuka.

## Fix
Tambah pembersihan paksa di awal `showPage()`: semua elemen
`.overlay.open, .calc-overlay.open, .qs-modal-overlay.open` yang masih ada
saat pindah tab langsung dilepas class `open`/`closing`-nya (tanpa nunggu
animasi — pindah tab = keluar dari konteks modal manapun, jadi aman ditutup
paksa), lalu `body.classList.remove('has-open-modal')` disinkronkan.

Ini jaring pengaman SISTEMIK (bukan cuma menutup 1 titik pemicu spesifik):
modal manapun yang ke depannya lupa dipasangi `closeModal()` di suatu alur
baru pun otomatis dibersihkan begini saat user pindah tab.

## File yang berubah
- `modules/shared/modal-navigasi.js` (`showPage()`, source)
- `app-bundle-b.min.js` (`showPage()`, hasil build yang benar-benar dimuat
  browser — modal-navigasi.js masuk GROUP_B)
- `sw.js` (`CACHE_NAME` v1024 → v1025, paksa client ambil ulang bundle)
- `index.html`, `app_production.html` (query `?v=1024` → `?v=1025` pada
  `app-bundle-a.min.js` & `app-bundle-b.min.js`)
- `tests/showpage-overlay-cleanup-v1025.test.js` (baru — 3 test regresi)

## Verifikasi
- `node --test tests/showpage-overlay-cleanup-v1025.test.js` — 3/3 pass.
- Full suite: `node --test tests/*.test.js` — 2164/2164 pass (baseline
  2161 + 3 baru), tidak ada regresi.

## Unblock cepat (kalau kejadian lagi di device sebelum update ter-install)
```js
closeModal('catalogModal')
```
Atau force-tutup semua overlay yang nyangkut:
```js
document.querySelectorAll('.overlay.open,.calc-overlay.open,.qs-modal-overlay.open')
  .forEach(o => { o.classList.remove('open'); o.classList.remove('closing'); });
```
