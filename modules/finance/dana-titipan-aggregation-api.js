// dana-titipan-aggregation-api.js — Dana Titipan dalam Investasi:
// Portfolio Allocation Projection (Sesi 484 + Sesi 485a-e + Sesi 486 +
// Sesi 499/B1 + Sesi B2 + Sesi E + Sesi 554 + Sesi 594).
//
// SESI R5 — REALISASI (sesi ini, menggantikan percobaan split S562-S563
// yang sempat DIVERGEN dari produksi): file ini adalah PECAHAN PERTAMA
// dari `dana-titipan-portfolio-presenter.js` (monolit produksi, 1789
// baris, isi 3 concern sekaligus). Sumber split kali ini adalah versi
// PRODUKSI TERKINI (s597, sudah termasuk fix S554/S594 doublecount aset
// bermigrasi + fitur "Estimasi dari Transaksi <Akun>" S597) — BUKAN versi
// lama S563 yang jadi orphan (ketinggalan fix-fix itu). Split MURNI
// structural — 0 rumus/logic diubah dari versi produksi s597, cuma
// dipindah apa adanya:
//   1. `dana-titipan-aggregation-api.js` (file ini) — bagian `build()`/
//      helper agregasi (murni hitung, read-only, TIDAK PERNAH menulis ke
//      `D`). Mendefinisikan `const DanaTitipanPortfolioAPI = {...}`.
//   2. `dana-titipan-commitment-return-api.js` — CRUD
//      Commitment/Return (`saveCommitment`/`deleteCommitment`/
//      `recordReturn`/`deleteReturn`/dst). MENAMBAH method ke object
//      `DanaTitipanPortfolioAPI` yang SAMA (lewat `Object.assign`, BUKAN
//      redeclare `const` baru) — jadi WAJIB dimuat SETELAH file ini.
//   3. `dana-titipan-portfolio-render.js` — render/UI
//      (`DanaTitipanPortfolioPresenter`/`DanaTitipanCommitmentUI`/
//      `DanaTitipanReturnUI`, termasuk `_expenseComparisonForOwner()`
//      Sesi C/S597). WAJIB dimuat SETELAH file 1 & 2 (semua panggilan
//      API di sana sudah fully-qualified `DanaTitipanPortfolioAPI.xxx()`,
//      0 perubahan diperlukan akibat split).
//
// `scripts/build.js` memuat KETIGA file ini berurutan (ganti 1 entry
// lama `dana-titipan-portfolio-presenter.js`, file itu DIHAPUS sesi ini
// — lihat FIX-s598-r5-presenter-split-realized.md).
//
// dana-titipan-portfolio-presenter.js — Dana Titipan dalam Investasi:
// Portfolio Allocation Projection (Sesi 484 + Sesi 485a-e + Sesi 486 +
// Sesi 499/B1 + Sesi B2 + Sesi E).
//
// SESI E (PROMPT-SESI-E-ALLOCATEDEXCLUDING-LINTAS-DOMAIN.md — fondasi
// utk fitur Kuota Dana Titipan di `assetOwnersModal`, sesi UI-nya
// BELUM dikerjakan di sini): `allocatedExcluding(ownerId, holdingId)`
// (S494) tadinya HANYA membaca domain Investment (`_holdingSplits()`),
// padahal `build()` sudah lintas Investment + Aset sejak Sesi B1/S499
// — jadi tidak aman dipakai fondasi kuota Aset. Digeneralisasi jadi
// `allocatedExcluding(ownerId, exclusion)`: `exclusion` boleh tetap
// string/`holdingId` (BENTUK LAMA, 100% backward-compatible — 0
// caller lama diubah, `investasi-view.js` tetap manggil apa adanya)
// ATAU object `{holdingId, assetId}` (BENTUK BARU, exclude instrumen
// di KEDUA domain sekaligus). 100% REUSE `_holdingSplits()` +
// `_assetSplits()` yang SAMA PERSIS dipakai `build()` — 0 rumus baru,
// 0 SSOT baru, 0 sentuhan `assetOwnersModal`/`aset.js`/
// `investmentOwnersModal`/`OwnershipEngine`/`MultiOwnerEngine`/
// `OwnerRegistry`/`D.titipanCommitments` schema/`build()` itu sendiri.
//
// SESI B2 (F2 Opsi B, lanjutan Sesi 499/B1 — AUDIT-SESI-B-PERLUASAN-ASET.md
// §3.1): baris `holdings[]` sekarang punya flag `hasGainTracking`
// (`true` utk baris Investasi, `false` utk baris Aset — Aset tidak
// punya cost-basis terpisah dari nilai kini, `gain` selalu 0 sejak B1).
// `renderInto()` pakai flag ini utk SEMBUNYIKAN panah "Pokok → Kini
// ±gain" khusus baris `hasGainTracking:false`, ganti tampilan "Nilai: Rp
// X" polos (0 P&L palsu ditampilkan). 0 rumus baru — murni cabang
// tampilan di markup, `build()`/`_assetSplits()`/`_asetOwnersForTitipan()`
// (F1) TIDAK disentuh sama sekali.
//
// SESI 486 (Case F: Partial Return / Pengembalian Dana Titipan, lihat
// RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md — menutup "Remaining
// limitations" terakhir yang dicatat eksplisit di penutup Gap #3,
// RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md § "Ringkasan Akhir"): tambah
// `D.titipanReturns[]` — LOG/riwayat pengembalian (BUKAN upsert seperti
// `titipanCommitments`), lewat `recordReturn()`/`getReturns()`/
// `deleteReturn()` baru di `DanaTitipanPortfolioAPI`. `build()` extend 2
// field derived baru per owner: `returnedTotal` (selalu angka, default
// 0) & `outstandingPrincipal` (null kalau `principalAmount` null,
// kalau tidak `max(0, principalAmount-returnedTotal)`, tidak pernah
// negatif) — TIDAK disimpan ke `D` sama sekali. UI baru
// `DanaTitipanReturnUI` (modal `titipanReturnModal`, owner READONLY —
// beda dari `titipanCommitmentModal` yang dropdown, karena return
// selalu terikat ke owner kartu yang sedang dibuka) + extend
// `render()` (baris "Sudah Dikembalikan"/"Pokok Belum Dikembalikan" +
// riwayat + tombol "↩️ Catat Pengembalian"). 0 sentuhan
// OwnershipEngine/MultiOwnerEngine/investasi.js/akun.js (HARD RULE sama
// seperti seluruh Gap #3).
//
// SESI 485c (Gap #3 audit, langkah 3/5 dari rencana multi-sesi — lihat
// RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md): extend `build()` —
// projection sekarang UNION owner dari `D.titipanCommitments[]` +
// owner hasil agregasi holding (sebelumnya build() HANYA melihat owner
// dari holding; owner yang sudah komit tapi belum punya holding sama
// sekali sekarang tetap muncul dgn allocated/currentValue/gain = 0).
// Tiap owner sekarang punya field baru: `principalAmount` (dari
// commitment, `null` — BUKAN 0 — kalau owner itu belum punya record
// commitment sama sekali), `estimatedUnallocated` (null kalau
// principalAmount null, kalau tidak `max(0, principal-allocated)`),
// `overAllocatedAmount` (`max(0, allocated-principal)`, 0 kalau tidak
// over-alokasi atau principal belum ada), `allocationStatus` (`'OK'` /
// `'OVER_ALLOCATED'` / `'PRINCIPAL_NOT_SET'`). `totals` dapat 3 field
// baru: `principalAmountTotal`, `estimatedUnallocatedTotal` (HANYA
// dijumlah dari owner yang principal-nya sudah diset — owner
// `PRINCIPAL_NOT_SET` tidak ikut menyumbang, konsisten dgn nilai
// `estimatedUnallocated`-nya yang `null`), `overAllocatedTotal`. 0 rumus
// baru di luar itu — `allocatedPrincipal`/`currentValue`/`gain` per
// owner/holding TETAP 100% reuse mekanisme S484 lama (tidak disentuh).
//
// SESI 485b (langkah 2/5): CRUD backend murni utk `D.titipanCommitments[]`
// — `saveCommitment()` (upsert by `ownerId`, existing-owner-only via
// `listExistingOwners()`, TIDAK PERNAH generate identity baru) +
// `getCommitments()` (getter read-only). Isolasi total dari
// `D.accounts`/`D.transactions`/`D.investmentTx`/`D.investments`/
// `D.debts` (lihat test regresi §"tidak mengubah data lain").
//
// SESI 485a (langkah 1/5): fondasi data model `D.titipanCommitments[]`
// (init lazy, TIDAK ditulis file ini sesi itu) + `listExistingOwners()`
// (owner picker read-only, lihat komentar di fungsinya).
//
// TARGET EKSPLISIT USER: audit menemukan `DanaKelolaan.listTitipan()` cuma
// menjumlah cost basis (holdingCost) per entri titipan, TIDAK menampilkan
// nilai sekarang / unrealized P&L per instrumen, DAN datanya flat list
// (bukan digrupkan per pemilik dana lintas semua holding). Sesi ini
// menutup KEDUA gap itu (#1 nilai/P&L per baris, #2 grouping per owner)
// TANPA menyentuh gap #3 (belum ada entitas "pokok dana titipan" top-down
// / kas belum diinvestasikan / validasi over-allocation — MENUNGGU
// keputusan desain data terpisah, SENGAJA tidak dikerjakan di sini).
//
// PRINSIP (0 engine baru, 0 SSOT baru, 0 rumus finansial baru, 0 perubahan
// business logic/ownership engine/multi-owner engine/investment engine/
// schema holding): file ini MURNI proyeksi read-only yang mengelompokkan
// & menyajikan ulang angka yang SUDAH FINAL dari:
//   - `Investment.getHoldings()`/`getOwners(h)` (investasi.js, Sesi 462) —
//     daftar holding & pemilik EFEKTIF per holding (toleran h.owners[]
//     multi-owner, fundSource/titipanOwner single-owner legacy, default
//     SELF — SATU titik baca yang SUDAH ADA, tidak disintesis ulang di
//     sini).
//   - `Investment.holdingCost(h)`/`holdingValue(h)`/`holdingGainLoss(h)`
//     (investasi.js) — pokok/nilai sekarang/untung-rugi SELURUH holding,
//     dipakai APA ADANYA (0 rumus baru).
//   - `MultiOwnerEngine.splitByPorsi(nilai, owners)` (multi-owner-engine.js,
//     SUDAH ADA & PURE) — satu-satunya mekanisme "bagi nilai per porsi
//     owner" yang dipakai di codebase ini (dipanggil terpisah utk cost/
//     value/gain, supaya definisi "bagian owner" pada tiap angka 100%
//     konsisten dgn cara `_syncTitipanDebt()` di investasi.js menghitung
//     nilai utang per owner — TIDAK ada definisi valuasi baru dibuat di
//     sini).
//
// Guard typeof berlapis di setiap fungsi (pola SAMA PERSIS DanaKelolaan.*)
// supaya modul ini aman dimuat/dites berdiri sendiri & tidak pernah crash
// kalau satu holding malformed/legacy/data valuasi tidak lengkap —
// holdingCost/holdingValue/holdingGainLoss sendiri sudah fallback ke 0
// utk field yang hilang (`h.unit||0` dst), jadi tidak perlu guard
// tambahan di sini utk itu.
const DanaTitipanPortfolioAPI = {

// _holdingSplits(h) — helper internal: pecah cost/value/gain SATU holding
// per baris owner (urutan owners[] SAMA PERSIS urutan splitByPorsi() utk
// ketiganya, jadi index-aligned & aman di-zip). Balikin null kalau
// dependency belum dimuat / owners tidak valid (gagal validateOwners()
// via splitByPorsi) — caller (build()) skip holding itu, tidak throw.
_holdingSplits(h) {
  if (!h || typeof Investment === 'undefined' || typeof MultiOwnerEngine === 'undefined') return null;
  if (typeof Investment.getOwners !== 'function') return null;
  const owners = Investment.getOwners(h);
  if (!Array.isArray(owners) || !owners.length) return null;
  const cost = (typeof Investment.holdingCost === 'function') ? (Investment.holdingCost(h) || 0) : 0;
  const value = (typeof Investment.holdingValue === 'function') ? (Investment.holdingValue(h) || 0) : 0;
  const gain = (typeof Investment.holdingGainLoss === 'function') ? (Investment.holdingGainLoss(h) || 0) : (value - cost);
  const costSplit = MultiOwnerEngine.splitByPorsi(cost, owners);
  const valueSplit = MultiOwnerEngine.splitByPorsi(value, owners);
  const gainSplit = MultiOwnerEngine.splitByPorsi(gain, owners);
  if (!costSplit.ok || !valueSplit.ok || !gainSplit.ok) return null;
  return { owners, costSplit: costSplit.splits, valueSplit: valueSplit.splits, gainSplit: gainSplit.splits };
},

// _asetOwnersForTitipan(a) — SESI B1 (AUDIT-SESI-B-PERLUASAN-ASET.md §2.3,
// fix F1). Replikasi PERSIS pola guard `Investment.getOwners(h)` (di atas)
// utk domain Aset: HANYA percaya `a.owners[]` EKSPLISIT (multi-owner,
// hasil `Aset.saveOwners()`) — TIDAK PERNAH memakai hasil SINTESIS
// `MultiOwnerEngine.getOwners(a)` dari `a.ownership` (field whole-entity
// dari OwnershipEngine, S231) sebagai identitas pemilik dana titipan.
// Kalau dipanggil mentah tanpa guard ini, SEMUA aset lama yang cuma
// pernah diisi dropdown Kepemilikan (belum pernah buka modal "Atur Porsi
// Kepemilikan") akan disintesis jadi 1 "owner" palsu ber-ownerId sentinel
// generik ('THIRD_PARTY'/'INVESTOR'/'CUSTOMER'/'FAMILY') yang TIDAK
// pernah match identitas nyata di `OwnerRegistry`/`D.titipanCommitments`.
// 0 rumus baru — guard SAMA PERSIS `Investment.getOwners()`, cuma
// dipindah lokasinya ke domain Aset.
// Return: array owners[] (hasil MultiOwnerEngine.getOwners(a).owners
//   kalau EKSPLISIT/tidak disintesis) — [] kalau tidak ada `a.owners[]`
//   eksplisit sama sekali (termasuk kalau `a` cuma punya `a.ownership`
//   legacy, atau MultiOwnerEngine belum dimuat).
_asetOwnersForTitipan(a) {
  if (!a || typeof MultiOwnerEngine === 'undefined') return [];
  if (typeof MultiOwnerEngine.getOwners !== 'function') return [];
  const res = MultiOwnerEngine.getOwners(a);
  if (res && res.ok && !res.isSynthesized) return res.owners;
  return [];
},

// _assetSplits(a) — helper internal, pola SAMA PERSIS `_holdingSplits(h)`
// di atas, tapi utk domain Aset (SESI B1, AUDIT-SESI-B-PERLUASAN-ASET.md
// §3.1, F2 Opsi A — direkomendasikan audit): Aset TIDAK punya cost-basis
// terpisah dari nilai kini (cuma `a.nilai`, 1 angka, beda dari Investasi
// yg py holdingCost/holdingValue/holdingGainLoss 3 angka) — jadi
// `allocatedPrincipal = currentValue = porsi% x a.nilai`, `gain` SELALU
// 0 (0 info palsu, konsisten scr angka; TIDAK menambah field baru
// `hasGainTracking` ke kontrak keluaran, itu Opsi B/follow-up, ditunda).
// Balikin null (caller/build() skip aset itu, tidak throw) kalau
// dependency belum dimuat ATAU `_asetOwnersForTitipan()` balik [] (aset
// itu belum pernah diatur porsi majemuk eksplisit — SENGAJA di-skip,
// bukan bug, lihat komentar `_asetOwnersForTitipan()` di atas).
// PERUBAHAN SESI 554 (audit user, Agustus 2026 — laporan "Schorder"/owner
// "renov" tercatat 2x di tab Dana Titipan): SEBELUM sesi ini, `_assetSplits()`
// TIDAK PERNAH mengecek `a.investmentId` — begitu user menautkan Aset ke
// Holding Investasi lewat dropdown "🔗 Hubungkan ke Holding Investasi" (B1),
// instrumen yang sama kena hitung 2x di `build()`/`allocatedExcluding()`
// (KEDUA satu-satunya caller helper ini): 1x lewat porsi `h.owners[]` di
// domain Investment, 1x LAGI lewat porsi `a.owners[]` di domain Aset — angka
// `allocatedPrincipal` per owner jadi dobel padahal itu uang yang SAMA. Fix:
// skip aset yang `a.investmentId` terisi — logic exclude PERSIS SAMA yang
// sudah dipakai `Aset.totalValue()` (aset.js, `.filter(a=>!a.investmentId)`,
// Sesi B8) supaya definisi "aset ini masih dihitung di mana" konsisten
// lintas Kekayaan Bersih & Dana Titipan (0 pengecekan holding-nya masih ada
// atau tidak — SENGAJA unconditional, sama seperti totalValue(): kalau
// linknya orphan, aset itu tetap dianggap "milik" holding yang sudah
// terhapus, konsisten dgn pesan cek health-check "Aset tertaut ke Holding
// Investasi yang sudah dihapus"). Fix ini di `_assetSplits()` (bukan
// duplikasi di `build()`/`allocatedExcluding()` masing-masing) supaya KEDUA
// caller otomatis ikut benar, 0 logic ganda.
// FIX s594 (laporan user: "🏦 Majoris" masih tampil di Dana Titipan
// walau sudah tidak ada di Buku Aset). ROOT CAUSE: aset yang sudah
// dipindah OTOMATIS ke Holding Investasi lewat
// `migrateAssetInvestmentsToHoldings()` (aset-misc.js, s476a) DITANDAI
// `a._migratedToInvestmentId = holding.id` — flag ADITIF, aset asal
// TETAP ADA di `D.assets` (bukan dihapus, biar reversible), cuma
// DISEMBUNYIKAN dari daftar Buku Aset (`Aset.renderList()` filter
// `!a._migratedToInvestmentId`). `Aset.totalValue()` SUDAH benar
// exclude aset ber-`_migratedToInvestmentId` (DAN `investmentId`,
// dua mekanisme tautan berbeda — lihat komentar di atas fungsi ini
// utk `investmentId`/tautan manual B1). `_assetSplits()` di sini
// SEBELUMNYA cuma cek `a.investmentId` (tautan manual), TIDAK cek
// `_migratedToInvestmentId` (tautan migrasi otomatis) — jadi aset
// yang sudah "pindah" ke Investasi tetap ikut dihitung DUA KALI di
// Dana Titipan: 1x dari Holding barunya (Investment domain, 📈),
// 1x LAGI dari aset asal yang sudah non-aktif (Aset domain, 🏦).
// FIX: tambah guard `_migratedToInvestmentId`, pola SAMA PERSIS
// `Aset.totalValue()` — 0 rumus baru, murni menyamakan definisi
// "aset ini masih dihitung di mana" persis seperti guard
// `investmentId` yang sudah ada.
_assetSplits(a) {
  if (!a || typeof MultiOwnerEngine === 'undefined') return null;
  if (a.investmentId) return null;
  if (a._migratedToInvestmentId) return null;
  const owners = this._asetOwnersForTitipan(a);
  if (!Array.isArray(owners) || !owners.length) return null;
  const nilai = (typeof a.nilai === 'number' && isFinite(a.nilai)) ? a.nilai : 0;
  const valueSplit = MultiOwnerEngine.splitByPorsi(nilai, owners);
  const gainSplit = MultiOwnerEngine.splitByPorsi(0, owners);
  if (!valueSplit.ok || !gainSplit.ok) return null;
  return { owners, costSplit: valueSplit.splits, valueSplit: valueSplit.splits, gainSplit: gainSplit.splits };
},

// allocatedExcluding(ownerId, exclusion) — SESI 494 (Gate 2,
// PLAN-owner-registry-multi-session.md), digeneralisasi SESI E
// (PROMPT-SESI-E-ALLOCATEDEXCLUDING-LINTAS-DOMAIN.md) supaya lintas
// domain Investment + Aset (sebelumnya HANYA Investment — `build()`
// sudah lintas domain sejak Sesi B1/S499, tapi `allocatedExcluding()`
// ketinggalan, sehingga tidak aman dipakai `assetOwnersModal` nanti).
//
// Dipakai `investasi-view.js` (`InvestmentUI._ownerQuotaText()`) utk
// hitung "Kuota sisa" LIVE di modal `investmentOwnersModal` — total
// alokasi Dana Titipan yang SUDAH terpakai `ownerId` ini di instrumen
// LAIN (semua holding/aset KECUALI instrumen yang sedang dibuka di
// modal, supaya draft porsi yang belum disimpan di instrumen itu
// sendiri tidak ganda dihitung — caller menjumlah nominal draft
// instrumen yang sedang dibuka secara terpisah).
//
// Parameter `exclusion` (SESI E, backward-compatible dgn caller lama):
//   - string/falsy (BENTUK LAMA S494) -> diperlakukan sbg `holdingId`
//     yang dikecualikan dari domain Investment SAJA (caller existing
//     `investasi-view.js` memanggil `allocatedExcluding(ownerId,
//     holdingId)` apa adanya, 0 perubahan caller, tetap jalan sama
//     persis seperti sebelum Sesi E).
//   - object `{holdingId, assetId}` (BENTUK BARU SESI E) -> exclude
//     holding ber-`id === holdingId` dari domain Investment DAN/ATAU
//     aset ber-`id === assetId` dari domain Aset sekaligus (dipakai
//     fondasi kuota `assetOwnersModal`, belum ada caller UI-nya di
//     sesi ini — lihat catatan Sesi E di atas file ini).
//
// 100% REUSE `_holdingSplits()`/`_assetSplits()` (basis cost/nilai,
// SAMA PERSIS sumber yang dipakai `build()`) — 0 rumus baru ditulis di
// sini, cuma filter+jumlah `costSplit` per owner lintas instrumen lain
// di KEDUA domain. Owner SELF tetap dikecualikan di kedua domain (pola
// sama `build()`). Kedua domain dibaca independen: kalau salah satu
// domain tidak terbaca (dependency belum dimuat / kosong), domain yang
// lain tetap dihitung apa adanya (0 saling menggagalkan).
//
// Return: angka (0 kalau `ownerId` kosong, ATAU owner ini tidak muncul
// di instrumen manapun selain yang dikecualikan di kedua domain).
allocatedExcluding(ownerId, exclusion) {
  if (!ownerId) return 0;
  let excludeHoldingId = null;
  let excludeAssetId = null;
  if (exclusion && typeof exclusion === 'object') {
    excludeHoldingId = exclusion.holdingId || null;
    excludeAssetId = exclusion.assetId || null;
  } else if (exclusion) {
    // Bentuk lama S494: exclusion adalah holdingId literal.
    excludeHoldingId = exclusion;
  }

  let total = 0;

  const canReadHoldings = !(typeof Investment === 'undefined' || typeof Investment.getHoldings !== 'function');
  if (canReadHoldings) {
    const holdings = Investment.getHoldings() || [];
    holdings.forEach((h) => {
      if (!h) return;
      if (excludeHoldingId && h.id === excludeHoldingId) return;
      const splits = this._holdingSplits(h);
      if (!splits) return;
      const { owners, costSplit } = splits;
      owners.forEach((o, idx) => {
        if (!o || o.isSelf) return;
        if (o.ownerId !== ownerId) return;
        total += (costSplit[idx] && costSplit[idx].bagian) || 0;
      });
    });
  }

  const canReadAssets = Array.isArray(typeof D !== 'undefined' && D && D.assets);
  if (canReadAssets) {
    D.assets.forEach((a) => {
      if (!a) return;
      if (excludeAssetId && a.id === excludeAssetId) return;
      const splits = this._assetSplits(a);
      if (!splits) return;
      const { owners, costSplit } = splits;
      owners.forEach((o, idx) => {
        if (!o || o.isSelf) return;
        if (o.ownerId !== ownerId) return;
        total += (costSplit[idx] && costSplit[idx].bagian) || 0;
      });
    });
  }

  return total;
},

// _linkedExpenseTotalForOwner(o) — SESI PATCH-2026-08-14 (audit user:
// "kenapa masih ada estimasi belum teralokasi padahal di akun keuangan
// tertaut pemilik terpotong sudah ada modal pengeluaran total"). ROOT
// CAUSE ditemukan: `estimatedUnallocated` di `build()` di bawah HANYA
// mengurangi `principalAmount` dgn `o.allocatedPrincipal` (uang yang
// sudah masuk ke holding investasi/aset) — TIDAK PERNAH mengurangi uang
// yang sudah KELUAR sbg pengeluaran biasa (renov, belanja mingguan, dst.)
// di akun yang tertaut ke holding itu, walau akun itu sendiri (kartu
// "Porsi per Pemilik" di Riwayat Transaksi) SUDAH menghitung
// Modal-Pengeluaran=Total yang benar per pemilik. Akibatnya dashboard
// Dana Titipan menampilkan "Estimasi Belum Teralokasi" > 0 padahal
// uangnya SUDAH habis dibelanjakan (bukan menganggur/belum dipakai) --
// nilainya sebelumnya cuma tampil PASIF sbg baris pembanding "Estimasi
// dari Transaksi <Akun>" (`_expenseComparisonForOwner()`,
// dana-titipan-portfolio-render.js, Sesi C/S597), tidak pernah jadi INPUT
// ke perhitungan alokasi.
//
// REUSE 100% relasi holding->akun & assignment per-transaksi yang SAMA
// PERSIS dipakai `_expenseComparisonForOwner()` (holding->akun: prioritas
// holding langsung lalu fallback Aset perantara, S601-3; assignment:
// `resolveTxOwnerSplitForAccount()` + `resolveTxOwnerAssignment()` dari
// filter-laporan.js, S608 -- SATU sumber kebenaran yang sama dgn kartu
// "Porsi per Pemilik") — 0 rumus split baru ditulis di sini, murni
// dipindah SATU LEVEL LEBIH AWAL (dari render ke `build()`, file
// agregasi) supaya angkanya bisa dipakai sbg input `estimatedUnallocated`/
// `allocationStatus`, bukan cuma baris pembanding pasif.
// `_expenseComparisonForOwner()` sendiri diubah sesi ini jadi murni
// membaca `o.linkedExpenseTotal`/`o.linkedExpenseAccountNames` hasil
// fungsi ini (lihat dana-titipan-portfolio-render.js) — 1 sumber
// kebenaran, 0 risiko dua angka "pengeluaran akun tertaut" yang beda utk
// data yang sama.
//
// Perbandingan id akun pakai String() langsung (BUKAN `sameId()` global)
// — pola sama `_majorisLinkedAccountIds()` di file ini: fungsi ini
// dipanggil dari `build()` yang harus tetap aman di harness test manapun
// yang belum tentu meng-inject `sameId`.
//
// Guard anti-doublecount: transaksi yang SUDAH ditandai `titipanLinkId`
// (jalur "💸 Catat Pengeluaran Dana Titipan", `TitipanExpenseFlow`, sudah
// dihitung terpisah ke `usedMap`/`o.usedTotal` di `build()` sejak Sesi
// 519) DIKECUALIKAN dari sini, supaya 1 transaksi yang sama tidak pernah
// mengurangi `estimatedUnallocated` dua kali lewat dua jalur pengeluaran
// yang berbeda.
//
// Parameter: `o` — owner bucket (butuh `o.holdings[]` & `o.ownerId`,
// sudah tersedia di titik pemanggilan `build()` di bawah — holding
// dirakit LEBIH DULU sebelum forEach owner terakhir).
// Return: `{total, accountNames}` — `total` angka (SELALU >=0, bukan
// null) & `accountNames` array nama akun unik yang menyumbang.
// `{total: 0, accountNames: []}` (BUKAN null) kalau tidak ada satupun
// holding owner ini yang tertaut ke akun multi-owner — beda kontrak
// SENGAJA dari `_expenseComparisonForOwner()` (null = "sembunyikan
// baris") supaya caller `build()` di bawah bisa langsung menjumlahkan
// `.total` tanpa guard null terpisah.
_linkedExpenseTotalForOwner(o) {
  const empty = { total: 0, accountNames: [] };
  if (!o) return empty;
  if (typeof resolveTxOwnerSplitForAccount !== 'function' || typeof resolveTxOwnerAssignment !== 'function') return empty;
  if (typeof D === 'undefined' || !Array.isArray(D.assets) || !Array.isArray(D.transactions)) return empty;
  const seenAcc = new Set();
  let total = 0;
  const accountNames = [];
  (o.holdings || []).forEach((h) => {
    if (!h) return;
    let accountId = null;
    let accountLabel = null;
    // Prioritas 0 (S601-3): holding tertaut LANGSUNG ke akun, 0 Aset perantara.
    if (h.linkedInvestmentId && typeof Investment !== 'undefined' && typeof Investment.getHolding === 'function') {
      const srcHolding = Investment.getHolding(h.linkedInvestmentId);
      if (srcHolding && srcHolding.accountId) {
        accountId = srcHolding.accountId;
        accountLabel = srcHolding.name;
      }
    }
    // Prioritas 1 (rute lama): via Aset perantara -- HANYA dicek kalau prioritas 0 kosong.
    if (!accountId) {
      let asset = null;
      if (h.type === 'aset' && h.linkedAssetId) {
        asset = D.assets.find((a) => a && String(a.id) === String(h.linkedAssetId));
      } else if (h.linkedInvestmentId) {
        asset = D.assets.find((a) => a && String(a.investmentId) === String(h.linkedInvestmentId));
      }
      accountId = asset && asset.accountId;
      accountLabel = asset && asset.name;
    }
    if (!accountId || seenAcc.has(String(accountId))) return;
    seenAcc.add(String(accountId));
    const resolved = resolveTxOwnerSplitForAccount(accountId);
    if (!resolved) return;
    const idx = resolved.owners.findIndex((ow) => ow && ow.ownerId === o.ownerId);
    if (idx < 0) return;
    const ownerExpenseTotal = D.transactions
      .filter((t) => t && t.type === 'expense' && !t.titipanLinkId && String(t.accountId) === String(accountId) && resolveTxOwnerAssignment(t, resolved.owners) === o.ownerId)
      .reduce((s, t) => s + (isFinite(t.amount) ? Number(t.amount) : 0), 0);
    total += ownerExpenseTotal;
    accountNames.push(accountLabel || 'Akun');
  });
  // SESI S620 (laporan user -- "Uang motor", owner Dana Titipan yang HANYA
  // punya Pokok Dikomit ke akun BRI multi-owner, 0 Holding/Aset sama
  // sekali -- lihat catatan lengkap di `resolveTxOwnerSplitForAccount()`,
  // filter-laporan.js): loop di atas HANYA menemukan akun lewat `o.holdings[]`
  // -- owner tanpa holding sama sekali (kasus ini) tidak pernah membuat
  // loop itu berjalan, jadi akun BRI-nya tidak pernah dicek walau
  // `resolveTxOwnerSplitForAccount()` (setelah fix sesi ini) sekarang BISA
  // mengenalinya lewat fallback tier-3 `getAccOwnersEffective()`. FIX: loop
  // kedua ini scan `D.accounts` LANGSUNG (bukan lewat holdings) -- REUSE
  // 100% dedup (`seenAcc`, lanjutan set yang sama dari loop pertama supaya
  // akun yang sudah dihitung lewat holding TIDAK dihitung dobel di sini),
  // filter expense, & guard anti-doublecount `!t.titipanLinkId` yang SAMA
  // PERSIS loop pertama -- 0 rumus baru.
  if (typeof D !== 'undefined' && Array.isArray(D.accounts)) {
    D.accounts.forEach((acc) => {
      if (!acc || !acc.id || seenAcc.has(String(acc.id))) return;
      const resolved = resolveTxOwnerSplitForAccount(acc.id);
      if (!resolved) return;
      const idx = resolved.owners.findIndex((ow) => ow && ow.ownerId === o.ownerId);
      if (idx < 0) return;
      seenAcc.add(String(acc.id));
      const ownerExpenseTotal = D.transactions
        .filter((t) => t && t.type === 'expense' && !t.titipanLinkId && String(t.accountId) === String(acc.id) && resolveTxOwnerAssignment(t, resolved.owners) === o.ownerId)
        .reduce((s, t) => s + (isFinite(t.amount) ? Number(t.amount) : 0), 0);
      total += ownerExpenseTotal;
      accountNames.push(acc.name || 'Akun');
    });
  }
  return { total, accountNames };
},

// build() — projection utama. Grouping per owner NON-SELF lintas SEMUA
// holding investasi (satu owner bisa tersebar ke banyak instrumen; satu
// instrumen bisa punya porsi dari beberapa owner — keduanya sudah
// didukung `Investment.getOwners()`/`h.owners[]`, tidak ada logic baru
// di sini utk itu). Owner SELF & baris porsi 0 SENGAJA dikecualikan (pola
// sama `_syncTitipanDebt()`: `.filter((o) => !o.isSelf && o.porsi > 0)`).
//
// `totals.allocatedPrincipalTotal` SENGAJA diberi nama eksplisit
// "teralokasi" (bukan `totalTitipan`/`totalPrincipal`/`totalDanaTitipan`)
// — angka ini HANYA menjumlah porsi non-SELF yang SUDAH masuk ke holding
// investasi, BUKAN estimasi total dana titipan yang diterima (gap #3,
// belum ada sumber datanya). Tidak ada baris "kas belum diinvestasikan"
// di output ini sama sekali (SENGAJA, lihat catatan gap #3 di atas).
build() {
  const ownersMap = new Map();
  const canReadHoldings = !(typeof Investment === 'undefined' || typeof Investment.getHoldings !== 'function');
  if (canReadHoldings) {
    const holdings = Investment.getHoldings() || [];
    holdings.forEach((h) => {
      if (!h) return;
      const splits = this._holdingSplits(h);
      if (!splits) return;
      const { owners, costSplit, valueSplit, gainSplit } = splits;
      owners.forEach((o, idx) => {
        if (!o || o.isSelf) return;
        if (!(o.porsi > 0)) return;
        const ownerId = o.ownerId || 'titipan_investor';
        const ownerName = (o.ownerName && String(o.ownerName).trim()) || 'Pemilik dana titipan';
        const allocatedPrincipal = (costSplit[idx] && costSplit[idx].bagian) || 0;
        const currentValue = (valueSplit[idx] && valueSplit[idx].bagian) || 0;
        const gain = (gainSplit[idx] && gainSplit[idx].bagian) || 0;
        if (!ownersMap.has(ownerId)) {
          ownersMap.set(ownerId, { ownerId, ownerName, allocatedPrincipal: 0, currentValue: 0, gain: 0, holdings: [] });
        }
        const bucket = ownersMap.get(ownerId);
        bucket.allocatedPrincipal += allocatedPrincipal;
        bucket.currentValue += currentValue;
        bucket.gain += gain;
        bucket.holdings.push({
          holdingId: h.id,
          name: h.name || 'Holding',
          type: h.type || '',
          ownerPct: o.porsi,
          allocatedPrincipal,
          currentValue,
          gain,
          linkedInvestmentId: h.id,
          linkedOwnerId: ownerId,
          hasGainTracking: true,
        });
      });
    });
  }

  // SESI B1 (AUDIT-SESI-B-PERLUASAN-ASET.md §4-5) — source ke-2:
  // Domain Aset (D.assets), UNION ke ownersMap yang SAMA dgn holding
  // Investasi di atas (kalau 1 orang titip di Investasi & Aset sekaligus,
  // keduanya jadi 1 kartu owner, `allocatedPrincipal`/`currentValue`
  // digabung — kontrak `build()` TIDAK berubah, cuma sumber datanya
  // bertambah). HANYA aset yang lolos `_asetOwnersForTitipan()` (owners[]
  // EKSPLISIT, F1) yang diproses — aset legacy ber-`ownership` saja TIDAK
  // muncul di sini (SENGAJA, lihat komentar helper di atas). F2 Opsi A:
  // `gain` baris Aset SELALU 0 (0 cost-basis terpisah, lihat
  // `_assetSplits()`).
  const canReadAssets = Array.isArray(D && D.assets);
  if (canReadAssets) {
    D.assets.forEach((a) => {
      if (!a) return;
      const splits = this._assetSplits(a);
      if (!splits) return;
      const { owners, costSplit, valueSplit, gainSplit } = splits;
      // SESI s591 (fix laporan user: 1 aset — mis. "Majoris" — muncul
      // 2x/lebih di daftar holding owner yang SAMA, masing2 dgn tombol
      // "⚖️ Atur Porsi" sendiri). ROOT CAUSE: `owners[]` hasil
      // `_assetSplits(a)` bisa punya lebih dari 1 baris dgn `ownerId`
      // YANG SAMA (mis. user tanpa sadar menambah 2 baris pemilik utk
      // orang yang sama lewat "Atur Porsi Kepemilikan") — sebelum fix
      // ini, tiap baris `owners[]` langsung push 1 holding TERPISAH,
      // jadi 1 aset fisik tampil sbg berapa pun baris di UI. FIX:
      // agregasi dulu per `ownerId` DALAM 1 aset (jumlah porsi/
      // allocatedPrincipal/currentValue/gain), baru push SATU entry
      // holding per (aset, ownerId) — total per-owner (`bucket.*`)
      // TIDAK berubah nilainya (tetap jumlah semua baris asal, cuma
      // sekarang direpresentasikan 1 baris), murni konsolidasi tampilan.
      // Tombol "Atur Porsi" per-baris holding sendiri sudah dihapus di
      // `_holdingRowHtml()` (redundant dgn dropdown "Pilih Aset" + tombol
      // "⚖️ Atur Porsi Aset" yang sudah ada per kartu owner).
      const perOwnerAgg = new Map();
      owners.forEach((o, idx) => {
        if (!o || o.isSelf) return;
        if (!(o.porsi > 0)) return;
        const ownerId = o.ownerId || 'titipan_investor';
        const ownerName = (o.ownerName && String(o.ownerName).trim()) || 'Pemilik dana titipan';
        const allocatedPrincipal = (costSplit[idx] && costSplit[idx].bagian) || 0;
        const currentValue = (valueSplit[idx] && valueSplit[idx].bagian) || 0;
        const gain = (gainSplit[idx] && gainSplit[idx].bagian) || 0;
        if (!perOwnerAgg.has(ownerId)) {
          perOwnerAgg.set(ownerId, { ownerId, ownerName, porsi: 0, allocatedPrincipal: 0, currentValue: 0, gain: 0 });
        }
        const agg = perOwnerAgg.get(ownerId);
        agg.porsi += o.porsi;
        agg.allocatedPrincipal += allocatedPrincipal;
        agg.currentValue += currentValue;
        agg.gain += gain;
      });
      perOwnerAgg.forEach((agg) => {
        const { ownerId, ownerName, porsi, allocatedPrincipal, currentValue, gain } = agg;
        if (!ownersMap.has(ownerId)) {
          ownersMap.set(ownerId, { ownerId, ownerName, allocatedPrincipal: 0, currentValue: 0, gain: 0, holdings: [] });
        }
        const bucket = ownersMap.get(ownerId);
        bucket.allocatedPrincipal += allocatedPrincipal;
        bucket.currentValue += currentValue;
        bucket.gain += gain;
        bucket.holdings.push({
          holdingId: a.id,
          name: a.name || 'Aset',
          type: 'aset',
          ownerPct: porsi,
          allocatedPrincipal,
          currentValue,
          gain,
          linkedInvestmentId: null,
          linkedOwnerId: ownerId,
          linkedAssetId: a.id,
          hasGainTracking: false,
        });
      });
    });
  }

  // SESI 485c — union dgn owner dari D.titipanCommitments[]: owner yang
  // sudah komit pokok tapi BELUM punya holding sama sekali (mis. baru
  // saja dicatat, belum sempat dibelanjakan) tetap harus muncul di
  // projection (allocated/currentValue/gain = 0, bukan hilang begitu
  // saja) — supaya "Estimasi Belum Teralokasi" bisa dihitung utk owner
  // itu (sesi UI, S485d).
  const commitments = (D && Array.isArray(D.titipanCommitments)) ? D.titipanCommitments : [];
  const commitMap = new Map();
  commitments.forEach((c) => {
    if (!c || !c.ownerId) return;
    commitMap.set(c.ownerId, c);
    if (!ownersMap.has(c.ownerId)) {
      const ownerName = (c.ownerName && String(c.ownerName).trim()) || 'Pemilik dana titipan';
      ownersMap.set(c.ownerId, { ownerId: c.ownerId, ownerName, allocatedPrincipal: 0, currentValue: 0, gain: 0, holdings: [] });
    }
  });

  // SESI 486 (Case F: Partial Return / Pengembalian Dana Titipan) —
  // jumlahkan riwayat `D.titipanReturns[]` per owner LEBIH DULU (di luar
  // loop owners.forEach di bawah, sama pola dgn `commitMap` di atas),
  // supaya `returnedTotal` tersedia tanpa iterasi ulang per owner.
  const returnsList = (D && Array.isArray(D.titipanReturns)) ? D.titipanReturns : [];
  const returnedMap = new Map();
  returnsList.forEach((r) => {
    if (!r || !r.ownerId) return;
    const amt = isFinite(r.amount) ? Number(r.amount) : 0;
    returnedMap.set(r.ownerId, (returnedMap.get(r.ownerId) || 0) + amt);
  });

  // SESI 519 (LANJUTKAN-S519, Design Lock S518) — usedTotal/talanganTotal
  // per owner, dihitung SEKALI di sini (pola sama returnedMap di atas)
  // dari `D.transactions` (`tx.titipanLinkId`/`tx.titipanTalangan`,
  // field baru di `transaksi.js` S519). TIDAK PERNAH disimpan sbg counter
  // ke `D.titipanCommitments`/entity lain — murni derived ON-READ di
  // `build()`, supaya CREATE/EDIT/DELETE transaksi (tx-list-cashflow.js)
  // otomatis tercermin di sini tanpa perlu decrement/increment manual di
  // manapun (Hard Invariant #21/#22, LANJUTKAN-S519 §7-8).
  const txList = (D && Array.isArray(D.transactions)) ? D.transactions : [];
  const usedMap = new Map();
  const talanganMap = new Map();
  txList.forEach((tx) => {
    if (!tx || tx.type !== 'expense' || !tx.titipanLinkId) return;
    const amt = isFinite(tx.amount) ? Number(tx.amount) : 0;
    usedMap.set(tx.titipanLinkId, (usedMap.get(tx.titipanLinkId) || 0) + amt);
    if (tx.titipanTalangan === true) {
      talanganMap.set(tx.titipanLinkId, (talanganMap.get(tx.titipanLinkId) || 0) + amt);
    }
  });

  const owners = Array.from(ownersMap.values());
  owners.forEach((o) => {
    o.holdings.sort((x, y) => y.allocatedPrincipal - x.allocatedPrincipal);
    const commit = commitMap.get(o.ownerId);
    const principalAmount = commit ? (isFinite(commit.principalAmount) ? Number(commit.principalAmount) : 0) : null;
    // SESI 519 — usedTotal SELALU angka (default 0 — "belum ada transaksi
    // talangan" beda dari "belum ada data pokok"). talanganTotal SUBSET
    // usedTotal (Hard Invariant #8: HANYA expense dgn titipanTalangan===
    // true, sudah difilter di talanganMap di atas). Dipindah ke SINI
    // (sebelumnya di bawah blok estimatedUnallocated) SESI PATCH-2026-08-14
    // supaya tersedia SEBELUM estimatedUnallocated dihitung (lihat catatan
    // di bawah) — 0 rumus usedTotal/talanganTotal itu sendiri diubah.
    const usedTotal = usedMap.get(o.ownerId) || 0;
    o.usedTotal = usedTotal;
    o.talanganTotal = talanganMap.get(o.ownerId) || 0;
    // SESI PATCH-2026-08-14 (audit user, lihat catatan lengkap di
    // `_linkedExpenseTotalForOwner()` di atas) — pengeluaran akun tertaut
    // (mis. "Renov"/"Majoris") yang assignment-nya (`deductionOwnerId`)
    // mengarah ke owner ini, REUSE 100% relasi yang sama dgn
    // `_expenseComparisonForOwner()` (dana-titipan-portfolio-render.js).
    const linkedExpense = this._linkedExpenseTotalForOwner(o);
    o.linkedExpenseTotal = linkedExpense.total;
    o.linkedExpenseAccountNames = linkedExpense.accountNames;

    // DL-NEXT-9 REVISI 3 — HARD INVARIANT: `o.gain`/`gainSplit`/`currentValue`
    // (Untung-Rugi) TIDAK PERNAH masuk formula `estimatedUnallocated`/
    // `allocationStatus` di bawah ini, PERMANEN terpisah dari kuota Dana
    // Titipan. HANYA `principalAmount`/`o.allocatedPrincipal` (pokok NOMINAL,
    // cost-basis)/`usedTotal`/`o.linkedExpenseTotal` yang boleh dibaca formula
    // ini (lihat DESIGN-LOCK-DL-NEXT-9-OWNER-QUOTA-SISA-SPENT-SYNC-2.md, poin
    // 1/§"Pemisahan 3 konsep"). Sinyal "teralokasi" = NOMINAL yang benar-benar
    // ditempatkan lintas holding/aset (bukan biner "ada porsi di 1 instrumen
    // = seluruh principal habis") — `spent` bisa melebihi `principalAmount`
    // kapan pun total alokasi+pengeluaran lintas SEMUA instrumen owner ini
    // melebihi pokok yang dikomit, terdeteksi PENUH lintas holding.
    let estimatedUnallocated = null;
    let overAllocatedAmount = 0;
    let allocationStatus = 'PRINCIPAL_NOT_SET';
    if (principalAmount !== null) {
      // FIX SESI PATCH-2026-08-14 — SEBELUM fix ini, `spent` di sini HANYA
      // `o.allocatedPrincipal` (uang yang sudah masuk ke holding investasi/
      // aset). Root cause bug user: 2 jalur pengeluaran lain --
      // `usedTotal` (jalur "💸 Catat Pengeluaran Dana Titipan",
      // `tx.titipanLinkId`, Sesi 519) & `linkedExpenseTotal` (pengeluaran
      // biasa di akun tertaut yg deductionOwnerId-nya mengarah ke owner
      // ini, Sesi PATCH-2026-08-14 di atas) -- SUDAH dihitung `build()`
      // sejak lama/sesi ini, tapi TIDAK PERNAH ikut mengurangi
      // `principalAmount` di sini, jadi uang yang sebenarnya SUDAH
      // dibelanjakan (bukan menganggur) tetap dihitung "Belum Teralokasi".
      // `_linkedExpenseTotalForOwner()` sudah mengecualikan transaksi
      // ber-`titipanLinkId` (anti-doublecount dgn `usedTotal`), jadi
      // ketiga komponen `spent` ini SALING EKSKLUSIF (0 transaksi yang
      // sama terhitung 2x).
      const spent = o.allocatedPrincipal + usedTotal + o.linkedExpenseTotal;
      if (spent > principalAmount) {
        allocationStatus = 'OVER_ALLOCATED';
        estimatedUnallocated = 0;
        overAllocatedAmount = spent - principalAmount;
      } else {
        allocationStatus = 'OK';
        estimatedUnallocated = principalAmount - spent;
      }
    }
    o.principalAmount = principalAmount;
    o.estimatedUnallocated = estimatedUnallocated;
    o.overAllocatedAmount = overAllocatedAmount;
    o.allocationStatus = allocationStatus;
    // SESI 486 — `returnedTotal` SELALU angka (default 0, bukan null —
    // beda dari `principalAmount`: "belum pernah kembali sepeser pun"
    // dan "belum ada data pokok" adalah 2 hal berbeda).
    // `outstandingPrincipal` derived (TIDAK disimpan ke D sama sekali,
    // sesuai rencana sesi): null kalau `principalAmount` null
    // (PRINCIPAL_NOT_SET — konsisten dgn `estimatedUnallocated`), kalau
    // tidak `max(0, principalAmount - returnedTotal)` (tidak pernah
    // negatif meski returnedTotal > principalAmount / kelebihan bayar).
    const returnedTotal = returnedMap.get(o.ownerId) || 0;
    o.returnedTotal = returnedTotal;
    o.outstandingPrincipal = (principalAmount !== null) ? Math.max(0, principalAmount - returnedTotal) : null;
    // available null kalau principalAmount null (konsisten allocationStatus
    // PRINCIPAL_NOT_SET), kalau tidak max(0, principal-usedTotal-
    // linkedExpenseTotal-returnedTotal) (tidak pernah negatif, Design Lock
    // S518 §"dana-titipan-portfolio-presenter.js"). FIX SESI
    // PATCH-2026-08-14: tambah `linkedExpenseTotal` ke pengurang (pola sama
    // `estimatedUnallocated` di atas, konsisten definisi "sudah dipakai").
    o.available = (principalAmount !== null) ? Math.max(0, principalAmount - usedTotal - o.linkedExpenseTotal - returnedTotal) : null;
  });
  owners.sort((a, b) => b.allocatedPrincipal - a.allocatedPrincipal);

  const totals = owners.reduce((acc, o) => {
    acc.allocatedPrincipalTotal += o.allocatedPrincipal;
    acc.currentValueTotal += o.currentValue;
    acc.gainTotal += o.gain;
    if (o.principalAmount !== null) {
      acc.principalAmountTotal += o.principalAmount;
      acc.estimatedUnallocatedTotal += (o.estimatedUnallocated || 0);
      acc.outstandingPrincipalTotal += o.outstandingPrincipal;
    }
    acc.overAllocatedTotal += o.overAllocatedAmount;
    acc.returnedTotalSum += o.returnedTotal;
    return acc;
  }, {
    // SESI PATCH-2026-08-14 — SENGAJA TIDAK menambah key baru ke object
    // totals ini (mis. `linkedExpenseTotalSum`) walau datanya sudah ada
    // per-owner (`o.linkedExpenseTotal`) -- ada test kontrak
    // (`tests/s484-dana-titipan-portfolio-presenter.test.js`, "totals
    // exposes exact keys") yang menegaskan SHAPE object ini stabil. Kalau
    // suatu saat perlu total lintas-owner utk `linkedExpenseTotal`, hitung
    // di caller lewat `projection.owners.reduce(...)`, bukan nambah field
    // di sini (0 kontrak dilanggar).
    allocatedPrincipalTotal: 0, currentValueTotal: 0, gainTotal: 0,
    principalAmountTotal: 0, estimatedUnallocatedTotal: 0, overAllocatedTotal: 0,
    returnedTotalSum: 0, outstandingPrincipalTotal: 0,
  });
  return { owners, totals };
},

// _majorisLinkedAccountIds(owners) — SESI S595 (lanjutan
// AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md, kontrak audit final utk baris
// "Pengeluaran Majoris" di level KARTU/Total — beda scope dari
// `DanaTitipanPortfolioPresenter._expenseComparisonForOwner()` yang
// per-owner, Sesi C/S597, dana-titipan-portfolio-render.js).
//
// Resolve akun-akun yang tertaut ke SELURUH holding Dana Titipan (union
// lintas SEMUA owner hasil `build()`, bukan 1 owner). REUSE relasi
// h.type==='aset'+h.linkedAssetId / h.linkedInvestmentId -> asset.accountId
// yang SAMA PERSIS dipakai `_expenseComparisonForOwner()` — 0 relasi baru
// ditulis di sini, murni dikumpulkan lintas semua owner supaya dapat
// definisi "akun tertaut Majoris" di level kartu. Perbandingan id pakai
// String() langsung (BUKAN memanggil `sameId()` global) — fungsi ini
// dipanggil dari `build()`/`majorisRenovReconciliation()` yang harus
// tetap aman di harness test manapun yang belum tentu meng-inject
// `sameId` (banyak test lama di suite ini TIDAK menyuntikkan `sameId`),
// String() equality 100% setara `sameId()` (definisinya sendiri persis
// `String(a)===String(b)`, lihat features-helpers-global-security.js) —
// 0 rumus perbandingan baru, cuma tidak bergantung ke global opsional.
// Dedup by accountId — kalau >1 owner kebetulan terhubung ke akun yang
// sama, akun itu tetap dihitung SEKALI.
//
// FIX (laporan user Agustus 2026, bug sekelas dgn `resolveTxOwnerSplitForAccount()`
// di filter-laporan.js -- lihat catatan Temuan #1/S601-3 di file itu): tambah
// prioritas 0, cek tautan LANGSUNG holding->akun (`h.accountId` di
// `Investment.getHoldings()`, S601-3) LEBIH DULU via `Investment.getHolding()`
// — SEBELUM fix ini, holding yang ditautkan langsung ke akun (0 Aset
// perantara) tidak pernah menyumbang `accountId` ke sini, jadi transaksi
// "Pengeluaran Majoris"/renov di akun itu diam-diam TIDAK ikut dihitung di
// baris kartu Dana Titipan. Rute lewat Aset (prioritas 1) tetap PERSIS
// sama, dipakai kalau holding itu sendiri tidak py `accountId` langsung.
// Parameter `owners`: array hasil `build().owners` (atau setara).
// Return: array accountId unik (string-normalized) — [] kalau tidak ada
// satupun holding yang tertaut ke akun manapun.
_majorisLinkedAccountIds(owners) {
  if (typeof D === 'undefined' || !Array.isArray(D.assets)) return [];
  const seen = new Set();
  const ids = [];
  (owners || []).forEach((o) => {
    (o.holdings || []).forEach((h) => {
      if (!h) return;
      let accountId = null;
      if (h.linkedInvestmentId && typeof Investment !== 'undefined' && typeof Investment.getHolding === 'function') {
        const srcHolding = Investment.getHolding(h.linkedInvestmentId);
        if (srcHolding && srcHolding.accountId) accountId = srcHolding.accountId;
      }
      if (!accountId) {
        let asset = null;
        if (h.type === 'aset' && h.linkedAssetId) {
          asset = D.assets.find((a) => a && String(a.id) === String(h.linkedAssetId));
        } else if (h.linkedInvestmentId) {
          asset = D.assets.find((a) => a && String(a.investmentId) === String(h.linkedInvestmentId));
        }
        accountId = asset && asset.accountId;
      }
      if (!accountId) return;
      const key = String(accountId);
      if (seen.has(key)) return;
      seen.add(key);
      ids.push(accountId);
    });
  });
  return ids;
},

// majorisRenovReconciliation(owners, principalAmountTotal) — SESI S595
// (kontrak audit final): baris pembanding OTOMATIS "Pengeluaran Majoris
// (dari transaksi Renov)" + "Sisa Saldo Majoris Belum Terpotong" utk
// kartu Dana Titipan, tepat di bawah "Total Pokok Dikomit" MANUAL (0
// logic Pokok Dikomit diubah, 0 field manual/cache baru — murni angka
// live-derived dibandingkan dgn angka manual yang sudah ada).
//
// Pengeluaran Majoris = SUM(t.amount) utk t di D.transactions WHERE
//   t.accountId === salah satu akun tertaut holding Dana Titipan (union
//   semua owner, lihat `_majorisLinkedAccountIds()` di atas) AND
//   t.type === 'expense' AND t.renovProjectLinkId truthy (tag scope
//   "Dana Titipan Renov" YANG SUDAH ADA — diisi transaksi.js saat user
//   centang "🔨 Catat juga ke Proyek Renovasi?", lihat linktx.js/
//   tx-renov.js/renovasi.js — 0 field baru).
// Sisa Saldo Majoris Belum Terpotong = Total Pokok Dikomit (parameter
//   `principalAmountTotal`, MANUAL, 0 diubah) − Pengeluaran Majoris.
//   TIDAK di-clamp (boleh negatif — representasi "pengeluaran renov
//   sudah melebihi pokok yang dikomit").
//
// Owner resolution Gap #1 (`_resolveLinkedInvestmentOwners`/
// `resolveTxOwnerSplitForAccount`) TIDAK disentuh sama sekali — fungsi
// ini tidak melakukan split per-owner, murni SUM mentah di level akun.
//
// Parameter: `owners` (array hasil `build().owners`), `principalAmountTotal`
//   (angka, biasanya `build().totals.principalAmountTotal`).
// Return: null kalau tidak ada satupun akun tertaut Dana Titipan (baris
//   disembunyikan, pola sama `_expenseComparisonForOwner()`) — kalau
//   tidak, `{pengeluaranMajoris, sisaSaldo, deductionOwnerTotal, synced}`.
//   `pengeluaranMajoris`/`sisaSaldo`: 0 berubah dari S595 (kontrak lama
//   tetap, `sisaSaldo` boleh negatif).
//
// SESI PATCH-2026-08-14 (lanjutan, catatan "Temuan tambahan" di
// AUDIT-estimasi-belum-teralokasi.md — sinyal pengeluaran KETIGA):
// `pengeluaranMajoris` di atas filter `t.renovProjectLinkId`, SEDANGKAN
// `o.linkedExpenseTotal` per-owner (`_linkedExpenseTotalForOwner()`,
// dipakai `estimatedUnallocated`) filter `t.deductionOwnerId` — dua tag
// scope BERBEDA yang diisi user di alur transaksi berbeda ("🔨 Catat
// juga ke Proyek Renovasi?" vs "👤 Ditanggung: <owner>"), jadi utk data
// yang sama kedua angka BISA berbeda (transaksi ditandai satu tag tapi
// bukan yang lain). TIDAK disatukan jadi 1 rumus (masing-masing tetap
// scope aslinya, 0 rumus lama diubah, 0 test lama regresi) — sebagai
// gantinya ditambah `deductionOwnerTotal` (SUM `o.linkedExpenseTotal`
// milik owner-owner yang holding-nya tertaut ke akun yang SAMA dgn
// `_majorisLinkedAccountIds()`, angka pembanding apple-to-apple) +
// `synced` (boolean, `pengeluaranMajoris === deductionOwnerTotal`) supaya
// UI bisa kasih sinyal kalau 2 tag scope itu tidak konsisten utk data yg
// sama, tanpa memaksakan salah satu formula "menang". `o.linkedExpenseTotal`
// dibaca APA ADANYA dari `owners[]` yang diberikan (biasanya hasil
// `build()`, sudah terisi sejak fix PATCH-2026-08-14 pertama) — default 0
// kalau owner tsb belum pernah lewat `build()` (mis. test lama yang
// bikin objek owner manual), jadi 0 crash & 0 regresi kontrak lama.
majorisRenovReconciliation(owners, principalAmountTotal) {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) return null;
  const accountIds = this._majorisLinkedAccountIds(owners);
  if (!accountIds.length) return null;
  const idSet = new Set(accountIds.map((id) => String(id)));
  const pengeluaranMajoris = D.transactions
    .filter((t) => t && t.type === 'expense' && t.renovProjectLinkId && idSet.has(String(t.accountId)))
    .reduce((s, t) => s + (isFinite(t.amount) ? Number(t.amount) : 0), 0);
  const principal = isFinite(principalAmountTotal) ? Number(principalAmountTotal) : 0;
  const sisaSaldo = principal - pengeluaranMajoris;
  const deductionOwnerTotal = (owners || []).reduce((sum, o) => {
    if (!o) return sum;
    const linked = (o.holdings || []).some((h) => {
      if (!h) return false;
      let accountId = null;
      if (h.linkedInvestmentId && typeof Investment !== 'undefined' && typeof Investment.getHolding === 'function') {
        const srcHolding = Investment.getHolding(h.linkedInvestmentId);
        if (srcHolding && srcHolding.accountId) accountId = srcHolding.accountId;
      }
      if (!accountId) {
        let asset = null;
        if (h.type === 'aset' && h.linkedAssetId) {
          asset = D.assets.find((a) => a && String(a.id) === String(h.linkedAssetId));
        } else if (h.linkedInvestmentId) {
          asset = D.assets.find((a) => a && String(a.investmentId) === String(h.linkedInvestmentId));
        }
        accountId = asset && asset.accountId;
      }
      return accountId && idSet.has(String(accountId));
    });
    return linked ? sum + (isFinite(o.linkedExpenseTotal) ? Number(o.linkedExpenseTotal) : 0) : sum;
  }, 0);
  const synced = pengeluaranMajoris === deductionOwnerTotal;
  return { pengeluaranMajoris, sisaSaldo, deductionOwnerTotal, synced };
},

