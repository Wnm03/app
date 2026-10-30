# FIX v1230 → v1231 (Sesi 500): Dana Titipan — Sesi B2 (F2 Opsi B: Sembunyikan Kolom P&L Baris Aset)

## Konteks
Follow-up dari `AUDIT-SESI-B-PERLUASAN-ASET.md` §3.1 (F2), menindaklanjuti
Sesi B1 (v1230): baris Aset di tab "💰 Dana Titipan" selalu tampil
`gain=0` (Opsi A, karena Aset tidak punya cost-basis terpisah dari
nilai kini). User pilih **Opsi B** — sembunyikan kolom P&L khusus baris
itu, biar `gain=0` tidak disalahartikan sebagai "untung-rugi beneran
nol" oleh yang lihat.

## Perubahan

### `modules/finance/dana-titipan-portfolio-presenter.js`
- **`build()`** — tiap baris `holdings[]` sekarang punya field baru
  `hasGainTracking`: `true` untuk baris Investasi (loop lama, tidak
  disentuh), `false` untuk baris Aset (loop B1). 0 rumus baru, murni
  flag tambahan.
- **`renderInto()`** — baris `holdings[]` dgn `hasGainTracking === false`
  dirender beda:
  - Ikon 🏦 (bukan 📈).
  - Cuma "Nilai: Rp X" polos — TIDAK ada panah "Pokok → Kini" & TIDAK
    ada badge ±gain.
  - Baris `hasGainTracking !== false` (Investasi, termasuk holding lama
    yang mungkin belum punya field ini — default aman ke "tampilkan")
    perilakunya **0% berubah** dari sebelumnya.

## Yang TIDAK berubah
- `_asetOwnersForTitipan()` (F1) / `_assetSplits()` (F2 Opsi A dasar) —
  0 baris disentuh.
- `build()` loop Investasi — 0 baris disentuh.
- Kontrak `owners[].*`/`totals.*` — 0 field diubah/dihapus (cuma 1
  field baru ditambah ke level `holdings[]`, bukan level owner).
- F3 (reconciliation Dana Kelolaan vs Dana Titipan) — masih TODO,
  belum ada laporan kasus nyata.

## Test Baru
`tests/s500-dana-titipan-f2-opsib-hide-gain-aset.test.js` (3 test):
1. `build()`: baris Investasi `hasGainTracking:true`, baris Aset
   `hasGainTracking:false`.
2. `renderInto()`: baris Aset tampil "Nilai: Rp X" polos, TIDAK ada
   panah P&L.
3. `renderInto()`: baris Investasi TETAP tampil panah P&L seperti
   sebelumnya (0 regresi).

## Verifikasi
- `node --test tests/*.test.js` — **3261/3261 lulus** (naik dari 3258,
  +3 test baru; 0 regresi).
- `node scripts/build.js s500-dana-titipan-f2-opsib-hide-gain-aset` —
  build sukses, versi naik ke **v1231**, sintaks kedua bundle valid.
- `esbuild` tidak tersedia (bundle belum diminify, sama seperti sesi
  sebelumnya — 100% valid & aman dipakai).

## Sisa Kerjaan (SENGAJA bukan sesi ini)
- **F3 reconciliation** (ditunda sampai ada laporan nyata).
- **Sesi C** — mekanisme "pinjam untuk transaksi keuangan" (G4), wajib
  audit kecil dulu.
- **Sesi D** (opsional) — perluasan ke Kendaraan/Shop.

## Catatan
Zip release ini **FULL RELEASE** (semua file, v1231). Zip patch terpisah
(`kw_patch_v1230-to-v1231_s500-dana-titipan-f2-opsib-hide-gain-aset.zip`)
berisi HANYA file yang berubah/baru sejak v1230.
