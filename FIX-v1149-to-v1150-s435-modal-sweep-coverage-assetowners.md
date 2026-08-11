# FIX v1149 -> v1150 (s435) — Kelengkapan cakupan Tes Buka/Tutup Modal: daftarkan `assetOwnersModal`

## Konteks

User menjalankan "Tes Buka/Tutup Modal" (self-test.js) di v1149 dan melaporkan
hasilnya: 101/114 modal aman, 12 butuh konteks (pola normal — modal-modal ini
memang butuh id parent/data prasyarat, sudah dicatat di FIX-FIX sesi
sebelumnya), dan **1 bermasalah**:

```
❌ (kelengkapan cakupan) modal belum terdaftar (#assetOwnersModal)
   → 1 modal ada di halaman tapi belum masuk sweep manapun -- daftarkan ke
     EXTRA_MODAL_SWEEP_SPECS/MODULE_METHOD_MODAL_SPECS: assetOwnersModal
```

## Root cause

`assetOwnersModal` ("⚖️ Atur Porsi Kepemilikan", dibuka lewat
`Aset.openOwnersModal()`, fitur Sesi 392a+) ada di markup halaman
(`index.html`/`app_production.html`) tapi tidak pernah didaftarkan ke salah
satu dari 3 daftar spec yang dipakai `computeModalSweepResults()`
(`EXTRA_MODAL_SWEEP_SPECS`/`RISKY_OPENER_SPECS`/`MODULE_METHOD_MODAL_SPECS`),
dan auto-detect nama fungsi (`computeModalSweepFnNames()`) tidak menangkapnya
karena dipanggil sbg method (`Aset.openOwnersModal()`), bukan fungsi global
`openXxxModal()`. Ini murni **gap cakupan tes**, BUKAN bug fungsional —
fitur "Atur Porsi Kepemilikan" sendiri sudah dites & jalan normal (lihat
sesi 392a-392e, 422e, 430, 431, 433 — semuanya menyentuh fitur ini tanpa
masalah). Pola identik persis dengan `purchaseOrderBatchModal` yang
sebelumnya juga ketinggalan didaftarkan (S388).

## Perbaikan

Tambah 1 spec baru ke `MODULE_METHOD_MODAL_SPECS` di `self-test.js`, tepat
setelah `Aset.openModal()`:

```js
{label:'Aset.openOwnersModal()',id:'assetOwnersModal',
before:()=>{ const backup=Aset.editId; D.assets.push({id:'__sweep_dummy_asset_owners__',...}); Aset.editId='__sweep_dummy_asset_owners__'; return backup; },
call:()=>{ Aset.openOwnersModal(); },
after:(backup)=>{ Aset.editId=backup; D.assets=D.assets.filter(a=>a.id!=='__sweep_dummy_asset_owners__'); }},
```

`openOwnersModal()` baca `Aset.editId` (lihat komentar fungsinya di
`aset.js`) — kalau kosong tetap render (mode "aset belum tersimpan"), tapi
biar sweep representatif dgn pemanggilan asli dari UI (tombol muncul saat
Edit Aset), `before`/`after` set & kembalikan `Aset.editId` ke aset dummy
sementara, dibuang lagi setelahnya — pola sama persis
`openCicilanHistoryFromTx` (`RISKY_OPENER_SPECS`, sesi lama). `testOneModalOpener()`
sudah generik menjalankan `before`/`call`/`after` utk keempat array spec
(diverifikasi baca `computeModalSweepResults()`), jadi 0 perubahan runner
diperlukan.

File yang diubah: `self-test.js` (1 spec baru ditambah).

## Test

Sweep modal (`runModalSweep()`) murni browser-only (baca DOM nyata dari
`index.html`, `classList.contains('open')`, dst) — konsisten pola sesi-sesi
sebelumnya (mis. S388 purchaseOrderBatchModal), TIDAK ada test `node --test`
tersendiri utk registrasi spec sweep ini sendiri. Verifikasi yang dilakukan:
`node --check self-test.js` lolos, full suite **2895/2895 test tetap lulus**
(0 regresi — perubahan tidak menyentuh file lain).

## Release gate

- `lint`: override dipakai (eslint tidak bisa diinstall, sandbox tanpa akses
  jaringan) — konsisten sesi-sesi sebelumnya.
- `minify`: override dipakai (esbuild tidak terpasang, sandbox tanpa akses
  jaringan) — bundle unminified 100% valid (`node --check` lolos).
- `html-sync`: lolos normal.

Versi: v1149 → **v1150** (`s435-modal-sweep-coverage-assetowners`). Backup
bundle lama tersimpan otomatis di `backups/`.
