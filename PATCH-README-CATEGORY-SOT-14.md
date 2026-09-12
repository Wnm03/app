# PATCH-CATEGORY-SOT-14 — CHECKLIST CATEGORY LINKAGE (CUMULATIVE S13)

## Tujuan
Menyempurnakan checklist servis 30 item agar setiap item membawa identitas `masterCategoryId` sebagai SoT dan dapat ditautkan ke kategori sparepart konkret **jika kategori tersebut memang sudah ada**.

## Perubahan
- `modules/vehicle/servis-checklist.js`
  - Tambah `ServisChecklist.resolveCategoryForItem(item, vehicleId)`.
  - Resolver memakai `resolveServisCatForVehicle()` yang vehicle-scoped.
  - Tidak membuat kategori baru.
  - Tidak pernah mengambil kategori private kendaraan lain.
  - `toLogPayload()` sekarang menyimpan `masterCategoryId` pada setiap item checklist yang dicentang.
  - `categoryId` hanya ditulis jika resolver menemukan kategori sparepart konkret yang valid untuk kendaraan aktif.
  - Jika kategori konkret belum ada, item tetap tersimpan valid dengan `masterCategoryId` tanpa `categoryId` palsu.

- `tests/servis-checklist-category-linkage-s14.test.js`
  - Memastikan tepat 13 grup / 30 item.
  - Memastikan seluruh item memiliki `masterCategoryId` yang berasal dari grupnya.
  - Memastikan `categoryId` hanya berasal dari resolver konkret.
  - Memastikan isolasi kendaraan pada resolusi kategori.

## Prinsip SoT
`Checklist item -> masterCategoryId -> (optional) concrete sparepart categoryId -> service log`

`masterCategoryId` adalah identitas kategori checklist yang selalu ada.
`categoryId` bukan master taxonomy baru dan tidak boleh ditebak/dibuat otomatis.

## Validasi
- `node --check modules/vehicle/servis-checklist.js` PASS
- `node --test tests/servis-checklist-category-linkage-s14.test.js` PASS (4/4)
- S12 Finance -> Service test PASS (8/8)
- S13 Service Event Lifecycle test PASS (7/7)

Catatan: full regression suite belum dinyatakan PASS; baseline lama memiliki failure/timeout yang sudah teridentifikasi pada audit sebelumnya.
