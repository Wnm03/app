# S2166 Runtime Projection Sync

S2166 menambahkan facade read-only `ServiceRuntimeProjectionSOT` untuk menyatukan projection runtime Servis, Komponen Pengingat, dan Riwayat.

Ini bukan database baru dan bukan write authority baru.

Run:

```bash
npm run audit:sot-runtime-projection
node --test tests/s2166-runtime-projection-sync.test.js
```
