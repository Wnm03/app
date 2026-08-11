# FIX S519 — Dana Titipan ↔ Transaksi ↔ Talangan

## 1. Baseline

- Versi: v1250
- Sesi: S516 (`FIX-v1249-to-v1250-s516-titipan-commitment-ownerid-escape.md`)
- Baseline test sebelum S519: 3374/3374 PASS
- S518 = DESIGN LOCK (`DESIGN-S518-DANA-TITIPAN-TRANSAKSI-TALANGAN.md`), bukan sesi implementasi.
- S519 = implementasi mengikuti Design Lock S518, scope expansion Opsi A
  (`LANJUTKAN-S519-APPROVE-SCOPE-EXPANSION-OPSI-A.md`).

## 2. Scope

Production (4 file):

1. `modules/finance/dana-titipan-portfolio-presenter.js` — `build()` diperluas
   menghitung `usedTotal`/`talanganTotal`/`available` per owner (derived,
   on-read, 0 counter persisten baru).
2. `modules/finance/piutang-utang.js` — 3 fungsi baru:
   `maybeCreateTitipanTalanganPiutang(tx)`,
   `syncTitipanTalanganPiutangOnEdit(txId,oldAmount,newAmount)`,
   `removeUnpaidTitipanTalanganPiutangForTx(txId)`.
3. `modules/finance/transaksi.js` — 2 fungsi baru:
   `resolveTxTitipanOwner(ownerId)`, `applyTxTitipanLinkageOnSave(tx,prevTitipanLinkId)`;
   wiring ke jalur CREATE & EDIT generik (`_saveTxInner`).
4. `modules/finance/tx-list-cashflow.js` — `delTx()` diperluas: cascade
   cleanup piutang otomatis talangan (lihat §4).

Test (1 file baru):

5. `tests/s519-dana-titipan-transaksi-talangan-linkage.test.js` — 23 test,
   pola LAPIS 3 murni (0 DOM, `loadSource()` harness sama seperti
   `s485b`/`s485c`).

Tidak ada file lain yang diubah sesi ini. Lihat §8 untuk exact diff scope.

## 3. Implementasi

- **`usedTotal` (derived)** — `dana-titipan-portfolio-presenter.js` `build()`:
  jumlah `tx.amount` seluruh transaksi `type==='expense'` dengan
  `tx.titipanLinkId===ownerId`, dihitung ulang tiap `build()` dipanggil dari
  `D.transactions` — 0 field baru ditulis ke `D.titipanCommitments`.
- **`talanganTotal` (derived)** — subset `usedTotal`: hanya expense dengan
  `tx.titipanTalangan===true`. Murni angka informatif untuk UI, **tidak**
  dikurangkan lagi dari `available` (sudah termasuk dalam `usedTotal`).
- **`available` (derived)** — `max(0, principalAmount - usedTotal - returnedTotal)`,
  `null` kalau `principalAmount` belum diisi (state `PRINCIPAL_NOT_SET`,
  konsisten pola `outstandingPrincipal` existing).
- **`titipanLinkId`/`titipanTalangan`** — field opsional baru di objek
  transaksi (`D.transactions[]`), diset lewat `applyTxTitipanLinkageOnSave()`.
  Sesi ini **tidak** menambah field form di `modals.js`/`app_production.html`
  (di luar scope resmi S519) — fungsi-fungsi ini dites langsung lewat
  pemanggilan fungsi murni, bukan simulasi klik form.
- **`autoTitipanOwnerId`/`autoTxId`** — field pada entri `D.piutang[]` yang
  dibuat otomatis oleh `maybeCreateTitipanTalanganPiutang()`, dipakai sebagai
  kunci pencarian idempotency & cascade (edit/unlink/delete).
- **Idempotency `autoTxId`** — `maybeCreateTitipanTalanganPiutang(tx)` skip
  pembuatan kalau sudah ada entri `D.piutang` dengan `autoTxId===tx.id`
  (create ulang tidak menghasilkan duplikat).
