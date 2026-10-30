# SESSION-NOTE-S696 — Audit lanjutan: rentang penuh periode hari/minggu/tahun (getRange & getTxListRange)

**Basis akumulasi:** ZIP ini dibangun DI ATAS `kw-patch-s695-2026-09-01-
laporan-slide-bulan.zip` (Fix 2: slide bulan sebelum/sesudah di filter
Laporan, versi 1509) YANG SUDAH mengakumulasi Fix 1 (S694, kategori Laporan
klik ke transaksi asal) dan fix Majoris/deductionOwner source sebelumnya.
Ketiga fix sebelumnya TIDAK disentuh sama sekali di sesi ini dan tetap ikut
utuh di ZIP ini (kecuali 1 assertion test S695 yang disesuaikan, dijelaskan
di bawah). Timpa semua file di ZIP ini ke project asli.

## Yang dikerjakan sesi ini (S696 — audit item pertama dari daftar "Konsistensi UX")

**Item yang diaudit (dari daftar ide lanjutan sebelumnya):**
> "Kartu 'Semua Transaksi' (tab Kelola) punya slide bulan yang sudah lama
> ada (`changeTxListMonth`) tapi masih terpotong di 'hari ini' untuk chip
> lain — belum dicek apakah punya bug serupa Fix 2."

**Hasil audit: BENAR ada bug serupa Fix 2, di DUA tempat sekaligus** (bukan
cuma kartu "Semua Transaksi" seperti dugaan awal — panel filter Laporan
punya kode yang IDENTIK strukturnya, jadi kena bug yang sama persis):

