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
_assetSplits(a) {
  if (!a || typeof MultiOwnerEngine === 'undefined') return null;
  if (a.investmentId) return null;
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
    let estimatedUnallocated = null;
    let overAllocatedAmount = 0;
    let allocationStatus = 'PRINCIPAL_NOT_SET';
    if (principalAmount !== null) {
      if (o.allocatedPrincipal > principalAmount) {
        allocationStatus = 'OVER_ALLOCATED';
        estimatedUnallocated = 0;
        overAllocatedAmount = o.allocatedPrincipal - principalAmount;
      } else {
        allocationStatus = 'OK';
        estimatedUnallocated = principalAmount - o.allocatedPrincipal;
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
    // SESI 519 — usedTotal SELALU angka (pola sama returnedTotal, default 0
    // — "belum ada transaksi talangan" beda dari "belum ada data pokok").
    // talanganTotal SUBSET usedTotal (Hard Invariant #8: HANYA expense
    // dgn titipanTalangan===true, sudah difilter di talanganMap di atas).
    // available null kalau principalAmount null (konsisten allocationStatus
    // PRINCIPAL_NOT_SET), kalau tidak max(0, principal-usedTotal-returnedTotal)
    // (tidak pernah negatif, Design Lock S518 §"dana-titipan-portfolio-presenter.js").
    const usedTotal = usedMap.get(o.ownerId) || 0;
    o.usedTotal = usedTotal;
    o.talanganTotal = talanganMap.get(o.ownerId) || 0;
    o.available = (principalAmount !== null) ? Math.max(0, principalAmount - usedTotal - returnedTotal) : null;
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
    allocatedPrincipalTotal: 0, currentValueTotal: 0, gainTotal: 0,
    principalAmountTotal: 0, estimatedUnallocatedTotal: 0, overAllocatedTotal: 0,
    returnedTotalSum: 0, outstandingPrincipalTotal: 0,
  });
  return { owners, totals };
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

// getCommitments() — Sesi 485b, getter read-only. Init lazy (pola sama
// `D.investmentWatchlist`): TIDAK menulis `D.titipanCommitments` kalau
// belum ada, cuma balikin array kosong (biar getter murni tidak punya
// side-effect nulis ke `D`).
// Return: array `D.titipanCommitments` apa adanya (atau `[]`).
getCommitments() {
  return (D && D.titipanCommitments) || [];
},

// saveCommitment({ownerId, ownerName, principalAmount, committedDate,
// notes}) — Sesi 485b (Gap #3 audit, langkah 2/5). Upsert by `ownerId`
// ke `D.titipanCommitments[]`. **existing-owner-only**: `ownerId` WAJIB
// sudah muncul di `listExistingOwners()` (owner picker read-only, Sesi
// 485a) — fungsi ini TIDAK PERNAH membuat identity `ownerId` baru yang
// tidak dikenal sistem (mencegah user "ketik nama sendiri" bikin owner
// hantu yang tidak nyambung ke holding manapun).
//
// Validasi (throw Error kalau gagal, TIDAK menulis apa pun ke `D` kalau
// validasi gagal — atomic per panggilan):
//   - `ownerId` wajib diisi & harus ada di `listExistingOwners()`.
//   - `principalAmount` wajib numerik (`isFinite`) & >= 0 (dilarang
//     negatif — pokok dana titipan tidak bisa minus).
//
// Upsert: kalau sudah ada record dgn `ownerId` sama -> update in place
// (field yang di-pass `undefined` dipertahankan nilai lama, pola sama
// `Investment.updateWatch()`), TIDAK push duplikat. Kalau belum ada ->
// push record baru dgn `id: uid()`.
//
// ISOLASI TOTAL (HARD RULE sesi ini): fungsi ini HANYA menyentuh
// `D.titipanCommitments` (+ panggil `save()` kalau tersedia, pola sama
// semua CRUD lain di codebase ini) — 0 sentuhan ke `D.accounts`,
// `D.transactions`, `D.investmentTx`, `D.investments`, `D.debts` (lihat
// test regresi assert deep-equal sebelum/sesudah selain
// `titipanCommitments`).
//
// Return: record commitment yang tersimpan (`{id, ownerId, ownerName,
//   principalAmount, committedDate, notes, createdAt, updatedAt}`).
saveCommitment(input) {
  const params = input || {};
  const ownerId = params.ownerId;
  if (!ownerId) throw new Error('Owner wajib dipilih');
  const known = this.listExistingOwners().find((o) => o.ownerId === ownerId);
  if (!known) throw new Error('Owner tidak ditemukan pada daftar pemilik investasi yang ada');
  const principalAmount = Number(params.principalAmount);
  if (!isFinite(principalAmount) || principalAmount < 0) {
    throw new Error('Pokok dana titipan harus berupa angka >= 0');
  }
  D.titipanCommitments = D.titipanCommitments || [];
  const ownerName = (params.ownerName && String(params.ownerName).trim()) || known.ownerName;
  const now = Date.now();
  let record = D.titipanCommitments.find((c) => c && c.ownerId === ownerId);
  if (record) {
    record.ownerName = ownerName;
    record.principalAmount = principalAmount;
    if (params.committedDate !== undefined) record.committedDate = params.committedDate;
    if (params.notes !== undefined) record.notes = params.notes;
    record.updatedAt = now;
  } else {
    record = {
      id: (typeof uid === 'function') ? uid() : ('tc_' + now),
      ownerId,
      ownerName,
      principalAmount,
      committedDate: params.committedDate || '',
      notes: params.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    D.titipanCommitments.push(record);
  }
  if (typeof save === 'function') save();
  return record;
},

// deleteCommitment(ownerId) — Sesi 522 (FIX-S521-DANA-TITIPAN-UI-
// MULTIOWNER, gap #2: "tidak ada delete function sama sekali" utk
// commitment — hanya `saveCommitment()`/`getCommitments()` yang ada
// sebelum sesi ini). Hapus record `D.titipanCommitments` by `ownerId`
// (bukan by `id` — 1 owner = maksimal 1 record commitment, pola upsert
// `saveCommitment()` di atas, jadi `ownerId` sudah unik & lebih gampang
// dipanggil dari UI yang cuma tahu owner yang sedang dibuka). Return
// `true` kalau ada yang terhapus, `false` kalau tidak ditemukan (TIDAK
// throw — pola SAMA PERSIS `deleteReturn(id)` di bawah). ISOLASI TOTAL:
// HANYA menyentuh `D.titipanCommitments` (+ `save()`), 0 sentuhan ke
// `D.titipanReturns`/holding/aset/akun/transaksi lain.
deleteCommitment(ownerId) {
  if (!(D && Array.isArray(D.titipanCommitments))) return false;
  if (!ownerId) return false;
  const idx = D.titipanCommitments.findIndex((c) => c && c.ownerId === ownerId);
  if (idx === -1) return false;
  D.titipanCommitments.splice(idx, 1);
  if (typeof save === 'function') save();
  return true;
},

// removeOwnerLinkage(ownerId) — Sesi 523-C (BUG-02/BUG-06,
// AUDIT-S523-C-COMMITMENT-DELETE-VS-OWNER-LINKAGE.md). Operasi TERPISAH
// secara KONTRAK dari deleteCommitment() di atas & dari "global owner
// deletion" (SENGAJA TIDAK dibuat sesi ini, lihat catatan di bawah):
//
//   1. deleteCommitment(ownerId) — CRUD "hapus 1 record pokok dana
//      titipan", dipanggil dari modal edit pokok (tombol 🗑 Hapus,
//      Sesi 522). Fokusnya: koreksi/hapus ANGKA pokok yang salah catat.
//   2. removeOwnerLinkage(ownerId) — SCOPED REMOVAL "lepaskan
//      keterikatan owner ini dari Dana Titipan", dipanggil LANGSUNG dari
//      kartu owner di dashboard (tombol terpisah, TIDAK perlu buka modal
//      edit pokok dulu). Fokusnya: owner ini sudah tidak relevan lagi di
//      Dana Titipan (mis. dana sudah selesai dikembalikan semua & owner
//      mau "dibersihkan" dari daftar).
//   3. Global owner deletion (hapus `OwnerRegistry` entry sepenuhnya) —
//      SENGAJA TIDAK ADA di sesi ini. `OwnerRegistry` (owner-registry.js,
//      S489) belum punya API delete/remove resmi sama sekali (baru
//      listAll()/findOrCreate()) — menambah method delete ke situ MASUK
//      keputusan desain terpisah (lihat §4 dokumen rekomendasi S523,
//      "logic guard taruh di modul konsumen, BUKAN core registry, kecuali
//      >1 konsumen pasti butuh") yang TIDAK diambil sesi ini (di luar
//      fokus BUG-02/06/14, HARD RULE "Jangan global delete owner").
//
// SESI INI: (2) dipatch dgn REUSE 100% mekanisme (1) — keduanya
// menyentuh field `D` yang SAMA (`D.titipanCommitments`, satu-satunya
// data yang benar-benar dimiliki EKSKLUSIF oleh domain Dana Titipan),
// jadi 0 rumus/mutasi baru ditulis. Yang beda: nama, kontrak, dan titik
// panggil (kartu owner vs modal edit) — bukan implementasi. Kalau nanti
// scoped removal butuh membersihkan lebih dari `titipanCommitments`
// (mis. `D.titipanReturns`), itu keputusan desain terpisah (BUG-03) yang
// TIDAK diambil di sini (lihat larangan #7 di bawah).
//
// SENGAJA TIDAK disentuh (scoped removal HANYA melepas "keterikatan
// Dana Titipan", 0 efek samping ke domain lain):
//   - `D.titipanReturns` — riwayat pengembalian TETAP riwayat, TIDAK
//     dihapus diam-diam (linked history, beda dari `titipanCommitments`
//     yang murni angka pokok saat ini — pola sama alasan `deleteReturn()`
//     dibuat sbg fungsi terpisah eksplisit, bukan efek samping delete
//     lain).
//   - `D.assets`/`D.investments` (`owners[]`/porsi kepemilikan) — porsi
//     di holding/aset lain dikelola LEWAT modul masing-masing ("⚖️ Atur
//     Porsi Kepemilikan"), bukan di sini. Owner bisa saja tetap muncul
//     di kartu Dana Titipan setelah linkage dilepas KALAU dia masih
//     py porsi di suatu holding/aset — itu BUKAN bug (persis temuan
//     BUG-04 S523-A: isolasi domain yang disengaja).
//   - `D.transactions` (`tx.titipanLinkId`) — TIDAK dihapus/diubah
//     massal di sini. Link basi (ownerId yang sudah tidak dikenal)
//     sudah py mekanisme self-heal SENDIRI di `transaksi.js`
//     (`applyTxTitipanLinkageOnSave()`/`resolveTxTitipanOwner()`,
//     Sesi 519) yang otomatis membuang `titipanLinkId` begitu transaksi
//     itu sendiri disave ulang — 0 duplikasi guard di sini.
//   - `OwnerRegistry`/`D.ownerRegistry` — identitas global owner TETAP
//     ADA. "Lepas keterikatan dari Dana Titipan" secara definisi BUKAN
//     "hapus owner ini dari sistem".
//
// Return: `true` kalau ada linkage (record commitment) yang dilepas,
//   `false` kalau owner ini memang tidak punya commitment sama sekali
//   (no-op aman, TIDAK throw — pola sama deleteCommitment()/deleteReturn()).
removeOwnerLinkage(ownerId) {
  return this.deleteCommitment(ownerId);
},

// getReturns(ownerId) — Sesi 486 (Case F: Partial Return / Pengembalian
// Dana Titipan, lihat RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md).
// Getter read-only, pola sama getCommitments(). Tanpa `ownerId` -> semua
// record `D.titipanReturns`. Dengan `ownerId` -> difilter utk owner itu
// saja (dipakai render() riwayat per owner & DanaTitipanReturnUI).
getReturns(ownerId) {
  const all = (D && Array.isArray(D.titipanReturns)) ? D.titipanReturns : [];
  if (!ownerId) return all;
  return all.filter((r) => r && r.ownerId === ownerId);
},

// recordReturn({ownerId, ownerName, amount, returnDate, notes}) —
// Sesi 486 (Case F). Catat 1 baris pengembalian dana titipan ke
// `D.titipanReturns[]` — ini LOG/riwayat, BUKAN upsert seperti
// saveCommitment(): satu owner bisa punya banyak baris pengembalian dari
// waktu ke waktu, semua tersimpan apa adanya, tidak ada yang ditimpa.
//
// existing-owner-only, pola SAMA PERSIS saveCommitment() (Sesi 485b):
// `ownerId` wajib sudah ada di `listExistingOwners()` — fungsi ini TIDAK
// PERNAH membuat identity `ownerId` baru. Validasi (throw Error kalau
// gagal, TIDAK menulis apa pun ke `D` kalau gagal — atomic):
//   - `ownerId` wajib diisi & dikenal.
//   - `amount` wajib numerik (`isFinite`) & >= 0 (dilarang negatif —
//     kalau perlu koreksi, hapus baris via deleteReturn() lalu catat
//     ulang, pola sama "hapus lalu catat ulang" InvestmentTxUI.deleteTx()
//     — fungsi ini SENGAJA tidak punya updateReturn()).
//
// ISOLASI TOTAL (HARD RULE sesi ini, sama seperti saveCommitment()):
// fungsi ini HANYA menyentuh `D.titipanReturns` (+ panggil `save()` kalau
// tersedia) — 0 sentuhan ke `D.accounts`, `D.transactions`,
// `D.investmentTx`, `D.investments`, `D.debts`.
//
// Return: record pengembalian yang tersimpan (`{id, ownerId, ownerName,
//   amount, returnDate, notes, createdAt}`).
recordReturn(input) {
  const params = input || {};
  const ownerId = params.ownerId;
  if (!ownerId) throw new Error('Owner wajib dipilih');
  const known = this.listExistingOwners().find((o) => o.ownerId === ownerId);
  if (!known) throw new Error('Owner tidak ditemukan pada daftar pemilik investasi yang ada');
  const amount = Number(params.amount);
  if (!isFinite(amount) || amount < 0) {
    throw new Error('Nominal pengembalian harus berupa angka >= 0');
  }
  D.titipanReturns = D.titipanReturns || [];
  const ownerName = (params.ownerName && String(params.ownerName).trim()) || known.ownerName;
  const now = Date.now();
  const record = {
    id: (typeof uid === 'function') ? uid() : ('tr_' + now),
    ownerId,
    ownerName,
    amount,
    returnDate: params.returnDate || '',
    notes: params.notes || '',
    createdAt: now,
  };
  D.titipanReturns.push(record);
  if (typeof save === 'function') save();
  return record;
},

// deleteReturn(id) — Sesi 486 (Case F). Hapus 1 baris riwayat
// pengembalian by `id`. Return `true` kalau ada yang terhapus, `false`
// kalau `id` tidak ditemukan (TIDAK throw — pola sama getter/delete
// read-only-safe lain di codebase ini). ISOLASI TOTAL: HANYA menyentuh
// `D.titipanReturns`.
deleteReturn(id) {
  if (!(D && Array.isArray(D.titipanReturns))) return false;
  const idx = D.titipanReturns.findIndex((r) => r && String(r.id) === String(id));
  if (idx === -1) return false;
  D.titipanReturns.splice(idx, 1);
  if (typeof save === 'function') save();
  return true;
},

};

// DanaTitipanPortfolioPresenter — UI read-only di area Dana Kelolaan yang
// SUDAH ADA (kartu #danaKelolaanLapCard, tab Laporan Keuangan), container
// baru #danaTitipanPortfolioList ditaruh SETELAH
// #danaKelolaanTitipanDetailList (dana-kelolaan-presenter.js) di kartu yang
// sama — pola sama persis (baca-saja, guard container opsional, 0 CSS
// baru: reuse `<details>`/`<summary>` native browser utk expand per owner,
// class `u-flex`/`u-jcb`/`u-fs11`/`u-t2`/`u-fw700` yang sudah dipakai
// `renderTitipanDetail()`). TIDAK mengubah modal "Atur Porsi Kepemilikan"
// (`investasi-view.js`) sama sekali.
const DanaTitipanPortfolioPresenter = {

  _money(n) {
    return (typeof fmtFull === 'function') ? fmtFull(n) : ((typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0)));
  },

  _gainCls(n) {
    if (n > 0) return 'green';
    if (n < 0) return 'red';
    return '';
  },

  // _principalCell(o) — Sesi 485d: tampilkan "Pokok Dikomit" per owner.
  // "Belum dicatat" (BUKAN "Rp0") kalau owner ini belum punya record
  // commitment sama sekali (`principalAmount === null`, lihat build() S485c
  // — sengaja tidak didefault ke 0 supaya "belum pernah diisi" & "sudah
  // diisi 0" tetap kebedakan di tampilan).
  _principalCell(o) {
    if (o.principalAmount === null) return '<span class="u-t2">Belum dicatat</span>';
    return `<span class="u-fw700">${this._money(o.principalAmount)}</span>`;
  },

  // _unallocatedCell(o) — Sesi 485d: label WAJIB "Estimasi Belum
  // Teralokasi" (bukan Kas/Saldo/Dana Tersisa, sesuai rencana sesi —
  // angka ini estimasi dari pokok dikomit dikurangi yang sudah masuk
  // holding, BUKAN saldo kas riil). "Belum dicatat" kalau
  // PRINCIPAL_NOT_SET (estimatedUnallocated null dari build()), badge
  // ⚠️ + tampilkan kelebihan alokasi kalau OVER_ALLOCATED.
  _unallocatedCell(o) {
    if (o.allocationStatus === 'PRINCIPAL_NOT_SET') return '<span class="u-t2">Belum dicatat</span>';
    if (o.allocationStatus === 'OVER_ALLOCATED') {
      return `<span class="titipan-over-badge red">⚠️ Lebih ${this._money(o.overAllocatedAmount)}</span>`;
    }
    return `<span class="u-fw700">${this._money(o.estimatedUnallocated)}</span>`;
  },

  // _outstandingCell(o) — Sesi 486 (Case F). Label WAJIB "Pokok Belum
  // Dikembalikan" (bukan "Outstanding", sesuai rencana sesi). "Belum
  // dicatat" kalau PRINCIPAL_NOT_SET (outstandingPrincipal null dari
  // build() — konsisten dgn `_principalCell()`/`_unallocatedCell()`).
  _outstandingCell(o) {
    if (o.outstandingPrincipal === null) return '<span class="u-t2">Belum dicatat</span>';
    return `<span class="u-fw700">${this._money(o.outstandingPrincipal)}</span>`;
  },

  // _returnsHistoryHtml(ownerId) — Sesi 486 (Case F). Riwayat baris
  // pengembalian per owner, 100% konsumsi
  // `DanaTitipanPortfolioAPI.getReturns(ownerId)` (0 agregasi baru di
  // sini — total sudah dihitung `build()`). Kosong -> string kosong
  // (TIDAK render heading "Riwayat" kalau tidak ada isi, pola sama
  // `o.holdings.map()` di atas yang juga diam kalau kosong).
  // `notes` WAJIB lewat `escapeHtml()` (field user-controlled, sama
  // seperti `ownerName`).
  _returnsHistoryHtml(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return '';
    const list = DanaTitipanPortfolioAPI.getReturns(ownerId) || [];
    if (!list.length) return '';
    return `
          <div class="u-fs11 u-t2 u-ml10 u-mt4">Riwayat pengembalian:</div>
          ${list.map((r) => `
            <div class="u-flex u-jcb u-fs11 u-mb2 u-ml10">
              <span>↩️ ${this._money(r.amount)}${r.returnDate ? ` <span class="u-t2">(${escapeHtml(r.returnDate)})</span>` : ''}${r.notes ? ` <span class="u-t2">— ${escapeHtml(r.notes)}</span>` : ''}</span>
              <button type="button" class="card-setting-btn" data-action="DanaTitipanReturnUI.deleteEntry" data-args='["${r.id}"]' aria-label="Hapus riwayat pengembalian">🗑️</button>
            </div>
          `).join('')}`;
  },

  // _assetOptionsHtml() — SESI 515 (Owner -> Nominal -> Asset -> Kuota ->
  // Porsi). Bangun daftar `<option>` `D.assets` utk dropdown picker "Pilih
  // Aset" per kartu owner — langkah "Asset" di flow, supaya user bisa
  // lompat dari kartu owner LANGSUNG ke `assetOwnersModal` (aset.js, S392a+,
  // live Kuota S505) tanpa cari manual di Buku Aset. PURE, hanya baca
  // `D.assets` — 0 tulis, 0 SSOT baru. Pola SAMA PERSIS
  // `vehicleAssetLinkOptionsHtml()` (modules/vehicle/vehicle-core.js, S506),
  // beda sengaja: 0 filter jenis (dana titipan bisa dialokasikan ke aset
  // jenis apa pun, bukan cuma Kendaraan).
  // Return: string HTML `<option>` (opsi pertama selalu placeholder kosong).
  _assetOptionsHtml() {
    const opts = ['<option value="">— Pilih Aset —</option>'];
    const list = (typeof D !== 'undefined' && Array.isArray(D.assets)) ? D.assets : [];
    list.forEach((a) => {
      if (!a || !a.id) return;
      opts.push('<option value="' + a.id + '">' + escapeHtml(a.name || '?') + '</option>');
    });
    return opts.join('');
  },

  // _holdingCustodianId(hh) — SESI 540-D (Tahap 4/4 DESIGN-S540-
  // CUSTODIAN-GROUPING.md). Baris `hh` di sini adalah entri hasil
  // `DanaTitipanPortfolioAPI.build()` (bucket.holdings[]) — build() itu
  // SENGAJA TIDAK diubah sesi ini (0 field custodianId ditambahkan ke
  // hasilnya), jadi grouping HARUS baca `custodianId` LANGSUNG dari
  // sumber aslinya (`Investment.getHolding()`) di layer render ini, bukan
  // dari `hh`. Hanya baris Investasi (`hh.linkedInvestmentId` terisi)
  // yang punya kemungkinan custodianId — baris Aset (`linkedAssetId`,
  // `linkedInvestmentId` null) TIDAK PERNAH punya custodian (scope S540
  // sengaja cuma `D.investments[]`, lihat Non-goals di Design Lock),
  // jadi otomatis flat. Guard typeof berlapis pola sama fungsi lain di
  // file ini — balikin null (bukan throw) kalau dependency belum dimuat
  // atau holding sumbernya sudah tidak ada (mis. terhapus di antara
  // build() & render, race kecil yang sudah ditoleransi pola lain di
  // file ini juga).
  _holdingCustodianId(hh) {
    if (!hh || !hh.linkedInvestmentId) return null;
    if (typeof Investment === 'undefined' || typeof Investment.getHolding !== 'function') return null;
    const src = Investment.getHolding(hh.linkedInvestmentId);
    return (src && src.custodianId) ? src.custodianId : null;
  },

  // _custodianName(custodianId) — lookup nama dari `CustodianRegistry`
  // (S540-A). Fallback "Kustodian" (BUKAN crash/kosong) kalau id-nya
  // sudah tidak ada di registry (mis. dihapus manual dari data, out-of-
  // scope UI hapus kustodian di paket S540) — grup tetap bisa dibuka,
  // cuma labelnya generic.
  _custodianName(custodianId) {
    if (typeof CustodianRegistry === 'undefined' || typeof CustodianRegistry.listAll !== 'function') return 'Kustodian';
    const found = CustodianRegistry.listAll().find((c) => c && c.id === custodianId);
    return (found && found.name && String(found.name).trim()) || 'Kustodian';
  },

  // _groupHoldingsByCustodian(holdings) — SESI 540-D. Kelompokkan array
  // `o.holdings` (urutan SUDAH terjaga dari build(), sort by
  // allocatedPrincipal desc — TIDAK diubah di sini) jadi urutan node
  // campuran: baris flat (0 custodian) apa adanya di posisi asalnya, DAN
  // grup per kustodian (SATU grup per kustodian, dibuka pertama kali
  // kustodian itu muncul, baris berikutnya dgn kustodian yang SAMA masuk
  // ke grup yang SAMA walau tidak berurutan di array asal). Keputusan
  // Design Lock: holding tanpa custodianId (null/undefined) TETAP FLAT
  // di luar grup — BUKAN dikumpulkan ke grup "Lainnya" (data lama tidak
  // boleh tersembunyi di balik grup baru). Murni reshaping array utk
  // render, 0 agregasi angka baru (pokok/nilai/gain per grup TIDAK
  // dijumlahkan sesi ini — non-goal, header grup hanya nama + jumlah
  // instrumen).
  //
  // FIX s593 (laporan user: "🏦 Majoris" tampil 2x sbg 2 grup terpisah
  // yang isinya kepisah). ROOT CAUSE: grouping dikunci by `custodianId`
  // MENTAH-MENTAH, sedangkan `CustodianRegistry.findOrCreate()`/
  // `rename()` (custodian-registry.js) SENGAJA TIDAK collapse entri
  // yang kebetulan namanya jadi sama (dedup registry itu sendiri by
  // `id`, bukan by nama — lihat catatan di file itu). Kalau 2 entri
  // `D.investmentCustodians` beda `id` tapi sama-sama bernama "Majoris",
  // sebelumnya kode ini bikin 2 node grup terpisah krn `groupIndexById`
  // dikunci by `custodianId`. FIX: kunci grouping by NAMA kustodian yang
  // sudah dinormalisasi (trim + lowercase, pola sama persis dedup-by-
  // nama `CustodianRegistry.findOrCreate()`) — bukan ganti dedup
  // registry (itu tetap by-id, TIDAK disentuh), murni di layer render
  // ini supaya kustodian dgn nama yang sama SELALU digabung jadi 1 grup
  // visual, apa pun `id` aslinya.
  _groupHoldingsByCustodian(holdings) {
    const nodes = [];
    const groupIndexByName = new Map();
    (holdings || []).forEach((hh) => {
      const custodianId = this._holdingCustodianId(hh);
      if (!custodianId) {
        nodes.push({ kind: 'flat', holding: hh });
        return;
      }
      const custodianName = this._custodianName(custodianId);
      const nameKey = String(custodianName).trim().toLowerCase();
      if (!groupIndexByName.has(nameKey)) {
        groupIndexByName.set(nameKey, nodes.length);
        nodes.push({ kind: 'group', custodianId, custodianName, items: [] });
      }
      nodes[groupIndexByName.get(nameKey)].items.push(hh);
    });
    return nodes;
  },

  // _holdingRowHtml(hh) — SESI 540-D: markup 1 baris holding, DIEKSTRAK
  // apa adanya dari isi `o.holdings.map()` lama (0 perubahan visual utk
  // baris flat — dipakai ulang persis sama baik di luar maupun di dalam
  // grup kustodian, supaya baris di dalam grup tampil identik dgn baris
  // flat, cuma beda posisi/indentasi lewat markup pembungkus grup).
  // SESI s591: tombol "⚖️ Atur Porsi" PER-BARIS holding (dulu ada di
  // sini, khusus baris `hasGainTracking:false`/Aset) DIHAPUS — redundan
  // dgn dropdown "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" yang SUDAH
  // ada per kartu owner (lihat `_ownerCardHtml()`/markup sekitar
  // `titipanAssetPick_${oi}`). 2 kontrol terpisah utk 1 tindakan yang
  // sama bikin bingung (user report: "kok ada 2 opsi atur porsi").
  // Sekarang HANYA 1 jalur: pilih aset di dropdown, lalu tap "⚖️ Atur
  // Porsi Aset" — konsisten dipakai baik utk baris Aset satu maupun
  // banyak. `hh.linkedAssetId` tetap dipertahankan di `data-linked-
  // asset-id` (dipakai `onAssetPickChange()` utk highlight baris yang
  // cocok dgn pilihan dropdown), murni bukan trigger aksi lagi di sini.
  _holdingRowHtml(hh) {
    return `
            <div class="titipan-holding-row u-flex u-jcb u-fs11 u-mb2" data-linked-asset-id="${escapeHtml(hh.linkedAssetId || '')}">
              <span>${hh.hasGainTracking === false ? '🏦' : '📈'} ${escapeHtml(hh.name)} <span class="u-t2">(${hh.ownerPct}%)</span></span>
              <span>${hh.hasGainTracking === false ? `
                <span class="u-t2">Nilai: ${this._money(hh.currentValue)}</span>
              ` : `
                <span class="u-t2">${this._money(hh.allocatedPrincipal)} → ${this._money(hh.currentValue)}</span>
                &nbsp;<span class="${this._gainCls(hh.gain)}">${hh.gain >= 0 ? '+' : ''}${this._money(hh.gain)}</span>
              `}</span>
            </div>
          `;
  },

  // _groupSubtotal(items) — SESI 541 (item ringan #1 dari catatan lanjutan
  // S540: "header grup kustodian saat ini cuma nama+jumlah instrumen").
  // Jumlahkan `allocatedPrincipal`/`currentValue`/`gain` dari `items`
  // (array `hh` yang SUDAH dihasilkan `build()`, dikelompokkan
  // `_groupHoldingsByCustodian()`) — 0 rumus finansial baru, murni
  // `reduce()` angka yang SUDAH final per baris holding (sama pola
  // `totals` di `build()`). `items` di sini SELALU baris Investasi
  // (`hasGainTracking:true` — holding Aset TIDAK PERNAH masuk grup
  // kustodian, lihat `_holdingCustodianId()`/test S540D #6), jadi tidak
  // perlu cabang `hasGainTracking:false` di sini.
  // Return: {allocatedPrincipal, currentValue, gain} (0 kalau items kosong).
  _groupSubtotal(items) {
    return (items || []).reduce((acc, hh) => {
      acc.allocatedPrincipal += hh.allocatedPrincipal || 0;
      acc.currentValue += hh.currentValue || 0;
      acc.gain += hh.gain || 0;
      return acc;
    }, { allocatedPrincipal: 0, currentValue: 0, gain: 0 });
  },

  // _holdingsListHtml(holdings) — SESI 540-D: pengganti isi
  // `o.holdings.map().join('')` lama, sekarang lewat
  // `_groupHoldingsByCustodian()` dulu. Baris flat pakai `_holdingRowHtml()`
  // apa adanya (0 markup baru dibanding sebelum sesi ini). Grup kustodian
  // dibungkus `<details>` native (pola sama expand/collapse kartu owner
  // di atasnya) dgn label "🏦 {nama kustodian} ({jumlah instrumen})".
  // SESI 541: summary grup SEKARANG JUGA tampilkan subtotal pokok→kini
  // ±gain (via `_groupSubtotal()`) — supaya user bisa lihat total per
  // kustodian tanpa expand, pola markup SAMA PERSIS baris "Pokok → Kini
  // ±gain" di summary kartu owner di atasnya (`_gainCls()`/`_money()`
  // dipakai ulang apa adanya, 0 helper format baru).
  _holdingsListHtml(holdings) {
    const nodes = this._groupHoldingsByCustodian(holdings);
    return nodes.map((node) => {
      if (node.kind === 'flat') return this._holdingRowHtml(node.holding);
      const sub = this._groupSubtotal(node.items);
      return `
            <details class="titipan-custodian-group u-ml10 u-mb2">
              <summary class="u-flex u-jcb u-fs11 u-pointer">
                <span class="u-t2">🏦 ${escapeHtml(node.custodianName)} (${node.items.length})</span>
                <span class="u-t2">${this._money(sub.allocatedPrincipal)} → ${this._money(sub.currentValue)} <span class="${this._gainCls(sub.gain)}">${sub.gain >= 0 ? '+' : ''}${this._money(sub.gain)}</span></span>
              </summary>
              ${node.items.map((hh) => this._holdingRowHtml(hh)).join('')}
            </details>
          `;
    }).join('');
  },

  render() {
    this.renderInto('danaTitipanPortfolioList');
  },

  // onAssetPickChange(i) — SESI 531 (fix laporan user: dropdown "Pilih
  // Aset" & tombol "⚖️ Atur Porsi" per-institusi di list holding (mis.
  // "🏦 Majoris") adalah 2 kontrol independen — dropdown pilih assetId
  // utk tombol "⚖️ Atur Porsi Aset" DI SEBELAHNYA (openAssetPorsi(), 0
  // diubah), SEDANGKAN tombol per-institusi di bawahnya pakai
  // hh.linkedAssetId sendiri (0 diubah juga). User kira 2 kontrol itu 1
  // alur karena berdekatan tanpa penanda visual. Fix MURNI UI, TIDAK
  // menyentuh openAssetPorsi()/openOwnersModalById() (keduanya sudah
  // benar baca id masing2): saat dropdown berubah, highlight+scroll ke
  // baris holding yang `linkedAssetId`-nya cocok dgn aset terpilih
  // (kalau ada) di dalam `#titipanHoldingsList_{i}`, supaya user LANGSUNG
  // lihat baris mana yang berkaitan dgn pilihan dropdown-nya sebelum tap
  // tombol manapun. 0 aggregasi/CRUD baru, cuma DOM highlight sementara.
  // SESI 544 (audit laporan user: toast "⚠️ Pilih aset dulu" tetap
  // muncul walau dropdown "Pilih Aset" kelihatan sudah terisi, MASIH
  // terjadi setelah fix S543 preserve-selection). ROOT CAUSE BARU
  // (beda dari S543): `renderLaporan()` (modules-render.js) me-render
  // `DanaTitipanPortfolioPresenter` ke DUA container SEKALIGUS tiap
  // panggilan -- `#danaTitipanPortfolioList` (kartu lama di tab
  // Uang/Dana Kelolaan) DAN `#danaTitipanTabList` (sub-tab Laporan >
  // Dana Titipan, Sesi 498) -- KEDUANYA ada permanen di DOM (index.html,
  // tidak dilepas/dibuat ulang per tab aktif, cuma disembunyikan via
  // CSS). Karena isi kedua container 100% SAMA (sumber data sama,
  // `DanaTitipanPortfolioAPI.build()`), ID `titipanAssetPick_N`/
  // `titipanHoldingsList_N`/`titipanOwnerCard_N` di render() jadi
  // DUPLIKAT persis di 2 tempat sekaligus. `document.getElementById()`
  // SELALU balikin elemen PERTAMA yang match di seluruh dokumen --
  // kalau user pilih dropdown di container KEDUA (mis. lagi buka
  // sub-tab Laporan > Dana Titipan), tapi container PERTAMA (kartu tab
  // Uang, mungkin tidak pernah disentuh) render duluan di HTML, maka
  // `getElementById('titipanAssetPick_N')` diam2 balikin punya
  // container PERTAMA (masih placeholder kosong) -- BUKAN yang baru
  // saja dipilih user. Toast "Pilih aset dulu" muncul walau user MERASA
  // sudah pilih (S543 preserve-selection sendiri BENAR & tetap berguna
  // -- ini bug DUPLIKAT ID yang beda lapis, S543 tidak menyentuhnya
  // krn scope-nya cuma re-render dalam 1 container yang sama).
  //
  // FIX: 0 lagi baca id global -- sekarang terima ELEMEN pemicu
  // langsung (`this` dari <select onchange>, `$el` dari data-action
  // dispatcher, lihat features-helpers-global-security.js
  // `_dataActionClickHandler` yang SUDAH mendukung placeholder `$el`),
  // lalu telusur DOM relatif (`closest('details')` -> `querySelector`)
  // supaya SELALU dapat elemen di CONTAINER YANG SAMA dgn yang diklik
  // user, apa pun urutan render 2 container itu. Dual-mode: kalau
  // dipanggil dgn angka index (pola lama, dipakai test existing/kode
  // lama mana pun yang belum sempat diupdate) tetap fallback ke
  // `getElementById()` lama (0 breaking change), TAPI itu tetap rawan
  // bug duplikat ID yang sama -- jalur BARU (elemen) yang dipakai
  // markup render() sekarang (lihat perubahan di bawah).
  onAssetPickChange(target) {
    let sel = null;
    let list = null;
    let card = null;
    if (target && typeof target === 'object' && typeof target.closest === 'function') {
      sel = target;
      card = target.closest('details');
      list = card && typeof card.querySelector === 'function' ? card.querySelector('[id^="titipanHoldingsList_"]') : null;
    } else {
      sel = document.getElementById('titipanAssetPick_' + target);
      list = document.getElementById('titipanHoldingsList_' + target);
      card = document.getElementById('titipanOwnerCard_' + target);
    }
    if (!list) return;
    const rows = list.querySelectorAll('[data-linked-asset-id]');
    rows.forEach((row) => { row.style.outline = ''; row.style.borderRadius = ''; row.style.background = ''; });
    const assetId = sel ? sel.value : '';
    if (!assetId) return;
    let matched = null;
    rows.forEach((row) => {
      if (row.getAttribute('data-linked-asset-id') === assetId) matched = row;
    });
    if (matched) {
      matched.style.outline = '2px solid var(--accent, #4a9eff)';
      matched.style.borderRadius = '6px';
      matched.style.background = 'rgba(74,158,255,0.08)';
      if (card && 'open' in card) card.open = true;
      matched.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  // renderInto(containerId) — SESI 498 (Tab "Dana Titipan" Terpadu, Sesi A
  // §2.2 rancangan audit AUDIT-DANA-TITIPAN-TAB-TERPADU.md): generalisasi
  // render() supaya bisa dipasang ke LEBIH dari satu container sekaligus
  // (kartu lama #danaTitipanPortfolioList di dalam Dana Kelolaan/Laporan >
  // Ringkasan, TIDAK diubah/dihapus — plus container baru
  // #danaTitipanTabList di sub-tab Laporan > Dana Titipan). 0 perubahan
  // logic/HTML output per container — render() tetap 100% method lama
  // (delegasi 1 baris ke sini dgn id lama), semua test s484/s485d/s486
  // existing tidak berubah hasilnya. TIDAK ada agregasi/rumus baru di sini.
  // renderInto() — SESI 539: skeleton state saat `DanaTitipanPortfolioAPI.
  // build()` (agregasi lintas Investment+Aset) berpotensi lambat kalau
  // holding banyak, supaya browser sempat paint sesuatu dulu sebelum main
  // thread diblok proses build()+render string HTML besar (backlog S535).
  // HANYA aktif kalau `requestAnimationFrame` ada di global (browser
  // nyata) — di harness test Node (tests/helpers/loadSource.js, vm sandbox
  // TANPA rAF), `typeof requestAnimationFrame` selalu 'undefined', jadi
  // fallback ke `_renderNow()` sinkron seperti sebelumnya. Artinya: 0
  // perubahan perilaku/output/test existing (s484/s485d/s486/s498/dst,
  // semua panggil renderInto() lalu langsung cek el.innerHTML sinkron) —
  // skeleton HANYA kelihatan di app nyata, 1 frame doang sebelum konten asli.
  renderInto(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return; // container belum ada di halaman ini, aman diam2ny (pola sama presenter lain).
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;

    if (typeof requestAnimationFrame === 'function') {
      el.innerHTML = '<div class="u-fs11 u-t2 u-mt6 titipan-skeleton-row"></div><div class="u-fs11 u-t2 u-mt6 titipan-skeleton-row"></div><div class="u-fs11 u-t2 u-mt6 titipan-skeleton-row"></div>';
      requestAnimationFrame(() => this._renderNow(el));
      return;
    }
    this._renderNow(el);
  },

  // _captureAssetPickSelections(el) — SESI 543 (fix laporan user:
  // dropdown "Pilih Aset" per kartu owner "belum sinkron"). ROOT CAUSE:
  // _renderNow() mengganti SELURUH el.innerHTML tiap kali dipanggil ulang
  // (dan dipanggil ulang dari renderLaporan() setiap ada perubahan lain
  // di halaman, mis. harga investasi live update) — _assetOptionsHtml()
  // SELALU generate opsi pertama "— Pilih Aset —" TANPA `selected` sesuai
  // pilihan sebelumnya, jadi pilihan dropdown user diam2 ke-reset ke
  // placeholder sebelum sempat tap "Atur Porsi Aset". Preservasi PER
  // ownerId (via `data-owner-id` di tiap <select>, BUKAN cuma index oi —
  // index bisa berubah antar render kalau urutan owners berubah, mis.
  // owner baru masuk di tengah / sort ulang). Dipanggil SEBELUM
  // el.innerHTML ditimpa. Guard `typeof el.querySelectorAll` (pola sama
  // gaya guard lain di file ini, mis. `typeof D !== 'undefined'`) — aman
  // di test harness yang pakai DOM mock ringan tanpa querySelectorAll
  // (getElementById-only, lihat tests/s515-*.test.js), fallback diam2
  // objek kosong (0 restore, TAPI juga 0 crash).
  _captureAssetPickSelections(el) {
    const map = {};
    if (!el || typeof el.querySelectorAll !== 'function') return map;
    const selects = el.querySelectorAll('select[id^="titipanAssetPick_"]');
    selects.forEach((sel) => {
      const ownerId = sel.getAttribute && sel.getAttribute('data-owner-id');
      if (ownerId && sel.value) map[ownerId] = sel.value;
    });
    return map;
  },

  // _restoreAssetPickSelections(el, savedByOwner) — SESI 543. Dipanggil
  // SETELAH el.innerHTML ditimpa dgn markup baru (opsi placeholder
  // default dari _assetOptionsHtml()). Cocokkan tiap <select> baru via
  // `data-owner-id` ke hasil _captureAssetPickSelections() SEBELUM
  // render, lalu set .value. TIDAK divalidasi assetId-nya masih ada di
  // D.assets atau tidak sebelum di-set — kalau sudah tidak ada di antara
  // opsi (mis. aset itu terhapus di antara render), browser native diam2
  // fallback .value ke '' (tidak match opsi manapun), sama seperti
  // perilaku native <select> lainnya, jadi aman tanpa validasi tambahan.
  _restoreAssetPickSelections(el, savedByOwner) {
    if (!el || typeof el.querySelectorAll !== 'function') return;
    if (!savedByOwner || !Object.keys(savedByOwner).length) return;
    const selects = el.querySelectorAll('select[id^="titipanAssetPick_"]');
    selects.forEach((sel) => {
      const ownerId = sel.getAttribute && sel.getAttribute('data-owner-id');
      if (ownerId && savedByOwner[ownerId]) sel.value = savedByOwner[ownerId];
    });
  },

  // _renderNow(el) — SESI 539: badan asli renderInto() (0 logika diubah,
  // cuma dipindah ke method terpisah supaya bisa dipanggil sinkron ATAU
  // via requestAnimationFrame() dari renderInto() di atas). SESI 543:
  // tambah capture/restore pilihan dropdown `#titipanAssetPick_N` di
  // sekeliling penggantian el.innerHTML (lihat _captureAssetPickSelections
  // / _restoreAssetPickSelections di atas) — SATU-SATUNYA perubahan
  // perilaku sesi ini, 0 logika projection/aggregasi lain disentuh.
  _renderNow(el) {
    const savedAssetPicks = this._captureAssetPickSelections(el);
    const projection = DanaTitipanPortfolioAPI.build();
    // Sesi 485d — tombol buka modal "💰 Pokok Dana Titipan" (murni
    // konsumsi API sesi 485a-c: listExistingOwners()/saveCommitment(),
    // 0 logika CRUD/projection baru ditulis di sini). Selalu ditampilkan
    // di atas (bukan cuma saat owners.length>0) supaya owner yang baru
    // saja dapat porsi holding (jadi listExistingOwners()) tapi belum
    // pernah dicatat pokoknya tetap bisa langsung dicatat dari sini.
    const addBtn = '<button type="button" class="btn btn-ghost btn-full btn-sm u-mb8" data-action="DanaTitipanCommitmentUI.open">💰 Catat/Update Pokok Dana Titipan</button>';
    // expenseBtn — SESI 521-B2 (DESIGN-S520-DANA-TITIPAN-UI-MULTIOWNER.md):
    // pemicu modal `titipanExpenseModal` (S521-B1) -> `TitipanExpenseUI.open()`
    // (S521-B2, murni konsumsi TitipanExpenseFlow S521-A). Selalu ditampilkan
    // bareng addBtn (bukan cuma saat owners.length>0), pola sama addBtn.
    const expenseBtn = '<button type="button" class="btn btn-ghost btn-full btn-sm u-mb8" data-action="TitipanExpenseUI.open">💸 Catat Pengeluaran Dana Titipan</button>';
    if (!projection.owners.length) {
      el.innerHTML = addBtn + expenseBtn + '<div class="u-fs11 u-t2 u-mt6">Belum ada porsi dana titipan yang teralokasi ke holding investasi.</div>';
      return;
    }

    el.innerHTML = addBtn + expenseBtn + `
      <div class="u-fs11 u-t2 u-mt10 u-mb4">Dana titipan dalam investasi (per pemilik, teralokasi ke instrumen):</div>
      ${projection.owners.map((o, oi) => `
        <details class="u-mb6${o.allocationStatus === 'OVER_ALLOCATED' ? ' titipan-owner-alert' : ''}" id="titipanOwnerCard_${oi}">
          <summary class="u-flex u-jcb u-fs12 u-pointer titipan-summary-sticky">
            <span>${o.allocationStatus === 'OVER_ALLOCATED' ? '⚠️ ' : ''}👤 ${escapeHtml(o.ownerName)}</span>
            <span>
              <span class="u-t2">Pokok</span> <span class="u-fw700">${this._money(o.allocatedPrincipal)}</span>
              &nbsp;→&nbsp;
              <span class="u-t2">Kini</span> <span class="u-fw700">${this._money(o.currentValue)}</span>
              &nbsp;<span class="u-fw700 ${this._gainCls(o.gain)}">${o.gain >= 0 ? '+' : ''}${this._money(o.gain)}</span>
            </span>
          </summary>
          <div class="titipan-detail-grid u-fs11 u-mb6" style="display:grid;grid-template-columns:1fr 1fr;gap:3px 10px">
            <span class="u-t2">Pokok Dikomit</span><span>${this._principalCell(o)}</span>
            <span class="u-t2">Teralokasi ke Holding</span><span class="u-fw700">${this._money(o.allocatedPrincipal)}</span>
            <span class="u-t2">Estimasi Belum Teralokasi</span><span>${this._unallocatedCell(o)}</span>
            <span class="u-t2">Nilai Saat Ini</span><span class="u-fw700">${this._money(o.currentValue)}</span>
            <span class="u-t2">Untung-Rugi</span><span class="u-fw700 ${this._gainCls(o.gain)}">${o.gain >= 0 ? '+' : ''}${this._money(o.gain)}</span>
            <span class="u-t2">Sudah Dikembalikan</span><span class="u-fw700">${this._money(o.returnedTotal)}</span>
            <span class="u-t2">Pokok Belum Dikembalikan</span><span>${this._outstandingCell(o)}</span>
          </div>
          <div class="btn-row3 u-ml10 u-mb6" style="gap:6px">
            <button type="button" class="btn btn-ghost btn-sm" style="padding:7px 4px;font-size:10px;line-height:1.2;gap:2px;white-space:normal;text-align:center" data-action="DanaTitipanCommitmentUI.open" data-args="${escapeHtml(JSON.stringify([o.ownerId]))}">✏️ Atur Pokok Dana Titipan</button>
            <button type="button" class="btn btn-ghost btn-sm" style="padding:7px 4px;font-size:10px;line-height:1.2;gap:2px;white-space:normal;text-align:center" data-action="DanaTitipanReturnUI.open" data-args="${escapeHtml(JSON.stringify([o.ownerId]))}">↩️ Catat Pengembalian</button>
            <button type="button" class="btn btn-ghost btn-sm" style="padding:7px 4px;font-size:10px;line-height:1.2;gap:2px;white-space:normal;text-align:center" data-action="DanaTitipanCommitmentUI.removeOwnerLinkage" data-args="${escapeHtml(JSON.stringify([o.ownerId]))}">🔓 Lepas Keterikatan Dana Titipan</button>
          </div>
          <div class="u-flex u-gap4 u-mb6 u-ml10 u-fs11">
            <select id="titipanAssetPick_${oi}" data-owner-id="${escapeHtml(o.ownerId)}" class="fs u-flex-1" style="padding:8px 10px;font-size:11px" aria-label="Pilih Aset (lalu tap Atur Porsi Aset di sebelah kanan)" onchange="DanaTitipanPortfolioPresenter.onAssetPickChange(this)">${this._assetOptionsHtml()}</select>
            <button type="button" class="btn btn-ghost btn-sm" data-action="DanaTitipanCommitmentUI.openAssetPorsi" data-args='["$el"]'>⚖️ Atur Porsi Aset</button>
          </div>
          ${this._returnsHistoryHtml(o.ownerId)}
          <div id="titipanHoldingsList_${oi}">
          ${!o.holdings.length ? `
            <div class="u-fs11 u-t2 u-ml10 titipan-holding-row">Belum ada instrumen terhubung ke owner ini — pilih aset dari dropdown di atas lalu atur porsinya.</div>
          ` : this._holdingsListHtml(o.holdings)}
          </div>
        </details>
      `).join('')}
      <div class="u-flex u-jcb u-fs12 u-mt6 u-pt6" style="border-top:1px dashed var(--border,#ddd)">
        <span class="u-fw700">Total Teralokasi</span>
        <span>
          <span class="u-fw700">${this._money(projection.totals.allocatedPrincipalTotal)}</span>
          → <span class="u-fw700">${this._money(projection.totals.currentValueTotal)}</span>
          &nbsp;<span class="u-fw700 ${this._gainCls(projection.totals.gainTotal)}">${projection.totals.gainTotal >= 0 ? '+' : ''}${this._money(projection.totals.gainTotal)}</span>
        </span>
      </div>
      <div class="u-flex u-jcb u-fs11 u-mt4">
        <span class="u-t2">Total Pokok Dikomit</span>
        <span class="u-fw700">${this._money(projection.totals.principalAmountTotal)}</span>
      </div>
      <div class="u-flex u-jcb u-fs11 u-mt2">
        <span class="u-t2">Total Estimasi Belum Teralokasi</span>
        <span class="u-fw700">${this._money(projection.totals.estimatedUnallocatedTotal)}</span>
      </div>
      ${projection.totals.overAllocatedTotal > 0 ? `
      <div class="u-flex u-jcb u-fs11 u-mt2">
        <span class="u-t2">Total Kelebihan Alokasi</span>
        <span class="titipan-over-badge red">⚠️ ${this._money(projection.totals.overAllocatedTotal)}</span>
      </div>` : ''}
    `;
    this._restoreAssetPickSelections(el, savedAssetPicks);
  },

};

// DanaTitipanCommitmentUI — Sesi 485d (Gap #3 audit, langkah 4/5 dari
// rencana multi-sesi — lihat RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md):
// modal CRUD "💰 Pokok Dana Titipan" (`titipanCommitmentModal`,
// modals.js), pola gabungan `investmentOwnersModal` (dropdown owner
// via listExistingOwners(), TIDAK BOLEH ketik nama bebas) +
// `investmentTxModal` (form tambah sederhana). MURNI konsumsi API sesi
// 485a-c (`DanaTitipanPortfolioAPI.listExistingOwners()`/
// `getCommitments()`/`saveCommitment()`) — 0 logika CRUD/projection
// baru ditulis di sini, file ini hanya baca input DOM & panggil API
// yang sudah ada + validasi (SUDAH ADA di saveCommitment()).
const DanaTitipanCommitmentUI = {

  // editingOwnerId — Sesi 522, pola SAMA PERSIS `InvestmentListUI.editId`
  // (investasi-list-view.js): ownerId yang SEDANG dibuka di modal ini
  // dalam mode edit (record commitment sudah ada), `null` kalau mode
  // tambah baru. Dipakai `deleteCommitment()` supaya tombol 🗑 Hapus
  // tahu owner mana yang mau dihapus tanpa perlu data-args statis (form
  // dropdown owner tidak dikunci setelah dibuka, jadi TIDAK aman baca
  // dari `#titipanCommitOwner` langsung saat delete — orang bisa saja
  // sempat ganti pilihan dropdown sebelum tap Hapus).
  editingOwnerId: null,

  // open(ownerId) — Sesi 485d. Isi dropdown owner dari
  // listExistingOwners() (bukan free-text — cegah user bikin identity
  // baru yang tidak nyambung ke holding manapun, sama alasan
  // listExistingOwners() sendiri, S485a). Kalau `ownerId` diberikan &
  // sudah punya record commitment tersimpan (getCommitments()), field
  // Pokok/Tanggal/Catatan diisi otomatis dari situ (mode edit) — kalau
  // tidak, form kosong (mode tambah baru, owner dipilih manual dari
  // dropdown).
  open(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pokok dana titipan belum siap dimuat'); return; }
    const owners = DanaTitipanPortfolioAPI.listExistingOwners();
    const sel = document.getElementById('titipanCommitOwner');
    if (sel) {
      if (!owners.length) {
        sel.innerHTML = '<option value="">— Belum ada owner di holding investasi —</option>';
      } else {
        sel.innerHTML = owners.map((o) => `<option value="${escapeHtml(o.ownerId)}">${escapeHtml(o.ownerName)}</option>`).join('');
      }
      if (ownerId) sel.value = ownerId;
    }
    const existing = ownerId
      ? DanaTitipanPortfolioAPI.getCommitments().find((c) => c && c.ownerId === ownerId)
      : null;
    const principalEl = document.getElementById('titipanCommitPrincipal');
    if (principalEl) principalEl.value = existing ? existing.principalAmount : '';
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanCommitPrincipal', 'titipanCommitPrincipalPreview');
    const dateEl = document.getElementById('titipanCommitDate');
    if (dateEl) dateEl.value = existing ? (existing.committedDate || '') : '';
    const notesEl = document.getElementById('titipanCommitNotes');
    if (notesEl) notesEl.value = existing ? (existing.notes || '') : '';
    // Sesi 522: tandai mode edit + tampilkan tombol 🗑 Hapus HANYA kalau
    // record commitment sudah ada utk owner ini (mode tambah baru -> 0
    // apa pun utk dihapus, tombol tetap disembunyikan, pola sama
    // `investmentModal`/`investmentDeleteBtn`).
    DanaTitipanCommitmentUI.editingOwnerId = existing ? ownerId : null;
    const delBtn = document.getElementById('titipanCommitDelBtn');
    if (delBtn && delBtn.style) delBtn.style.display = existing ? '' : 'none';
    if (typeof openModal === 'function') openModal('titipanCommitmentModal');
  },

  // addNewOwner() — Sesi 523-B (BUG-01). Modal ini sebelumnya HANYA bisa
  // pilih owner existing dari listExistingOwners() (dropdown read-only,
  // Design Lock S485d) -- tidak ada jalan membuat owner baru langsung
  // dari sini, harus muter dulu lewat "⚖️ Atur Porsi Kepemilikan" di
  // Investasi/Aset. Fix ini TIDAK melanggar Design Lock: tetap 0 free-text
  // langsung ke saveCommitment() (ownerId masih wajib dari
  // listExistingOwners()) -- yang baru cuma jalur MEMBUAT owner itu lebih
  // dulu via OwnerRegistry.findOrCreate() (S489, API resmi, sama seperti
  // dipakai assetOwnersModal/investmentOwnersModal), lalu open() dipanggil
  // ulang supaya dropdown ter-refresh dan owner baru otomatis dipilih
  // (listExistingOwners() sudah include OwnerRegistry.listAll() sejak
  // S492, jadi owner baru ini langsung muncul di union).
  async addNewOwner() {
    if (typeof OwnerRegistry === 'undefined' || typeof OwnerRegistry.findOrCreate !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur tambah pemilik belum siap dimuat');
      return;
    }
    const name = typeof showPromptModal === 'function'
      ? await showPromptModal({ title: 'Tambah Pemilik Baru', message: 'Nama pemilik dana titipan', placeholder: 'Budi, Ibu, dll' })
      : (typeof prompt === 'function' ? prompt('Nama pemilik dana titipan') : null);
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const ownerId = OwnerRegistry.findOrCreate(trimmed);
    DanaTitipanCommitmentUI.open(ownerId);
    if (typeof toast === 'function') toast('✅ Pemilik "' + trimmed + '" ditambahkan');
  },

  // save() — Sesi 485d. Baca form, panggil
  // `DanaTitipanPortfolioAPI.saveCommitment()` (S485b, validasi
  // existing-owner-only + principal>=0 SUDAH ADA di sana — 0 validasi
  // baru ditulis di sini). `saveCommitment()` melempar Error kalau
  // validasi gagal, dibungkus try/catch pola sama
  // `InvestmentUI.saveOwners()`.
  save() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pokok dana titipan belum siap dimuat'); return; }
    const sel = document.getElementById('titipanCommitOwner');
    const ownerId = sel ? sel.value : '';
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner wajib dipilih'); return; }
    const ownerName = sel && sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
    const principalEl = document.getElementById('titipanCommitPrincipal');
    const principalAmount = principalEl ? principalEl.value : '';
    const committedDate = (document.getElementById('titipanCommitDate') || {}).value || '';
    const notes = (document.getElementById('titipanCommitNotes') || {}).value || '';
    try {
      DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName, principalAmount, committedDate, notes });
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan pokok dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanCommitmentModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // Sesi 550 (FIX-S550-DANA-TITIPAN-TABLIST-SYNC-COMMITMENT-UI): sinkron
    // container #danaTitipanTabList (sub-tab Laporan > Dana Titipan, Sesi
    // 498) setelah save() commitment — pola PERSIS sama seperti panggilan
    // di renderLaporan() (modules-render.js), 0 logic baru, hanya
    // memastikan container BARU ini ikut ter-refresh saat commitment
    // diubah lewat modal (sebelumnya cuma render() ke container LAMA
    // #danaTitipanPortfolioList yang ke-refresh, #danaTitipanTabList baru
    // ikut update di render berikutnya lewat renderLaporan()).
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('✅ Pokok dana titipan tersimpan');
  },

  // deleteCommitment() — Sesi 522 (FIX-S521-DANA-TITIPAN-UI-MULTIOWNER,
  // gap #2). Hapus record commitment owner yang SEDANG dibuka
  // (`editingOwnerId`, di-set di `open()` — TIDAK baca ulang dropdown,
  // lihat komentar `editingOwnerId` di atas), `askConfirm()` dulu (pola
  // sama `DanaTitipanReturnUI.deleteEntry()`), 100% reuse
  // `DanaTitipanPortfolioAPI.deleteCommitment()` (0 logic baru).
  async deleteCommitment() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    const ownerId = DanaTitipanCommitmentUI.editingOwnerId;
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Belum ada pokok dana titipan tersimpan utk owner ini'); return; }
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm('Hapus pokok dana titipan owner ini?', { okText: 'Ya, Hapus' });
      if (!ok) return;
    }
    DanaTitipanPortfolioAPI.deleteCommitment(ownerId);
    DanaTitipanCommitmentUI.editingOwnerId = null;
    if (typeof closeModal === 'function') closeModal('titipanCommitmentModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // Sesi 550 (FIX-S550-DANA-TITIPAN-TABLIST-SYNC-COMMITMENT-UI): sama
    // seperti save() di atas — sinkron #danaTitipanTabList setelah hapus
    // commitment, pola PERSIS sama dgn renderLaporan() (0 logic baru).
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('🗑️ Pokok dana titipan dihapus');
  },

  // removeOwnerLinkage(ownerId) — Sesi 523-C (BUG-02/BUG-06). Dipanggil
  // LANGSUNG dari kartu owner di dashboard (tombol "🔓 Lepas Keterikatan
  // Dana Titipan") — TIDAK perlu buka modal `titipanCommitmentModal`
  // dulu (beda dari `deleteCommitment()` di atas yang baca
  // `editingOwnerId`, HANYA valid kalau modal itu sedang terbuka).
  // `ownerId` diberikan LANGSUNG dari `data-args` kartu (pola sama
  // `DanaTitipanReturnUI.open(ownerId)`), 0 baca state modal tersembunyi.
  // 100% reuse `DanaTitipanPortfolioAPI.removeOwnerLinkage()` (0 logic
  // baru) + `askConfirm()` dulu (pola sama `deleteCommitment()`/
  // `DanaTitipanReturnUI.deleteEntry()`). Pesan konfirmasi eksplisit
  // menyebutkan bedanya dari delete commitment biasa (porsi Investasi/
  // Aset & identitas owner TIDAK ikut hilang) supaya user tidak salah
  // duga ini "hapus owner".
  async removeOwnerLinkage(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner tidak dikenali'); return; }
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm(
        'Lepas keterikatan owner ini dari Dana Titipan?\nPokok dana titipan yang tercatat akan dihapus. Porsi kepemilikan di Investasi/Aset TIDAK ikut berubah, dan identitas pemilik ini tetap ada (bisa dipakai lagi kapan saja).',
        { okText: 'Ya, Lepas' },
      );
      if (!ok) return;
    }
    const removed = DanaTitipanPortfolioAPI.removeOwnerLinkage(ownerId);
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof toast === 'function') {
      toast(removed ? '🔓 Keterikatan Dana Titipan dilepas' : 'ℹ️ Owner ini belum punya pokok dana titipan tercatat');
    }
  },

  // openAssetPorsi(i) — SESI 515 (Owner -> Nominal -> Asset -> Kuota ->
  // Porsi). Wrapper navigasi TIPIS dari kartu Dana Titipan ke
  // `assetOwnersModal` (aset.js, S392a+, live Kuota S505) utk aset yang
  // dipilih dari dropdown picker `renderInto()`
  // (`DanaTitipanPortfolioPresenter._assetOptionsHtml()`). `i` = index urutan
  // kartu owner SAAT render() ini — dipakai HANYA utk cari elemen DOM
  // picker-nya sendiri (`#titipanAssetPick_{i}`), BUKAN identity
  // owner/aset. 0 logika CRUD/porsi baru di sini — 100% delegasi ke
  // `Aset.openOwnersModalById()` (baru, aset.js Sesi 515) yang sendiri
  // 100% reuse `Aset.openOwnersModal()` existing (S392a).
  // SESI 544 — sama root cause & fix dgn `onAssetPickChange()` di atas
  // (duplikat ID `titipanAssetPick_N` di 2 container render bersamaan).
  // Dual-mode: elemen tombol (`$el`, dipakai markup baru) ATAU angka
  // index (fallback lama, 0 breaking change utk caller/test existing).
  openAssetPorsi(target) {
    let sel = null;
    if (target && typeof target === 'object' && typeof target.closest === 'function') {
      const card = target.closest('details');
      sel = card && typeof card.querySelector === 'function' ? card.querySelector('select[id^="titipanAssetPick_"]') : null;
    } else {
      sel = document.getElementById('titipanAssetPick_' + target);
    }
    const assetId = sel ? sel.value : '';
    if (!assetId) { if (typeof toast === 'function') toast('⚠️ Pilih aset dulu'); return; }
    if (typeof Aset === 'undefined' || typeof Aset.openOwnersModalById !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur Buku Aset belum siap dimuat');
      return;
    }
    Aset.openOwnersModalById(assetId);
  },

};

