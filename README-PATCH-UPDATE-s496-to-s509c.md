# UPDATED PATCH — repo-main (GitHub) → kw_release v1243 (s509c)

## Kenapa patch ini dibuat ulang

Patch yang diupload (`kw_patch_v1242-to-v1243_s509c-asset-vehicle-view-action`)
hanya berisi diff satu sesi terakhir: **s509b (v1242) → s509c (v1243)**.

Setelah `repo-main` (isi repo GitHub yang diupload) dibandingkan langsung ke
`kw_release` (isi lengkap rilis v1243), ternyata repo GitHub itu jauh
tertinggal — bukan cuma 1 sesi:

- Build version di `repo-main`: **`s496-owner-registry-cross-domain-validation`**
  (terlihat di `modules/shared/modules-calc.js`, `features-helpers-global-security.js`, dll.)
- Build version di `kw_release`: **`s509c-asset-vehicle-view-action`**

Artinya repo GitHub ketinggalan **13 sesi** (s497 → s509c / v1227 → v1243).
Kalau patch v1242-to-v1243 yang lama itu saja yang ditempel ke `repo-main`,
hasilnya TIDAK akan sinkron karena base version-nya beda jauh (patch itu
diracik dengan asumsi base sudah di v1242/s509b, padahal repo-main masih di
v1226/s496).

Patch di folder ini adalah **hasil perbandingan penuh** `repo-main` vs
`kw_release` (bukan cuma 1 sesi), jadi kalau ditempel akan langsung
menyamakan repo-main ke v1243/s509c.

## Isi patch (72 file)

### File baru (tidak ada di repo-main) — 44 file
Termasuk seluruh dokumentasi sesi s483, s489–s493, s497–s509c, dan test baru
untuk fitur-fitur tersebut (owner registry, dana titipan tab terpadu,
vehicle-asset bridge, asset-owner quota, dst).

### File yang berubah isinya — 28 file
```
app-bundle-a.min.js
app-bundle-b.min.js
app_production.html
chat-action-handlers.js
data-health-check.js
docs/BUG_REGISTRY.md
docs/COVERAGE-PER-MODULE.md
docs/FILE-MAP.md
docs/RELEASE-GATE-LOG.md
index.html
modules/asset/aset.js
modules/asset/investasi-tx-view.js
modules/asset/investasi-view.js
modules/asset/investasi.js
modules/dashboard-hub/dashboard-hub.js
modules/finance/dana-titipan-portfolio-presenter.js
modules/finance/tx-list-cashflow.js
modules/shared/action-wrappers.js
modules/shared/features-helpers-global-security.js
modules/shared/modals.js
modules/shared/modules-calc.js
modules/shared/modules-render.js
modules/shop/business-flow-presenter.js
modules/shop/cobek-etalase.js
modules/vehicle/vehicle-core.js
scripts/build.js
sw.js
tests/vehicle-jenis.test.js
```

Semua file di atas diambil **apa adanya (full content)** dari `kw_release`
(rilis v1243 lengkap), sudah diverifikasi cocok byte-per-byte.

## File yang HANYA ada di repo-main (tidak disentuh patch ini)

Ini dokumentasi lokal repo-main sendiri (bukan bagian dari lineage kw_release),
biarkan saja, tidak perlu dihapus:
```
ADDED-FILES.txt
CHANGED-FILES.txt
FIX-v1108-to-v1111-s404-lint-overlay-open-reflow-guard.md
PATCH-INFO.md
PATCH-README-KONSOLIDASI-s484gabungan-to-s487.md
PATCH-README-s481.md
PATCH-README-s488.md
REMOVED-STALE-FILES-MANUAL.txt
```

## File STALE di repo-main (disarankan dihapus, tidak ada di rilis manapun)

File-file ini sudah ditandai stale sejak `REMOVED-STALE-FILES-MANUAL.txt`
lama (era v1165/s446) dan sampai sekarang (v1243/s509c) TETAP tidak pernah
ada di release manapun — kemungkinan besar duplikat nyasar di folder
`modules/shop/` yang harusnya di `modules/shared/`:
```
modules/shop/features-helpers-global-security.js
modules/shop/modals.js
modules/shop/modules-calc.js
modules/shop/modules-render.js
modules/shop/multi-owner-engine.js
```
Patch ini TIDAK menghapusnya otomatis — hapus manual kalau memang sudah
dikonfirmasi tidak dipakai/diimport dari mana pun.

Selain itu ada satu test yang cuma ada di repo-main dan sudah tidak ada di
rilis terbaru (kemungkinan sudah di-retire/di-merge ke test lain):
```
lifeos/adapters/s456-goal-adapter-exclude-titipan.test.js
```

## Cara pakai

1. Timpa (overwrite) 28 file "berubah" di atas dengan versi di folder ini.
2. Tambahkan 44 file "baru" ke path yang sama seperti struktur folder ini.
3. (Opsional, direkomendasikan) hapus 5 file stale `modules/shop/*` di atas.
4. Jalankan test suite untuk verifikasi (`npm test` sesuai `package.json`).
