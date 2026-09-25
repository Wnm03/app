# AUDIT S2016 — Reminder → Riwayat Component Navigation

## Temuan

Screenshot menunjukkan tombol `📜 Riwayat` pada kartu Pengingat membuka tab Riwayat,
tetapi filter komponen hilang dan halaman menampilkan `Semua komponen` / seluruh riwayat.

Root cause kumulatif:

1. `openHistoryFromReminder()` sebelumnya membawa `sessionId` target ke
   `serviceHistorySessionFilter`, sehingga klik Riwayat sebenarnya membatasi hasil ke
   satu sesi.
2. `renderEditHistoryTab()` membangun `componentIds` dari field mentah
   `serviceComponentId || checklistItemId`; legacy log yang hanya punya nama/checklist
   tidak selalu masuk daftar komponen canonical.
3. `effectiveComponentFilter` kemudian dapat di-reset menjadi kosong ketika component ID
   yang dikirim Reminder tidak ditemukan pada daftar tersebut.
4. History menggunakan strict vehicle-ID comparison di beberapa titik, sedangkan Reminder
   sudah melakukan normalisasi `String(...)`.
5. `openModal()` tidak membersihkan view-state filter lama secara eksplisit.

## Perbaikan S2016

- Reminder → Riwayat sekarang bersifat **component-scoped lintas semua sesi** kendaraan aktif.
- Session filter di-reset sebelum tab Riwayat dibuka.
- Filter tujuan dipasang setelah `openModal()` agar state lama tidak menang.
- `openModal()` membersihkan `serviceHistorySessionFilter` dan
  `serviceHistoryComponentFilter` untuk record baru.
- `renderEditHistoryTab()` memakai `Servis.resolveLogServiceComponentId()` sebagai canonical
  resolver untuk daftar komponen dan filter row history.
- Legacy history tanpa `serviceComponentId` tetap dapat dipetakan dari checklist/infer nama.
- Vehicle ID dibandingkan secara normalized string.
- `componentIds` tidak lagi dipaksa mengikuti sesi target ketika session filter kosong.
- History tetap read-only; tidak ada penghapusan atau perubahan record histori.

## Kontrak UI

Klik `📜 Riwayat` dari kartu Pengingat berarti:

`kendaraan aktif + komponen yang dipilih + seluruh histori komponen tersebut`

Bukan hanya sesi servis terakhir.

Filter manual `Pengerjaan` tetap tersedia untuk mempersempit hasil bila pengguna memang memilih
satu sesi.

## Validasi

PASS:

- S2014 regression
- S2015 compatibility/dedupe regression
- S2012 historical component-navigation regression
- S2016 behavioral Reminder → History regression
- legacy history canonical-component resolution
- vehicle-ID normalization
- component resolver projection
- JavaScript syntax `servis.js`
- JavaScript syntax `app-bundle-b.min.js`
- bundle freshness

S2016 focused suite: **11/11 PASS** bersama regression S2012.

S2014 + S2015 + S2012 + S2016 combined focused run: **13/13 PASS**.

Tidak diklaim sebagai rerun full 7k+ suite karena helper/test repository lengkap tidak terdapat
pada patch kumulatif.