1. `getTxListRange()` (`modules/finance/tx-list-cashflow.js`, kartu "Semua
   Transaksi" tab Kelola) — chip `hari`/`minggu`/`tahun` semuanya
   `to=now` (terpotong "hari ini"/jam render), SAMA seperti bug lama chip
   `bulan` yang sudah dibereskan sebelum sesi ini.
2. `getRange()` (file sama, panel filter Laporan) — bug IDENTIK di chip
   `hari`/`minggu`/`tahun` (chip `bulan` sudah dibereskan di S695).

Chip `bulan` di kedua fungsi sudah benar dari sebelumnya (tidak disentuh).
Chip `selamanya` (rentang absolut) dan `custom` (rentang eksplisit dari
input tanggal) tidak kena bug ini sama sekali — tidak disentuh.

**Fix (SELESAI, source):**

- `modules/finance/tx-list-cashflow.js`:
  - `getTxListRange()` — chip `hari` sekarang `from`=00:00 hari ini,
    `to`=23:59:59.999 hari ini (bukan `to=now`/jam render). Chip `minggu`
    — `from`=Minggu 00:00 (awal minggu, TIDAK berubah), `to`=Sabtu
    23:59:59.999 (akhir minggu, SEBELUMNYA `to=now`). Chip `tahun` —
    `from`=1 Jan (tidak berubah), `to`=31 Des 23:59:59.999 (SEBELUMNYA
    `to=now`). Fallback `return{from,to:now}` generik di akhir fungsi
    sudah tidak terpakai lagi (semua cabang sekarang return eksplisit di
    tempat) — dihapus.
  - `getRange()` — perubahan PERSIS sama pada chip `hari`/`minggu`/`tahun`,
    pola sama `getTxListRange()` di atas. Cabang `bulan` (Fix 2, S695)
    tidak diubah sama sekali. Fallback generik di akhir fungsi juga
    dihapus (sama alasannya).

- Konsumen `getRange()`/`getTxListRange()` (`renderLaporan()`,
  `backup-restore.js`, `modules-render-b.js`, `filter-laporan.js`,
  `shop/cobek-order.js`, `shop/cobek-io.js`, `shop/modules-render.js`) —
  TIDAK diubah. Semuanya cuma memakai `{from,to}` sebagai batas filter
  transaksi, jadi memperlebar `to` (dari "sekarang" ke "akhir periode")
  murni aditif — menampilkan transaksi bertanggal maju dalam periode yang
  sama yang SEBELUMNYA tersembunyi, 0 risiko struktural ke pemanggilnya.

## Test

`tests/s696-full-period-range-hari-minggu-tahun.test.js` (10 test, baru):
1–4. `getRange()`: chip `hari` rentang penuh hari ini; chip `minggu`
   rentang penuh Minggu–Sabtu; chip `tahun` rentang penuh 1 Jan–31 Des;
   chip `selamanya` 0 regresi.
5–9. `getTxListRange()`: chip `hari`/`minggu`/`tahun` rentang penuh (pola
   sama 1–3); chip `bulan` 0 regresi (fix lama dipertahankan); chip
   `selamanya` 0 regresi.
10. Struktural: fallback generik `return{from,to:now}` di akhir
   `getRange()` sudah tidak ada lagi (semua cabang return eksplisit).

**Test lama yang disesuaikan:** `tests/s695-laporan-month-slide.test.js` —
1 assertion di test "getRange() filterPeriode selain 'bulan' ... 0
regresi" SEBELUMNYA memverifikasi chip `tahun` tetap `to=akhir hari ini`.
Karena perilaku itu SENGAJA diubah sesi ini (jadi rentang penuh tahun),
assertion disesuaikan jadi `to=31 Des` — bagian intinya (chip `tahun`
tidak dipakaikan `lapMonthOffset` sama sekali) tetap dipertahankan &
tetap lolos.

Full suite lokal: **5264/5264 pass, 0 fail** (5254 dari basis S695 + 10
test baru sesi ini).

## Build

`node scripts/build.js` dijalankan — versi naik **1509 → 1510**.
`app-bundle-a.min.js`/`app-bundle-b.min.js` ter-generate ulang (esbuild
masih tidak tersedia di environment ini — TANPA minifikasi, tetap 100%
valid, sama seperti 2 sesi sebelumnya). `app_production.html` ditulis
ulang sebagai cermin persis `index.html`. `sw.js` CACHE_NAME →
`kw-cache-v1510`. Satu konstanta versi (`MODULE_RENDER_VERSION` di
`modules/shared/modules-render.js`) sempat tidak ikut ter-bump otomatis
(sudah menyimpang dari versi sebelumnya sebelum sesi ini) — diperbaiki
manual, build ke-2 lolos gate `verifyVersionConstantsSynced()`.

Gate `verify-release-ready.js`: `html-sync` & `version-sync` LOLOS bersih.
`lint` (eslint) dan `minify` (esbuild) di-override manual dengan alasan
yang sama seperti S694/S695 — environment sandbox ini tidak ada akses
jaringan untuk `npm install` keduanya. Lihat `docs/RELEASE-GATE-LOG.md`
untuk catatan override.

## File yang berubah di ZIP ini

- `modules/finance/tx-list-cashflow.js` — `getTxListRange()`/`getRange()`
  chip `hari`/`minggu`/`tahun` (Fix S696, baru sesi ini)
- `modules/shared/modules-render.js` — hanya konstanta versi (perbaikan
  manual sync + bump otomatis oleh `build.js`), 0 perubahan logic
- `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`
  — hanya konstanta versi ter-bump otomatis oleh `build.js`, 0 perubahan
  logic
- `index.html`, `app_production.html`, `sw.js` — versi `?v=1510` /
  `kw-cache-v1510`
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — regenerasi build (versi
  1510)
- `tests/s696-full-period-range-hari-minggu-tahun.test.js` — baru
- `tests/s695-laporan-month-slide.test.js` — 1 assertion disesuaikan
  (lihat bagian Test di atas), sisanya tidak diubah
- `modules/modules-render.js` — dari S694/S695 (dipertahankan, TIDAK
  diubah sesi ini — ini file BEDA dari `modules/shared/modules-render.js`
  di atas)
- `modules/finance/filter-laporan.js`,
  `modules/finance/dana-titipan-aggregation-api.js`,
  `modules/finance/dana-titipan-portfolio-render.js` — dari patch
  sebelumnya (dipertahankan, TIDAK diubah sesi ini)
- `tests/s694-laporan-kategori-click-tosource.test.js`,
  `tests/s595-titipan-majoris-renov-reconcile.test.js`,
  `tests/patch-2026-08-14-b-majoris-deductionowner-sync.test.js`,
  `tests/fix-holding-direct-account-titipan-and-ghost-asset-link.test.js`
  — dari sesi/patch sebelumnya (dipertahankan)
- `FILE-MAP.md`, `COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `SESSION-NOTE-S694.md`, `SESSION-NOTE-S695.md` — dipertahankan dari
  patch sebelumnya (riwayat akumulasi)

## Belum dikerjakan (di luar scope sesi ini, tetap di daftar audit)

- Kategori di dashboard ringkasan (klik-ke-sumber pola Fix 1) — belum
  disentuh.
- Verifikasi `renderGrafik()` (grafik Laporan) ikut `lapMonthOffset` atau
  masih baca `getRange()` langsung — belum diverifikasi manual.
- `economic-intelligence/` — belum disentuh.
- Audit ulang `BUG_REGISTRY.md` pasca-disiplin S656 — belum dikerjakan.
- Restore `esbuild` (instalasi butuh akses jaringan, tidak tersedia di
  sandbox ini) — belum bisa dikerjakan dari sini.
- Pemecahan `scripts/build.js` (2444 baris) — belum dikerjakan.
