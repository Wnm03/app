# S2031 — Reminder 1 SoT: Kategori → Komponen → KM/Interval

## Baseline
`app-main (25).zip`

## Temuan audit
1. Reminder runtime sudah mempunyai `VehicleServiceSOT`, tetapi `getEffectiveIntervalKm()`/`getEffectiveIntervalBulan()` belum membaca resolver SOT tersebut secara konsisten.
2. Kategori yang sudah tertaut ke `VehicleCatalog` dapat memiliki interval berbeda antara `D.sparepartCats` dan `VehicleCatalog.serviceInterval*`. Editor kategori sebelumnya hanya menyimpan ke `D.sparepartCats`; `VehicleServiceSOT.syncCategoryRule()` tersedia tetapi tidak dipanggil dari `saveCat()`.
3. `getEffectiveIntervalBulan()` sebelumnya dapat memakai `vehicle.intervalOverrides[cat.id]` (override KM) sebagai interval bulan. Ini memungkinkan angka KM bocor menjadi angka bulan.
4. `Servis.renderEditReminderTab()` memakai `getCanonicalServiceInterval()` tanpa `vehicleId`, sehingga presenter dapat membaca interval kategori lama sementara engine reminder membaca sumber katalog.
5. `predictService()` masih mengambil pool mentah `D.sparepartCats`, sehingga konsumen reminder non-UI dapat berbeda dari projection reminder canonical.

## Keputusan SoT
- **VehicleCatalog `serviceIntervalKm/serviceIntervalMonths` = SoT metadata servis komponen/part** setelah kategori mempunyai link katalog yang tidak ambigu.
- `D.sparepartCats` tetap compatibility index/legacy fallback.
- `vehicle.intervalOverrides[categoryId]` hanya exception **KM per kendaraan**; tidak pernah dipakai sebagai interval bulan.
- Tidak membuat field interval baru pada `servisLogs`.
- Tidak mengubah history, finance, evidence, atau schema transaksi.

## Perubahan
- `VehicleServiceSOT.resolveReminderRule(cat, vehicleId)` menjadi resolver tunggal komponen + interval.
- `getReminderCategoriesForVehicle()` mengekspos interval dari resolver yang sama.
- `getEffectiveIntervalKm/Bulan()` memakai resolver yang sama.
- `saveCat()` melakukan mirror edit kategori ke `VehicleCatalog` secara asynchronous, lalu refresh reminder setelah sync sukses.
- `predictService()` memakai reminder projection + dedupe canonical.
- `getCanonicalServiceInterval()` memakai `VehicleServiceSOT` bila konteks kendaraan tersedia.
- Presenter history-component memakai vehicle context saat membaca interval.

## Patch scope
Hanya file sumber yang berubah + regression test + manifest. Bundle hasil build **tidak** disertakan agar patch tetap overlay-only; jalankan build setelah patch diterapkan.
