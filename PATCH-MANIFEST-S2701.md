# Manifest Patch Kumulatif S2701 — Reset Interval + Optimasi Gate

- Baseline: `app-main (36).zip`
- SHA-256 baseline: `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`
- Versi runtime: `s2595-carnotes-null-interval-guard-2652` → `s2595-carnotes-null-interval-guard-2653`
- Format: overlay; berisi hanya file aplikasi yang byte-nya berubah dibanding baseline, ditambah manifest dan laporan validasi. Tidak ada file aplikasi dihapus.
- Akumulasi: logika reset interval kanonis S2692 dan tes regresinya sudah ada di baseline ini; perubahan baru S2701 mengoptimalkan `scripts/verify-window-expose.js` dengan snapshot sumber per eksekusi. Build mengakumulasi perubahan versi/bundle produksi yang diperlukan untuk sinkronisasi.

## File aplikasi berubah (13)
- `app-bundle-a.min.js` — SHA-256 baseline `b6deba50788c1b8f61ba67ceac5719993dd6ed37a270dd17d1776ca32085be5a` → patch `3f52be932d0eb94e9bd50c5dda0f902645812e6b36ba2c11680364cd9eac8b93`
- `app-bundle-b.min.js` — SHA-256 baseline `917ddfb5602a7b065676a0bd360c0ae2a0d5e00c6a8190c909d871106fb8928c` → patch `04150a7ad68a9b2d03eb5ff2054fc9f1543487daaba1f2530122876552261e45`
- `app_production.html` — SHA-256 baseline `122e835bdacb033f1c4e424fe79520ab94bc2d5b202e9140830c616cb86af6fc` → patch `db6d5b74d4485d7b5b61fb7a78f8b6c24b53af1b8ba6af9deac2b2f65bbec891`
- `chat-action-handlers.js` — SHA-256 baseline `efc02ef133013f07975716de376ceca51653ab0ac8c7143d522351cba34ee556` → patch `098cea18495a456361ea9225b57684c64476a063a1b26cdee35ebf3132895d89`
- `docs/COVERAGE-PER-MODULE.md` — SHA-256 baseline `1d69fe7f06afe465eb57d3afb57870e8c97fcbb751463eacaf1e719f46dfb78d` → patch `817ed85f3abe37ce6b95e66d312264a51b398ab5d63a4a3eeb5bb8816f84a5ae`
- `docs/FILE-MAP.md` — SHA-256 baseline `3a832f566060f8f9606f54485751d4a9d116da3a4f32f073f3a387bc596c4588` → patch `3e114920985b8a7992a2f57df197a2f52f540ffb43d65bde3573a41d0fff92a2`
- `index.html` — SHA-256 baseline `41467d362535c0ac6cb60fb10998a3a230e7b45ddcc3bb0fcd98acac956105d6` → patch `693065f6975e8dc30482b839b82b925df752df2c21fb95e869d50bd59df775e0`
- `modules/shared/features-helpers-global-security.js` — SHA-256 baseline `4658aaa169a8a02fa918c136eb0a31aa510bf56a09257cba753fc3152a4224ef` → patch `26e014f5fa3a7f159e066f128773b053ebbc98c148749582bdaeb5c52d94a2f5`
- `modules/shared/modals.js` — SHA-256 baseline `d6af638675614d46ae8677730b1d74bf52b98cddd83ff267f7afa02114fc5044` → patch `97c8576b1b5912d16bc57e0461aec78a27f5d0af36c2bbd2ba740183d6c78a3a`
- `modules/shared/modules-calc.js` — SHA-256 baseline `19a98175ce49196ba7312ecf0c9cf15e4b4f069fd215e295d03819fd2831ce64` → patch `18dc3d1e5b6269d4cc8e927120aeaebd58a36569fafea59f55b45bb545f78978`
- `modules/shared/modules-render.js` — SHA-256 baseline `62a8f5891f3f1b75b331cfb5e3af424835c05cd5eb1ea11fb90c8c739892585b` → patch `61ef0c1b2a24848d33f3f6332e9946071faac8d82c0082ce822c06c11cfe94f9`
- `scripts/verify-window-expose.js` — SHA-256 baseline `a3b3394d1621e4ae8933a148991b4b35fee025e5c6ff69b80b4c0427675e4d4c` → patch `de477004001f6ee0844ffcb023cf6bf233f90111ddcf3212b0069358e647d3e1`
- `sw.js` — SHA-256 baseline `8c8982ac8261a07d789f0cf9ea5613a67fc1dc7d3ec6091edb40e6b0b7551aa6` → patch `cd1937973b923e77cbc429a827d67974ff82c079af5336a53f3844a748d83aa6`


## Penghapusan
Tidak ada file aplikasi yang dihapus atau fitur yang dibuang. Tidak ada perubahan pada kontrak data/SOT bisnis oleh optimasi S2701.
