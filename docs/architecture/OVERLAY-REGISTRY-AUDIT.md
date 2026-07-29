# Audit Overlay Registry — Rekomendasi (bukan refactor)

Sesi: lanjutan v850/v851 (ScannerSession lifecycle hardening).
Status: **dokumen rekomendasi saja — tidak ada perubahan kode.**

## Temuan

Ada 3 class overlay/modal berbeda yang harus dikenal scanner secara eksplisit
(`modules/shared/scanner-session.js`, `_scannerSessionEnsureStyle()`):

| Class | Dipakai untuk | Jumlah pemakaian |
|---|---|---|
| `.overlay` (+`.open`) | Modal generik — hampir semua modal app (`MODAL_HTML` di `modules/shared/modals.js`) | ~100+ modal, mayoritas app |
| `.qs-modal-overlay` (+`.open`) | Modal QuickSelect | terpisah, class sendiri |
| `.calc-overlay` (+`.open`) | Modal Kalkulator | terpisah, class sendiri |

Ketiganya didefinisikan terpisah di `styles.css` (baris ~333, ~361, ~630),
masing-masing dengan `position:fixed`, `z-index` sendiri (`--z-overlay`,
`--z-overlay-qs`, `--z-overlay-calc`), dan animasi `.open`/`.closing` yang
sama polanya tapi diduplikasi 3x.

Root cause historis (lihat komentar di `scanner-session.js`): scanner harus
tahu SEMUA varian class ini secara manual, karena tidak ada atribut/marker
umum yang membedakan "ini overlay fixed yang perlu disembunyikan saat
scanner aktif" dari elemen lain. Bug lama (modal QuickSelect/Kalkulator
tetap tampil di belakang scanner) terjadi persis karena salah satu varian
class ini lolos dari selector suppression.

## Opsi: `data-overlay` sebagai atribut umum

**Ide:** tambahkan `data-overlay` (atau `data-overlay="modal"` dst) ke
setiap root elemen overlay/modal, terlepas dari class spesifiknya. Scanner
tinggal pakai satu selector `[data-overlay].open` alih-alih 3 selector
class terpisah — otomatis ikut men-cover varian overlay baru yang mungkin
ditambahkan di masa depan tanpa perlu menyentuh `scanner-session.js` lagi.

**Manfaat:**
- Satu titik kebenaran untuk "apa itu overlay" — scanner, dan modul lain
  yang butuh tahu overlay mana yang sedang terbuka (mis. back-button
  handler, focus-trap, dsb kalau ada di masa depan), cukup query 1 selector.
- Overlay baru otomatis ter-cover tanpa update manual di scanner-session.js.

**Biaya/risiko — kenapa BELUM dieksekusi sesi ini:**
- `.overlay` dipakai di ~100+ blok `MODAL_HTML` (`modules/shared/modals.js`)
  + kemungkinan tempat lain (dynamic modal, dsb) — migrasi berarti
  menyentuh ratusan baris markup sekaligus, jauh melebihi "perubahan
  seminimal mungkin" yang jadi target sesi ini (RULE #1: Reuse > Extend >
  New, dan instruksi eksplisit "JANGAN refactor besar").
- CSS `.overlay`/`.qs-modal-overlay`/`.calc-overlay` juga dipakai sebagai
  *styling* selector (bukan cuma marker), jadi migrasi ke `data-overlay`
  murni sebagai marker TIDAK menghapus kebutuhan class-nya sendiri untuk
  styling — paling realistis `data-overlay` ditambahkan **berdampingan**
  dengan class yang sudah ada (aditif), bukan pengganti. Ini mengurangi
  risiko tapi juga mengurangi manfaat "satu sumber kebenaran".
- Tidak ada bug aktif saat ini yang butuh perbaikan ini — CSS suppression
  3-selector yang ada sekarang (hasil audit sesi sebelumnya) sudah terbukti
  benar & 100% test-covered (lihat `tests/scanner-session.test.js`).

## Rekomendasi

1. **Jangan migrasi sekarang.** Risiko/effort tidak sepadan dengan manfaat
   selama tidak ada overlay class baru yang perlu ditambahkan.
2. **Kalau nanti ada overlay class ke-4 (atau lebih) yang perlu di-suppress
   scanner**, itu sinyal yang tepat untuk migrasi: tambahkan `data-overlay`
   secara aditif ke SEMUA overlay yang ada (termasuk 3 yang sudah ada),
   lalu ganti 3 selector CSS suppression scanner jadi 1 selector
   `[data-overlay].open`. Class asli (`.overlay`/`.qs-modal-overlay`/
   `.calc-overlay`) tetap dipertahankan untuk styling.
3. Migrasi itu sebaiknya dilakukan sebagai sesi tersendiri (bukan
   digabung dengan perubahan lifecycle scanner), dengan test baru yang
   memverifikasi tiap modal punya `data-overlay` sebelum class lama
   dilepas — kalau class lama memang mau dilepas sekalian.
