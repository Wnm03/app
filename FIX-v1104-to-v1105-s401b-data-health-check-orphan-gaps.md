# Sesi 401b — Tambah 4 Cek Orphan di Data Health Check, v1104 → v1105

## Latar belakang

Audit ringan atas `runDataHealthCheck()` (data-health-check.js) menemukan
4 field relasi (foreign key) yang sudah dipakai nyata oleh fitur lain
(sync saldo, porsi kepemilikan) tapi belum pernah dicek orphan-nya —
padahal pola & kasusnya identik dengan cek `D.targets[].accountId` yang
sudah ada sejak Sesi 293:

1. `D.eduFunds[].accountId` (Dana Pendidikan → akun tabungan)
2. `D.sewaKios.units[].accountId` (Unit Kios → akun tujuan pembayaran sewa)
3. `D.piutang[].assetId` (kaitan ke Aset Multi-Owner)
4. `D.debts[].assetId` (kaitan ke Aset Multi-Owner)

Kalau akun/aset tautannya dihapus, field ini jadi menunjuk ke record yang
sudah tidak ada — saldo/porsi kepemilikan terkait bisa salah hitung diam-
diam tanpa ada yang memberi tahu user.

## Perubahan

- **`data-health-check.js`** — `runDataHealthCheck()`: tambah 4 cek warn
  baru, mengikuti pola persis cek `D.targets` (`accountId`) & cek
  `D.assets`/`D.renovProjects` (relasi lain) yang sudah ada: baca-saja,
  0 mutasi data, 0 perubahan ke cek yang sudah ada.
- **`tests/data-health-check-assetid-edufund-sewakios-orphan-s401.test.js`**
  (baru) — 8 test: masing-masing 1 kasus "warn kalau orphan" + 1 kasus
  "tidak warn kalau valid/kosong" untuk tiap cek baru, plus 1 kasus
  "D.sewaKios tidak ada" tidak pernah error.

## Kenapa aman

- Semua cek baru murni membaca `D.*` yang sudah ada, tidak menulis apa pun.
- Tidak menyentuh cek data health lain, tidak menyentuh logika sync
  saldo/porsi kepemilikan di modul lain (edukasi-dana.js, sewakios.js,
  piutang-utang.js) — cuma menambah *pemberitahuan* kalau tautannya putus.
- Guard `(D.sewaKios&&D.sewaKios.units)||[]` & `(D.eduFunds||[])` konsisten
  dgn guard `||[]` yang dipakai di semua cek lain di file ini — aman kalau
  field belum ada di data lama.

## Test

Full suite: **2707/2707 pass, 0 fail** (2699 lama + 8 test baru).

## Build

`node scripts/build.js s401b-data-health-check-orphan-gaps` → v1105,
sintaks bundle valid, index.html/app_production.html identik.

## Cara pasang (patch)

Timpa file berikut:

```
data-health-check.js
tests/data-health-check-assetid-edufund-sewakios-orphan-s401.test.js
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
