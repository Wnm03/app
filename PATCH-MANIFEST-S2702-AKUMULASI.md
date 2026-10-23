# PATCH-MANIFEST S2702 — Akumulasi S2653 + S2701 + optimasi lookup katalog servis

- Baseline: `app-main (36).zip` (`app-main__36_.zip`), SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`
- Patch yang diakumulasikan: `patch-S2653-keuangan-ringkas-kumulatif.zip` (SHA-256 `d05d6c1755ca49e444e864b07d785680ea2c50363243dd7f16ce1a4a3ed692b6`), `patch-S2701-akumulasi-reset-interval-window-expose-v2653.zip` (SHA-256 `7434c4475b6729118038d1cac7aa0384eb630ca2d7703ae14ff26c1cb01fcb94`)
- Versi runtime: `s2595-carnotes-null-interval-guard-2656` (build resmi `npm run build`)
- Format: overlay; hanya file yang byte-nya berbeda dari baseline + file baru. **Tidak ada file yang dihapus.** Berkas `backups/` tidak disentuh.
- Sumber yang tumpang-tindih antara S2653 dan S2701 identik byte-per-byte (diverifikasi SHA-256); hanya bundle/dokumen hasil build yang berbeda, sehingga dibangun ulang, bukan digabung manual.

## File berubah (18)
- `CHANGELOG.md` — entri S2702 — SHA-256 baseline `8aed69f612d9fcce957fe345c5f3119c21b801922aa64008cd9c0935e9136ba4` → patch `c4fcff89203d45154b9292f673483b17499eeec6553724cdb36bbb40b2f62f8a`
- `FILE-HASHES-SHA256.txt` — hash disegarkan lewat scripts/refresh-file-hashes.py --write — SHA-256 baseline `913858c4ad670ce7ee0ed9bd4c66e2cbeb27abfcf5ed8437b1bc6ca4e3b3b7a9` → patch `e74eb96322047b90a871d2e12933a72ccbe98a3db44b21d883259bea0ac4a956`
- `app-bundle-a.min.js` — build resmi (bundle produksi) — SHA-256 baseline `aa3df7386d39c95aaf17b934e785e04df82c00004df9b03c78976544d003a39d` → patch `99f8df5a4c1d15138b86474da9a0e417024d9f9c1a71d0187f0532eebc3c471b`
- `app-bundle-b.min.js` — build resmi (bundle produksi; memuat perbaikan S2702-P1-1) — SHA-256 baseline `c53b52feda238ff545cd0b1ea1e01593b0558a715c37d008c19b4066b54f5fda` → patch `a5aae6cb9cad018d90cfb1057ccd1112b5d572c9d96d170b650d16e51b4ee1a1`
- `app_production.html` — build resmi (versi ?v=2656) — SHA-256 baseline `df49cd7441ca41f65df83b9a36b4f00af3507680cec9778201e2ae39fabb7a64` → patch `41df7a1487ddcc15833cd7b10c3f31d2dc569899cdbf44c792851c8c9ff39b8f`
- `chat-action-handlers.js` — konstanta versi di-bump build — SHA-256 baseline `b7b359b115cce9db7ef6e6763ad93dcaac5671768e98be402da8460c26a38e2c` → patch `32c79fdd5a731f1640196925df37b940e3aa66b178e4d3be39f2643d7b3101a4`
- `docs/COVERAGE-PER-MODULE.md` — ditulis ulang build — SHA-256 baseline `13bae43ae4ddb5e4f779caf45ae464ded41f9a296b0bcb14cb522aae5d153fdc` → patch `40129d75c4a37caf51dc56321a10f189952405f5ed868599a787e4bf86447132`
- `docs/FILE-MAP.md` — ditulis ulang build — SHA-256 baseline `4f48d0b5adc31c8d85c072a539c6b670d8d00db256b5b4604ed3368c1464a99b` → patch `d1499afcc9885c884cda5b602d7a9c31e8da3ec732edffda5927184f513a76a0`
- `index.html` — build resmi (versi ?v=2656) — SHA-256 baseline `7795de54b8dd39f2b389bd08e5fbda91c02772aa56ceff9e695cf8948f734869` → patch `a69951756a470dbf258b8b3b20655ca367d6b6f9b3d8dac5a145c286d4679c79`
- `modern-ui-layer.css` — S2653 (Keuangan ringkas, CSS) — SHA-256 baseline `8c47b271ca52335d7a5ccafe3e2d7abb6b3d0fd2ebe23c9dc41bcc219d0be3c6` → patch `96235430c25663402f581e6492ab0cd66103b887880179d47e72a7f54c3a4a2f`
- `modules/shared/features-helpers-global-security.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `014c63105433e9d28e7afbd14dae63028ec0d1d32d279cae12d42dbefddb4907` → patch `856fcbc3624ba97830297016937c98699077c746cb3b3053e45527c61fbb3dac`
- `modules/shared/modals.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `88842ff120d56d4f8af104320ebeab1daad4acdf3ca19896e34332d574e6d141` → patch `592e73274ddee2b8632b0cf5f8a33d844719526ace3d9e92c7f8eacc866ecafe`
- `modules/shared/modules-calc.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `15ff464e34a5e089ef2953e4836d71549a418bc4fac04a0db911f94264df36df` → patch `5cf32f8373ac7d79dfb4ede03e1df4dc041f340098a06d5ec99dede6d8fdb7fe`
- `modules/shared/modules-render.js` — versi di-bump build (+ akumulasi S2701) — SHA-256 baseline `1b227ba433e97b7d77b519cb8468633c3eefddc119869b10c92ef05178db7dfc` → patch `dcdac10a837770aecede0e0a9a222222131b15dca37871fbf95b397fec9f0c1c`
- `modules/shared/pwa-ux-performance.js` — S2653 (Keuangan ringkas) + deklarasi lint NodeFilter (S2702-P2-1) — SHA-256 baseline `fd9190576a0f039167e3fb21baa1725f9e0541dd963546c7dad044ed4b1ef64f` → patch `b0153e701f0395a1a9cfb3ad613d55cd66f52097f9c2c1aec9abf9987fd2eaf4`
- `modules/vehicle/service-category-sot-reconciliation-s2007.js` — S2702-P1-1: snapshot+indeks katalog, kontrak tidak berubah — SHA-256 baseline `4605518d428b0091ac069a27967cf0d76e1e81d3fa2f71ab868376168cf66a83` → patch `53177310996db792fce24324fb01143e9b8810fdf32b29e32e6b3206c22cc2ff`
- `scripts/verify-window-expose.js` — S2701: snapshot sumber per eksekusi — SHA-256 baseline `a3b3394d1621e4ae8933a148991b4b35fee025e5c6ff69b80b4c0427675e4d4c` → patch `de477004001f6ee0844ffcb023cf6bf233f90111ddcf3212b0069358e647d3e1`
- `sw.js` — build resmi (CACHE_NAME kw-cache-v2656) — SHA-256 baseline `4d2f628ccb6d8506ee03329009d018b766f7f461db9454cd78282381f81d3c78` → patch `61ff4ceb9da5930164391e71db11aed786ba824d8d11d87c5f2598694ac38d79`

