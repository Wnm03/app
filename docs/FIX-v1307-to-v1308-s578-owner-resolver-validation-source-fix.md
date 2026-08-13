# FIX-v1307-to-v1308-s578-owner-resolver-validation-source-fix.md

## Sesi
S578 — implementasi **DL-Next-1** (satu-satunya item yang di-lock sebagai
FIX di `DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md`, ref
`AUDIT-1-7-OWNER-RESOLVER-LANJUTAN.md` §Audit-3A). 1 sesi, 1 fokus, 1 ZIP —
sesuai urutan eksekusi yang dikunci: Design Lock → **implement 3A saja** →
regression → Audit-8–11.

## Bug yang diperbaiki
Guard wajib-pilih "Pemilik Sumber Potongan" di `_saveTxInner()`
(`modules/finance/transaksi.js`, S574-D1) memakai `getAccOwners(accId).
isMultiOwner` sebagai basis validasi — fungsi ini **hanya** membaca
`acc.owners[]`/`acc.ownership`, tidak pernah mengecek aset tertaut.
Sementara UI (`updateTxDeductionOwnerVisibility()`, Sesi Res-C) sudah
memakai `resolveOwnerDefaultForAccount(accId)`, yang IKUT membaca aset
tertaut lewat `findLinkedAssetForAccount()` → `MultiOwnerEngine.
getOwners()`.

**Skenario yang lolos validasi (sebelum fix):** akun belum pernah punya
`acc.owners[]` sendiri (belum pernah klik "Jadikan permanen"), tapi
tertaut ke aset multi-owner valid via `a.accountId`. UI menampilkan
dropdown wajib pilih (2+ kandidat dari aset), tapi validasi simpan lama
tidak terpicu (`getAccOwners()` buta terhadap aset tertaut) →
transaksi **tersimpan tanpa `deductionOwnerId`**, walau UI sendiri
menyatakan wajib pilih. Kontradiksi UI-vs-validasi, silent (0 toast/warning
tambahan saat gap ini terjadi).

## Perubahan
- `modules/finance/transaksi.js` — 1 blok diganti (guard di `_saveTxInner()`,
  sekitar baris ~1104-1115 versi lama): basis validasi diganti dari
  `getAccOwners(accId).isMultiOwner` ke `resolveOwnerDefaultForAccount(accId).
  owners.length>1`. **Sumber sama persis** dengan yang dipakai UI. Komentar
  lama diperluas menjelaskan alasan & referensi Design Lock.
- **Yang SENGAJA tidak diubah** (sesuai lock):
  - Aturan pemilihan owner (Design Lock §2.1/§2.2 lama) — 0 tie-break
    otomatis tetap 0 tie-break otomatis, `autoSelectId` tetap hanya terisi
    kalau `owners.length===1`.
  - `getAccOwners()` sendiri — fungsi ini tetap ada apa adanya, dipakai di
    tempat lain (S574-A), tidak dihapus/diubah. Hanya pemanggilannya di
    guard `_saveTxInner()` yang diganti ke `resolveOwnerDefaultForAccount()`.
  - `baseBalance`/`ownership` akun — 0 sentuhan (di luar scope DL-Next-1,
    dan Design Lock secara eksplisit menolak reset otomatis di DL-Next-3).
  - `ownerPorsiId` — tetap terpisah dari `deductionOwnerId`, 0 sentuhan.
  - DL-Next-2 (7 jalur CREATE non-modal), DL-Next-3 (echo basi
    unlink/hapus aset), DL-Next-5 (dead file housekeeping) — **tidak
    disentuh sesi ini**, sesuai status masing-masing di Design Lock.

## Test
- `tests/s578-dl-next-1-deduction-owner-validation-source.test.js`
  (**baru**, 3 test case, TDD RED→GREEN):
  1. RED sebelum fix / GREEN sesudah fix: akun tanpa `acc.owners[]` sendiri
     + tertaut aset multi-owner valid + tidak pilih owner → save **wajib
     ditolak** (sebelum fix: lolos tersimpan, membuktikan bug persis
     seperti temuan audit).
  2. Kombinasi sama, user **memilih** owner → save berhasil,
     `deductionOwnerId` tersimpan sesuai pilihan (memastikan fix tidak
     overblocking).
  3. Regresi negatif: akun single-owner murni (0 `acc.owners[]`, 0 aset
     tertaut) → guard tidak terpicu, save tetap lolos tanpa
     `deductionOwnerId` (perilaku lama untuk akun biasa tidak berubah).

## Verifikasi
- `node --test tests/s578-dl-next-1-deduction-owner-validation-source.test.js`
  → **3/3 lolos** (RED dikonfirmasi gagal sebelum fix diterapkan, GREEN
  setelahnya).
- Full `node --test tests/*.test.js` → **4069 test, 4060 pass, 9 fail** —
  naik dari baseline 4066/4057/9 (+3 test baru, semua pass). Ke-9
  kegagalan **identik** dengan baseline sebelum sesi ini (self-link
  `data-health-check.js` S559, `s551` investment-nominal stale,
  `s574` filter-tx-owner-split legacy) — **0 kegagalan baru, 0 regresi**.
- Invariant wajib tidak disentuh sama sekali sesi ini: `modules/finance/
  akun.js`, `modules/finance/dana-titipan-aggregation-api.js`,
  `modules/shared/multi-owner-engine.js`, `modules/shop/
  multi-owner-engine.js` — **0 file ini diedit** (hanya `modules/finance/
  transaksi.js` yang disentuh, satu-satunya file source produksi sesi ini).
- Build: `s577-res-d-regression-release` → `s578-dl-next-1-owner-resolver-
  validation-fix`, v1307 → v1308. `verify-bundle-freshness`/
  `verify-window-expose` lolos. `verify-release-ready` **LOLOS** (gate
  lint/minify di-override manual, alasan sandbox tanpa akses jaringan —
  konsisten S424 dst, dicatat di `docs/RELEASE-GATE-LOG.md`).

## Urutan berikutnya
Sesuai Design Lock: sesi ini menutup **implement 3A**. Langkah berikutnya
adalah **Audit-8–11** (regresi Dana Titipan, consumer owner, recalculation
CREATE/EDIT/DELETE, backward compatibility) — belum dikerjakan sesi ini.
DL-Next-2/3/5 tetap di luar rantai eksekusi ini, tidak dijadwalkan otomatis
oleh penyelesaian sesi ini.
