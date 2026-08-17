# Patch — Rebuild bundle supaya fix setTheme() ke-modern beneran kepakai

## Kenapa patch sebelumnya "belum ada perubahan"
Patch sebelumnya cuma mengganti `modules/shared/format-tema.js` (source).
Tapi app ini TIDAK memuat file source satu-satu di runtime — index.html
dan app_production.html memuat `app-bundle-a.min.js` +
`app-bundle-b.min.js`, hasil gabungan dari `node scripts/build.js`.
`setTheme()` versi lama masih ada di bundle lama, jadi browser tetap
eksekusi versi lama walau source-nya sudah diubah.

## Yang dikerjakan sesi ini
1. Konfirmasi source `modules/shared/format-tema.js` di upload ini sudah
   berisi fix sebelumnya (re-render `renderKeuangan()` +
   `Aset.renderList()` di akhir `setTheme()`) — tidak diubah lagi.
2. Jalankan `node scripts/build.js` supaya bundle ikut ter-generate ulang
   dari source terbaru.
3. Build tool otomatis: bump versi `s640-keamanan-pin-per-device-salt` ->
   `s641-keamanan-pin-per-device-salt` di 5 file source
   (`modules-render.js`, `modals.js`, `modules-calc.js`,
   `chat-action-handlers.js`, `features-helpers-global-security.js`),
   samakan `?v=1374` -> `?v=1375` di index.html/app_production.html,
   dan `CACHE_NAME` sw.js -> `kw-cache-v1375`. Ini murni bookkeeping
   versi bawaan build tool, bukan perubahan logic — tapi WAJIB ikut
   di-upload supaya semua file tetap sinkron versi (dicek build.js
   sendiri) dan service worker tidak menyajikan cache lama.
4. `docs/FILE-MAP.md` & `docs/COVERAGE-PER-MODULE.md` ikut diregenerasi
   otomatis oleh build.js (murni dokumentasi, bukan kode jalan).

## Verifikasi
- `node scripts/build.js` → sukses, sintaks kedua bundle valid
  (`node --check`).
- `node --test tests/*.test.js` → **4612/4612 pass, 0 fail**.
- Dicek manual: `app-bundle-b.min.js` sekarang berisi `setTheme()` versi
  baru (dgn pemanggilan `renderKeuangan()`/`Aset.renderList()`).

## PENTING — cara pakai
Timpa (overlay) SEMUA file di patch ini ke project kalian, **termasuk
kedua file bundle** — bukan cuma file source. Kalau cuma source yang
di-upload lagi tanpa bundle, masalah yang sama (tampilan tidak berubah)
akan terulang lagi karena browser tetap baca bundle lama.

Setelah overlay, hard-refresh / clear cache browser (atau tunggu service
worker ambil cache versi baru `kw-cache-v1375`) supaya bundle baru
benar-benar terpakai, bukan tersaji dari cache SW lama.

## Catatan
Bundle belum diminify (esbuild tidak tersedia di sandbox ini) — ukurannya
lebih besar dari versi rilis biasa tapi 100% valid & aman dipakai. Kalau
mau versi minified, jalankan `npm install --save-dev esbuild` lalu
`node scripts/build.js` ulang di environment kalian.
