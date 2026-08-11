# Sesi 402 — Tambah 1 Cek Orphan di Data Health Check, v1105 → v1106

## Latar belakang

Audit lanjutan atas `runDataHealthCheck()` (data-health-check.js) — meninjau
semua field relasi (foreign key) `*Id` yang dipakai fitur lain tapi belum
pernah dicek orphan-nya, pola yang sama yang sudah dipakai sejak S293/S401b —
menemukan 1 field yang sudah dipakai nyata tapi terlewat:

1. `D.transactions[].assetId` (Transaksi → Aset Multi-Owner, dipilih lewat
   dropdown "Kaitkan ke Aset Multi-Owner" di modal Transaksi)

Field ini dibaca oleh `resolveTxAssetSplit()` (modules/finance/transaksi.js)
untuk menampilkan rincian pembagian nominal transaksi ke semua pemilik aset
patungan (preview `#txAssetSplitPreview` di modal, & badge terkait di
tx-list-cashflow.js). Kalau asetnya sudah dihapus, `resolveTxAssetSplit()`
balikin `{ok:false, reason:'Aset tidak ditemukan'}` — bukan crash, tapi
rincian pembagian ke pemilik jadi "hilang" diam-diam tanpa ada yang memberi
tahu user, persis pola yang sama dengan gap `D.piutang[].assetId` &
`D.debts[].assetId` yang sudah ditambal di S401b.

Catatan: audit ini juga sempat mempertimbangkan `D.transactions[].
catalogPartRefs[].catalogId` & `D.servisLogs[].catalogPartRefs[].catalogId`
(vehicle-catalog-tx-link.js / vehicle-catalog-servis-link.js) sebagai
kandidat cek serupa, tapi keduanya masih kode "Foundation" — belum ada
jalur UI yang menulis field itu sama sekali (0 pemanggil di luar file
definisinya sendiri) — jadi SENGAJA tidak ditambal sesi ini (cek yang tidak
mungkin pernah nyala di data nyata cuma nambah noise, di luar cakupan
"paling ringan").

## Perubahan

- **`data-health-check.js`** — `runDataHealthCheck()`: tambah 1 cek warn
  baru di dalam `D.transactions.forEach()` yang sudah ada, mengikuti pola
  persis cek `D.piutang[].assetId` / `D.debts[].assetId` (S401b): baca-saja,
  0 mutasi data, 0 perubahan ke cek lain. Pakai `sameId()` (bukan
  `accIds.has()`) karena `resolveTxAssetSplit()` sendiri juga pakai
  `sameId()` untuk mencocokkan `assetId`.
- **`tests/data-health-check-tx-assetid-orphan-s402.test.js`** (baru) —
  3 test: "warn kalau orphan", "tidak warn kalau valid/kosong", "tidak
  pernah error kalau transaksi tidak punya assetId sama sekali".

## Kenapa aman

- Cek baru murni membaca `D.transactions[].assetId` yang sudah ada, tidak
  menulis apa pun.
- Tidak menyentuh cek data health lain di file ini, tidak menyentuh logika
  `resolveTxAssetSplit()`/sync porsi kepemilikan di transaksi.js — cuma
  menambah *pemberitahuan* kalau tautannya putus.
- Guard `t.assetId &&` konsisten dengan semua cek `assetId`/`accountId`
  lain di file ini — aman kalau field belum ada di data lama (mayoritas
  transaksi memang tidak punya `assetId`).

## Test

Full suite: **2710/2710 pass, 0 fail** (2707 lama + 3 test baru).

## Build

`node scripts/build.js s402-data-health-check-tx-assetid-orphan` → v1106,
sintaks bundle valid, index.html/app_production.html identik.

## Cara pasang (patch)

Timpa file berikut:

```
data-health-check.js
tests/data-health-check-tx-assetid-orphan-s402.test.js
app-bundle-a.min.js
app-bundle-b.min.js
index.html
app_production.html
sw.js
docs/FILE-MAP.md
docs/COVERAGE-PER-MODULE.md
```

Ikut berubah (cuma bump versi, 0 logika): `chat-action-handlers.js`,
`modules/shared/multi-owner-engine.js`,
`modules/shared/features-helpers-global-security.js`,
`modules/business/shop-data-io-api.js`,
`modules/shop/generic/product-repository.js`, `modules/shared/modals.js`,
`modules/shared/modules-render.js`, `modules/shared/modules-calc.js`.
