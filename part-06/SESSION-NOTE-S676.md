# Sesi S676 — Tutup Gap #2 dari audit S675: `checkReturnVsAccountLiability()`

Lanjutan langsung dari SESSION-NOTE-S675.md ("S675-lanjutan" sudah menutup Gap #3 --
`repairTitipanOrphans()` buta terhadap cabang Akun). Sesi ini mengerjakan Gap #2 yang
sudah teridentifikasi tapi belum dikerjakan: `checkReturnVsLiability()` (S675) tidak
cakup titipan yang pokoknya murni di Akun berdiri-sendiri.

## Temuan

`checkReturnVsLiability()` (S675) 100% reuse `DanaTitipanPortfolioAPI.build()`, yang cuma
menghitung `allocatedPrincipal` dari `_assetSplits()`/`_holdingSplits()` (cabang
Aset+Investasi) — **tidak pernah** menyertakan porsi di akun berdiri-sendiri. Jadi kalau
pokok titipan seorang owner murni disimpan di 1 (atau lebih) akun berdiri-sendiri (bukan
aset/holding apa pun), `allocatedPrincipal`-nya selalu 0 di mata `build()` — check S675 itu
tidak akan pernah mendeteksi gap "return dicatat tapi porsi akun belum dikecilkan" untuk
owner semacam ini. Batasan ini sudah disebut eksplisit di komentar `checkReturnVsLiability()`
sendiri sejak S675, ditandai belum ada follow-up.

## Aksi

Tambah 2 hal baru di `titipan-reconcile.js`:

1. **`_actualLinkedAccountDebtTotalsByOwner()`** — varian `_actualLinkedAccountDebts()`
   (S675 Gap #1, boolean-only) yang menjumlah **nominal** (`d.nilai`) baris `D.debts`
   ber-`linkedAccountId` **per ownerId** (bukan per akun+owner — 1 owner bisa punya porsi
   di >1 akun sekaligus, jumlahnya yang relevan). PURE baca-saja, reuse field yang sudah
   ditulis `TitipanSync.reconcileAccounts()`, 0 rumus baru.
2. **`checkReturnVsAccountLiability()`** — sub-check **terpisah** (bukan menambal
   `checkReturnVsLiability()` yang sudah ada), pola struktur sama persis: bandingkan
   `returnedTotal`/`outstandingPrincipal` per owner (dari `build()`, field yang sama dgn
   S675) terhadap `accountLiability` (dari fungsi #1 di atas). Gap = `accountLiability -
   outstandingPrincipal` > Rp1 → flag. Owner tanpa liability Akun sama sekali (0 baris
   `linkedAccountId`) tidak diflag di sini (bukan gap channel ini).

Kenapa sub-check terpisah (bukan digabung jadi 1 angka `allocatedPrincipal +
accountLiability` sekali banding): owner yang pokoknya tersebar di KEDUA channel (Aset/
Investasi + Akun) sekaligus bisa membingungkan diagnosis kalau digabung jadi 1 angka — user
tidak tahu channel mana yang harus dibenahi duluan. 2 sub-check independen menunjuk channel
gap yang jelas, konsisten filosofi modul ini (checkAll() yang menggabungkan `ok`).

Diwire sbg sub-check ke-9 di `checkAll()`, SENGAJA informasional/non-blocking (pola sama
`returnVsLiability`/`poolCommitment`/`ownershipDualSource`) — `coreOk` di self-test.js (5
sub-check asli) tidak berubah, pesan Tes Otomatis ikut menyertakan
`returnVsAccountLiability.ok`/`flagged`. 0 tombol "Perbaiki Gap" ditambah — sama alasan
`returnVsLiability`: return adalah tindakan finansial nyata, butuh keputusan user.

File baru: `tests/s676-titipan-return-vs-account-liability.test.js` (13 test — guard modul
belum dimuat, ok=true tanpa return, ok=true owner tanpa liability Akun sama sekali, ok=true
liability sudah ikut dikecilkan, deteksi gap pokok murni Akun, jumlahkan liability lintas
>1 akun milik 1 owner, abaikan owner tanpa commitment, toleransi Rp1, guard try/catch, guard
D/D.debts belum ada, unit `_actualLinkedAccountDebtTotalsByOwner()` berdiri sendiri, 2 test
wiring `checkAll()`).

## Verifikasi

- Full suite: **5157 → 5170 pass** (13 test baru, 0 regresi).
- `node scripts/build.js` → sukses, versi `1493 → 1494`.
- `node scripts/verify-release-ready.js` → LOLOS (2 override lint/esbuild sama seperti
  sesi-sesi sebelumnya, network sandbox).

## Belum dikerjakan (di luar scope patch ini, sisa dari audit)

3 sub-check tanpa jalur perbaikan sama sekali (prioritas rendah, bukan false-promise —
tidak ada UI yang klaim bisa memperbaikinya, murni soal kelengkapan):
`checkOwnerIdConsistency()`, `checkDebtNameStaleness()`, `checkTransactionOwnerRefs()`.

## Akumulasi

ZIP ini melanjutkan seluruh patch sebelumnya (realokasi sisa kuota + checkPoolCommitment
S673 + hapus file duplikat S674 + Gap #1/#2 S675 awal + Gap #3 S675-lanjutan) — semua file
itu tetap dibawa apa adanya, 0 hilang. Ditambah 1 fix baru sesi ini (S676, Gap #2 di atas).

⚠️ **`modules/dashboard-hub/titipan-reconcile.js` tetap harus dihapus manual** saat apply
patch ini (lihat SESSION-NOTE-S674.md — ZIP overlay tidak bisa merepresentasikan
penghapusan file).

File yang berubah sesi ini: `modules/finance/titipan-reconcile.js` (2 fungsi baru),
`self-test.js` (pesan Tes Otomatis, sub-check ke-9), + turunan build
(`app_production.html`/`index.html`/`sw.js`/kedua bundle, version-stamp 1493 → 1494). File
baru: `tests/s676-titipan-return-vs-account-liability.test.js`.
