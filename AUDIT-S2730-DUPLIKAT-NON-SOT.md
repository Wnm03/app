# AUDIT S2730 — Pembersihan kartu duplikat non-SOT (data, bukan kode)

Tidak ada perubahan kode. Pembersihan dilakukan pada salinan backup-keluarga-W-2026-10-20.json lewat API resmi
VehicleCarNotesSOT (removeServiceInterval + removeLegacyCategoryProjection), urutan yang sama dengan tombol Hapus kategori di UI
(sparepart-servis-ui.js). Backup asli tidak diubah.

## Kriteria hapus (semua harus terpenuhi)
1. Kartu terikat kendaraan (bukan template global), tanpa serviceComponentId (bukan SOT komponen).
2. Tidak punya baseline sah sendiri (status Belum diketahui).
3. Tidak ada stok sparepart yang tertaut; riwayat servis tidak diubah.
4. Ada bukti duplikat: kartu kanonik untuk komponen yang sama ada, atau nama tingkat-induk (bukan komponen).

## Dihapus (Vario 125, veh_1)
- Servis Cvt (sp_1787742991499_reko_10): nama tingkat-induk, bukan komponen; log induk teks bebas tidak boleh mereset kartu berkomponen (aturan T2).
- Grease Cvt (sp_1787742991499_reko_11): log aplikasi sendiri memetakan nama ini ke komponen pelumasan-cvt-grease; kartu kanonik sudah ada. Interval lama 4.400 km -> ikut SOT 8.000 km.
- Slidepiece cvt (sp_1789132698355): alias normalisasi dari slide-piece-cvt; kartu kanonik sudah ada. Interval lama 2.800 km -> ikut SOT 8.000 km.

## Sengaja TIDAK dihapus
- Template global (sp_component_*, tanpa vehicleId): dipakai semua kendaraan; status DUPLICATE di audit S2007 hanya karena ada salinan per-kendaraan.
- Pully Cvt, Pully, Tutup Pully: punya baseline sah sendiri (aman), tidak ada padanan kanonik tegas. Catatan: baseline Pully Cvt = 21.311 padahal log namanya hanya ganti di 5.000; perlu ditinjau.
- Pin brake pad, pentil ban, castrol power 1 matic 1040, grandmax "Servis": kartu buatan pengguna tanpa padanan kanonik (grandmax "Servis" sama polanya dengan Servis Cvt; tunggu keputusan).

## Verifikasi
- Selisih backup: hanya sparepartCats (249->246) dan vehicles[0].sot.serviceCategories (59->56) + serviceIntervals (60->57).
- servisLogs dan partsStock identik byte-per-byte.
- Replay mesin pengingat: 3 kartu hilang, 0 perubahan status/km pada kartu lain; Vario 125 Belum diketahui 12 -> 9.
- serviceSchedules/maintenanceState (cache turunan) masih memuat 3 entri lama; dibangun ulang otomatis oleh app (provision / vsfiServiceState) dan tidak dipakai kartu Pengingat.
- log.categoryId lama (6 log) tetap sebagai catatan historis, tidak ditulis ulang.
