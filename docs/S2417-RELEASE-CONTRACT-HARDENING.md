# S2417 — Release Contract Hardening

## Tujuan

Menyediakan satu audit read-only untuk mengklasifikasikan kesiapan release tanpa
mengubah source, bundle, HTML, service worker, atau dependency tree.

## Source of truth

S2417 tidak menggantikan gate yang sudah ada. Ia mengorkestrasi/menampilkan status:

- `verify-bundle-freshness.js`
- `performance-budget.js`
- version synchronization HTML ↔ Service Worker
- patch contamination
- toolchain readiness (`node`, `npm`, `eslint`, `esbuild`)

## Reproducible build

`verify-reproducible-build.js` sengaja **tidak dijalankan** oleh S2417 karena
skrip tersebut membangun artifact dan dapat mengubah working tree. S2417 hanya
melaporkan apakah `esbuild` tersedia sehingga status `BLOCKED` tidak disamakan
dengan hasil deterministic-build yang sebenarnya.

## Penggunaan

```text
npm run audit:release-contract
```

Exit non-zero berarti ada contract yang `BLOCK`, `STALE/BLOCK`, atau `BLOCKED`.
Itu bukan izin untuk melakukan override otomatis.

## Batasan

S2417 tidak:

- membangun/minify Bundle-A atau Bundle-B;
- mengubah version/cache;
- menginstal dependency;
- mengubah runtime application code;
- menyatakan release siap bila toolchain/build belum diverifikasi.
