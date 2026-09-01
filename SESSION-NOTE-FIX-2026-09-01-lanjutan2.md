# SESI FIX-2026-09-01-lanjutan2 — Jalur perbaikan 3 sub-check TitipanReconcile

## Latar
3 sub-check `TitipanReconcile` (`modules/finance/titipan-reconcile.js`) selama
ini PURE audit-only (mendeteksi gap, tapi tidak ada yang memperbaikinya):
- `checkOwnerIdConsistency()` (S583 sesi-4)
- `checkDebtNameStaleness()` (S583 sesi-5)
- `checkTransactionOwnerRefs()` (S635)

Sesi ini menutup ketiganya dengan fungsi `repair*()` pendamping, pola SAMA
PERSIS `repairOrphans()` (S595) / `repairMissing()` (S621) yang sudah ada di
modul yang sama: SATU-SATUNYA yang menulis ke `D`, dipanggil EKSPLISIT (tidak
dari `checkAll()`/`warnIfNotOk()`), idempotent.

## Perubahan
- `repairOwnerIdConsistency()` — satukan `ownerId` divergen per grup nama ke
  1 id kanonik (utamakan yang sudah terdaftar di `D.ownerRegistry`), propagasi
  ke `owners[]` Aset/Investasi + `D.debts[].linkedOwnerId`/`.name`. Guard
  tabrakan pola sama `OwnerRegistry.merge()` — grup yang 1 entity-nya sudah
  punya >1 id sekaligus DI-SKIP UTUH, masuk `conflicts` (butuh review manual).
- `repairDebtNameStaleness()` — salin `registryName` ke `D.debts[].name` utk
  tiap entri stale (murni copy, 0 rumus baru).
- `repairTransactionOwnerRefs()` — `deductionOwnerId` basi dipindah ke owner
  valid kalau PERSIS 1 (`resolveOwnerDefaultForAccount`), kalau ambigu
  (0/>1) dikosongkan (`null`) + dicatat di `unresolved` (bukan dibiarkan
  nunjuk owner yang salah secara diam-diam).

## Test
+21 test baru di `tests/titipan-reconcile.test.js` (happy path, guard
konflik/ambiguitas, no-op kalau tidak ada gap, aman kalau `D`/dependency
belum dimuat). Full suite: 5181/5181 lolos, 0 regresi.

## Build (bagian 1)
`node scripts/build.js` dijalankan ulang — versi naik ke **v1495**
(`s645-asset-owners-bagi-rata-d2-hardening-part1` tetap, versi build
terpisah dari label sesi). Bundle valid (`node --check` lolos), FILE-MAP.md
& COVERAGE-PER-MODULE.md ikut diregenerasi.

---

## Update (lanjutan sama sesi): wiring ke tombol UI

Bagian di atas ("Belum dikerjakan") sudah ditutup: `repairTitipanOrphans()`
(`self-test.js`, tombol `data-action="repairTitipanOrphans"` /
"🔧 Perbaiki Gap Dana Titipan" di `app_production.html`/`index.html`) sekarang
ikut membaca & memperbaiki 3 sub-check baru — pola SAMA PERSIS penambahan
cabang Akun (S675-lanjutan): tetap **1 tombol, 1 dialog konfirmasi**, sekarang
total 6 cabang (missing, orphan, Akun, ownerIdConsistency, debtNameStaleness,
transactionOwnerRefs).

- Pre-check & pesan konfirmasi ikut baca `checkOwnerIdConsistency()`/
  `checkDebtNameStaleness()`/`checkTransactionOwnerRefs()`.
- Repair 3 cabang baru dipanggil DI DALAM `askConfirm()` yang sama (guard
  `typeof` per cabang, pola sama seluruh cabang lain — build lama yang belum
  upload `titipan-reconcile.js` terbaru tetap aman, cabang dilewati diam-diam).
- `conflicts` (dari `repairOwnerIdConsistency()`) & `unresolved` (dari
  `repairTransactionOwnerRefs()`) dicatat ke `console.warn`, TIDAK menghentikan
  alur/toast sukses — keduanya kasus yang memang butuh review manual.
- Hint teks di bawah tombol (`app_production.html`/`index.html`) diperbarui
  supaya menyebut cakupan baru.

Test baru: `tests/s686-repair-titipan-orphans-ownerid-debtname-txowner-branches.test.js`
(10 test — tiap cabang baru sendiri-sendiri, gabungan 5 gap sekaligus dalam 1
konfirmasi, no-op kalau semua ok, guard aman kalau fungsi baru belum dimuat).
Test lama `tests/s675-repair-titipan-orphans-akun-branch.test.js` tetap lolos
tanpa perubahan (regresi 0).

## Build (bagian 2)
`node scripts/build.js` dijalankan ulang lagi setelah wiring — versi naik ke
**v1496**. Full suite: **5191/5191 lolos**. `verify-window-expose` OK.
`index.html`/`app_production.html` sinkron.

---

## Update (lanjutan sesi berikutnya): daftar "transaksi perlu direview" (poin 4)

Catatan review sesi ini mengidentifikasi 4 hal belum genting, dikerjakan
poin 4 dulu: `repairTransactionOwnerRefs()` mengosongkan `deductionOwnerId`
transaksi ambigu, tapi txId yang kena cuma numpuk sesaat di `unresolved`
lalu hilang — tidak ada jalur user awam menemukan transaksi mana saja yang
perlu diisi ulang pemiliknya selain scroll Buku Transaksi satu-satu.

