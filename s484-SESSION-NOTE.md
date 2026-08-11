# Sesi 484 (Dana Titipan dalam Investasi — Portfolio Allocation Projection, gap #1-2)

## Konteks

Lanjutan audit "Atur Porsi Kepemilikan"/investasi Sesi 483 (user: "Ya. Dengan
struktur yang sudah ada, saya tidak menyarankan membuat mesin investasi
baru..."). Audit menemukan 3 gap vs requirement "Dana Titipan → Alokasi
Investasi → Instrumen → Porsi Kepemilikan":

1. `DanaKelolaan.listTitipan()` cuma menjumlah cost basis, TIDAK ada nilai
   sekarang / unrealized P&L per baris.
2. Data flat list, TIDAK digrupkan per pemilik dana lintas semua holding.
3. Tidak ada entitas "pokok dana titipan" top-down (kas belum diinvestasikan,
   validasi over-allocation) — BELUM DIPUTUSKAN, SENGAJA TIDAK dikerjakan
   sesi ini (instruksi eksplisit user).

Sesi ini menutup gap #1 dan #2 SAJA.

## Target

Buat `dana-titipan-portfolio-presenter.js` sebagai read-only projection/
presenter layer: 0 engine baru, 0 SSOT baru, 0 perubahan business logic/
ownership engine/multi-owner engine/investment engine/schema holding.

## File yang dibuat/diubah

- `modules/finance/dana-titipan-portfolio-presenter.js` (BARU) —
  `DanaTitipanPortfolioAPI.build()` (proyeksi read-only, group per owner
  non-SELF lintas semua `Investment.getHoldings()`, 100% reuse
  `Investment.getOwners()`/`holdingCost()`/`holdingValue()`/
  `holdingGainLoss()` + `MultiOwnerEngine.splitByPorsi()`) +
  `DanaTitipanPortfolioPresenter.render()` (UI `<details>` per owner +
  daftar holding, container `#danaTitipanPortfolioList`).
- `scripts/build.js` — registrasi file baru di `GROUP_B`, tepat setelah
  `dana-kelolaan-presenter.js`.
- `modules/shared/modules-render.js` — 1 baris tambahan pemanggil
  `DanaTitipanPortfolioPresenter.render()`, tepat setelah
  `DanaKelolaanPresenter.renderLaporan()` di `renderLaporan()`.
- `index.html` — container baru `#danaTitipanPortfolioList` di dalam kartu
  `#danaKelolaanLapCard` (tab Laporan Keuangan), setelah
  `#danaKelolaanTitipanDetailList`.
- `tests/s484-dana-titipan-portfolio-presenter.test.js` — BARU, 11 test
  (10 skenario ownership sesuai requirement user + 1 guard dependency
  belum dimuat).

## Hasil test

`node --test tests/*.test.js` → 3087/3087 PASS (0 gagal), 3076 test lama +
11 baru, 0 regresi.

## Hasil build

`node scripts/build.js s484-dana-titipan-portfolio-presenter` → sukses,
versi s483→s484 (build 1208→1209), sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=1209` sinkron.

## Status lint & release gate

Sama seperti Sesi 483 — sandbox tanpa akses jaringan, eslint/esbuild tidak
tersedia & di-override (lihat `docs/RELEASE-GATE-LOG.md`, entri Sesi 483;
tidak ada perubahan mekanisme override sesi ini).

## Angka/API yang SENGAJA TIDAK dibuat (gap #3, menunggu keputusan user)

- Tidak ada `titipanPokok`/ledger baru/akun owner-aware baru.
- Tidak ada perubahan `akun.js`.
- Tidak ada kalkulasi "kas belum diinvestasikan".
- Tidak ada validasi "allocation <= principal".
- `totals` dinamai `allocatedPrincipalTotal`/`currentValueTotal`/
  `gainTotal` (BUKAN `totalTitipan`/`totalPrincipal`/`totalDanaTitipan`) —
  makna eksplisit "yang SUDAH teralokasi ke holding investasi", bukan
  estimasi total dana titipan yang diterima.
- Modal "Atur Porsi Kepemilikan" (`investasi-view.js`) TIDAK disentuh.

## Progress

Gap #1 & #2 selesai, teruji, ter-build, ZIP sudah dibuat (full release +
patch s483→s484). Gap #3 menunggu keputusan desain data dari user sebelum
dikerjakan sesi berikutnya.

## Next TODO

Menunggu keputusan user untuk gap #3 (BUG-INV-001 audit lanjutan, lihat
percakapan sebelumnya): apakah "pokok dana titipan" tetap murni derived
(tanpa kas & tanpa validasi over-allocation), atau butuh field/ledger baru
kecil per-owner.

## Known Issue

Tidak ada known issue baru dari perubahan sesi ini.
