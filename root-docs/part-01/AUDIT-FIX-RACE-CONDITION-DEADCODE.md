# Audit fix — 2026-08-02

Dua perbaikan diterapkan langsung ke source (bukan bundle) berdasarkan audit
kelas bug "konsistensi lintas modul" & "race condition save()/render() di
path async".

## 1. Race condition: hasil scan OCR bisa nyasar ke record lain (FIXED)

**File diubah:**
- `modules/shared/modal-navigasi.js` — `openModal()` sekarang menaikkan
  `window._modalEpoch` tiap kali dipanggil (termasuk saat modal yang sama
  dibuka ulang untuk record berbeda, mis. edit Tagihan A lalu edit Tagihan B
  — keduanya lewat `openBillModal()` → `openModal('billModal')`).
- `modules/shared/scan-ocr.js` — semua fungsi `scan*` (scanReceipt,
  scanBuktiTransfer, scanTanggalDariFoto, scanKmOdometer, dan turunannya)
  sekarang menangkap `window._modalEpoch` SEBELUM `await ocrRecognize(file)`,
  lalu membatalkan penulisan hasil OCR ke DOM kalau epoch sudah berubah saat
  OCR selesai (artinya user sudah pindah modal/record sebelum scan kelar).
  User diberi toast "⚠️ Hasil scan dibatalkan — tab/form sudah berpindah
  sebelum scan selesai" alih-alih data nyasar diam-diam.
- `tests/scan-ocr-epoch-guard.test.js` (baru) — regresi utk mekanisme ini.

**Lihat detail root cause & skenario race di laporan audit sebelumnya
(percakapan ini).** Patch unified diff tersedia terpisah:
`fix-race-condition-scan-ocr.patch`.

Semua test lama tetap hijau setelah perubahan ini (`npm test` — 2164/2166
pass; 2 kegagalan sisanya ada di `tests/dashboard-hub-goto-subtab.test.js`,
sudah dikonfirmasi TIDAK terkait — file itu cuma load `dashboard-hub.js`,
tidak menyentuh `scan-ocr.js`/`modal-navigasi.js` sama sekali, jadi gagal
sebelum maupun sesudah perubahan ini).

## 2. Dead code: 4 file duplikat basi di modules/vehicle/ (REMOVED)

File berikut dihapus karena terbukti tidak pernah dimuat oleh
`scripts/build.js` (hanya versi `modules/shared/...` yang direferensikan),
dan sudah drift jauh dari versi aktif (kehilangan beberapa bugfix penting):

- `modules/vehicle/modules-render.js`
- `modules/vehicle/modals.js`
- `modules/vehicle/modules-calc.js`
- `modules/vehicle/features-helpers-global-security.js`

Sudah diverifikasi tidak ada referensi tersisa ke path-path ini di seluruh
codebase (`grep -rl` kosong) setelah penghapusan. Karena ini file yang
DIHAPUS (bukan diedit), tidak disertakan sebagai unified diff (konten asli
sudah tidak lagi diperlukan/dipakai) — cukup dicatat di sini sebagai bagian
dari release notes/CHANGELOG.
