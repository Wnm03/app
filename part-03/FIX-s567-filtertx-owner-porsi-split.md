# FIX s567 — Riwayat Transaksi Akun Tertaut: Modal & Pengeluaran Dipecah per Porsi

**Permintaan user (lanjutan sesi 566):** "apakah riwayat transaksi
menampilkan sesuai porsi dengan nominal modal dan pengeluaran lalu di
total" → "Ya — tiap transaksi (modal/pengeluaran) dipecah per porsi
pemilik lalu ditotal per orang."

## Masalah

`showFilteredTx(scope='account')` (dipanggil saat kartu akun berbadge
"(via Aset)" diketuk, `openAccTxHistory()`) sebelum sesi ini cuma
menampilkan **total flat** (`Total = Σincome − Σexpense`) — tidak ada
pemecahan per porsi pemilik sama sekali, walau akunnya tertaut ke Aset
multi-owner (baris "👥 Porsi" yang ditambahkan S566 di kartu akun murni
informasi statis, belum terhubung ke daftar transaksinya).

## Perubahan

- **`modules/shared/modals.js` (`filterTxModal`):** 1 elemen baru
  `#filterTxOwnerSplit` disisipkan di antara `#filterTxSummary` dan
  `#filterTxList` — `display:none` default, cuma tampil kalau diisi.
- **`modules/finance/filter-laporan.js`, `showFilteredTx()`:** setelah
  `total` (net) dihitung — HANYA untuk `scope==='account'` DAN akun itu
  tertaut ke Aset yang `MultiOwnerEngine.getOwners()`-nya balikin owners:
  - `Modal` = total `income` dalam daftar yg tampil, dipecah per porsi.
  - `Pengeluaran` = total `expense`, dipecah per porsi.
  - `Total` = net (sama definisi dgn total lama), dipecah per porsi.
  - Semua pemecahan 100% REUSE `MultiOwnerEngine.splitByPorsi()` — fungsi
    yang SAMA dipakai `resolveTxAssetSplit()` per-transaksi di
    `transaksi.js` (0 rumus baru).
  - Scope lain (`dashboard`/`keuangan`/`laporan`), akun tidak tertaut,
    atau elemen `#filterTxOwnerSplit` tidak ada di DOM (halaman lain):
    0 perubahan, guard aman (tidak error).
- **Test baru:** `tests/s567-filtertx-owner-split.test.js` (4 test):
  pemecahan Modal/Pengeluaran/Total per owner sesuai porsi, akun tidak
  tertaut → blok kosong/tersembunyi, scope selain `account` → blok
  kosong/tersembunyi walau ada aset multi-owner, elemen tidak ada di DOM
  → tidak error.

## Verifikasi

- `node --test tests/s567-filtertx-owner-split.test.js` → **4/4 lolos**.
- `node --test tests/*.test.js` → **3975/3975 lolos, 0 gagal** (0 regresi).
- `node scripts/build.js s567-filtertx-owner-porsi-split` — lolos semua
  lint blocking, versi disamakan di 5 file source, kedua bundle lolos
  `node --check`.

## Belum ditangani (di luar scope sesi ini)

- Pemecahan ini dihitung dari total agregat (Σincome, Σexpense) dalam
  daftar yang tampil, BUKAN per-baris-transaksi individual dgn badge
  seperti `resolveTxAssetSplit()` (yang butuh `t.assetId` di tiap baris,
  field berbeda dari `t.accountId`) — cukup untuk ringkasan "ditotal per
  orang" sesuai permintaan; rincian per-baris tidak diminta sesi ini.
