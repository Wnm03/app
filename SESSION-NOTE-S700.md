# SESSION-NOTE-S700 — Sinkronisasi status BUG-006/BUG-007 di AUDIT_MATRIX.md/KNOWN-ISSUES.md/TODO.md (docs-only, 0 coding)

**Basis akumulasi:** ZIP ini dibangun DI ATAS
`kw-patch-s699-2026-09-01-bug-registry-status-sync.zip` (sinkronisasi
status BUG-FIN-001/BUG-001–005 di `BUG_REGISTRY.md`/`KNOWN-ISSUES.md`/
`AUDIT_MATRIX.md`, versi tetap 1512). Timpa semua file di ZIP ini ke
project asli.

## Konteks

Item ini adalah yang tertunda dari SESSION-NOTE-S699 (poin "Belum
dikerjakan"): `docs/AUDIT_MATRIX.md` baris `Debt.syncBill()` (BUG-006)
dan `revertBillFromDeletedTx()` (BUG-007) masih tercatat "Bug — OPEN",
padahal `docs/BUG_REGISTRY.md` sendiri sudah menandai keduanya **FIXED**
sejak koreksi sesi S657 — staleness yang SAMA PERSIS dgn pola yang
dibereskan S699 untuk BUG-001–005/FIN-001, cuma belum diverifikasi ulang
& dikoreksi.

## Verifikasi (langsung ke source, bukan cuma percaya dokumen lain)

- **BUG-006** — `modules/finance/piutang-utang.js` baris 681, komentar
  `FIX (BUG-006, audit 2026-08)` di `Debt.syncBill()`: memanggil
  `removeOrphanedAutoPiutangForBill()` sebelum tagihan auto dihapus dari
  `D.bills`. Regression test `tests/bug006-syncbill-orphan-piutang.test.js`
  (4 test) sudah ada di tree.
- **BUG-007** — `modules/finance/tagihan-kalender.js` baris 815, komentar
  `FIX (BUG-007, audit 2026-08)` di `revertBillFromDeletedTx()`: pakai
  snapshot `debtNilaiBefore` (saldo utang SEBELUM payAmount dikurangkan,
  ditulis `markBillPaid()`) utk restore EXACT, fallback ke `+t.amount`
  lama utk transaksi lama yang belum punya field ini. Regression test
  `tests/bug007-overpayment-revert-debt.test.js` sudah ada di tree.

Saat verifikasi, ditemukan juga **2 baris `TODO.md` yang stale dengan
pola sama**: 2 sub-item "Tambah regression test..." untuk BUG-006/BUG-007
(bagian "Bill/Piutang/Debt — Sesi Audit-Docs 2 (lanjutan)") masih tertulis
`OPEN`, padahal test yang diminta SUDAH ADA (dua file di atas) — cuma
baris tabelnya tidak pernah diupdate. Dikoreksi sesi ini juga (di luar
scope awal `AUDIT_MATRIX.md`, tapi ditemukan pas verifikasi source yang
sama, jadi sekalian dibereskan — pola sama S487 yang juga menemukan &
membereskan item stale tambahan di luar target awal saat sesi berjalan).

## Fix (docs-only, 0 source disentuh)

- `docs/AUDIT_MATRIX.md` — 2 baris tabel §7 (`Debt.syncBill()`,
  `revertBillFromDeletedTx()`) diubah klasifikasi "Bug — OPEN" → "Bug —
  FIXED", dengan catatan disinkronkan sesi S700. Baris `deleteBillHistoryTx()`
  (yang mewarisi lewat SSOT) disesuaikan teksnya ("inherits BUG-007" →
  "inherits fix", karena BUG-007 sendiri sudah FIXED, bukan lagi bug
  aktif yang diwarisi).
- `docs/KNOWN-ISSUES.md` — §7 ("Business Logic — Bill/Piutang/Debt,
  lanjutan") diubah dari 🔴 OPEN jadi ✅ FIXED utk BUG-006/BUG-007, dengan
  catatan update sesi S700 di header bagian (pola sama §6 yang dikoreksi
  S699).
- `TODO.md` — 2 baris "Tambah regression test..." (BUG-006/BUG-007) di
  bagian "Bill/Piutang/Debt — Sesi Audit-Docs 2 (lanjutan)" diubah `OPEN`
  → `✅ DONE`, disitasi ke test file yang sudah ada.

## Test & Build

0 file source (`modules/`, `index.html`, dll) disentuh — murni 3 file
docs (`docs/AUDIT_MATRIX.md`, `docs/KNOWN-ISSUES.md`, `TODO.md`). Full
suite dijalankan ulang sebagai verifikasi rutin (tidak diharapkan
berubah): **5273/5273 pass, 0 fail** (sama seperti akhir S699/S698).
`node scripts/build.js` **TIDAK dijalankan** (versi tetap 1512, konsisten
dgn konvensi sesi docs-only — sama seperti S699).

## File yang berubah di ZIP ini

- `docs/AUDIT_MATRIX.md` — **fix utama sesi ini**: 2 baris §7 disinkronkan
  OPEN → FIXED (BUG-006, BUG-007) + 5 baris §7 dari S699 (BUG-FIN-001,
  BUG-001, BUG-003, BUG-004, BUG-005) tetap dipertahankan
- `docs/KNOWN-ISSUES.md` — **fix utama sesi ini**: §7 disinkronkan sama;
  §6 dari S699 tetap dipertahankan
- `TODO.md` — **fix utama sesi ini** (baru masuk ZIP akumulasi, belum
  pernah di-include patch sebelumnya): 2 baris regression-test BUG-006/
  BUG-007 disinkronkan OPEN → DONE
- `docs/BUG_REGISTRY.md` — dari S699, dipertahankan APA ADANYA (sudah
  benar sejak S657/S699, tidak perlu diubah lagi sesi ini)
- `SESSION-NOTE-S700.md` — baru
- Semua file source/bundle/test dari S698 (v1512) — dipertahankan APA
  ADANYA, TIDAK disentuh sesi ini

## Belum dikerjakan (di luar scope sesi ini, tetap di daftar audit)

- Sisa entri `BUG_REGISTRY.md` di luar §0a/§0a-2 (mis. `BUG-INV-001` yang
  MEMANG masih genuinely OPEN, ditandai Fase 1-3/4 selesai) — belum
  diaudit ulang, kemungkinan ada staleness serupa di dokumen lain yang
  mereferensikannya (belum dicek).
- `economic-intelligence/` — belum disentuh.
- Penghapusan file dead `modules/modules-render.js` (dan file dead lain
  di `scripts/remove-shop-dead-files.sh`) — masih menunggu keputusan
  user.
- Restore `esbuild` / pemecahan `scripts/build.js` (2444 baris, di atas
  ambang 1600) — belum dikerjakan (butuh akses jaringan, di luar sandbox
  ini).
