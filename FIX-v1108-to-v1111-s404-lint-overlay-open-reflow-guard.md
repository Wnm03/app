# Sesi 404 — Lint "classList.add('open') tanpa reflow paksa", v1108 → v1111

## Latar belakang

Sisa rekomendasi terbuka dari `FIX-s368-overlay-open-animation-reflow-race.md`
(bug "opacity macet 0 permanen" — `classList.add('open')` yang tidak diikuti
reflow paksa bisa bikin browser menggabungkan perubahan `display` & mulai-
animasi jadi 1 style recalc, Animation utk `overlayIn` gagal terinstansiasi
total): "Lint baru yang memastikan tiap `classList.add('open')` baru selalu
diikuti reflow" — belum dikerjakan sampai sesi ini.

Lint `lintOverlayOpenBypassesGuard()` (s363/s364) sudah menutup 1 celah:
overlay yang `classList.add('open')` di LUAR `modules/shared/modal-navigasi.js`
ketahuan build. Tapi DI DALAM file itu sendiri (satu-satunya file yang
di-allowlist) tidak ada jaring pengaman kalau nanti ada jalur buka-overlay
baru ditambahkan TANPA reflow paksa — race yang sama bisa terulang lewat
jalur baru itu, lolos dari lint bypass krn memang file-nya sudah di-whitelist.

## Perubahan

- **`scripts/build.js`** — `lintOverlayOpenReflowGuard()` baru: scan KHUSUS
  `modules/shared/modal-navigasi.js`, tiap `classList.add('open')` (di luar
  baris komentar) harus diikuti `offsetWidth` dalam 15 baris setelahnya.
  Didaftarkan ke `LINT_REGISTRY` sbg entry baru, severity `blocking` (sama
  seperti `overlay-open-bypass-guard`, karena race ini sebelumnya sudah
  menyebabkan bug produksi nyata — bukan cuma housekeeping).
- 0 perubahan logika aplikasi — `openModal()`/`openQS()`/`_openDialogOverlay()`
  (3 jalur yang sudah ada) semuanya sudah punya reflow paksa sejak s368,
  lint ini murni jaring pengaman utk jalur baru di masa depan.

## Kenapa aman

- Lint murni build-time, tidak menyentuh source runtime app sama sekali
  (`modal-navigasi.js` 0 perubahan).
- Regex skip baris komentar (`.trim().startsWith('//')`) supaya penjelasan
  yang MENYEBUT `classList.add('open')` di komentar (banyak di file ini)
  tidak jadi false positive — sudah dicek manual: 3 titik kode sungguhan
  (`_openDialogOverlay()` L67, `openModal()` L294, `openQS()` L430) semuanya
  lolos bersih.

## Test

- Manual sanity check: tambah `classList.add('open')` di fungsi baru yang
  sengaja jauh dari reflow manapun → `node scripts/build.js` berhenti dengan
  pesan lint yang tepat menyebut file:baris pelanggarannya → baris dihapus
  lagi (tidak disertakan di rilis ini).
- Full suite: **2721/2721 pass, 0 fail** (tidak berubah dari baseline v1108
  — lint ini tidak menambah test unit baru, murni build-time check).

## Build

`node scripts/build.js s404-lint-overlay-open-reflow-guard` → v1109, lalu
2 build tambahan selama sanity-check (v1110, v1111 — versi akhir final).
Sintaks bundle valid, `index.html`/`app_production.html` identik.
(Catatan: esbuild tidak terpasang di environment build ini, bundle belum
diminify — tetap 100% valid & aman dipakai.)

## Cara pasang (patch)

Timpa file berikut:

```
scripts/build.js
app-bundle-a.min.js
app-bundle-b.min.js
index.html
app_production.html
sw.js
docs/FILE-MAP.md
docs/COVERAGE-PER-MODULE.md
```

Ikut berubah (cuma bump versi, 0 logika): `chat-action-handlers.js`,
`modules/shared/multi-owner-engine.js`,
`modules/shared/features-helpers-global-security.js`,
`modules/business/shop-data-io-api.js`,
`modules/shop/generic/product-repository.js`, `modules/shared/modals.js`,
`modules/shared/modules-render.js`, `modules/shared/modules-calc.js`.

## Status rekomendasi FIX-s368

Semua rekomendasi tier dari audit s360-s368 (overlay/ScannerSession/klik
dispatcher) sekarang **selesai** — 0 sisa rekomendasi terbuka.
