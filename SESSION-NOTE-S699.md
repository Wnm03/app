# SESSION-NOTE-S699 — Sinkronisasi status BUG-001–005/BUG-FIN-001 di dokumen audit (docs-only, 0 coding)

**Basis akumulasi:** ZIP ini dibangun DI ATAS
`kw-patch-s698-2026-09-01-dashboard-kategori-click-tosource.zip` (kategori
dashboard ringkasan dapat pola klik-ke-sumber, versi 1512). Timpa semua
file di ZIP ini ke project asli.

## Konteks

Item ini dari daftar ide lanjutan: "Lanjutkan audit `BUG_REGISTRY.md` —
kalau masih ada entri OPEN yang belum diverifikasi ulang pasca-disiplin
S656."

Audit dimulai dari `docs/BUG_REGISTRY.md` §0a (6 entri berstatus OPEN:
BUG-FIN-001, BUG-001 s/d BUG-005). Tiap entri diverifikasi LANGSUNG ke
source (bukan cuma percaya `TODO.md`):

- **BUG-FIN-001** (validasi nilai positif `Piutang.save()`/`Debt.save()`)
  — `modules/finance/piutang-utang.js` sudah punya komentar
  `FIX (BUG-FIN-001)` di `Debt._saveInner`/`Piutang._saveInner`.
- **BUG-001** (`_saveBillInner()` tidak pakai
  `countFallbackBillPaymentCandidates()`) — sudah dipanggil di
  `modules/finance/tagihan-kalender.js` (guard `<=1` sebelum self-heal).
- **BUG-002** (mismatch `tx.amount` vs "Jumlah Total per Periode") —
  komentar `FIX (BUG-002, sesi 342)` sudah ada, kirim `amt` bukan
  `rawAmt`.
- **BUG-003** (interaksi `_saveBillInner()` ↔
  `syncOutstandingSharedPiutang()`) — komentar `FIX (BUG-003, sesi 339)`
  sudah ada, guard `!billEditFromArchive`.
- **BUG-004** (`markBillPaid()`/`pmIcons` kind `"utang"`) — sudah
  diperbaiki di sesi 487 (`FIX-v1215-to-v1216-s487-...md`), regression
  test `tests/s487-txhtml-pmicons-tagihan-utang-badge.test.js` (6 test)
  sudah ada di tree.
- **BUG-005** (`delBillArchive()` tidak panggil `refreshBillEverywhere()`)
  — `modules/finance/tagihan-kalender.js` sudah memanggil
  `save();refreshBillEverywhere();` setelah hapus arsip.