- **Delta-sync nominal** — `syncTitipanTalanganPiutangOnEdit(txId,oldAmount,newAmount)`
  menyesuaikan `p.nilai` piutang yang **belum lunas** memakai delta
  (`nilai + oldAmount - newAmount`, clamp ke 0), bukan menimpa nilai baru
  langsung dan bukan membuat entri baru.
- **Owner relink** — `applyTxTitipanLinkageOnSave()`: kalau owner berubah
  (`prevTitipanLinkId !== titipanLinkId` final), piutang lama yang belum
  lunas dihapus dulu (`removeUnpaidTitipanTalanganPiutangForTx`), baru
  piutang baru dibuat untuk owner baru kalau `titipanTalangan===true`.
  Urutan ini wajib supaya guard idempotency `autoTxId` tidak memblokir
  relink.
- **Unlink** — `titipanLinkId` dihapus → `titipanTalangan` ikut direset
  `false`, piutang otomatis yang belum lunas ikut dihapus.
- **Delete cascade** — lihat §4.
- **Preservasi piutang lunas** — di seluruh jalur (edit-sync, unlink, delete),
  piutang otomatis dengan `lunas===true` **tidak pernah** disentuh (tidak
  ikut delta-sync, tidak dihapus) — tetap jadi catatan historis.

## 4. Delete-path scope correction

Audit S519 menemukan Design Lock S518 mengasumsikan DELETE cascade berada
di `transaksi.js`, tetapi implementasi `delTx()` yang sebenarnya ada di
`modules/finance/tx-list-cashflow.js` (pola cascade `*LinkId` lain —
`bbmLinkId`/`cobekLinkId`/`servisLinkId` dst — juga ada di file yang sama,
bukan di `transaksi.js`). Karena itu `tx-list-cashflow.js` dimasukkan ke
scope produksi S519 secara eksplisit: `delTx()` diperluas dengan 1 blok
cascade baru yang 100% reuse `removeUnpaidTitipanTalanganPiutangForTx()`
(0 arsitektur cascade baru ditulis) — piutang otomatis belum lunas dihapus,
piutang lunas dipertahankan, dan `usedTotal`/`available` otomatis turun
sendiri di `build()` berikutnya begitu transaksi hilang dari
`D.transactions` (0 counter manual yang perlu didekrementasi).

## 5. Test corrections

Dua kegagalan pada 23 test targeted S519, keduanya **bukan bug produksi**:

- **Test #17** (`MultiOwnerEngine.splitByPorsi() tidak diubah/dipakai ulang`)
  — `modules/shared/multi-owner-engine.js` memang sudah di-load sebagai
  source di `makeCtx()`, tapi `MultiOwnerEngine` tidak ada di daftar
  exposed-names `loadSource()` sehingga `ctx.MultiOwnerEngine` undefined.
  Diperbaiki **hanya** di test harness (tambah `'MultiOwnerEngine'` ke
  array exposed-names) — 0 baris `multi-owner-engine.js`/`splitByPorsi()`
  diubah.
- **Test #9** (`ganti owner -> piutang lama dihapus, piutang baru dibuat`)
  — data test menambahkan owner `cici` ke `D.investments[0].owners` dengan
  `porsi: 0`. `MultiOwnerEngine.validateOwner()` menolak `porsi <= 0`
  ("porsi harus lebih dari 0"), sehingga seluruh array `owners` holding
  itu jadi invalid dan `getOwners()` fallback ke sintesis SELF — akibatnya
  baik `budi` maupun `cici` hilang dari `listExistingOwners()`. Diperbaiki
  **hanya** di data test: `cici` ditambahkan lewat holding kedua yang valid
  (single-owner, porsi 100) alih-alih merusak array `owners` holding
  pertama. 0 baris production code diubah.

Production logic tidak diubah untuk kedua kasus ini karena keduanya adalah
kesalahan pada test itu sendiri, bukan pelanggaran invariant desain.

## 6. Invariants (hasil audit PHASE 6)

Semua invariant berikut sudah diverifikasi lewat audit diff statis (lihat
`RELEASE-GATE-LOG.md` entry S519 untuk timestamp) + 23 test targeted:

