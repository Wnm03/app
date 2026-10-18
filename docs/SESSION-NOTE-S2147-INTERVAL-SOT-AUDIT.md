# S2147 — Audit Konsistensi Interval Servis (lanjutan S2145–S2146)

## Tujuan
Audit lanjutan pada baseline `app-main (23).zip` dan mempertahankan patch kumulatif S2145/S2146. Fokus: jangan menyamakan interval lintas model kendaraan jika manual pabrikan berbeda.

## Temuan terkonfirmasi
1. `modules/vehicle/sparepart-servis-b.js` menyimpan interval V-belt per entri TORSI_DB/model:
   - Honda Vario 125 KZR: periksa 8.000 km, ganti 32.000 km.
   - Honda BeAT FI Gen 1 / keluarga BeAT FI dan Vario 110 yang dikelompokkan bersama: periksa 8.000 km, ganti 24.000 km.
2. `modules/vehicle/service-master-data.generated.js` memiliki satu komponen kanonik `v-belt-cvt` dengan interval 32.000 km dan `vehicleTypeScope: ["motor"]`, tanpa `modelScope`. Karena itu angka 32.000 km berpotensi berlaku terlalu luas di pengingat generik, termasuk model yang TORSI_DB-nya menyebut 24.000 km.
3. Ini bukan bukti bahwa salah satu angka salah; perbedaan tampaknya memang model-spesifik. Memaksa angka 24.000 atau 32.000 km secara global akan merusak sebagian model.
4. `ServiceMasterDB` menyimpan satu record per `componentId`, sehingga sekadar menambahkan duplikat `v-belt-cvt` untuk model lain tidak aman tanpa dukungan resolver model-specific pada jalur pengingat.

## Keputusan aman
- Tidak mengubah angka V-belt global pada sesi ini.
- Tidak mengubah data riwayat servis pengguna.
- Tandai isu sebagai gap arsitektur SOT: pengingat perlu menyelesaikan interval dari profil kendaraan/model sebelum fallback ke master generik.
- Sebelum implementasi, harus diuji bagaimana `vehicleId` dipetakan ke `modelId` dan apakah semua pemanggil pengingat membawa konteks model. Patch berikutnya harus memperbaiki resolver terpusat, bukan sekadar mengganti angka master.

## Audit regresi yang diwajibkan untuk sesi implementasi
- Vario 125 KZR: interval penggantian V-belt 32.000 km.
- BeAT FI Gen 1: interval penggantian V-belt 24.000 km.
- Vario 110: jangan anggap angka terverifikasi spesifik bila sumber yang tersedia hanya menyatakan platform mesin bersama; pertahankan status sumber/ketidakpastian.
- Kendaraan tanpa model terpetakan: fallback konservatif dan transparan, jangan klaim nilai model-spesifik.
- Slide Piece CVT: penggantian mereset interval hanya sesuai policy komponen S2145.
- Filter Fuel Pump: pemeriksaan 12.000 km dan penggantian 48.000 km/berdasarkan kondisi harus tetap terpisah sesuai S2146.

## Status verifikasi
Ini audit statis atas source dan policy yang tersedia. Full test suite dan SOT integrity gate belum dibuktikan selesai oleh sesi ini. Tidak ada klaim bahwa seluruh tes aplikasi lulus.