// DanaTitipanReturnUI — Sesi 486 (Case F: Partial Return / Pengembalian
// Dana Titipan, lihat RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md,
// lanjutan Gap #3 yang SUDAH SELESAI S485a-e). Modal "↩️ Catat
// Pengembalian" (`titipanReturnModal`, modals.js) — beda dari
// `titipanCommitmentModal`: field Owner di sini READONLY DISPLAY (bukan
// dropdown), karena pengembalian SELALU terikat ke owner yang sedang
// dibuka dari kartunya sendiri (bukan record baru bebas pilih owner).
// MURNI konsumsi API Sesi 486 (`DanaTitipanPortfolioAPI.recordReturn()`/
// `getReturns()`/`deleteReturn()`) — 0 logika CRUD baru ditulis di sini,
// pola SAMA PERSIS `DanaTitipanCommitmentUI` (S485d).
const DanaTitipanReturnUI = {

  // open(ownerId) — isi tampilan owner (readonly) dari
  // listExistingOwners() + kosongkan form (SELALU mode tambah baru —
  // riwayat pengembalian TIDAK PERNAH diedit, hanya ditambah/dihapus,
  // pola sama InvestmentTxUI "hapus lalu catat ulang").
  open(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pengembalian dana titipan belum siap dimuat'); return; }
    const known = DanaTitipanPortfolioAPI.listExistingOwners().find((o) => o.ownerId === ownerId);
    const ownerDisplayEl = document.getElementById('titipanReturnOwnerDisplay');
    if (ownerDisplayEl) ownerDisplayEl.textContent = known ? known.ownerName : '';
    const ownerIdEl = document.getElementById('titipanReturnOwnerId');
    if (ownerIdEl) ownerIdEl.value = ownerId || '';
    const amountEl = document.getElementById('titipanReturnAmount');
    if (amountEl) amountEl.value = '';
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanReturnAmount', 'titipanReturnAmountPreview');
    const dateEl = document.getElementById('titipanReturnDate');
    if (dateEl) dateEl.value = '';
    const notesEl = document.getElementById('titipanReturnNotes');
    if (notesEl) notesEl.value = '';
    if (typeof openModal === 'function') openModal('titipanReturnModal');
  },

  // save() — baca form, panggil `DanaTitipanPortfolioAPI.recordReturn()`
  // (validasi existing-owner-only + amount>=0 SUDAH ADA di sana — 0
  // validasi baru di sini). `recordReturn()` melempar Error kalau
  // validasi gagal, dibungkus try/catch pola sama
  // `DanaTitipanCommitmentUI.save()`.
  save() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pengembalian dana titipan belum siap dimuat'); return; }
    const ownerIdEl = document.getElementById('titipanReturnOwnerId');
    const ownerId = ownerIdEl ? ownerIdEl.value : '';
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner wajib dipilih'); return; }
    const ownerDisplayEl = document.getElementById('titipanReturnOwnerDisplay');
    const ownerName = ownerDisplayEl ? ownerDisplayEl.textContent : '';
    const amountEl = document.getElementById('titipanReturnAmount');
    const amount = amountEl ? amountEl.value : '';
    const returnDate = (document.getElementById('titipanReturnDate') || {}).value || '';
    const notes = (document.getElementById('titipanReturnNotes') || {}).value || '';
    try {
      DanaTitipanPortfolioAPI.recordReturn({ ownerId, ownerName, amount, returnDate, notes });
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal mencatat pengembalian dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanReturnModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof toast === 'function') toast('✅ Pengembalian dana titipan tercatat');
  },

  // deleteEntry(id) — hapus 1 baris riwayat pengembalian, `askConfirm()`
  // dulu (pola sama `InvestmentTxUI.deleteTx()`), 100% reuse
  // `DanaTitipanPortfolioAPI.deleteReturn()` (0 logic baru).
  async deleteEntry(id) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm('Hapus riwayat pengembalian ini?', { okText: 'Ya, Hapus' });
      if (!ok) return;
    }
    DanaTitipanPortfolioAPI.deleteReturn(id);
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof toast === 'function') toast('🗑️ Riwayat pengembalian dihapus');
  },

};

if (typeof window !== 'undefined') {
  window.DanaTitipanCommitmentUI = DanaTitipanCommitmentUI;
  window.DanaTitipanReturnUI = DanaTitipanReturnUI;
}
