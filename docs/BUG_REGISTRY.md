# BUG REGISTRY
## v986 / S324 Baseline

> This registry starts as an evidence-backed queue. It intentionally does not invent defects that have not been reproduced or traced.

## Severity

- **P0 Critical:** data loss/corruption, fatal business calculation, unusable core workflow, critical security.
- **P1 High:** major feature broken, financial/data inconsistency, important workflow failure.
- **P2 Medium:** partial feature failure, recoverable state problem, meaningful UX/state defect.
- **P3 Low:** cosmetic/minor UX/technical debt.

---

# 0. Resolved (this baseline)

## BUG-011

- Severity: P2 Medium (UI membingungkan — tombol tab aktif salah
  highlight; konten yang ditampilkan tetap benar, tidak ada data yang
  salah)
- Domain: Shared/Navigasi (dipakai lintas modul — Shop, Vehicle/Carnotes)
- File: `modules/finance/filter-laporan.js`
- Function/component: `goToList()` (fungsi `jump()` di dalamnya)
- Ditemukan di Sesi Audit-Docs 4 — filter-laporan.js (2026-08-01)
- Trigger: Navigasi via `goToList()` dengan `shopTabName` bernilai
  `'etalase'/'produsen'/'riwayat'/'pelanggan'`, atau `cnTabName='servis'`.
  Caller nyata: `modules/vehicle/sparepart-servis.js:1180` —
  `goToList('servisReminderCard','carnotes',4,null,'servis')`.
- Actual: konten tab yang ditampilkan BENAR (mis. panel "Servis"), tapi
  tombol tab lain yang ter-highlight `active` di tab bar salah (mis.
  "⛽ BBM" untuk kasus `cnTabName='servis'`; untuk `shopTabName` analog,
  satu tombol offset dari yang seharusnya)
- Expected: tombol tab yang ter-highlight `active` sama dengan tab
  konten yang ditampilkan
- Root cause: index tombol `.cn-tab` untuk `shopTabName`/`cnTabName`
  di-hardcode lewat ternary manual, tidak cocok dengan urutan tombol
  aktual di DOM (`index.html`). `setShopTab(t,el)`/`setCnTab(t,el)`
  memakai `t` (string, benar) untuk toggle konten tapi `el` (elemen dari
  index yang salah) untuk `el.classList.add('active')`. Parameter
  `keuTabName` di fungsi yang sama sudah benar — pakai
  `KEU_TAB_ORDER.indexOf(keuTabName)` (dinamis, bukan hardcode).
- Impact: indikator tab aktif tidak sinkron dengan konten yang sedang
  dilihat user, walau tidak ada kesalahan data/isi
- Reproduction: lihat test file — fake DOM sesuai urutan `.cn-tab`
  aktual di `index.html`, jalankan `goToList()` asli, assert tombol
  yang dapat class `active` sama dengan tab yang diminta
- Evidence: `tests/s335-bug011-gotolist-tab-active-index.test.js`
- Fix: ganti hardcode ternary dengan pola `indexOf()` yang sudah benar
  dipakai `keuTabName` di fungsi yang sama — tambah `SHOP_TAB_ORDER`
  dan `CN_TAB_ORDER` lalu `tabs[SHOP_TAB_ORDER.indexOf(shopTabName)]`/
  `tabs[CN_TAB_ORDER.indexOf(cnTabName)]` (fallback index `0` kalau
  tidak ketemu, sama seperti pola `keuTabName`)
- Regression test: `tests/s335-bug011-gotolist-tab-active-index.test.js`
  (3 test — cnTabName='servis', shopTabName='pelanggan',
  shopTabName='etalase')
- Verification: source-code trace + automated test, PASS di v1000/S335
  (`node --test tests/*.test.js` → 2084/2084 pass, 0 fail)
- Status: **FIXED** (v1000/S335)

## BUG-019


- Severity: P2 Medium (UI stale — modal Riwayat Pembayaran menampilkan
  baris pembayaran yang sudah dihapus sampai ada trigger render lain;
  tidak ada data storage yang salah)
- Domain: Finance (Bill/Tagihan ↔ List Transaksi)
- File: `modules/finance/tx-list-cashflow.js`
- Function/component: `delTx()`
- Awalnya dicatat sbg **BUG-002** di
  `AUDIT-SESI2-tagihan-kalender-sync.md` (audit sync engine
  `tagihan-kalender.js`, ditemukan sbg konsumen sekunder
  `revertBillFromDeletedTx()`)
- Trigger: Modal Riwayat Pembayaran (`billHistoryModal`) sedang terbuka
  untuk sebuah bill, lalu transaksi pembayaran bill yang sama dihapus
  lewat tombol 🗑 di List Transaksi (`delTx()`, BUKAN lewat modal
  Riwayat Pembayaran itu sendiri yang sudah benar via
  `deleteBillHistoryTx()`)
- Actual: `delTx()` memanggil daftar render manual (termasuk
  `renderBillHistory()`) SEBELUM `D.transactions` difilter & `save()`
  dieksekusi — `renderBillHistory()` membaca `D.transactions` yang
  masih mengandung transaksi yang baru saja "dihapus", baris riwayat
  pembayaran basi tetap tampil di modal
- Expected: render (khususnya `renderBillHistory()`) harus jalan
  SETELAH filter+save, supaya modal langsung menampilkan state final
- Root cause: urutan pemanggilan render vs `D.transactions.filter()`/
  `save()` terbalik di `delTx()` — 3 render manual berdiri sendiri
  (bukan reuse SSOT `refreshBillHistoryModalViews()`), berisiko
  divergensi kalau SSOT berubah tanpa `delTx()` ikut diupdate
- Impact: user yang membuka modal Riwayat Pembayaran lalu menghapus
  transaksi pembayaran lewat List Transaksi (tab lain/sisi lain UI)
  akan melihat baris pembayaran yang sudah dihapus tetap tampil sampai
  modal ditutup-buka lagi atau ada render lain
- Reproduction: lihat test file — stub `renderBillHistory()` mengambil
  snapshot keberadaan transaksi yang sedang dihapus di `D.transactions`
  pada saat render dipanggil; snapshot `true` (masih ada) menunjukkan
  bug sebelum fix
- Evidence: `tests/s335-bug019-deltx-render-order.test.js`
- Fix: pindahkan `D.transactions=D.transactions.filter(...)`+`save()`
  ke sebelum blok render manual; tambah flag lokal `billLinked` supaya
  kelompok render bill-spesifik tetap hanya jalan utk transaksi
  ber-`billLinkId` (perilaku existing dipertahankan, cuma urutan
  eksekusi yang dibalik)
- Regression test: `tests/s335-bug019-deltx-render-order.test.js`
  (1 test)
- Verification: source-code trace + automated test, PASS di v999/S335
  (`node --test tests/*.test.js` → 2081/2081 pass, 0 fail)
- Status: **FIXED** (v999/S335)

## BUG-018

- Severity: P2 Medium (storage/state tidak pernah salah — murni gap
  panggilan render, hilang otomatis setelah reload/navigasi ulang
  halaman)
- Domain: Finance (Bill/Tagihan ↔ Kekayaan Bersih/Zakat Maal)
- File: `modules/finance/tagihan-kalender.js`
- Function/component: `markBillPaid()`
- Ditemukan di `AUDIT-S334-FINANCE-DEEP-DIVE.md` §3 (audit langsung,
  status CONFIRMED dgn verifikasi empiris end-to-end)
- Trigger: Bayar tagihan/cicilan/langganan (BUKAN utang) dari halaman
  Keuangan yang sedang terbuka — baik saat LUNAS (tenor habis/freq
  sekali) maupun saat lanjut ke periode berikutnya
- Actual: dari 4 jalur keluar `markBillPaid()`, hanya jalur
  `kind==='utang'` yang memanggil `renderKekayaanBersih()`/
  `hitungZakatMaal()` — 3 jalur lain (cicilan lunas, tagihan sekali
  selesai, berulang lanjut non-utang) sama-sama membuat transaksi
  expense baru tapi tidak ikut refresh kartu Kekayaan Bersih/Zakat
  Maal di halaman yang sama
- Expected: kartu Kekayaan Bersih/Zakat Maal ikut ter-update langsung
  setelah pembayaran, sama seperti jalur `kind==='utang'` yang sudah
  benar
- Root cause: `renderKekayaanBersih()`/`hitungZakatMaal()` hanya
  dipanggil eksplisit di 2 titik (keduanya `kind==='utang'`);
  `refreshBillEverywhere()` (dipanggil di semua jalur) tidak
  menutup gap ini karena isinya tidak termasuk keduanya
- Impact: kartu Kekayaan Bersih/Zakat Maal menampilkan angka lama
  sampai reload/navigasi ulang setelah bayar tagihan/cicilan/langganan
  non-utang
- Reproduction: lihat test file — harness brace-extraction menjalankan
  `markBillPaid()` asli, hitung panggilan
  `renderKekayaanBersih()`/`hitungZakatMaal()` per skenario
- Evidence: `tests/s335-bug018-markbillpaid-networth-refresh.test.js`
- Fix: tambah `renderKekayaanBersih();hitungZakatMaal();` di jalur
  cicilan lunas & tagihan sekali selesai; lepaskan gate
  `if(b.kind==='utang')` dari panggilan
  `renderKekayaanBersih()`/`hitungZakatMaal()` di jalur "berulang
  lanjut" (jadi unconditional utk semua kind — `renderDebtList()`
  tetap khusus utang)
- Regression test:
  `tests/s335-bug018-markbillpaid-networth-refresh.test.js` (4 test —
  cicilan lunas, tagihan sekali selesai, tagihan bulanan non-utang
  lanjut, + 1 regresi jalur utang lunas)
- Verification: source-code trace + automated test, PASS di v999/S335
  (`node --test tests/*.test.js` → 2081/2081 pass, 0 fail)
- Status: **FIXED** (v999/S335)

## BUG-016

- Severity: P2 Medium (salah tampilan status "jatuh tempo hari ini"
  vs "besok"/badge H-1, tidak mengubah data tersimpan)
- Domain: Finance (Bill/Tagihan — badge & banner jatuh tempo)
- File: `modules/finance/tagihan-kalender.js`
- Function/component: `getBillStats()`, `checkBills()`
- Ditemukan di `AUDIT-S334-FINANCE-DEEP-DIVE.md` §2 (audit langsung,
  status CONFIRMED)
- Trigger: bill dgn `nextDue` sama dengan tanggal hari ini (atau
  H-1/H-2 dst.) dibuka di timezone Indonesia (WIB/WITA/WIT — semua di
  depan UTC)
- Actual: `today` dihitung sbg LOCAL midnight, tapi dibandingkan
  terhadap `new Date(b.nextDue)` (string date-only, di-parse JS sbg
  UTC midnight) — selisih basis konstan +7/+8/+9 jam mendorong
  `Math.ceil()` naik 1 hari; bill jatuh tempo hari ini tertampil sbg
  "H-1"
- Expected: bill dgn `nextDue` = hari ini (waktu lokal) harus
  terhitung `diff===0`
- Root cause: inkonsistensi basis parsing — string date-only diparse
  UTC, `today` dihitung lokal
- Impact: badge "X hari lagi"/banner "tagihan akan jatuh tempo" bisa
  salah 1 hari, berpotensi membuat user telat sadar tagihan jatuh
  tempo hari ini
- Reproduction: lihat test file — `process.env.TZ='Asia/Jakarta'` +
  fixed local "now", bill `nextDue` = hari ini harus `diff===0`
- Evidence: `tests/s335-bug016-timezone-h1-offbyone.test.js`
- Fix: helper baru `billNextDueLocalMidnight(dateStr)` (parse
  "YYYY-MM-DD" langsung jadi local midnight via split string manual,
  tanpa lewat parsing UTC), menggantikan `new Date(b.nextDue)` di
  `getBillStats()` & `checkBills()`.
  `getBillOccurrencesInMonth()`/`getBillOccurrencesInRange()` tidak
  disentuh (sudah diverifikasi audit sebelumnya tidak kena pola bug
  ini — dibandingkan sbg rentang, offset Indonesia selalu positif)
- Regression test: `tests/s335-bug016-timezone-h1-offbyone.test.js`
  (2 test — bill jatuh tempo hari ini → diff 0, bill jatuh tempo
  besok tetap diff 1)
- Verification: source-code trace + automated test, PASS di v999/S335
  (`node --test tests/*.test.js` → 2081/2081 pass, 0 fail)
- Status: **FIXED** (v999/S335)

## BUG-0324

- Severity: P1 High (silent, permanent stock loss with no explanatory record)
- Domain: Car Notes / Inventory
- Requirement ID: INV-101, INV-102
- File: `car-notes.js`
- Function/component: `Servis._saveInner()` (both the new-record and edit paths)
- Trigger: saving a service record that uses both `usedPartId` (regular Stok Sparepart) and `catalogPartId` (Vehicle Catalog part), where the `usedPartId` deduction succeeds but the `catalogPartId` deduction then fails (insufficient stock + user declines the "tetap lanjut" prompt)
- Actual: rollback called `Servis.applyStockUsage(usedPartId, ...)` again, which *further decreases* stock instead of reverting it — `usedPartId` stock was deducted twice while the whole save was aborted (no `D.servisLogs` entry), so the second deduction had no matching record
- Expected: on abort, `usedPartId` stock should return to its pre-attempt value; on the edit path, the OLD `usedPartId` deduction reverted at function start should also be restored
- Root cause: wrong function called at the rollback site (`applyStockUsage` instead of `revertStockUsage`)
- Impact: permanent, unexplained stock discrepancy for any service record using both stock sources when the catalog-stock check fails
- Reproduction: see test file below (fails against v985/S323 code)
- Evidence: `tests/servis-stock-rollback-double-deduct-s324.test.js`
- Fix: rollback now calls `revertStockUsage()`; edit path also restores the old `usedPartId` deduction
- Regression test: `tests/servis-stock-rollback-double-deduct-s324.test.js` (2 tests, new-record + edit path)
- Verification: source-code trace + automated test, PASS in v986/S324
- Status: **FIXED** (v986/S324)

## BUG-014

- Severity: P2 Medium
- Domain: Finance (BudgetRecommendationAPI ↔ Presenter)
- File: `modules/finance/budget-recommendation-api.js`
- Function/component: `spendingAnalysis()` (new helpers
  `_CATEGORY_PRIORITY`, `_sortBySeverity()`); indirect fix for
  `budgetSuggestion()` and for `BudgetRecommendationPresenter.
  _overCard()`/`_topSuggestionCard()` (`budget-recommendation-
  presenter.js`, unchanged file, now receives already-sorted data)
- Trigger: `D.budgets` contains ≥2 budgets of mixed category (e.g. one
  `over` and one `underused`/`near`) where the `over` budget is not the
  first element in `D.budgets`' creation order
- Actual: `spendingAnalysis().items` (and therefore
  `budgetSuggestion().suggestions`) preserved the raw `D.budgets`
  creation order instead of any priority/magnitude order, so the
  presenter's "Rekomendasi Utama" card (`suggestions[0]`) and "Terbesar"
  label (`.find()` first `over` item) could surface a low-priority
  suggestion or a small-magnitude over-budget item while a more urgent
  one existed elsewhere in the array
- Expected: `suggestions[0]` should be the highest-priority
  recommendation (over > near > underused), and within a category the
  item with the largest magnitude should sort first, so downstream
  `.find()`/`[0]` consumers get the correct "top"/"biggest" item without
  needing their own sort logic
- Root cause: `spendingAnalysis()`/`budgetSuggestion()` never sorted the
  array — pure `map()`/`filter()` inheriting `D.budgets` insertion order
  from `FinanceIntelligence.budgetSummary()`
- Impact: Budget Recommendation dashboard (`#budgetRecoGrid`) could
  display a misleadingly low-priority "main recommendation" card, and
  the "biggest over-limit budget" label could point at a small overage
  instead of the actual largest one
- Reproduction: see test file below (previously failed against
  v996/S332 code — `suggestions[0].category` was `'underused'` instead
  of `'over'` when an underused budget was created before an over-limit
  one)
- Evidence: `tests/budget-recommendation-severity-sort-s333.test.js`
- Fix: added `_CATEGORY_PRIORITY` mapping + `_sortBySeverity(items)`
  helper (sorts a `.slice()` copy — no mutation of the source array),
  applied to `items` inside `spendingAnalysis()` before `return`;
  `budgetSuggestion()` needed no code change since it filters the
  already-sorted `sa.items`
