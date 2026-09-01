# Sesi S675 — Audit lanjutan "Total Titipan vs Utang/Aset/Akun": tutup 2 gap

Lanjutan audit sesi sebelumnya (checkPoolCommitment S673 + cleanup file duplikat S674).
2 temuan baru, keduanya dikerjakan jadi patch di sesi ini.

## Gap #1 — Cabang Akun (mekanisme KEBALIKAN Aset/Investasi) tidak pernah ikut
test skenario gabungan

**Temuan:** `tests/s461-cross-source-titipan-total-regression.test.js` (Sesi 461, regression
guard BUG-016) sudah cakup 3 sumber titipan sekaligus (Aset multi-owner + Investasi
fundSource + THIRD_PARTY whole-entity) dalam 1 dataset — tapi selalu dengan `accounts: []`
kosong. Cabang ke-4 (Akun berdiri-sendiri, `TitipanSync.reconcileAccounts()`) pakai
mekanisme yang justru **kebalikan** dari 3 cabang lain:
- Aset/Investasi: nilai porsi titipan **dikecualikan di sumbernya**
  (`Aset.totalValue()`/`Investment.portfolioSummary()`), lalu **entry Buku Utangnya JUGA
  dikecualikan** dari `Debt.totalValue()` (`.filter(d=>!d.linkedAssetId&&!d.linkedInvestmentId)`,
  piutang-utang.js) — supaya tidak kepotong dua kali.
- Akun berdiri-sendiri: `totalSaldoAkun()` **tidak** mengurangi porsi titipan di sumbernya
  (saldo penuh selalu masuk, lihat komentar Sesi 422c di akun.js), sebagai gantinya entry
  `linkedAccountId` di Buku Utang **sengaja tidak ikut dikecualikan** dari `Debt.totalValue()` —
  supaya porsi non-SELF tetap terpotong SATU KALI, tapi dari sisi Utang bukan dari sisi Aset.

Kedua mekanisme sama-sama menghasilkan angka yang benar hari ini, tapi lewat jalur
berlawanan — dan skenario gabungan yang jadi regression guard utama (S461) tidak pernah
menyentuh cabang ke-4 ini. Kalau nanti `totalSaldoAkun()` diubah ikut porsi-scale (mirror
Aset) tapi lupa ikut mengubah filter `Debt.totalValue()` (menambah `&&!d.linkedAccountId`),
Kekayaan Bersih akan double-subtract — dan sebelum sesi ini, 0 test yang akan menangkapnya.

**Aksi:** tambah `makeCtxWithAccounts()` (varian `makeCtx()` + `modules/finance/akun.js` +
`modules/finance/titipan-sync.js`) dan 1 test baru di
`tests/s461-cross-source-titipan-total-regression.test.js` — akun berdiri-sendiri berporsi
titipan (Adi 30%) ikut disinkron (`TitipanSync.reconcileAccounts()`) di skenario yang sama,
assert eksplisit ketiga hal: `totalSaldoAkun()` TIDAK dikecualikan di sumber, `Debt.totalValue()`
TIDAK mengecualikan entry `linkedAccountId`, dan kontribusi bersih gabungan keduanya tetap
= porsi SELF saja (700rb dari saldo 1jt, bukan 1jt atau 400rb). 0 file produksi diubah — ini
murni memperluas cakupan test regresi yang sudah ada.

## Gap #2 — `recordReturn()` tidak pernah mengecek liability terkait ikut turun

