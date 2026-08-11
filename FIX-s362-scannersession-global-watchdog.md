# FIX s362 — Watchdog global self-heal ScannerSession (tier-1, lanjutan audit v1026/v1027)

## Latar belakang
`FIX-s360` (v1026) & `FIX-s361` (v1027) menambal celah "modal/dialog tidak
respon, 0 toast" dengan menambahkan panggilan self-heal
(`ScannerSession.isActive()`) satu per satu di titik masuk overlay yang
SUDAH DIKETAHUI: `showPage()`, `openModal()`, `_queueDialog()` (mengcover 5
dialog custom), `openQS()`.

Pola ini menutup semua celah yang **sudah** ditemukan, tapi rapuh terhadap
celah yang **belum** ditemukan: kalau ada titik masuk overlay baru di masa
depan (modul fitur baru yang buka overlay-nya sendiri tanpa lewat
`openModal()`/`_queueDialog()`/`openQS()`), gejala nyangkut yang sama bisa
lolos lagi tanpa terdeteksi sampai ada laporan user berikutnya — pola
"whack-a-mole" (s360 → s361 → berpotensi s36X berikutnya).

## Perbaikan
Root cause aslinya adalah soal **timing**, bukan soal titik masuk: proses
tutup kamera paling sering terputus persis saat app di-minimize / tab
di-suspend (browser mematikan halaman sebelum `finally{}` scanner sempat
jalan). Titik paling andal untuk self-heal bukan "setiap fungsi yang buka
overlay", tapi **"setiap kali app kembali terlihat/aktif"** — momen itu
paling mungkin jadi saat state nyangkut baru saja terjadi, terlepas dari
overlay/modul mana yang nanti mau dibuka user.

`modules/shared/scanner-session.js` sekarang mendaftarkan watchdog global
saat modul dimuat:
- `document.addEventListener('visibilitychange', ...)` → self-heal saat
  `document.visibilityState === 'visible'`.
- `window.addEventListener('pageshow', ...)` → self-heal saat halaman
  kembali dari bfcache (skenario umum di iOS Safari/PWA setelah app
  di-minimize).
- `window.addEventListener('focus', ...)` → self-heal saat app kembali ke
  foreground.

Ketiganya cuma memanggil `ScannerSession.isActive()` (fungsi yang sudah ada,
idempotent, aman dipanggil kapan saja). Ini **defense-in-depth**, bukan
pengganti guard yang sudah ada di `openModal()`/`_queueDialog()`/`openQS()`
— kalau ada titik masuk baru di masa depan yang belum sempat dipatch
manual, watchdog ini tetap membersihkan state nyangkut begitu user kembali
ke app, sebelum sempat tap tombol apa pun.

## Batasan
- Guard `typeof document.addEventListener === 'function'` /
  `typeof window.addEventListener === 'function'` — aman di lingkungan yang
  tidak punya API ini (test harness Node/vm lama, browser sangat lawas).
- Tidak menghapus/menggantikan self-heal di `showPage()`/`openModal()`/
  `_queueDialog()`/`openQS()` — semuanya tetap ada, ini murni lapisan
  tambahan.
- Tidak mengubah API publik `ScannerSession` (`enter`/`exit`/`pauseUI`/
  `resumeUI`/`isActive` — 0 perubahan signature).

## File yang berubah
- `modules/shared/scanner-session.js` (watchdog baru, source)
- `app-bundle-b.min.js` (hasil build — `scanner-session.js` masuk GROUP_B)
- `tests/scanner-session-global-watchdog.test.js` (baru — 7 test regresi)
- `sw.js`, `index.html`, `app_production.html` — versi `?v=1027` → `?v=1028`

## Verifikasi
- `node --test tests/scanner-session-global-watchdog.test.js` — 7/7 pass.
- Full suite: `node --test tests/*.test.js` — 2179/2181 pass (baseline 2172
  + 7 baru), 2 fail sisanya PRE-EXISTING & tidak terkait
  (`tests/dashboard-hub-goto-subtab.test.js`, sudah didokumentasikan sejak
  s360, tidak menyentuh `scanner-session.js`).
- `node scripts/build.js s362-scannersession-global-watchdog` — sukses,
  sintaks bundle valid, versi konsisten 1028 di semua file.
- Manual trace: `grep -c "visibilitychange" app-bundle-b.min.js` → 10,
  `grep -c "pageshow" app-bundle-b.min.js` → 1 — memastikan watchdog live
  di bundle yang dimuat browser, bukan cuma di source.

## Rekomendasi lanjutan (tier-2/3, belum diimplementasikan sesi ini)

**Tier 2 — cegah regresi bundle-vs-source (pola bug s326↔s328):**
Tambahkan lint di `scripts/build.js` yang membandingkan checksum/pola kunci
antara source `.js` dan bundle hasil build sebelum dianggap "siap upload" —
supaya kasus "source sudah fix, bundle lupa di-rebuild" (persis yang
terjadi di v1025→v1026, didokumentasikan di `FIX-s360`) terdeteksi otomatis
di CI, bukan cuma lewat laporan user.

**Tier 2 — lint otomatis untuk overlay bypass:**
Kodifikasi audit manual `grep -rn "classList.add('open')" modules/` (yang
sudah dilakukan manual di sesi ini & di `FIX-s361`) jadi lint step di
`scripts/build.js`, supaya modul fitur baru yang membuka overlay langsung
tanpa lewat `openModal()`/`_queueDialog()`/`openQS()` ketahuan saat build,
bukan saat user melapor tombol macet.

**Tier 3 — pemulihan mandiri untuk user (UX, bukan cuma engineering):**
Kalau watchdog gagal jalan (mis. browser sangat lawas tanpa
`visibilitychange`), user saat ini masih perlu tahu trik console manual
(`document.body.classList.remove('scanner-session-active')`). Pertimbangkan
elemen recovery kecil yang TIDAK ikut disembunyikan oleh CSS
`scanner-session-active` (mis. tombol mengambang terpisah dari `.overlay`/
`#toast`) yang muncul otomatis kalau `body.scanner-session-active` sudah
menempel lebih dari N detik tanpa overlay scanner yang hidup — supaya ada
jalan keluar visual, tidak cuma lewat reload penuh atau DevTools.
