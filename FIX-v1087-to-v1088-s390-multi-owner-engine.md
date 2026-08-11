# Sesi 390 — Multi-Owner Engine (fondasi porsi kepemilikan pecahan)

## Instruksi user

"Audit ownership agar 1 aset bisa dimiliki beberapa orang dengan porsi
beda-beda, hitung otomatis keuntungan berdasarkan porsi, tambahkan reko AI."

## Audit awal (sebelum implementasi)

- `OwnershipEngine` (S191) modelnya **1 entity = 1 tipe** (SELF/INVESTOR/
  CUSTOMER/THIRD_PARTY/FAMILY) di field tunggal `entity.ownership`. TIDAK
  ada konsep porsi/persentase, apalagi banyak pemilik sekaligus.
- `OwnershipSettingsPresenter` (S229-230) cuma read-only counter per tipe.
- Kalkulasi untung di `modules/asset/aset.js` (`keuntungan`,
  `keuntunganPct`) dihitung per aset UTUH, tidak dipecah per pemilik.
- Grep "porsi kepemilikan"/multi-owner di seluruh source: nihil sebelum
  sesi ini.

**Kesimpulan:** permintaan ini 3 sub-fitur (engine porsi, split
keuntungan otomatis, rule reko AI), bukan 1 patch kecil. Dikonfirmasi ke
user, dan user memilih **mulai dari Multi-Owner Engine dulu sbg fondasi**
— split keuntungan & reko AI ditunda ke sesi berikutnya (dibangun DI ATAS
engine ini, sesuai disiplin "1 task = 1 sesi" proyek).

## Yang dikerjakan

1. **`modules/shared/multi-owner-engine.js`** (baru) — engine murni,
   pola `{ok,...}` sama persis `OwnershipEngine`:
   - `validateOwner()` / `validateOwners()` — 1 baris pemilik
     `{ownerId, porsi, ownerName?}`, porsi 0<x<=100, ownerId unik, total
     porsi HARUS 100% (toleransi float 0.01).
   - `totalPorsi()` / `remainingPorsi()` — bantu UI form porsi masa depan.
   - `getOwners(entity)` — baca porsi efektif, TOLERAN data lama: kalau
     `entity.owners` belum ada, fallback baca `entity.ownership` (legacy
     OwnershipEngine, lewat guard `typeof`) disintesis jadi 1 pemilik
     100%; kalau keduanya tidak ada, default SELF 100%.
   - `setOwners(entity, owners)` — pure, balikin salinan `entity` baru
     (tidak memutasi entity asli), field asing per baris pemilik dibuang.
   - `splitByPorsi(nilai, owners)` — bagi angka apa pun (mis. keuntungan)
     sesuai porsi; disiapkan utk dipakai sesi berikutnya oleh `aset.js`,
     BELUM dipanggil dari mana pun sesi ini.
2. **`tests/multi-owner-engine.test.js`** (baru) — 33 test, 100% pass.
3. **`scripts/build.js`** — 1 baris registrasi di `GROUP_B`, tepat
   setelah `ownership-settings-presenter.js`.

## Yang SENGAJA TIDAK dikerjakan sesi ini

- `OwnershipEngine` tidak disentuh sama sekali (grep dikonfirmasi).
- Tidak ada field `owners` baru ditambahkan ke `D.assets`/dst.
- Tidak ada UI (form input porsi, tampilan split keuntungan per pemilik).
- Tidak ada wiring ke `modules/asset/aset.js` (`keuntungan`/`keuntunganPct`)
  — `splitByPorsi()` sudah siap dipakai, tinggal dipanggil sesi berikutnya.
- Tidak ada rule baru didaftarkan ke `AIDecision.recommend`
  (`modules/ai/ai-decision-engine.js`) — reko AI (mis. "porsi belum 100%",
  "pemilik X profitnya turun") jadi kerjaan sesi setelah wiring split
  keuntungan selesai (reko butuh angka split yang sudah jadi).

## Regression & build

`npm test`: **2649/2649 pass** (2616 lama + 33 baru, 0 gagal).
`node scripts/build.js s390-multi-owner-engine` — sukses, sintaks kedua
bundle valid. Versi v1087 → **v1088**.

## Status akhir

**FONDASI SELESAI.** Lanjutan (split keuntungan otomatis + reko AI) siap
dikerjakan sesi berikutnya kapan pun user minta — tinggal wiring
`MultiOwnerEngine.getOwners()`/`splitByPorsi()` ke `aset.js` lalu
register rule ke `AIDecision.recommend`.
