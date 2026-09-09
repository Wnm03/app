# Rekonstruksi Akumulasi Penuh PATCH-SESI1..7c (fix-csp-inline-handlers)

## Masalah yang ditemukan
Patch `PATCH-SESI7c-...zip` (dan 7a/7b sebelumnya) **BUKAN akumulasi bersih** dari SESI1-6.
Root cause: saat menyiapkan `modules/shared/modals.js` untuk sesi 7a, base yang dipakai adalah
versi `modals.js` yang **belum berisi fix SESI1-6** (kembali ke kondisi mendekati baseline
`app-main__74_.zip`, MODAL_VERSION-nya bahkan masih pakai suffix lama `-followup6-fuel-price-
deviation-summary`, bukan melanjutkan penamaan `sesi3/4/5/6` seperti seharusnya). Akibatnya
7a → 7b → 7c mewarisi & memperpanjang regresi yang sama (masing-masing session menambah fix-nya
sendiri di atas base yang sudah rusak, bukan di atas base SESI1-6 yang benar).

Dibuktikan dengan diff per-modal (bukan diff satu baris raksasa) antara `s123456` (akumulasi
SESI1-6 yang benar) vs `s7a/7b/7c`: field seperti `txAddStock`, `txSyncBbm`, `txSyncServis`,
`txAddRenov`, `txAddShopStock`, `txAddShopSale` (fix SESI1) dan field-field SESI3-6 lainnya
di `modals.js` versi 7a/7b/7c **kembali ke `onchange="..."` inline**, padahal di `s123456`
sudah `data-onchange="..."`.

Selain itu, 3 file test SESI2-3 (`s572-tx-acc-change-stale-state.test.js`,
`sesi2-txamt-txacc-cicilan-dynamic-inline-attr.test.js`,
`sesi3-txmodal-stok-renov-shopstock-shopsale-toggle-inline-attr.test.js`) sempat berhenti
diikutkan mulai dari zip `PATCH-SESI1-SESI2-SESI3-SESI4-...` dan seterusnya (termasuk final
`s123456`), meski fix sumbernya sendiri tetap ada di `modals.js`.

Ditemukan juga 1 file source yang ikut hilang dari daftar file "cumulative" mulai
`PATCH-SESI1-...SESI4...`: `modules/finance/cicilan.js` (berisi fix SESI2: wrapper
`_txCicilanTotalOnBlur`, `_txCicilanPerBulanOnBlur`, `_txCicilanSharedNominalOnBlur`,
`_txCicilanDueOnInput`, yang **masih direferensikan langsung oleh `modals.js`** lewat
`data-onblur="_txCicilanTotalOnBlur"` dkk. di panel Cicilan txModal). Kalau file ini tidak
ikut di-deploy, keempat fungsi itu undefined saat panel Cicilan dipakai.

## Cara rekonstruksi yang dilakukan sesi ini
1. Diverifikasi per-modal (bukan per-baris) bahwa 6 modal yang disentuh sesi 7a/7b/7c
   (`accModal`, `accountOwnersModal`, `piutangModal`, `debtModal`, `vehicleModal`, `simModal`)
   di `baseline` DAN di `s123456` (akumulasi SESI1-6) **identik** — artinya SESI1-6 memang
   tidak pernah menyentuh 6 modal ini, jadi aman untuk overlay.
2. `modals.js` final = `modals.js` dari `s123456` (base yang benar, sudah bawa fix SESI1-6),
   dioverlay HANYA dengan isi 6 modal di atas dari `s7c` (yang sudah mengakumulasi fix 7a+7b+7c
   dengan bersih di antara sesama mereka — diverifikasi 7a→7b→7c saling menambah, bukan
   saling menimpa).
3. `modules/finance/cicilan.js` diambil kembali dari `PATCH-SESI1-SESI2-SESI3-...zip` (isinya
   tidak pernah berubah lagi sesudahnya, jadi versi SESI2 = versi final yang benar).
