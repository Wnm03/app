# AUDIT S1868 — Dynamic Vehicle Onboarding & Maintenance Template Engine

## Scope

S1868 menambahkan alur onboarding kendaraan dinamis tanpa membuat database kendaraan atau history servis kedua. Target utama:

- pilihan jenis kendaraan pada form Tambah Kendaraan tetap menjadi entry point;
- kategori dan komponen perawatan berkala dibuat dinamis dari Service Master;
- template dapat ditinjau dan komponen dapat dicentang/nonaktifkan sebelum kendaraan disimpan;
- katalog PDF dinamis S1867 dapat memperkaya template jika katalog sudah terikat ke vehicleId;
- interval servis tidak boleh diinferensikan dari nama/jenis kendaraan; hanya interval yang sudah ada di Service Master/evidence katalog yang ditampilkan;
- template tersimpan sebagai metadata `vehicle.maintenanceTemplate`, sedangkan histori servis tetap memakai SOT lama `D.servisLogs`/repository yang sudah ada.

## Implementasi

### 1. `modules/vehicle/vehicle-maintenance-template-engine.js`

Engine baru membangun template dari tiga sumber berurutan:

1. generic recommendation berdasarkan `motor` / `mobil` / `listrik`;
2. taxonomy model yang sudah teridentifikasi oleh Vehicle Model SOT;
3. `PartsCatalogDB` jika `catalogId` atau katalog dinamis yang terkait `vehicleId` tersedia.

Setiap komponen membawa provenance sederhana (`source`, `confidence`, interval dari Service Master, dan `needsReview`). Engine tidak membuat interval baru.

### 2. `modules/vehicle/vehicle-core.js`

Form kendaraan sekarang:

- memanggil preview template saat jenis kendaraan berubah;
- menampilkan kategori + komponen sebagai checkbox;
- mempertahankan template existing jika jenis tidak berubah;
- menyimpan pilihan user ke `maintenanceTemplate` saat create/edit;
- tetap memakai `VehicleSOTProvisioning`, `VehicleServiceReminderSOT`, Buku Aset, dan event `vehicle.updated` yang sudah ada.

Tidak ada store history servis baru.

### 3. `modules/shared/modals.js`

Ditambahkan container `vehMaintenanceTemplateWrap` pada modal kendaraan. Tidak membuat modal kendaraan kedua.

### 4. `modules/vehicle/parts-catalog-database.js`

Ditambahkan `getCatalogByVehicle(vehicleId)` dan metadata `vehicleId` pada hasil `getCatalogs()` untuk menemukan katalog PDF dinamis S1867 yang sudah terikat ke kendaraan.

Katalog KZRJ/K46 tetap terpisah dan API lama tetap dipertahankan.

### 5. Vehicle Model SOT

`vehicle-model-registry-sot.js` dan `vehicle-sot-provisioning.js` diperbaiki agar membaca bentuk API produksi `DatabaseAPI.vehicleModel.getAll()` sebelum fallback kompatibilitas lama. Ini diperlukan supaya resolusi model yang sudah ada benar-benar dapat dipakai oleh template engine.

## Invariants

- Tidak ada penghapusan/renumbering bug audit sebelumnya.
- Service Master tetap 13 kategori / 102 komponen.
- KZRJ dan K46 tetap namespace katalog terpisah.
- S1867 PDF Auto Import tetap dipertahankan.
- Tidak ada gambar/PDF dimasukkan ke bundle.
- Tidak ada maintenance interval yang dibuat hanya karena sebuah komponen terlihat umum pada jenis kendaraan.
- Template dapat diedit sebelum commit, tetapi perubahan pilihan komponen tidak mengubah master global.
- Vehicle instance tetap menjadi satu-satunya record kendaraan; template hanya metadata/projection pada record tersebut.

## Verification

- `tests/vehicle-maintenance-template-engine-s1868.test.js`: **3/3 PASS**.
- `tests/vehicle-model-registry-production-shape-s1868.test.js`: **1/1 PASS**.
- S1867 Honda PDF Auto Import: **3/3 PASS**.
- S1865 KZRJ catalog: **5/5 PASS**.
- S1866 K46 catalog: **7/7 PASS**.
- S1864 Service Master catalog expansion: **6/6 PASS**.
- S1863 Service Master database: **8/8 PASS**.
- Vehicle model registry/resolver/provisioning/reminder regression: PASS.
- PDF catalog import regression: **42/42 PASS**.
- Build S1868 sebelum dokumentasi final: PASS, bundle syntax PASS, version sync PASS, scanner/escape/catch/overlay checks PASS.

## Release caveat

Environment build tidak memiliki `esbuild`, sehingga bundle hasil build valid tetapi belum diminify. Ini sama dengan caveat S1863–S1867 dan bukan perubahan behavior S1868.
