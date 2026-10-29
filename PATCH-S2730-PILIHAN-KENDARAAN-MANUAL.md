# S2730 — Pilihan kendaraan manual tidak boleh ditimpa konteks kategori + tes S2613 deterministik

## Bug terbukti (regresi dari S2729)
`updateTxVehiclePanels()` dipanggil saat blur kategori/sub dan di baris pertama `_saveTxInner()`. Sejak S2729 ia selalu
memanggil `populateTxBbmVehicleSelect(ctx)` / `populateTxServisVehicleSelect(ctx)` dengan `ctx` = `linkedVehicleId` kategori,
sehingga (a) pilihan kendaraan manual user dan (b) kendaraan hasil restore saat edit transaksi BBM/servis historis ditimpa
kendaraan kategori tepat sebelum simpan. Log BBM/servis tersimpan ke kendaraan yang salah / berpindah diam-diam.
Reproduksi (fungsi asli, data kategori/kendaraan dari backup): kategori `Vario 125`+`bensin`, pilih `vario 110`, simpan -> kembali `veh_1`.

## Perbaikan (minimal, hanya `modules/finance/transaksi.js`)
- `_txApplyVehicleContext()`: konteks kategori diterapkan hanya saat konteks BERUBAH; bila sama, pilihan saat ini dipertahankan (jika valid).
- Konteks di-reset saat panel tersembunyi, dan saat `openTxModal()` / `editTx()` (`_txResetVehicleContext()`).
- Tidak ada perubahan data, saldo, SOT, atau migrasi. `resolveTxContextVehicleId()` tidak berubah.

## Perbaikan tes S2613 (bukan perubahan perilaku)
`tests/s2613-finance-actual-cash-reconciliation.test.js` gagal pada baseline (43) karena `finance-allocation-api.js` memakai `new Date()` untuk
menentukan "minggu ini", sedangkan fixture memakai tanggal tetap 2026-10-26. Tes sekarang mengunci jam fixture (Sabtu 2026-10-24) lewat `Date` di ctx.
Kode produksi `finance-allocation-api.js` tidak diubah (identik dengan baseline). Uji sensitivitas: jam dimajukan ke 2026-10-29 -> tes yang sama kembali gagal, jadi pemeriksaan tetap bermakna.

## E2E browser (baru): e2e/run-e2e-vehicle-isolation.js
Jalankan: `E2E_CHROME=/path/ke/chrome node e2e/run-e2e-vehicle-isolation.js` (fixture sintetis, tanpa data pribadi).
9 cek: konteks kategori -> kendaraan, pilihan manual tidak ditimpa, ganti kategori memperbarui konteks, simpan nyata (log BBM ke kendaraan pilihan,
1 transaksi, saldo turun sekali), edit transaksi historis tidak memindahkan kendaraan.
Hasil: build S2729 (baseline (43)+S2729) = 5/9 (4 gagal: log tersimpan ke Motor A, bukan Mobil C; edit memindahkan kendaraan); build S2730 = 9/9.

## Tes
`tests/s2730-vehicle-manual-override.test.js` (7 tes): 2 gagal pada kode S2729, semua lulus setelah perbaikan.
Tes ini memakai `tests/helpers/loadSource.js` repo asli (tidak disertakan).

## Verifikasi (baseline app-main (43).zip, SHA256 a9c77e7a...619c4b7f)
- Replay S2729 di atas baseline: 24 file, hash internal OK; tes target 39/39 lulus.
- Bundle & html DIBANGUN ULANG dengan `node scripts/build.js --require-minify` (versi 2711); `verify-bundle-freshness`: kedua bundle segar.
- `verify-window-expose`: OK (85 modul). `node --check`: OK.
- Full suite (6 kelompok) sebelum perbaikan tes: 7.320 lulus, 1 gagal (S2613, pra-ada di baseline), 1 skip. Setelah tes S2613 dikunci jamnya: file S2613 46/46 lulus.
- Browser E2E: e2e/run-e2e.js 26/26; e2e/run-e2e-vehicle-isolation.js 9/9.
- Berkas `backups/` hasil build tidak disertakan.