- **Principal immutable** — tidak ada path baru (create/edit/delete
  transaksi, talangan create/edit/delete, repayment piutang) yang menulis
  `D.titipanCommitments[].principalAmount`. Satu-satunya penulis tetap
  `saveCommitment()` existing (di luar scope diff S519).
- **Asset ownership isolation** — S519 tidak menulis `D.assets[].owners[]`,
  `a.nilai`, atau porsi investasi/aset manapun. `MultiOwnerEngine.splitByPorsi()`
  hanya direferensikan (fungsi lama `getMultiOwnerSplitPreview`), tidak
  diubah.
- **Available derived** — `usedTotal` = SUM expense `titipanLinkId===ownerId`;
  `talanganTotal` = subset `titipanTalangan===true` (bagian dari `usedTotal`,
  bukan pengurang tambahan); `returnedTotal` = SUM `titipanReturns` per
  owner (existing); `available = max(0, principal - usedTotal - returnedTotal)`.
- **No second counter** — tidak ada field persisten baru (`used`/`available`/
  counter talangan) ditulis ke `D.titipanCommitments[]`; semuanya derived
  on-read di `build()`.
- **Piutang idempotency** — `maybeCreateTitipanTalanganPiutang()` guard by
  `autoTxId===tx.id`; create ulang tidak menghasilkan duplikat (test #artikel
  idempotency + regresi delta-sync).
- **Owner linkage existing-only** — `resolveTxTitipanOwner()` hanya
  mengembalikan owner yang sudah dikenal `DanaTitipanPortfolioAPI.listExistingOwners()`;
  `ownerId` tak dikenal dibuang otomatis (0 identity hantu).
- **Edit nominal** — delta-sync (`oldAmount -> newAmount`), tidak pernah
  recreate piutang.
- **Paid piutang preserved** — tidak ikut delta-sync, tidak dihapus saat
  unlink/delete/relink; tetap historical record.
- **Edit owner** — unpaid piutang lama dihapus, piutang baru dibuat untuk
  owner baru (kalau `titipanTalangan===true`), piutang lama yang sudah
  lunas dipertahankan sebagai histori (tidak ikut dihapus saat owner
  berganti, karena filter hanya menyasar `!lunas`).
- **Unlink** — `titipanTalangan` direset `false`, unpaid auto-piutang
  dihapus, paid auto-piutang dipertahankan.
- **Delete** — `usedTotal` turun otomatis (derived), unpaid auto-piutang
  dihapus, paid auto-piutang dipertahankan, `principalAmount`/`D.assets`
  tidak tersentuh.
- **Repayment** — di luar scope diff S519; `markLunas()`/mekanisme repayment
  piutang existing tidak diubah sesi ini, jadi tidak menyentuh
  `principalAmount`/`usedTotal`/`available`/`outstandingPrincipal`/
  `titipanReturns`.
- **Backward compatibility** — transaksi lama tanpa `titipanLinkId`/
  `titipanTalangan` tetap valid di `build()`/`delTx()` (guard `!tx.titipanLinkId`
  di semua fungsi baru), dan tidak ikut agregasi Dana Titipan.

## 7. Test Evidence

Baseline:
3374/3374 PASS

S519 (targeted):
23/23 PASS

Full regression:
3397/3397 PASS

Regression:
0

## 8. Final Scope

Exact 5 file yang berubah sesi ini (`git diff --name-only` + untracked):

```
modules/finance/dana-titipan-portfolio-presenter.js
modules/finance/piutang-utang.js
modules/finance/transaksi.js
modules/finance/tx-list-cashflow.js
tests/s519-dana-titipan-transaksi-talangan-linkage.test.js
```

Terverifikasi tidak berubah: `modules/shared/multi-owner-engine.js`,
`modules/shared/ownership-engine.js`, file asset/investment lain,
`app-bundle-a.min.js`/`app-bundle-b.min.js`, `app_production.html`,
`package.json` (versi tetap `0.85.7` pada tahap dokumentasi ini).
