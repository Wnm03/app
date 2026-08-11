# FIX v1279 → v1289 — Modal Sweep + Data Health Check Gap-Fix (S545–S553)

## Ringkasan

8 test gagal (dari 3936 total, 3928 pass sebelum sesi ini) — semuanya gap
dokumentasi-vs-kode: fix sudah didokumentasikan lengkap di sesi-sesi
sebelumnya (S552, S553, B9) tapi implementasi kodenya belum pernah benar-benar
masuk ke source. Root cause sama persis 4 kali berturut-turut. Sesudah sesi
ini: **3936/3936 PASS**.

## 1–3. `modules/shared/modals.js` — gap Sesi B1/B2a (assetModal & assetOwnersModal)

- `assetModal`: tombol "⚖️ Atur Porsi Kepemilikan" ditambah `id="assetOwnersBtn"`.
- `assetModal`: dropdown baru `id="assetInvestmentId"` ("🔗 Hubungkan ke
  Holding Investasi") dengan `onchange="Aset.onInvestmentLinkChange()"`,
  ditaruh tepat sebelum tombol Atur Porsi.
- `assetOwnersModal`: tombol edit lama (Tambah Pemilik / Simpan Porsi / Reset
  Draft) dibungkus wrapper baru `id="assetOwnersEditControls"`, plus hint
  baru `id="assetOwnersReadOnlyHint"` (keduanya `class="u-dnone"` by
  default — di-toggle oleh `Aset.openOwnersModal()` yang sudah ada di
  `aset.js`, tidak diubah di sesi ini). Tombol "Tutup" TETAP di luar wrapper
  supaya modal selalu bisa ditutup walau read-only.

Logic JS (`Aset.openOwnersModal()`, `Aset.onInvestmentLinkChange()`,
`Investment.getOwners()`) sudah lengkap sejak sesi-sesi sebelumnya — cuma
template HTML-nya yang belum pernah ditulis.

## 4. `data-health-check.js` — S552: orphan check `D.investments[].assetId`

Rule baru: kalau holding investasi (`D.investments[]`) punya `assetId` yang
menunjuk entry Buku Aset yang sudah dihapus, tampilkan warning
`'Link Buku Aset investasi tidak ditemukan'`. Pola sama persis orphan check
S506 (`vehicle.assetId`) — level `warn`, murni baca, 0 auto-repair
(`h.assetId` TIDAK di-null-kan otomatis).

Arah ini KEBALIKAN dari cek `a.investmentId` yang sudah ada sebelumnya (aset
→ holding) — field baru ini adalah link resmi holding → aset (S552 B.2).

## 5. `data-health-check.js` — S553: Piutang/Utang tertaut ke aset non-multi-owner

Field `assetId` di Piutang/Utang berlabel "Kaitkan ke Aset Multi-Owner"
(lihat `modules/finance/piutang-utang.js` `resolveEntryAssetSelfPorsi()`),
tapi kalau aset yang ditautkan ternyata SINGLE-owner, tautan itu silent
no-op (`selfPorsi` fallback 100%, sama seperti tidak ditautkan sama sekali)
— sebelumnya 0 peringatan soal ini.

Rule baru (masing-masing utk Piutang & Utang): kalau `assetId` valid (aset
masih ada — guard eksplisit, TIDAK tumpang tindih dengan cek orphan yang
sudah ada) dan aset itu punya `owners.length < 2`, tampilkan warning
`'Piutang/Utang tertaut ke aset yang bukan multi-owner'`.

## 6. `modules/shared/modules-calc.js` — B9: `FI.investmentAssetValue()` dobel-hitung

`FI.investmentAssetValue()` scope `'zakatable'` punya filter inline sendiri
(duplikat dari `Zakat.hitungMaal()`, bukan reuse `totalAssetValue()`) — gap
yang sudah dicatat di release notes B8 ("Tidak diubah" section) tapi belum
pernah diperbaiki. Fix: tambah `!a.investmentId` di samping
`!a._migratedToInvestmentId` pada filter — pola SAMA PERSIS fix B8. Scope
`'semua'` tidak perlu disentuh (sudah otomatis kebagian fix B8 lewat
`totalAssetValue()==Aset.totalValue()`).

## Hasil test

```
# tests 3936
# pass 3936
# fail 0
```

`npm run verify-window-expose` dan `node scripts/build.js` lolos bersih.
Versi build: **v1289 / s557**.

## File yang berubah

- `modules/shared/modals.js`
- `data-health-check.js`
- `modules/shared/modules-calc.js`
- (auto dari `build.js`) `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `app_production.html`, `index.html`, `sw.js`,
  `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js`, `docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md`
