# Audit Rekomendasi Tambahan dan Akumulasi Keluarga W — S2294

## Keputusan
**S2294 berhasil dibangun dan release gate lulus, tetapi penerimaan penuh masih terbuka.** Tidak ada klaim 0 gap substantif atau bebas regresi total karena full test suite dan Chromium E2E belum selesai menghasilkan bukti lengkap.

## Rekomendasi tambahan yang diimplementasikan

### 1. Smoke-test membedakan modul lazy-load dari fungsi yang benar-benar hilang

Sebelumnya smoke-test memeriksa seluruh `data-action` terhadap `window` saat cold start. Owner yang memang didaftarkan dalam `lazyOwnerLoaders` bisa belum diekspos sebelum modul dimuat, sehingga bisa dilaporkan sebagai missing padahal menunggu lazy-load.

S2294 membaca nama owner dari registry `lazyOwnerLoaders` di source yang telah dikumpulkan dan memisahkan hasil menjadi:
- `actionMissing`: fungsi non-lazy atau owner yang memang tidak tersedia, tetap menjadi error.
- `actionDeferred`: aksi yang pemiliknya memang terdaftar lazy-load; dilaporkan informatif dan perlu diverifikasi setelah modul dimuat.

Batasan: ini mengurangi false positive pada cold start, tetapi tidak menggantikan pengujian klik nyata pada setiap aksi lazy. Registry yang salah atau loader yang gagal tetap perlu dideteksi melalui E2E.

### 2. Tes release-hardening tidak lagi bergantung pada kondisi toolchain yang diasumsikan

Tes lama mewajibkan script release-hardening gagal dan mengeluh tool hilang. Itu rapuh: di lingkungan dengan tool tersedia, tes justru gagal walaupun kondisi tersebut lebih baik. Tes kini menerima dua keadaan yang sah: sukses dengan bukti PASS, atau gagal dengan pesan eksplisit `missing release tool`.

### 3. Rantai S2291–S2293 dipertahankan

Perubahan S2294 dibangun di atas baseline v2290 dan mempertahankan perbaikan bug serta pemulihan batas nilai S2293. Tidak ada perubahan layout UI yang disengaja.

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| Build S2294 dengan minifikasi wajib | PASS |
| `verify-release-ready.js` | PASS, exit 0 |
| Fokus bug S2291/S2292 + Dashboard + S2294 | 31/31 PASS |
| `npm run test:critical` | 10/10 PASS |
| Bundle freshness | PASS, hash kedua bundle cocok |
| `verify-window-expose.js` | PASS, 83 owner/action terverifikasi |
| Release version integrity | `s2041-1-part-sot-hardening-2294` ↔ `?v=2294` ↔ `kw-cache-v2294` |
| Full test suite | INCOMPLETE; 36/64 shard checkpoint pass sebelum batas 300 detik |
| Chromium E2E | Belum lulus / belum memperoleh bukti setelah patch karena startup menunggu app-ready timeout pada lingkungan sebelumnya |

Satu kegagalan suite lama yang terisolasi berasal dari tes `release-hardening-s1770-1775.test.js` yang mengasumsikan release tool harus hilang. Tes itu diperbaiki dan tes terkait berjalan lulus sendiri. Namun, karena suite lengkap berhenti sebelum semua shard selesai, status full suite tetap INCOMPLETE.

## Inventory patch

Patch kumulatif berisi file runtime yang berubah dari baseline, bundle A/B, `index.html`, `app_production.html`, `sw.js`, file dokumentasi build-generated, tiga tes bug report, satu tes S2294, dan manifest. File backup bundle sementara dan checkpoint tes lokal sengaja tidak disertakan.

## Gap yang masih wajib ditutup

1. Jalankan seluruh 64 shard sampai ringkasan agregat dan exit code 0; periksa shard yang gagal, bukan sekadar checkpoint pass.
2. Jalankan Chromium E2E pada lingkungan yang mengizinkan navigasi lokal: cold start, Settings, modal Tagihan/Target, Dashboard Hub Fitur, restore backup valid, restore payload salah bentuk, dan rollback setelah kegagalan yang disuntikkan.
3. Klik setidaknya satu aksi dari setiap lazy owner, lalu verifikasi action benar-benar terpasang setelah loader selesai; jangan hanya mengandalkan klasifikasi source.
4. Uji offline/import-export dan alur kasir/order Shop yang belum mendapat bukti final.
5. Perbarui baseline `docs/AUDIT_MATRIX.md` yang masih berbeda dengan jumlah file aktual; ini warning advisory saat build, bukan blocker rilis saat ini.

## Keputusan akhir

**S2294 siap sebagai patch untuk diuji, bukan dinyatakan sebagai penerimaan final penuh.** Release gate dan tes terpilih lulus. Status “0 gap substantif” baru dapat diberikan setelah full suite selesai tanpa kegagalan dan Chromium E2E pada alur kritis menghasilkan bukti lulus.