**Temuan:** `recordReturn()` (dana-titipan-commitment-return-api.js) SENGAJA "ISOLASI TOTAL —
HANYA menyentuh `D.titipanReturns`" (lihat komentar header fungsi itu sendiri). Saat user
mencatat "Budi ambil kembali Rp5jt": outstanding di tab Dana Titipan berkurang (tampilan
saja), tapi TIDAK ADA transaksi kas keluar, TIDAK ADA pengurangan porsi Budi di
aset/holding/akun terkait, dan TIDAK ADA peringatan apa pun. Kalau user lupa mengecilkan
porsi Budi secara manual setelahnya, Buku Utang & Kekayaan Bersih tetap menganggap
kewajiban itu utuh — 2 fakta yang saling kontradiksi (tab Dana Titipan bilang "sudah
dikembalikan", Buku Utang bilang "masih penuh") tanpa terdeteksi otomatis di mana pun.

**Aksi:** tambah `TitipanReconcile.checkReturnVsLiability()` (pola SAMA PERSIS
`checkPoolCommitment()`, S673) — 100% reuse `DanaTitipanPortfolioAPI.build()` (field
`returnedTotal`/`allocatedPrincipal`/`outstandingPrincipal` yang sudah dihitung `build()`
sendiri, 0 rumus baru). Flag owner yang `returnedTotal>0` TAPI `allocatedPrincipal` (porsi
real di Aset/Investasi, = nilai baris Buku Utang) masih lebih besar dari
`outstandingPrincipal` yang seharusnya tersisa. Diwire sbg sub-check ke-8 di `checkAll()`,
SENGAJA informasional/non-blocking (pola sama `poolCommitment`/`ownershipDualSource`) —
`coreOk` di self-test.js (5 sub-check asli) tidak berubah, pesan Tes Otomatis ikut
menyertakan `returnVsLiability.ok`/`flagged` biar tetap kelihatan kalau ini sendirian yang
gagal. 0 tombol "Perbaiki Gap" ditambah — return itu tindakan finansial nyata, butuh
keputusan user (mau dikecilkan di aset/holding mana), bukan auto-repair.

File baru: `tests/s675-titipan-return-vs-liability.test.js` (10 test — guard modul belum
dimuat, ok=true kasus sah, deteksi gap partial/full return, abaikan owner tanpa commitment,
toleransi Rp1, guard try/catch, wiring `checkAll()`).

## Verifikasi
- Full suite: **5140 → 5151 pass** (11 test baru: 1 di s461 + 10 di s675, 0 regresi).
- `node scripts/build.js` → sukses, versi `1491 → 1492`.
- `node scripts/verify-release-ready.js` → LOLOS (2 override lint/esbuild sama seperti sesi
  S674 sebelumnya, network sandbox).

## S675-lanjutan — Gap #3: `repairTitipanOrphans()` buta terhadap cabang Akun

**Temuan (dari audit lanjutan terhadap kode yang barusan disentuh Gap #1/#2 di atas):**
Tombol "🔧 Perbaiki Gap Dana Titipan" (`repairTitipanOrphans()`, self-test.js) HANYA
memanggil `TitipanReconcile.check()` (cabang Aset+Investasi) untuk pre-check, pesan
konfirmasi, DAN pemicu repair — 0 sentuhan ke `checkAccounts()` (cabang Akun) sama sekali,
dan 0 panggilan ke `TitipanSync.reconcileAccounts()` di mana pun dalam fungsi itu.

Akibatnya, kalau `checkAccounts()` melapor gap (mis. restore backup lama dari sebelum
fitur sync Akun ada, atau skenario apa pun sebelum `save()` sempat jalan sekali) sementara
cabang Aset/Investasi bersih, cabang paling atas `if(pre.ok)` langsung toast "tidak ada gap"
& RETURN — FALSE ALL-CLEAR, padahal Tes Otomatis sedang melapor `accountSync.ok=false`.
Ini kelas bug persis sama dengan yang dibenerin S621 ("tombol jalan tapi missing tetap
ada"), cuma kambuh di cabang Akun yang ditambah belakangan setelah fix S621 itu.

**Aksi:** `repairTitipanOrphans()` sekarang juga membaca `TitipanReconcile.checkAccounts()`
di pre-check & pesan konfirmasi (digabung ke SATU dialog yang sama, 0 dialog tambahan).
Kalau ada gap di cabang Akun, `TitipanSync.reconcileAccounts()` (sudah idempotent, sudah
dipakai di `save()`) ikut dipanggil di alur yang sama, lalu `save()` dipanggil kalau ada
perubahan apa pun (aset/investasi ATAU akun). Guard ganda `typeof
TitipanReconcile.checkAccounts`/`typeof TitipanSync.reconcileAccounts` — kalau salah satu
belum dimuat, cabang Akun dilewati diam-diam (0 regresi ke behavior lama).

File baru: `tests/s675-repair-titipan-orphans-akun-branch.test.js` (6 test — fungsi
diekstrak langsung dari source asli via vm, pola sama `extractFunctionAutoStub()` tapi
dengan varian lokal `extractAsyncFunctionAutoStub()` karena `repairTitipanOrphans()`
dideklarasikan `async function`; cakup: gap murni Akun tidak lagi false-report, gap Akun
memicu `reconcileAccounts()` dalam 1 konfirmasi yang sama, gap Aset+Investasi+Akun sekaligus
diperbaiki bersamaan, kedua cabang ok tetap toast "tidak ada gap" 0 mutasi, guard aman kalau
`checkAccounts`/`reconcileAccounts` belum dimuat).

**Verifikasi:**
- Full suite: 5151 → 5157 pass (6 test baru, 0 regresi).
- `node scripts/build.js` → sukses, versi 1492 → 1493.
- `node scripts/verify-release-ready.js` → LOLOS (2 override lint/esbuild sama seperti
  sesi-sesi sebelumnya, network sandbox).

**Belum dikerjakan (di luar scope patch ini, prioritas selanjutnya per rekomendasi audit):**
Gap #2 dari audit ("`checkReturnVsLiability()` tidak cakup titipan yang pokoknya murni di
Akun berdiri-sendiri") dan gap ringan ("3 sub-check tanpa jalur perbaikan":
`checkOwnerIdConsistency()`, `checkDebtNameStaleness()`, `checkTransactionOwnerRefs()`).

## Akumulasi
ZIP ini melanjutkan 3 patch sebelumnya (realokasi sisa kuota + checkPoolCommitment S673 +
hapus file duplikat S674) + Gap #1/#2 di sesi S675 awal (tepat di atas) — semua file itu
tetap dibawa apa adanya, 0 hilang. Ditambah 1 fix baru sesi ini (S675-lanjutan, Gap #3 di
atas).
⚠️ **`modules/dashboard-hub/titipan-reconcile.js` tetap harus dihapus manual** saat apply
patch ini (lihat SESSION-NOTE-S674.md — ZIP overlay tidak bisa merepresentasikan
penghapusan file).

Total sekarang: 1 file dihapus (dashboard-hub duplikat), sisanya file dari sesi-sesi
sebelumnya + 3 file diubah (`titipan-reconcile.js`, `self-test.js`, + turunan build:
`app_production.html`/`index.html`/`sw.js`/kedua bundle) + 3 file baru
(`tests/s675-titipan-return-vs-liability.test.js`, 1 test baru di file s461 yang sudah ada,
`tests/s675-repair-titipan-orphans-akun-branch.test.js`) + turunan build (version-stamp
1492 → 1493).
