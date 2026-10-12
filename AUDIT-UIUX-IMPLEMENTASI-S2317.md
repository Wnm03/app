# Implementasi Perbaikan UI/UX — S2317 (kumulatif di atas PATCH S2041-2312)

Baseline: `app-main (12)` + PATCH-S2041-2312-CUMULATIVE → perbaikan audit `AUDIT-UIUX-TAMPILAN-S2312.md`.
Build runtime: `s2041-1-part-sot-hardening-2317`, cache `kw-cache-v2317`. Semua perubahan = presentasi (CSS/markup/teks); logic/SOT/data tidak diubah.

## Status per temuan
| # | Status | Perubahan | Verifikasi |
|---|---|---|---|
| U-01 | SELESAI | `width:auto;min-width:max-content` pada tab Keuangan (styles.css) | Chromium 390px: lebar tab 80/144/86/138/125/92/74 |
| U-02 | SELESAI | teks aktif segmented = `--text` (styles.css) | warna teks `rgb(243,241,236)` |
| U-03 | SELESAI | hapus `margin-left:232px` header (pwa-ui-layer.css) | 1280px: left=232, width=1048 |
| U-04 | SELESAI | `scrollIntoView` `block:'nearest'` (modal-navigasi.js, 2 salinan); berlaku utk semua bilah tab | scrollTop=0 saat buka Mobil via `showPage()` (bukan klik nav nyata) |
| U-05 | SELESAI | tombol Simpan modal sticky (mobile) | Simpan bottom=820 < 844 (sebelumnya 878) |
| U-06 | SEBAGIAN | nowrap + clamp pada kelas nilai umum | "Rp 20.630.000" 1 baris; nisab Pajak/FI/grafik SVG BBM belum dicek |
| U-07 | SELESAI* | `--on-accent`, tombol domain putih, hijau Shop `#15803d`, kicker 11px | tab Ringkasan: teks gelap di emas; rasio lain dihitung dari warna, bukan diukur ulang |
| U-08 | SELESAI | ikon header 40px (CSS); teks rekomendasi digabung (fuel-insight-engine.js) | ikon 462/145 → 40px; teks gabungan diuji logika, bukan visual |
| U-09 | SELESAI | FAB sidebar satu baris | pusat ikon = pusat label (395/395) |
| U-10 | SELESAI | semua bilah tab utama = 1 baris scroll | scrollWidth > clientWidth utk Shop/Aset/Settings; Pajak muat tanpa scroll |
| U-11 | SELESAI | empty-state CSS `:empty::before` | pseudo-element terpasang |
| U-12 | SELESAI | toast pindah ke atas saat modal terbuka; pesan backup diringkas | tidak diukur visual |
| U-13 | SEBAGIAN | label aksi cepat 9→11px, target sentuh 44px (beberapa) | qa-label 11px; tile/tautan kecil lain belum |
| U-14 | SELESAI | `for=` pada 373 label modal + 81 label halaman | 49/57 label txModal ber-`for` (8 sisanya tanpa pasangan input langsung) |
| U-15 | BELUM | tombol "←" & Ownership Summary perlu keputusan desain | — |
| U-16 | SELESAI | smoke-test: ID DOM hilang saja → `console.debug` | tidak diukur di konsol |

## Hasil uji
- Full test (64 shard): **8.790 tes, 8.789 pass, 0 fail, 1 skipped**.
- eslint: 0 error (1.799 warning, sudah ada sebelumnya). `verify-bundle-freshness`: OK. `verify-window-expose`: OK (83 modul).
- E2E bawaan: **PASS 16/16**.
- Catatan anggaran: blok CSS baru ada di `modern-ui-layer.css` (bukan styles.css) karena tes anggaran `styles.css <= 180000 B` dan tes S2114–S2116 membaca ekor styles.css.
- Tidak diverifikasi: Safari/iOS, sentuhan nyata, tema selain `dark`, halaman yang tidak dibuka audit.
- Belum ditambahkan: E2E regresi baru (lebar tab Keuangan, kontras tab aktif, `header.left`, `Simpan bottom <= viewport`).

