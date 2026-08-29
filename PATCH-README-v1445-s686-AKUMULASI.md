# PATCH AKUMULASI — v1445 (s686) — SUDAH DI-BUILD & DITES

ZIP ini akumulasi dari SEMUA perubahan sesi-sesi terakhir (termasuk isi
PATCH-v1444-s685 sebelumnya + 3 fix baru sesi ini) — timpa 21 file ini ke
project asli, tidak ada langkah lain.

## Isi (akumulasi, urut sesi)

**Sesi 1-4 (v1444/s685, sudah ada di patch sebelumnya):** auto-create Aset
dari kendaraan SELF (Opsi A), field `#vehNilai`, reminder kendaraan lama
belum tercatat, fix gap `hitungKas` di Cash Flow Forecast, fix nama aset
auto-created ikut sync saat kendaraan di-rename. Lihat
`PATCH-README-v1444-s685-AKUMULASI.md` (masih disertakan) untuk detail.

**Sesi 5 (baru) — 3 item pending dari README v1444 dikerjakan:**

1. **UX backfill quick-action** (`data-health-check.js`) — reminder
   "Kendaraan milik sendiri belum tercatat nilainya" sekarang punya tombol
   aksi `actions:[{label:'✏️ Buka Kendaraan',action:'editVehicle',args:[idx]}]`
   (pola sama actions lain di file ini) supaya tap langsung buka modal edit
   kendaraan, bukan cuma teks pengingat.

2. **Keputusan `zakatable:false` didokumentasikan** (`modules/vehicle/
   vehicle-core.js`, `_autoCreateVehicleAsset()`) — ditambah komentar:
   ini keputusan fiqih eksplisit (kendaraan pakai-pribadi bukan objek zakat
   maal), konsisten dgn default toggle "Kena Zakat" di modal Aset manual,
   tetap bisa diubah user. 0 perubahan behavior.

3. **`filter-laporan.js` — guard `hitungKas`** (`showFilteredTx()`) — 4
   titik akses `D.transactions` di file ini TETAP tidak difilter (baris
   "📝 Catatan saja" tetap tampil di daftar, sesuai pola Sesi 3 di
   `tx-list-cashflow.js`). Yang di-guard `hitungKas!==false` cuma agregat
   moneter: `total` (`filterTxSummary`) & `m`/`e` (split modal/pengeluaran
   per pemilik di `filterTxOwnerSplit`), konsisten dgn arti toggle
   "Hitung ke Saldo & Laporan".
   `debt-optimizer-api.js` / `debt-optimizer-presenter.js` /
   `dana-kelolaan.js` dicek: 0 akses `D.transactions` langsung, tidak perlu
   disentuh (sama seperti kasus `tx-list-cashflow.js` Sesi 3).

**Test baru (5):**
- `tests/data-health-check-vehicle-self-uncovered-opsiA.test.js` — 2 test
  baru: `actions[0]` = `editVehicle(idx)` (index tunggal & multi-kendaraan).
- `tests/s685-filter-laporan-hitungkas-guard.test.js` (baru) — 3 test:
  tx `hitungKas:false` tidak ikut Total tapi tetap tampil di daftar, semua
  tx `hitungKas:false` → Total 0, tx tanpa field `hitungKas` (data lama)
  tetap dihitung normal.

**Hasil build.js (regenerasi otomatis, wajib ikut diupload):**
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — bundle (⚠️ belum
  diminify, esbuild tidak tersedia di sandbox; sintaks divalidasi
  `node --check`, aman dipakai)
- `index.html`, `app_production.html` — `?v=1445`
- `sw.js` — `CACHE_NAME` → `kw-cache-v1445`
- `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modals.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` — konstanta versi disamakan (0 perubahan logic)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `docs/RELEASE-GATE-LOG.md` — dokumentasi regenerasi otomatis

## Verifikasi sesi ini (Sesi 5)
- `node --test tests/*.test.js` → **4899/4899 pass**, 0 fail (4894 lama +
  2 test actions[] baru + 3 test hitungKas-guard baru)
- `node scripts/build.js` → sukses, v1444 → **v1445**, s685 → **s686**
- `node --check` pada 3 file yang diedit manual → OK

## Belum dikerjakan
Tidak ada item pending tersisa dari README v1444 — ketiganya (backfill
quick-action, dokumentasi zakatable, filter-laporan hitungKas) sudah
selesai sesi ini.
