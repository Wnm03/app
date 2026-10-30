# Sesi 491 — Wire `investmentOwnersModal` ke OwnerRegistry (langkah 3/5)

Ref: `PLAN-owner-registry-multi-session.md`.

## Yang dikerjakan (`modules/asset/investasi-view.js`)
Replikasi PERSIS pola S490 (`aset.js`) — 0 perbedaan logic, cuma namespace
(`InvestmentUI` vs `Aset`) & nama handler:
- `_ownerNameFieldHtml(o,i)` (baru): baris `isSelf` tetap free-text (tidak berubah). Baris non-SELF → `<select>` (opsi registry + "➕ Buat pemilik baru…") KALAU `OwnerRegistry` sudah punya ≥1 entri & baris tidak sedang mode `_creatingNew`; kalau tidak, fallback free-text sama persis perilaku sebelum S491.
- `onOwnerSelectChange(i,val)` (baru): `"__new__"` → mode `_creatingNew` (balik ke free-text kosong); id existing → isi `ownerId`/`ownerName` draft dari entri registry.
- `_renderOwnersList()`: baris nama pemilik sekarang lewat `_ownerNameFieldHtml(o,i)` (dulu `<input>` hardcoded) — 0 perubahan lain di fungsi ini.
- `saveOwners()`: baris baru (ownerId kosong) non-SELF → `OwnerRegistry.findOrCreate(name)` bukan `uid()`/`Date.now()` langsung. Baris SELF & baris yang sudah punya `ownerId` (dari dropdown/data lama) tidak disentuh.
- `onOwnerNameInput()` TIDAK diubah — dipakai apa adanya di kedua jalur free-text (SELF & `_creatingNew`).
- Didaftarkan: tidak perlu — `owner-registry.js` sudah terdaftar di build.js sejak S489.

## Verifikasi
- Test baru `tests/s491-investment-owners-registry-wiring.test.js` (9 test, mirror persis 9 test S490) — skenario inti: 2 holding pakai nama owner sama → `ownerId` sama (test #7), `findOrCreate` tidak duplikat (test #6, #8), baris SELF tidak lewat registry (test #9).
- `node --test tests/*.test.js` → **3204/3204 lolos** (baseline 3195 + 9 baru, 0 regresi).
- `verify-release-ready.js` → lolos, 2 override manual sama seperti S488/S489/S490 (eslint/esbuild tidak terpasang di sandbox).
- Build `s491-investment-owners-registry-wiring` → versi bundle v1220 → v1221.

## Out-of-scope (sesuai plan)
`titipanCommitmentModal` (Gate #2, kondisional) — itu S492.

## Next
S492 — retrofit `titipanCommitmentModal` (`DanaTitipanPortfolioAPI.listExistingOwners()`), KONDISIONAL tergantung jawaban Gate #2 di plan. Belum dijawab di sesi ini — perlu konfirmasi eksplisit sebelum S492 mulai.
