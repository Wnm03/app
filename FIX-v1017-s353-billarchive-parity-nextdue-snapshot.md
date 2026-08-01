# FIX v1017 s353 — Bill Archive Parity, nextDue Snapshot, delBillArchive billLinkId

Sesi lanjutan setelah chat sebelumnya kena limit. 16 test gagal ditemukan &
diperbaiki (12 source bug nyata + 4 test yang ketinggalan update sinkron
dgn source), plus 1 regresi baru yang ketahuan pas full-suite rerun.

## Bug nyata yang diperbaiki (source)

1. **`renderBillArchive()` HTML tombol drift** (`modules/shared/modules-render.js`)
   Tombol Riwayat/Edit/Hapus arsip diextract jadi helper baru
   `billArchiveActionButtonsHtml(id)`, dipakai `renderBillArchive()` —
   mencegah kelas bug "tombol Edit hilang di arsip" (s325) terulang lewat
   drift 2 tempat terpisah. Pagar structural + functional test:
   `tests/bill-archive-actionbtn-parity.test.js` (6 test).

2. **`revertBillFromDeletedTx()` nextDue salah kalau nunggak >1 periode**
   (`modules/finance/tagihan-kalender.js`) — REAL BUG. `markBillPaid()`
   sekarang menulis `billPrevNextDue:b.nextDue` ke transaksi pembayaran
   SEBELUM `advanceBillNextDue()` memajukan nextDue (yang bisa maju lebih
   dari 1 periode sekali jalan kalau bill sempat nunggak lama). Saat
   transaksi itu dihapus lagi, `revertBillFromDeletedTx()` sekarang
   mengembalikan nextDue PERSIS dari snapshot ini (cicilan/utang/langganan/
   tagihan), bukan cuma mundur -1 periode dari nextDue SAAT INI (yang bisa
   salah/masih nyangkut di masa lalu). Transaksi lama tanpa snapshot
   (pra-s353) tetap fallback ke logic -1 periode lama, tidak breaking.

3. **`delBillArchive()` tidak melepas `billLinkId`** (`tagihan-kalender.js`)
   — REAL BUG. Transaksi historis yang billLinkId-nya menunjuk ke arsip
   yang baru dihapus sekarang di-`delete t.billLinkId` (transaksinya
   sendiri TETAP ada, cuma link ke arsip yang sudah tidak ada dilepas
   supaya tidak jadi dangling reference).

4. **s325 cicilan dead-end** (`tagihan-kalender.js`, `openBillModal()`) —
   cicilan yang SUDAH pernah dibayar tapi linkedTxIds kosong (data lama/
   transaksi manual tanpa billLinkId) dulu dead-end di toast error + return.
   Sekarang dibiarkan jatuh ke modal generik (sama seperti tagihan/langganan
   yang belum pernah dibayar), supaya user tetap bisa edit field dasar.

## Test yang diperbaiki (source sudah benar, test ketinggalan sinkron)

- `s292-markbillpaid-doublepay-guard.test.js` — sandbox belum extract
  `advanceBillNextDue` (dependency baru `markBillPaid()`).
- `s271-bill-list-cicilan-fixes.test.js` — expected count pola
  `totalAmount:cicilanShared?perBulan:null` dikoreksi dari 2→3 (source
  sekarang punya 3 cabang legit: edit existingBill, bill baru tenor==1,
  bill baru tenor>1 — bukan regresi).
- `s313-billhistoryedit-list-refresh.test.js` — sandbox belum extract
  `applyBillPaymentTxSync` (dependency baru `saveBillHistoryEdit()` sejak
  s318).
- `s327-tagihan-sync-integrity.test.js` — sandbox `delBillArchive()`
  kurang stub `renderBillList`/`renderSettings`/`renderBillHistory`/
  `checkBills` (dependency `refreshBillEverywhere()`).

## Regresi baru yang ketahuan pas full-suite rerun

- Fix #4 di atas (s325 dead-end) membuat 1 test lain di
  `s271-bill-list-cicilan-fixes.test.js` gagal — test itu justru menguji
  behavior LAMA (dead-end toast) yang sengaja dihapus. Diupdate supaya
  menguji behavior BARU (fallback ke modal generik, tidak toast, tidak
  editTx) + tambah stub `getCatsByType`/`getCatByType`/`openModal` yang
  jadi kepakai begitu flow lanjut ke modal generik.

## Hasil

`npm test` → **2159/2159 pass**, 0 fail (dari 2143 pass / 16 fail di awal
sesi). `node scripts/build.js s353-billarchive-parity-nextdue-snapshot-fix`
→ sukses, versi naik ke **#1017** (dari #1016), kedua bundle lolos
`node --check`, `index.html`/`app_production.html` tetap identik.
`npm run lint`/esbuild minify tidak bisa dijalankan (sandbox tanpa akses
internet) — sama seperti sesi-sesi sebelumnya.

## File yang berubah

- `modules/finance/tagihan-kalender.js` (3 fix source)
- `modules/shared/modules-render.js` (1 fix source)
- `tests/s292-markbillpaid-doublepay-guard.test.js`
- `tests/s271-bill-list-cicilan-fixes.test.js`
- `tests/s313-billhistoryedit-list-refresh.test.js`
- `tests/s327-tagihan-sync-integrity.test.js`
- Hasil build: `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `index.html`, `app_production.html`, `docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md`, 5 file konstanta versi.
