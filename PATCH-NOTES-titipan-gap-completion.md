# Patch: Melengkapi Sinkron Akun <-> Dana Titipan (wiring save() + badge)

Melengkapi 2 bagian dari PATCH-NOTES-akun-dana-titipan-sync.md yang belum
ter-apply di app-main-26 (logic `checkAccounts()`/`reconcileAccounts()`
sudah ada duluan, tapi belum pernah dipanggil otomatis / belum ada UI-nya).

## File yang diubah
- `modules/shared/features-helpers-global-security.js`
- `modules/shared/modules-render.js`

## 1. Wiring `TitipanSync.reconcileAccounts()` ke `save()`
Sebelumnya fungsi `reconcileAccounts()` sudah ada di `titipan-sync.js`
tapi tidak pernah dipanggil di mana pun -- jadi sinkron nominal real-time
akun berdiri-sendiri ke Dana Titipan **tidak pernah benar-benar jalan**.
Ditambahkan 1 baris di `save()`, tepat setelah `invalidateAccBalCache()`
(supaya baca saldo akun terbaru, bukan cache basi):

```js
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcileAccounts==='function')TitipanSync.reconcileAccounts();
```

## 2. Badge "⚠️ Porsi titipan belum sinkron ke Dana Titipan"
Ditambahkan ke `renderAccGrid()` (halaman 🏦 Akun & Metode Pembayaran).
100% REUSE `TitipanReconcile.checkAccounts()` -- 0 logic gap dihitung
ulang di file render. Dihitung SEKALI per render (bukan per-kartu),
hasil `missing[].key` (`"accId::ownerId"`) di-parse ambil `accId` saja,
dikumpulkan ke 1 `Set`, lalu dicocokkan ke tiap kartu akun. Badge cuma
tampil untuk akun **berdiri-sendiri** (bukan `linked` ke Aset -- itu
sudah otomatis sync via cabang lain). Guard `typeof TitipanReconcile`
-- kalau file itu belum dimuat, fallback ke `Set` kosong (0 badge, 0 error).

Murni informasi/read-only: 0 tombol, 0 mutasi ke `D`.

## Verifikasi
```
node --test tests/*.test.js   # 4278/4278 pass, 0 regresi
```
