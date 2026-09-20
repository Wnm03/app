# PATCH S1864 — Service Master Catalog Expansion

Patch ini adalah **akumulasi dari PATCH S1863**. Jangan menerapkan hanya file S1864 secara terpisah jika target belum memiliki seluruh perubahan S1863.

## Perubahan
- Service master diperluas dari 50 menjadi 100 maintenance components.
- 13 kategori existing dipertahankan.
- ID 50 component lama dipertahankan.
- `catalogRefs` dan `catalogSources` ditambahkan untuk provenance audit.
- Tidak ada gambar katalog yang dimasukkan ke bundle.
- Tidak ada parallel maintenance-history store.
- Build/version/cache dinaikkan ke `s1864-service-master-catalog-100-1864` / cache 1864.

## Source catalog
Honda Cengkareng — Honda Vario Techno 125 -2 (KZRJ 2013–2015):
https://www.hondacengkareng.com/catalogs/katalog-honda-vario-techno-125-2/

## Verification
11/11 targeted tests PASS; build and bundle syntax gates PASS. Esbuild tidak tersedia sehingga bundle hasil build belum diminify.
