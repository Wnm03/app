# PATCH — Gabungan 6 Patch Terpisah + Rebuild Penuh (v1372→v1374)

## Isi patch (16 file)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh dari source gabungan
- `index.html`, `app_production.html` — viewport a11y + versi ?v=1374
- `styles.css` — navlabel font-size + toast undo CSS, digabung
- `modules/shared/modal-navigasi.js` — focus trap 5 dialog custom (versi dialog-focus-trap, supersede modal-focus-trap) + bugfix baru
- `modules/shared/format-tema.js` — `toastUndo()` baru
- `modules/finance/transaksi.js` — `delReminder()` pakai undo
- `modules/shared/modals.js`, `modules-calc.js`, `modules-render.js`, `features-helpers-global-security.js`, `chat-action-handlers.js` — sinkronisasi versi s637→s638 (otomatis dari `build.js`)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `sw.js` — CACHE_NAME → v1374

## Latar belakang
6 patch zip sesi-sesi sebelumnya (dialog-focus-trap, bundle-a-rebuild,
navlabel-font-size, modal-focus-trap, toast-undo-delReminder,
viewport-a11y) ternyata **masing-masing dibuat independen dari app-main
base**, BUKAN kumulatif satu sama lain — jadi tidak bisa ditimpa berurutan
begitu saja tanpa kehilangan perubahan patch lain. Konflik ada di 2 file:

- `styles.css`: navlabel-font-size (baris ~112, `.nav-item`) vs
  toast-undo-delReminder (baris ~556, `.toast--action`) — 2 region
  berbeda, digabung manual (bukan saling menimpa).
- `app-bundle-b.min.js`: dialog-focus-trap vs modal-focus-trap
  (superseded — dialog-focus-trap adalah superset) vs toast-undo-delReminder
  (dibangun dari source SEBELUM patch focus-trap ada) — diselesaikan dengan
  cara TIDAK menimpa bundle mana pun; semua source digabung dulu, baru
  bundle di-**rebuild penuh** dari `node scripts/build.js`.

`modal-navigasi.js` dari `patch-dialog-focus-trap` diambil langsung karena
strict superset dari `patch-modal-focus-trap` (diverifikasi lewat diff).

## Bug baru ditemukan & diperbaiki sesi ini
`_focusTrapActivate()` (modal-navigasi.js) crash
(`container.hasAttribute`/`container.setAttribute is not a function`) saat
dipanggil dengan container yang bukan elemen DOM penuh (mock test tanpa API
lengkap). Ketahuan karena sesi ini menjalankan **full test suite**
(`node --test tests/*.test.js`), bukan cuma `node --check` seperti verifikasi
di README patch-patch sebelumnya. Fix: guard `typeof container.hasAttribute`
dan `typeof container.setAttribute` sebelum dipanggil.

## Verifikasi
- `node --test tests/*.test.js` → **4539/4539 lolos** (0 gagal, setelah fix
  di atas; sebelum fix ada 3 test gagal karena bug tsb).
- `node scripts/verify-bundle-freshness.js` → kedua bundle segar.
- `node scripts/verify-window-expose.js` → OK, 76 modul, 0 regresi exposure.
- `node scripts/verify-release-ready.js` → gagal di 2 gate: **lint**
  (eslint tidak terpasang) & **minify** (esbuild tidak terpasang) — murni
  keterbatasan environment sandbox (tanpa akses npm install), bukan bug;
  sama seperti kondisi build sesi-sesi sebelumnya. `html-sync` &
  `version-sync` lolos.
- Bundle TANPA minifikasi (esbuild tidak tersedia) — lebih besar dari
  versi lama tapi 100% valid secara sintaks (`node --check` lolos).

## Cara apply
Timpa ke-16 file di atas di root project (jaga struktur folder
`docs/`, `modules/finance/`, `modules/shared/`). Tidak perlu rebuild
lagi — bundle & docs sudah final hasil `node scripts/build.js`.

## Belum dikerjakan (di luar scope sesi ini, dikonfirmasi user)
Skeleton/loading state, undo untuk `delTx()` (butuh audit cascade
terpisah — beda dari `delReminder()` yang 0 cascade), folder duplikat
basi `finance/`+`lifeos/` di root (dikonfirmasi ADA, belum dibersihkan
karena risiko tinggi tanpa verifikasi menyeluruh dulu), belum ada git,
belum ada backup otomatis.
