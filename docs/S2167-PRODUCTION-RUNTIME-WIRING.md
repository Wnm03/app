# S2167 — Production Runtime Wiring & UI Projection Gate

S2167 memastikan `ServiceRuntimeProjectionSOT` dari S2166 masuk production bundle dan consumer UI Pengingat/Riwayat memakai projection canonical yang sama dengan active-vehicle scope.

## Perubahan
- `scripts/build.js` memuat `service-runtime-projection-sot-s2166.js` setelah taxonomy.
- `servis-b.js` memakai `ServiceRuntimeProjectionSOT.reminderCatalog(D, curVehicleId)` untuk projection Pengingat.
- Jalur Riwayat memakai `ServiceRuntimeProjectionSOT.historyRows(...)` dengan vehicle scope.
- Projection tetap read-only dan bukan storage owner.
- Reminder catalog dideduplikasi dengan `vehicleId + masterCategoryId + serviceComponentId`.

## Guard
Gate gagal jika facade tidak masuk build, dimuat sebelum taxonomy, membuat storage baru, memutasi `D.*`, atau consumer Pengingat/Riwayat bypass projection.

## Status
- S2167 focused: 4/4 PASS.
- S2166 + S2167 focused: 9/9 PASS.
- Full application SOT integrity: PASS, runtimeSources=422.
- Full application architecture integrity: PASS, runtime entries=422.
- Persistence integrity: PASS.
- Production minified build belum tersertifikasi karena environment tidak menyediakan `esbuild`.

## Fix round

Path hardcoded `app-main/...` dihapus (portable dari root repo), kontrak S2080 `getServiceCategories(vehicleId)` dipulihkan di `getReminderCategoriesForVehicle`, scanner source mengabaikan `backups/`, dan final gate P4.7 tidak lagi mengunci versi build 2170.