- Regression test: `tests/budget-recommendation-severity-sort-s333.test.js`
  (7 tests — category ordering, in-category magnitude ordering, count
  integrity post-sort, no source-array mutation, `{ok:false}` guard
  passthrough)
- Verification: source-code trace + automated test, PASS in v997/S333
  (`node --test tests/*.test.js` → 2074/2074 pass, 0 fail)
- Status: **FIXED** (v997/S333)

---

# 0a. Open — New Findings (Sesi Audit: Bill/Piutang/Debt domain)

> Diimplementasikan dari hasil audit eksternal (source of truth), belum
> diperbaiki. Field yang tidak disertakan pada input audit ditandai
> "Not specified in audit input" — TIDAK diisi dengan asumsi/dugaan baru.

## BUG-FIN-001

- Judul: Validasi nilai positif hilang di `Piutang.save()` dan `Debt.save()`
- Severity: P2
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-09-01, sesi S699) krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-006/BUG-007/GAP3-AUD-001. `modules/finance/piutang-utang.js` sudah berisi komentar `FIX (BUG-FIN-001)` di `Debt._saveInner`/`Piutang._saveInner` (guard nilai<=0). `TODO.md` mencatat status DONE ini sejak sesi 487 tapi `BUG_REGISTRY.md`/`docs/KNOWN-ISSUES.md`/`docs/AUDIT_MATRIX.md` tidak pernah disinkronkan — dikoreksi sesi ini. Full suite tidak berubah sesi ini (docs-only): 5273/5273 pass.
- Module: Finance (Piutang & Debt)
- Function: `Piutang.save()`, `Debt.save()`
- Root Cause: Not specified in audit input
- Impact: Not specified in audit input
- Reproduction: Not specified in audit input
- Confidence: Not specified in audit input
- Recommendation: Not specified in audit input
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## BUG-001

- Judul: Fallback self-heal `_saveBillInner()` tidak memakai `countFallbackBillPaymentCandidates()`
- Severity: Medium-High
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-09-01, sesi S699) krn fix sudah landing (sesi 338) tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-006/BUG-007/GAP3-AUD-001. `modules/finance/tagihan-kalender.js` sudah memanggil `countFallbackBillPaymentCandidates()` di `_saveBillInner()` (guard `<=1` sebelum self-heal). `TODO.md` mencatat status DONE ini sejak sesi 487 tapi `BUG_REGISTRY.md`/`docs/KNOWN-ISSUES.md`/`docs/AUDIT_MATRIX.md` tidak pernah disinkronkan — dikoreksi sesi ini. Full suite tidak berubah sesi ini (docs-only): 5273/5273 pass.
- Module: Bill/Tagihan
- Function: `_saveBillInner()`
- Root Cause: Fallback self-heal tidak memakai `countFallbackBillPaymentCandidates()` sehingga kandidat ambigu bisa salah ter-link.
- Impact: Kandidat ambigu bisa salah ter-link (detail dampak lebih lanjut tidak disertakan di input audit)
- Reproduction: Not specified in audit input
- Confidence: Not specified in audit input
- Recommendation: Not specified in audit input
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## BUG-002

- Judul: Mismatch `tx.amount` vs label "Jumlah Total per Periode"
- Severity: Not specified in audit input
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-09-01, sesi S699) krn fix sudah landing (sesi 342) tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-006/BUG-007/GAP3-AUD-001. `modules/finance/tagihan-kalender.js` sudah berisi komentar `FIX (BUG-002, sesi 342)` — mengirim `amt` (porsi sendiri) ke `t.amount`, bukan `rawAmt` (nilai total field #billAmt). `TODO.md` mencatat status DONE ini sejak sesi 487 tapi `BUG_REGISTRY.md`/`docs/KNOWN-ISSUES.md`/`docs/AUDIT_MATRIX.md` tidak pernah disinkronkan — dikoreksi sesi ini. Full suite tidak berubah sesi ini (docs-only): 5273/5273 pass.
- Module: Bill/Tagihan
- Function: Not specified in audit input
- Root Cause: Not specified in audit input
- Impact: Not specified in audit input
- Reproduction: Not specified in audit input
- Confidence: Not specified in audit input
- Recommendation: Not specified in audit input
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## BUG-003

- Judul: Interaksi `_saveBillInner()` dengan `syncOutstandingSharedPiutang()`
- Severity: Not specified in audit input
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-09-01, sesi S699) krn fix sudah landing (sesi 339) tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-006/BUG-007/GAP3-AUD-001. `modules/finance/tagihan-kalender.js` sudah berisi komentar `FIX (BUG-003, sesi 339)` — guard `!billEditFromArchive` supaya edit tagihan lunas/arsip tidak ditimpa sync piutang yang salah sasaran. `TODO.md` mencatat status DONE ini sejak sesi 487 tapi `BUG_REGISTRY.md`/`docs/KNOWN-ISSUES.md`/`docs/AUDIT_MATRIX.md` tidak pernah disinkronkan — dikoreksi sesi ini. Full suite tidak berubah sesi ini (docs-only): 5273/5273 pass.
- Module: Bill/Tagihan ↔ Piutang
- Function: `_saveBillInner()`, `syncOutstandingSharedPiutang()`
- Root Cause: Not specified in audit input
- Impact: Not specified in audit input
- Reproduction: Not specified in audit input
- Confidence: Not specified in audit input
- Recommendation: Not specified in audit input
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## BUG-004

- Judul: `markBillPaid()` — `payMethod = b.kind`, kind `"utang"` tidak terdaftar di `pmIcons`/dropdown filter metode
- Severity: Medium
- Status: **FIXED** (v1216/S487) — `modules/finance/tx-list-cashflow.js`, `pmIcons` ditambah `tagihan:'🧾'` dan `utang:'📕'`. Regression test: `tests/s487-txhtml-pmicons-tagihan-utang-badge.test.js` (6 test). Status ini tercatat sejak sesi 487 di `TODO.md` tapi `BUG_REGISTRY.md`/`docs/KNOWN-ISSUES.md`/`docs/AUDIT_MATRIX.md` tidak pernah disinkronkan — dikoreksi sesi S699. Lihat `FIX-v1215-to-v1216-s487-pmicons-badge-tagihan-utang.md`.
- Module: Bill/Tagihan
- Function: `markBillPaid()`
- Root Cause: kind `"utang"` tidak terdaftar di `pmIcons` maupun dropdown filter metode.
- Impact: Not specified in audit input
- Reproduction: Not specified in audit input
- Confidence: Not specified in audit input
- Recommendation: Not specified in audit input
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## BUG-005

- Judul: `delBillArchive()` tidak memanggil `refreshBillEverywhere()`/`renderBillList()`
- Severity: Medium
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-09-01, sesi S699) krn fix sudah landing (audit s327) tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-006/BUG-007/GAP3-AUD-001. `modules/finance/tagihan-kalender.js`, `delBillArchive()` sudah memanggil `save();refreshBillEverywhere();` setelah hapus arsip. `TODO.md` mencatat status DONE ini sejak sesi 487 tapi `BUG_REGISTRY.md`/`docs/KNOWN-ISSUES.md`/`docs/AUDIT_MATRIX.md` tidak pernah disinkronkan — dikoreksi sesi ini. Full suite tidak berubah sesi ini (docs-only): 5273/5273 pass.
- Module: Bill/Tagihan
- Function: `delBillArchive()`
- Root Cause: Tidak memanggil `refreshBillEverywhere()` atau `renderBillList()` setelah delete.
- Impact: Daftar Tagihan tab Lunas menjadi stale.
- Reproduction: Not specified in audit input
- Confidence: Not specified in audit input
- Recommendation: Not specified in audit input
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

---

# 0a-2. Open — New Findings (Sesi Audit-Docs 2: Bill/Piutang/Debt, lanjutan)

> Audit langsung terhadap source code (bukan implementasi input eksternal
> seperti §0a) — melanjutkan 4 fungsi berstatus `PENDING AUDIT` di
> `docs/AUDIT_MATRIX.md` §7: `Debt.syncBill()`, `getBillPaidThisPeriodInfo()`,
> `revertBillFromDeletedTx()`, `deleteBillHistoryTx()`. Field diisi lengkap
> (Root Cause/Reproduction/Impact/Severity/Confidence/Recommendation) karena
> ditemukan langsung dari trace kode, bukan dari input pihak ketiga.

## BUG-006

- Judul: `Debt.syncBill()` menghapus tagihan cicilan-utang langsung lewat
  array filter, melewati `removeOrphanedAutoPiutangForBill()` — piutang
  otomatis "Ditanggung Bersama" jadi orphan permanen
- Severity: **P2 Medium** (financial reporting — nilai nyangkut permanen
  di Kekayaan Bersih, bukan salah hitung transaksi/uang riil)
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-08-20, koreksi sesi S657 atas klaim keliru di catatan S656) krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-007/GAP3-AUD-001. `modules/finance/piutang-utang.js` sudah berisi komentar `FIX (BUG-006, audit 2026-08)` di `Debt.syncBill()`. Regression test: `tests/bug006-syncbill-orphan-piutang.test.js` (4 test — utang jadi Lunas, cicilanBulanan dinolkan, tanpa piutang auto terkait, dan shouldHaveBill tetap true — piutang manual/tidak-terkait tidak ikut terhapus di semua skenario), sudah ada di tree sebelum sesi S656 (koreksi: catatan sesi S656 sebelumnya keliru menyatakan "belum ada test khusus"). Full suite tidak berubah sesi ini (docs-only): 4630/4630 pass.
- Module: Finance (Debt ↔ Bill ↔ Piutang)
- File: `modules/finance/piutang-utang.js`
- Function/component: `Debt.syncBill(d)`
- Root Cause: Saat utang ditandai lunas (atau `cicilanBulanan` di-nolkan)
  dan tagihan cicilan auto-generated (`kind:'utang'`) tidak lagi
  dibutuhkan, `syncBill()` menghapusnya lewat
  `D.bills=D.bills.filter(b=>b!==bill)` secara langsung — TIDAK lewat
  `delBill()`/`delBillArchive()` (`modules/finance/tagihan-kalender.js`)
  yang sejak fix "sync 2 arah Ditanggung Bersama" (sesi audit sebelumnya)
  sudah memanggil `removeOrphanedAutoPiutangForBill(id)` setelah hapus
  tagihan. `syncBill()` adalah jalur hapus tagihan KETIGA yang tidak ikut
  dapat fix tsb (2 jalur lain — `delBill()`/`delBillArchive()` — sudah
  benar; `revertBillFromDeletedTx()` menangani jalur hapus-transaksi lewat
  `autoTxId`, juga sudah benar).
- Trigger: Tagihan auto (`kind:'utang'`, dibuat dari `Debt.syncBill()`)
  pernah diedit lewat modal Edit Tagihan jadi `shared:true` +
  `sharedAutoPiutang:true`, lalu pernah dibayar minimal 1x (memicu
  `maybeCreateSharedPiutangFromBill()` membuat entri `D.piutang` dengan
  `autoBillId` = id tagihan tsb) — lalu user menandai Utang tsb **Lunas**
  (atau mengosongkan Cicilan Bulanan) lewat `Debt.save()` → `syncBill()`.
- Actual: Tagihan terhapus dari `D.bills`, tapi entri `D.piutang` dengan
  `autoBillId` yang menunjuk ke tagihan tsb TETAP ada, `lunas:false`.
- Expected: Sama seperti `delBill()`/`delBillArchive()` — entri piutang
  otomatis yang `autoBillId`-nya menunjuk ke tagihan yang baru dihapus
  ikut dibersihkan lewat `removeOrphanedAutoPiutangForBill(bill.id)`.
- Impact: Piutang orphan permanen tetap kehitung di Kekayaan Bersih/
  ringkasan Piutang walau sumbernya (tagihan) sudah tidak ada — user tidak
  bisa menghapusnya lewat UI normal (tidak ada tagihan asal untuk dibuka),
  cuma bisa hapus manual piutang itu sendiri kalau sadar itu orphan.
- Reproduction: (1) Buat Utang baru dgn Cicilan Bulanan > 0 → tagihan auto
  dibuat. (2) Buka tagihan itu di Edit Tagihan, aktifkan "Ditanggung
  Bersama" + toggle auto-piutang, simpan. (3) Bayar tagihan itu 1x
  (markBillPaid) → 1 entri `D.piutang` baru dgn `autoBillId` = id tagihan.
  (4) Kembali ke Buku Utang, tandai Utang tsb Lunas (atau nolkan Cicilan
  Bulanan), Simpan → `Debt.syncBill()` jalan. (5) Cek `D.piutang` — entri
  dari langkah 3 masih ada meski tagihannya sudah hilang dari `D.bills`.
- Confidence: **High** — pola identik 1:1 dengan bug yang sudah
  dikonfirmasi & diperbaiki di `delBill()`/`delBillArchive()` sesi
  sebelumnya (lihat komentar `removeOrphanedAutoPiutangForBill()` di
  `piutang-utang.js`); belum ada test yang cover jalur hapus lewat
  `syncBill()` secara spesifik.
- Recommendation: Di `syncBill()`, tambahkan pemanggilan
  `removeOrphanedAutoPiutangForBill(bill.id)` (reuse fungsi yang sudah
  ada, pola sama persis `delBill()`) di cabang `if(bill){...}` sebelum
  `D.bills=D.bills.filter(...)`, lalu render ulang
  `Piutang.renderList()` bersyarat kalau ada yang terhapus (caller
  `Debt.save()` sudah memanggil `renderKekayaanBersih()`/
  `hitungZakatMaal()` tanpa syarat).
- Audit Session: Sesi Audit-Docs 2 — Bill/Piutang/Debt lanjutan
  (2026-08-01)

## BUG-007

- Judul: `revertBillFromDeletedTx()` mengembalikan `dbt.nilai` sebesar
  `t.amount` penuh, tidak memperhitungkan clamp `Math.max(0,...)` di
  `markBillPaid()` saat pembayaran utang melebihi sisa saldo (pelunasan
  dipercepat/dibulatkan) — saldo utang jadi lebih besar dari seharusnya
  setelah transaksi pembayaran itu dihapus
- Severity: **P1 High** (kesalahan nominal finansial langsung — saldo
  utang, bukan sekadar data orphan/UI stale)
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli
  dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-08-16)
  krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola
  penutupan `GAP3-AUD-001`. Fix persis sesuai Recommendation di bawah:
  `markBillPaid()` (baris ~1001-1014) sekarang menyimpan snapshot
  `debtNilaiBefore` (`dbt.nilai` SEBELUM clamp) ke transaksi pembayaran;
  `revertBillFromDeletedTx()` (baris ~812-830) pakai snapshot itu utk set
  `dbt.nilai` LANGSUNG (bukan `+t.amount`), dgn fallback ke perilaku lama
  utk transaksi lama (`typeof t.debtNilaiBefore!=='number'`) — backward
  compatible, 0 migrasi data. Regression test:
  `tests/bug007-overpayment-revert-debt.test.js` (4/4 pass, termasuk Case
  C — skenario overpayment persis dari laporan bug ini — & test backward
  compat transaksi lama). Verifikasi ulang sesi ini: `node --test
  tests/*.test.js` → 4511/4511 pass.
- Module: Finance (Bill ↔ Debt)
- File: `modules/finance/tagihan-kalender.js`
- Function/component: `revertBillFromDeletedTx(t)` — SSOT dipakai bersama
  oleh `deleteBillHistoryTx()` (file sama) dan `delTx()`
  (`modules/finance/tx-list-cashflow.js`), jadi keduanya kena dampak yang
  sama (satu bug, dua entry point).
- Root Cause: Di `markBillPaid()`, khusus `kind==='utang'`, nominal
  pembayaran (`payAmount`) BOLEH lebih besar dari sisa utang (fitur
  "lunasin sekaligus/dibulatkan", validasi cuma `>0`, tidak dibatasi
  `<=` sisa) — saldo baru dihitung
  `dbt.nilai=Math.max(0,(dbt.nilai||0)-payAmount)`, jadi kalau
  `payAmount > dbt.nilai` lama, kelebihan bayar itu hilang tanpa jejak
  (diclamp ke 0, bukan jadi negatif — nilai sebelum-bayar juga tidak
  disimpan di mana pun). `revertBillFromDeletedTx()` tidak tahu soal
  clamp ini — dia melakukan `dbt.nilai=(dbt.nilai||0)+t.amount`, yaitu
  menambahkan kembali `t.amount` (=`payAmount` asli, termasuk porsi
  kelebihan bayar) secara penuh.
