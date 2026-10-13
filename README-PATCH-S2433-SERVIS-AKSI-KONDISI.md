# PATCH S2433 — Checklist Servis: Periksa/Ganti selalu tampil + kondisi rusak → ganti
Base: app-main (15) · Build: s2041-1-part-sot-hardening-2323

## Temuan audit (dijalankan di bundle asli, VM)
1. Dari 102 item checklist hanya 21 yang menawarkan Periksa+Ganti; 59 hanya Periksa, 13 hanya Ganti, 7 hanya Bersih, 2 Catat.
2. Tombol tindakan hanya muncul jika item sudah dicentang dan punya >1 pilihan.
3. Kondisi "Rusak" tidak mengubah tindakan (Filter Oli: Rusak tetap Periksa, Ganti ditolak). recommendServiceAction() sudah ada tetapi tidak terhubung.
4. Pindah kendaraan: kategori terisolasi per kendaraan (44 kategori/kendaraan, tanpa duplikat), tetapi hanya dibuat saat tab Servis aktif. TEMUAN BELUM DIPERBAIKI: semua kendaraan (termasuk mobil) mendapat 44 kategori yang sama dan master checklist (102 item) berisi komponen khusus motor (CVT, rantai keteng); tidak ada filter tipe kendaraan/model.
5. resolveServisCatForVehicle memakai === (id angka vs string gagal → jatuh ke kategori universal). Diperbaiki.
6. selectVehicle kini memanggil Sparepart.repairCategoryProjection() (idempoten) sehingga kategori kendaraan baru siap walau bukan tab Servis. Gate SOT/arsitektur/carnotes/window-expose PASS; service-sot gate hanya gagal di tes absensi yang juga gagal di base.

## Perubahan
- servis-checklist.js: Periksa & Ganti selalu sah untuk semua item; mode Otomatis/Manual (_actionManual); rusak → ganti, baik → periksa, lainnya → default semula; setActionAuto(); riwayat tersimpan dimuat sebagai manual.
- servis.js: tombol tindakan selalu tampil (juga sebelum dicentang; menekan otomatis mencentang), label mode, tombol "⚙️ Otomatis".
- sparepart-servis.js: perbandingan id vehicle tahan beda tipe.
- Tes baru: tests/servis-checklist-action-condition-s2433.test.js (7). 2 tes kontrak lama diperbarui.

## Verifikasi
Full test: 8822 tes, 8820 lulus, 1 gagal (absensi, sudah gagal di base, tidak terkait). 0 regresi baru. Release gate lolos (lint/minify dengan override standar).
