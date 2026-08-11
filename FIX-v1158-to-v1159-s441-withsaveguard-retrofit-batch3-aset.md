# v1158 → v1159 (S441 withSaveGuard retrofit batch 3 — 1 fungsi)

## Kandidat sisa (sebelum sesi ini)

`aset.js:800` (Aset.save()), `cobek-etalase.js:420` (Etalase.save()).

## Kenapa Aset.save() duluan, bukan Etalase.save()

Aset.save() lebih panjang (~145 baris vs ~98 baris Etalase.save()),
tapi mekanisme retrofit-nya lebih ringan & rendah risiko: **0** pemakaian
`this.` — semua referensi internal sudah eksplisit `Aset.editId`,
`Aset._syncOwnerDebts()`, dst (persis pola batch 1: `EduFund`/`Piutang`/
`Debt`, TANPA perlu `.bind()`). Etalase.save() sebaliknya pakai `this.`
7x (`this.editIdx`, `this.renderList()`, `this.syncPairedPrice()`) —
butuh `.bind(Etalase)` + 2 jalur `return` di tengah fungsi (rawan salah
titik potong saat dipisah jadi `_saveInner`). Jadi Aset.save() dulu yang
dikerjakan sesi ini; Etalase.save() diserahkan ke sesi berikutnya.

## Perubahan

- `modules/asset/aset.js`: `Aset.save()` body dipindah jadi
  `Aset._saveInner()`, `save()` baru:
  `withSaveGuard('aset','assetModal',Aset._saveInner)`. Key `'aset'`
  dicek tidak bentrok dengan 9 key existing (`acc,bbm,bill,budget,debt,
  eduFund,kasir,order,piutang,produsen`).
- `tests/asset-owners-linked-account-ownership-sync-s437.test.js`:
  satu-satunya test yang manggil `ctx.Aset.save()` langsung — ditambah
  `withSaveGuard: (key, modalId, fn) => fn()` ke `extraGlobals` di
  `makeCtx()` (pola sama batch 1 & 2). File lain yang me-load
  `aset.js` dicek — tidak ada call site `.save()` lain yang perlu
  disentuh.

## Verifikasi

- `node --check modules/asset/aset.js` bersih.
- `node --test tests/*.test.js` → **2900/2900 pass**, 0 fail.
- `node scripts/build.js s441-withsaveguard-retrofit-aset` →
  1158→1159, sintaks bundle valid, HTML/sw.js sinkron.

## Sisa

`Etalase.save()` (`cobek-etalase.js:420`) — kandidat retrofit
`withSaveGuard()` terakhir dari daftar 6 `save()` mentah yang
teridentifikasi. Kandidat lain di luar itu (double-proration
`_saveBillInner`, split file kegedean) belum disentuh.
