# FIX v1136 -> v1137 (s422i) — REVERT guard `hitungZakatMaal()` di `save()` (bug kritis dari s422g)

## ⚠️ Severity: P0 — regresi ini ADA di release v1135 dan v1136 yang sudah dikirim

## Bug
Sesi s422g menambahkan `if(typeof hitungZakatMaal==='function')hitungZakatMaal();`
ke `save()`, dengan asumsi fungsi itu BELUM ada di codebase (guard
future-proof, no-op). Asumsi itu SALAH — pencarian sebelumnya cuma
men-grep folder `modules/`, padahal `hitungZakatMaal()` sudah ada sebagai
wrapper di file root `pajak-aset-ui-wrappers.js`, delegasi ke
`Zakat.hitungMaal()` (`modules/finance/pajak-pbb-zakat.js`).

`Zakat.hitungMaal()` TIDAK aman dipanggil dari `save()`:

1. **Crash** — baris `parsePzNum(document.getElementById('zmUtang').value)`
   membaca elemen DOM `#zmUtang` TANPA guard `if(el)` (beda dari
   `renderBersih()` yang semua elemennya di-guard). `#zmUtang` cuma ada di
   DOM saat modal Zakat Maal sedang dibuka -- di SEMUA pemanggilan `save()`
   lain di seluruh app (yaitu hampir semua mutasi data), `getElementById`
   balik `null` → `null.value` → `TypeError`, bikin `save()` gagal total.
2. **Rekursi tak terbatas** — `hitungMaal()` sendiri memanggil `save()`
   (`pz.utangJT=utangManual; save();`). Kalaupun kasus (1) tidak kejadian
   (mis. modal Zakat Maal sedang terbuka), `save()` → `hitungZakatMaal()`
   → `hitungMaal()` → `save()` → ... → stack overflow.

Root cause proses: rekomendasi awal (review s422f) menyarankan pola guard
future-proof untuk fungsi yang "kalau/ketika ada" -- pencarian existensi
fungsi saat itu tidak lengkap (cuma `modules/`, bukan seluruh repo termasuk
file-file wrapper di root).

## Fix
Hapus baris guard `hitungZakatMaal()` dari `save()` sepenuhnya. Guard
`renderKekayaanBersih()` (s422g/h) TIDAK terpengaruh -- fungsi itu memang
aman (semua elemen DOM di dalamnya di-guard `if(el)`, tidak memanggil
`save()` sendiri).

Auto-refresh Zakat Maal dari `save()` TIDAK dikerjakan di sesi ini.
Prasyarat kalau mau dikerjakan nanti: refactor `Zakat.hitungMaal()` supaya
baca input DOM (`#zmUtang`) dipisah dari kalkulasi murni, dan hilangkan
panggilan `save()` rekursif di dalamnya.

## File berubah
- `modules/shared/features-helpers-global-security.js` — `save()`, baris
  guard `hitungZakatMaal()` DIHAPUS; komentar diperbarui menjelaskan
  kenapa (jejak keputusan supaya tidak ditambahkan lagi tanpa refactor
  prasyaratnya)
- `tests/save-derived-calc-refresh-s422g.test.js` — test lama "save()
  memanggil hitungZakatMaal() kalau ada" DIBALIK jadi "save() TIDAK
  memanggil hitungZakatMaal()" (regression guard supaya tidak
  ditambahkan lagi tanpa sadar); komentar file diperbarui
- `docs/BUG_REGISTRY.md` — AUD-007 dikoreksi (isi sebelumnya salah,
  bilang `hitungZakatMaal()` "belum diimplementasi" -- padahal sudah ada
  dan punya 2 masalah di atas)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild dari source
  (esbuild tidak tersedia, UNMINIFIED)
- `index.html`, `app_production.html`, `sw.js` — versi -> v1137
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- File versi/label lain — cuma sinkron konstanta versi (build.js), isi
  logic TIDAK berubah

## Verifikasi
- `node --test tests/*.test.js` -> **2851/2851 pass**, 0 fail.
- `node scripts/build.js s422i-revert-hitungzakatmaal-guard` -> build
  sukses, sintaks kedua bundle valid, versi `v1136` -> `v1137`.

## Rekomendasi upgrade
Kalau v1135/v1136 sudah sempat diupload ke hosting/dipakai, **upgrade ke
v1137 diprioritaskan** -- `save()` di versi itu bisa throw di hampir semua
alur pemakaian normal (nyimpen transaksi, edit akun, dll), bukan cuma di
alur Zakat Maal.
