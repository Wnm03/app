# FIX s368 — Overlay/modal "opacity stuck 0" saat dibuka (animation-start race, non-reduced-motion)

## Latar belakang
Laporan langsung dari sesi debugging live (bukan laporan user tertulis): `vehicleModal`
diklik terbuka, `classList` benar (`overlay open`), `display:flex` benar, TAPI
`getComputedStyle(el).opacity` tetap `"0"` permanen walau `prefers-reduced-motion` OFF —
jadi BUKAN kasus yang sudah dipatch di `styles.css` baris 65-78 (fix reduced-motion itu
cuma aktif di dalam media query-nya).

Diagnosis lengkap (via `el.getAnimations()`, `animationPlayState`, `currentTime` yang
tidak pernah maju) mengonfirmasi: `.overlay.open` melakukan 2 perubahan sekaligus dalam
1 rule yang sama (`display:none→flex` DAN memulai animasi CSS `overlayIn`), dipicu oleh
1 `classList.add('open')` yang sama, tanpa reflow di antaranya. Browser bisa gagal
menginstansiasi `Animation` object utk `overlayIn` — computed style tetap "mengaku"
`animationName:overlayIn`/`animationPlayState:running` (itu cuma refleksi rule CSS yang
match), tapi `el.getAnimations()` kosong & `currentTime` tidak pernah maju. Elemen macet
permanen di keyframe `from{opacity:0}`.

Race condition ini kemungkinan sudah lama ada (tidak spesifik ke v1035/sesi manapun),
timing-dependent (bergantung load CPU/GPU device saat classList di-mutate) — menjelaskan
kenapa belum pernah ada laporan user eksplisit soal ini walau kodenya sudah lama.

## Cakupan dampak
Pola identik (`overlay.classList.add('open')` langsung tanpa reflow) ada di 3 jalur
pembuka overlay, SEMUA di `modules/shared/modal-navigasi.js`:
- `openModal(id)` — dipakai ~90 `.overlay` modal (termasuk `.calc-overlay` via
  `openCalc()→openModal('calcModal')`), termasuk `vehicleModal` yang jadi reproduksi.
- `openQS(id)` — `.qs-modal-overlay` (quick switcher).
- `_queueDialog()` (dipakai `askConfirm`/`showPromptModal`/`showChoiceModal`/
  `showAlertModal`/`showPinPromptModal`) — dialog konfirmasi aksi DESTRUKTIF (hapus
  transaksi/akun/dll) dipakai di ~20 file lain.

## Perbaikan
Fix minimal & terpusat: paksa 1 synchronous reflow (`void el.offsetWidth`) di antara
`classList.add('open')` (yang mengubah `display`) dan sebelum browser menentukan apakah
akan menginstansiasi animasi baru — di titik tunggal supaya otomatis meng-cover semua
overlay tanpa sentuh tiap modal satu-satu:

- `openModal()` — tambah `void el.offsetWidth;` setelah `classList.add('open')`.
- `openQS()` — direfaktor sedikit (dari 1-liner jadi block) supaya bisa sisipkan
  `void el.offsetWidth;` yang sama.
- `_queueDialog()`'s 5 dialog custom — ditambah helper baru `_openDialogOverlay(el)`
  (dipanggil tepat setelah `_dialogSelfHeal()` di source, pola sama seperti
  `_dialogSelfHeal()` sendiri) yang melakukan `classList.add('open')` + reflow dalam 1
  titik; kelima fungsi dialog diubah dari `overlay.classList.add('open')`/
  `document.getElementById('xxxOverlay').classList.add('open')` jadi
  `_openDialogOverlay(overlay)`/`_openDialogOverlay(document.getElementById('xxxOverlay'))`.

0 perubahan API/behavior lain — hanya menyisipkan 1 baris reflow (dan 1 helper kecil
untuk dialog custom) di titik yang sudah ada.