// listExistingOwners() — Sesi 485a (langkah 1/5), diperluas Sesi 492
// (Gap #2 plan owner-registry, PLAN-owner-registry-multi-session.md,
// Gate #2 = SENTUH — dikonfirmasi eksplisit sebelum sesi ini mulai).
//
// SESI 492 — apa yang berubah & apa yang TIDAK:
//   - Fungsi ini sekarang JUGA jadi consumer `OwnerRegistry.listAll()`
//     (S489) — owner yang dibuat lewat dropdown `assetOwnersModal`
//     (S490) / `investmentOwnersModal` (S491) sekarang IKUT muncul di
//     picker "💰 Pokok Dana Titipan", supaya satu orang yang sama TIDAK
//     perlu identity terpisah lagi kalau sudah pernah dipilih/dibuat di
//     Aset atau Investasi.
//   - Sumber LAMA (union dari `Investment.getHoldings()`/`getOwners(h)`)
//     TIDAK DIHAPUS/DIGANTI — tetap dijalankan APA ADANYA, 0 baris logic
//     lama diubah. Registry ditambahkan sebagai sumber KEDUA, di-append
//     setelah union holding (dedup gabungan by `ownerId`/`id`).
//   - Ini SENGAJA bukan "ganti total ke registry": Gate #1 (S489) sudah
//     mengunci seed KOSONG, artinya SEMUA owner yang sudah ada di
//     holding sebelum S490/491 live TIDAK PERNAH masuk registry (dan
//     TIDAK di-backfill sesi ini — dilarang migrasi). Kalau union holding
//     dibuang & diganti murni `OwnerRegistry.listAll()`, seluruh owner
//     lama akan hilang dari picker titipan (regresi total ke pengguna
//     existing + 10 test S485a yang menguji union holding jadi rusak).
//     Union tetap dipertahankan justru untuk MENJAGA data existing aman
//     ("tidak melakukan migrasi/rename/merge/perubahan ownerId pada data
//     existing" — instruksi Gate #2), sekaligus fungsi ini benar-benar
//     "menjadi consumer" registry (dibaca & digabung, bukan diabaikan).
//   - Dedup gabungan: kalau `id` registry KEBETULAN sama dgn `ownerId`
//     union holding (mis. dari findOrCreate yang balik id existing utk
//     satu orang yang SUDAH pernah dipakai di Aset/Investasi & TERNYATA
//     ownerId itu juga muncul di suatu holding lama) -> entri holding
//     (union lama) menang, entri registry di-skip (union holding tetap
//     "sumber utama" utk owner yang SUDAH terhubung ke suatu holding,
//     sesuai catatan lama di bawah — 0 perubahan urutan/isi union lama).
//   - Owner SELF tetap DIKECUALIKAN dari kedua sumber (union holding
//     sudah filter `!o.isSelf`; `OwnerRegistry` sendiri tidak pernah
//     menyimpan baris SELF — S490/491 hanya panggil `findOrCreate()`
//     utk baris non-SELF, lihat `aset.js`/`investasi-view.js`).
//
// CATATAN LEGACY COLLISION (audit S485a, TIDAK diperbaiki sesi ini —
// lihat investasi.js Investment.getOwners(): holding legacy `fundSource:
// 'titipan'` SELALU balik ownerId literal 'titipan_investor' apa pun
// isi `titipanOwner`-nya). Konsekuensi: kalau ada 2 holding legacy milik
// 2 orang berbeda (mis. Budi & Cici, keduanya lewat fundSource:'titipan'
// tanpa h.owners[]), keduanya collapse jadi 1 entri di sini dgn
// `ownerId:'titipan_investor'` (ownerName = milik holding yang diproses
// PERTAMA, sesuai urutan Investment.getHoldings()). Ini BUKAN bug baru
// sesi ini — PRE-EXISTING/OUT OF SCOPE, TIDAK di-patch (dilarang oleh
// keputusan audit: dilarang migrate ownerId/rewrite legacy holdings/ubah
// getOwners()) — tetap valid persis seperti sebelum S492 karena union
// holding di bawah ini TIDAK disentuh sama sekali.
//
// Parameter: tidak ada.
// Return: array `{ownerId, ownerName}` — urutan: union holding dulu
//   (deterministik, mengikuti kemunculan pertama di
//   `Investment.getHoldings()`, sama persis S485a), lalu entri
//   `OwnerRegistry.listAll()` yang BELUM ada di union holding (mengikuti
//   urutan `D.ownerRegistry`, TIDAK di-sort ulang).
listExistingOwners() {
  const seen = new Set();
  const result = [];
  if (typeof Investment !== 'undefined' && typeof Investment.getHoldings === 'function' && typeof Investment.getOwners === 'function') {
    const holdings = Investment.getHoldings() || [];
    holdings.forEach((h) => {
      if (!h) return;
      const owners = Investment.getOwners(h);
      if (!Array.isArray(owners)) return;
      owners.forEach((o) => {
        if (!o || o.isSelf) return;
        if (!o.ownerId) return;
        if (seen.has(o.ownerId)) return;
        seen.add(o.ownerId);
        const ownerName = (o.ownerName && String(o.ownerName).trim()) || 'Pemilik dana titipan';
        result.push({ ownerId: o.ownerId, ownerName });
      });
    });
  }
  // Sesi 492: tambahan sumber kedua, OwnerRegistry (S489) — append-only,
  // dedup gabungan by id, union holding di atas tidak berubah sama sekali.
  if (typeof OwnerRegistry !== 'undefined' && typeof OwnerRegistry.listAll === 'function') {
    const registryList = OwnerRegistry.listAll() || [];
    registryList.forEach((r) => {
      if (!r || !r.id) return;
      if (seen.has(r.id)) return;
      seen.add(r.id);
      const ownerName = (r.name && String(r.name).trim()) || 'Pemilik dana titipan';
      result.push({ ownerId: r.id, ownerName });
    });
  }
  // Sesi 522 (FIX-S521-DANA-TITIPAN-UI-MULTIOWNER, root cause "kamera"
  // owner tidak ditemukan) — tambahan sumber ketiga: domain Aset
  // (`D.assets[].owners[]` EKSPLISIT), sumber ke-3, append-only, dedup
  // gabungan by ownerId, kedua sumber di atas TIDAK diubah sama sekali.
  // Root cause: dashboard `build()` SUDAH lintas domain (union
  // Investasi+Aset, lihat komentar `build()` di bawah, Sesi B1/S499),
  // tapi `listExistingOwners()` (dipakai picker dropdown modal ini)
  // ketinggalan hanya Investasi+OwnerRegistry — akibatnya owner yang
  // HANYA pernah diatur porsinya lewat "⚖️ Atur Porsi Kepemilikan" di
  // Buku Aset (bukan lewat Investasi/Registry) muncul sbg kartu nyata di
  // dashboard TAPI ditolak "Owner tidak ditemukan" saat Simpan di modal
  // ini. Reuse 100% `_asetOwnersForTitipan()` (guard existing-owners-
  // only, isSynthesized-safe, SAMA PERSIS yang dipakai `build()`) — 0
  // rumus/guard baru ditulis di sini.
  if (Array.isArray(typeof D !== 'undefined' && D && D.assets)) {
    D.assets.forEach((a) => {
      if (!a) return;
      const owners = this._asetOwnersForTitipan(a);
      if (!Array.isArray(owners)) return;
      owners.forEach((o) => {
        if (!o || o.isSelf) return;
        if (!o.ownerId) return;
        if (seen.has(o.ownerId)) return;
        seen.add(o.ownerId);
        const ownerName = (o.ownerName && String(o.ownerName).trim()) || 'Pemilik dana titipan';
        result.push({ ownerId: o.ownerId, ownerName });
      });
    });
  }
  return result;
},
};
