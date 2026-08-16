# FINAL PATCH — Bug A–E (s634 Final Integration)

Sesi: **s634** — Final Integration Audit
Tanggal integrasi: 2026-08-16

Overlay ke root repository `app-main` (clean, tanpa patch lain sebelumnya).
Ini adalah gabungan final dari 5 sesi fix independen (s625, s626, s629,
s631, s633), sudah diverifikasi dapat diterapkan bersamaan tanpa
konflik/regresi/saling membatalkan.

---

## Bug A — delTx() tidak revert bill/debt/piutang (s625)
**Root cause:** `delTx()` tidak pernah memanggil `revertBillFromDeletedTx()`
saat menghapus transaksi pembayaran Tagihan/Cicilan/Langganan/Utang lewat
tombol 🗑 di List Transaksi biasa — beda dari jalur `deleteBillHistoryTx()`
yang sudah benar sejak sesi 291. Akibatnya `sisaTenor`/`nextDue`/status
arsip/saldo utang/auto-piutang jadi basi.
**File:** `modules/finance/tx-list-cashflow.js`

## Bug B — CREATE transaksi tidak atomic (s629)
**Root cause:** Kalau salah satu side-effect CREATE (link stok/servis/BBM/
shop/Renov/dll) throw exception di tengah proses, transaksi yang sudah
ter-push ke `D.transactions` beserta side-effect SEBELUM error tetap
tersimpan sebagai partial state — tidak ada rollback.
**Fix:** Snapshot seluruh `D` (`JSON.stringify`) tepat sebelum mutasi CREATE
pertama; kalau exception tertangkap di jalur CREATE generik, `D` di-restore
in-place dari snapshot (identitas objek `D` dipertahankan).
**File:** `modules/finance/transaksi.js`

## Bug C — revertStockPurchase() tidak recalculate avgPrice (s626)
**Root cause:** Saat transaksi pembelian sparepart di-EDIT atau DIHAPUS,
`revertStockPurchase()` cuma mengurangi `qty` — `avgPrice`/`priceHistory`/
`txRefs` tidak dihitung ulang/dibersihkan dengan benar, menyebabkan drift
harga rata-rata & entry orphan.
**File:** `modules/finance/tx-stok-sparepart.js`, `modules/finance/
tx-list-cashflow.js`, `modules/finance/transaksi.js`

## Bug D — transfer legacy tanpa transferPairId jadi orphan (s631)
**Root cause:** Transfer LAMA (dibuat sebelum fitur `transferPairId`) tidak
bisa dipasangkan otomatis dengan aman saat salah satu sisi dihapus —
heuristic amount+date+accountId berisiko salah pasang.
**Fix:** User diberi peringatan eksplisit sebelum lanjut hapus sisi transfer
legacy (0 heuristic auto-pairing baru, non-destruktif kalau dibatalkan).
**File:** `modules/shared/modules-calc.js`, `modules/finance/
tx-list-cashflow.js`

## Bug E — Renov.deleteItem() bypass cascade delTx() (s633)
**Root cause:** `Renov.deleteItem()` menghapus transaksi terkait item
Renovasi langsung lewat filter array, BYPASS seluruh cascade `delTx()` untuk
transaksi yang juga punya `partStockId`/`servisLinkId`/`bbmLinkId` — stok
sparepart/log servis/log BBM jadi orphan.
**Fix:** Cascade `*LinkId` diekstrak jadi `runTxDeleteCascades(t, opts)` di
`tx-list-cashflow.js` (SSOT), dipakai `delTx()` dan `Renov.deleteItem()`
(dengan `skipRenovCascade:true` supaya tidak memanggil `onLinkedTxDeleted`
balik ke diri sendiri).
**File:** `modules/finance/tx-list-cashflow.js`, `modules/home/renovasi.js`

---

## File production yang berubah (5 file, sesuai overlap yang diharapkan)

| File | Bug | MD5 |
|---|---|---|
| `modules/finance/tx-list-cashflow.js` | A, C, D, E | `c97c38a68407331e30777ff28ddcc3ad` |
| `modules/finance/transaksi.js` | B, C | `9ff80a98e50d02d7e2172813dcb5561d` |
| `modules/finance/tx-stok-sparepart.js` | C | `18d64fa354afe114bf3e473b8e7065b3` |
| `modules/shared/modules-calc.js` | D | `bbd67344863886b577dbe5f9a504750e` |
| `modules/home/renovasi.js` | E | `a79291aba78133074b3715f681d762be` |

File yang muncul di lebih dari 1 bug (`tx-list-cashflow.js` di A/C/D/E,
`transaksi.js` di B/C) adalah **EXPECTED**, bukan drift — cascade DELETE
(A/D/E) dan sinkron stok (C) memang berada di file yang sama.

---

## Cross-bug interaction audit (s634 TAHAP 3)

- **A+B:** `_saveTxInner()` rollback (Bug B, `transaksi.js`) dan
  `revertBillFromDeletedTx()` (Bug A, `tx-list-cashflow.js`) berada di jalur
  kode yang sepenuhnya terpisah (CREATE vs DELETE) — 0 interaksi, 0
  konflik.
