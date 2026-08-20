# Sesi S651 — Stale-doc cleanup TODO.md (BUG-006 s/d BUG-013)

## Konteks

Rekomendasi dari catatan sesi S650: `TODO.md` masih menandai
BUG-006/007/009/010/011/012/013 sebagai **OPEN** padahal semuanya sudah
**DONE** di source — sebagian karena sudah lama fix (BUG-006/007/011,
dikonfirmasi audit S646, tidak pernah disinkron ke TODO.md), sebagian
karena baru fix di sesi S646–S650. Pola stale-doc yang sama persis dengan
cleanup Sesi 487 (lihat catatan di baris atas file ini).

**0 perubahan logic/behavior sesi ini — murni sinkronisasi dokumentasi**
ke kondisi source yang sebenarnya. Tidak ada file kode (`modules/*.js`)
yang disentuh, tidak ada test baru (tidak relevan untuk perubahan
dokumentasi).

## Yang diubah

`TODO.md`:
1. Tambah catatan ringkasan sesi di baris atas (pola sama catatan Sesi
   487), menjelaskan status sebelum/sesudah cleanup.
2. Update status ke ✅ DONE + referensi sesi/file/test untuk:
   - **BUG-006** (`Debt.syncBill()` orphan piutang) — sudah fix sebelum
     audit S646, komentar `FIX (BUG-006, audit 2026-08)` di
     `piutang-utang.js`.
   - **BUG-007** (`revertBillFromDeletedTx()` overpay clamp) — sudah fix
     sebelum audit S646, komentar `FIX (BUG-007, audit 2026-08)` di
     `tagihan-kalender.js`.
   - **BUG-008** (`WorthIt.catatBeli()` cicilan/DP) — sesi S646.
   - **BUG-009** (`toggleKeuFilter()` panel state) — sesi S647.
   - **BUG-010** (`showFilteredTx()` search scope keuangan) — sesi S648.
   - **BUG-011** (`goToList()` hardcode index tab) — sudah fix sebelum
     audit S646, `goToList()` sudah pakai `SHOP_TAB_ORDER.indexOf()`/
     `CN_TAB_ORDER.indexOf()`.
   - **BUG-012** (`FinanceIntelligence.invalidateCache()` di
     `changeMonth()`) — sesi S649, termasuk baris regression-test terkait.
   - **BUG-013** (`_emergencyFundRisk()` saldo real-time) — sesi S650,
     termasuk baris regression-test terkait.
3. Baris "Tambah test unit langsung untuk `_debtRisk()`/... /`summary()`"
   (item improvement tanpa nomor bug, di blok Financial Risk Dashboard)
   ditandai ✅ SEBAGIAN — `tests/financial-risk-dashboard-api.test.js`
   (sudah ada sebelum sesi ini) ternyata sudah cover semua fungsi yang
   disebut, ditambah `tests/s650-...test.js` menambah cakupan
   `_emergencyFundRisk()` — catatan ini sendiri sebaiknya dihapus/
   disederhanakan di sesi cleanup berikutnya (di luar cakupan patch-only
   sesi ini, murni observasi).

Baris regression-test "Low (setelah fix di atas)" untuk BUG-006/007
(`tests/s291-delTx-bill-sync.test.js` overpayment + analog
`removeOrphanedAutoPiutangForBill`) **dibiarkan OPEN** — belum
dikonfirmasi ada test khusus untuk skenario itu; di luar cakupan audit
cepat sesi ini (perlu baca isi test file, bukan cuma cek komentar `FIX`
di source).

## Full suite

`node --test tests/*.test.js` → **4653/4653 pass**, 0 fail (tidak
berubah dari sesi sebelumnya — sesuai ekspektasi, sesi ini tidak
menyentuh kode).

## File yang berubah (patch-only)

```
TODO.md    (edit — dokumentasi saja, 0 perubahan kode)
```

## Sesi berikutnya (rekomendasi)

Lanjut **Blok E — Data Health** (backup 2026-08-16) sesuai
`RENCANA-IMPLEMENTASI-S646-S664.md`, tapi audit dulu status masing2
langsung ke source/data (pola sama audit S646) sebelum eksekusi:
- S652: Pemilik Sumber Potongan hilang (8 warning) — akun "Saldo
  tagihan"/proyek Renov.
- S653: Aset "Majoris" kepemilikan ganda (1 warning).
- S654: Item Renovasi akun tidak valid (7 warning).
- S655: Anggaran "Pulsa/Kuota" kategori tidak valid (1 warning).
- Juga masih OPEN, belum masuk urutan sesi manapun: baris "Low (setelah
  fix di atas)" regression test BUG-006/007 di atas — bisa jadi 1 sesi
  kecil sendiri kalau prioritasnya naik.
