# DESIGN-LOCK-DL-NEXT-7-DATA-HEALTH-CHECK-OWNER-SOURCE.md

Status: **LOCK, 0 kode diubah.** Menutup rekomendasi
`AUDIT-12-OWNER-RESOLVER-POST-DL-NEXT-6.md` (snapshot v1309/S579).
Basis: pola identik DL-Next-1 (transaksi.js) & DL-Next-6 (tx-list-cashflow.js).

## Cakupan
`runDataHealthCheck()` di `data-health-check.js:57-81`. Basis cek
`t.deductionOwnerId` diganti dari `dOwnerAcc.owners||[]` (buta aset
tertaut) ke `resolveOwnerDefaultForAccount(t.accountId).owners`
(sumber sama dgn guard `_saveTxInner()` S578 & badge DL-Next-6).

**Tidak diubah:** cabang `!dOwnerAcc` (baris 59-65, akun sendiri sudah
invalid — di luar cakupan gap ini) dan cek-cek lain di file ini.

## Keputusan (2 poin terbuka dari audit)

**1. Global `D` read, bukan dependency injection.**
Keputusan: **pertahankan pola baca `D` global**, JANGAN refactor ke
`loadSource()` injection (di luar cakupan DL-Next-7 — itu perubahan
arsitektur file, bukan fix bug). Guard ketersediaan fungsi dgn
`typeof resolveOwnerDefaultForAccount==='function'` — pola identik
DL-Next-6 di `tx-list-cashflow.js`. Kalau fungsi belum termuat
(termasuk test harness `loadSource()` yang isolasi per-file), fallback
otomatis ke logic lama (`dOwnerAcc.owners||[]`) — bukan silent-skip,
bukan crash. Konsekuensi: test file `data-health-check.js` yang mau
menguji jalur `source:'asset'` WAJIB me-load `transaksi.js` juga
(sama seperti test DL-Next-6 sudah lakukan utk `tx-list-cashflow.js`);
test lama yang cuma load `data-health-check.js` sendirian tetap lolos
lewat jalur fallback, 0 regresi.

**2. Wording pesan warning disesuaikan per source.**
Keputusan: pesan **HANYA** disesuaikan utk kasus `source==='asset'`
(kalimat lama menyebut "dihapus dari akun X" — keliru kalau sumbernya
aset, bukan akun). Kasus `source==='account'` atau `'none'`/fallback
tetap pakai kalimat lama verbatim (0 regresi wording utk kasus yang
sudah benar). Level tetap `warn` di semua cabang — 0 perubahan
severity, sesuai disiplin "murni baca" file ini.

## Rencana implementasi (belum dikerjakan — ringkasan step berikutnya)

```
if(t.deductionOwnerId){
  const dOwnerAcc=D.accounts.find(a=>sameId(a.id,t.accountId));
  if(!dOwnerAcc){
    // (unchanged, baris 59-65)
  }else{
    let dOwnerList=dOwnerAcc.owners||[];
    let ownerSource='account';
    if(typeof resolveOwnerDefaultForAccount==='function'){
      const resolved=resolveOwnerDefaultForAccount(t.accountId);
      if(resolved&&resolved.ok&&resolved.owners.length>0){
        dOwnerList=resolved.owners;
        ownerSource=resolved.source; // 'asset'|'account'|'none'
      }
    }
    const isOwnerOfThisAcc=dOwnerList.some(o=>sameId(o.ownerId,t.deductionOwnerId));
    if(!isOwnerOfThisAcc){
      const existsOnOtherAcc=D.accounts.some(a=>!sameId(a.id,dOwnerAcc.id)&&(a.owners||[]).some(o=>sameId(o.ownerId,t.deductionOwnerId)));
      if(existsOnOtherAcc){
        // (unchanged pesan C)
      }else if(ownerSource==='asset'){
        // pesan BARU: sebut aset tertaut, bukan "dihapus dari akun X"
      }else{
        // (unchanged pesan A/lama)
      }
    }
  }
}
```

Detail pesan `source==='asset'` masih perlu dirumuskan saat coding
(butuh nama aset tertaut — via `findLinkedAssetForAccount(accId)`,
fungsi yang sama dipakai `resolveOwnerDefaultForAccount` sendiri).

## Test plan (garis besar)
- Reproduksi persis kasus di `AUDIT-12` (akun tanpa `owners[]` +
  aset tertaut 2 owner + `deductionOwnerId` valid dari aset) →
  **harus 0 warning** (regresi utama yang diperbaiki).
- Kasus lama (owner valid dari `acc.owners[]`, owner di akun lain,
  owner benar-benar tidak ada di manapun) → pesan & level **tidak
  berubah**, lolos tanpa `transaksi.js` di-load (jalur fallback).
- Kasus akun invalid (`!dOwnerAcc`) → tidak tersentuh, cukup 1 test
  regresi cepat.

## Risiko
Rendah — pola & fallback identik DL-Next-6 yang sudah terbukti aman
di S579 (build + full suite hijau). Satu-satunya sisi baru adalah
percabangan wording, di-guard oleh `ownerSource`, 0 perubahan level
atau auto-repair.

## Ringkasan
| Poin | Keputusan |
|---|---|
| Sumber data | `resolveOwnerDefaultForAccount()`, guard `typeof`, fallback ke `dOwnerAcc.owners` lama |
| Dependency injection | TIDAK — tetap baca `D` global, di luar cakupan |
| Wording | Disesuaikan HANYA utk `source==='asset'`; kasus lain verbatim lama |
| Level severity | Tetap `warn` semua cabang |

**Status akhir:** DL-Next-7 **di-lock**. Implementasi + test file +
FIX doc dikerjakan sesi berikutnya (kode belum disentuh sesi ini).
