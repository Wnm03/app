# S2166 — Runtime Projection Sync Gate

## Tujuan
Menutup gap antara data-layer SOT dan UI runtime: Servis, Komponen Pengingat, dan Riwayat harus membaca projection canonical yang sama dan selalu dibatasi kendaraan aktif.

## Prinsip
- `ServiceTaxonomySOT` tetap satu-satunya resolver identity kategori/komponen.
- `D.servisLogs` tetap owner fakta service/history.
- `D.serviceReminderPackages` tetap owner plan/config reminder.
- `ServiceRuntimeProjectionSOT` **bukan storage owner** dan tidak melakukan write.
- Semua projection runtime memerlukan `vehicleId` aktif.
- Target reminder dideduplikasi berdasarkan `vehicleId + masterCategoryId + serviceComponentId`.

## Projection
`ServiceRuntimeProjectionSOT.snapshot(data, vehicleId)` menghasilkan:
- `servis`
- `pengingat`
- `riwayat`
- `components`

Keempatnya memakai resolver canonical yang sama.

## Keamanan regresi
Projection tidak menghapus data. Record kendaraan lain tidak diproyeksikan ke kendaraan aktif. Target yang tidak dapat di-resolve canonical tidak ditampilkan sebagai component identity.

## Gate
S2166 memverifikasi canonical identity, active-vehicle isolation, duplicate projection collapse, shared identity Servis/Riwayat, dan audit runtime.

## Loader boundary
S2166 sengaja tidak mengubah daftar bundle/build secara implisit. Pada baseline yang diperiksa, daftar source produksi berada di build manifest terpisah. Karena patch kumulatif ini patch-only, facade harus diverifikasi masuk ke bundle sebelum UI production dianggap memakai projection ini.

Status: **projection/gate PASS; production bundle wiring belum disertifikasi pada S2166**.
