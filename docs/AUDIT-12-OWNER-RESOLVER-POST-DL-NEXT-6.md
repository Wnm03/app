# AUDIT-12-OWNER-RESOLVER-POST-DL-NEXT-6.md

Status: **AUDIT, 0 kode diubah.** Sesi audit lanjutan sesuai
`DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md` langkah 5 ("Audit
lanjutan bila perlu — setelah DL-Next-6 selesai, memverifikasi 0 gap
turunan baru sebelum ditutup total"). Snapshot v1309 (S579).

## Cakupan
Grep menyeluruh `deductionOwnerId` di seluruh `modules/` + root
(`data-health-check.js`) untuk memastikan **semua** consumer sudah
konsisten dengan sumber `resolveOwnerDefaultForAccount()` (Res-B/S578/
S579), tidak hanya yang sudah diperbaiki di DL-Next-1/DL-Next-6.

**Hasil grep:** hanya 3 file — `transaksi.js` (produsen, sudah
DL-Next-1), `tx-list-cashflow.js` (consumer badge, sudah DL-Next-6), dan
**`data-health-check.js`** (consumer ke-2, **belum pernah diaudit** di
rantai Owner Resolver — ditemukan sesi ini).

## Temuan baru: `data-health-check.js` — false positive utk owner sumber aset

**Bukti:** `runDataHealthCheck()` (baris 57-81) validasi
`t.deductionOwnerId` **hanya** terhadap `dOwnerAcc.owners||[]` (`acc.
owners[]` akun transaksi) — sama sekali tidak mengecek aset tertaut,
pola source-mismatch identik dengan bug DL-Next-1/DL-Next-6.

**Dibuktikan lewat reproduksi nyata** (skrip audit terpisah, dijalankan
lewat `loadSource()`): akun tanpa `acc.owners[]` sendiri + tertaut aset
multi-owner valid (`o1` 20%, `o2` 80%) + transaksi dengan
`deductionOwnerId:'o2'` yang **valid sepenuhnya** (tersimpan lewat
`source:'asset'`, dijamin benar oleh DL-Next-1) → `runDataHealthCheck()`
tetap mengeluarkan:
```
level: warn
title: "Pemilik Sumber Potongan tidak ditemukan"
detail: "... menyimpan Pemilik Sumber Potongan yang sudah tidak ada lagi
         (kemungkinan owner dihapus dari akun ...) ..."
```
**Pesan ini keliru** — owner tidak pernah dihapus, hanya sumbernya dari
aset tertaut yang tidak dicek fungsi ini.

**Dampak lebih tinggi dari DL-Next-6:** DL-Next-6 (badge) murni tampilan
kosmetik (baris kosong). Temuan ini **aktif memunculkan warning palsu**
ke user di UI Data Health Check, mengesankan data rusak/perlu
diperbaiki padahal valid — berpotensi bikin user bingung/tidak percaya
data sendiri, atau mencoba "memperbaiki" sesuatu yang sebenarnya benar.

**Cakupan dampak:** sama seperti pola DL-Next-1/6 — hanya transaksi di
akun yang (a) tertaut aset multi-owner via `a.accountId`, DAN (b) akun
itu sendiri belum pernah punya `acc.owners[]` manual (belum pernah
"Jadikan permanen"). Sejak DL-Next-1, kombinasi ini makin sering terjadi
karena transaksi jenis ini sekarang WAJIB (bukan opsional) py
`deductionOwnerId` — jadi makin banyak transaksi valid yang bakal kena
warning palsu ini kalau dibiarkan.

## Audit lain (regresi DL-Next-6 sendiri)
- Grep cross-check: 0 consumer lain `deductionOwnerId` ditemukan di luar
  3 file di atas. **PASS** — DL-Next-6 sudah menutup semua consumer
  tampilan yang diketahui.
- `resolveOwnerDefaultForAccount` dipanggil lintas-file
  (`tx-list-cashflow.js` memanggil fungsi yang didefinisikan di
  `transaksi.js`) — pola ini **sudah ada sejak awal** di arsitektur flat-
  concatenation project (function declaration di-hoist ke scope global
  bersama, urutan file di `build.js` tidak masalah). Dikonfirmasi lewat
  build sukses (`node --check` lolos kedua bundle) & full suite hijau di
  S579. **PASS**, bukan gap baru.
- Fallback `getAccOwners()`/`acc.owners` di `tx-list-cashflow.js` tetap
  dipertahankan (bukan dihapus) — **PASS**, sesuai catatan FIX S579,
  aman untuk kasus `resolveOwnerDefaultForAccount` belum termuat.

## Rekomendasi (untuk Design Lock berikutnya, BUKAN dikerjakan sekarang)

**DL-Next-7 (kandidat)** — ganti basis pengecekan
`t.deductionOwnerId` di `data-health-check.js:67-73` dari
`dOwnerAcc.owners||[]` ke `resolveOwnerDefaultForAccount(t.accountId).
owners` (sumber sama, pola sama persis DL-Next-1/DL-Next-6). Perlu
keputusan eksplisit tambahan (bukan otomatis FIX seperti DL-Next-6):
- Fungsi ini murni baca `D` global langsung (tidak lewat `loadSource()`
  dependency injection seperti `transaksi.js`/`tx-list-cashflow.js`) —
  perlu dipastikan `resolveOwnerDefaultForAccount` benar-benar tersedia
  di scope global saat `data-health-check.js` dijalankan (khususnya di
  test harness `loadSource()` yang isolasi per-file — beda dgn runtime
  produksi yang flat-concatenation).
- Pesan warning (`"Pemilik Sumber Potongan tidak ditemukan"` vs
  `"... bukan pemilik akun ..."`) mungkin perlu penyesuaian kata-kata
  kalau sumbernya bisa dari aset (bukan cuma dari akun) — supaya pesan
  tetap akurat menyebutkan dari mana harusnya owner itu berasal.

**Belum menjadi bagian lock ini** — hanya diusulkan, menunggu keputusan
eksplisit sebelum kode disentuh, sesuai disiplin project.

## Ringkasan

| # | Temuan | Risiko | Status |
|---|---|---|---|
| 1 | `data-health-check.js` false-positive warning utk owner sumber aset | **Sedang** (bukan korupsi data, tapi warning aktif menyesatkan user di UI) | Kandidat **DL-Next-7**, belum di-lock |
| 2 | Regresi DL-Next-6 sendiri (consumer lain, cross-file call, fallback) | Nihil | **PASS** |

**Kesimpulan:** DL-Next-6 sendiri **aman, 0 regresi turunan**. Ditemukan
1 gap baru di file **berbeda** (`data-health-check.js`) dengan pola bug
yang sama — direkomendasikan jadi DL-Next-7, menunggu Design Lock
terpisah sebelum diimplementasi.
