# Sumber versi aplikasi (keputusan audit S2834)
- **Sumber kebenaran versi rilis = nomor build** pada `APP_BUILD_VERSION` (akhiran angka, mis. `...-2851`), disamakan oleh `scripts/build.js` ke: lima konstanta runtime, semua `?v=` di `index.html`/`app_production.html`, dan `CACHE_NAME` di `sw.js`. Dijaga gerbang `scripts/verify-version-integrity.js`.
- `package.json` `version` (mis. 0.85.10) hanya metadata npm dan TIDAK dipakai gerbang rilis. Sengaja tidak diseragamkan dengan nomor build: mengubahnya menyentuh `package-lock.json` dan workflow regenerate-lockfile tanpa manfaat fungsional.
- Mengidentifikasi baseline: gunakan nomor build (sw.js `CACHE_NAME`), bukan `package.json`.
