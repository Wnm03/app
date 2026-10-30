# FIX — Bug Delete Utang "🔒 Titipan" Balik Lagi (Audit 2026-08)

**Status: FIXED & VERIFIED**

## Ringkasan bug

Baris Buku Utang yang muncul dari porsi kepemilikan Aset/Akun/Investasi
patungan (badge "🔒 Titipan") tampak berhasil dihapus (tidak ada error),
tapi baris itu **muncul lagi** setelah render berikutnya.

## Root cause

Baris titipan itu **auto-generate ulang oleh `save()` itu sendiri**, lewat:

- `Aset._syncOwnerDebts()`
- `Investment._syncTitipanDebt()`
- `TitipanSync.reconcileAccounts()`

Ketiganya dipanggil dari dalam `save()` (gerbang tunggal). Urutan bug lama:

1. Tap 🗑 pada baris titipan → confirm → dihapus dari `D.debts`.
2. `save()` dipanggil → **sukses** (tidak error).
3. `save()` sendiri langsung memanggil ulang sync di atas, yang mendeteksi
   aset/akun/investasi sumbernya masih punya owner non-SELF berporsi > 0 →
   baris utang itu **dibuat lagi** sebelum render berikutnya.

Utang manual (bukan titipan) **tidak** kena masalah ini — delete-nya normal
karena tidak ada proses sync yang membuatnya ulang.

## Fix (`modules/finance/piutang-utang.js`)

1. **`Debt.delete(id)`** — cegah proses hapus SEBELUM jalan (bukan sesudah)
   kalau baris tertaut (`linkedAssetId` / `linkedInvestmentId` /
   `linkedAccountId`). `askConfirm()` tidak dipanggil sama sekali untuk baris
   ini — langsung `toast()` yang menjelaskan cara benarnya: ubah porsi
   kepemilikan Aset/Akun/Investasi terkait ke 0% atau lepas tautannya.
   Utang manual tetap terhapus permanen seperti biasa (0 regresi).

2. **`Debt.renderList()`** — tombol 🗑 disembunyikan untuk baris titipan,
   diganti ikon 🔒 kecil ber-tooltip (defense in depth, konsisten dengan
   baris "Cicilan Barang" yang memang sudah read-only).

3. **Bonus fix** — badge "🔒 Titipan" sebelumnya cuma cek
   `linkedAssetId`/`linkedInvestmentId`, kelupaan `linkedAccountId` (titipan
   akun, ditulis `TitipanSync.reconcileAccounts()`). Sekarang ikut kecek —
   baris titipan akun sebelumnya lolos tanpa badge & tombol 🗑 masih tampil.

## Verifikasi

`tests/bug-del-titipan-debt-guard.test.js` (7 test, semua PASS):

- Utang manual tetap terhapus permanen.
- Baris titipan aset/investasi/akun **ditolak**, tidak terhapus, toast
  muncul.
- `askConfirm()` tidak pernah terpanggil untuk baris titipan (ditolak
  sebelum konfirmasi).
- `save()` tetap dipanggil untuk delete utang manual (perilaku lama tidak
  berubah).
- Badge "🔒 Titipan" tampil untuk ketiga jenis tautan, termasuk
  `linkedAccountId`.
- Tombol hapus (`data-action="delDebt"`) hanya muncul untuk baris non-titipan.

Full suite: `node --test tests/*.test.js` → **4852/4852 pass**, 0 regresi.

## Catatan tambahan (belum dikerjakan di patch ini)

`app-bundle-a.min.js` dan `app-bundle-b.min.js` di repo basis terdeteksi
basi (`node scripts/verify-bundle-freshness.js` gagal) — di luar cakupan
bug ini. Patch ini **hanya berisi source fix** (`modules/finance/
piutang-utang.js` + test baru); rebuild bundle production perlu dijalankan
terpisah di lokal (`node scripts/build.js`).

---

# ADDENDUM — Bug SERUPA Ditemukan & Diperbaiki di Sisi Piutang

Audit lanjutan (diminta user: "audit apakah ada bug serupa") menemukan pola
identik di `Piutang.delete()` — sebelumnya **0 guard sama sekali**.

## Root cause (Piutang)

Entri piutang otomatis:
- `autoBillId`+`autoTxId` — dari `maybeCreateSharedPiutangFromBill()`
  ("Ditanggung Bersama" tagihan/cicilan)
- `autoTxId`+`autoTitipanOwnerId` — dari `maybeCreateTitipanTalanganPiutang()`
  ("Talangan Dana Titipan")

Idempotency kedua fungsi ini cuma cek "apakah `tx.id` ini SUDAH punya entri
Piutang" (`D.piutang.some(p=>p.autoTxId===txId)`). Kalau user hapus manual
duluan, guard itu **lolos** — begitu transaksi sumbernya (pembayaran
cicilan/tagihan atau transaksi talangan) **diedit & disimpan ulang**
(bukan cuma dibuat baru), entri Piutang dibuat lagi dari nol. Terverifikasi
lewat pembacaan langsung `transaksi.js` (cabang `hasExistingAutoPiutang` &
`applyTxTitipanLinkageOnSave()`) — bukan dugaan.

