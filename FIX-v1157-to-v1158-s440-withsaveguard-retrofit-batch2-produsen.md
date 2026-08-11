# v1157 → v1158 (S440 withSaveGuard retrofit batch 2 — 1 fungsi)

## Kandidat sisa (sebelum sesi ini)

`aset.js:800` (Aset.save()), `cobek-etalase.js:420` (Etalase.save()),
`cobek-order.js:38` (Produsen.save()) — 3 fungsi terakhir belum
di-retrofit.

## Kenapa Produsen.save() duluan

`Aset.save()` (~150+ baris, banyak cabang: akun baru otomatis,
ownership, multi-owner porsi) dan `Etalase.save()` (Product save +
attribute mutation gate) jauh lebih besar & berisiko dari batch 1.
`Produsen.save()` paling ringkas di antara sisa 3 — beda dari batch 1
cuma satu hal: pakai `this.editId`/`this.renderList()` (bukan nama
modul eksplisit), jadi wrapper WAJIB `.bind(Produsen)` biar `this`
tidak lepas ikatan waktu dipanggil sebagai `fn()` polos di dalam
`withSaveGuard()`.

## Perubahan

- `modules/shop/cobek-order.js`: `Produsen.save()` body dipindah jadi
  `Produsen._saveInner()`, `save()` baru:
  `withSaveGuard('produsen','produsenModal',Produsen._saveInner.bind(Produsen))`.
  Key `'produsen'` dicek tidak bentrok (`acc,bbm,bill,budget,debt,
  eduFund,kasir,order,piutang`).
- `tests/supplier-mutation-gate-mod7.test.js`: 3 `loadSource()` call
  site yang manggil `Produsen.save()` langsung ditambah
  `withSaveGuard: (key, modalId, fn) => fn()` ke extraGlobals (pola
  sama batch 1). Sisa 26 file lain yang me-load `cobek-order.js` dicek
  — tidak ada yang manggil `Produsen.save()`.

## Verifikasi

- `node --check modules/shop/cobek-order.js` bersih.
- `node --test tests/*.test.js` → **2900/2900 pass**, 0 fail.
- `node scripts/build.js s440-withsaveguard-retrofit-produsen` →
  1157→1158, sintaks bundle valid, HTML/sw.js sinkron.

## Sisa

`Aset.save()` & `Etalase.save()` masih di-park — keduanya butuh sesi
sendiri (blast-radius lebih besar, banyak cabang/side-effect). Kandidat
lain di luar 6 `save()` mentah ini (double-proration `_saveBillInner`,
split file kegedean) belum disentuh.
