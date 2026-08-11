# Sesi 392e — Regression Check Rule AI S391 Setelah Input Beneran Dipakai (langkah 5 dari 5)

## Instruksi user

Lanjutan & penutup rencana kerja bertahap "form UI porsi kepemilikan" (5 sesi,
dari FIX-s392a). Sesi ini: regression check rule AI S391
(`asset-multi-owner-porsi-incomplete`, `asset-multi-owner-profit-split-info`)
setelah `Aset.saveOwners()`/`resetOwners()` (392d) benar-benar dipakai untuk
menulis `owners` ke `D.assets` — sebelumnya kedua rule itu cuma pernah dites
dengan data `owners` yang ditulis manual/DevTools (S391), belum pernah lewat
jalur UI nyata.

## Konteks sebelum sesi ini

- S390: `MultiOwnerEngine` (fondasi porsi kepemilikan).
- S391: `AssetOwnershipSplitPresenter` (split untung per porsi) + 2 rule AI baru
  di `registerAssetAIRules()` — dites dgn `owners` yang di-set programatik.
- 392a–392c: modal UI baca-saja + draft interaktif di memori, belum menulis ke
  `D.assets`.
- 392d: `saveOwners()`/`resetOwners()` — draft AKHIRNYA benar-benar ditulis ke
  `D.assets` lewat `MultiOwnerEngine.setOwners()` (reuse penuh), **0 test baru**
  di sesi itu (murni wiring UI).

## Yang dikerjakan sesi ini (392e)

**Regression check murni — 0 baris logic app diubah.** Satu file test baru:
`tests/asset-owners-ai-rules-regression-s392e.test.js` (8 test, load source
asli `multi-owner-engine.js` + `asset-ownership-split-presenter.js` +
`aset.js` lewat harness `loadSource`, bukan re-implement logic).

Cakupan:
1. `saveOwners()` — 2 pemilik total 100% → beneran tertulis ke `D.assets`.
2. `saveOwners()` — total belum 100% → ditolak, `D.assets` tidak berubah.
3. `saveOwners()` — nama pemilik kosong → ditolak.
4. `resetOwners()` — setelah save sukses lalu draft diubek-ubek, reset balik
   ke data tersimpan.
5. Rule `asset-multi-owner-profit-split-info` — dipastikan **menyala** dengan
   benar terhadap data yang lahir dari `saveOwners()` beneran (bukan data
   programatik lagi), pesan action() memuat rincian porsi per pemilik yang
   sesuai draft yang disimpan user.
6. Rule `asset-multi-owner-porsi-incomplete` — dipastikan **tidak pernah
   menyala** dari hasil tombol Simpan Porsi di UI, ditest 2 skenario (draft
   tidak 100% ditolak duluan; draft 100% valid tetap tidak memicu rule).
7. Rule `asset-multi-owner-porsi-incomplete` — dipastikan **tetap menyala**
   untuk `owners` yang masuk lewat jalur DI LUAR UI (simulasi
   import/restore/migrasi data lama, ditulis langsung ke `D.assets` tanpa
   lewat `saveOwners()`).
8. `registerAssetAIRules()` — idempotent tetap terjaga (dipanggil 2x, rule
   tidak dobel).

## Temuan (bukan bug, klarifikasi cakupan)

Karena `saveOwners()` cuma menulis `a.owners` kalau
`MultiOwnerEngine.setOwners()` → `validateOwners()` **lulus** (total pas
100%, lihat FIX-s392d), rule `asset-multi-owner-porsi-incomplete` (S391)
**tidak pernah bisa menyala dari hasil tombol Simpan Porsi di UI normal**.
Rule itu masih relevan & tetap teruji (test #7) untuk `owners` yang masuk
lewat jalur lain — restore backup, migrasi data lama, atau input manual di
luar app — tapi bukan dari alur UI 392d. Ini sesuai desain (saveOwners()
memang sengaja menolak simpan yang belum 100%), dicatat di sini supaya rule
S391 itu tidak disangka "mati"/tidak terpakai lagi kalau ditemukan tidak
pernah menyala di data lapangan yang semuanya lewat UI.

Tidak ada perubahan yang direkomendasikan untuk `saveOwners()`,
`MultiOwnerEngine`, atau kedua rule S391 — perilaku existing sudah benar dan
konsisten.

## Yang SENGAJA TIDAK dikerjakan sesi ini

- Tidak ada perubahan ke `Aset.saveOwners()`/`resetOwners()` (392d),
  `MultiOwnerEngine` (S390), atau `AssetOwnershipSplitPresenter`/rule AI
  (S391) — sesi ini murni menambah test regression, 0 logic diubah.
- `scripts/build.js` tidak diubah (tidak ada file source baru untuk
  diregistrasi — hanya file test).
- Rendering DOM penuh (`Aset.renderList()`/`renderDashboard()`) di-stub jadi
  no-op di harness test (efek UI, bukan bagian dari rule AI S391 yang jadi
  target regression check sesi ini).

## Regression & build

`npm test`: **2669/2669 pass** (2661 + 8 baru, 0 gagal).
`node scripts/build.js s392e-asset-owners-ai-rules-regression` — sukses,
sintaks kedua bundle valid. Versi v1093 → **v1094**.

## Status

Rencana 5 sesi "form UI porsi kepemilikan" (392a → 392e) **SELESAI SELURUHNYA**:
skeleton modal → draft interaktif → total indikator → simpan/reset ke
`D.assets` → regression check rule AI S391 terhadap input beneran. Tidak ada
kelanjutan yang tertunda dari rencana ini.