Beda dari Debt (yang regenerate di **setiap** `save()` lewat
`TitipanSync.reconcileAccounts()`), Piutang regenerate lebih lambat (baru
saat transaksi sumbernya disentuh lagi) — tapi tetap bug kelas yang sama:
delete "tampak sukses", baris balik lagi tanpa peringatan, user kira sudah
permanen terhapus.

## Fix (`modules/finance/piutang-utang.js`)

1. `Piutang.delete(id)` — cegah hapus SEBELUM proses jalan kalau
   `autoBillId`/`autoTxId`/`autoTitipanOwnerId` terisi, toast penjelasan,
   `askConfirm()` tidak dipanggil. Piutang manual tetap terhapus permanen.
2. `Piutang.renderList()` — tombol 🗑 disembunyikan (ganti 🔒) untuk baris
   otomatis, pola sama Debt.
3. Bonus: piutang "Talangan Dana Titipan" (autoTitipanOwnerId tanpa
   autoBillId) sebelumnya **tidak punya badge visual sama sekali** —
   kelihatan identik piutang manual. Sekarang dapat badge "🔒 Talangan Dana
   Titipan — otomatis dari transaksi".

## Verifikasi

`tests/bug-del-titipan-piutang-guard.test.js` (5 test, semua PASS) + full
suite `node --test tests/*.test.js` → **4857/4857 pass**, 0 regresi.

## Bagian lain yang SUDAH diaudit, TIDAK ditemukan bug serupa

Ditelusuri semua `data-action="del*"` di seluruh app (`delAcc`,
`delBillArchive`, `delCat`, `delTarget`, `delVehicle`, `delSim`,
`delReminder`, `delWealthSnapshot`, `delZakatLog`, `delWorkDay`,
`delSparepart`, `delStock`, `delProduct`, `delShop`, `delTx`) — semuanya
data primer milik user langsung, tidak ada mekanisme "auto-generate ulang
dari save()/edit entitas lain" yang menyerupai `_syncOwnerDebts()`/
`maybeCreateSharedPiutangFromBill()`. `D.debts` dan `D.piutang` adalah
SATU-SATUNYA 2 tempat di codebase dengan pola auto-sync lintas modul
semacam ini — keduanya sudah tertangani.

---

# ADDENDUM 2 — Rebuild Bundle Production (S670) + Fix Version Drift

Lanjutan permintaan sesi ini: cek apakah build bisa jalan tanpa esbuild, lalu
rebuild bundle biar fix Debt+Piutang di atas benar-benar aktif di app yang
jalan di HP (bukan cuma di source).

## Temuan

`node scripts/build.js` bisa jalan tanpa esbuild — otomatis fallback ke
bundle tanpa minifikasi (ukuran lebih besar dari build lama, tapi 100%
valid). Tapi build sempat berhenti karena masalah **tidak terkait** fix ini:
2 konstanta versi sudah "kelewat maju" dibanding 3 file lain —
`MODULE_RENDER_VERSION`/`MODULE_CALC_VERSION` di `modules/shared/
modules-render.js`/`modules-calc.js` masih `s672-...` padahal
`bumpVersionEverywhere()` sudah men-sync 3 file lain (`modals.js`,
`chat-action-handlers.js`, `features-helpers-global-security.js`) ke
`s669-...`. Kemungkinan sisa dari sesi kerja sebelumnya yang belum
di-commit rapi.

## Fix

Samakan kedua konstanta ke `s669-cashflow-siklus-legacy-card` (mengikuti
mayoritas 3 file lain), lalu jalankan ulang `node scripts/build.js`.
Build sukses, bump otomatis lanjut ke `s670-cashflow-siklus-legacy-card`
(build number 1415).

## Verifikasi

- `node scripts/verify-bundle-freshness.js` → **kedua bundle segar**
  (hash source cocok).
- `node --check` pada kedua bundle → sintaks valid.
- Full suite `node --test tests/*.test.js` → **4857/4857 pass**, 0 regresi.

## File yang berubah/ditambah sesi ini (di luar fix Debt/Piutang)

- `modules/shared/modules-render.js` — versi disamakan
- `modules/shared/modules-calc.js` — versi disamakan
- `modules/shared/modals.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — ikut ter-bump versi
  (otomatis oleh `bumpVersionEverywhere()`, isi logic 0 berubah)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — REBUILD PENUH (sekarang
  fresh & termasuk fix Debt+Piutang)
- `app_production.html`, `index.html`, `sw.js` — `?v=` & cache name
  di-bump ke 1415
- `FILE-MAP.md`, `COVERAGE-PER-MODULE.md` — regenerasi otomatis

**PENTING:** upload SEMUA file di atas, bukan cuma HTML/sw.js — bundle
lama akan basi lagi kalau cuma sebagian yang diupload (persis peringatan
`build.js` sendiri).