## File baru (8)
- `AUDIT-S2653-KEUANGAN-RINGKAS.md` — SHA-256 `ebfc1dc0236a62ab8555719c9a295110b1fa92634df852da4d2dd17ae3888dc0`
- `AUDIT-S2702-INSIGHT-CATALOG-LOOKUP.md` — SHA-256 `2bd4a8b1592e9be665a3853952c924699c68f4202aa64bce2faa71153234f81d`
- `CHANGED-FILES-S2701.txt` — SHA-256 `c62ab395b17e27e631c6a3c0c38fa0dc190768160bc7509bf0297a5a673d6b57`
- `PATCH-MANIFEST-S2701.md` — SHA-256 `1e3be58dffe4f019257d7bcbe13542a0222d8587840d747230cb5259112ac294`
- `TEST-RESULTS-S2701.md` — SHA-256 `6ab0084b38ba6971a04ca2c414e1b63b84868ff21b421fdde7eaf5e683b146e9`
- `tests/fixtures/s2007-reference-original.js` — SHA-256 `4605518d428b0091ac069a27967cf0d76e1e81d3fa2f71ab868376168cf66a83`
- `tests/s2652-keuangan-ringkas.test.js` — SHA-256 `a652795b32663f6ef4febb75a93f96f8cbee15e4528e211e25dda99e9eef8cd1`
- `tests/s2702-catalog-lookup-cache.test.js` — SHA-256 `cb6cebd320ed24917d084bac326d0556a78cca4157b8489f5a9cfa723108c4fb`

## Penghapusan
Tidak ada.

## Penerapan
1. Ekstrak ZIP patch ini di atas salinan baseline `app-main (36)` (timpa file yang sama).
2. `python3 scripts/refresh-file-hashes.py --check` (harus `basi=0`), `npm run verify-bundle`.
3. `npm test` untuk verifikasi.

## Rollback
Ekstrak ulang baseline asli di atas hasil patch (semua file berubah ada di baseline), hapus file baru yang tercantum di atas.