## File (relatif ke akar app; timpa baseline)
| Path | SHA-256 | Bytes |
|---|---|---:|
| `AUDIT-LANJUTAN-S2041-2312.md` | `afb4109d1e97b1070427f0740b1664de9d4e4b266aec2e11e9a47a95d4dd84a1` | 1829 |
| `AUDIT-RANTAI-S2041-2311.md` | `39bd4424c1552fbab4cce0fa9df162d19f93dfa2046bb2929b67842c1dc46062` | 2174 |
| `FILE-HASHES-SHA256.txt` | `3f8e0a0394ebd3c48bfd9bec343b36c22009ee2ce37beb3b39c0843464936cae` | 12345 |
| `PATCH-MANIFEST-B1-B10-S2041-2311.md` | `8d1ecb51e82989f54c067aae5ea7c7200e9fa1ae00085ec6c65f1cc3f0745852` | 13259 |
| `PATCH-MANIFEST-B1-B10-S2041-2312.md` | `5749006b4d6a9662b80beb258155062903365585dbf85e80b7e278e662a0200e` | 13400 |
| `app-bundle-a.min.js` | `96c26e2880313a65257be2a8d1205b30b0a36aabb60b8ccbc9b91d3d849c4c4c` | 1042061 |
| `app-bundle-b.min.js` | `bc27d5f5e503e4e389dcfbb55c54635a5535d26e0e3701029941188aeccc8d0f` | 2448306 |
| `app_production.html` | `2ea2490856eb164f03599b1aaaa1df5bd978d68cca74da0bb8e0138a4b795ced` | 315556 |
| `chat-action-handlers.js` | `5323160506c568d2028429ee1f697c34564fe1ceadbe85911968967ae50830ff` | 10556 |
| `docs/COVERAGE-PER-MODULE.md` | `18346c0143478291961bb9a8590dfcdb36eac1a2e69dd3fc66a337fa29220451` | 1781 |
| `docs/FILE-MAP.md` | `113528dce2d56a6570591a8d1941f185171376b8a1d9fa06f3c8b5e0dece7042` | 1085841 |
| `e2e/run-e2e.js` | `fdb254227b406e0c0cd86934f325e6464211fd5072d3f76f3315978d70dd318a` | 14620 |
| `index.html` | `1e4971061e8f4fce1715066340182c4e087f6bf8d2e40d16b2faec05405b8ff2` | 315363 |
| `modern-ui-layer.css` | `c09dcaa1ab154af6a86c26a5f9b4eb6c856d1bc36e7f35cf134ffad50ce2c634` | 38861 |
| `modules/asset/modal-navigasi.js` | `3fc9bfd1cdd7359779752a863bd730647ac16d3b857c9bb83e7febf523df6595` | 36137 |
| `modules/shared/backup-restore.js` | `eafb83b87405902ea32486122147f19179004db5b2737c471cf087c6c62f2fc8` | 88315 |
| `modules/shared/features-helpers-global-security.js` | `8805dfd1d7b4ad62d9427a7390cd14d24333a2381b938ffe7781cf1055758f51` | 109743 |
| `modules/shared/modal-navigasi.js` | `dc0313c1be595a092d5a27d4cfa205b1c5c5838358bf0aad6dfbfdd61ce17a42` | 49928 |
| `modules/shared/modals.js` | `6c57219ff0a3df3b763dd2635899463b2ae31401872cf27c8a01aecdd1bb74e5` | 308486 |
| `modules/shared/modules-calc.js` | `da5e4084666881716d2edcf3e8cc1fc3174e588fa0dbd8bdc69a3aca3806d00d` | 72723 |
| `modules/shared/modules-render.js` | `d1f31178546ac2eae8b4d164cf575a508f6b896c7b75e425272254158bcf5bcc` | 104855 |
| `modules/shared/smoke-test.js` | `0cb43b127428931386896455a77393d5950fb816a0c047c0fa4961189ecf7bde` | 16691 |
| `modules/vehicle/fuel-insight-engine.js` | `77a34d0afd82a44065728492aa963883b23605b816911176234f425d689f9845` | 26455 |
| `pajak-aset-ui-wrappers.js` | `b25da4783f3c9abc06b3f61c0c048650caa4ad2254426a85538048ff1c603c69` | 12714 |
| `pwa-ui-layer.css` | `f01f98c319c87955944839a478f47528d60cda2f2dfbcff29fba74efbe003e9d` | 14983 |
| `styles.css` | `57abfefae104acf80f5b4abb53f42947bf8a7cf03f448005fa88a26c228be591` | 179969 |
| `sw.js` | `61212602ec46a63292541fee58d35705a9594f4e234a42b65e4765ac2288ce18` | 3631 |
| `tests/bugfix-b5-b8-decimal-id-regression.test.js` | `f1ccf8f4e2be17c73e0960e455330a65d7b3ad8bb6fc838a1c20259a5dcfe7d3` | 7877 |