**Kenapa OPEN padahal sudah fixed:** `TODO.md` sendiri sudah mencatat
ke-6 item ini sebagai DONE sejak sesi 487 (lihat catatan "Update Sesi
487" di `TODO.md`), TAPI 3 dokumen lain yang juga mengklaim status
(`docs/BUG_REGISTRY.md`, `docs/KNOWN-ISSUES.md`, `docs/AUDIT_MATRIX.md`)
tidak pernah ikut disinkronkan — persis pola stale-doc yang sudah
ditemukan & dibereskan untuk BUG-006/BUG-007/GAP3-AUD-001 di sesi-sesi
lampau (lihat entri BUG-006 di `BUG_REGISTRY.md` sebagai referensi pola
penutupan). Sesi ini menerapkan pola koreksi yang sama ke 6 entri
tersisa.

## Fix (docs-only, 0 source disentuh)

- `docs/BUG_REGISTRY.md` — status BUG-FIN-001, BUG-001, BUG-002, BUG-003,
  BUG-005 diubah OPEN → **FIXED**, entri asli (Judul/Root Cause/Impact/dst)
  TIDAK diedit (histori audit dipertahankan), baris Status baru ditambah
  dengan sitasi lokasi fix + full-suite count, pola sama persis entri
  BUG-006/BUG-007/BUG-008 dst yang sudah ada. BUG-004 juga dikoreksi jadi
  FIXED dengan sitasi sesi 487 + regression test yang sudah ada.
- `docs/KNOWN-ISSUES.md` — bagian "§6 Business Logic — Bill/Piutang/Debt"
  diubah dari daftar 🔴 OPEN jadi ✅ FIXED utk ke-6 item, dengan catatan
  update sesi S699 di header bagian.
- `docs/AUDIT_MATRIX.md` — 5 baris tabel (`Piutang.save()`, `Debt.save()`,
  `_saveBillInner()`, `markBillPaid()`, `delBillArchive()`) diubah
  klasifikasi "Bug — OPEN" → "Bug — FIXED".

**Tidak diubah sesi ini (di luar cakupan, dicatat di bawah):**
`docs/AUDIT_MATRIX.md` baris `Debt.syncBill()` (BUG-006) dan
`revertBillFromDeletedTx()` (BUG-007) MASIH tercatat "Bug — OPEN" di
tabel itu, padahal `BUG_REGISTRY.md` sendiri sudah menandai keduanya
FIXED sejak sesi S657 — staleness yang SAMA, tapi belum diverifikasi
ulang & dikoreksi sesi ini (fokus sesi ini murni 6 entri §0a yang
diminta). Kandidat kuat sesi audit-docs berikutnya.

## Test & Build

0 file source (`modules/`, `index.html`, dll) disentuh — murni 3 file
`docs/*.md`. Full suite dijalankan ulang sebagai verifikasi rutin (tidak
diharapkan berubah): **5273/5273 pass, 0 fail** (sama seperti akhir S698).
`node scripts/build.js` **TIDAK dijalankan** (versi tetap 1512, konsisten
dgn konvensi sesi docs-only sebelumnya — lihat pola "Sesi 59/60/67
(docs-only, 0 coding)" di `docs/CLAUDE.md`, tidak ada bump versi kalau 0
source berubah).

## File yang berubah di ZIP ini

- `docs/BUG_REGISTRY.md` — **fix utama sesi ini**: status 6 entri
  (BUG-FIN-001, BUG-001 s/d BUG-005) disinkronkan OPEN → FIXED
- `docs/KNOWN-ISSUES.md` — **fix utama sesi ini**: §6 disinkronkan sama
- `docs/AUDIT_MATRIX.md` — **fix utama sesi ini**: 5 baris tabel §7
  disinkronkan sama
- `SESSION-NOTE-S699.md` — baru
- Semua file source/bundle/test dari S698 (v1512) — dipertahankan APA
  ADANYA, TIDAK disentuh sesi ini (0 perubahan logic, jadi tidak perlu
  di-include ulang kecuali sebagai bagian akumulasi ZIP — lihat daftar
  file di bawah)

## Belum dikerjakan (di luar scope sesi ini, tetap di daftar audit)

- `docs/AUDIT_MATRIX.md` baris BUG-006 (`Debt.syncBill()`) & BUG-007
  (`revertBillFromDeletedTx()`) — masih tercatat "Bug — OPEN", padahal
  `BUG_REGISTRY.md` sudah FIXED sejak S657. Staleness sama, belum
  dikoreksi sesi ini.
- Sisa entri `BUG_REGISTRY.md` di luar §0a (mis. `BUG-INV-001` yang
  MEMANG masih genuinely OPEN, ditandai Fase 1-3/4 selesai) — belum
  diaudit ulang sesi ini, di luar cakupan "6 entri §0a" yang diminta.
- "Semua Transaksi" (`changeTxListMonth`) — **sudah terverifikasi TIDAK
  ada bug (S696 sudah membereskan chip hari/minggu/tahun full-period)**,
  item ini bisa dicoret dari daftar audit lanjutan.
- `renderGrafik()` (chart Laporan "Grafik 6 Bulan") — **sudah
  diverifikasi: BY DESIGN selalu tampilkan 6 bulan terakhir dari bulan
  berjalan (judul kartu eksplisit "Grafik 6 Bulan"), TIDAK mengikuti
  `lapMonthOffset`/`getRange()` — bukan bug**, item ini bisa dicoret dari
  daftar audit lanjutan.
- `economic-intelligence/` — belum disentuh.
- Penghapusan file dead `modules/modules-render.js` (dan file dead lain
  di `scripts/remove-shop-dead-files.sh`) — masih menunggu keputusan
  user.
- Restore `esbuild` / pemecahan `scripts/build.js` (2444 baris, di atas
  ambang 1600) — belum dikerjakan (butuh akses jaringan, di luar sandbox
  ini).