- **A+D:** Cascade bill revert (`t.billLinkId`) di `delTx()` dijalankan
  TANPA syarat terhadap cabang transfer (Bug D) — urutan: cek transfer
  pair/legacy dulu (bisa `return` kalau user batal), baru cascade & bill
  revert. Tidak ada short-circuit yang melewati bill revert untuk transaksi
  non-transfer.
- **C+E:** `Renov.deleteItem()` memanggil `runTxDeleteCascades(linkedTx,
  {skipRenovCascade:true})` — SSOT sama persis dgn `delTx()`.
  `revertStockPurchase()` menerima `t.id` (txId) dengan benar lewat cascade
  yang sama. Diverifikasi TIDAK ada double-revert lewat test s633-8
  (qty tepat kembali ke baseline, bukan negatif).
- **D+E:** Ekstraksi `runTxDeleteCascades()` (s633) TIDAK menyentuh blok
  transfer pairing/legacy warning (baris tersebut ada SEBELUM pemanggilan
  `runTxDeleteCascades()` di `delTx()`, sama sekali terpisah).
- **B+C:** Snapshot rollback Bug B mencakup SELURUH `D` (termasuk
  `D.partsStock`, `priceHistory`, `txRefs`) — dipulihkan in-place lewat
  `Object.assign(D,_restored)` setelah `delete` seluruh key lama, jadi
  mutasi stok dari side-effect CREATE yang gagal ikut ter-rollback penuh.
  Test 6 s628 mengasersi jalur sukses tidak berubah 0 regresi.
- **B+E:** Rollback CREATE (snapshot `D` penuh) juga mencakup
  `D.renovProjects` — kalau CREATE transaksi + link Renov gagal di tengah,
  item Renov yang sudah terlanjur dibuat ikut ter-rollback bersama seluruh
  `D`, tidak ada orphan.

**Tidak ditemukan masalah nyata pada audit ini** — sesuai aturan sesi,
tidak ada fix baru yang dibuat.

---

## Regression test matrix coverage (TAHAP 4)

Semua item pada matrix (Bug A: bill/debt/cicilan/langganan/arsip/piutang;
Bug B: exception first/middle/last/retry/sukses; Bug C: delete/edit qty/edit
harga/middle history/latest history/preservasi stok awal/txRefs cleanup;
Bug D: transferPairId/legacy warning/cancel/confirm/no-heuristic; Bug E:
tx biasa/sparepart/servis/BBM/kombinasi/tidak sentuh tx lain/no double
cascade/callback sekali) **sudah tercakup** di 5 file regression test yang
disertakan (`s625`, `s626`, `s628`(*), `s630`(*), `s633`).

(*) `s628-bugB-atomicity-create-regression.test.js` & `s630-transfer-legacy-
orphan-regression.test.js` di sini adalah versi FINAL yang dibundel sebagai
bagian resmi patch s629 & s631 (bukan hasil overlay ulang dari zip
audit-only s628/s630 yang terpisah) — namanya kebetulan sama dengan file
audit awal krn regression test final memang lanjutan langsung dari audit
tsb.

---

## Full suite

- **Run #1:** `4464/4464 PASS, 0 fail`
- **Run #2** (fresh independent overlay dari 5 patch yang sama, dari nol):
  `4464/4464 PASS, 0 fail`
- Hasil kedua run **identik** (jumlah test & hasil sama persis).
- Baseline murni `app-main` tanpa patch apa pun: tidak dihitung ulang sesi
  ini (sudah 0 test krn `tests/` kosong di `app-main` mentah — seluruh 4464
  test berasal dari akumulasi seluruh sesi development, bukan hanya 5 patch
  ini).

---

## build.js
**TIDAK DIJALANKAN** sesi ini (sesuai instruksi keras — mencegah side
effect version-bump pada file unrelated di luar scope 5 bug).

## Lint
**Skipped** — `eslint` devDependency tidak tersedia di sandbox (network
egress dimatikan, tidak ada perubahan `package.json`/dependency untuk
mengakomodasi lint sesi ini).

---

## Instruksi overlay ke root repository

1. Extract `PATCH-FINAL-bugs-A-E.zip` ke folder sementara.
2. Copy (overlay) isi folder `modules/` dan `tests/` ke root repository
   GitHub `app-main` (timpa file dengan nama sama, path relatif root repo
   — TIDAK ada file lain yang perlu ditambah/dihapus).
3. Jangan jalankan `npm run build` sebagai bagian dari overlay ini kecuali
   memang diperlukan proses release terpisah — sesi ini sengaja tidak
   menyertakan hasil build/bundle.
4. Jalankan `node --test tests/*.test.js` untuk verifikasi lokal: harus
   `4464/4464 PASS, 0 fail`.

---

## Isi ZIP

```
FINAL-PATCH-README.md
modules/finance/tx-list-cashflow.js
modules/finance/transaksi.js
modules/finance/tx-stok-sparepart.js
modules/shared/modules-calc.js
modules/home/renovasi.js
tests/s625-deltx-revert-bill-regression.test.js
tests/s626-stock-avgprice-revert-regression.test.js
tests/s628-bugB-atomicity-create-regression.test.js
tests/s630-transfer-legacy-orphan-regression.test.js
tests/s633-renovasi-delete-cascade-regression.test.js
```
