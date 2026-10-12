# Audit Kumulatif UI/UX — S2318

Tanggal: 12 Oktober 2026. Baseline: `app-main (12).zip` + `PATCH-S2041-2317-UIUX-CUMULATIVE.zip`; build target `s2041-1-part-sot-hardening-2318`, cache `kw-cache-v2318`.

## Ringkasan audit

Audit sebelumnya (`AUDIT-UIUX-TAMPILAN-S2312.md`) memiliki 16 temuan. Implementasi S2317 menandai U-01–U-05, U-07–U-12, U-14, U-16 selesai; U-06 dan U-13 sebagian; U-15 belum. Perlu dicatat bahwa hasil S2317 mengandalkan beberapa pengukuran injeksi CSS dan belum mengaudit Safari/iOS, tema non-dark, serta halaman/sub-tab yang tidak dibuka.

## Akumulasi perubahan tahap ini

- **U-15:** tombol panah `Kembali ke Pengaturan` disembunyikan khusus pada Dashboard Hub karena halaman tersebut adalah landing page, sehingga panah tanpa konteks navigasi balik membingungkan. Handler dan fungsi global tidak dihapus.
- **U-06:** nilai piutang/inventori diberi ukuran responsif dan `nowrap`; kartu analytics Dashboard Hub boleh menyusut agar angka tidak memaksa grid melebar.
- **U-13:** target sentuh untuk kontrol collapse dan tombol pengaturan kartu dinaikkan menjadi minimum 44×44 px; label aksi cepat tetap 11 px.
- Ditambahkan `tests/uiux-s2318-remaining-audit.test.js` untuk kontrak regresi statis pada tiga area di atas.
- Build dinaikkan eksplisit ke `s2041-1-part-sot-hardening-2318` dan cache `kw-cache-v2318`; bundle dan HTML disinkronkan oleh build script.

## Status per temuan setelah akumulasi

| Temuan | Status | Batasan |
|---|---|---|
| U-01 tab Keuangan | Selesai menurut audit S2317 | E2E geometri baru masih disarankan |
| U-02 kontras tab aktif | Selesai menurut audit S2317 | Belum ada tes rasio kontras otomatis |
| U-03 offset header desktop | Selesai menurut audit S2317 | Ukur ulang lintas tema disarankan |
| U-04 auto-scroll Mobil | Selesai menurut audit S2317 | Bukti terdahulu tidak mencakup semua jalur navigasi |
| U-05 tombol Simpan modal | Selesai menurut audit S2317 | Belum mencakup semua modal/perangkat |
| U-06 angka Rupiah | Sebagian diperkuat S2318 | Pajak, SVG BBM, dan semua tile sempit belum tervalidasi visual menyeluruh |
| U-07 kontras aksen | Selesai menurut audit S2317* | Beberapa rasio dihitung dari warna, bukan ukur ulang di browser |
| U-08 Fuel Intelligence | Selesai menurut audit S2317 | Verifikasi visual teks gabungan masih terbatas |
| U-09 FAB desktop | Selesai menurut audit S2317 | Akar CSS sebelumnya belum diverifikasi penuh |
| U-10 pola tab mobile | Selesai menurut audit S2317 | Perlu pengujian semua halaman/sub-tab |
| U-11 empty-state Beranda | Selesai menurut audit S2317 | Penyebab data kosong pada data nyata belum diverifikasi |
| U-12 toast modal | Selesai menurut audit S2317 | Frekuensi pada pemakaian nyata belum diketahui |
| U-13 font/target sentuh | Sebagian diperkuat S2318 | Belum semua link/tile kecil dalam aplikasi mencapai 44 px |
| U-14 label formulir | Selesai menurut audit S2317 | 8 label transaksi yang disebut audit belum berpasangan langsung |
| U-15 panah & Ownership Summary | Panah selesai; summary sudah menyembunyikan kategori nol saat ada kategori terisi | Layout summary perlu validasi dengan data nyata dan keputusan desain lanjutan |
| U-16 log smoke-test | Selesai menurut audit S2317 | ID dinamis/lazy tetap perlu konfirmasi runtime nyata |

