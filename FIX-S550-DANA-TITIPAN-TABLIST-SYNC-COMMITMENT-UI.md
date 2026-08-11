# FIX-S550 — Sinkronkan `#danaTitipanTabList` dari `DanaTitipanCommitmentUI.save()` / `deleteCommitment()`

## Masalah

Sesi 498 menambahkan container **baru** `#danaTitipanTabList` (sub-tab
Laporan → Dana Titipan) yang dirender lewat
`DanaTitipanPortfolioPresenter.renderInto(containerId)`, dan
`renderLaporan()` (`modules/shared/modules-render.js`) sudah dipatch
waktu itu untuk memanggil **baik** `DanaTitipanPortfolioPresenter.render()`
(container lama `#danaTitipanPortfolioList`) **maupun**
`.renderInto('danaTitipanTabList')` (container baru) setiap kali laporan
dirender ulang.

Yang terlewat: `DanaTitipanCommitmentUI.save()` dan
`DanaTitipanCommitmentUI.deleteCommitment()` (modal "Pokok Dana Titipan")
cuma memanggil `DanaTitipanPortfolioPresenter.render()` setelah
commit/hapus pokok dana titipan — container baru `#danaTitipanTabList`
tidak ikut ter-refresh sampai `renderLaporan()` dipanggil ulang dari
tempat lain (mis. pindah tab).

## Perbaikan

Di `modules/finance/dana-titipan-portfolio-presenter.js`, tambahkan
pemanggilan `DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList')`
tepat setelah `DanaTitipanPortfolioPresenter.render()`, di dua tempat:

1. `DanaTitipanCommitmentUI.save()`
2. `DanaTitipanCommitmentUI.deleteCommitment()`

Pola & guard yang dipakai **identik** dengan yang sudah ada di
`renderLaporan()`:

```js
if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
```

0 logic/rumus baru — murni panggilan render tambahan, konsisten dengan
sumber data yang sama (`DanaTitipanPortfolioAPI.build()`).

## File yang berubah

- `modules/finance/dana-titipan-portfolio-presenter.js` — source
- `app-bundle-b.min.js` — bundle (file presenter ini masuk GROUP_B),
  diedit manual dengan isi identik ke source, TANPA menjalankan full
  `scripts/build.js` (menghindari version bump & churn tidak terkait di
  `index.html`/`app_production.html`/`sw.js`/file lain).
- `tests/s550-titipan-commitment-ui-tablist-sync.test.js` — test regresi
  baru (7 kasus)

**Catatan penting:** karena bundle diedit manual (bukan lewat
`node scripts/build.js`), nomor versi (`?v=`, `APP_BUILD_VERSION`, dll)
di `index.html`/`app_production.html`/`sw.js` **tidak berubah**. Sebelum
dipakai di production, jalankan `node scripts/build.js` sekali untuk
menaikkan versi & menyamakan bundle-bundle secara resmi (hasil edit
manual di `app-bundle-b.min.js` sudah identik dengan apa yang akan
dihasilkan ulang oleh build script dari source terbaru, jadi build ulang
ini aman dan hanya akan menaikkan versi + regenerasi cache-bust, tanpa
mengubah logic).

## Test regresi

`tests/s550-titipan-commitment-ui-tablist-sync.test.js` — 7 test:

1. `save()` sukses → `render()` lalu `renderInto('danaTitipanTabList')`
   terpanggil sesuai urutan.
2. `save()` gagal (validasi/throw) → kedua render call **tidak**
   terpanggil.
3. `save()` tanpa owner dipilih → kedua render call tidak terpanggil.
4. `deleteCommitment()` confirm ya → `render()` lalu `renderInto(...)`.
5. `deleteCommitment()` confirm batal → kedua render call tidak
   terpanggil, data tetap utuh.
6. Guard aman kalau `DanaTitipanPortfolioPresenter` belum ter-load.
7. Bukti konkret: `#danaTitipanTabList` benar-benar terisi HTML (bukan
   cuma "terpanggil") setelah `save()`.

Hasil: 7/7 PASS. Full suite (`node --test tests/*.test.js`): 3790/3790
PASS, 0 regresi.
