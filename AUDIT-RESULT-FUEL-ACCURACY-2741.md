# Audit Ulang Fuel Bar — 2741

## Hasil pemeriksaan mendalam

| Area | Status | Perubahan |
|---|---|---|
| Koreksi manual vs full tank | Ditangani | Urutan tanggal kejadian; full tank menang pada tanggal sama, log lebih lama tidak menimpa baseline baru |
| Full tank diedit belakangan | Ditangani | `correctedAt` memakai tanggal log |
| Partial fill berulang | Ditangani | Histori dedup dan partial fill tidak menimpa full tank pada tanggal sama |
| Riwayat fuelState membengkak | Ditangani | Snapshot hanya ditambah jika baseline berubah |
| Odometer basi | Ditangani | Umur dihitung dari catatan dengan KM tertinggi; ambang 7 hari; peringatan kartu fuel |
| Confidence saat estimasi terbatas | Ditangani | Skor tidak dipublikasikan saat konsumsi belum dapat dihitung |
| Salah ketik lonjakan KM | Ditangani sebagian | Konfirmasi >500 km pada editor KM manual; jalur input BBM/servis tidak dipaksa memakai dialog baru |
| Clamp liter | Sudah ada | Estimator tetap clamp ke rentang 0..kapasitas tangki; tidak ada perubahan rumus konsumsi |

## Risiko tersisa / belum diklaim tertutup

1. Efisiensi berbasis satu segmen full-to-full belum cukup untuk menghitung konsumsi. Patch memilih menandai estimasi terbatas daripada menebak km/L.
2. Umur odometer tidak dapat diketahui jika catatan KM tertinggi tidak memiliki tanggal valid. Dalam keadaan itu `odometerAgeDays` bernilai `null`; sistem tidak mengarang umur.
3. Reminder input KM berkala, kalibrasi adaptif km/L, rentang liter probabilistik, dan validasi kapasitas profil masih merupakan pekerjaan lanjutan.
4. Uji perangkat fisik/PWA dan impor CSV tidak dilakukan dalam lingkungan ini.

## Tes regresi baru/diubah

- Histori baseline identik tidak membuat snapshot kedua.
- Full tank lama tidak menimpa koreksi manual baru.
- Full tank tanggal sama mengalahkan koreksi manual.
- `correctedAt` full tank memakai tanggal transaksi.
- Partial fill pada tanggal sama tidak menimpa full tank.
- Odometer baru vs stale memengaruhi confidence sesuai kebijakan.
