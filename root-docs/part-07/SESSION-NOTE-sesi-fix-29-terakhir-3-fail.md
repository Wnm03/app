# Sesi Perbaikan 3 Failure Terakhir (follow-up dari PATCH-AKUMULASI-S02-S31-S41-S42-FINAL-29FIX-OVERLAY-VERIFIED)

Basis: `PATCH-AKUMULASI-S02-S31-S41-S42-FINAL-29FIX-OVERLAY-VERIFIED.zip` (60 file,
termasuk `PATCH-RECONSTRUCTION-REPORT.md`) di-overlay ke `app-main` baseline yang
diupload bersamaan.

Full test run SEBELUM sesi ini (patch lama + baseline): **6596 tests, 6593 pass,
3 fail** -- persis 3 failure yang diminta untuk diperbaiki:

1. `tests/servis-edit-reminder-tab-sot.test.js`
2. `tests/servis-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js`
3. `tests/virtual-bill-manual-scenario-s468d.test.js`

Full test run SESUDAH sesi ini: **6596 tests, 6596 pass, 0 fail, 0 regresi**
(diverifikasi 2x: sekali di overlay kerja, sekali lagi dari overlay BERSIH baru
[baseline murni + accumulated patch] untuk memastikan patch accumulated ini
benar-benar self-contained).

## Root cause & fix per failure

### 1. `servis-edit-reminder-tab-sot.test.js`
Dua penyebab terpisah:
- Test membaca file yang salah: `modules/modals.js` (file orphan peninggalan
  restrukturisasi folder Sesi 17-18 -- sudah didokumentasikan sebagai orphan
  oleh test lain, `findvehiclespec-modelid-followup-renderb-tirepressure.test.js`
  baris 17). File SoT yang benar & dipakai runtime adalah
  `modules/shared/modals.js`.
- Setelah path dibetulkan, markup HTML tab Detail/Pengingat
  (`servisEditTabs`/`servisDetailPanel`/`servisReminderPanel`) memang BELUM
  ada di `modules/shared/modals.js` -- padahal sisi JS-nya
  (`Servis.setEditTab()`, `Servis.renderEditReminderTab()` di `car-notes.js`)
  sudah lengkap dari Sesi 4A. Ini genuinely pekerjaan yang belum selesai
  ("modal shell sedang dikerjakan"), bukan sekadar test lama.

**Fix:**
- `modules/shared/modals.js` (PRODUCTION): tambah tab bar (`servisEditTabs`,
  tombol `servisEditTabDetail`/`servisEditTabReminder` dgn
  `data-action="Servis.setEditTab"`) + bungkus konten form lama ke dalam
  `servisDetailPanel`, tambah `servisReminderPanel` kosong (diisi JS saat tab
  Pengingat aktif). 0 perubahan pada isi form yang sudah ada -- murni
  menambahkan wrapper + tab bar di sekitarnya.
- `tests/servis-edit-reminder-tab-sot.test.js` (TEST-CONTRACT): perbaiki path
  baca dari `modules/modals.js` -> `modules/shared/modals.js` (mengikuti
  konvensi SEMUA test lain yang menyentuh modal HTML).

### 2. `servis-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js`
Dua penyebab terpisah, keduanya test-contract (0 source direvert):
- Sesi UX (sebelum sesi ini) SENGAJA mengubah filter kategori master Riwayat
  Servis dari chip row jadi dropdown `<select>`, dan label opsi
  "tidak terklasifikasi" berubah dari "❔ Belum Terklasifikasi" (istilah
  chip-era) jadi "❔ Belum dikategorikan" (istilah dropdown). Pola ini SUDAH
  didokumentasikan di `PATCH-RECONSTRUCTION-REPORT.md` ("Updated tests to
  follow the current dropdown-based master-category UX").
- `renderList()` sekarang menyisipkan 3 row lewat `insertAdjacentElement('beforebegin', ...)`
  (`renderActionTypeChips`, `renderMasterCategoryChips`,
  `renderServiceComponentFilter` -- yang terakhir ditambahkan belakangan).
  Mock `document` di test ini hanya melacak 2 panggilan pertama secara
  posisional, jadi panggilan ke-3 (`servisComponentFilterWrap`) menimpa
  balik referensi row master-category.

**Fix (test-contract only):**
- Assersi teks diupdate ke "❔ Belum dikategorikan" (UX saat ini).
- Mock `insertAdjacentElement` sekarang routing berdasarkan `node.id` (yang
  sudah di-set SEBELUM `insertAdjacentElement()` dipanggil di masing-masing
  fungsi render sumber), bukan posisi/urutan panggilan -- robust terhadap
  penambahan row baru di masa depan.

### 3. `virtual-bill-manual-scenario-s468d.test.js`
Test-contract only (0 source direvert). Tap kartu tagihan virtual dulunya
membuka `openBillModal()`; sesi sebelumnya SENGAJA mengubah routing tap jadi
langsung memanggil `markBillPaid()` (tombol "Bayar sekarang" yang sama persis
dipakai tombol ✅, lihat komentar di `modules/finance/tx-list-cashflow.js`
baris ~73). Pola ini juga SUDAH didokumentasikan di
`PATCH-RECONSTRUCTION-REPORT.md` ("Updated virtual-bill test to assert the
current `markBillPaid` action").

**Fix (test-contract only):** assersi `data-action="openBillModal"` diganti
`data-action="markBillPaid"`.

## Files diubah/ditambah sesi ini (delta, di atas 60 file patch sebelumnya)
- `modules/shared/modals.js` (PRODUCTION fix -- tab markup, lihat #1 di atas)
- `tests/servis-edit-reminder-tab-sot.test.js` (test-contract, path fix)
- `tests/servis-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js` (test-contract)
- `tests/virtual-bill-manual-scenario-s468d.test.js` (test-contract)

Semua 60 file dari patch sebelumnya (termasuk exclusion list & special-merge
`sparepart-servis-b.js`) DIPERTAHANKAN APA ADANYA -- 0 file dihapus/di-downgrade.

## Validasi
1. Overlay patch lama (60 file) + baseline `app-main` upload sesi ini ->
   6596 tests, 6593 pass, 3 fail (identik dgn laporan user).
2. Terapkan fix di atas -> 6596 tests, 6596 pass, 0 fail.
3. Re-verifikasi dari overlay BERSIH baru (baseline murni + accumulated patch
   62 file sesi ini) -> 6596 tests, 6596 pass, 0 fail (patch accumulated
   terbukti self-contained, tidak bergantung pada state overlay kerja
   sebelumnya).

Patch tetap berupa PATCH package (bukan FULL RELEASE) -- tidak menggantikan
baseline.
