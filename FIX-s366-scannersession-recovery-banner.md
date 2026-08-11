# FIX s366 — Recovery banner visual tier-3 (lanjutan audit s360-s365)

## Latar belakang
Rekomendasi tier-3 dari `FIX-s362-scannersession-global-watchdog.md`:
watchdog tier-1 (visibilitychange/pageshow/focus) & lint tier-2 (overlay
bypass guard, verify-bundle-freshness) sudah mengurangi risiko state
`scanner-session-active` nyangkut nyaris ke nol, tapi kalau tetap kejadian
(mis. browser sangat lawas tanpa `visibilitychange`), user awam sebelumnya
cuma punya jalan keluar reload penuh atau trik console manual.

## Perbaikan
`modules/shared/scanner-session.js`: poll ringan tiap 3 detik. Kalau
`_scannerSessionActive` sudah `true` lebih dari 10 detik **dan** overlay
scanner sungguhan (`.vehicle-scanner-fullscreen`) sudah tidak ada di DOM
(reuse penuh `_scannerSessionHasLiveOverlay()` yang sudah ada — 0 logic
baru soal "apa itu nyangkut"), tampilkan banner merah mengambang di bawah
layar: **"⚠️ Gangguan terdeteksi — ketuk untuk reset tampilan"**.

Banner ini **sengaja bukan** `.overlay`/`.qs-modal-overlay`/`.calc-overlay`/
`#toast` — style-nya inline murni — itu satu-satunya alasan ia lolos dari
CSS suppression yang sama persis menyembunyikan overlay/toast lain saat
state nyangkut. Tap banner → trigger self-heal (`ScannerSession.isActive()`)
→ banner hilang, UI kembali normal.

Sesi scanner yang **beneran** aktif (overlay masih hidup) tidak pernah
memicu banner ini, berapa lama pun durasinya — hanya kondisi nyangkut yang
memicu.

## Verifikasi
- `tests/scanner-session-recovery-banner.test.js` (baru) — 5/5 pass: tidak
  muncul prematur, muncul setelah >10 detik + overlay mati, TIDAK muncul
  kalau overlay masih live, klik memicu self-heal & banner hilang, banner
  otomatis hilang kalau sesi berakhir normal sebelum sempat stuck.
- Full suite: 2190/2192 pass (baseline 2185 + 5 baru), 2 fail PRE-EXISTING
  & tidak terkait (konsisten sejak s360).
- `node scripts/build.js` — sukses, versi **1034**.
- `node scripts/verify-bundle-freshness.js` — kedua bundle segar.

## File yang berubah
- `modules/shared/scanner-session.js` (banner recovery baru)
- `app-bundle-b.min.js` (rebuild)
- `tests/scanner-session-recovery-banner.test.js` (baru — 5 test)
- `sw.js`, `index.html`, `app_production.html` — versi `?v=1033` → `?v=1034`

## Status rekomendasi FIX-s362
- Tier-1 (watchdog global): ✅ s362
- Tier-2 (lint overlay bypass): ✅ s363/s364
- Tier-2 (verify bundle freshness): ✅ s365
- Tier-3 (recovery banner visual): ✅ s366 — **selesai, tidak ada sisa
  rekomendasi terbuka dari audit s360-s362.**
