# Verifikasi Build & Test — patch v1396 (dijalankan ulang secara independen)

Dijalankan: 2026-08-27, di sandbox terpisah dari yang dipakai pembuat patch.

## Metode
1. Extract `app-main__7_.zip` (base v1393) sebagai baseline bersih.
2. Timpa 14 file yang disebutkan di `PATCH-README-audit-backup-partsstock-v1396.md`
   + 3 file test baru.
3. Jalankan `node --test tests/*.test.js` (453 file test).
4. Jalankan `node --check` pada kedua bundle.
5. Jalankan `node scripts/build.js` (build script asli proyek) untuk cek
   sinkronisasi versi & sintaks — dijalankan terpisah, hasilnya TIDAK
   dimasukkan ke ZIP ini (lihat catatan di bawah).

## Hasil

**Test suite:**
```
tests 4749
pass 4749
fail 0
cancelled 0
skipped 0
```
✅ Cocok persis dengan klaim README (4749/4749 PASS, 0 regresi).

**Sintaks bundle (`node --check`):**
- `app-bundle-a.min.js` → OK
- `app-bundle-b.min.js` → OK

**Versi & cache:**
- `sw.js` → `CACHE_NAME = 'kw-cache-v1396'` ✓
- `index.html`, `app_production.html` → semua `?v=1396` ✓

## Catatan penting
Sempat dijalankan `node scripts/build.js` di atas hasil patch ini untuk
smoke-test build script proyek — ini otomatis membuat build BARU ke versi
1397 (perilaku normal build.js: auto-increment dari versi tertinggi yang
terdeteksi). Build 1397 tersebut BUKAN bagian dari patch v1396 dan **tidak**
disertakan di ZIP ini — semua file di ZIP ini sudah dikembalikan/diverifikasi
tetap di versi 1396 sesuai patch asli.

Kesimpulan: patch v1396 valid, apply bersih ke base v1393, semua test hijau.
Siap dipakai sesuai instruksi "Cara pakai patch ini" di PATCH-README.