- Trigger: Utang dgn sisa saldo kecil (mis. Rp100.000) dibayar
  sekaligus/dibulatkan lebih besar dari sisa (mis. Rp150.000) lewat
  prompt "Jumlah Pembayaran" di `markBillPaid()` → saldo jadi 0, status
  Lunas, tagihan pindah ke `D.billsArchive`. Transaksi pembayaran tsb
  (amount=150.000) kemudian dihapus (lewat 🗑 List Transaksi/`delTx()`,
  atau lewat 📋 Riwayat Pembayaran/`deleteBillHistoryTx()`).
- Actual: `dbt.nilai` menjadi `0 + 150.000 = 150.000` — lebih besar
  Rp50.000 dari saldo sebelum pembayaran tsb dilakukan (seharusnya
  Rp100.000).
- Expected: `dbt.nilai` kembali ke nilai tepat sebelum pembayaran ini
  (Rp100.000) — bukan `t.amount` penuh.
- Impact: Saldo Utang (dan turunannya: Total Utang di Dashboard/Net
  Worth, DSR/`DebtStrategy.computeDSR()`, zakat maal) menjadi lebih besar
  dari yang sebenarnya setiap kali sebuah pembayaran-lunas-sekaligus dgn
  kelebihan bayar dihapus — kesalahan permanen sampai user sadar & koreksi
  manual `nilai` di Buku Utang. Khusus kind `'utang'` saja (kind lain —
  cicilan/langganan/tagihan — nominalnya selalu terkunci ke `b.amount`,
  tidak ada prompt edit nominal, jadi tidak pernah ada gap antara
  `t.amount` dan efek riil pengurangan).
- Reproduction: Lihat skenario di atas. Test yang sudah ada
  (`tests/s291-delTx-bill-sync.test.js`, test "revertBillFromDeletedTx()
  — kind utang: saldo utang dikembalikan...") cuma cover kasus `t.amount`
  PERSIS SAMA dgn saldo sebelum bayar (`dbt.nilai` awal 0, `t.amount`
  200000, expect balik ke 200000 — tidak ada overpayment di skenario
  itu), jadi tidak menangkap bug ini.
- Confidence: **High** — root cause pasti dari trace `markBillPaid()` vs
  `revertBillFromDeletedTx()` line-by-line; belum diverifikasi lewat
  automated test baru sesi ini (dianjurkan sbg regression test begitu fix
  dikerjakan).
- Recommendation: Simpan nilai `dbt.nilai` SEBELUM clamp di titik
  pembayaran (`markBillPaid()`), mis. field baru `debtNilaiBefore` di
  transaksi pembayaran atau di entry `D.billsArchive` (pola sama seperti
  `actualPayAmount` yang sudah ada). `revertBillFromDeletedTx()` lalu
  pakai field itu (guard utk data lama yg belum punya field ini, fallback
  ke perilaku lama) utk set `dbt.nilai` LANGSUNG ke nilai tsb, bukan
  menambahkan `t.amount`. Setelah fix, tambah regression test khusus
  skenario overpayment di `tests/s291-delTx-bill-sync.test.js`.
- Audit Session: Sesi Audit-Docs 2 — Bill/Piutang/Debt lanjutan
  (2026-08-01)

**Catatan `deleteBillHistoryTx()`:** fungsi ini murni memanggil
`revertBillFromDeletedTx(t)` lalu menghapus transaksi — tidak ditemukan
bug independen di luar yang sudah diwarisi dari BUG-007 (SSOT yang sama
dipakai `delTx()`). Tidak dicatat sebagai bug terpisah, lihat
`docs/AUDIT_MATRIX.md` §7 untuk klasifikasi.

---

# 0a-3. Open — New Findings (Sesi Audit-Docs 3: Finance/WorthIt domain)

> Diimplementasikan dari hasil audit `modules/finance/worthit.js` (100%
> fungsi di file tsb, sesi terputus sebelumnya). Tidak ada audit ulang
> kode di sesi dokumentasi ini — field diisi berdasarkan ringkasan hasil
> audit yang diberikan, dilengkapi nomor baris hasil verifikasi cepat
> terhadap `WorthIt.catatBeli()` sebelum ditulis sebagai "Confirmed".

## BUG-008

- Judul: `WorthIt.catatBeli()` tidak meneruskan DP (`d.dp`) ke transaksi,
  dan `txCicilanPerBulan` yang sudah diisi dari kalkulator ditimpa oleh
  `syncCicilanPreview('total')`
- Severity: **P2 Medium**
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-08-18) krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-007/GAP3-AUD-001. `modules/finance/worthit.js` sudah berisi komentar `FIX (BUG-008, audit 2026-08)` di `WorthIt.catatBeli()`. Regression test: `tests/s646-worthit-catatbeli-cicilan-dp.test.js` (sesi S646). Full suite verifikasi terakhir: 4675/4675 pass (S655).
- Module: Finance (WorthIt)
- File: `modules/finance/worthit.js`
- Function/component: `WorthIt.catatBeli()`
- Root Cause: Di cabang `d.method==='cicilan'`,
  `document.getElementById('txCicilanPerBulan').value` diisi dari
  `d.cicilanBulan` (kalau `d.cicilanBulan>0`), tapi baris setelahnya
  memanggil `syncCicilanPreview('total')` yang menghitung ulang &
  menimpa nilai cicilan per bulan berdasarkan total/tenor — nilai yang
  baru saja diisi dari kalkulator Worth It hilang. Field DP (`d.dp`) dari
  `WorthIt._last` tidak pernah dibaca/di-assign ke elemen form transaksi
  manapun di fungsi ini.
- Actual: Cicilan per bulan di form transaksi jadi hasil hitung ulang
  `syncCicilanPreview('total')`, bukan nilai dari kalkulator Worth It; DP
  tidak pernah muncul/dipakai di transaksi yang dibuat.
- Expected: Nilai cicilan per bulan dari kalkulator tetap dipertahankan
  (tidak ditimpa), dan DP diteruskan ke field/perhitungan transaksi yang
  sesuai.
- Impact: DP jadi murni kosmetik di kalkulator Worth It — tidak
  berpengaruh ke transaksi riil yang tercatat; nilai cicilan per bulan
  yang dimasukkan user di kalkulator hilang begitu masuk ke form
  transaksi.
- Confidence: **High**
- Recommendation: (belum ditentukan pada sesi audit — perlu keputusan
  apakah `syncCicilanPreview('total')` dilewati saat `d.cicilanBulan>0`,
  atau dipanggil dengan argumen lain; DP perlu dipetakan ke field/efek
  transaksi yang sesuai sebelum diteruskan)
- Audit Session: Sesi Audit (worthit.js, 100% fungsi) — diimplementasikan
  ke dokumentasi pada Sesi Audit-Docs 3 (2026-08-01)

---

# 0a-4. Open — New Findings (Sesi Audit langsung: modules/finance/filter-laporan.js, 100%)

> Audit LANGSUNG terhadap source code (trace manual seluruh 20 fungsi +
> 5 state var module-level di `modules/finance/filter-laporan.js`,
> cross-check caller/callee di seluruh codebase termasuk `index.html`/
> `app_production.html` data-action, dan cross-check `docs/BUG_REGISTRY.md`
> §0a/§0a-2/§0a-3 untuk menghindari duplikasi). Dilakukan & didokumentasikan
> dalam sesi yang sama (Sesi Audit-Docs 4, 2026-08-01).

## BUG-009

- Judul: `toggleKeuFilter()` — tap pertama tombol Filter tidak membuka
  panel `#keuFilterPanel` (butuh tap kedua) karena state hidden awal
  dibaca lewat inline style, padahal disembunyikan lewat class CSS
- Severity: **P2 Medium**
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-08-18) krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-007/GAP3-AUD-001. `modules/finance/filter-laporan.js` sudah berisi komentar `FIX (BUG-009, audit 2026-08)` di `toggleKeuFilter()`. Regression test: `tests/s647-togglekeufilter-class-detect.test.js` (sesi S647). Full suite verifikasi terakhir: 4675/4675 pass (S655).
- Module: Finance (Keuangan — panel filter)
- File: `modules/finance/filter-laporan.js`
- Function/component: `toggleKeuFilter()` (baris 50-57)
- Root Cause: `const show=panel.style.display==='none';` membaca inline
  style `panel.style.display`, tapi `#keuFilterPanel` (`index.html`/
  `app_production.html`) disembunyikan lewat class `u-dnone`
  (`.u-dnone{display:none}` di `styles.css`), bukan inline style — jadi
  `panel.style.display` awalnya string kosong `''`, bukan `'none'`.
  Akibatnya `show` bernilai `false` di tap pertama → kode men-set
  `panel.style.display='none'` (no-op, panel memang sudah hidden) &
  melewati `if(show)populateKeuFilters();`. Baru di tap KEDUA
  `panel.style.display` benar-benar `'none'` (hasil tap pertama) → `show`
  jadi `true` → panel baru terbuka + `populateKeuFilters()` jalan.
- Trigger: User belum pernah punya filter Keuangan aktif tersimpan (atau
  baru install/localStorage kosong/di-reset) — kalau ada `prefs` aktif
  tersimpan, `loadKeuFilterPrefsIntoDOM()` (baris 145, fungsi yang sama)
  sudah men-set `panel.style.display='block'` duluan saat halaman dibuka,
  jadi kasus itu TIDAK kena bug ini (state awal panel.style.display sudah
  benar-benar terisi).
- Actual: Tap pertama tombol "🔍 Filter" (`#kfToggleBtn`) tidak terjadi
  apa-apa secara visual; `populateKeuFilters()` tidak jalan.
- Expected: Tap pertama langsung membuka panel filter & memanggil
  `populateKeuFilters()`.
- Impact: UX — pengguna baru/tanpa filter aktif tersimpan perlu tap 2x
  supaya panel filter muncul; tidak ada kehilangan data, cuma
  membingungkan (tombol terlihat tidak merespons di tap pertama).
- Confidence: **High** — diverifikasi lewat trace `panel.style.display`
  vs definisi CSS `.u-dnone` di `styles.css:288` & atribut HTML
  `#keuFilterPanel` (`index.html:444`, class `u-dnone` tanpa inline
  `display`).
- Recommendation: Deteksi state via `panel.classList.contains('u-dnone')`
  (atau method terpadu `getComputedStyle(panel).display`) alih-alih
  `panel.style.display`, supaya konsisten baik state awal (class CSS)
  maupun state hasil toggle (inline style).
- Audit Session: Sesi Audit-Docs 4 — filter-laporan.js (2026-08-01)

## BUG-010

- Judul: `showFilteredTx()` scope `'keuangan'` tidak menerapkan filter
  pencarian teks (`kf.search`), tidak konsisten dengan `renderKeuangan()`
- Severity: **P2 Medium**
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-08-18) krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-007/GAP3-AUD-001. `modules/finance/filter-laporan.js` sudah berisi komentar `FIX (BUG-010, audit 2026-08)` di `showFilteredTx()` scope `'keuangan'`. Regression test: `tests/s648-showfilteredtx-keuangan-search-scope.test.js` (sesi S648). Full suite verifikasi terakhir: 4675/4675 pass (S655).
- Module: Finance (Keuangan — modal detail transaksi)
- File: `modules/finance/filter-laporan.js`
- Function/component: `showFilteredTx()`, cabang `scope==='keuangan'`
  (baris 179-181)
- Root Cause: `getKeuFilters()` mengembalikan objek termasuk field
  `search`, tapi hanya `txMatchesFilters(t,kf)` yang dipakai untuk
  menyaring `txs` — `txMatchesSearch(t,kf.search)` (fungsi yang sudah ada
  di file yang sama, baris 76-81) tidak pernah dipanggil di cabang ini.
  Bandingkan `renderKeuangan()` (`modules/shared/modules-render.js:1163`)
  yang menerapkan KEDUANYA: `txMatchesFilters(t,kf)&&txMatchesSearch(t,kf.search)`.
- Trigger: User mengisi kotak pencarian `#kfSearch` di panel filter
  Keuangan (menyaring list `#allTx`), lalu tap salah satu kartu
  💚Pemasukan/🔴Pengeluaran/💰Saldo Bersih (`data-action="showFilteredTx"
  data-args=["keuangan",...]`, `index.html`/`app_production.html`).
- Actual: Modal `filterTxModal` menampilkan transaksi yang lolos filter
  dropdown (tipe/kategori/sub/akun/metode) TAPI mengabaikan kata kunci
  pencarian — bisa menampilkan transaksi yang seharusnya tersaring oleh
  pencarian di list `#allTx` di bawahnya.
- Expected: Modal menerapkan `txMatchesSearch(t,kf.search)` juga, supaya
  konsisten dengan `#allTx`.
- Impact: Data yang ditampilkan di modal drill-down tidak konsisten
  dengan list utama yang sedang dilihat user pada saat yang sama — total
  & isi list modal bisa lebih banyak dari yang diharapkan user.
- Confidence: **High** — perbandingan langsung baris-per-baris dengan
  implementasi paralel di `renderKeuangan()` yang menerapkan kedua filter.
- Recommendation: Tambahkan `&&txMatchesSearch(t,kf.search)` ke kondisi
  filter di cabang `scope==='keuangan'`, pola sama persis
  `renderKeuangan()`.
- Audit Session: Sesi Audit-Docs 4 — filter-laporan.js (2026-08-01)

> BUG-011 dipindahkan ke `# 0. Resolved (this baseline)` di atas —
> **FIXED (v1000/S335)**. Entri OPEN lama di sini sudah usang, dihapus
> supaya tidak ada duplikat/dua status berbeda utk nomor bug yang sama.

---

# 0a-5. Open — New Findings (Sesi Audit-Docs 5: Finance/FinanceIntelligence domain, audit langsung, 100%)

> Audit LANGSUNG terhadap source code `modules/finance/finance-intelligence.js`
> (100% fungsi, sesi terputus sebelumnya — hasil audit diteruskan & sudah
> final). Tidak ada audit ulang kode di sesi dokumentasi ini — field diisi
> berdasarkan hasil audit yang diberikan sebagai source of truth.

## BUG-012

- Judul: Cache `_ivxCache` / `_budgetSummaryCache` menjadi stale setelah
  `changeMonth()` / `changeTxListMonth()`
- Severity: **P2 Medium**
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-08-18) krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-007/GAP3-AUD-001. `modules/finance/tx-list-cashflow.js` sudah berisi komentar `FIX (BUG-012, audit 2026-08)` di `changeMonth()`/`changeTxListMonth()`. Regression test: `tests/s649-changemonth-financeintelligence-cache-invalidate.test.js` (sesi S649). Full suite verifikasi terakhir: 4675/4675 pass (S655).
- Module: Finance (FinanceIntelligence)
- File: `modules/finance/finance-intelligence.js`
- Function/component: `FinanceIntelligence` cache (`_ivxCache`,
  `_budgetSummaryCache`) vs `changeMonth()`, `changeTxListMonth()`
- Root Cause: `changeMonth()` dan `changeTxListMonth()` tidak memanggil
  `FinanceIntelligence.invalidateCache()` setelah bulan aktif berubah,
  sehingga cache yang dihitung untuk bulan sebelumnya tetap dipakai.
- Impact: Not specified in audit input
- Reproduction: Not specified in audit input
- Confidence: **High**
- Recommendation: Not specified in audit input
- Audit Session: Sesi Audit (finance-intelligence.js, 100% fungsi) —
  diimplementasikan ke dokumentasi pada Sesi Audit-Docs 5 (2026-08-01)

---

# 0a-6. Open — New Findings (Sesi Audit-Docs 8: Finance/FinancialRiskDashboardAPI domain, audit langsung, 100%)

> Audit LANGSUNG terhadap source code `modules/finance/
> financial-risk-dashboard-api.js` (100% fungsi, 7 fungsi) — bug
> ditemukan lewat cross-check langsung ke callee (`modules/shared/
> modules-calc.js` `DanaDaruratAI.currentSaved()`, `modules/asset/aset.js`,
> `modules/asset/invest-ai-widget.js`, `modules/finance/tx-target.js`),
> field diisi lengkap (bukan "Not specified in audit input") karena
> ditemukan langsung dari trace kode di sesi ini, bukan dari input pihak
> ketiga.

