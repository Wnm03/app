# Inventaris Kompatibilitas Komponen Servis — S2433.1

Sumber: data/database-kategori-komponen-servis.json (102 komponen, 13 grup). Metadata aditif: vehicleTypeScope, bodyTypeScope, modelScope, universal, scopeStatus.

Aturan proyeksi: filter hanya berlaku untuk motor/mobil. Tipe tidak dikenal, listrik, bodyType kosong, atau scopeStatus unverified => komponen tetap tampil. State/riwayat yang sudah ada tetap terbaca. Master tidak dihapus.

## Ringkasan

- Universal: 59
- Motor: 12
- BELUM PASTI (tampil untuk semua): 13
- Motor matic: 18

## Daftar

### Servis Mesin

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | oli-mesin | Oli Mesin | Universal |
| 2 | filter-oli | Filter Oli | Universal |
| 3 | busi | Busi | Universal |
| 4 | celah-klep | Celah Klep (Setel Klep) | Universal |
| 5 | rantai-keteng-tensioner | Rantai Keteng & Tensioner | Motor |
| 6 | kompresi-mesin | Kompresi Mesin | Universal |
| 7 | filter-kawat-oli-mesin | Filter Kawat Oli Mesin (Oil Strainer Screen) | BELUM PASTI (tampil untuk semua) |
| 8 | paking-knalpot | Paking (Gasket) Knalpot | Universal |
| 9 | seal-klep | Seal Klep | Universal |
| 10 | camshaft-rocker-arm | Camshaft & Rocker Arm | Universal |
| 11 | klep-intake-exhaust | Klep Intake/Exhaust | Universal |
| 12 | piston-ring | Piston & Ring Piston | Universal |
| 13 | cylinder-gasket | Cylinder & Gasket Cylinder | Universal |
| 14 | kruk-as-bearing | Kruk As & Bearing | Universal |
| 15 | oil-pump | Oil Pump | Universal |

### Servis CVT

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | v-belt-cvt | V-Belt CVT | Motor matic |
| 2 | slide-piece-cvt | Slide Piece CVT | Motor matic |
| 3 | boss-pulley-drive-face | Boss Pulley & Drive Face | Motor matic |
| 4 | roller-cvt | Roller CVT | Motor matic |
| 5 | kampas-kopling-ganda | Kampas Kopling Ganda | Motor matic |
| 6 | mangkok-kopling-ganda | Mangkok Kopling Ganda | Motor matic |
| 7 | seal-driven-face | Seal Driven Face (O-Ring & Karet) | Motor matic |
| 8 | per-sentri | Per Sentri | Motor matic |
| 9 | pelumasan-cvt-grease | Pelumasan CVT Grease (Pin Guide & Driven Face) | Motor matic |
| 10 | per-cvt | Per CVT (weight/kick starter spring) | Motor matic |
| 11 | pembersihan-rumah-cvt | Pembersihan Rumah CVT | Motor matic |
| 12 | bearing-bak-cvt | Bearing Bak CVT | Motor matic |
| 13 | busa-filter-cvt | Busa Filter CVT | Motor matic |
| 14 | driven-face-cvt | Driven Face / Pulley Belakang | Motor matic |
| 15 | bearing-driven-face | Bearing Driven Face | Motor matic |
| 16 | needle-bearing-cvt | Needle Bearing CVT | Motor matic |
| 17 | ramp-plate-cvt | Ramp Plate | Motor matic |
| 18 | clutch-spring-weight | Clutch Spring & Clutch Weight | Motor matic |

### Sistem Injeksi PGM-FI

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | throttle-body | Throttle Body (bersihkan) | Universal |
| 2 | isc | Idle Speed Control (ISC) | Universal |
| 3 | injector | Injector (bersihkan) | Universal |
| 4 | sensor-o2 | Sensor O2 / Oxygen Sensor | Universal |
| 5 | sensor-suhu-mesin | Sensor Suhu Mesin / Water Temperature Sensor | Universal |

### Sistem Bahan Bakar

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | filter-fuel-pump | Filter Fuel Pump (Saringan Bensin) | Universal |
| 2 | selang-tutup-tangki | Cek Selang & Tutup Tangki | Universal |
| 3 | fuel-pump-assembly | Fuel Pump Assembly | Universal |
| 4 | fuel-tank-strainer | Fuel Tank & Strainer | Universal |

### Sistem Pendingin

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | coolant | Coolant | Universal |
| 2 | radiator-water-pump | Radiator & Water Pump (cek/flush) | Universal |
| 3 | thermostat | Thermostat | Universal |
| 4 | kipas-radiator | Kipas Radiator / Cooling Fan | Universal |
| 5 | tutup-radiator | Tutup Radiator / Radiator Cap | Universal |
| 6 | selang-radiator | Selang Radiator | Universal |

