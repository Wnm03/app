# Fix v954 (s294) — kunci toggle Tagihan/Langganan saat edit cicilan/utang arsip

Lanjutan dari catatan "belum dikerjakan" di
`FIX-v953-s293-billpaid-doublepay-guard.md` (sengaja ditunda sesi lalu
sesuai aturan "1 prioritas per sesi").

## Bug

Saat edit tagihan cicilan/utang yang sudah diarsipkan (`billEditFromArchive`)
lewat modal generik `billModal`, `openBillModal()` memanggil
`setBillType(b.kind)` dengan `'cicilan'`/`'utang'` — tapi toggle di modal itu
cuma punya 2 tombol: Tagihan/Langganan, tidak ada indikator visual untuk
cicilan/utang (kedua tombol tampil "tidak aktif" sama-sama).

**Efek**: kalau user iseng tap salah satu tombol toggle itu (kelihatan
seperti pilihan yang valid, karena tidak ada satupun yang menyala "active")
lalu simpan, `kind` record diam-diam berubah jadi `'tagihan'`/`'langganan'`.
Risiko kecil (harus edit record arsip + klik tombol yang tidak relevan),
tapi tetap silent data corruption kalau kejadian.

## Perubahan

- `modules/finance/tagihan-kalender.js`:
  - Fungsi murni baru `isBillTypeLocked(kind)` — return `true` untuk
    `'cicilan'`/`'utang'`, `false` untuk kind lain (termasuk kind tak
    dikenal/kosong, fail-safe supaya tidak diam-diam mengunci kasus yang
    tidak relevan).
  - `setBillType(t)`: sekarang men-disable kedua tombol toggle
    (`billBtnTagihan`/`billBtnLangganan`) kalau `isBillTypeLocked(t)`
    truthy — tombol `disabled` tidak bisa trigger `data-action` sama
    sekali lewat klik, jadi `curBillType` TIDAK BISA ke-timpa lewat toggle
    ini. Juga menampilkan hint teks (`#billTypeLockedHint`) yang
    menjelaskan kenapa toggle dikunci.
  - Satu-satunya jalur `setBillType()` dipanggil dengan `'cicilan'`/
    `'utang'` adalah `openBillModal()` saat `billEditFromArchive` — jadi
    aman dikunci total tanpa mengganggu alur tambah/edit tagihan &
    langganan biasa (termasuk edit tagihan/langganan yang sudah
    diarsipkan, yang toggle-nya tetap aktif seperti sebelumnya).
- `modules/shared/modals.js` (`billModal`): tambah elemen
  `<div id="billTypeLockedHint">` (hidden by default) tepat di bawah
  toggle Tagihan/Langganan, sebagai tempat `setBillType()` menaruh pesan
  kunci.
- `styles.css`: tambah `.type-btn:disabled { opacity:.45; cursor:not-allowed }`
  supaya tombol yang dikunci kelihatan jelas nonaktif.
- Tidak menyentuh `_saveBillInner()` sama sekali — karena akar masalahnya
  ada di sisi UI (toggle yang tidak seharusnya bisa diklik), guard di
  sumbernya (disabled) sudah cukup menutup celahnya; `curBillType` yang
  dikirim ke `_saveBillInner()` otomatis tetap `'cicilan'`/`'utang'`
  selama toggle terkunci.

## Test

- `tests/s294-billtype-archive-lock.test.js` — **5 test baru**, fokus ke
  `isBillTypeLocked()` (fungsi murni, tanpa DOM) lewat `loadSource()`:
  1. `'cicilan'` → `true`
  2. `'utang'` → `true`
  3. `'tagihan'` → `false`
  4. `'langganan'` → `false`
  5. kind tak dikenal/kosong (`undefined`, `''`, `'lainnya'`) → `false`
     (fail-safe)
- Wiring DOM di `setBillType()` (disabled attribute, hint text) sengaja
  TIDAK dites otomatis, sesuai batasan `tests/helpers/loadSource.js` (lihat
  komentar di file itu) — sudah diverifikasi manual: buka arsip cicilan/
  utang → kedua tombol toggle tampak pudar & tidak bisa diklik, hint
  muncul; buka arsip tagihan/langganan atau tambah baru → toggle tetap
  berfungsi normal seperti sebelumnya.
- `node --test tests/*.test.js` — **1915 test, semua lolos** (1910 + 5
  baru).

## File yang diubah

- `modules/finance/tagihan-kalender.js` — fix di atas.
- `modules/shared/modals.js` — tambah `#billTypeLockedHint` di `billModal`.
- `styles.css` — style `.type-btn:disabled`.
- `tests/s294-billtype-archive-lock.test.js` — file baru, 5 test.
- Bundle & versi: `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `index.html`, `app_production.html`, `modules/shared/modules-render.js`,
  `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js`, `docs/FILE-MAP.md` — hasil
  `node scripts/build.js s294-billtype-archive-lock`. Versi 953 → 954.