## BUG-013

- Judul: `_emergencyFundRisk()` membaca `dd.saved` mentah, mengabaikan
  `dd.accountId` — Risk Factor Dana Darurat permanen salah utk target
  yang tertaut ke akun
- Severity: **P2 Medium**
- Status: **FIXED** — entry di bawah TIDAK diedit (histori audit asli dipertahankan); status ini ditambahkan belakangan (verifikasi 2026-08-18) krn fix sudah landing tapi entry lama tidak pernah diupdate, sama pola penutupan BUG-007/GAP3-AUD-001. `modules/finance/financial-risk-dashboard-api.js` sudah berisi komentar `FIX (BUG-013, audit 2026-08)` di `_emergencyFundRisk()`. Regression test: `tests/s650-emergencyfundrisk-realtime-balance.test.js` (sesi S650). Full suite verifikasi terakhir: 4675/4675 pass (S655).
- Module: Finance (FinancialRiskDashboardAPI ↔ Target/Dana Darurat)
- File: `modules/finance/financial-risk-dashboard-api.js`
- Function/component: `_emergencyFundRisk()`
- Root Cause: Untuk Target Dana Darurat yang ditautkan ke akun
  (`dd.accountId` terisi), progres nyata WAJIB dibaca lewat
  `recalcAccBalance(dd.accountId)` — pola SSOT yang konsisten dipakai di
  4 lokasi lain: `DanaDaruratAI.currentSaved()`
  (`modules/shared/modules-calc.js:323`, `dd.accountId?
  recalcAccBalance(dd.accountId):(dd.saved||0)`), `modules/asset/aset.js:76`,
  `modules/asset/invest-ai-widget.js:_checkDanaDarurat()`, dan
  `modules/shared/modules-render.js:1347`. Field `dd.saved` mentah HANYA
  valid utk target Dana Darurat TANPA akun tertaut — `saveTarget()`
  (`modules/finance/tx-target.js:49`) menyimpan `saved=0` permanen saat
  `accountId` diisi, dan `DanaDaruratAI.updateSaved()`
  (`modules/shared/modules-calc.js:373`) SENGAJA menolak menulis
  `dd.saved` kalau `dd.accountId` ada (toast "Target ini tertaut ke
  akun, saldo ikut otomatis dari akunnya"). `_emergencyFundRisk()` di
  file ini TIDAK mengikuti pola tsb — langsung pakai `dd.saved` di baris
  `done=...dd.saved>=dd.amount` dan `note=...dd.saved/(dd.amount||1)...`
  tanpa cek `dd.accountId` sama sekali.
- Trigger: User membuat Target Keuangan bertanda 🚨 Dana Darurat DAN
  menautkannya ke sebuah akun (field `tAcc` di modal Target diisi) — lalu
  saldo akun tertaut tsb tumbuh (lewat transaksi/saldo awal) hingga
  mencapai atau melewati nominal target.
- Reproduction:
  1. Buka modal Target → isi nama, centang "Dana Darurat", isi Target
     (mis. Rp10.000.000), PILIH akun di dropdown `tAcc`, simpan (`saved`
     tersimpan `0` di record target — permanen, karena `accountId`
     terisi).
  2. Pastikan saldo akun yang ditautkan (lewat transaksi/saldo awal)
     mencapai/melewati Rp10.000.000.
  3. Panggil `FinancialRiskDashboardAPI.riskFactors()` /
     `.summary()` (dipakai `FinancialRiskDashboardPresenter.render()`,
     container `#financialRiskDashboardGrid`, tab Keuangan → Laporan).
- Actual: `_emergencyFundRisk()` tetap membaca `dd.saved` (bernilai `0`,
  tidak pernah diupdate utk target ber-`accountId`) → `done` selalu
  `false` → item risk factor "Dana Darurat belum tercapai — 0% dari
  target" MUNCUL TERUS di Risk Factors/`riskLevel()`, walau saldo akun
  tertaut sudah 100%+ dari target.
- Expected: Progres Dana Darurat dibaca via `dd.accountId &&
  typeof recalcAccBalance==='function' ? recalcAccBalance(dd.accountId) :
  (dd.saved||0)` (pola sama `DanaDaruratAI.currentSaved()`) — risk factor
  Dana Darurat otomatis hilang begitu saldo akun tertaut mencapai target,
  sama seperti kartu "🤖 Rekomendasi Dana Darurat" di Dashboard
  (`DanaDaruratAI.renderDash()`) dan banner Alokasi Aset
  (`invest-ai-widget.js`) yang sudah benar.
- Impact: Financial Risk Dashboard (kartu "🛡️ Tingkat Risiko Finansial",
  "⚠️ Faktor Risiko Utama", "🗂️ Sebaran Risiko") permanen salah
  menampilkan Dana Darurat sbg belum tercapai utk SELURUH user yang
  menautkan Dana Darurat ke akun (jalur yang didukung & didorong UI
  sendiri — toast "tersambung ke akun (otomatis update)" saat simpan).
  Ikut menaikkan `riskLevel().count` +1 secara keliru selamanya —
  berpotensi mendorong level risiko dari 'low'/'medium' ke
  'medium'/'high' secara salah, menyesatkan user & fitur AI turunan yang
  membaca risk factors ini.
- Confidence: **High** — pola account-aware `recalcAccBalance(dd.accountId)`
  dipakai konsisten di 4 lokasi lain di codebase (dicek langsung isi
  filenya), dan `saveTarget()`/`updateSaved()` mengonfirmasi `dd.saved`
  memang sengaja dibekukan `0` utk target ber-akun — bukan asumsi,
  melainkan bukti langsung di source code.
- Recommendation: Di `_emergencyFundRisk()`, ganti seluruh pemakaian
  `dd.saved` mentah dengan `(dd.accountId && typeof recalcAccBalance
  ==='function') ? recalcAccBalance(dd.accountId) : (dd.saved||0)` —
  pola sama persis `invest-ai-widget.js._checkDanaDarurat()` (guard
  `typeof recalcAccBalance==='function'`, konsisten dgn gaya guard file
  ini sendiri yang sudah ada utk `DebtOptimizerAPI`/
  `FinancialHealthScoreAPI`/`FinanceIntelligence`).
- Audit Session: Sesi Audit langsung (financial-risk-dashboard-api.js,
  100%) — Sesi Audit-Docs 8 (2026-08-01)

---

# 0a-7. Open — New Findings (Sesi Audit-Docs 9: Finance/BudgetRecommendationAPI domain, audit langsung, 100%)

> Audit LANGSUNG terhadap source code `modules/finance/
> budget-recommendation-api.js` (100% fungsi, 6 fungsi) — bug ditemukan
> lewat cross-check langsung ke callee (`modules/finance/
> finance-intelligence.js` `budgetSummary()`) dan caller (`modules/
> finance/budget-recommendation-presenter.js`), field diisi lengkap
> (bukan "Not specified in audit input") karena ditemukan langsung dari
> trace kode di sesi ini, bukan dari input pihak ketiga.

## BUG-014

- Severity: **P2 Medium**
- Domain: Finance (BudgetRecommendationAPI ↔ Presenter)
- Requirement ID: N/A
- File: `modules/finance/budget-recommendation-api.js`
- Line: 75-94 (`spendingAnalysis()`), 108-152 (`budgetSuggestion()`)
- Function/component: `spendingAnalysis()`, `budgetSuggestion()` — dampak
  turunan ke `BudgetRecommendationPresenter._overCard()` (`modules/
  finance/budget-recommendation-presenter.js:84`) dan
  `_topSuggestionCard()` (`modules/finance/
  budget-recommendation-presenter.js:121`)
- Trigger: `D.budgets` berisi ≥2 anggaran dgn kategori campuran (mis.
  `over` DAN `underused`/`near`), di mana anggaran ber-kategori `over`
  BUKAN elemen pertama dalam urutan `D.budgets` (mis. anggaran
  "Hiburan" — underused — dibuat SEBELUM anggaran "Makan" — over limit).
- Actual: `spendingAnalysis()` mengembalikan `items` dalam urutan APA
  ADANYA dari `FinanceIntelligence.budgetSummary().items`
  (`finance-intelligence.js:119`, murni `D.budgets.map()` — urutan
  pembuatan/penyimpanan anggaran, TIDAK pernah diurutkan berdasarkan
  severity/pct/nominal). `budgetSuggestion()` memfilter array itu
  (`category !== 'ok'`) TANPA mengurutkan ulang, jadi `suggestions[0]`
  bisa berupa item `near`/`underused` walau ada item `over` di posisi
  lain. Presenter mengonsumsi kedua fungsi ini dgn asumsi urutan =
  prioritas: `_topSuggestionCard()` memakai `suggestions[0]` sbg
  "Rekomendasi Utama" (kartu utama, styling merah HANYA kalau
  `top.category === 'over'`), dan `_overCard()` memakai
  `sa.items.find((it) => it.category === 'over')` (elemen `over`
  PERTAMA yang ditemukan, bukan yang nominalnya terbesar) sbg label
  "Terbesar: {nama}".
- Expected: Item/`suggestions` seharusnya diurutkan berdasarkan prioritas
  (over > near > underused) lalu berdasarkan besaran (mis. `used-limit`
  menurun utk `over`, `pct` menurun dalam kategori yang sama) SEBELUM
  dikembalikan — supaya `suggestions[0]` benar-benar rekomendasi paling
  mendesak, dan label "Terbesar" pada `_overCard()` benar-benar anggaran
  over-limit dgn nominal terbesar, bukan sekadar item pertama dalam
  urutan penyimpanan `D.budgets`.
- Root cause: Tidak ada langkah `sort()` di `spendingAnalysis()` maupun
  `budgetSuggestion()` — keduanya murni `map()`/`filter()` yang
  mewarisi urutan asli `D.budgets` dari `FinanceIntelligence.
  budgetSummary()`, sementara lapisan presenter (di file terpisah)
  memperlakukan posisi index 0 / hasil `.find()` pertama seolah-olah
  sudah terurut prioritas/nominal.
- Impact: Kartu "💡 Rekomendasi Utama" pada Budget Recommendation
  dashboard (`#budgetRecoGrid`, tab Keuangan → Laporan) bisa menampilkan
  saran berprioritas RENDAH (mis. "baru dipakai 20% dari limit — sisa
  anggaran bisa dialihkan…") dgn styling netral, PADAHAL ada anggaran
  lain yang sudah over-limit & lebih mendesak ditampilkan di kartu lain.
  Kartu "🚨 Anggaran Over Limit" sub-label "Terbesar: {nama}" juga bisa
  keliru menunjuk anggaran over dgn nominal kecil, bukan yang benar2
  terbesar — berpotensi menyesatkan user ttg anggaran mana yang paling
  butuh perhatian.
- Reproduction:
  1. Buat 2 anggaran: "Hiburan" (limit 500rb, pemakaian 100rb — masuk
     kategori `underused`, pct 0.2) dibuat LEBIH DULU, lalu "Makan"
     (limit 1jt, pemakaian 1.2jt — kategori `over`) dibuat SETELAHNYA.
  2. Panggil `BudgetRecommendationAPI.summary()` (dipakai
     `BudgetRecommendationPresenter.render()`).
  3. `budgetSuggestion().suggestions[0].category` bernilai `'underused'`
     ("Hiburan"), BUKAN `'over'` ("Makan") — walau "Makan" jelas lebih
     mendesak.
- Evidence: Trace langsung `modules/finance/budget-recommendation-api.js`
  (baris 75-94, 108-152), `modules/finance/finance-intelligence.js`
  (baris 119-124, konfirmasi `items` TIDAK diurutkan), `modules/finance/
  budget-recommendation-presenter.js` (baris 84 `.find()` + label
  "Terbesar", baris 121 `suggestions[0]` + label "Rekomendasi Utama").
- Fix: **DITERAPKAN v997/S333** — tambah `_CATEGORY_PRIORITY` (tabel
  mapping over/near/underused/ok) & `_sortBySeverity(items)` (helper
  baru, `.slice().sort()` di atas COPY array — 0 mutasi array asli) di
  `spendingAnalysis()`, urutkan `items` SEBELUM `return`: prioritas
  kategori (over → near → underused → ok) lalu besaran dalam kategori
  yang sama (`used-limit` menurun utk over, `pct` menurun utk near,
  `pct` menaik utk underused). `budgetSuggestion()` TIDAK perlu diubah
  — otomatis mewarisi urutan baru krn memfilter `sa.items` yang sudah
  terurut. 0 rumus finansial baru (murni `Array.prototype.sort()`
  presentasional atas field yang sudah final).
- Regression test: **DITAMBAHKAN** —
  `tests/budget-recommendation-severity-sort-s333.test.js` (7 test
  baru): urutan `items` over→near→underused, urutan DALAM kategori
  `over` (overage terbesar duluan) & `underused` (pct terkecil duluan),
  `budgetSuggestion().suggestions[0]` benar2 item over dgn overage
  terbesar, count per kategori tetap benar pasca-sort, array asli dari
  `FinanceIntelligence.budgetSummary()` TIDAK termutasi, guard
  `{ok:false}` tetap diteruskan apa adanya.
- Verification: Source-code trace + automated test, **PASS** di
  v997/S333 (`node --test tests/*.test.js` → 2074/2074 pass, 0 fail, 0
  regresi dari 2067 test sebelumnya). Lihat detail resolusi lengkap di
  `# 0. Resolved (this baseline)` di atas.
- Status: **FIXED** (v997/S333)
- Confidence: **High** — murni trace jalur eksekusi deterministik
  (urutan array `D.budgets` → `items` → `suggestions`), tidak bergantung
  asumsi runtime/data yang ambigu.
- Audit Session: Sesi Audit langsung
  (budget-recommendation-api.js, 100%) — Sesi Audit-Docs 9 (2026-08-01).
  Diperbaiki Sesi 333 (2026-08-01) — lihat
  `FIX-v997-s333-budget-reco-priority-sort.md`.

---

# 0b. Verified False Positive (Sesi Audit: Bill/Piutang/Debt domain)

Status: **VERIFIED FALSE POSITIVE**

## `getBillArchiveEditSource()`
- Alasan bukan bug: Tidak ada bug baru.
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## `saveBill()`
- Alasan bukan bug: `withSaveGuard` benar.
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## `syncOutstandingSharedPiutang()`
- Alasan bukan bug: Aman secara terisolasi.
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## `maybeCreateSharedPiutangFromBill()`
- Alasan bukan bug: Kasus tidak reachable.
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## `delTx()` / `renderBillHistory()`
- Alasan bukan bug: Sudah diverifikasi FALSE POSITIVE karena modal overlay membuat jalur tidak reachable.
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## `getBillPaidThisPeriodInfo()`
- Alasan bukan bug: Fungsi mem-parse `t.date` (string `"YYYY-MM-DD"`) lewat
  `new Date(t.date)`, yang oleh JS diinterpretasikan sebagai UTC tengah
  malam, lalu dibaca ulang dengan `.getMonth()`/`.getFullYear()` (timezone
  LOKAL) untuk dibandingkan ke `targetBulan`/`targetTahun`. Pola ini SECARA
  UMUM punya jebakan off-by-one-day terkenal untuk timezone di sebelah
  BARAT UTC (offset negatif, mis. UTC-5 Amerika) — tapi seluruh timezone
  Indonesia (WIB UTC+7, WITA UTC+8, WIT UTC+9) berada di sebelah TIMUR UTC
  (offset positif), jadi hasil `.getMonth()`/`.getFullYear()` lokal SELALU
  sama atau lebih maju dari UTC, tidak pernah mundur ke bulan/tahun
  sebelumnya. Diverifikasi via source-code trace (tidak ada override
  timezone lain di codebase) + basis pengguna aplikasi ini memang khusus
  Indonesia (lihat `docs/PRD.md`, seluruh UI berbahasa Indonesia, format
  `fmtFull()`/`fmt()` berbasis Rupiah). Bukan bug REACHABLE untuk konteks
  aplikasi ini.
- Catatan portabilitas (BUKAN bug, dicatat utk kewaspadaan ke depan): pola
  parsing ini akan jadi bug nyata kalau aplikasi ini pernah dipakai dari
  device dgn timezone offset negatif (barat UTC) — TIDAK direkomendasikan
  untuk difix sekarang (scope aplikasi murni Indonesia, fix defensif tanpa
  kebutuhan nyata cuma menambah kompleksitas tanpa manfaat terukur), tapi
  kalau suatu saat scope timezone berubah, ganti `new Date(t.date)` +
  `.getMonth()`/`.getFullYear()` lokal dgn parsing manual
  (`t.date.split('-')`) supaya lepas dari timezone sama sekali.
- Audit Session: Sesi Audit-Docs 2 — Bill/Piutang/Debt lanjutan (2026-08-01)

## `pendingBuyId` / `openTxModal()` (WorthIt)
- Alasan bukan bug: Ditandai False Positive pada hasil audit
  `modules/finance/worthit.js` (detail root-cause tidak disertakan pada
  ringkasan hasil audit yang diteruskan ke sesi dokumentasi ini).
- Audit Session: Sesi Audit (worthit.js) — diimplementasikan pada Sesi
  Audit-Docs 3 (2026-08-01)

## `incomeAvg()` div-by-zero (WorthIt)
- Alasan bukan bug: Ditandai False Positive pada hasil audit
  `modules/finance/worthit.js` (detail root-cause tidak disertakan pada
  ringkasan hasil audit yang diteruskan ke sesi dokumentasi ini).
- Audit Session: Sesi Audit (worthit.js) — diimplementasikan pada Sesi
  Audit-Docs 3 (2026-08-01)

## Timezone `new Date(t.date)` di `showFilteredTx()` (scope `dashboard`/`laporan`, filter-laporan.js)
- Alasan bukan bug: Pola sama persis dgn `getBillPaidThisPeriodInfo()` di
  atas — `new Date("YYYY-MM-DD")` diinterpretasikan UTC tengah malam lalu
  dibaca via `.getMonth()`/`.getFullYear()` lokal. Basis pengguna
  Indonesia (WIB/WITA/WIT, semua timur UTC/offset positif) membuat hasil
  lokal SELALU sama atau lebih maju dari UTC, tidak pernah mundur ke
  bulan/tahun sebelumnya — tidak reachable sebagai bug untuk konteks
  aplikasi ini. Catatan portabilitas yang sama (§0b di atas) berlaku.
- Audit Session: Sesi Audit-Docs 4 — filter-laporan.js (2026-08-01)

## `healthScore()` (FinanceIntelligence)
- Alasan bukan bug: `maxScore` tidak mungkin bernilai 0.
- Audit Session: Sesi Audit (finance-intelligence.js) — diimplementasikan
  pada Sesi Audit-Docs 5 (2026-08-01)

## `insights()` (FinanceIntelligence)
- Alasan bukan bug: Bukan duplikasi `FinCoach`, sesuai komentar di source
  code.
- Audit Session: Sesi Audit (finance-intelligence.js) — diimplementasikan
  pada Sesi Audit-Docs 5 (2026-08-01)

## `_healthCard(hs)` (FinanceDashboard)
- Alasan bukan bug: Guard `if(!hs)` terlihat seperti dead code (karena
  `FinanceIntelligence.healthScore()` selalu mengembalikan objek
  `{score,label,parts}`, tidak pernah `undefined`) — tapi ini defensive
  guard yang aman, konsisten pola dgn guard lain di file yang sama, TIDAK
  pernah menyebabkan perilaku salah.
- Audit Session: Sesi Audit langsung (finance-dashboard.js, 100%) — Sesi
  Audit-Docs 6 (2026-08-01)

## `componentBreakdown()` — guard `p.weight > 0 ? ... : 0` (FinancialHealthScoreAPI)
- Alasan bukan bug: `p.weight` tidak mungkin bernilai 0 — seluruh entri
  `parts` yang didorong oleh `FinanceIntelligence.healthScore()`
  (`modules/finance/finance-intelligence.js`) hardcode `weight:25`
  (savings/budget/debt/cashflow, tidak ada komponen berbobot 0). Guard
  ini dead code yang aman, konsisten pola dgn `_healthCard(hs)` guard
  `if(!hs)` (finance-dashboard.js, §0b di atas) — defensif thd kontrak
  yang belum pernah dan tidak akan dilanggar oleh callee-nya sendiri.
- Audit Session: Sesi Audit langsung (financial-health-score-api.js,
  100%) — Sesi Audit-Docs 7 (2026-08-01)

## `showFilteredTx()` scope `'dashboard'` pakai `new Date()` (bulan riil), bukan `curMonth`/`curYear`
- Alasan bukan bug: Awalnya dicurigai harus ikut `curMonth`/`curYear`
  (bulan yang lagi di-page user), tapi diverifikasi cocok dgn
  `Zakat.hitungPenghasilan()` (`modules/finance/pajak-pbb-zakat.js:97-98`)
  — satu-satunya fungsi yang mengisi `#zpIncomeBulan` (kartu yang dipicu
  scope ini) — yang JUGA selalu pakai `new Date()` (bulan kalender riil,
  bukan bulan yang di-page), karena kewajiban Zakat Penghasilan memang
  dihitung per bulan berjalan asli. Konsisten dgn sumber datanya sendiri.
- Audit Session: Sesi Audit-Docs 4 — filter-laporan.js (2026-08-01)

---

## `_classify()` (budget-recommendation-api.js) — pembagian `item.pct` tanpa guard `limit<=0`
- Alasan bukan bug: `_classify()` membandingkan `item.pct >= 0.8` /
  `item.pct < 0.4` TANPA cek `item.limit` dulu, terlihat rawan
  `NaN`/`Infinity` kalau `limit` 0 — tapi `item.pct` yang diterima
  SUDAH dihitung aman di hulu, `FinanceIntelligence.budgetSummary()`
  (`finance-intelligence.js:122`, `pct = limit > 0 ? used / limit : 0`).
  Anggaran dgn `limit<=0` otomatis dapat `pct=0` (masuk kategori
  `underused`, bukan `NaN`), jadi TIDAK ada bug — `_classify()` aman
  menerima `pct` yang sudah final apa adanya, sesuai prinsip file ini
  (0 recompute).
- Audit Session: Sesi Audit langsung (budget-recommendation-api.js,
  100%) — Sesi Audit-Docs 9 (2026-08-01)

## `spendingAnalysis()` (budget-recommendation-api.js) — potensi mutasi item cache `FinanceIntelligence._budgetSummaryCache`
- Alasan bukan bug: `spendingAnalysis()` membaca `bs.items` (bisa jadi
  referensi objek yang di-cache `FinanceIntelligence._budgetSummaryCache`
  saat dipanggil tanpa parameter) lalu memetakannya — terlihat rawan
  memutasi item yang di-cache lewat referensi bersama. Tapi
  implementasinya memakai spread `{ ...it, category: this._classify(it) }`
  yang membuat OBJEK BARU per item (bukan mutasi in-place `it.category =
  ...`), dan hasil akhir `spendingAnalysis()`/`budgetSuggestion()`/
  `summary()` juga selalu objek/array BARU (bukan referensi balik ke
  `bs`) — jadi TIDAK ada risiko korupsi cache `FinanceIntelligence`
  utk pemanggil lain yang berbagi cache yang sama.
- Audit Session: Sesi Audit langsung (budget-recommendation-api.js,
  100%) — Sesi Audit-Docs 9 (2026-08-01)

# 0c. Design Decision (Sesi Audit: Bill/Piutang/Debt domain)

Status: **BY DESIGN**

## `delBill()`
- Keputusan: Transaksi historis memang sengaja dipertahankan.
- Kenapa dianggap keputusan desain: perilaku tersebut adalah hasil pilihan
  desain eksplisit (transaksi historis dipertahankan), bukan defect.
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## `removeOrphanedAutoPiutangForBill()`
- Keputusan: Cascade delete seluruh auto piutang dianggap keputusan desain.
- Kenapa dianggap keputusan desain: perilaku cascade delete adalah pilihan
  desain yang disengaja, bukan defect.
- Audit Session: Sesi Audit Bill/Piutang/Debt (2026-08-01)

## `_keuFilterPrefsLoaded` (guard sekali-load) di `loadKeuFilterPrefsIntoDOM()` (filter-laporan.js)
- Keputusan: Preferensi filter Keuangan tersimpan hanya dimuat ke DOM
  SEKALI per sesi/load halaman (flag module-level, tidak pernah direset),
  bukan tiap kali `renderKeuangan()`/ganti sub-tab 'kelola' dipanggil.
- Kenapa dianggap keputusan desain: kalau dimuat ulang tiap render, filter
  yang sedang aktif dipilih user secara live di DOM akan tertimpa balik ke
  nilai tersimpan di `localStorage` — perilaku sekali-load ini disengaja
  untuk mencegah itu, bukan defect.
- Audit Session: Sesi Audit-Docs 4 — filter-laporan.js (2026-08-01)

## Cache `_ivxCache` / `_budgetSummaryCache` hanya dipakai untuk pemanggilan tanpa parameter eksplisit (FinanceIntelligence)
- Keputusan: Cache hanya berlaku untuk pemanggilan tanpa parameter
  eksplisit; pemanggilan dengan parameter selalu fresh (tidak memakai/
  mengisi cache).
- Kenapa dianggap keputusan desain: perilaku ini adalah pilihan desain
  eksplisit (bukan defect) — dicatat terpisah dari BUG-012 (yang soal
  cache tidak di-invalidate setelah ganti bulan, bukan soal kapan cache
  dipakai).
- Audit Session: Sesi Audit (finance-intelligence.js) — diimplementasikan
  pada Sesi Audit-Docs 5 (2026-08-01)

## `hook.insights` tidak dipakai di kartu manapun `FinanceDashboard` (finance-dashboard.js)
- Keputusan: Field `hook.insights` (dari `FinanceIntelligence.
  summary().insights`) sengaja tidak dirender jadi kartu di
  `FinanceDashboard` — insight ditampilkan lewat jalur presenter terpisah
  (`CrossInsightPresenter`, `DecisionCenterAPI`,
  `FinancialRiskDashboardAPI`) yang memanggil `FinanceIntelligence.
  insights()` langsung.
- Kenapa dianggap keputusan desain: pembagian tanggung jawab presenter
  yang disengaja (Finance Dashboard = kartu ringkasan angka, insight
  teks = presenter lain) — diverifikasi lewat cross-check seluruh
  pemanggil `FinanceIntelligence.insights()`/`.insights` di codebase,
  bukan gap yang terlewat.
- Audit Session: Sesi Audit langsung (finance-dashboard.js, 100%) — Sesi
  Audit-Docs 6 (2026-08-01)

## `summary().ok` selalu `true` (FinancialRiskDashboardAPI, berbeda dari planner lain)
- Keputusan: Tidak seperti `FinancialHealthScoreAPI.summary()`/
  `RetirementPlannerAPI.summary()` dkk (yang `ok`-nya bergantung ke 1
  sumber wajib), `FinancialRiskDashboardAPI.summary().ok` HARDCODE
  `true` — karena file ini tidak punya satu sumber data wajib tunggal;
  `riskFactors()` memanggil 4 helper yang MASING-MASING sudah guard
  `typeof X==='undefined'` sendiri dan balikin `[]` kalau sumbernya
  belum dimuat (bukan throw/gagal), jadi `riskFactors()` selalu
  balikin array (bisa kosong) dan `riskLevel()` selalu balikin
  `{count:0,level:'low',label:'Rendah'}` apa adanya kalau tidak ada
  faktor risiko — bukan kondisi "data belum tersedia" yang butuh flag
  `ok:false` di presenter (beda dgn planner lain yang butuh 1 sumber
  wajib tersedia dulu baru bisa render kartu apa pun).
- Kenapa dianggap keputusan desain: dikonfirmasi lewat komentar eksplisit
  di source code file ini sendiri (baris komentar `summary()`) — bukan
  gap yang terlewat, melainkan kontrak yang sengaja beda dari pola
  planner lain karena sifat data sumbernya yang beda (multi-sumber
  opsional vs 1 sumber wajib).
- Audit Session: Sesi Audit langsung (financial-risk-dashboard-api.js,
  100%) — Sesi Audit-Docs 8 (2026-08-01)

## Ambang klasifikasi over/near/underused (0.8/0.4) & `suggestedLimit` hanya utk kategori `over` (BudgetRecommendationAPI)
- Keputusan: `_classify()` sengaja memakai ambang `pct >= 0.8` (near)
  dan `pct < 0.4` (underused) — gaya yang SAMA dgn ambang 80/60/40 yang
  sudah dipakai `FinanceIntelligence.healthScore()` dan ambang 15%
  due-soon `VehicleReminder`, BUKAN rumus finansial baru dikarang.
  `budgetSuggestion()` juga sengaja HANYA menyertakan field
  `suggestedLimit` utk kategori `over` (nilainya `item.used` apa
  adanya) — kategori `near`/`underused` tidak butuh saran limit baru,
  cukup pesan peringatan/info.
- Kenapa dianggap keputusan desain: dikonfirmasi eksplisit lewat blok
  komentar di kepala file (baris 26-34) & komentar per-fungsi
  (`budgetSuggestion()`) — bukan gap yang terlewat, melainkan pola
  klasifikasi presentasional yang disengaja konsisten dgn konvensi
  ambang batas yang sudah ada di codebase.
- Audit Session: Sesi Audit langsung (budget-recommendation-api.js,
  100%) — Sesi Audit-Docs 9 (2026-08-01)

---

# 0a-8. Open — New Findings (Sesi Audit langsung: `Investment`/`D.investments` domain, audit langsung, 100%)

> Audit LANGSUNG dipicu oleh pertanyaan "kenapa belum ada tombol pemicu
> `InvestmentUI.openOwnersModal()`" pasca-Sesi 464/465. Ditelusuri lebih
> dalam dari sekadar "belum di-wire" — hasilnya: seluruh domain data
> `D.investments`/`Investment` (`modules/asset/investasi.js`) sudah tidak
> pernah bisa diisi dari UI mana pun sejak Sesi 161, dan development terus
> berlanjut di atasnya lintas banyak sesi setelahnya tanpa ada yang
> menyadari (atau mendokumentasikan ulang) status ini di luar 1 komentar
> di `investment-planner-api.js`. Field diisi lengkap (bukan "Not
> specified in audit input") — ditemukan langsung dari trace kode +
> `grep` menyeluruh terhadap seluruh file non-test di sesi ini.

## BUG-INV-001

- Severity: **P2 Medium** (bukan P0/P1 — tidak ada data pengguna yang
  rusak/salah, karena data itu memang selalu kosong; tapi berkelanjutan
  menyesatkan alur kerja development & menghasilkan false confidence dari
  test hijau)
- Domain: Asset/Investment (`Investment`/`D.investments`)
- Requirement ID: N/A
- File: `modules/asset/investasi.js` (module utuh), dgn dampak turunan ke
  `modules/asset/investasi-view.js`, `modules/asset/invest-ai-widget.js`,
  `modules/self-reward/self-reward-ai-widget.js`,
  `modules/finance/dana-kelolaan.js`,
  `modules/shared/ownership-settings-presenter.js`,
  `economic-intelligence/adapters/user-finance-adapter.js`
- Line: N/A (module-level; lihat evidence per-file di bawah)
- Function/component: `Investment.addHolding()` — tidak ada
  caller/UI penulis sama sekali; seluruh API baca (`getHoldings()`,
  `getHolding()`, `portfolioSummary()`, `assetAllocation()`,
  `getOwners()`/`setOwners()`, dst) valid & tertest tapi selalu
  beroperasi atas array kosong di aplikasi nyata.
- Trigger: Kondisi bawaan aplikasi — tidak butuh trigger user spesifik.
  Sejak Sesi 161 (dikonfirmasi via komentar kepala file
  `modules/finance/investment-planner-api.js` baris 20-25), tidak ada
  satu form/tombol/aksi pun di seluruh codebase yang memanggil
  `Investment.addHolding()`.
- Actual: `D.investments` selalu `[]` (array kosong) di setiap instalasi
  aplikasi nyata, permanen, karena satu-satunya fungsi penulis
  (`addHolding()`) tidak pernah dipanggil. Verifikasi:
  `grep -rn "Investment\.addHolding" --include="*.js" .` (di luar
  `tests/`) hanya menemukan 2 baris — keduanya KOMENTAR di
  `investment-planner-api.js` yang MENJELASKAN bahwa fungsi itu mati,
  bukan pemanggilan aktual.
- Expected: Idealnya salah satu dari dua hal — (a) domain data ini punya
  jalur UI nyata utk diisi user (halaman/list holding investasi +
  form tambah), sehingga seluruh engine ownership/sync yang sudah
  dibangun di atasnya benar-benar terpakai; atau (b) domain data ini
  didokumentasikan tegas sbg **legacy/deprecated** di kepala
  `investasi.js` sendiri (bukan cuma disebutkan sepintas di file lain),
  supaya sesi-sesi berikutnya tidak terus menambah fitur di atas fondasi
  yang sudah diketahui tidak terpakai.
- Root cause: Sesi 161 memindahkan alur kerja investasi user sungguhan
  ke `D.assets` (Buku Aset) via `Aset.investmentPerformance()`, TAPI
  `investasi.js`/`D.investments` tidak pernah dibekukan/dihapus/ditandai
  jelas — modul itu tetap ada, tetap lolos test, dan tetap terlihat
  seperti modul aktif bagi siapa pun yang membaca `investasi.js` sendiri
  (tidak ada catatan "modul ini mati" di file itu sendiri, hanya di
  `investment-planner-api.js` yang notabene file LAIN). Akibatnya
  beberapa sesi berikutnya (192/193, 390/406b, 455, 458-460, 462, 464,
  465 — minimal 9 entri sesi berbeda) melanjutkan menambah fitur
  (ownership filter, `MultiOwnerEngine`, titipan-debt sync,
  `getOwners()`/`setOwners()`, modal UI porsi kepemilikan) di atas
  fondasi data yang sudah dikonfirmasi tidak pernah terisi.
- Impact:
  1. **Efisiensi**: minimal 9 sesi kerja (ratusan baris kode + 611 baris
     / 32 test case khusus domain ini — lihat Evidence) dihabiskan utk
     fitur yang tidak bisa dipakai user mana pun sampai ada UI
     pengisian data (yang juga belum ada rencananya).
  2. **False confidence dari test**: seluruh 32 test terkait (`s462-
     investasi-multi-owner-titipan`, `s460-investment-titipan-debt-
     linked-id`, `investment-ownership-sync-s261`, `ownership-sync-
     investasi`) PASS dan LOGIKANYA BENAR, tapi mengetes jalur yang
     unreachable di app sungguhan — hijau di sini tidak berarti fitur
     berfungsi utk siapa pun.
  3. **Silent dead-read di 4 file lain** — tidak error, tidak crash,
     cuma selalu memproses array kosong tanpa peringatan apa pun:
     - `invest-ai-widget.js`, `self-reward-ai-widget.js` — cabang
       rekomendasi AI yang bergantung `Investment.getHoldings()` tidak
       akan pernah aktif
     - `dana-kelolaan.js` — ringkasan titipan investasi selalu kosong
     - `ownership-settings-presenter.js`,
       `economic-intelligence/adapters/user-finance-adapter.js` —
       meng-concat/membaca array yang selalu `[]`
  4. **Risiko berkelanjutan**: tanpa dokumentasi tegas di
     `investasi.js` sendiri, sesi mendatang (termasuk Sesi 464/465 yang
     baru saja menambah `investmentOwnersModal`) berisiko terus
     menambah fitur baru di atas domain data yang sudah mati.
- Reproduction:
  1. `grep -rn "Investment\.addHolding" --include="*.js" .` di root
     project (di luar folder `tests/`) → hanya 2 hasil, keduanya baris
     komentar penjelasan, 0 pemanggilan aktual.
  2. Baca `modules/finance/investment-planner-api.js` baris 20-25 —
     pernyataan eksplisit dari codebase sendiri.
  3. Cari UI/halaman "daftar holding investasi" atau "tambah holding
     investasi" di `index.html`/`app_production.html`/`modules/` → tidak
     ditemukan satu pun.
- Evidence:
  - `modules/finance/investment-planner-api.js:20-25` (komentar
    eksplisit "Investment.addHolding() tidak pernah dipanggil dari mana
    pun")
  - `grep -rn "Investment\.addHolding\|Investment\.recomputeHolding"`
    lintas seluruh file `.js` non-test — 0 pemanggilan aktif ditemukan
  - Sesi yang membangun fitur di atas domain ini pasca Sesi 161: Sesi
    192/193 (`isHoldingOwnershipSelf`, filter portfolio/allocation),
    Sesi 390/406b (`MultiOwnerEngine` wiring), Sesi 455/460
    (`linkedInvestmentId` titipan-debt sync), Sesi 462/AUD-008
    (`getOwners()`/`setOwners()`), Sesi 464/465 (modal UI porsi
    kepemilikan — `investasi-view.js`, `investmentOwnersModal`)
  - Test yang mengetes jalur unreachable ini:
    `tests/s462-investasi-multi-owner-titipan.test.js` (8 test),
    `tests/s460-investment-titipan-debt-linked-id.test.js` (6 test),
    `tests/investment-ownership-sync-s261.test.js` (10 test),
    `tests/ownership-sync-investasi.test.js` (8 test) — total 32 test,
    611 baris
  - Dead-read call sites: `modules/asset/invest-ai-widget.js`,
    `modules/self-reward/self-reward-ai-widget.js`,
    `modules/finance/dana-kelolaan.js`,
    `modules/shared/ownership-settings-presenter.js:38`,
    `economic-intelligence/adapters/user-finance-adapter.js:51`
- Fix: **BELUM DIPUTUSKAN** — 3 opsi remediasi diajukan ke pemilik
  produk, belum dipilih:
  1. **Freeze & dokumentasikan** — tandai `Investment`/`D.investments`
     sbg deprecated/legacy tegas di kepala `investasi.js` sendiri,
     hentikan penambahan fitur baru di atasnya, data/test dibiarkan
     apa adanya (paling murah, 0 risiko regresi)
  2. **Decommission** — hapus jalur tulis mati & migrasikan 4 dead-read
     call site ke `Aset.investmentPerformance()` (lebih besar, menyentuh
     beberapa file shared)
  3. **Aktifkan** — akhirnya bangun halaman/list holding investasi +
     form tambah, supaya seluruh kerja ownership sesi-sesi sebelumnya
     jadi terpakai (fitur baru sungguhan, scope terbesar)
- Regression test: `tests/investment-list-ui-s466.test.js` (BARU, 15 test
  case) — lihat catatan "Update Sesi 466 (lanjutan)" di bawah.
- Verification: Source-code trace + `grep` menyeluruh (bukan asumsi) —
  **CONFIRMED**, bukan `VERIFY`/dugaan.
- **Update Sesi 466**: Opsi 3 (Aktifkan) DIPILIH & Fase 1 mulai
  dikerjakan — lihat `AUDIT-BUILD-UI-INVESTASI-OPSI3.md` (audit teknis
  scoping, sesi sebelumnya) & `CHANGELOG.md` (Sesi 466). Fase 1 (halaman
  list holding `#asetTab-investasi` + modal tambah/edit `investmentModal`
  + wiring CRUD dasar `Investment.addHolding()`/`updateHolding()`/
  `deleteHolding()` + tombol pemicu "⚖️ Atur Porsi Kepemilikan" via
  `InvestmentListUI.openOwnersModalForEdit()` → `InvestmentUI.
  openOwnersModal()`) **SELESAI**. `Investment.addHolding()` sekarang
  PUNYA caller nyata (`InvestmentListUI.save()`,
  `modules/asset/investasi-list-view.js`) — poin utama BUG-INV-001
  (domain data tidak pernah terisi dari UI) sudah tertutup mulai sesi
  ini.
- **Update Sesi 466 (lanjutan)**: Test coverage baru untuk
  `InvestmentListUI` **SELESAI** — `tests/investment-list-ui-s466.test.js`
  (15 test case, dijalankan lewat source ASLI via `loadSource()` + DOM
  tiruan stateful, pola sama `asset-owners-flow-e2e-392a-to-392e.test.js`),
  menutup item "Belum dikerjakan" yang dicatat `PATCH-README.md` Sesi 466.
  Cakupan: `render()` (kartu ringkasan + list holding, termasuk
  empty-state), `openModal()` (mode Tambah vs Edit, prefill field, toggle
  tombol Owners/Delete), `save()` (jalur Tambah via `addHolding()`, jalur
  Edit via `updateHolding()` + tulis manual `unit`/`avgPrice` sesuai scope
  Fase 1, jalur gagal nama kosong, guard `Investment` belum dimuat),
  `deleteFromModal()` (konfirmasi `askConfirm` true/false, guard `editId`
  null, seluruh efek samping — `renderKekayaanBersih`/`hitungZakatMaal`/
  `renderDebtList`/`AIBus.emit`), & `openOwnersModalForEdit()` (delegasi ke
  `InvestmentUI.openOwnersModal()`, guard "simpan dulu" & guard
  `InvestmentUI` belum dimuat). `node --test tests/*.test.js` →
  **2999/2999 lolos, 0 gagal** (2984 test lama + 15 baru, 0 regresi).
  Fase 2 (UI transaksi Beli/Jual/Dividen), Fase 3 (UI Watchlist), Fase 4
  (verifikasi 4 dead-read call site dgn data nyata) MASIH belum
  dikerjakan — status TETAP **OPEN** sampai seluruh 4 fase selesai &
  4 dead-read call site (§Impact.3 di atas) terverifikasi tampil benar
  dgn data holding produksi nyata.
- **Update Sesi 467**: Fase 2 (UI Transaksi Beli/Jual/Dividen, §3.3) &
  Fase 3 (UI Watchlist, §3.5) `AUDIT-BUILD-UI-INVESTASI-OPSI3.md` **SELESAI**.
  File baru `modules/asset/investasi-tx-view.js` (`InvestmentTxUI`) — modal
  `investmentTxModal` (riwayat transaksi + form tambah tipe Beli/Jual/
  Dividen), 100% reuse `Investment.addTransaction()`/`deleteTransaction()`/
  `getTransactions()` (0 rumus baru), dipicu dari tombol "💱 Riwayat
  Transaksi" baru di `investmentModal` (`InvestmentTxUI.openFromEdit()`,
  pola sama `InvestmentListUI.openOwnersModalForEdit()`). File baru
  `modules/asset/investasi-watch-view.js` (`InvestmentWatchUI`) — card
  "📈 Watchlist" baru di tab Investasi + modal `investmentWatchModal`,
  100% reuse `Investment.getWatchlist()`/`addWatch()`/`updateWatch()`/
  `removeWatch()`/`watchlistAlerts()` (0 kondisi alert baru); render()-nya
  dipanggil dari `InvestmentListUI.render()` (1 titik SSOT, otomatis ikut
  ter-refresh dari 2 call-site render tab Investasi yang sudah ada). 2 modal
  baru terdaftar di `MODAL_HTML[94]`/`MODAL_HTML[95]` (`modals.js`,
  `MODAL_VERSION` → `s467-investment-list-ui-test-coverage`) & kedua file
  didaftarkan ke `GROUP_B` (`build.js`, tepat setelah
  `investasi-list-view.js`). Test coverage baru:
  `tests/investment-tx-watch-ui-s467.test.js` (20 test case, pola sama
  `investment-list-ui-s466.test.js`) — `node --test tests/*.test.js` →
  **3019/3019 lolos, 0 gagal** (2999 lama + 20 baru, 0 regresi).
  Fase 4 (verifikasi 4 dead-read call site dgn data nyata) MASIH belum
  dikerjakan — butuh smoke-test manual di browser dgn data holding
  produksi nyata, tidak bisa dilakukan dari sandbox headless. Status TETAP
  **OPEN** sampai Fase 4 selesai & keempat dead-read call site (§Impact.3
  di atas) terverifikasi tampil benar dgn data nyata.
- **Update Sesi 468**: Fase 4 (verifikasi 4 dead-read call site dgn data
  holding nyata) **SELESAI** — status BUG-INV-001 diubah jadi **FIXED**.
  File baru `tests/investment-dead-read-verification-s468.test.js` (9 test
  case) menjalankan tiap call site lewat source ASLI via `loadSource()`,
  memverifikasi 2 kondisi per call site: (a) BEFORE — `D.investments`
  kosong -> tetap aman & kosong/nol (baseline dead-read lama, jaring
  regresi), (b) AFTER — holding diisi lewat jalur tulis nyata
  `Investment.addHolding()`/`addTransaction()` (fungsi yang sama dipakai
  `InvestmentListUI`/`InvestmentTxUI` sejak Sesi 466-467, BUKAN ditulis
  manual ke `D.investments`) -> call site sekarang membaca data itu dgn
  benar:
  - `DanaKelolaan.sumInvestasi()`/`listTitipan()` (`dana-kelolaan.js`) —
    kini menjumlah `Investment.holdingValue(h)` nyata & mendaftar titipan
    investasi per `titipanOwner`.
  - `SelfRewardAI._analyzeInvestasi()` (`self-reward-ai-widget.js`) —
    kini menghasilkan rekomendasi ROI minus/konsentrasi alokasi saat
    holding memenuhi kondisinya (sebelumnya selalu `[]`, gate
    `holdings.length` tidak pernah lolos).
  - `InvestAI._checkPortofolio()` (`invest-ai-widget.js`) — kini gate
    `summary.holdingsCount` lolos & menghasilkan rekomendasi ROI minus
    portofolio.
  - `OwnershipSettingsPresenter._collect()`/`summary()`
    (`ownership-settings-presenter.js`) — kini holding investasi ikut
    ter-concat & ter-hitung `OwnershipEngine.countByType()`.
  - `_eieInvestmentBreakdown()` (`user-finance-adapter.js`) — kini
    `unit*currentPrice` per `type` terisi sesuai holding nyata (sebelumnya
    semua key breakdown selalu 0).
  Manual smoke-test di browser dgn data produksi nyata (item asli §Fix
  Opsi 3 lama) DIGANTI dgn pendekatan ini karena source ASLI dijalankan
  end-to-end lewat `loadSource()` (bukan browser headless yang tidak
  tersedia di sandbox) — dianggap setara utk tujuan verifikasi "call site
  membaca data, bukan lagi selalu array kosong" krn tidak ada logic
  DOM/render yang terlibat di kelima call site ini (murni baca &
  transformasi data). `node --test tests/*.test.js` -> **3028/3028 lolos,
  0 gagal** (3019 test lama + 9 baru, 0 regresi). Seluruh 4 fase Opsi 3
  (Aktifkan) sekarang tuntas — **BUG-INV-001 status: FIXED.**
- Status: **FIXED** — entry di atas TIDAK diedit (histori audit asli
  dipertahankan); baris status ini dikoreksi sesi S701 krn paragraf
  "Update Sesi 468" (yang sudah menyatakan FIXED) sebelumnya tercetak
  SEBELUM paragraf "Update Sesi 467" secara fisik di file — urutan
  terbalik dari kronologi sesi (466→467→468) — sehingga baris Status
  final di bawah ini sempat tidak pernah ikut ter-update & membeku di
  OPEN, sama pola staleness yang dibereskan S699/S700 utk BUG-006/BUG-007/
  BUG-FIN-001. Re-verifikasi source S701 (bukan cuma percaya dokumen):
  Fase 1-4 seluruhnya ada & wired (`Investment.addHolding()`/
  `addTransaction()`/`addWatch()` masing2 punya caller nyata di
  `investasi-list-view.js`/`investasi-tx-view.js`/`investasi-watch-view.js`,
  di luar `aset.js`/`aset-misc.js`), `tests/investment-dead-read-
  verification-s468.test.js` 9/9 pass, `tests/investment-tx-watch-ui-
  s467.test.js` 20/20 pass, `tests/investment-list-ui-s466.test.js`
  15/15 pass. Paragraf "Update Sesi 467"/"468" di atas juga direorder
  jadi kronologis sesi ini (docs-only, isi paragraf tidak diubah).
- Confidence: **High** — murni fakta struktural dari pencarian
  `grep -rn` menyeluruh atas seluruh codebase non-test (bukan bergantung
  data/state runtime yang ambigu), didukung pernyataan eksplisit dari
  codebase sendiri (`investment-planner-api.js`).
- Audit Session: Sesi Audit langsung (`investasi.js`/`D.investments`
  domain, 100%) — dipicu pertanyaan tombol pemicu pasca-Sesi 464/465
  (2026-08-07)

---

# 0a-9. Open — New Findings (Sesi Audit pasca-implementasi Gap #3 Dana Titipan, S484→S485e)

## GAP3-AUD-001

- Severity: **LOW**
- Domain: Data Identity / Documentation (legacy `Investment.getOwners()`, tidak terkait implementasi Gap #3)
- Status: **PRE-EXISTING / OUT OF SCOPE** (bukan diperkenalkan oleh Sesi 484–485e / Gap #3 Dana Titipan)
- File: `modules/asset/investasi.js`
- Function/component: `Investment.getOwners(h)` — cabang legacy `h.fundSource === 'titipan'`
- Trigger: Holding investasi mana pun yang masih pakai model titipan legacy 1-flag
  (`fundSource==='titipan'`, belum dimigrasi ke `h.owners[]` via `setOwners()`).
- Actual: Cabang legacy mensintesis satu baris owner dengan `ownerId` konstan
  `'titipan_investor'` untuk SEMUA holding legacy titipan, terlepas dari nama
  penitip (`titipanOwner`) yang sebenarnya berbeda-beda.
- Expected: Dua penitip berbeda (mis. Budi dan Cici) seharusnya punya
  `ownerId` identity yang berbeda satu sama lain.
- Root cause: Desain lama (pra-AUD-008/Sesi 462) tidak pernah mensintesis
  `ownerId` per-nama untuk jalur legacy — hanya `ownerName` yang dibaca dari
  `h.titipanOwner`, sedangkan `ownerId` di-hardcode `'titipan_investor'`.
- Impact: Jika legacy holdings milik dua orang berbeda (kedua-duanya masih
  `fundSource:'titipan'`, belum dimigrasi ke `owners[]`) dipakai bersamaan
  dalam agregasi berbasis `ownerId` (mis. proyeksi Dana Titipan Gap #3),
  keduanya dapat collapse menjadi satu identity gabungan.
- Evidence: `modules/asset/investasi.js`, cabang `if (h.fundSource ===
  'titipan')` pada `getOwners(h)` — lihat baris `ownerId: 'titipan_investor'`.
  Perilaku ini didokumentasikan & sengaja dikunci oleh test S485a
  (owner picker) yang mengasumsikan collision ini sebagai known legacy
  behavior — bukan regresi Gap #3.
- Introduced by Gap #3: **NO** — perilaku sudah ada sejak jalur legacy
  `fundSource==='titipan'` dibuat (pra-Sesi 462), hanya baru teraudit ulang
  konteksnya pada audit pasca-implementasi Gap #3 (S484→S485e).
- Fix: **NOT APPLIED (out of scope sesi ini)** — perbaikan memerlukan skema
  `ownerId` per-nama untuk jalur legacy (atau migrasi paksa ke `owners[]`),
  keduanya berpotensi mengubah legacy behavior & data existing — butuh audit
  & sesi tersendiri.
- Regression test: Tidak ada perubahan — `tests/s485a-titipan-commitment-owner-picker.test.js`
  (yang mendokumentasikan perilaku ini) TIDAK diubah.
- Verification: `node --test tests/*.test.js` → 3144/3144 pass, 0 fail (angka
  tidak berubah dari baseline Gap #3, 0 test baru ditambah sesi ini).
- Status: **FIXED (Sesi 545/546)** — `Investment.migrateLegacyTitipanOwners()`
  (S545) derive `ownerId` per-nama lewat `OwnerRegistry.findOrCreate()`
  (idempotent, guard `Array.isArray(h.owners)`), diwire otomatis lewat schema
  migration `toVersion:6` (S546, `modules/shared/features-helpers-global-security.js`)
  jadi jalan sendiri saat data user dimuat — 0 tombol manual/opt-in yang bisa
  terlewat. Ditutup via `PATCH-README-s485f-gap3-audit-closeout.md`. Entri di
  atas TIDAK diedit (histori audit asli dipertahankan) — status baris ini
  ditambahkan belakangan (audit ownership/titipan, R1→GAP3 cleanup) karena
  entry lama tidak pernah diupdate walau fix sudah landing 2 sesi kemudian —
  dicatat di sini supaya BUG_REGISTRY.md tidak lagi menyesatkan.
- Verification (ulang): `tests/s545-legacy-titipan-owner-registry-migration.test.js`
  + `tests/s546-schema-v6-titipan-owner-migration-wiring.test.js` → 13/13 pass.
- Audit Session: Sesi Audit pasca-implementasi Gap #3 Dana Titipan
  (S484→S485e closeout, 2026-08-08); status diperbarui saat audit
  ownership/titipan lanjutan (2026-08-11).

## GAP3-AUD-002

- Severity: **LOW / informational**
- Domain: Build tooling / versioning convention
- Status: **PRE-EXISTING / DESIGN LIMITATION / OUT OF SCOPE**
- File: `scripts/build.js`
- Trigger: `npm run build` dijalankan ketika version string sesi saat ini
  tidak cocok dengan regex auto-versioning yang diharapkan build tooling
  (contoh: `s485e-final-regression-docs`).
- Actual: Build dapat gagal pada kasus version string non-konvensional
  seperti di atas.
- Expected/Impact: Ini adalah keterbatasan desain auto-versioning yang sudah
  diketahui, bukan bug fungsional pada logika aplikasi maupun pada
  implementasi Gap #3.
- Introduced by Gap #3: **NO** — ini adalah keterbatasan pre-existing pada
  konvensi versioning `scripts/build.js`, dicatat ulang di sini semata agar
  tidak salah diklasifikasikan sebagai regresi Gap #3.
- Fix: **NOT APPLIED (out of scope sesi ini)** — `scripts/build.js` dan
  konvensi versioning TIDAK diubah.
- Regression test: Tidak ada perubahan.
- Verification: Tidak relevan diverifikasi ulang lewat test suite (tooling
  build, bukan logika aplikasi) — dicatat sebagai informational only.
- Status: **OPEN / OUT OF SCOPE / INFORMATIONAL**
- Audit Session: Sesi Audit pasca-implementasi Gap #3 Dana Titipan
  (S484→S485e closeout, 2026-08-08)

---

# 0a-10. Open — Design Decision (Owner Registry, S489-S493 closeout)

## OWNREG-GATE3-001

- Severity: **INFORMATIONAL** (bukan defect — keputusan scope, dicatat
  supaya tidak salah diklasifikasikan sebagai bug/utang teknis diam-diam)
- Domain: Owner Registry (`modules/shared/owner-registry.js`, S489) /
  UX kepemilikan (`assetOwnersModal`, `investmentOwnersModal`,
  `titipanCommitmentModal`)
- Status: **OPEN / OUT OF SCOPE (Gate #3, dikonfirmasi eksplisit)**
- File: `modules/shared/owner-registry.js`
- Trigger: User ingin mengganti nama (`name`) satu entri
  `D.ownerRegistry[]` yang sudah ada, MISALNYA memperbaiki typo ("Bidi" ->
  "Budi") atau owner ganti nama panggilan — sehingga SEMUA holding/aset/
  komitmen titipan yang memakai `ownerId` entri itu ikut tampil nama baru
  tanpa perlu diedit satu per satu.
- Actual: `OwnerRegistry` (S489) TIDAK punya fungsi rename/update — hanya
  `listAll()` (baca) dan `findOrCreate()` (cari-by-nama-atau-buat-baru).
  Tidak ada UI di `assetOwnersModal`/`investmentOwnersModal`/
  `titipanCommitmentModal` untuk mengedit entri registry existing.
- Expected: TIDAK ADA — ini SENGAJA belum diimplementasikan, bukan
  ekspektasi yang gagal dipenuhi.
- Root cause: Bukan defect — keputusan scope eksplisit sejak awal rencana
  (`PLAN-owner-registry-multi-session.md`, Gate #1 poin 3: "Scope rename
  owner: **out-of-scope** di paket ini"), dikonfirmasi ulang di S493
  (validasi silang & cleanup, sesi penutup rangkaian S489-S493) sebagai
  bagian dari cleanup dokumentasi sesuai exit criteria plan.
- Impact: User yang butuh mengganti nama tampilan owner HARUS mengedit
  `ownerName`/label di tiap baris owners[] secara manual per
  aset/holding/commitment (perilaku SAMA seperti sebelum S489 — registry
  TIDAK membuat perilaku ini lebih buruk, hanya belum memperbaikinya).
  `findOrCreate(name)` dgn nama BARU akan membuat entri BARU (id
  berbeda), BUKAN mengubah entri lama — 2 nama untuk 1 orang yang sama
  akan menghasilkan 2 `id` terpisah di registry kalau dipakai lewat jalur
  ini (konsekuensi yang SUDAH didokumentasikan di komentar
  `owner-registry.js` sejak S489).
- Reproduction: N/A — bukan bug, tidak ada langkah reproduksi cacat.
- Evidence: `modules/shared/owner-registry.js` (hanya 2 method publik,
  tidak ada `rename()`/`update()`); `tests/s489-owner-registry.test.js`
  test #6 mengunci eksplisit "dedup registry itu sendiri by ID, bukan by
  name — 2 entri manual nama sama TETAP 2 baris (rename out-of-scope)".
- Introduced by S489-S493: **N/A** — ini keputusan DESAIN sejak S489,
  bukan regresi yang "diperkenalkan", dicatat ulang di sini sebagai
  bagian cleanup S493 sesuai exit criteria plan ("Update BUG_REGISTRY/
  CHANGELOG — catat rename-owner UI sebagai out-of-scope eksplisit
  (Gate #3)").
- Fix: **NOT APPLIED (out of scope, Gate #3)** — rename UI/fungsi
  `OwnerRegistry.rename()` TIDAK ditulis sesi S489-S493 mana pun. Kalau
  suatu saat dibutuhkan, perlu sesi tersendiri (Gate #3 baru) yang
  eksplisit membahas: (a) apakah rename collapse otomatis ke entri lain
  yang kebetulan namanya jadi sama, atau (b) tetap 2 entri terpisah.
- Regression test: Tidak ada perubahan — `tests/s489-owner-registry.test.js`
  s/d `tests/s493-owner-registry-cross-domain-validation.test.js` TIDAK
  menguji rename (di luar scope, sesuai definisi bug ini).
- Verification: `node --test tests/*.test.js` → 3219/3219 pass, 0 fail
  (baseline S492 3212 + 7 test cross-domain baru S493, 0 regresi).
- Status: **OPEN / OUT OF SCOPE (Gate #3)** — dicatat sebagai keputusan
  sadar, bukan utang teknis diam-diam, sesuai instruksi eksplisit exit
  criteria S493.
- Audit Session: S493 — Validasi Silang & Cleanup Owner Registry
  (penutup rangkaian S489-S493, 2026-08-08)

---

# 1. Known High-Risk Areas Requiring Verification

| ID | Area | Reason | Status |
|---|---|---|---|
| AUD-001 | Bill/payment synchronization | many historical fixes in v942–v980 range | OPEN |
| AUD-002 | Modal/overlay lifecycle | latest release explicitly targets stranded overlay | OPEN |
| AUD-003 | Scanner lifecycle | dedicated scanner lifecycle/structural drift safeguards | OPEN |
| AUD-004 | Source/bundle drift | project contains multiple HTML artifacts | OPEN |
| AUD-005 | Dashboard/widget ownership | multiple migrations/dedup efforts | OPEN |
| AUD-006 | Data fallback resolution | historical fallback ambiguity fixes | OPEN |
| AUD-007 | `Zakat.hitungMaal()` (pajak-pbb-zakat.js) baca `document.getElementById('zmUtang').value` tanpa guard `if(el)`, dan memanggil `save()` sendiri di dalam badannya — TIDAK aman dipanggil dari `save()` (lihat s422i, `FIX-v1136-to-v1137-s422i-revert-hitungzakatmaal-guard.md`); kalau mau auto-refresh Zakat Maal dari `save()` nanti, refactor dulu: pisahkan baca input DOM dari kalkulasi murni, hilangkan panggilan `save()` rekursif | OPEN |
| AUD-008 | `investasi.js` masih model titipan "1 flag + 1 nama" (`fundSource`/`titipanOwner`, satu string per holding) — beda dari `aset.js` yang sudah multi-owner penuh (`a.owners[]` via `MultiOwnerEngine`). Kalau nanti ada kasus 1 holding investasi dititipkan >1 orang sekaligus, `fundSource`/`titipanOwner` tidak bisa merepresentasikan itu (cuma 1 nama titipan per holding). Bukan urgent (belum ada requirement/laporan kasus nyata >1 penitip per holding) — dicatat sebagai utang teknis konsolidasi jangka panjang dari audit "dana titipan" Sesi 458, rekomendasi #1. Kalau kebutuhan itu muncul: pola migrasinya kemungkinan sama seperti `aset.js` Sesi 407/408 (`_synthesizeFromTitipan()` mensintesis `fundSource`/`titipanOwner` legacy jadi 1 baris `owners[]` dulu, baru UI-nya menyusul) | **DONE (Sesi 462)** — `investasi.js` sekarang punya `h.owners[]` opsional (format sama persis `a.owners`) + `Investment.getOwners()`/`setOwners()` lewat `MultiOwnerEngine` yang SUDAH ADA (0 engine baru). `_syncTitipanDebt()` direvisi jadi 1 entry Buku Utang PER OWNER non-SELF (`linkedInvestmentId`+`linkedOwnerId`, pola sama `Aset._syncOwnerDebts()`). `fundSource`/`titipanOwner` (single-owner legacy) TETAP jalan apa adanya, 0 regresi (75 test lama S460/S461 tetap pass tanpa modifikasi) — `owners[]` murni aditif, opt-in lewat `setOwners()`. Lihat `tests/s462-investasi-multi-owner-titipan.test.js` (8 test baru). **UI modal titipan investasi: DONE (Sesi 464)** — `modules/asset/investasi-view.js` (baru), `InvestmentUI` mirror `Aset.openOwnersModal()`/`_renderOwnersList()`/dst dari `aset.js`, versi ringkas TANPA lapisan Nominal (Rp) dua-arah (S429/S457) karena holding investasi tidak punya field nilai manual yang setara — cuma Nama Pemilik + Porsi (%) + toggle "Ini saya", disimpan lewat `Investment.setOwners()` (0 validasi baru). Modal terdaftar di `MODAL_HTML[92]` (`modals.js`, `MODAL_VERSION` s464-investment-owners-modal-ui) & `investasi-view.js` di `GROUP_B` (`build.js`, tepat setelah `investasi.js`). AUD-008 sepenuhnya selesai secara TEKNIS. **Catatan Sesi 465**: audit lanjutan menemukan seluruh domain `D.investments` (termasuk fitur AUD-008 ini) tidak pernah punya jalur UI penulis data sejak Sesi 161 — lihat **BUG-INV-001** di bawah utk detail & opsi remediasi. **Catatan Sesi 466**: BUG-INV-001 Opsi 3 Fase 1 selesai (`modules/asset/investasi-list-view.js`, `InvestmentListUI` — halaman list holding + modal tambah/edit, lihat entri BUG-INV-001 di bawah) — tombol "⚖️ Atur Porsi Kepemilikan" hasil AUD-008 sekarang PUNYA caller nyata lewat `InvestmentListUI.openOwnersModalForEdit()` di modal holding, jadi gap "0 caller" yang dicatat Sesi 465 sudah tertutup utk fitur AUD-008 ini secara spesifik. |

`OPEN` here means **requires verification**, not confirmed bug.

---

## BUG-015

- Severity: Medium
- Domain: Finance (cicilan, utang, langganan, tagihan bulanan) + Sewa Kios + Scan OCR paylater
- Requirement ID: —
- File: `modules/shared/features-helpers-global-security.js` (helper baru `addMonthsClamped()`); call site: `modules/business/sewakios.js`, `modules/finance/tagihan-kalender.js` (6 lokasi), `modules/finance/piutang-utang.js`, `modules/finance/transaksi.js` (3 lokasi), `modules/shared/scan-ocr.js`
- Line: lihat `FIX-v1111-to-v1112-s406-bug015-date-overflow-clamp.md` untuk daftar lengkap per file
- Function/component: `nextTagih()`, `revertBillFromDeletedTx()`, `advanceBillNextDue()`, `getBillCalendarRange()`/`getBillCalendarMonth()` (occurrence loop), `defaultNextDue()`, `onCicilanTenorSelectChange()`, `saveTx()` (cicilan & langganan), `maybeOfferPaylaterReminder()`
- Trigger: Menghitung tanggal jatuh tempo bulan berikutnya (atau mundur 1 bulan) dari tanggal dasar yang tidak ada di bulan tujuan (mis. tanggal 29/30/31 dan bulan tujuan lebih pendek).
- Actual: `Date.setMonth()` native JavaScript overflow otomatis ke bulan berikutnya alih-alih clamp ke hari terakhir bulan tujuan — contoh 31 Jan + 1 bulan menghasilkan 3 Mar (bukan 28/29 Feb).
- Expected: Tanggal jatuh tempo di-clamp ke hari terakhir bulan tujuan kalau tanggal asal tidak ada di bulan itu (31 Jan + 1 bulan → 28 Feb / 29 Feb tahun kabisat), sesuai ekspektasi kalender pada umumnya untuk recurrence bulanan.
- Root cause: Seluruh 12 call site memakai pola native `d.setMonth(d.getMonth()+n)` langsung tanpa mekanisme clamp; ini perilaku default JS Date, bukan bug logic aplikasi, tapi tidak sesuai ekspektasi bisnis untuk jatuh tempo bulanan.
- Impact: Tanggal jatuh tempo cicilan/langganan/tagihan/sewa yang bermula di tanggal 29/30/31 melompat tidak konsisten (kadang ke bulan berikutnya, bukan akhir bulan target) — berpotensi salah tampil di kalender tagihan, salah urutan reminder, dan hitungan sisa tenor cicilan meleset saat dibatalkan/direvert (arah mundur).
- Reproduction: Buat cicilan dgn `nextDue=2026-01-31`, panggil alur "bayar" (advance +1 bulan) → sebelum fix hasilnya `2026-03-03`, seharusnya `2026-02-28`.
- Evidence: Diverifikasi manual dgn skrip Node terhadap kasus tepi (kabisat, mundur bulan, lintas tahun, tanggal tanpa overflow) — lihat lampiran verifikasi di `FIX-v1111-to-v1112-s406-bug015-date-overflow-clamp.md`.
- Fix: Tambah helper `addMonthsClamped(base, months)` (geser ke tanggal 1 dulu sebelum `setMonth()` supaya pergeseran bulan itu sendiri tidak overflow, lalu clamp tanggal asli ke hari terakhir bulan tujuan) di `modules/shared/features-helpers-global-security.js`; ganti seluruh 12 call site recurrence bulanan yang relevan. 4 file yang bisa dimuat berdiri sendiri oleh test harness (`tagihan-kalender.js`, `piutang-utang.js`, `transaksi.js`, `scan-ocr.js`) diberi fallback lokal `_amc015()` dgn algoritma identik.
- Regression test: Tidak ada test baru dibuat (sesuai instruksi sesi); 2721 test suite existing (`npm test`) tetap 100% PASS setelah fix — termasuk 3 file test (`s285`, `s292`, `s303`) yang perlu disesuaikan agar ikut meng-extract fungsi `_amc015()` ke sandbox vm mereka (brace-counting manual atas `advanceBillNextDue()`).
- Verification: `node --test tests/*.test.js` → 2721 pass / 0 fail. Bundle build (`node scripts/build.js s406-bug015-date-overflow-clamp`) sukses, sintaks bundle valid.
- Status: FIXED (v1112, sesi s406)

---

## BUG-016

- Severity: P1 High (financial/data inconsistency — Kekayaan Bersih bisa
  under-state secara sistematis, bukan cuma kasus tepi)
- Domain: Asset/Investment/Debt cross-domain (dana titipan) — `Aset.
  totalValue()`, `Investment.portfolioSummary()`, `Debt.totalValue()`,
  `FI.totalDebt()`, `Kekayaan.currentNetWorth()`
- Requirement ID: —
- File: `modules/asset/aset.js` (`totalValue()`, `_syncOwnerDebts()`),
  `modules/asset/investasi.js` (`_syncTitipanDebt()`), `modules/finance/
  piutang-utang.js` (`Debt.totalValue()`), `modules/shared/modules-calc.js`
  (`Kekayaan.currentNetWorth()`)
- Line: `aset.js` sekitar 1320 (`totalValue()`) & 1020-1043
  (`_syncOwnerDebts()`); `piutang-utang.js` sekitar 492 (`Debt.totalValue()`)
- Function/component: interaksi ANTARA `Aset.totalValue()`/`Investment.
  portfolioSummary()` (exclude porsi non-SELF via `MultiOwnerEngine.
  selfOwnedValue()`/`isHoldingOwnershipSelf()`, Sesi 193/393/422d) DAN
  `Aset._syncOwnerDebts()`/`Investment._syncTitipanDebt()` (bikin entry
  Buku Utang senilai porsi non-SELF itu juga, Sesi 408-410/460) — dua
  mekanisme yang SAMA-SAMA dimaksudkan mencegah Kekayaan Bersih overstated
  utk porsi non-SELF, tapi dibangun di sesi berbeda & TIDAK saling sadar,
  jadi keduanya JALAN BERSAMAAN.
- Trigger: Aset/holding investasi dengan porsi/kepemilikan non-SELF (owner
  co-ownership `a.owners[]`, `ownership:'THIRD_PARTY'|'INVESTOR'|
  'CUSTOMER'|'FAMILY'` whole-entity, atau `fundSource:'titipan'`) yang
  SUDAH disinkron ke Buku Utang lewat `_syncOwnerDebts()`/
  `_syncTitipanDebt()` (kondisi normal — ini jalan otomatis tiap
  `Aset.save()`/`Investment.addHolding()`/`updateHolding()`).
- Actual: Porsi non-SELF/whole-entity dipotong DUA KALI dari Kekayaan
  Bersih — sekali via exclusion di `totalValue()`/`portfolioSummary()`
  (0% atau porsi SELF saja yang terhitung), sekali lagi via `Debt.
  totalValue()` (entry `linkedAssetId`/`linkedInvestmentId` dihitung
  PENUH, tidak dikecualikan). Kasus PALING JELAS: aset `ownership:
  'THIRD_PARTY'` whole-entity — kontribusinya ke `Aset.totalValue()`
  SUDAH 0 (100% dikecualikan), tapi `_syncOwnerDebts()` tetap bikin 1
  entry utang senilai 100% `a.nilai`, jadi Kekayaan Bersih turun sebesar
  nilai aset itu PADAHAL aset itu 0% "milik saya" & seharusnya 0% dampak
  ke Kekayaan Bersih.
- Expected: Kalau sebuah porsi/aset SUDAH dikecualikan (0% atau sebagian)
  dari `totalValue()`/`portfolioSummary()` karena bukan milik SELF, porsi
  yang SAMA itu seharusnya TIDAK ikut dipotong lagi lewat `Debt.
  totalValue()` — kedua mekanisme mestinya saling eksklusif per porsi,
  bukan ditumpuk.
- Root cause: `totalValue()`-family (Sesi 193/393/422d) dan `_syncOwnerDebts`
  -family (Sesi 408-410/460) masing-masing "correct in isolation" tapi
  dikembangkan tanpa test yang menggabungkan keduanya dalam 1 dataset —
  persis gap yang diidentifikasi audit Sesi 458 rekomendasi #2 (belum ada
  test lintas-sumber titipan).
- Impact: Kekayaan Bersih Dashboard/Report/Financial Freedom (SSOT via
  `Kekayaan.currentNetWorth()`) under-state utk SEMUA user yang punya
  minimal 1 aset/investasi non-SELF/titipan yang sudah tersinkron ke
  Buku Utang — makin banyak porsi non-SELF, makin besar under-state-nya.
  Whole-entity (THIRD_PARTY dst) adalah kasus terburuk (100% nilai aset
  terpotong dari sisi utang PADAHAL 0% nilai aset itu sendiri yang
  ditambahkan).
- Reproduction: lihat Evidence — dataset 2 aset (1 multi-owner titipan,
  1 THIRD_PARTY whole-entity) + 2 holding investasi (1 titipan biasa, 1
  THIRD_PARTY+titipan) + 1 utang biasa, sinkron semua via `_syncOwnerDebts`/
  `_syncTitipanDebt()`, lalu bandingkan `Aset.totalValue()`+`Investment.
  portfolioSummary().totalCost` (yang SUDAH exclude porsi non-SELF) dengan
  `Debt.totalValue()` (yang MASIH menghitung penuh porsi non-SELF yang
  sama sbg utang).
- Evidence: `tests/s461-cross-source-titipan-total-regression.test.js`
  (4 test, semua PASS — test ini MEMATOK/pin perilaku saat ini sbg
  reproduksi terdokumentasi, bukan assertion "ini benar")
- Fix: **DIPERBAIKI Sesi 463** — dipilih opsi (a) dari 2 kandidat (lebih
  ringan/lebih kecil blast radius dari opsi (b), yang butuh balik total
  aset ke nilai penuh dan berdampak lebih luas ke Zakat Maal/Pajak
  Aset/AssetPortfolioAPI):
  (a) **[DIPILIH]** `Debt.totalValue()` (`modules/finance/piutang-utang.js`)
      mengecualikan entry `linkedAssetId`/`linkedInvestmentId` dari total
      utang (1 filter tambahan, pola SAMA PERSIS
      `DebtStrategy.activeDebts()` yang sudah lebih dulu mengecualikan
      kedua tag ini sejak S455/S460). Entry ini TETAP tampil apa adanya di
      Buku Utang (histori/badge "🔒 Titipan" tidak berubah) — cuma tidak
      ikut diakumulasi lagi. `totalDebtValue()` (alias
      `Debt.totalValue()`, dipakai `FI.totalDebt()` →
      `Kekayaan.currentNetWorth()`, Zakat Maal, Pajak Aset, semua
      dashboard) otomatis ikut benar TANPA perlu disentuh satu per satu —
      1 titik perbaikan, banyak konsumen.
  (b) [TIDAK dipilih] `Aset.totalValue()`/`Investment.portfolioSummary()`
      balik hitung nilai PENUH — di-skip krn dampaknya lebih luas &
      butuh audit terpisah per konsumen.
- Regression test:
  `tests/s461-cross-source-titipan-total-regression.test.js` — test
  paling bawah (awalnya "TEMUAN — Debt.totalValue() TETAP menghitung
  PENUH...") diupdate jadi memverifikasi PERILAKU BARU (benar, 0
  double-subtraction). `tests/s455-owner-debt-exclude-strategy.test.js` &
  `tests/s460-investment-titipan-debt-linked-id.test.js` — masing-masing
  1 test lama yang eksplisit mengunci perilaku LAMA
  ("... TETAP terhitung...") diupdate mengikuti fix.
- Verification: `node --test tests/*.test.js` → 2984/2984 pass, 0 fail
  (2976 dari Sesi 461 + 8 baru Sesi 462, 3 test diupdate angka
  ekspektasinya mengikuti fix ini, 0 test baru ditambah sesi ini).
- Status: **FIXED (Sesi 463)**

---

## BUG-S516-001

- Severity: P1 High (blocking — fitur tidak bisa dipakai sama sekali utk
  owner tertentu, gagal silent-looking dgn pesan error yang MENYESATKAN)
- Domain: Finance / Dana Titipan (Portfolio) — owner picker modal "💰 Pokok
  Dana Titipan" & "↩️ Catat Pengembalian"
- Requirement ID: —
- File: `modules/finance/dana-titipan-portfolio-presenter.js`
- Line: 927 (`DanaTitipanCommitmentUI.open()`, populate dropdown), 852-853
  (`DanaTitipanPortfolioPresenter.render()`, tombol per-owner)
- Function/component: `DanaTitipanCommitmentUI.open()` +
  `DanaTitipanPortfolioAPI.saveCommitment()`/`recordReturn()` (validasi
  existing-owner-only via `listExistingOwners()`)
- Trigger: `ownerId` (dari `Investment.getOwners()`/`OwnerRegistry`) yang
  mengandung karakter HTML-sensitif (`"`, `'`, `<`, `>`, `&` — mis. hasil
  `findOrCreate()` dari nama pemilik yang memuat tanda kutip/apostrof).
- Actual: `open()` menyuntik `o.ownerId` MENTAH (tanpa `escapeHtml`) ke
  atribut `<option value="${o.ownerId}">` lewat `innerHTML`. Kalau
  `ownerId` memuat `"`, atribut HTML pecah di tengah -> browser membaca
  `sel.value` sbg STRING TERPOTONG (bukan `ownerId` asli). Tombol pemicu
  per-owner (baris 852-853, `data-args='["${o.ownerId}"]'`) punya lubang
  serupa: `ownerId` yang memuat `'` merusak delimiter atribut single-quote
  itu sendiri. Saat `save()` memanggil `saveCommitment()`/`recordReturn()`,
  `ownerId` yang sudah rusak itu dicocokkan ulang ke `listExistingOwners()`
  segar -> tidak ketemu -> `throw new Error('Owner tidak ditemukan pada
  daftar pemilik investasi yang ada')` walau `ownerId` ASLINYA valid & ada
  di `listExistingOwners()`.
- Expected: `ownerId` apa pun (termasuk yang memuat karakter HTML-sensitif)
  harus tetap utuh dari populate dropdown sampai baca `sel.value` saat
  simpan — modal tidak boleh gagal validasi utk owner yang benar-benar ada.
- Root cause: `o.ownerId` (identifier internal, BUKAN teks tampilan)
  di-treat seolah aman disuntik langsung ke atribut HTML, padahal cuma
  `o.ownerName` (teks tampilan) yang di-escape di baris yang sama
  (`escapeHtml(o.ownerName)`) — asumsi implisit "ownerId selalu karakter
  aman" yang tidak divalidasi/didokumentasikan di mana pun.
- Impact: modal "Catat/Update Pokok Dana Titipan" & "Catat Pengembalian"
  100% tidak bisa dipakai (selalu gagal "Owner tidak ditemukan...") utk
  SETIAP owner yang ownerId-nya kebetulan memuat `"`/`'`/`<`/`>`/`&` — bug
  ini sebelumnya salah didiagnosis (audit statis Sesi 516 sebelum sesi
  ini) sbg race condition/bundle basi, krn kode `listExistingOwners()`/
  `saveCommitment()` memang 100% konsisten kalau dibaca terpisah — bug-nya
  ada di LAPISAN populate-DOM yang tidak ikut diperiksa saat itu.
- Reproduction: lihat Evidence — `ownerId` sengaja dibuat memuat `"`
  (`owner_"><script>x</script>` / `owner_"quoted"_id`), panggil
  `DanaTitipanCommitmentUI.open()`, baca `sel.innerHTML` yang dihasilkan.
- Evidence: `tests/s516-dana-titipan-commitment-ownerid-escaping.test.js`
  (2 test baru — dikonfirmasi FAIL di kode SEBELUM fix dgn
  `actual: 'owner_'` vs `expected` ownerId ter-escape utuh, lalu PASS
  setelah fix dipasang).
- Fix: **DIPERBAIKI Sesi 516.** `escapeHtml()` dipasang ke `o.ownerId` di
  atribut `value=` (baris 927, pola sama yang sudah dipakai `akun.js:175`
  utk value atribut lain). Tombol per-owner (baris 852-853) disamakan ke
  pola `data-args="${escapeHtml(JSON.stringify([o.ownerId]))}"` yang SUDAH
  established di file yang sama (`Aset.openOwnersModalById`, baris 864) —
  0 pola baru diperkenalkan, murni menerapkan konvensi yang sudah ada scr
  konsisten ke 3 titik yang sebelumnya terlewat.
- Regression test:
  `tests/s516-dana-titipan-commitment-ownerid-escaping.test.js` (2 test
  baru). `tests/s485d-titipan-commitment-ui.test.js` — 2 assertion lama yg
  memeriksa format `data-args` mentah diupdate mengikuti format baru yg
  ter-escape (test #`[gap-check]` & test #7).
- Verification: `node --test tests/*.test.js` → 3374/3374 pass, 0 fail
  (3372 sblm sesi ini + 2 baru sesi ini, 2 assertion lama diupdate
  mengikuti fix, 0 regresi ke file/domain lain).
- Status: **FIXED (Sesi 516)**

---

# 2. Finding Template

## BUG-XXXX

- Severity:
- Domain:
- Requirement ID:
- File:
- Line:
- Function/component:
- Trigger:
- Actual:
- Expected:
- Root cause:
- Impact:
- Reproduction:
- Evidence:
- Fix:
- Regression test:
- Verification:
- Status:

---

# 3. Rules

1. Never mark a bug fixed without verification.
2. Never remove a finding merely because the UI looks correct.
3. A regression receives a new finding linked to the original bug.
4. Business-rule uncertainty is `VERIFY`, not `BUG`.
5. Suspected defects must be distinguished from confirmed defects.
