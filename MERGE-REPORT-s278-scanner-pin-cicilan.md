# Merge Report — s278 (v938)

Menggabungkan 3 cabang yang sebelumnya bercabang terpisah dari v931 & belum saling mewarisi:

## Sumber
| Fix | Sumber zip | File source yang diambil |
|---|---|---|
| Vehicle-scanner camera hang | `kw_update_v933_s273-fix-vehicle-scanner-camera-hang.zip` | `modules/vehicle/vehicle-scanner.js` |
| Bayar Bulan Depan (Tagihan) + fix filter nav | `kw_release_v933_s274-fix-cicilan-autofill-add-bayar-bulan-depan.zip` (dipakai sebagai BASE, karena satu-satunya repo sumber utuh) | seluruh repo |
| PIN muncul 2x | `kw_release_v934_s275-fix-pin-double-show.zip` | `modules/shared/keamanan-pin.js` |

Catatan: `kw_release_v935_s276-fix-scan-barcode-stuck.zip` TIDAK dipakai sebagai sumber source
terpisah — hasil pengecekan bundle-nya menunjukkan isinya adalah **fix vehicle-scanner yang
sama persis** dengan s273 (`vehicleScannerWithCameraTimeout`), hanya ditempel manual ke
`app-bundle-b.min.js` di branch pin-fix tanpa disertakan filenya sebagai source terpisah.
Jadi begitu source `vehicle-scanner.js` dari s273 digabung ke base, fix ini otomatis ikut.

## Proses
1. Base: full repo dari s274 (satu-satunya paket yang berisi seluruh source, termasuk `modules/`).
2. Timpa `modules/vehicle/vehicle-scanner.js` dengan versi s273 (timeout guard 10 detik utk
   `getUserMedia()` yang bisa nyangkut).
3. Timpa `modules/shared/keamanan-pin.js` dengan versi s934/s935 (guard idempoten
   `window.__kwPinScreenShown` biar `showPinScreen()` tidak double-render).
4. `node --test tests/*.test.js` → **1889/1889 lolos**.
5. `node scripts/build.js` (otomatis bump versi ke v938, sinkron semua konstanta versi,
   regenerate `app-bundle-a.min.js` & `app-bundle-b.min.js`, cek sintaks lolos).

## Belum dikerjakan
Bug "Cara Bayar balik ke Tunai saat edit Cicilan" (dari screenshot sebelumnya) — belum ada
di paket manapun yang diupload, termasuk hasil merge ini. Masih perlu dikerjakan dari nol
di sesi berikutnya.

## Verifikasi fix di bundle final
- `vehicleScannerWithCameraTimeout` → ada
- `__kwPinScreenShown` → ada
- `billActionPayAdvance` / "Bayar Bulan Depan" → ada
- Versi tersinkron: `?v=938`, `kw-cache-v938`
