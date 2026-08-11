# FIX v1133 -> v1134 (s422f) — Transaksi di akun tertaut belum sync balik ke `a.nilai`

## Bug (arah terakhir yang belum sync)
Sejak Sesi C, arah sync akun tertaut memang didesain SATU ARAH:
Aset → Akun (nilai/porsi yang diedit di Buku Aset dipropagasi ke saldo
akun tertaut, lihat s422e). Sebaliknya, transaksi (bayar/terima/
transfer) yang terjadi LANGSUNG di akun tertaut TIDAK PERNAH ketarik
balik ke `a.nilai` — user harus edit manual Buku Aset tiap kali ada
transaksi di akun itu, kalau tidak nilai aset & saldo akun jadi
divergen.

## Fix
Fungsi baru `syncLinkedAssetNilaiFromAkun()` (modules/asset/aset.js),
dipanggil dari `save()` (titik tunggal, pola sama
`invalidateAccBalCache()`, features-helpers-global-security.js).
Tiap aset yang punya `accountId`: hitung ownPortion AKTUAL akun
tertaut (`recalcAccBalance()`), lalu koreksi `a.nilai` = ownPortion
aktual dibagi porsi SELF saat ini (`MultiOwnerEngine.selfPorsi()`,
fallback 100 kalau engine belum dimuat) — porsi TIDAK diubah, cuma
nilai TOTAL instrumen di-scale balik supaya tetap konsisten dgn
ownPortion baru. Idempotent: kalau akun baru saja disamakan lewat
`Aset.save()`/`saveOwners()` (txDelta pattern, s422e), hasilnya = nilai
yang sama, 0 perubahan.

```js
function syncLinkedAssetNilaiFromAkun(){
  D.assets.forEach(a=>{
    if(!a.accountId)return;
    const acc=D.accounts.find(x=>sameId(x.id,a.accountId));
    if(!acc)return;
    const selfPorsi=MultiOwnerEngine.selfPorsi(a); // fallback 100
    if(!(selfPorsi>0))return;
    a.nilai=Math.round(recalcAccBalance(acc.id)/(selfPorsi/100));
  });
}
```

## File berubah
- `modules/asset/aset.js` — fungsi baru `syncLinkedAssetNilaiFromAkun()`
- `modules/shared/features-helpers-global-security.js` — `save()`
  memanggil fungsi di atas (guarded `typeof`), sejajar
  `invalidateAccBalCache()`
- `tests/asset-nilai-sync-from-akun-s422f.test.js` — BARU, 4 test
  (single-owner naik sesuai transaksi, multi-owner di-scale balik
  dgn porsi tetap, idempotent 0 transaksi baru, aset tanpa akun
  tertaut dilewati)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild dari source
  (esbuild tidak tersedia, UNMINIFIED)
- `index.html`, `app_production.html`, `sw.js` — versi -> v1134
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- File versi/label lain — cuma sinkron konstanta versi (build.js),
  isi logic TIDAK berubah

## Status
Kedua arah sync (Aset↔Akun tertaut) sekarang LENGKAP:
s422e = Aset → Akun (porsi/nilai berubah di modal → saldo akun ikut),
s422f = Akun → Aset (transaksi di akun → nilai aset ikut).

## Verifikasi
- `node --test tests/*.test.js` → **2846/2846 pass** (2842 lama + 4
  baru), 0 fail.
- `node scripts/build.js s422f-sync-nilai-aset-dari-akun-tertaut` →
  build sukses, sintaks kedua bundle valid, versi `v1133` -> `v1134`.
