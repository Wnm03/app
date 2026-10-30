# FIX v1226 → v1227 (Sesi 496): OwnerRegistry.findOrCreate() balikin number, bukan string

## Laporan Bug (dari screenshot user)
Buka modal "⚖️ Atur Porsi Kepemilikan" holding investasi (mis. "Kamera"), isi
nama pemilik baru + porsi 100%, tap "✅ Simpan Porsi" → gagal dengan toast:

> ⚠️ Pemilik ke-1: ownerId wajib diisi (string, tidak boleh kosong)

Padahal nama & porsi sudah diisi benar dan totalnya pas 100%.

## Root Cause
`uid()` (modules/shared/features-helpers-global-security.js) balikin **number**
(`Date.now()`-based), bukan string:
```js
function uid(){let n=Date.now();if(n<=_lastUid)n=_lastUid+1;_lastUid=n;return n;}
```

`OwnerRegistry.findOrCreate(name)` (modules/shared/owner-registry.js) memakai
`uid()` utk bikin id baru, tapi TIDAK membungkusnya dengan `String()`:
```js
const id = (typeof uid === 'function') ? uid() : ('owner_' + Date.now());
```

Saat pemilik BARU (nama belum ada di registry) disimpan lewat
`InvestmentUI.saveOwners()` (modules/asset/investasi-view.js) atau
`Aset.saveOwners()` (modules/asset/aset.js), `ownerId` diisi langsung dari
`OwnerRegistry.findOrCreate()` — jadi berupa **number**, bukan string. Angka
ini diteruskan ke `MultiOwnerEngine.validateOwner()`, yang mensyaratkan
`typeof owner.ownerId === 'string'` → gagal, keluar pesan persis seperti di
screenshot.

Test lama `tests/s489-owner-registry.test.js` TIDAK menangkap bug ini karena
mock `uid` di situ sengaja dibuat balikin STRING (`'u1'`, `'u2'`, ...) — beda
dari `uid()` produksi yang aslinya balikin number.

## Perbaikan
`OwnerRegistry.findOrCreate()` sekarang selalu balikin `String(id)` — baik
untuk id baru (`String(uid())`) maupun id existing yang dibaca balik
(`String(existing.id)`, defense-in-depth kalau ada entri lama yang kadung
tersimpan sbg number dari sebelum fix ini).

```diff
- const id = (typeof uid === 'function') ? uid() : ('owner_' + Date.now());
+ const id = String((typeof uid === 'function') ? uid() : ('owner_' + Date.now()));
```
```diff
- if (existing) return existing.id;
+ if (existing) return String(existing.id);
```

Satu titik perbaikan di `owner-registry.js` otomatis memperbaiki KEDUA
consumer (`InvestmentUI.saveOwners()` & `Aset.saveOwners()`) sekaligus —
0 perubahan di dua file itu.

## Regresi Test Baru
`tests/s496-owner-registry-numeric-uid-fix.test.js` — mock `uid()` yang
meniru perilaku produksi asli (balikin number), lalu pastikan:
1. `findOrCreate()` balikin string meski `uid()` balikin number
2. Entri yang tersimpan di `D.ownerRegistry` juga string
3. Baca balik entri lama yang kadung numeric tetap dinormalisasi jadi string
4. Id hasilnya lolos kontrak `MultiOwnerEngine.validateOwner()`

## Verifikasi
- `node --test tests/*.test.js` — 3237/3237 lulus (naik dari 3233, +4 test baru)
- `node scripts/build.js` — build sukses, versi naik ke v1227
- `node scripts/verify-bundle-freshness.js` — kedua bundle segar
- `node scripts/verify-window-expose.js` — OK, tidak ada regresi expose

## Catatan
Zip ini adalah **PATCH**, bukan full release — cuma berisi file yang baru
ditambah atau diperbaiki sejak base `kw_release_v1225_s494-titipan-kuota-
nominal-investment-owners.zip` (termasuk juga fix z-index `investmentOwnersModal`
dari sesi sebelumnya, v1226, yang belum sempat di-deploy terpisah). Upload
ULANG semua file di zip ini ke lokasi yang sama di server/repo — jangan cuma
`index.html`/`sw.js`.
