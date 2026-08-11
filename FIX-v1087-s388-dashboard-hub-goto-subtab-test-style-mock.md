# FIX v1087 — Sesi 388 — Test fixture `style` mock hilang di dashboard-hub-goto-subtab.test.js

## Ringkasan
2 test fail pre-existing di suite (2614/2616 pass) di file
`tests/dashboard-hub-goto-subtab.test.js`, bukan bug di kode produksi.

## Root Cause
`applySectionTab()` (modules/dashboard-hub/dashboard-hub.js baris ~802) menulis
`el.style.display = ''` sebagai bagian fix cascade bug CSS inline `style.display`
vs `classList.toggle('u-dnone')` (audit sebelumnya, lintas 10 fungsi tab-switcher).

Mock DOM `makeEl()` di test ini dibuat sebelum fix cascade itu ada, jadi elemen
tiruan belum punya properti `style` sama sekali → runtime error saat
`applySectionTab` jalan lewat vm-sandbox:

```
TypeError: Cannot set properties of undefined (setting 'display')
  at dashboard-hub.js:802:79
```

Kode produksi sendiri tidak bermasalah (elemen DOM asli di browser selalu
punya `.style`) — murni gap di test fixture.

## Fix
Tambah `style: {}` ke object yang direturn `makeEl()` di
`tests/dashboard-hub-goto-subtab.test.js`. Tidak ada assertion yang diubah.

## File Diubah
- `tests/dashboard-hub-goto-subtab.test.js` (+8 baris, mock fixture saja)

## Hasil Test
Sebelum: 2614/2616 pass (2 fail — test #331, #332)
Sesudah: **2616/2616 pass**

## Scope
Tidak menyentuh bundle (`app-bundle-a.min.js`/`app-bundle-b.min.js`),
`app_production.html`, `index.html`, atau versi build — perubahan murni di
file test, tidak ada kode aplikasi yang berubah, jadi tidak perlu rebuild.
