# Sesi s608 — try/catch per-baris di renderer list besar (versi 1449)

Lanjutan audit pola bug "0 reaksi/0 toast" yang ditemukan & diperbaiki di
`InvestmentListUI._renderList()` (S601): beberapa `list.map(...) -> innerHTML`
lain di renderer besar juga TANPA try/catch per-item, sehingga 1 item dengan
data yang bikin salah satu perhitungan throw akan menjatuhkan SELURUH `.map()`
sebelum `innerHTML` sempat ke-assign — kontainer tetap menampilkan HTML hasil
render sukses sebelumnya (data-action sudah basi, tap = 0 reaksi).

## File yang diperbaiki (try/catch per-item + fallback baris ⚠️)
- `modules/asset/aset.js` — `Aset.renderList()`
- `modules/finance/piutang-utang.js` — `Piutang.renderList()`, `Debt.renderList()` (2 blok: baris utang + cicilan barang)
- `modules/finance/tx-list-cashflow.js` — `txHTML()` (dibungkus 1x, otomatis melindungi ~10 titik pemanggil: `#allTx`, `#lapTx`, `#filterTxList`, `tx-target.js`, `modules-render.js`, `shop/modules-render.js`)
- `modules/finance/worthit.js` — `WorthIt.renderList()` (`computeScore()` per-item)
- `modules/shop/cobek-etalase.js` — `Etalase.renderList()`

## Sengaja TIDAK disentuh (risiko rendah)
- `AccOwners._renderList()` (`akun.js` & `shared/akun.js`) — murni interpolasi string draft di memori, 0 panggilan fungsi kalkulasi eksternal.
- `CobekOrder.renderList()` (customer list) — sama, murni template string.

## Test
- Baru: `tests/s608-renderlist-per-row-trycatch-guard.test.js` (2 test — `txHTML()` & `Aset.renderList()`, verifikasi 1 item rusak tidak menjatuhkan render).
- Full suite: **4903/4903 pass, 0 fail** (`npm test`).
- Build: `SKIP_LINT=1 npm run build:safe` — semua gate lolos (eslint di-skip krn tidak ada akses npm/internet di sandbox ini, sisanya jalan normal), versi disinkron ke **1449**.

## Isi patch zip ini
Hanya file yang berubah/baru (source + bundle + versi-sync + test), struktur folder sama persis dengan zip yang diupload:
- 5 file source yang diperbaiki
- 1 file test baru
- 5 file yang ikut ter-update otomatis oleh `build:safe` (version sync): `modules/shared/modules-render.js`, `modules/shared/modals.js`, `modules/shared/modules-calc.js`, `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (bundle hasil build — **belum diminify**, esbuild tidak tersedia di sandbox ini; tetap 100% valid & aman dipakai, cuma ukurannya lebih besar dari build sebelumnya)
- `app_production.html`, `index.html`, `sw.js` (versi `?v=` & cache name disinkron ke 1449)

Catatan: upload SEMUA file di patch ini, jangan cuma HTML/sw.js — kalau file source/bundle tidak ikut ter-upload, versi akan mismatch dengan isi bundle lama.
