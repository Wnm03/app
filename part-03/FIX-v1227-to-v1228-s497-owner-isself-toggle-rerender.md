# FIX v1227 → v1228 (Sesi 497): "Ini saya" toggle tidak re-render field nama pemilik → dropdown tidak pernah muncul

## Laporan Bug (dari screenshot user)
Buka modal "⚖️ Atur Porsi Kepemilikan" holding investasi ("Kamera"), tap
"➕ Tambah Pemilik" → baris pertama otomatis free-text (default "👤 Ini saya"
tercentang). User ketik nama, lalu uncheck "Ini saya" (mau isi nama orang
lain) — field tetap free-text, dropdown pilih pemilik existing dari
OwnerRegistry TIDAK PERNAH muncul, walau registry sudah ada isi.

## Root Cause
`_ownerNameFieldHtml(o,i)` (investasi-view.js S491 / aset.js S490) menentukan
free-text vs `<select>` lewat `o.isSelf` / `o._creatingNew` / panjang
registry — tapi keputusan itu **cuma dievaluasi ulang saat `_renderOwnersList()`
jalan** (dipanggil dari `addOwnerRow()`/`removeOwnerRow()`/
`onOwnerSelectChange()`).

`onOwnerIsSelfToggle()` — dipanggil dari checkbox "Ini saya" — SEBELUMNYA
cuma menulis `draft[i].isSelf` TANPA memanggil `_renderOwnersList()`:

```js
onOwnerIsSelfToggle(i, checked) {
  if (!Array.isArray(InvestmentUI._ownersDraft) || !InvestmentUI._ownersDraft[i]) return;
  InvestmentUI._ownersDraft[i].isSelf = !!checked;
},
```

Baris pertama (`addOwnerRow()`, draft kosong) selalu default `isSelf: true`
→ field name di-render sbg free-text sejak awal. Uncheck "Ini saya" mengubah
`isSelf` di draft, tapi field DOM tidak ikut di-render ulang — jadi tetap
free-text selamanya untuk baris itu, dropdown existing-owner tidak pernah
dapat kesempatan muncul.

Bug ini SIMETRIS di dua file (pola replikasi PERSIS antar modul, sesuai
disiplin proyek): `modules/asset/investasi-view.js`
(`InvestmentUI.onOwnerIsSelfToggle`) & `modules/asset/aset.js`
(`Aset.onOwnerIsSelfToggle`).

## Perbaikan
Kedua fungsi sekarang memanggil `_renderOwnersList()` setelah update
`isSelf`:

```diff
  onOwnerIsSelfToggle(i, checked) {
    if (!Array.isArray(InvestmentUI._ownersDraft) || !InvestmentUI._ownersDraft[i]) return;
    InvestmentUI._ownersDraft[i].isSelf = !!checked;
+   InvestmentUI._renderOwnersList();
  },
```

(mirror sama persis di `Aset.onOwnerIsSelfToggle()`.)

Event checkbox ini DISKRIT (bukan tiap keystroke seperti
`onOwnerNameInput()`/`onOwnerPorsiInput()`, yang sengaja TIDAK memanggil
`_renderOwnersList()` supaya fokus/kursor input tidak hilang tiap ketik) —
jadi aman render ulang penuh. Porsi yang sudah diketik tidak ikut hilang
karena `_renderOwnersList()` membaca ulang nilainya dari `draft[i].porsi`,
yang tidak disentuh oleh toggle ini.

## Regresi Test Baru
`tests/s497-owner-isself-toggle-rerender-fix.test.js` (5 test, InvestmentUI
+ Aset):
1. Registry ada isi, baris pertama default `isSelf:true` (free-text) →
   uncheck "Ini saya" → field jadi `<select>` (dropdown MUNCUL — sebelumnya
   tidak).
2. Porsi yang sudah diketik tidak ikut reset saat toggle memicu render
   ulang.
3. Re-check "Ini saya" → field balik jadi free-text lagi (simetris).
4–5. Mirror test 1–2 untuk `Aset` (`modules/asset/aset.js`).

## Verifikasi
- `node --test tests/*.test.js` — 3242/3242 lulus (naik dari 3237, +5 test
  baru)
- `node scripts/build.js` — build sukses, versi naik ke v1228
- Sintaks kedua bundle valid (`node --check`)

## Catatan
Zip ini adalah **PATCH**, bukan full release — cuma berisi file yang baru
ditambah/diperbaiki sejak base `kw_release_v1227_...zip` (rebuild v1227 dari
sesi 494–496 + fix ownerregistry-numeric-uid). Upload ULANG semua file di
zip ini ke lokasi yang sama di server/repo — jangan cuma
`index.html`/`sw.js`.