## Gate dan keterbatasan

- Full test sebelum perubahan S2318: 8.790 tes, 8.789 pass, 0 fail, 1 skipped (64 shard; paksa ulang).
- Full test setelah perubahan S2318: **8.793 tes, 8.792 pass, 0 fail, 1 skipped** (64 shard, force rerun).
- ESLint `npm run lint -- --quiet`: exit 0.
- `verify-bundle-freshness`: PASS.
- `verify-window-expose`: PASS (83 modul).
- `verify-release-ready.js`: **PASS** — lint, minify, delete-manifest, version/SOT integrity, runtime lifecycle, HTML sync, service-SOT, release firewall, Car Notes integrity, and bundle freshness all passed; 3 oversized-source warnings are within the configured guard cap.
- `verify-source-size.js --strict`: exit 0; 3 peringatan oversized yang sudah ada: `modules/vehicle/servis.js` (2001 baris), `modules/shared/features-helpers-global-security.js` (1747), `build.js` (1620).
- E2E `e2e/run-e2e.js`: **BLOCKED oleh kebijakan browser lingkungan** (`net::ERR_BLOCKED_BY_ADMINISTRATOR`), bukan hasil PASS dan bukan bukti bug aplikasi; perlu dijalankan di runner yang mengizinkan origin lokal.
- Perubahan hanya presentasi CSS; tidak mengubah SOT, data, rumus, atau handler aksi.
- Safari/iOS, sentuhan fisik, screen reader, tema selain dark, serta halaman/sub-tab yang belum dicakup audit awal tetap belum diverifikasi.


## Verifikasi independen pasca-S2318 (12 Oktober 2026)

Patch diterapkan pada salinan bersih `app-main (12).zip` (baseline cache `kw-cache-v2311`), lalu dijalankan ulang:

| Pemeriksaan | Hasil |
|---|---|
| Hash `FILE-HASHES-SHA256.txt` | PASS, semua cocok |
| Selisih vs baseline | 21 file berubah, 1 file baru; versi akhir `kw-cache-v2318` |
| `tests/uiux-s2318-remaining-audit.test.js` | PASS, 3/3 |
| ESLint `--quiet` | PASS, exit 0 |
| `verify-bundle-freshness` | PASS |
| `verify-window-expose` | PASS, 83 modul |
| `verify-source-size --strict` | PASS, exit 0 (3 peringatan oversized, dalam guard cap) |
| `verify-release-ready` | PASS, release gate lolos |
| Full test, 64 shard | **8.793 tes, 8.792 pass, 0 fail, 0 cancelled, 1 skipped** |
| E2E browser | Tidak dijalankan di sini; tetap perlu runner yang mengizinkan origin lokal |

Tidak ada perubahan kode pada tahap verifikasi ini; hanya dokumentasi.

## Audit statis lanjutan U-13 (target sentuh, tanpa browser)

Pemindaian `styles.css`, `modern-ui-layer.css`, dan `pwa-ui-layer.css` untuk kontrol interaktif dengan ukuran eksplisit di bawah 44 px. Browser tidak tersedia, jadi ini murni pembacaan CSS dan bukan ukuran render.

- **Sudah tertutup:** `.card-collapse-toggle` (termasuk Car Notes, ditimpa ke 44 px oleh `modern-ui-layer.css`), `.chip-btn`, `.header-badge`, `.modal-close` (graphite), `.nav-item`.
- **Masih di bawah 44 px (perlu keputusan desain):** `.kasir-qty-pill button` (28), `.shop-product-actions button` (29), `.bill-more-btn` (30), `.dashhub-fav-star` (20), `.pwa-runtime-notice button` (32).
- **Bukan temuan:** ikon dekoratif (`.nav-item svg`, `.tx-icon`, `.acc-card-icon`, badge) tidak interaktif sendiri.
- **Tidak ditambal otomatis:** tombol `+/-` kasir berdampingan, sehingga memperbesar area sentuh berisiko tumpang tindih dan mengubah layout. Perbaikan perlu diverifikasi visual di perangkat.
