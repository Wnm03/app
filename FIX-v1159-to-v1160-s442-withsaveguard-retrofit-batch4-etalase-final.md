# v1159 → v1160 (S442 withSaveGuard retrofit batch 4 — 1 fungsi, PENUTUP)

## Fungsi terakhir dari daftar 6

`Etalase.save()` (`modules/shop/cobek-etalase.js`) — kandidat terakhir
dari daftar 6 `save()` mentah tanpa `withSaveGuard` (sisa setelah batch
1: EduFund/Piutang/Debt, batch 2: Produsen, batch 3: Aset).

## Kenapa ini paling berisiko dari 6-nya

- Pakai `this.` 7x (`this.editIdx`, `this.renderList()`,
  `this.syncPairedPrice()`) → wrapper wajib `.bind(Etalase)`, sama
  seperti Produsen batch 2.
- Ada **2 titik `return`** di tengah fungsi (jalur "stok bertambah &
  ada transaksi" vs "cuma update, tanpa transaksi") — keduanya aman
  dipindah apa adanya ke `_saveInner()` karena `return` di situ cuma
  mengakhiri body fungsi, bukan lompat keluar loop/blok lain.
- Paling BANYAK dipakai test secara langsung dari 6 kandidat: 6 file
  yang benar-benar memanggil `ctx.Etalase.save()` (bukan cuma
  disebut di komentar).

## Perubahan

- `modules/shop/cobek-etalase.js`: body `Etalase.save()` dipindah jadi
  `Etalase._saveInner()`, `save()` baru:
  `withSaveGuard('etalase','productModal',Etalase._saveInner.bind(Etalase))`.
  Key `'etalase'` dicek tidak bentrok dgn 11 key existing.
- 5 test file yang punya call site nyata `Etalase.save()` (setelah
  disaring dari 12 file yang match grep "Etalase.save(" — sisanya cuma
  komentar/tidak memuat `cobek-etalase.js` sama sekali) ditambah
  `withSaveGuard: (key, modalId, fn) => fn()` ke `extraGlobals`:
  - `tests/product-ownership-foundation.test.js` (3 titik `loadSource`)
  - `tests/product-repository-attribute-gate-mod5.test.js`
  - `tests/product-repository-nested-mutation-gate-mod6.test.js`
  - `tests/shop-engine-tahap10-metadata-driven-form-wiring.test.js`
    (1 helper `makeEtalaseCtx`, dipakai 4x)
  - `tests/shop-engine-tahap6-save-wiring.test.js` (1 helper
    `makeEtalaseCtx`, dipakai 6x)
  - `shop-engine-tahap5-wiring.test.js` & `-tahap9-...test.js`: dicek,
    TIDAK memanggil `Etalase.save()` beneran (cuma disebut di komentar)
    → tidak disentuh.

## Verifikasi

- `node --check modules/shop/cobek-etalase.js` bersih.
- `node --test tests/*.test.js` → **2900/2900 pass**, 0 fail (dicek
  juga 0 baris gagal lewat filter `not ok`/`# fail` sebelum full run).
- `node scripts/build.js s442-withsaveguard-retrofit-etalase` →
  1159→1160, sintaks bundle valid, HTML/sw.js sinkron.

## Status retrofit withSaveGuard()

Semua 6 fungsi `save()` mentah yang teridentifikasi di awal sudah
di-retrofit (S439-S442): `EduFund`, `Piutang`, `Debt`, `Produsen`,
`Aset`, `Etalase`. Kandidat lain di luar scope ini (double-proration
`_saveBillInner`, split file kegedean) belum disentuh — 2 item itu
masih perlu sesi terpisah sesuai rencana awal.
