# Fix v977 (s316) — Edit transaksi pembayaran Tagihan lewat modal Transaksi biasa memutus billLinkId & tidak sinkron ke arsip

## Latar belakang (laporan user)

Transaksi pembayaran tagihan `kind:'tagihan'` (mis. PBB — bukan cicilan/
langganan/utang) — baik yang masih aktif maupun yang **sudah lunas/
diarsip** — kalau tanggalnya diedit lewat modal Transaksi biasa (bukan
lewat 📋 Riwayat Pembayaran di tab Tagihan), kodenya jatuh ke cabang
generik yang menghapus `billLinkId` begitu saja dan tidak pernah
menyinkronkan `completedAt` ke arsip tagihan. Begitu diedit dari sisi
Transaksi, tautannya putus permanen.

## Root cause

Dua celah di `_saveTxInner()` (`modules/finance/transaksi.js`):

1. `existingBill` (dipakai buat deteksi cabang cicilan/langganan/utang)
   cuma dicari di `D.bills` (tagihan yang masih AKTIF):
   ```js
   const existingBill=existingTx&&existingTx.billLinkId?D.bills.find(b=>b.id===existingTx.billLinkId):null;
   ```
   Tagihan yang sudah diarsipkan LUNAS (`D.billsArchive`) tidak pernah
   ketemu di sini — apa pun `kind`-nya, selalu tembus ke cabang paling
   generik di bawah.

2. `editTx()` cuma memanggil `setPayMethod(linkedBill.kind,false)` untuk
   `kind==='cicilan'` atau `kind==='langganan'` (lihat komentar BUGFIX di
   `editTx()`) — transaksi bertaut ke bill `kind:'tagihan'` selalu tampil
   dengan chip Cara Bayar `'tunai'`. Akibatnya `curPayMethod` tidak pernah
   sama dengan `existingBill.kind` (`'tagihan'`) di percabangan
   `if(existingBill && curPayMethod===existingBill.kind)`, jadi cabang itu
   juga tidak pernah kena — bahkan untuk tagihan yang MASIH aktif di
   `D.bills`.

Hasil akhirnya: transaksi pembayaran tagihan (aktif maupun diarsip) SELALU
jatuh ke cabang paling generik, yang punya baris:
```js
delete existingTx.billLinkId;
```
tanpa pengecualian — persis pola bug yang sudah diperbaiki untuk `kind:
'utang'` di fix v961 (s301), tapi belum ditutup untuk `kind:'tagihan'`.

## Perubahan

`modules/finance/transaksi.js`, `_saveTxInner()`: cabang baru sebelum
percabangan cicilan/langganan yang mendeteksi kalau
`existingTx.billLinkId` menunjuk ke bill `kind:'tagihan'` — dicari di
`D.bills` **atau** `D.billsArchive` (`linkedTagihanBill`). Kalau ketemu:

- `billLinkId` **dipertahankan** (tidak dihapus).
- Kalau ini pembayaran **TERBARU** untuk bill tsb (reuse
  `isLatestBillPaymentTx()` dari `tagihan-kalender.js`, pola sama seperti
  `isLatestInstallment` di cabang cicilan/utang) DAN bill-nya sudah punya
  `completedAt` (artinya sudah diarsipkan lunas), `completedAt` arsip ikut
  disinkron ke tanggal baru.
- Kalau bukan pembayaran terbaru, hanya catatan transaksi ini yang
  diubah — arsip tidak disentuh (konsisten dengan toast
  "pembayaran cicilan/utang lama" di cabang-cabang lain).
- Toast konfirmasi eksplisit di kedua kasus.

Arah sebaliknya (edit tanggal bayar dari tab Tagihan → tanggal transaksi
& `completedAt` arsip) sudah otomatis sinkron sejak fix s288
(`saveBillHistoryEdit()` + `isLatestBillPaymentTx()`), tidak diubah oleh
fix ini.

## Test baru

`tests/s316-tagihan-tx-edit-billlink-sync.test.js` (4 test, pakai harness
`loadSource()` yang menjalankan `_saveTxInner()` asli dengan stub
DOM/global minimal):

1. Tagihan diarsip (`D.billsArchive`), pembayaran **terbaru** →
   `billLinkId` tetap, `completedAt` arsip ikut sinkron ke tanggal baru.
2. Tagihan diarsip, pembayaran **lama** (bukan terbaru) → `billLinkId`
   tetap, `completedAt` arsip **tidak** berubah.
3. Tagihan masih **aktif** (`D.bills`, belum diarsipkan) → `billLinkId`
   tetap, tidak ada `completedAt` untuk disinkron (bill belum lunas).
4. Regresi: transaksi bertaut ke bill `kind:'cicilan'` tetap lewat jalur
   existing (bukan cabang baru ini) — memastikan fix ini tidak menyentuh
   kind lain.

## Verifikasi

- `node --test tests/*.test.js` → **2030/2030 PASS** (2026 lama + 4 baru,
  0 regresi).
- `node --check modules/finance/transaksi.js` → OK.
- Build: `s316-tagihan-tx-edit-billlink-sync` → versi **977**, sintaks
  bundle valid, `index.html`/`app_production.html` identik.

## Belum terjawab / di luar scope

Fix ini spesifik untuk `kind:'tagihan'`. Kelas bug yang sama untuk
`kind:'cicilan'`/`'langganan'` yang sudah diarsipkan (`D.billsArchive`,
bukan cuma yang aktif di `D.bills`) belum diaudit — `existingBill` di
`_saveTxInner()` masih cuma mencari `D.bills` untuk kedua kind itu. Kalau
laporan serupa muncul untuk cicilan/langganan yang sudah lunas, perlu
audit lanjutan dengan pola yang sama (cari di `D.billsArchive` juga).
