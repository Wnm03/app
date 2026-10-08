# V12 — cumulative ESLint hardening

Tujuan: menutup sumber lint palsu/konfigurasi yang teridentifikasi pada audit 389 error tanpa menurunkan gate `no-undef` atau `no-redeclare`.

## Perubahan
- Flat-config ignore diperbaiki menjadi `**/*.min.js`, `**/*.html`, dan `docs/**` agar bundle/artifact hasil build tidak ikut dilint.
- Browser globals ditambah: `event` serta API yang sudah dipakai runtime.
- Override Node mencakup root `collect-app-globals.js` (sementara sebelum delete-manifest diterapkan), `__dirname`, `setImmediate`, `queueMicrotask`, `TextEncoder`, `TextDecoder`, `Response`.
- 9 test ESM diberi `sourceType: module` pada override paling bawah agar menang atas override CommonJS.
- Tes S2377/S2378 tidak lagi memakai idiom `x.id===x.id`; assertion diselaraskan dengan implementasi V11 (`x.id!=null`).
- Tidak menambahkan `ServiceSessionSOT`, `ServiceHistorySOTReview`, `ServiceIntervalSOT`, atau `ServicePartCompatibilitySOT` secara manual ke globals. Audit source menunjukkan semuanya memang diekspor oleh modul SOT; collector harus mendeteksinya.
- Tidak mengubah `verify-release-ready.js`, tidak mematikan `no-undef`, dan tidak mematikan `no-redeclare`.

## Catatan delete-manifest
Root `collect-app-globals.js` adalah file stale yang harus dihapus melalui `npm run apply-delete-manifest`. `scripts/collect-app-globals.js` tetap dipertahankan sebagai collector canonical.

## Validasi yang wajib dilakukan di CI
```bash
npx eslint . --quiet --format unix
npm run release-check
```
Jangan membuat ZIP rilis final sebelum `release-check` lulus penuh.