4. File yang HANYA disentuh sesi 7a/7b/7c dan tidak pernah disentuh SESI1-6
   (`features-helpers-global-security.js`, `modules-calc.js`, `modules-render.js`,
   `chat-action-handlers.js`) diambil dari `s7c` — diverifikasi akumulasi 7a→7b→7c bersih.
5. `index.html` / `app_production.html` / `sw.js` diambil dari `s123456` (nomor versi cache-bust
   lebih baru/benar, v1633) lalu di-bump ke v1634 untuk build baru ini; isi 7a/7b/7c untuk
   ketiga file ini ternyata cuma beda nomor versi cache-bust (v1631, lebih lama/basi), tidak ada
   perubahan struktural lain yang perlu digabung.
6. Semua 10 file test (SESI2, SESI3, SESI4, SESI5, SESI6, asset-investment-owners-redirect-b2b,
   SESI7a, SESI7b, SESI7c) dikumpulkan kembali ke `tests/`.
7. Diverifikasi silang: setiap `data-onblur`/`data-onchange`/`data-oninput`/`data-onfocus`
   berformat wrapper (`_xxxOnBlur` dkk.) yang direferensikan `modals.js` final, dicek definisinya
   ADA di salah satu file source yang ikut di-deploy (lihat tabel di bawah) — nihil yang hilang.

## Verifikasi referensi wrapper function → file sumber
| Wrapper function | Didefinisikan di |
|---|---|
| `_assetModalInvestasiOnBlur/OnInput`, `_assetNilaiOnBlur/OnInput` | `modules/asset/aset.js` |
| `_bbmCostOnInput`, `_bbmSpbuOnBlur` | `modules/vehicle/vehicle-core.js` |
| `_txAmtOnInput`, `_txCatOnBlur`, `_txSubCatOnBlur`, `_txNoteOnBlur/OnInput` | `modules/finance/transaksi.js` |
| `_txBbmSpbuOnBlur` | `modules/finance/tx-bbm.js` |
| `_txCicilanTotalOnBlur`, `_txCicilanPerBulanOnBlur`, `_txCicilanSharedNominalOnBlur`, `_txCicilanDueOnInput` | `modules/finance/cicilan.js` |
| `_txShopSaleCustNameOnBlur/PhoneOnBlur/AddrOnBlur` | `modules/shop/cobek-tx-cart.js` |

## Yang TIDAK dikerjakan sesi ini (perlu nm lakukan lokal)
- **Bundle tidak di-rebuild** (`app-bundle-a.min.js` / `app-bundle-b.min.js`) — sandbox ini
  tanpa akses internet/npm sehingga `esbuild`/`npm run build:safe` tidak bisa dijalankan.
  Patch ini **source-only**; jalankan `npm run build:safe` (atau `SKIP_LINT=1` kalau eslint
  belum ke-install) di sisi nm untuk regenerate bundle & lolos gate test sebelum deploy.
- Full test suite belum bisa dijalankan otomatis di sini karena alasan yang sama — mohon jalankan
  `npm test` setelah build utk konfirmasi ke-9 test SESI2-7c + suite lama tetap hijau semua.
- `COVERAGE-PER-MODULE.md` / `FILE-MAP.md` tidak direkonsiliasi ulang (dokumentasi non-kritis,
  bisa di-regenerate builder kalau ada script-nya).

## File dalam patch ini
- `modules/finance/tx-bbm.js`, `transaksi.js`, `cicilan.js`
- `modules/vehicle/vehicle-core.js`
- `modules/asset/aset.js`
- `modules/shop/cobek-tx-cart.js`
- `modules/shared/modals.js`, `features-helpers-global-security.js`, `modules-calc.js`, `modules-render.js`
- `chat-action-handlers.js`
- `index.html`, `app_production.html`, `sw.js` (versi 1633→1634)
- `tests/` — 10 file test SESI2 s/d SESI7c