### Perubahan
- `repairTransactionOwnerRefs()` (`titipan-reconcile.js`) — tiap transaksi
  yang di-cleared sekarang JUGA ditandai `_deductionOwnerReviewNeeded=true`,
  flag persisten (tersimpan di data), bukan cuma nilai balik sesaat.
- `checkPendingOwnerReview()` (baru) — jalur BACA daftar itu, PURE. Transaksi
  yang sudah diisi ulang manual lewat form (deductionOwnerId terisi lagi)
  otomatis tidak lagi muncul, walau flag lama masih menempel (field mati) —
  tidak perlu jalur "tandai selesai" terpisah.
- `checkAll()` — tambah sub-check ke-10 `pendingOwnerReview`, pola sama
  `ownershipDualSource`/`poolCommitment`/`returnVsLiability` (informasional,
  masuk `checkAll().ok` untuk `warnIfNotOk()`, TAPI dikecualikan dari
  `coreOk` di `self-test.js` biar tidak menggagalkan Tes Otomatis).
- `repairTitipanOrphans()` (tombol "🔧 Perbaiki Gap Dana Titipan") —
  sekarang ikut men-toast backlog `checkPendingOwnerReview()` ke user
  (bukan cuma `console.warn` yang tidak kebuka di HP), di KEDUA jalur:
  saat ada gap baru yang diperbaiki, MAUPUN saat ke-5 sub-check lama sudah
  bersih tapi masih ada backlog lama dari run sebelumnya.

### Test
+13 test baru (`tests/titipan-reconcile.test.js`: flag ditulis/tidak
ditulis, daftar pending, self-healing pasca isi manual, guard aman;
`tests/s686-repair-titipan-orphans-ownerid-debtname-txowner-branches.test.js`:
toast backlog muncul/tidak muncul, backlog lama tetap ditoast di jalur
"tidak ada gap baru", guard aman kalau fungsi belum dimuat). Full suite
modul terkait (titipan-reconcile + repairTitipanOrphans + sub-check
lain yang membaca `checkAll()`): **161/161 lolos**, 0 regresi. `node --check`
lolos utk `self-test.js` & `titipan-reconcile.js`.

### Belum dikerjakan (di luar cakupan poin 4)
Poin 1 (conflicts/unresolved lain), 2 (allowlist file oversized), dan 3
(minify bundle) dari catatan sesi ini masih terbuka, ditunda sesi terpisah.
Bundle (`app-bundle-a/b.min.js`) BELUM di-rebuild sesi ini (esbuild tidak
terpasang, tidak ada koneksi internet di lingkungan sesi ini) — perubahan
baru ada di source (`titipan-reconcile.js`/`self-test.js`), belum ikut ke
bundle terkompilasi.

---

## Update (lanjutan sesi berikutnya lagi): toast backlog tabrakan owner ID (poin 1)

Menutup sisa poin 1 dari catatan sesi ini yang belum dikerjakan (poin 4 di
atas sudah menutup bagian `txUnresolved`). Bagian yang tersisa:
`repairOwnerIdConsistency()` melewati grup nama pemilik yang bertabrakan
(1 entity sudah punya >1 ID grup yang sama sekaligus) dan mencatatnya di
`conflicts` — tapi sebelum ini `conflicts` cuma sampai `console.warn`,
tidak pernah kelihatan di UI/HP.

### Perubahan
- `_computeOwnerIdConflicts()` (baru, `titipan-reconcile.js`) — logika
  deteksi tabrakan diekstrak dari `repairOwnerIdConsistency()` (0 perubahan
  perilaku fungsi itu sendiri) supaya bisa dihitung ulang TANPA menjalankan
  repair — murni derivasi `D.assets`/`D.investments`/`D.ownerRegistry`,
  tidak butuh flag persisten (beda dgn `checkPendingOwnerReview()` yang
  butuh flag krn sinyal aslinya hilang setelah dikosongkan).
- `checkOwnerIdConflicts()` (baru) — jalur BACA PURE, dipakai `checkAll()`
  sbg sub-check ke-11 (informasional, pola sama `pendingOwnerReview`).
- `repairTitipanOrphans()` (self-test.js) — toast backlog
  `checkOwnerIdConflicts()` di KEDUA jalur (ada gap baru / sudah bersih
  tapi ada backlog lama), pola SAMA PERSIS `pendingOwnerReview` (poin 4).

### Test
+11 test baru (`tests/titipan-reconcile.test.js`: deteksi tabrakan, PURE/0
mutasi, ok=true kalau divergen tapi tidak bertabrakan, guard aman;
`tests/s686-...test.js`: toast backlog muncul/tidak muncul/backlog lama/
guard aman). Full suite modul terkait: **151/151 lolos**, 0 regresi.
`node --check` lolos utk seluruh file yang diubah.

### Sisa dari catatan sesi ini (belum dikerjakan)
Poin 2 (allowlist file oversized) dan poin 3 (minify bundle) masih
terbuka. Bundle belum di-rebuild (alasan sama: esbuild tidak terpasang,
tidak ada koneksi internet di lingkungan sesi ini).