## Verifikasi
- `node --check modules/shared/modal-navigasi.js` — sintaks valid.
- `node scripts/build.js` — lolos semua lint termasuk
  `lintOverlayOpenBypassesGuard()` (`✓ Semua overlay dibuka lewat jalur yang sudah
  dipasangi self-heal ScannerSession`) — fix ini TIDAK menambah bypass baru, cuma
  helper (`_openDialogOverlay`) & call site tetap di dalam
  `OVERLAY_OPEN_BYPASS_ALLOWLIST` (`modules/shared/modal-navigasi.js` sendiri). Build
  sukses, versi naik ke **1037**, label `s368-overlay-open-animation-reflow-race`.
- Full suite: `node --test tests/*.test.js` — **2194/2196 pass**, 2 fail
  (`dashHubNavigateToFeature` — Penasihat AI / Life OS scroll test) — PRE-EXISTING,
  tidak terkait `modal-navigasi.js`, konsisten dgn baseline yang sama-sama gagal di
  `FIX-s363-s364` (`2179/2181`, 2 fail pre-existing).
- Test spesifik modal/dialog dijalankan terpisah untuk memastikan 0 regresi:
  `node --test tests/modal-reduced-motion-visibility.test.js
  tests/dialog-scannersession-selfheal.test.js` — **9/9 pass**, termasuk assertion
  eksplisit "reduced-motion TIDAK aktif — perilaku normal (animasi overlayIn + opacity
  1) tidak ikut berubah oleh fix ini".

## Yang BELUM dikerjakan sesi ini (disengaja, di luar scope fix minimal)
- Test regresi baru yang assert `el.getAnimations().length > 0` segera setelah
  `openModal()` (butuh environment test yang mendukung real CSS animation timing —
  test harness saat ini pakai fake DOM, lihat `tests/helpers/loadSource.js`).
- Verifikasi manual di kondisi CPU-throttled (DevTools Performance → 6x slowdown) —
  race condition ini kemungkinan lebih sering muncul saat CPU sibuk; disarankan sesi
  berikutnya kalau ada laporan user lanjutan soal modal tidak muncul.
- Perbaikan arsitektural jangka panjang (pisah `display` dari rule animasi opacity,
  mis. `@starting-style` kalau target browser support) — di luar scope fix minimal ini.
- Lint baru yang memastikan tiap `classList.add('open')` baru selalu diikuti reflow
  (mencegah modul masa depan menambahkan overlay opener baru tanpa fix ini).
- **Sinkronisasi `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md`/
  `docs/NEXT_SESSION.md` SENGAJA TIDAK disentuh sesi ini** — dokumen-dokumen itu
  memakai skema penomoran sesi ("Sesi 49", "Batch 12", `?v=533`/`?v=476`) yang
  berbeda & tampak belum disinkronkan dengan seri `FIX-sXXX` (`s360`-`s368`) di root
  repo ini; menyentuhnya tanpa konteks penuh riwayat kedua track (Smart AI vs LifeOS,
  lihat `docs/README_DEVELOPER.md`) berisiko salah sinkron. Sesi berikutnya (dengan
  akses penuh ke `docs/SESSION_RULES.md`/`docs/PRODUCT_DECISIONS.md`) sebaiknya yang
  melakukan sinkronisasi ini.

## File yang berubah
- `modules/shared/modal-navigasi.js` — `openModal()`, `openQS()`, helper baru
  `_openDialogOverlay()` + 5 call site di `askConfirm`/`showPromptModal`/
  `showChoiceModal`/`showAlertModal`/`showPinPromptModal`.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild rutin via `scripts/build.js`).
- `index.html`, `app_production.html`, `sw.js` — versi `?v=1035` → `?v=1037`,
  `CACHE_NAME` → `kw-cache-v1037`.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis oleh
  `scripts/build.js` (278 file, 1954 identifier global; 15 family, 0 tanpa test file
  langsung).
