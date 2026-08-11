# IS-001 — Interface Specification

> **Status: DRAFT (placeholder)**
> Dibuat oleh TASK-001A (Blueprint Repository Bootstrap). Konten belum
> diisi — dokumen ini dirujuk oleh `docs/ai/AI_HANDOFF.md` sebagai
> bagian dari Master Specification yang menjadi syarat sebelum
> Milestone 0 (Vehicle Catalog) dimulai.

## Cakupan yang diharapkan (akan diisi)

- Kontrak data/field (mis. skema Vehicle Catalog vs `D.vehicles`
  existing — lihat `docs/ai/FOUNDATION_AUDIT.md` §6 Vehicle
  Architecture Health untuk field yang HARUS diproteksi)
- Kontrak storage (mis. bentuk key `vehicle-catalog:store` di
  `IDBStore`, lihat `FOUNDATION_AUDIT.md` §3)
- Kontrak navigasi/registry (`FEATURE_REGISTRY` target shape, lihat
  `FOUNDATION_AUDIT.md` §4)
- Kontrak komunikasi lintas-modul (pola adapter function-call vs
  `AIBus`, lihat `FOUNDATION_AUDIT.md` §5)

## Catatan

Belum ada isi teknis. Menunggu Master Specification lengkap sebelum
sesi implementasi fitur.

**Konten lengkap akan dilengkapi kemudian.**

## Catatan Cakupan (TASK-001D)

Keputusan cakupan Folder Standard sudah ditetapkan user dan dicatat di
`BLUEPRINT_CONSOLIDATION_PLAN.md` §7: `modules/vehicle/` (46 file,
100% sinkron dengan `scripts/build.js` per `FOUNDATION_AUDIT.md` §2)
**tetap flat**, tidak direstrukturisasi ke `{api,engine,store,ui,tests,
docs}`. Subfolder IS-001 berlaku untuk domain/top-level module baru ke
depannya. Ini bukan isi teknis final IS-001 — hanya cakupan
penerapannya. Isi lengkap tetap menunggu `NexusV6_IS001.zip`.
