# DESIGN-LOCK-DL-NEXT-8-DATA-HEALTH-CHECK-OTHER-ACC-SOURCE.md

Status: **LOCK, 0 kode diubah.** Menutup rekomendasi
`AUDIT-13-OWNER-RESOLVER-POST-DL-NEXT-7.md` (snapshot v1310/S580).
Basis: pola identik DL-Next-1/6/7 (source-mismatch `acc.owners[]` vs
aset tertaut), scope kali ini di cabang `existsOnOtherAcc`.

## Cakupan
`runDataHealthCheck()` di `data-health-check.js`, baris
`existsOnOtherAcc` (pembeda kasus A "owner tidak ditemukan sama
sekali" vs C "owner valid tapi di akun lain"). Basis dari
`(a.owners||[])` mentah → `resolveOwnerDefaultForAccount(a.id).owners`
per akun lain — sumber sama dgn perbaikan DL-Next-7 di cabang utama.

**Tidak diubah:** cabang utama `dOwnerAcc` (DL-Next-7, sudah beres),
cabang `!dOwnerAcc` (akun sendiri invalid, di luar cakupan gap ini).

## Keputusan (1 poin terbuka dari audit — performa)

**Loop `resolveOwnerDefaultForAccount()` per akun lain, bukan sekali.**
Keputusan: **diterima apa adanya**, TIDAK perlu optimasi (mis. cache
per-run). Alasan: `D.accounts` di project ini berskala rumah
tangga/UMKM kecil (puluhan akun, bukan ribuan), `runDataHealthCheck()`
sendiri BUKAN hot path (dipanggil on-demand dari tab Data Health, bukan
tiap render) — pola sama dgn cek-cek lain di file ini yang sudah
melakukan `D.accounts.some()`/`.find()` berulang tanpa masalah. Kalau
suatu saat `D.accounts` membengkak jadi masalah nyata, itu keputusan
optimasi terpisah (di luar cakupan fix source-mismatch ini).

## Rencana implementasi (belum dikerjakan — ringkasan step berikutnya)

```
const existsOnOtherAcc=D.accounts.some(a=>{
  if(sameId(a.id,dOwnerAcc.id))return false;
  let otherOwners=a.owners||[];
  if(typeof resolveOwnerDefaultForAccount==='function'){
    const r=resolveOwnerDefaultForAccount(a.id);
    if(r&&r.ok&&r.owners.length>0)otherOwners=r.owners;
  }
  return otherOwners.some(o=>sameId(o.ownerId,t.deductionOwnerId));
});
```

Wording pesan kasus C TIDAK berubah (tetap generik "bukan pemilik akun
transaksi ini, valid secara global") — sudah cukup akurat baik sumbernya
`acc.owners[]` maupun aset tertaut akun lain, jadi 0 percabangan
wording tambahan diperlukan di sini (beda dari DL-Next-7 yang butuh
sebut nama aset spesifik).

## Test plan (garis besar)
- Reproduksi persis kasus di `AUDIT-13` (owner valid HANYA lewat aset
  tertaut di akun lain, bukan `acc.owners[]` akun itu) → judul **harus**
  berubah dari "tidak ditemukan" jadi "bukan pemilik akun transaksi ini".
- Kasus lama (owner valid di akun lain lewat `acc.owners[]` manual) →
  perilaku tidak berubah, tetap kasus C.
- Kasus owner benar-benar tidak ada di manapun (bukan di akun manapun,
  baik manual maupun aset) → tetap kasus A, 0 regresi.
- Guard fallback (tanpa `resolveOwnerDefaultForAccount` termuat) → jalur
  lama (`a.owners||[]`) tetap jalan, 0 crash.

## Risiko
Rendah — pola identik DL-Next-7 yang sudah terbukti aman di S580 (build
+ full suite hijau). Perubahan wording 0 (beda dari DL-Next-7), murni
kategorisasi ulang A vs C.

## Ringkasan
| Poin | Keputusan |
|---|---|
| Sumber data per akun lain | `resolveOwnerDefaultForAccount(a.id)`, guard `typeof`, fallback `a.owners` lama |
| Performa (loop per akun) | Diterima apa adanya, 0 optimasi — skala akun kecil, bukan hot path |
| Wording pesan kasus C | Tidak berubah — sudah akurat generik |
| Level severity | Tetap `warn`, 0 perubahan |

**Status akhir:** DL-Next-8 **di-lock**. Implementasi + test file + FIX
doc dikerjakan sesi berikutnya (kode belum disentuh sesi ini).
