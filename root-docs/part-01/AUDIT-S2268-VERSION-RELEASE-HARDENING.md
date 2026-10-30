# S2268 — Version/Release Contract Hardening

## Temuan
Canonical `APP_BUILD_VERSION` sudah berada pada suffix 2207, tetapi sebagian runtime/version constants, cache-busting HTML, service-worker cache, dan `chat-action-handlers.js` masih membawa 2206. `verify-version-integrity.js` gagal dan release firewall menandai drift.

## Perbaikan
- Menyamakan runtime version constants ke canonical version sebelum build.
- Menjalankan canonical `scripts/build.js`, yang menaikkan release dari 2207 menjadi 2208.
- Menyamakan `index.html`, `app_production.html`, dan `sw.js` ke 2208.
- Membuat bundle A/B fresh melalui canonical build.
- Mengubah test S1974 agar memeriksa bundle B terhadap `APP_BUILD_VERSION` aktif, bukan hard-code 2207.

## Verifikasi
- VERSION-INTEGRITY: PASS — `s2041-1-part-sot-hardening-2208 / ?v=2208 / kw-cache-v2208`.
- HTML sync: PASS.
- SOT integrity: PASS.
- Bundle freshness: PASS.
- Targeted release/version tests: 19/19 PASS.
- Production minification: BLOCKED karena `esbuild` tidak tersedia.
- ESLint: BLOCKED karena `eslint` tidak tersedia pada environment.

## Catatan
Tidak ada perubahan pada SOT/persistence/domain behavior. Backup bundle yang dibuat otomatis oleh build tidak dimasukkan ke patch.
