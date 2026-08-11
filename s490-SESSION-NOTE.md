# Sesi 490 — Wire `assetOwnersModal` ke OwnerRegistry (langkah 2/5)

Ref: `PLAN-owner-registry-multi-session.md`.

## Yang dikerjakan (`modules/asset/aset.js`)
- `_ownerNameFieldHtml(o,i)` (baru): baris SELF tetap free-text (tidak berubah). Baris non-SELF → `<select>` (opsi registry + "➕ Buat pemilik baru…") KALAU `OwnerRegistry` sudah punya ≥1 entri & baris tidak sedang mode `_creatingNew`; kalau tidak, fallback free-text sama persis perilaku sebelum S490.
- `onOwnerSelectChange(i,val)` (baru): `"__new__"` → mode `_creatingNew` (balik ke free-text kosong); id existing → isi `ownerId`/`ownerName` draft dari entri registry.
- `saveOwners()`: baris baru (ownerId kosong) non-SELF → `OwnerRegistry.findOrCreate(name)`. Baris SELF & baris yang sudah punya `ownerId` (dari dropdown/data lama) tidak disentuh.
- `onOwnerNameInput()` TIDAK diubah — dipakai apa adanya di kedua jalur free-text (SELF & `_creatingNew`).
- Didaftarkan: tidak perlu — `owner-registry.js` sudah terdaftar di build.js sejak S489.

## Verifikasi
- Test baru `tests/s490-asset-owners-registry-wiring.test.js` (9 test) — termasuk skenario inti: 2 aset pakai nama owner sama → `ownerId` sama (test #7), findOrCreate tidak duplikat (test #6, #8), baris SELF tidak lewat registry (test #9).
- Regresi `asset-owners*`/`asset-titipan`/`asset-zakat-self-portion-s393`/`akun-multiowner-linked-account-s396` → **77/77 lolos** (dijalankan TANPA `OwnerRegistry` dimuat di harness lama — fallback free-text kebukti identik dgn sebelum S490).
- `node --test tests/*.test.js` → **3195/3195 lolos** (baseline 3186 + 9 baru, 0 regresi).
- `verify-window-expose.js` / `verify-bundle-freshness.js` → lolos.
- `verify-release-ready.js` → lolos, 2 override manual sama seperti S488/S489 (eslint/esbuild tidak terpasang di sandbox).
- Build `s490-asset-owners-registry-wiring` → versi bundle v1219 → v1220.

## Out-of-scope (sesuai plan)
`investasi-view.js`, `titipanCommitmentModal` — itu S491/S492.

## Next
S491 — replikasi pola yang sama ke `investmentOwnersModal` (`modules/asset/investasi-view.js`).
