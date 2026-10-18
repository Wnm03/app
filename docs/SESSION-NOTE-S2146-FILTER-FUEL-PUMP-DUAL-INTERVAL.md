# S2146 — Audit interval ganda Filter Fuel Pump

## Temuan
Master komponen menyatakan: `Periksa 12.000 km · ganti 48.000 km atau bila tekanan turun`, tetapi `SERVICE_MAINTENANCE_RULES['filter-fuel-pump']` hanya mendefinisikan `inspectKm: 12000`. Akibatnya interval penggantian 48.000 km hanya tertulis sebagai kondisi/keterangan dan tidak menjadi kandidat jadwal terstruktur.

## Perbaikan
Menambahkan `replaceKm: 48000` dan `replaceAction: 'ganti'` ke registry aturan. Sumbu pemeriksaan 12.000 km tetap memakai `periksa`; sumbu penggantian 48.000 km berdiri sendiri. Kebijakan canonical `gantiResetsInterval: false` pada master tidak diubah, sehingga pemeriksaan tidak berpura-pura menjadi penggantian dan tidak ada migrasi riwayat.

## Audit bug serupa
- Busi: aturan sudah punya inspect 4.000 km dan replace 8.000 km.
- V-belt CVT: aturan sudah punya inspect 8.000 km dan replace 24.000 km; periksa konsistensi dengan label master 32.000 km masih perlu review sumber interval.
- Coolant: aturan sudah punya inspect 4.000 km dan replace 12.000 km/24 bulan.
- Selang rem: aturan sudah punya inspect 4.000 km dan replace 48 bulan.
- Kampas/cakram/kaliper/tromol rem: interval saat ini adalah pemeriksaan; penggantian berbasis kondisi, jadi tidak diberi interval penggantian numerik tanpa sumber yang tervalidasi.
- Rantai keteng dan paking knalpot: berbasis kondisi/event; tidak diberi interval kilometer tebakan.

## Verifikasi
- 16/16 tes terpilih lulus: S2031, S2033, S2039/S2040, S2145 dan S2146.
- `npm run build` berhasil; bundle A/B lolos `node --check`; build/cache versi 2562 sinkron.
- Full suite dan service SOT gate belum dijalankan tuntas pada sesi ini; jangan menganggap full suite lulus.

## Catatan rilis
Build memberi peringatan bahwa `docs/AUDIT_MATRIX.md` tidak mutakhir (jumlah file dan bahasa berbeda) serta tiga source melebihi ambang 1.600 baris. Ini bukan kegagalan build, tetapi perlu ditangani terpisah.
