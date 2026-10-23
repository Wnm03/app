# PATCH-MANIFEST S2703 — Akumulasi S2653 + S2701 + S2702 + optimasi render Insight (infer katalog & hitungan BBM)

- Baseline: `app-main (36).zip` (`app-main__36_.zip`), SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`
- Patch yang diakumulasikan: S2653, S2701, S2702 (isi lengkap `patch-S2702-akumulasi-S2653-S2701-insight-catalog-v2656.zip`) + perbaikan S2703.
- Versi runtime: `s2595-carnotes-null-interval-guard-2657` (build resmi `node scripts/build.js --require-minify`)
- Format: overlay; hanya file yang byte-nya berbeda dari baseline + file baru. **Tidak ada file yang dihapus.** Berkas `backups/` tidak disentuh (backup bundle yang dibuat build di sandbox tidak disertakan).

## File berubah (20)
- `CHANGELOG.md` — entri S2703 — SHA-256 baseline `8aed69f612d9fcce957fe345c5f3119c21b801922aa64008cd9c0935e9136ba4` → patch `a32389cc2e4e4b868ae8abf5212371c347835bdc970582ce087cdd70cd8cd33e`
- `FILE-HASHES-SHA256.txt` — hash disegarkan lewat scripts/refresh-file-hashes.py --write — SHA-256 baseline `913858c4ad670ce7ee0ed9bd4c66e2cbeb27abfcf5ed8437b1bc6ca4e3b3b7a9` → patch `14b69e6ac17f3731b3b989b3ad541e06fe1ac7a6cfe60ba1a8f01445a58fb6df`
- `app-bundle-a.min.js` — build resmi (bundle produksi) — SHA-256 baseline `aa3df7386d39c95aaf17b934e785e04df82c00004df9b03c78976544d003a39d` → patch `6a55ec979585276af6c4cffa266e3f950f46f7108a456f4cc8abedfa9c02a1b1`
- `app-bundle-b.min.js` — build resmi (bundle produksi; memuat perbaikan S2703-P1-1/P1-2) — SHA-256 baseline `c53b52feda238ff545cd0b1ea1e01593b0558a715c37d008c19b4066b54f5fda` → patch `6086c4c98e04e6425df463edaa9ff1726c7f3b39e1a8fccef7778a8570a0281a`
- `app_production.html` — build resmi (versi ?v=2657) — SHA-256 baseline `df49cd7441ca41f65df83b9a36b4f00af3507680cec9778201e2ae39fabb7a64` → patch `9d02f994071808fbfb44376d45484b3c3e6bdaf6302eea9d36238f7960733041`
- `chat-action-handlers.js` — konstanta versi di-bump build — SHA-256 baseline `b7b359b115cce9db7ef6e6763ad93dcaac5671768e98be402da8460c26a38e2c` → patch `606507082539089e775d611208793d86988a5b2e4c8314f6b5488c8f4eb7a61f`
- `docs/COVERAGE-PER-MODULE.md` — ditulis ulang build — SHA-256 baseline `13bae43ae4ddb5e4f779caf45ae464ded41f9a296b0bcb14cb522aae5d153fdc` → patch `b749fd86829be92f100a7cea3e13103a189c078d215cd4ef01d58c6c5d55e4d1`
- `docs/FILE-MAP.md` — ditulis ulang build — SHA-256 baseline `4f48d0b5adc31c8d85c072a539c6b670d8d00db256b5b4604ed3368c1464a99b` → patch `b792499641840378912a6bd3d312b36134e141e111f152bee094d3ca582a70ac`
- `index.html` — build resmi (versi ?v=2657) — SHA-256 baseline `7795de54b8dd39f2b389bd08e5fbda91c02772aa56ceff9e695cf8948f734869` → patch `6fe2fab64061db198eca1686fc25632ea082cd2fecd489ac005e1c50e96f6b1e`
- `modern-ui-layer.css` — S2653 (Keuangan ringkas, CSS) — SHA-256 baseline `8c47b271ca52335d7a5ccafe3e2d7abb6b3d0fd2ebe23c9dc41bcc219d0be3c6` → patch `96235430c25663402f581e6492ab0cd66103b887880179d47e72a7f54c3a4a2f`
- `modules/shared/features-helpers-global-security.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `014c63105433e9d28e7afbd14dae63028ec0d1d32d279cae12d42dbefddb4907` → patch `f3697cd0356b4dcb4e1a42da52142ac7e8654b4e9a562d4b0888c6405085c8ad`
- `modules/shared/modals.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `88842ff120d56d4f8af104320ebeab1daad4acdf3ca19896e34332d574e6d141` → patch `c4296d830d3ba59e65ffdc9b9ef9664557efb8badf73d9dc0e024ca1f30dd1e8`
- `modules/shared/modules-calc.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `15ff464e34a5e089ef2953e4836d71549a418bc4fac04a0db911f94264df36df` → patch `042e6164f96340b6e3e8598ee680a3c1eec193834b472689b13e6c8e4855f9dd`
- `modules/shared/modules-render.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `1b227ba433e97b7d77b519cb8468633c3eefddc119869b10c92ef05178db7dfc` → patch `84b4cc0a276e3f154f87bfbf8bcdbafad2ca01da82a80498c39de33b190fb62d`
- `modules/shared/pwa-ux-performance.js` — S2653 + deklarasi lint NodeFilter (S2702-P2-1) — SHA-256 baseline `fd9190576a0f039167e3fb21baa1725f9e0541dd963546c7dad044ed4b1ef64f` → patch `b0153e701f0395a1a9cfb3ad613d55cd66f52097f9c2c1aec9abf9987fd2eaf4`
- `modules/vehicle/service-category-sot-reconciliation-s2007.js` — S2702-P1-1: snapshot+indeks katalog — SHA-256 baseline `4605518d428b0091ac069a27967cf0d76e1e81d3fa2f71ab868376168cf66a83` → patch `53177310996db792fce24324fb01143e9b8810fdf32b29e32e6b3206c22cc2ff`
- `modules/vehicle/service-input-catalog.js` — S2703-P1-1: indeks nama + cache hasil infer() — SHA-256 baseline `ef290c738b309f906dd032833a16a2fc97306317c8851fe503908ac6f999e9c9` → patch `b73131e76d48f01399adfc61745b142160ab20a023f2c1e3f019a12290aad934`
- `modules/vehicle/vehicle-core.js` — S2703-P1-2: memo per render-scope estimateKmPerDay/getFuelFullTankSegments — SHA-256 baseline `06c9f6fa8dd3e47f353530fd4b67bfb69b57e28fa5f5fcdf19b6788cfb3169e0` → patch `a4c7f8cafa1133cf83e8adba662a6df285955a68692dc0139b718131d1c84e5b`
- `scripts/verify-window-expose.js` — S2701: snapshot sumber per eksekusi — SHA-256 baseline `a3b3394d1621e4ae8933a148991b4b35fee025e5c6ff69b80b4c0427675e4d4c` → patch `de477004001f6ee0844ffcb023cf6bf233f90111ddcf3212b0069358e647d3e1`
- `sw.js` — build resmi (CACHE_NAME kw-cache-v2657) — SHA-256 baseline `4d2f628ccb6d8506ee03329009d018b766f7f461db9454cd78282381f81d3c78` → patch `34615c3ad19db64bcb10da155df8670f2a949aedc3a282d8463fe05abfd2b571`

## File baru (dokumen & tes, 17)
- `AUDIT-S2653-KEUANGAN-RINGKAS.md`
- `AUDIT-S2702-INSIGHT-CATALOG-LOOKUP.md`
- `AUDIT-S2703-INSIGHT-INFER-FUEL-CACHE.md`
- `CHANGED-FILES-S2701.txt`
- `CHANGED-FILES-S2702.txt`
- `CHANGED-FILES-S2703.txt`
- `PATCH-MANIFEST-S2701.md`
- `PATCH-MANIFEST-S2702-AKUMULASI.md`
- `PATCH-MANIFEST-S2703-AKUMULASI.md`
- `TEST-RESULTS-S2701.md`
- `TEST-RESULTS-S2703.md`
- `tests/fixtures/s2007-reference-original.js`
- `tests/fixtures/s2703-service-input-catalog-original.js` — fixture beku implementasi lama (service-input-catalog.js)
- `tests/fixtures/s2703-vehicle-core-fuel-original.js` — fixture beku fungsi BBM lama (vehicle-core.js)
- `tests/s2652-keuangan-ringkas.test.js`
- `tests/s2702-catalog-lookup-cache.test.js`
- `tests/s2703-fuel-infer-cache.test.js` — 10 tes diferensial S2703

## Penghapusan
Tidak ada.

## Penerapan
1. Ekstrak ZIP patch ini di atas salinan baseline `app-main (36)` (timpa file yang sama).
2. `python3 scripts/refresh-file-hashes.py --check` (harus `basi=0`), `npm run verify-bundle`.
3. `npm test` untuk verifikasi.

## Rollback
Ekstrak ulang baseline asli di atas hasil patch, hapus file baru yang tercantum di atas.
