# MERGE NOTES — Dana Titipan Pool & Porsi (Re-verifikasi Independen)

Dokumen ini adalah hasil **rekonstruksi merge dari nol** (base + 6 ZIP sesi mentah +
MASTER_HANDOFF), dikerjakan tanpa melihat isi patch yang sudah ada
(`kw_patch_dana-titipan-pool-porsi_s626_v1359.zip`), lalu dibandingkan setelahnya.

## Hasil

- **Base**: `app-main__37_.zip`, dikonfirmasi ulang: tidak ada file pool, versi
  `s625-titipan-explicit-owner-only` / build 1358.
- **Merge Sesi 1–6**: ditempel berurutan persis pola yang sama dengan patch
  sebelumnya — pool-api.js (final dari sesi 2, superset sesi 1), guard di
  commitment-return-api.js (sesi 3), portfolio-render.js + modals.js (versi final
  sesi 5, superset 4a→4b→5), wiring modal index.html (sesi 4b), registrasi
  build.js (sesi 6).
- **Bug yang sama ditemukan ulang**: `modals.js` versi sesi 5 punya `MODAL_VERSION`
  yang sudah ter-bump sendiri ke `s627` (stray, tidak konsisten dgn file lain yang
  masih `s625`) — dinormalisasi ke `s625` sebelum build asli dijalankan, supaya
  `verifyVersionConstantsSynced()` di build.js bisa bump dengan benar ke `s626`.
- **Build**: `node scripts/build.js` — jalan SEKALI (bukan berulang), hasil persis:
  versi `s625→s626`, build `1358→1359`, drift-lint modal lolos,
  `DanaTitipanPoolAPI` terkonfirmasi masuk bundle.
- **Test**: `node --test tests/*.test.js` — awal 4424/4426 (2 gagal, sama persis
  dengan temuan sebelumnya: 2 assertion sesi 4a masih menguji perilaku stub
  ("toast belum tersedia") yang sudah digantikan modal sungguhan oleh sesi 4b).
  Diperbaiki dengan mengubah assertion ke `openModal('titipanPoolModal')` +
  `_mode` yang benar. Setelah itu: **4426/4426 pass**.
- **Changed-file set**: dihitung ulang via `diff -rq base merged_final` — persis
  6 file source+registrasi, 8 file test, + turunan build (bundle x2,
  app_production.html, index.html, sw.js, docs x2) — **identik dengan
  changed-file set patch sebelumnya**.

## Perbandingan langsung dengan patch sebelumnya

Byte-for-byte identik:
- `modules/finance/dana-titipan-pool-api.js`
- `modules/finance/dana-titipan-commitment-return-api.js`
- `modules/finance/dana-titipan-portfolio-render.js`
- `scripts/build.js`
- `tests/session01-dana-titipan-pool-data-layer.test.js`
- `tests/session02-dana-titipan-pool-status.test.js`
- `tests/session03-dana-titipan-commitment-guard.test.js`
- `tests/session06-dana-titipan-pool-integration.test.js`
- `tests/s486-titipan-commitment-return.test.js`

Hampir identik (beda kosmetik saja, assertion sama persis secara fungsional):
- `tests/session04a-dana-titipan-pool-ui-summary.test.js` — fix independen untuk
  2 assertion stale menghasilkan assertion yang sama (`openModal` + `_mode`),
  hanya beda nama variabel lokal (`opened` vs `opens`) dan teks deskripsi test.

Identik isinya, beda hanya versi build (murni artefak proses verifikasi, bukan
isi):
- `modules/shared/modals.js` — isi sama, `MODAL_VERSION` bisa berbeda kalau
  build dijalankan lebih dari sekali selama proses verifikasi.

## Kesimpulan

Patch `kw_patch_dana-titipan-pool-porsi_s626_v1359.zip` **terverifikasi benar**
secara independen — tidak ditemukan penyimpangan dari spesifikasi
`MASTER_HANDOFF_DANA_TITIPAN_POOL_PORSI.md` maupun dari isi ZIP sesi mentah
1–6. ZIP ini (`_reverified`) adalah rekonstruksi paralel untuk dokumentasi
proses verifikasi, isinya setara/identik dengan patch aslinya.
