# Fuel Accuracy — Patch kumulatif 2741 → 2746

Baseline tetap `app-main (3).zip`. Paket ini hanya berisi file berubah dibanding baseline; bukan full release.

## Akumulasi 2741
- FuelStateHistory idempotent; baseline identik tidak membuat snapshot duplikat.
- Sinkronisasi BBM memakai tanggal log sebagai waktu kejadian; edit log lama tidak menimpa baseline lebih baru.
- Full tank pada tanggal sama menjadi ground-truth terhadap koreksi manual/partial fill.
- `correctedAt` mengikuti tanggal transaksi.
- Umur odometer dihitung dari catatan KM lintas BBM, servis, dan KM manual; stale setelah 7 hari.
- Confidence disembunyikan saat estimasi terbatas atau odometer stale.
- Kartu fuel menampilkan hint pembaruan KM.

## Akumulasi 2742–2744
1. Guard KM bersama dipakai pada simpan/edit catatan BBM, sinkron BBM dari transaksi, dan simpan/edit riwayat servis.
2. Lonjakan lebih dari 500 km meminta konfirmasi sebelum mutasi.
3. Pembatalan konfirmasi pada BBM transaksi membatalkan simpan transaksi melalui rollback yang ada.
4. Pembacaan odometer lintas domain menjaga kronologi per kendaraan.
5. Pengingat KM in-app muncul saat catatan terbaru berumur minimal 7 hari; tidak membuat timer atau write saat render.
6. Desain kalibrasi adaptif disertakan sebagai spesifikasi; belum diaktifkan.

## Akumulasi 2745–2746
1. Rekonsiliasi baseline setelah penghapusan log BBM dari Car Notes.
2. Rekonsiliasi baseline setelah penghapusan transaksi Keuangan yang terhubung ke log BBM.
3. Penghapusan baseline otomatis lama jika sumber full-tank tidak tersisa dan tidak ada koreksi manual yang bisa dipulihkan.
4. Pemulihan baseline dari full-tank tersisa atau histori koreksi manual.
5. Edit full-tank menjadi partial memicu rekonsiliasi dan tidak membiarkan baseline penuh yatim.
6. Tes regresi untuk penghapusan, pemulihan baseline, koreksi manual, edit full→partial, dan cascade transaksi.

## Validasi
- Build 2746: berhasil; bundle A/B lolos syntax check dan HTML/SW sinkron.
- Tes fokus gabungan: 73/73 PASS.
- ESLint file yang disentuh: 0 error; 28 warning unused-vars.
- Full `npm test`: belum selesai dalam 300 detik; satu kegagalan kontrak `DELETE-FILES.txt` terkait 5 retired paths pada baseline terdeteksi. Tidak diklaim lulus.
- CSV dan PWA perangkat nyata belum diverifikasi.

## Batasan
- Reminder KM adalah in-app, bukan push notification ketika aplikasi tertutup.
- Kalibrasi adaptif belum diimplementasikan dan tidak mengubah data historis.
- Konflik beberapa pembacaan KM pada tanggal sama masih memerlukan urutan jam yang eksplisit.
