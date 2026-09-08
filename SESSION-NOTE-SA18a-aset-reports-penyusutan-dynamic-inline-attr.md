# SESSION-NOTE — SA18a: Migrasi atribut event inline dinamis di aset-reports.js (Penyusutan) + audit ulang rencana SA18 (2026-09-08)

Lanjutan epic migrasi `docs/AUDIT-INLINE-EVENT-DINAMIS-S1588.md` (rekomendasi
#3). SA11-SA17 (87 dari 123 titik audit awal) sudah tuntas. Rencana lama
menyebut SA18 = "45 titik, 18 file sisa" — TAPI mengikuti pengalaman SA17
(5 dari 8 "titik" tercatat ternyata komentar), sesi ini **audit ulang dulu**
20 file sisa satu-satu sebelum eksekusi.

## Audit ulang SA18 (ringkasan)

Metode identik dgn audit S1588 asli & audit ulang SA17: jalankan ulang regex
`grep -rnoP '(?<!data-)\bon(click|change|input|blur|keydown|keyup|submit|focus|dblclick)="' --include="*.js"` repo-wide, lalu untuk tiap match, cek baris
sumbernya — kalau diawali `//` (trimmed), itu KOMENTAR (bukan kode nyata),
dikeluarkan dari hitungan.

Hasil: dari 20 file sisa, ditemukan **48 kemunculan regex** (bukan 45 yang
tercatat) tapi cuma **31 titik kode nyata** setelah difilter baris komentar
— **6 dari 20 file ternyata 0 titik nyata sama sekali** (murni komentar
dokumentasi yang menyebut pola lama, pola SAMA PERSIS seperti
`tx-bbm.js`/`cicilan.js`/`tx-stok-sparepart.js` di SA17):
`onboarding.js`, `pengaturan-search.js`, `scan-ocr.js`, `transaksi.js`,
`cobek-tx-cart.js`, `ai-chat.js` — TIDAK ikut di ZIP ini, TIDAK perlu
disentuh sesi manapun.

14 file dgn titik nyata (31 total) dipecah jadi beberapa sesi kecil
(disiplin "1 sesi 1-2 file source", blast radius kecil per patch):

| Sesi | File | Titik | Pola |
|---|---|---|---|
| **SA18a (sesi ini)** | `aset-reports.js` (Penyusutan) | 6 | 3-arg id+field literal+`$value` (x5) + 1-arg id literal (x1) — pola SUDAH ADA sejak SA15/SA17, 0 varian baru |
| SA18b (berikutnya) | `dana-titipan-portfolio-render.js` | 5 | filter bar, identik pola SA14a/SA14b |
| SA18c | `scan-ocr-b.js` + `titipan-expense-ui.js` | 6 | 3-arg literal-field (pola SA15) + 1-2 arg standar |
| SA18d | `budget.js` + `modules-calc.js` | 4 | token `$el` baru dipakai lintas file kembar (mirip duplikasi dashboard SA16) |
| SA18e | `kategorisasi-ai.js` + `aset-emas-impor.js` | 4 | 0-arg klik (pola SA16) + 1 titik onblur RANGKAP 2 fungsi (`evalAmtExpr('literal'),GoldZakat.onHargaInput()`) — perlu verifikasi comma-separated dgn args campuran |
| SA18f | `data-archive.js`, `vehicle-core.js`, `cobek-order.js`, `filter-laporan.js`, `tukang-absensi.js`, `car-notes.js` | 6 | 5 titik pola standar (literal+`$el`/`$value`/literal) + **1 titik `vehicle-core.js` BUKAN pemanggilan fungsi bernama** (`onkeydown="if(event.key==='Enter'){this.blur();}else if(...)"`) — perlu bikin 1 fungsi named baru dulu sebelum bisa dimigrasi ke `data-onkeydown`, beda kelas risiko dari titik lain (bukan 0-logic pure attribute swap) |

Total 6+5+6+4+4+6 = 31, cocok dgn hasil audit ulang.

## Perubahan sesi ini (SA18a)

`modules/asset/aset-reports.js`, objek `Penyusutan` (kartu "📉 Penyusutan
Aset" di Laporan Aset), 6 titik — semua di `renderList()`:

1-2. Garis Lurus: `onchange="Penyusutan.updateParam('id','umurManfaatTahun',this.value)"` / `...'nilaiResidu'...` →
     `data-onchange="Penyusutan.updateParam" data-onchange-args='[id,"umurManfaatTahun","$value"]'` (id literal via `escapeHtml(JSON.stringify([...]))`)
3-4. Saldo Menurun: sama pola, field `tarifPersen`/`nilaiResidu`
5. Select Metode: `onchange="Penyusutan.updateParam('id','metode',this.value)"` → pola sama
6. Checkbox Aktif: `onchange="Penyusutan.toggleAktif('id')"` →
   `data-onchange="Penyusutan.toggleAktif" data-onchange-args='["id"]'`
   (1 literal saja — `toggleAktif()` baca/tulis `a.penyusutan.aktif` sendiri,
   TIDAK butuh `$checked`, pola sama `DashboardSettings.reorderCard` di SA16)

0 perubahan logic — `Penyusutan.updateParam()`/`Penyusutan.toggleAktif()`
tidak disentuh sama sekali.

## Test

Baru: `tests/sa18a-aset-reports-penyusutan-dynamic-inline-attr.test.js`
(10 test) — gate statis 0 inline tersisa, gate sanity regex, gate string
literal tepat 6 titik data-onchange baru di source, 3 test markup nyata
(garisLurus/saldoMenurun/select+checkbox lewat `Penyusutan.renderList()`
ASLI, bukan re-implementasi), + 4 test end-to-end lewat dispatcher ASLI
(`_dataActionInputChangeHandler`, diekstrak dari source yang sama persis,
tidak diubah) — termasuk verifikasi khusus `toggleAktif()` benar-benar
TIDAK butuh `$checked` (test sengaja tidak mengisi `el.checked` sama
sekali, tetap benar karena fungsi baca state internal, bukan dari event).

Regresi: 0 — grep lintas `tests/*.test.js` utk `onchange=.*Penyusutan`/
`toggleAktif(`/`updateParam(` sebelum migrasi hanya menemukan referensi
di komentar/nama-test 2 file (`property-management-api-per-item-guard.test.js`,
`s705-aset-report-cards-trycatch-guard.test.js`), tidak ada yg meng-assert
markup inline lama.

`node --test tests/*.test.js` → **5799 pass, 0 fail** (5789 + 10 baru).

## Build

v1598 → v1599. `node scripts/build.js` sungguhan dijalankan (bukan ditulis
manual). `verify-window-expose.js`: OK, 78 modul. `verify-bundle-freshness.js`:
OK, kedua bundle segar.

## Status lint & release gate

Tidak tersedia, di-override — eslint & esbuild tidak bisa
dijalankan/diinstall di sandbox ini (tanpa akses jaringan). Override
ke-**10** berturut-turut untuk gate `lint`/`minify` yang sama, dicatat di
`docs/RELEASE-GATE-LOG.md` (entry `2026-09-08T01:56:42.535Z — versi
s1599-...`).

## Progress epic S1588

SA11-SA17 TUNTAS (87 titik) + SA18a TUNTAS (6 titik) = **93 dari 123** titik
audit awal (**91 dari 113** titik nyata setelah dikurangi 10 false-positif
komentar yang ditemukan di SA17 + SA18: 5 di SA17, 6 titik-per-file namun
0 titik nyata sepenuhnya di 6 file SA18 audit ulang — lihat rincian di
atas). Sisa: SA18b-SA18f (25 titik nyata, 13 file).

## Belum diuji di browser sungguhan

Sandbox ini tidak ada akses browser — kalau W punya kesempatan, coba buka
Laporan Aset → kartu "📉 Penyusutan Aset" → aktifkan penyusutan 1 aset →
ubah Metode/Umur Manfaat/Nilai Residu/Tarif di Chrome/Edge/Firefox versi
lama vs baru untuk konfirmasi independen migrasi ini benar di bawah CSP
`script-src-attr 'none'`.

## Next TODO

SA18b — `dana-titipan-portfolio-render.js` (5 titik, filter bar identik
pola SA14a/SA14b) — sesi berikutnya sesuai urutan rencana di atas.