### Sistem Pengereman

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | kampas-rem-depan | Kampas Rem Depan | Universal |
| 2 | minyak-rem | Minyak Rem | Universal |
| 3 | kampas-rem-belakang | Kampas Rem Belakang | Universal |
| 4 | cakram-rem-depan | Cakram Rem Depan | Universal |
| 5 | kaliper-rem-depan | Kaliper Rem Depan | Universal |
| 6 | master-rem-reservoir | Master Rem & Reservoir | Universal |
| 7 | tromol-rem-belakang | Tromol Rem Belakang | BELUM PASTI (tampil untuk semua) |
| 8 | selang-rem | Selang Rem | Universal |
| 9 | seal-piston-kaliper | Seal Piston Kaliper | Universal |
| 10 | guide-pin-kaliper | Guide/Pin Kaliper | Universal |
| 11 | kabel-rem-belakang | Kabel Rem Belakang | BELUM PASTI (tampil untuk semua) |

### Suspensi

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | kebocoran-shock | Cek Kebocoran Shock Depan/Belakang | Universal |
| 2 | oli-shockbreaker | Oli Shockbreaker Depan | Motor |
| 3 | engine-mounting-bushing-arm | Engine Mounting & Bushing Arm | Universal |
| 4 | seal-shock-depan | Seal Shock Depan | Motor |
| 5 | dust-seal-shock-depan | Dust Seal Shock Depan | Motor |
| 6 | shock-belakang | Shockbreaker Belakang / Rear Cushion | BELUM PASTI (tampil untuk semua) |
| 7 | bushing-swingarm | Bushing Swingarm | Motor |
| 8 | bearing-swingarm | Bearing Swingarm | Motor |

### Sistem Kemudi

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | stel-grease-komstir | Stel/Grease Bearing Komstir | Motor |
| 2 | bearing-komstir | Bearing Komstir | Motor |
| 3 | race-komstir | Race Komstir | Motor |

### Kelistrikan

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | aki | Aki | Universal |
| 2 | saklar-sistem-penerangan | Saklar & Sistem Penerangan | Universal |
| 3 | relay-sekring | Relay & Sekring (Fuse) | Universal |
| 4 | acg-starter | A.C.G. Starter | Motor |
| 5 | ignition-coil | Ignition Coil | Universal |
| 6 | generator-stator | Generator / Stator | Motor |
| 7 | starter-motor | Starter Motor | Universal |
| 8 | kabel-harness | Kabel / Wiring Harness | Universal |
| 9 | meter-speedometer | Meter / Speedometer | Universal |
| 10 | horn | Horn / Klakson | Universal |

### Roda

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | ban-depan | Ban Depan | Universal |
| 2 | ban-belakang | Ban Belakang | Universal |
| 3 | bearing-roda | Bearing Roda | Universal |
| 4 | bearing-roda-depan | Bearing Roda Depan | Universal |
| 5 | bearing-roda-belakang | Bearing Roda Belakang | Universal |
| 6 | dust-seal-roda | Dust Seal / Seal Roda | Universal |
| 7 | velg-rim | Velg / Rim Roda | Universal |

### Filter Udara

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | filter-udara | Filter Udara | Universal |

### Final Gear

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | oli-gardan | Oli Gardan/Final Drive | Universal |
| 2 | gear-final-drive | Gear Final Drive | BELUM PASTI (tampil untuk semua) |
| 3 | drive-shaft | Drive Shaft | BELUM PASTI (tampil untuk semua) |
| 4 | countershaft | Countershaft | BELUM PASTI (tampil untuk semua) |
| 5 | bearing-final-gear | Bearing Final Gear | BELUM PASTI (tampil untuk semua) |
| 6 | oil-seal-final-gear | Oil Seal Final Gear | BELUM PASTI (tampil untuk semua) |
| 7 | gasket-transmission-case | Gasket / Seal Transmission Case | BELUM PASTI (tampil untuk semua) |

### Body & Kontrol

| No | ID | Komponen | Klasifikasi |
|---|---|---|---|
| 1 | kabel-gas-standar-kunci | Cek Kabel Gas/Rem Belakang/Standar/Kunci Kontak | BELUM PASTI (tampil untuk semua) |
| 2 | kabel-gas | Kabel Gas | BELUM PASTI (tampil untuk semua) |
| 3 | kabel-rem-belakang-body | Kabel Rem Belakang | BELUM PASTI (tampil untuk semua) |
| 4 | kunci-kontak | Kunci Kontak / Ignition Switch | Universal |
| 5 | saklar-starter | Saklar Starter | Universal |
| 6 | saklar-rem | Saklar Rem | Universal |
| 7 | standar-tengah-samping | Standar Tengah & Samping | Motor |

## Perlu keputusan pemilik

Item BELUM PASTI belum boleh diklaim universal atau dihapus; tentukan scope-nya lalu jalankan ulang scripts/apply-service-component-scope.js (idempoten) dan scripts/generate-service-master-data.js.
