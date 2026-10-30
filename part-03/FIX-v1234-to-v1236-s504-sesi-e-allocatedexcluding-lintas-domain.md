# Sesi E — Generalisasi `allocatedExcluding()` Lintas Domain Investment + Aset

Ref: `PROMPT-SESI-E-ALLOCATEDEXCLUDING-LINTAS-DOMAIN.md`.

## Status

**IMPLEMENTED**

## Baseline

- v1234 (full release), `node --test tests/*.test.js` = **3266/3266** hijau.

## Final

- v1236 (build otomatis naikkan 2x: 1235 lalu 1236 karena build dijalankan
  dua kali — pertama tanpa label eksplisit lalu diulang dengan label sesi
  yang benar; TIDAK ada perubahan logic di antara kedua run, cuma nomor
  build/version string), `node --test tests/*.test.js` = **3280/3280**
  hijau (3266 lama + 14 test baru, 0 regresi).

## Tujuan

`DanaTitipanPortfolioAPI.allocatedExcluding(ownerId, holdingId)` (Sesi 494)
tadinya HANYA membaca domain Investment (`_holdingSplits()`), padahal
`build()` sudah lintas domain Investment + Aset sejak Sesi B1/S499. Ini
membuat `allocatedExcluding()` tidak aman dipakai sebagai fondasi kuota
Dana Titipan di `assetOwnersModal` (sesi UI-nya menyusul, BELUM
dikerjakan di sesi ini).

## Logic

`allocatedExcluding(ownerId, exclusion)` sekarang membaca **dua sumber
independen**, keduanya 100% reuse helper existing yang sama dipakai
`build()`:

```
allocatedExcluding()
    ├── Investment.getHoldings() → _holdingSplits()   (basis: holdingCost)
    └── D.assets                → _assetSplits()      (basis: a.nilai)
```

Kedua domain dijumlah bersama per `ownerId` (owner `isSelf` tetap
dikecualikan di kedua domain, konsisten `build()`). Kalau salah satu
domain tidak terbaca (dependency belum dimuat / array kosong), domain
lain tetap dihitung — 0 saling menggagalkan (lihat test H/I/J).

## Exclusion — lintas domain

Parameter kedua (`exclusion`) digeneralisasi dengan **backward
compatibility penuh** untuk caller lama:

- **String / falsy** (bentuk lama S494) → diperlakukan sebagai
  `holdingId` yang dikecualikan dari domain Investment saja. Caller
  existing `investasi-view.js` (`InvestmentUI._ownerQuotaText()`)
  memanggil `allocatedExcluding(o.ownerId, holdingId)` apa adanya, **0
  baris caller diubah**, hasilnya identik dengan sebelum Sesi E.
- **Object `{holdingId, assetId}`** (bentuk baru Sesi E) → exclude
  holding Investment ber-`id === holdingId` DAN/ATAU aset ber-`id ===
  assetId` sekaligus. Belum ada caller UI yang memakai bentuk ini di
  sesi ini (disiapkan untuk sesi `assetOwnersModal` berikutnya).

Audit caller (`grep -R "allocatedExcluding" .`) menemukan **1 caller
non-test**: `modules/asset/investasi-view.js` baris 146
(`InvestmentUI._ownerQuotaText()`), memanggil dengan `holdingId` string.
Signature lama dipertahankan sepenuhnya via percabangan tipe parameter —
tidak diperlukan wrapper compatibility terpisah.

## Tests

14 test baru di
`tests/s503-allocated-excluding-cross-domain-investment-aset.test.js`:

- A–D: kombinasi Investment↔Investment, Aset↔Aset, Investment+Aset
  exclude-Investment, Investment+Aset exclude-Aset (§7 prompt).
- E: skenario over-allocation lintas domain yang memicu sesi ini (§8
  prompt) — Aset lama + draft Aset baru, exclude Aset baru →
  `allocatedExcluding` = pokok Aset lama saja, lalu caller (contoh
  perhitungan, bukan implementasi UI) `principal - excluding - draft`
  menghasilkan sisa kuota yang benar.
- F–L: edge case §15 prompt (ownerId kosong/null, ownerId tidak
  ditemukan, tanpa Investment, tanpa Aset, tanpa keduanya, id exclusion
  tidak ditemukan, owner SELF).
- M–N: backward compatibility eksplisit — `exclusion` sebagai string
  (bentuk lama) dan sebagai `null`/`undefined`.

Semua 14 PASS. Test existing `tests/s494-titipan-kuota-nominal-investment-owners.test.js`
(9 test, termasuk 6 test lama `allocatedExcluding()` dgn signature
`(ownerId, holdingId)` string) tetap **PASS tanpa modifikasi**.

## Files changed

- `modules/finance/dana-titipan-portfolio-presenter.js` — generalisasi
  `allocatedExcluding()` + komentar header sesi.
- `tests/s503-allocated-excluding-cross-domain-investment-aset.test.js`
  — baru, 14 test.
- File generated/version (build otomatis, bukan diedit manual):
  `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` (bump versi
  konstanta), `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `index.html`, `app_production.html`, `sw.js` (`?v=`/`CACHE_NAME`),
  `FILE-MAP.md`, `COVERAGE-PER-MODULE.md`, `backups/*` (bundle lama).

## Regression

**PASS** — 3280/3280 (3266 baseline + 14 baru), 0 gagal.

## UI

`assetOwnersModal` **belum diubah** pada sesi ini. UI kuota Aset akan
menjadi sesi berikutnya setelah fondasi `allocatedExcluding()`
tervalidasi (sesuai instruksi §16/§20 prompt sesi ini). Tidak ada
`#assetOwnerKuota`/`_ownerQuotaText()`/`_updateOwnerQuotaDisplay()` baru
ditambahkan ke domain Aset. `aset.js`, `investmentOwnersModal`,
`OwnershipEngine`, `MultiOwnerEngine`, `OwnerRegistry`,
`D.titipanCommitments` schema, dan `DanaTitipanPortfolioAPI.build()`
**tidak disentuh** sama sekali.
