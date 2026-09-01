// titipan-reconcile.js — Audit konsistensi Dana Titipan (Rekomendasi #2, S582
// closeout; cabang Investasi ditambah S583 sesi-2; audit OwnerRegistry
// cross-domain Rekomendasi #3 ditambah S583 sesi-4; audit staleness nama
// Buku Utang pasca-rename ditambah S583 sesi-5; checkAll() agregator 1
// pintu tunggal ditambah S583 sesi-6; checkAll() di-wire ke Tes Otomatis
// (self-test.js/getSelfTestCases()) S583 sesi-7 -- sekarang jalan otomatis
// tiap Tes Otomatis, bukan cuma panggilan manual; warnIfNotOk() ditambah
// S583 sesi-9 -- Rekomendasi #3 bagian ENFORCEMENT, di-wire ke 3 titik
// saveOwners() (Aset/InvestmentUI/AccOwners) supaya checkAll() jalan tiap
// porsi kepemilikan disimpan, bukan cuma nunggu Tes Otomatis -- NON-BLOCKING
// (console.warn saja, tidak pernah menolak simpan), lihat komentar
// warnIfNotOk() di bawah utk alasan lengkap). PURE, baca-saja (0 mutasi)
// — reuse 100% MultiOwnerEngine/Investment/D.debts yang sudah ada, 0 rumus
// baru. Tujuan: 1 titik cek yang membandingkan "harusnya ada" (dihitung dari
// a.owners[]/holding fundSource) vs "yang benar-benar tercatat" di Buku Utang
// (linkedAssetId/linkedInvestmentId + linkedOwnerId), supaya gap seperti
// BUG-OWN-002 (entry point baru lupa panggil sync) ketahuan otomatis, bukan
// lewat audit manual tiap sesi.
const TitipanReconcile = {

// _expectedFromAssets() — {key: amount} yang SEHARUSNYA ada di Buku Utang,
// key = linkedAssetId+'::'+ownerId, dihitung PERSIS pola _syncOwnerDebts()
// (aset.js) supaya expected value 1:1 sama dgn cara debt itu dibuat.
// FIX (S639 — "Perbaiki Gap Dana Titipan" tidak pernah menghilangkan gap
// utk owner ber-status 'milik'): _syncOwnerDebts() (aset-owners.js) SUDAH
// LAMA skip owner yang Aset.getOwnerSettlement(a,ownerId)==='milik' (owner
// itu pemilik LANGSUNG, bukan titipan -- SENGAJA tidak dibikinkan baris
// Buku Utang, lihat komentar _syncOwnerDebts()) TAPI fungsi ini (yang
// mendefinisikan "seharusnya ada") tidak pernah ikut menerapkan filter
// yang sama -- jadi expected[] masih minta baris utk owner 'milik' itu
// padahal _syncOwnerDebts() (dgn benar) tidak pernah menulisnya. Akibatnya
// TitipanReconcile.repairMissing()/tombol "Perbaiki Gap Dana Titipan"
// terlihat jalan (toast "N aset/holding disinkron ulang", reconcile()
// beneran dipanggil) TAPI sync.missing tetap sama persis sesudahnya --
// gap "hilang tapi muncul lagi identik" krn expected & actual dari awal
// tidak pernah bisa ketemu utk owner 'milik'. Filter di bawah PORT 1:1
// syarat yang sama persis dgn _syncOwnerDebts() (toleran: kalau Aset atau
// Aset.getOwnerSettlement belum termuat, anggap 'titipan' spt defaultnya
// getOwnerSettlement() sendiri -- 0 perubahan perilaku utk konsumen lama).
_expectedFromAssets() {
  const out = {};
  if (typeof MultiOwnerEngine === 'undefined' || typeof D === 'undefined') return out;
  const settlementOf = (a, ownerId) => (typeof Aset !== 'undefined' && typeof Aset.getOwnerSettlement === 'function')
    ? Aset.getOwnerSettlement(a, ownerId) : 'titipan';
  (D.assets || []).forEach((a) => {
    const res = MultiOwnerEngine.getOwners(a);
    const owners = (res && res.ok) ? res.owners : [];
    const nilai = typeof a.nilai === 'number' && isFinite(a.nilai) ? a.nilai : 0;
    owners.filter((o) => !o.isSelf && o.porsi > 0 && settlementOf(a, o.ownerId) !== 'milik').forEach((o) => {
      out[a.id + '::' + o.ownerId] = nilai * (o.porsi / 100);
    });
  });
  return out;
},

// _actualLinkedDebts() — {key: amount} dari D.debts yang benar-benar
// ber-linkedAssetId (cabang Aset saja; cabang Investasi ada di
// _actualLinkedInvestmentDebts() di bawah, key space terpisah lewat prefix
// 'inv::' supaya tidak tabrakan kalau assetId & investmentId kebetulan sama).
_actualLinkedDebts() {
  const out = {};
  if (typeof D === 'undefined' || !Array.isArray(D.debts)) return out;
  D.debts.filter((d) => d.linkedAssetId != null && d.linkedOwnerId != null)
    .forEach((d) => { out[d.linkedAssetId + '::' + d.linkedOwnerId] = d.nilai || 0; });
  return out;
},

// _expectedFromInvestments() — cabang Investasi (S583 sesi-2), pola SAMA
// PERSIS _expectedFromAssets() tapi sumbernya D.investments[]/Investment
// (bukan D.assets[]/MultiOwnerEngine). key diprefix 'inv::' supaya key
// space terpisah dari cabang Aset. amount = Investment.holdingCost(h) *
// porsi/100 -- angka yang SAMA PERSIS dipakai Investment._syncTitipanDebt()
// utk isi D.debts, jadi expected 1:1 sama dgn cara debt itu dibuat.
// FIX (S639, cabang Investasi -- pola SAMA PERSIS _expectedFromAssets() di
// atas): Investment._syncTitipanDebt() (investasi.js) skip owner ber-status
// 'milik' (Investment.getOwnerSettlement(h,ownerId)==='milik'), tapi fungsi
// ini belum ikut filter yang sama -- gap yang sama ("Perbaiki Gap" jalan,
// missing tetap sama sesudahnya) juga berlaku utk holding, bukan cuma aset.
_expectedFromInvestments() {
  const out = {};
  if (typeof Investment === 'undefined' || typeof D === 'undefined') return out;
  const settlementOf = (h, ownerId) => (typeof Investment.getOwnerSettlement === 'function')
    ? Investment.getOwnerSettlement(h, ownerId) : 'titipan';
  (D.investments || []).forEach((h) => {
    let owners;
    try { owners = Investment.getOwners(h).filter((o) => !o.isSelf && o.porsi > 0 && settlementOf(h, o.ownerId) !== 'milik'); }
    catch (e) { owners = []; }
    if (!owners.length) return;
    const cost = Investment.holdingCost(h);
    owners.forEach((o) => {
      const ownerId = o.ownerId || 'titipan_investor';
      out['inv::' + h.id + '::' + ownerId] = cost * (o.porsi / 100);
    });
  });
  return out;
},

// _actualLinkedInvestmentDebts() — {key: amount} dari D.debts yang
// ber-linkedInvestmentId (cabang Investasi), key sama prefix 'inv::' spy
// nyambung dgn _expectedFromInvestments(). linkedOwnerId di debt hasil
// _syncTitipanDebt() selalu terisi (default 'titipan_investor'), tapi tetap
// fallback di sini utk jaga-jaga entri lama/manual.
_actualLinkedInvestmentDebts() {
  const out = {};
  if (typeof D === 'undefined' || !Array.isArray(D.debts)) return out;
  D.debts.filter((d) => d.linkedInvestmentId != null)
    .forEach((d) => {
      const ownerId = d.linkedOwnerId || 'titipan_investor';
      out['inv::' + d.linkedInvestmentId + '::' + ownerId] = d.nilai || 0;
    });
  return out;
},

// check() — bandingkan expected vs actual (Aset + Investasi digabung, key
// space sudah terpisah lewat prefix), 2 arah:
//   missing  = harusnya ada tapi tidak ketemu di D.debts (entry point lupa sync)
//   orphan   = ada di D.debts tapi ownernya sudah tidak ada di owners (lupa dibersihkan)
//   mismatch = ada di dua-duanya tapi nilainya beda (lupa di-update ulang)
// Toleransi Rp1 (pembulatan) supaya tidak false-positive dari residu float.
// Return {ok, missing[], orphan[], mismatch[]} — ok=true kalau ketiganya kosong.
check() {
  const expected = Object.assign({}, this._expectedFromAssets(), this._expectedFromInvestments());
  const actual = Object.assign({}, this._actualLinkedDebts(), this._actualLinkedInvestmentDebts());
  const missing = [], orphan = [], mismatch = [];
  Object.keys(expected).forEach((key) => {
    if (!(key in actual)) { missing.push({ key, expected: expected[key] }); return; }
    if (Math.abs(expected[key] - actual[key]) > 1) {
      mismatch.push({ key, expected: expected[key], actual: actual[key] });
    }
  });
  Object.keys(actual).forEach((key) => {
    if (!(key in expected)) orphan.push({ key, actual: actual[key] });
  });
  return { ok: missing.length === 0 && orphan.length === 0 && mismatch.length === 0, missing, orphan, mismatch };
},

// checkOwnerIdConsistency() — Rekomendasi #3 varian AUDIT OTOMATIS (S583
// sesi-4). Rec #3 asli minta OwnerRegistry-lookup jadi validasi WAJIB tiap
// saveOwners() — itu perubahan alur tulis, harus nyentuh aset.js/investasi.js
// langsung (di luar scope modul PURE read-only ini, ditunda sesi terpisah,
// sama seperti Rec #1/#4). Yang BISA dikerjakan di sini, pola sama Rec #2:
// 1 fungsi audit yang mendeteksi gejalanya otomatis lewat data yang sudah
// ada, bukan nunggu ketemu manual — "Budi" di Aset vs "Budi" di Investasi
// TIDAK resolve ke ownerId yang sama (migrateOwnersToRegistry() blm jalan /
// baris lama pre-registry).
// SENGAJA TIDAK panggil OwnerRegistry.findOrCreate() (function itu py
// side-effect nulis D.ownerRegistry -- dilarang di modul 0-mutasi ini).
// Sebagai gantinya murni bandingkan nama (trim + lowercase) lintas 2 domain:
// kalau 1 nama muncul dgn >1 ownerId berbeda antara Aset & Investasi, itu
// tanda "Budi" belum konsisten -- flag, jangan diam-diam dibiarkan divergen.
// Owner SELF diabaikan (bukan titipan, ownerId 'SELF' konsisten by design).
// Return: {ok, divergent: [{name, ids[]}]} -- ok=true kalau divergent kosong.
checkOwnerIdConsistency() {
  if (typeof D === 'undefined') return { ok: true, divergent: [] };
  const byName = {};
  const add = (name, id) => {
    if (!id) return;
    const trimmed = (name != null) ? String(name).trim() : '';
    const key = trimmed.toLowerCase();
    if (!key) return;
    if (!byName[key]) byName[key] = { name: trimmed, ids: new Set() };
    byName[key].ids.add(String(id));
  };
  (D.assets || []).forEach((a) => {
    if (typeof MultiOwnerEngine === 'undefined') return;
    let res;
    try { res = MultiOwnerEngine.getOwners(a); } catch (e) { res = null; }
    const owners = (res && res.ok) ? res.owners : [];
    owners.filter((o) => o && !o.isSelf).forEach((o) => add(o.ownerName, o.ownerId));
  });
  (D.investments || []).forEach((h) => {
    if (typeof Investment === 'undefined') return;
    let owners;
    try { owners = Investment.getOwners(h).filter((o) => o && !o.isSelf); }
    catch (e) { owners = []; }
    owners.forEach((o) => add(o.ownerName, o.ownerId));
  });
  const divergent = Object.keys(byName)
    .map((k) => byName[k])
    .filter((g) => g.ids.size > 1)
    .map((g) => ({ name: g.name, ids: Array.from(g.ids) }));
  return { ok: divergent.length === 0, divergent };
},

// checkDebtNameStaleness() — Rekomendasi #2 lanjutan (S583 sesi-5). Ketemu
// lewat baca kode OwnerRegistry.rename() (R4): rename() propagasi `ownerName`
// baru ke a.owners[]/h.owners[]/D.titipanCommitments[] TAPI TIDAK ke
// D.debts[].name — field itu SNAPSHOT nama di waktu debt dibuat/terakhir
// disync oleh _syncOwnerDebts()/_syncTitipanDebt(), bukan live lookup ke
// registry. Efeknya: user rename "Budi" -> "Budi Santoso" lewat
// OwnerRegistry, muncul benar di Aset/Investasi/Komitmen, tapi baris Buku
// Utang tetap nampilin "Budi" sampai debt itu kebetulan disync ulang (mis.
// asetnya diedit lagi) — silent staleness. BUKAN data salah (linkedOwnerId
// tetap benar/utuh, cuma label lama) tapi tetap layak diflag, pola sama Rec
// #2 (jangan tunggu ketemu manual).
// PURE baca-saja (0 mutasi, 0 rumus baru) — bandingkan D.debts[].name
// (utk entri ber-linkedOwnerId) vs D.ownerRegistry[].name (sumber kanonik
// yang DIJAMIN up-to-date oleh rename(), lihat owner-registry.js). Owner
// yang linkedOwnerId-nya tidak/belum ada di registry (mis. 'titipan_investor'
// legacy synth, atau belum migrateOwnersToRegistry()) DILEWATI — di luar
// scope check ini (itu domain checkOwnerIdConsistency()/migrateOwnersToRegistry()).
// Owner SELF diabaikan (tidak lewat registry).
// Return: {ok, stale: [{debtId, linkedOwnerId, debtName, registryName}]}
checkDebtNameStaleness() {
  if (typeof D === 'undefined' || !Array.isArray(D.debts) || !Array.isArray(D.ownerRegistry)) return { ok: true, stale: [] };
  const registryById = {};
  D.ownerRegistry.forEach((o) => {
    if (o && o.id != null) registryById[String(o.id)] = (o.name != null) ? String(o.name).trim() : '';
  });
  const stale = [];
  D.debts.filter((d) => d && d.linkedOwnerId != null && String(d.linkedOwnerId) !== 'SELF')
    .forEach((d) => {
      const canonical = registryById[String(d.linkedOwnerId)];
      if (canonical === undefined) return;
      const debtName = (d.name != null) ? String(d.name).trim() : '';
      if (debtName !== canonical) {
        stale.push({ debtId: d.id, linkedOwnerId: d.linkedOwnerId, debtName, registryName: canonical });
      }
    });
  return { ok: stale.length === 0, stale };
},

// _expectedFromAccounts() — CABANG AKUN (audit gap "Akun & Metode Pembayaran"
// -> Dana Titipan, permintaan user 2026-08-14). Ditemukan lewat baca akun.js
// (AccOwners.save(), S574/S607): akun BERDIRI SENDIRI (bukan akun tertaut ke
// Aset lewat a.accountId) yang punya owners[] non-SELF (porsi kepemilikan,
// diisi lewat modal "⚖️ Porsi Kepemilikan" di kartu Akun) TIDAK PERNAH
// membuat baris Buku Utang/Dana Titipan apa pun -- beda dgn cabang Aset
// (_syncOwnerDebts) & Investasi (_syncTitipanDebt) yang keduanya SELALU
// sync. Akun yang TERTAUT ke Aset (a.accountId===acc.id) SENGAJA dilewati
// di sini -- porsinya sudah 1:1 disamakan ke Aset tertaut itu sendiri oleh
// AccOwners.save() (baca komentar "BUGFIX (audit sync arah Akun->Aset)" di
// akun.js) dan SUDAH kehitung lewat _expectedFromAssets() di atas; kalau
// akun tertaut ikut dihitung lagi di sini, 1 porsi yang sama akan muncul 2x
// (double-count palsu, bukan gap nyata).
//
// SENGAJA presence-only (out[key]=true, BUKAN nominal Rp seperti cabang
// Aset/Investasi): saldo akun (recalcAccBalance) berubah tiap transaksi
// masuk/keluar, beda dgn a.nilai (Aset)/holdingCost (Investasi) yang stabil
// sampai sengaja diedit -- membandingkan NOMINAL di sini akan menghasilkan
// "mismatch" palsu tiap kali ada transaksi baru padahal belum tentu itu gap
// sungguhan. Existensi baris Buku Utang (linkedAccountId+linkedOwnerId) itu
// sendiri yang jadi pertanyaan cabang ini -- bukan besar nominalnya (itu
// keputusan desain utk sesi sync nominal terpisah, di luar cakupan audit
// murni baca-saja ini).
_expectedFromAccounts() {
  const out = {};
  if (typeof D === 'undefined') return out;
  const accounts = Array.isArray(D.accounts) ? D.accounts : [];
  const assets = Array.isArray(D.assets) ? D.assets : [];
  accounts.forEach((acc) => {
    if (!acc || acc.id == null) return;
    const linkedAsset = assets.find((a) => a && String(a.accountId) === String(acc.id));
    if (linkedAsset) return; // sudah kehitung via _expectedFromAssets(), lihat catatan di atas
    let owners = [];
    if (typeof MultiOwnerEngine !== 'undefined' && typeof MultiOwnerEngine.getOwners === 'function') {
      let res;
      try { res = MultiOwnerEngine.getOwners(acc); } catch (e) { res = null; }
      owners = (res && res.ok) ? res.owners : [];
    }
    owners.filter((o) => o && !o.isSelf && o.porsi > 0).forEach((o) => {
      out[acc.id + '::' + o.ownerId] = true;
    });
  });
  return out;
},

// _actualLinkedAccountDebts() — {key: true} dari D.debts yang ber-
// linkedAccountId. Sejak sesi lanjutan (Rekomendasi #2, TitipanSync.
// reconcileAccounts()), field ini benar-benar diisi tiap save() -- fungsi
// ini sendiri 0 diubah (disiapkan sejak awal pola sama _actualLinkedDebts()/
// _actualLinkedInvestmentDebts() persis supaya "hidup" otomatis begitu sesi
// sync mulai mengisi linkedAccountId, sesuai rencana awal).
_actualLinkedAccountDebts() {
  const out = {};
  if (typeof D === 'undefined' || !Array.isArray(D.debts)) return out;
  D.debts.filter((d) => d && d.linkedAccountId != null && d.linkedOwnerId != null)
    .forEach((d) => { out[d.linkedAccountId + '::' + d.linkedOwnerId] = true; });
  return out;
},

// checkAccounts() — audit cabang Akun (lihat _expectedFromAccounts() utk
// latar lengkap). PURE baca-saja, 0 mutasi, 0 rumus baru -- pola SAMA
// PERSIS check() di atas, versi presence-only (bukan nominal):
//   missing = akun+owner non-SELF porsi>0 tanpa baris Buku Utang sama
//             sekali (gap: bagian titipan "tersimpan" di saldo akun tapi
//             TIDAK PERNAH tercatat di Dana Titipan/Buku Utang)
//   orphan  = baris Buku Utang ber-linkedAccountId yang ownernya sudah
//             tidak match owners[] akun manapun (disiapkan simetris,
//             realistis baru relevan setelah sesi sync ditambahkan)
// Return: {ok, missing[], orphan[]} -- ok=true kalau keduanya kosong.
checkAccounts() {
  const expected = this._expectedFromAccounts();
  const actual = this._actualLinkedAccountDebts();
  const missing = [], orphan = [];
  Object.keys(expected).forEach((key) => { if (!(key in actual)) missing.push({ key }); });
  Object.keys(actual).forEach((key) => { if (!(key in expected)) orphan.push({ key }); });
  return { ok: missing.length === 0 && orphan.length === 0, missing, orphan };
},

// checkTransactionOwnerRefs() — S635, saran Prioritas #2 dari
// AUDIT-DATA-HEALTH-BACKUP-2026-08-16.md ("validasi ringan saat porsi
// kepemilikan sebuah aset diubah — kalau ada transaksi historis yang
// deductionOwnerId-nya akan jadi orphan gara-gara perubahan itu"). LATAR:
// audit itu menemukan 8x transaksi (akun "Saldo tagihan") yang
// `deductionOwnerId`-nya nunjuk 1 dari 3 porsi pemilik aset "Majoris" —
// tapi porsi aset itu sudah diubah/disusun ulang SETELAH transaksi-transaksi
// itu dibuat, jadi `ownerId` lama jadi snapshot BASI (tidak match owner mana
// pun yang valid SEKARANG). Gap ini di luar cakupan check()/checkAccounts()
// di atas (keduanya audit D.debts, bukan D.transactions[].deductionOwnerId).
// PURE baca-saja, 0 mutasi, 0 rumus baru — reuse SATU-SATUNYA fungsi yang
// sudah jadi sumber kebenaran "owner valid saat ini utk akun X"
// (resolveOwnerDefaultForAccount(accountId), transaksi.js — SAMA PERSIS
// yang dipakai dropdown "Pemilik Sumber Potongan" & validasi simpan
// transaksi baru), supaya definisi "valid" di sini 1:1 sama dgn form,
// bukan re-derivasi logic baru.
// Transaksi tanpa deductionOwnerId/accountId dilewati (bukan cabang ini).
// Akun yang resolver-nya balik owners kosong (source:'none', akun biasa
// non-multi-owner) DILEWATI juga — tidak bisa dipastikan orphan dari sini,
// hindari false-positive.
// Guard: kalau resolveOwnerDefaultForAccount() belum dimuat (halaman/harness
// test tanpa transaksi.js), fungsi ini fallback ok=true diam-diam — pola
// sama guard checkOwnerIdConsistency() di atas utk MultiOwnerEngine (0
// regresi utk konsumen yang belum/tidak load transaksi.js).
// Return: {ok, orphan: [{txId, accountId, deductionOwnerId}]}
checkTransactionOwnerRefs() {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) return { ok: true, orphan: [] };
  if (typeof resolveOwnerDefaultForAccount !== 'function') return { ok: true, orphan: [] };
  const orphan = [];
  D.transactions.forEach((t) => {
    if (!t || !t.deductionOwnerId || !t.accountId) return;
    let resolved;
    try { resolved = resolveOwnerDefaultForAccount(t.accountId); } catch (e) { resolved = null; }
    if (!resolved || !resolved.ok || !resolved.owners || !resolved.owners.length) return;
    const match = resolved.owners.some((o) => o && String(o.ownerId) === String(t.deductionOwnerId));
    if (!match) orphan.push({ txId: t.id, accountId: t.accountId, deductionOwnerId: t.deductionOwnerId });
  });
  return { ok: orphan.length === 0, orphan };
},

// checkOwnershipDualSource() — S636 Opsi C (AUDIT-S636-MAJORIS-OWNERSHIP-
// DUAL-SOURCE-KEPUTUSAN.md §3): membawa warning "Aset dengan kepemilikan
// ganda" yang SUDAH ADA di data-health-check.js (S501, `runDataHealthCheck()`
// -- lihat komentar "PERUBAHAN SESI 501 (F3...)" di file itu) ke jalur
// KEDUA yang berjalan OTOMATIS tiap Tes Otomatis/checkAll() (bukan cuma
// nunggu user buka layar "Cek Kesehatan Data" secara manual) -- pola SAMA
// PERSIS sub-check lain di modul ini (PURE baca-saja, 0 mutasi, 0 rumus
// baru, 0 pengganti check S501 yang sudah ada -- itu tetap jalan apa
// adanya di layarnya sendiri, ini cuma tambahan sinyal di Tes Otomatis).
//
// Kondisi flag -- REUSE 100% logic S501 (data-health-check.js baris
// "PERUBAHAN SESI 501"), bukan rumus baru:
//   1. `OwnershipEngine.resolve(a).type` bukan 'SELF' (dropdown Kepemilikan
//      whole-entity non-default, dibaca DanaKelolaan.sumAssets()/
//      isAssetOwnershipSelf()), DAN
//   2. `MultiOwnerEngine.getOwners(a)` balik `ok:true, isSynthesized:false`
//      (owners[] EKSPLISIT ada, bukan hasil sintesis dari `a.ownership` --
//      kalau isSynthesized:true berarti cuma 1 sumber, tidak ada yang bisa
//      divergen), DAN
//   3. ada baris non-SELF berporsi >0 di `owners[]` itu (titipan beneran,
//      bukan owners[] yang isinya SELF semua/kosong).
// Kasus Majoris (Reksadana, `a.ownership='INVESTOR'` + `owners[]` 3 orang
// non-SELF 100%) persis penuhi ketiganya -- lihat §1 dokumen keputusan.
// Guard ganda `typeof OwnershipEngine`/`typeof MultiOwnerEngine`, pola sama
// semua guard lain di modul ini -- kalau salah satu belum dimuat, diam
// (0 false-positive), bukan crash.
// Return: {ok, flagged: [{assetId, name, ownType, nonSelfPorsi}]} -- ok=true
// kalau flagged kosong. `nonSelfPorsi` = total persen owners[] non-SELF
// (dibulatkan apa adanya, sama seperti pesan S501 -- bukan nilai baru).
checkOwnershipDualSource() {
  if (typeof D === 'undefined' || typeof OwnershipEngine === 'undefined' ||
      typeof MultiOwnerEngine === 'undefined' || typeof MultiOwnerEngine.getOwners !== 'function') {
    return { ok: true, flagged: [] };
  }
  const flagged = [];
  (D.assets || []).forEach((a) => {
    if (!a) return;
    const ownType = OwnershipEngine.resolve ? OwnershipEngine.resolve(a).type : 'SELF';
    if (!ownType || ownType === 'SELF') return;
    let res;
    try { res = MultiOwnerEngine.getOwners(a); } catch (e) { res = null; }
    if (!res || !res.ok || res.isSynthesized) return;
    const nonSelfPorsi = (res.owners || []).filter((o) => o && !o.isSelf && o.porsi > 0)
      .reduce((s, o) => s + o.porsi, 0);
    if (nonSelfPorsi > 0) {
      flagged.push({ assetId: a.id, name: a.name, ownType, nonSelfPorsi });
    }
  });
  return { ok: flagged.length === 0, flagged };
},

// checkPoolCommitment() — SESI FIX-2026-09-01-lanjutan (audit "gap kekurangan
// dana titipan", diminta eksplisit user). LATAR: audit sesi ini menemukan
// `D.titipanPool[]` (dana masuk aktual, dana-titipan-pool-api.js) &
// `D.titipanCommitments[]` (pokok dikomit per owner) adalah SUMBER KEBENARAN
// KETIGA yang terpisah dari Buku Utang (`D.debts`, cabang check()/
// checkAccounts() di atas) -- tapi TIDAK PERNAH ikut checkAll()/Tes Otomatis,
// jadi status OVER_ALLOCATED (baik level-pool maupun level-owner) hanya
// kelihatan kalau user buka tab Dana Titipan secara manual, tidak ketahuan
// otomatis spt 6 sub-check lain kalau muncul lewat backup lama/edit manual.
//
// PURE baca-saja, 0 mutasi, 0 rumus baru -- 100% REUSE 2 fungsi derived yang
// SUDAH ADA (bukan re-derivasi logic gap baru, pola sama seluruh sub-check
// lain di modul ini):
//   1. `DanaTitipanPortfolioAPI.build()` (dana-titipan-aggregation-api.js) --
//      tiap owner sudah py `allocationStatus`/`overAllocatedAmount` terhitung
//      (spent = allocatedPrincipal+usedTotal+linkedExpenseTotal+
//      renovExpenseTotal, dibanding principalAmount, lihat komentar `build()`
//      DL-NEXT-9). Baris ini murni MEMBACA field yang SUDAH dihitung `build()`
//      tiap render tab Dana Titipan, TIDAK menghitung ulang formulanya.
//   2. `DanaTitipanPoolAPI.status()` (dana-titipan-pool-api.js) -- status
//      level-pool ('NOT_MIGRATED'|'OK'|'OVER_ALLOCATED'), SUDAH derived murni
//      tiap panggilan (0 caching), dipakai apa adanya.
// Guard ganda `typeof DanaTitipanPortfolioAPI`/`typeof DanaTitipanPoolAPI` --
// pola sama semua guard lain di modul ini: kalau salah satu/keduanya belum
// dimuat (mis. test harness minimal, atau bundle lama sebelum fitur Pool
// ada), fallback diam (0 false-positive), BUKAN crash.
// `build()` dibungkus try/catch -- fungsi itu membaca banyak domain lain
// (D.assets/D.investments/D.transactions/D.titipanCommitments/D.titipanReturns),
// kalau salah satu dependency belum termuat di konteks pemanggil, error
// TIDAK BOLEH menjatuhkan seluruh checkAll()/Tes Otomatis (pola sama
// try/catch di checkOwnerIdConsistency()/checkOwnershipDualSource() dst).
//
// SENGAJA TIDAK menambah rumus pembanding baru antara `principalAmount`
// (commitment) vs total porsi owner yang benar-benar tercatat di
// D.assets/D.investments (_expectedFromAssets()/_expectedFromInvestments())
// -- `build()` SUDAH melakukan itu (via `allocatedPrincipal`, dihitung dari
// _assetSplits()/_holdingSplits()) DAN lebih lengkap (ikut hitung usedTotal/
// linkedExpenseTotal/renovExpenseTotal yang modul ini sendiri tidak punya
// akses mudah ke sana) -- menduplikasi sebagian formula itu di sini
// beresiko DIVERGEN dari `build()` kalau salah satu diedit sesi lain
// (persis kelas bug yang direktori modul ini sendiri dibuat utk dicegah).
//
// Return: {ok, poolStatus, overAllocatedOwners: [{ownerId, ownerName,
//   overAllocatedAmount}]} -- ok=true kalau poolStatus bukan
//   'OVER_ALLOCATED' (null/'NOT_MIGRATED'/'OK' semua ok) DAN
//   overAllocatedOwners kosong. poolStatus null kalau DanaTitipanPoolAPI
//   belum dimuat (BUKAN sama dgn 'NOT_MIGRATED' -- itu nilai valid dari
//   status() sendiri kalau pool memang belum py entry, beda dari "modul
//   tidak tersedia").
checkPoolCommitment() {
  const out = { ok: true, poolStatus: null, overAllocatedOwners: [] };
  if (typeof DanaTitipanPoolAPI !== 'undefined' && typeof DanaTitipanPoolAPI.status === 'function') {
    let poolStatus;
    try { poolStatus = DanaTitipanPoolAPI.status(); } catch (e) { poolStatus = null; }
    out.poolStatus = poolStatus;
    if (poolStatus === 'OVER_ALLOCATED') out.ok = false;
  }
  if (typeof DanaTitipanPortfolioAPI !== 'undefined' && typeof DanaTitipanPortfolioAPI.build === 'function') {
    let result;
    try { result = DanaTitipanPortfolioAPI.build(); } catch (e) { result = null; }
    const owners = (result && Array.isArray(result.owners)) ? result.owners : [];
    owners.filter((o) => o && o.allocationStatus === 'OVER_ALLOCATED').forEach((o) => {
      out.overAllocatedOwners.push({ ownerId: o.ownerId, ownerName: o.ownerName, overAllocatedAmount: o.overAllocatedAmount || 0 });
    });
    if (out.overAllocatedOwners.length) out.ok = false;
  }
  return out;
},

// checkReturnVsLiability() — SESI S675 (audit lanjutan "Total Titipan vs
// Utang/Aset/Akun", gap #2 dari 2 temuan sesi ini). LATAR: `recordReturn()`
// (dana-titipan-commitment-return-api.js) SENGAJA "ISOLASI TOTAL — HANYA
// menyentuh `D.titipanReturns`" (lihat header fungsi itu) -- mencatat 1
// baris riwayat pengembalian TIDAK PERNAH ikut mengurangi porsi owner di
// `a.owners[]`/`h.owners[]`/`acc.owners[]` (itu keputusan desain sengaja,
// sama alasan `checkPoolCommitment()` dibuat informational: tindakan
// finansial nyata butuh keputusan eksplisit user, bukan mutasi diam-diam).
// KONSEKUENSI: kalau user catat "Budi ambil kembali RpX" via recordReturn()
// TAPI LUPA ikut mengecilkan/menghapus porsi Budi di Aset/Investasi/Akun
// terkait (lewat "⚖️ Atur Porsi Kepemilikan"), baris Buku Utang
// (linkedAssetId/linkedInvestmentId/linkedAccountId, ditulis
// _syncOwnerDebts()/_syncTitipanDebt()/TitipanSync.reconcileAccounts())
// TETAP PENUH seperti sebelum dikembalikan -- tab Dana Titipan bilang
// "sudah dikembalikan" tapi Buku Utang & Kekayaan Bersih masih menganggap
// kewajiban itu utuh, 2 fakta yang saling kontradiksi tanpa terdeteksi
// otomatis.
//
// PURE baca-saja, 0 mutasi, 0 rumus baru -- 100% REUSE
// `DanaTitipanPortfolioAPI.build()` (pola SAMA PERSIS `checkPoolCommitment()`
// di atas): tiap owner ber-`principalAmount` (commitment tercatat) SUDAH
// punya 3 field derived yang dibutuhkan, dihitung `build()` sendiri (lihat
// dana-titipan-aggregation-api.js):
//   - `returnedTotal`   = sum(D.titipanReturns milik owner ini) (Sesi 486)
//   - `allocatedPrincipal` = porsi owner ini yang BENAR-BENAR MASIH tercatat
//     saat ini di Aset+Investasi (angka yang SAMA PERSIS dipakai
//     _syncOwnerDebts()/_syncTitipanDebt() utk isi nilai baris Buku Utang)
//   - `outstandingPrincipal` = max(0, principalAmount - returnedTotal) --
//     "SEHARUSNYA tersisa" kalau porsi ikut dikecilkan sejumlah yang
//     dikembalikan.
// Gap = `allocatedPrincipal - outstandingPrincipal`: kalau owner sudah
// tercatat mengembalikan sebagian/seluruh pokok (`returnedTotal>0`) TAPI
// porsi aktualnya (`allocatedPrincipal`, = liability Buku Utang) masih
// LEBIH BESAR dari yang seharusnya tersisa (`outstandingPrincipal`), berarti
// porsi belum ikut dikecilkan -- persis kondisi yang diflag. Toleransi Rp1
// (pola sama check() di atas) supaya residu pembulatan float tidak
// false-positive.
// CATATAN: `allocatedPrincipal` HANYA cakupan Aset+Investasi (lihat
// `build()`) -- porsi akun berdiri-sendiri (`_expectedFromAccounts()`,
// cabang Akun) TIDAK ikut diperiksa gap ini (di luar scope `build()`
// sesi ini, konsisten dgn catatan "SENGAJA TIDAK menambah rumus pembanding
// baru" di `checkPoolCommitment()` -- menduplikasi sebagian formula
// `build()` di sini beresiko DIVERGEN kalau salah satu diedit sesi lain).
// Guard typeof + try/catch, pola SAMA PERSIS `checkPoolCommitment()` --
// modul belum dimuat / `build()` error -> fallback diam (0 false-positive),
// BUKAN crash.
//
// SENGAJA INFORMATIONAL (non-blocking, pola SAMA PERSIS `checkPoolCommitment()`
// & `ownershipDualSource`) -- BUKAN diperbaiki otomatis: return itu tindakan
// finansial nyata, user yang harus memutuskan mau mengecilkan porsi di aset
// mana / holding mana (bisa saja pokok tersebar di >1 aset+holding, tidak
// ada 1 jawaban tunggal yang "pasti benar" utk auto-repair). 0 tombol
// "Perbaiki Gap" utk ini di sesi ini.
//
// Return: {ok, flagged: [{ownerId, ownerName, returnedTotal,
//   allocatedPrincipal, outstandingPrincipal, unreducedAmount}]} --
//   ok=true kalau flagged kosong. unreducedAmount = besar porsi yang
//   masih "nyangkut" di Buku Utang padahal sudah tercatat dikembalikan.
checkReturnVsLiability() {
  const out = { ok: true, flagged: [] };
  if (typeof DanaTitipanPortfolioAPI === 'undefined' || typeof DanaTitipanPortfolioAPI.build !== 'function') return out;
  let result;
  try { result = DanaTitipanPortfolioAPI.build(); } catch (e) { result = null; }
  const owners = (result && Array.isArray(result.owners)) ? result.owners : [];
  owners.forEach((o) => {
    if (!o || !(o.returnedTotal > 0)) return;
    if (o.principalAmount === null || o.principalAmount === undefined) return;
    const outstanding = (typeof o.outstandingPrincipal === 'number')
      ? o.outstandingPrincipal
      : Math.max(0, o.principalAmount - o.returnedTotal);
    const allocated = o.allocatedPrincipal || 0;
    const unreducedAmount = allocated - outstanding;
    if (unreducedAmount > 1) {
      out.flagged.push({
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        returnedTotal: o.returnedTotal,
        allocatedPrincipal: allocated,
        outstandingPrincipal: outstanding,
        unreducedAmount,
      });
    }
  });
  out.ok = out.flagged.length === 0;
  return out;
},

// _actualLinkedAccountDebtTotalsByOwner() — SESI S676 (audit lanjutan Gap
// #2: "checkReturnVsLiability() tidak cakup titipan yang pokoknya murni di
// Akun berdiri-sendiri"). Varian _actualLinkedAccountDebts() di atas yang
// SUDAH ADA (boolean-only, {key:true} per pasangan akun+owner) -- fungsi
// itu tidak cukup utk checkReturnVsAccountLiability() di bawah karena kita
// butuh NOMINAL-nya (bukan cuma existensi baris), dan dijumlah PER OWNER
// (bukan per akun+owner, karena 1 owner bisa punya porsi di >1 akun
// berdiri-sendiri sekaligus -- jumlahnya yang relevan utk dibandingkan ke
// `returnedTotal`, bukan per-baris). PURE baca-saja, 0 mutasi, reuse 100%
// field `d.nilai`/`d.linkedOwnerId` yang SUDAH ditulis TitipanSync.
// reconcileAccounts() (titipan-sync.js) -- 0 rumus baru.
// Return: {ownerId: totalNilai} -- owner tanpa baris linkedAccountId sama
// sekali tidak muncul sbg key (bukan 0 eksplisit).
_actualLinkedAccountDebtTotalsByOwner() {
  const out = {};
  if (typeof D === 'undefined' || !Array.isArray(D.debts)) return out;
  D.debts.filter((d) => d && d.linkedAccountId != null && d.linkedOwnerId != null)
    .forEach((d) => {
      const key = String(d.linkedOwnerId);
      out[key] = (out[key] || 0) + (isFinite(d.nilai) ? Number(d.nilai) : 0);
    });
  return out;
},

// checkReturnVsAccountLiability() — SESI S676 (audit lanjutan Gap #2 dari
// SESSION-NOTE-S675.md: "checkReturnVsLiability() tidak cakup titipan yang
// pokoknya murni di Akun berdiri-sendiri"). LATAR: checkReturnVsLiability()
// (di atas) 100% reuse `DanaTitipanPortfolioAPI.build()`, yang HANYA
// menghitung `allocatedPrincipal` dari `_assetSplits()`/`_holdingSplits()`
// (cabang Aset+Investasi) -- TIDAK PERNAH menyertakan porsi di akun
// berdiri-sendiri (cabang Akun, `_expectedFromAccounts()`/`checkAccounts()`
// di atas). Konsekuensi: kalau pokok titipan seorang owner MURNI disimpan
// di 1/lebih akun berdiri-sendiri (bukan aset/holding apa pun),
// `allocatedPrincipal` owner itu di mata `build()` SELALU 0 -- 
// checkReturnVsLiability() TIDAK PERNAH bisa mendeteksi gap "return
// dicatat tapi porsi akun belum dikecilkan" utk owner semacam ini (batasan
// yang sudah disebut eksplisit di komentar checkReturnVsLiability() sendiri
// sesi S675, belum ada follow-up-nya sampai sesi ini).
//
// PURE baca-saja, 0 mutasi, 0 rumus baru -- SUB-CHECK TERPISAH (bukan
// menambal checkReturnVsLiability() yang sudah ada) supaya 2 channel
// (Aset+Investasi vs Akun) tetap independen & gampang dilacak sumbernya
// kalau salah satu flag menyala (pola SAMA PERSIS kenapa checkAccounts()
// dipisah dari check() -- 2 mekanisme berlawanan, lihat SESSION-NOTE-S675
// bagian Gap #1). Reuse 2 sumber yang SUDAH ADA:
//   1. `DanaTitipanPortfolioAPI.build()` -- utk `returnedTotal`/
//      `principalAmount`/`outstandingPrincipal` per owner (field yang SAMA
//      PERSIS dipakai checkReturnVsLiability(), TIDAK dihitung ulang di
//      sini).
//   2. `_actualLinkedAccountDebtTotalsByOwner()` (di atas) -- total nominal
//      baris Buku Utang ber-`linkedAccountId` milik owner itu (liability
//      channel Akun, ditulis `TitipanSync.reconcileAccounts()`).
// Gap = `accountLiability - outstandingPrincipal`: kalau owner sudah
// tercatat mengembalikan sebagian/seluruh pokok (`returnedTotal>0`) TAPI
// total liability Akun-nya (`accountLiability`) masih LEBIH BESAR dari yang
// seharusnya tersisa (`outstandingPrincipal`, commitment dikurangi
// returnedTotal), berarti porsi di akun berdiri-sendiri belum ikut
// dikecilkan setelah return dicatat. Toleransi Rp1, sama pola
// checkReturnVsLiability(). Owner tanpa liability Akun sama sekali
// (`accountLiability` 0/tidak ada) TIDAK diflag di sini (bukan gap channel
// ini -- kalaupun ada gap, itu urusan checkReturnVsLiability() cabang
// Aset+Investasi).
// CATATAN: SENGAJA TIDAK digabung jadi 1 angka gabungan
// (`allocatedPrincipal + accountLiability` dibanding `outstandingPrincipal`
// sekali jalan) -- owner yang pokoknya tersebar di KEDUA channel sekaligus
// bisa membingungkan diagnosis (flag mana yang harus dibenahi user duluan)
// kalau digabung; 2 sub-check independen lebih jelas menunjuk channel mana
// yang belum disinkron, konsisten filosofi modul ini (tiap sub-check =
// 1 sumber gap yang jelas, checkAll() yang menggabungkan `ok`-nya).
// Guard typeof + try/catch, pola SAMA PERSIS checkReturnVsLiability() --
// modul belum dimuat / `build()` error -> fallback diam (0 false-positive).
// SENGAJA INFORMATIONAL (non-blocking, pola SAMA PERSIS
// checkReturnVsLiability()) -- 0 tombol "Perbaiki Gap" utk ini, alasan
// SAMA PERSIS: return itu tindakan finansial nyata, user yang harus
// memutuskan.
// Return: {ok, flagged: [{ownerId, ownerName, returnedTotal,
//   accountLiability, outstandingPrincipal, unreducedAmount}]} -- ok=true
//   kalau flagged kosong.
checkReturnVsAccountLiability() {
  const out = { ok: true, flagged: [] };
  if (typeof DanaTitipanPortfolioAPI === 'undefined' || typeof DanaTitipanPortfolioAPI.build !== 'function') return out;
  let result;
  try { result = DanaTitipanPortfolioAPI.build(); } catch (e) { result = null; }
  const owners = (result && Array.isArray(result.owners)) ? result.owners : [];
  const accountTotals = this._actualLinkedAccountDebtTotalsByOwner();
  owners.forEach((o) => {
    if (!o || !(o.returnedTotal > 0)) return;
    if (o.principalAmount === null || o.principalAmount === undefined) return;
    const accountLiability = accountTotals[String(o.ownerId)] || 0;
    if (!(accountLiability > 0)) return;
    const outstanding = (typeof o.outstandingPrincipal === 'number')
      ? o.outstandingPrincipal
      : Math.max(0, o.principalAmount - o.returnedTotal);
    const unreducedAmount = accountLiability - outstanding;
    if (unreducedAmount > 1) {
      out.flagged.push({
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        returnedTotal: o.returnedTotal,
        accountLiability,
        outstandingPrincipal: outstanding,
        unreducedAmount,
      });
    }
  });
  out.ok = out.flagged.length === 0;
  return out;
},

// checkAll() — Rekomendasi #2 lanjutan (S583 sesi-6). check()/
// checkOwnerIdConsistency()/checkDebtNameStaleness() sudah ADA dari sesi
// sebelumnya, tapi masing-masing masih dipanggil terpisah (belum ada 1
// pintu tunggal) -- persis gap yang PATCH-NOTES.md sesi-5 catat sbg
// "belum dikerjakan": Rec #2 asli minta ini "bisa dipanggil dari
// smoke-test.js yang sudah ada", supaya regresi ketahuan otomatis tiap
// jalan test, bukan nunggu 3 pemanggilan manual terpisah tiap sesi audit.
// PURE (0 mutasi, 0 rumus baru) -- murni agregasi 3 fungsi read-only yang
// SUDAH ADA, tidak duplikasi logic apa pun. Di-wire ke self-test.js
// (getSelfTestCases()) S583 sesi-7 -- lihat case "TitipanReconcile.checkAll()"
// di file itu, jalan otomatis tiap Tes Otomatis dijalankan.
// Return: {ok, sync, ownerIdConsistency, debtNameStaleness} -- `ok` true
// hanya kalau ketiga sub-check ok (AND), tiap sub-check tetap menyimpan
// shape aslinya (tidak diringkas/dibuang) supaya konsumen bisa cek detail
// per-kategori tanpa panggil ulang fungsi individualnya.
// PERUBAHAN 2026-08-14 (audit gap Akun->Dana Titipan, lihat
// _expectedFromAccounts()): tambah `accountSync` sbg sub-check ke-4,
// pola SAMA PERSIS penambahan `debtNameStaleness` sesi-5->sesi-6 (fungsi
// audit-nya sudah ada duluan sbg fungsi berdiri sendiri, checkAll() cuma
// menambahkannya ke agregat). `ok` keseluruhan sekarang AND dari 4
// sub-check (sebelumnya 3).
// UPDATE (sesi lanjutan sama hari, Rekomendasi #2 SUDAH DIKERJAKAN):
// TitipanSync.reconcileAccounts() (titipan-sync.js) sekarang benar-benar
// mengisi `linkedAccountId` (dipanggil dari save(), gerbang tunggal, tiap
// transaksi/simpan porsi, nominal = saldo akun real-time) -- gap yang
// sebelumnya SELALU dilaporkan `missing` utk siapa pun yang punya akun
// berdiri-sendiri berporsi non-SELF>0 sekarang tertutup begitu save()
// berikutnya jalan. `_actualLinkedAccountDebts()` di bawah TIDAK diubah
// (masih baca D.debts apa adanya) -- cukup krn sekarang benar-benar ADA
// baris ber-linkedAccountId utk dibaca.
// PERUBAHAN SESI FIX-2026-09-01-lanjutan: tambah `poolCommitment` sbg
// sub-check ke-7 (lihat checkPoolCommitment() di atas utk latar lengkap) --
// pola SAMA PERSIS penambahan `ownershipDualSource` sesi S636 (fungsi
// audit-nya sudah berdiri sendiri, checkAll() cuma menambahkannya ke
// agregat). `ok` keseluruhan sekarang AND dari 7 sub-check (sebelumnya 6).
// PERUBAHAN SESI S675: tambah `returnVsLiability` sbg sub-check ke-8 (lihat
// checkReturnVsLiability() di atas utk latar lengkap) -- pola SAMA PERSIS
// penambahan `poolCommitment` di atas (fungsi audit-nya berdiri sendiri,
// checkAll() cuma menambahkannya ke agregat). `ok` keseluruhan sekarang AND
// dari 8 sub-check (sebelumnya 7).
// PERUBAHAN SESI S676: tambah `returnVsAccountLiability` sbg sub-check
// ke-9 (lihat checkReturnVsAccountLiability() di atas utk latar lengkap --
// menutup Gap #2 dari SESSION-NOTE-S675.md, channel Akun berdiri-sendiri
// yang tidak tercakup `returnVsLiability`) -- pola SAMA PERSIS penambahan
// `returnVsLiability`. `ok` keseluruhan sekarang AND dari 9 sub-check
// (sebelumnya 8).
// PERUBAHAN (poin 4, sesi lanjutan hasil audit 2026-09-01): tambah
// `pendingOwnerReview` sbg sub-check ke-10 (checkPendingOwnerReview() di
// atas) — daftar transaksi yang deductionOwnerId-nya dikosongkan
// repairTransactionOwnerRefs() krn ambigu & belum diisi ulang manual.
// Pola SAMA PERSIS ownershipDualSource/poolCommitment/returnVsLiability:
// masuk `ok` keseluruhan di sini (dipakai warnIfNotOk()/console.warn saat
// saveOwners(), non-blocking) TAPI di self-test.js sengaja TIDAK ikut
// `coreOk` (informasional -- butuh user isi ulang manual, bukan "bug sync"
// yang bisa ditombol perbaiki otomatis, sama alasan returnVsLiability).
// PERUBAHAN (poin 1, sesi lanjutan): tambah `ownerIdConflicts` sbg sub-check
// ke-11 (checkOwnerIdConflicts() di atas) -- pola SAMA PERSIS pendingOwnerReview
// di atas (informasional, masuk `ok` keseluruhan di sini utk warnIfNotOk(),
// dikecualikan dari coreOk di self-test.js).
checkAll() {
  const sync = this.check();
  const ownerIdConsistency = this.checkOwnerIdConsistency();
  const debtNameStaleness = this.checkDebtNameStaleness();
  const accountSync = this.checkAccounts();
  const transactionOwnerRefs = this.checkTransactionOwnerRefs();
  const ownershipDualSource = this.checkOwnershipDualSource();
  const poolCommitment = this.checkPoolCommitment();
  const returnVsLiability = this.checkReturnVsLiability();
  const returnVsAccountLiability = this.checkReturnVsAccountLiability();
  const pendingOwnerReview = this.checkPendingOwnerReview();
  const ownerIdConflicts = this.checkOwnerIdConflicts();
  return {
    ok: sync.ok && ownerIdConsistency.ok && debtNameStaleness.ok && accountSync.ok && transactionOwnerRefs.ok && ownershipDualSource.ok && poolCommitment.ok && returnVsLiability.ok && returnVsAccountLiability.ok && pendingOwnerReview.ok && ownerIdConflicts.ok,
    sync,
    ownerIdConsistency,
    debtNameStaleness,
    accountSync,
    transactionOwnerRefs,
    ownershipDualSource,
    poolCommitment,
    returnVsLiability,
    returnVsAccountLiability,
    pendingOwnerReview,
    ownerIdConflicts,
  };
},

// warnIfNotOk(context) — Rekomendasi #3 bagian ENFORCEMENT (S583 sesi-9).
// Rec #3 asli minta OwnerRegistry-lookup jadi validasi WAJIB tiap
// saveOwners() -- checkOwnerIdConsistency() (sesi-4) sudah jadi AUDIT-nya,
// tapi sampai sesi-8 masih belum ada yang benar-benar MEMANGGIL checkAll()
// dari titik saveOwners() -- gap-nya cuma "ketahuan kalau Tes Otomatis
// dijalankan", bukan "ketahuan saat kejadian". Fungsi ini nutup gap itu:
// dipanggil dari 3 titik saveOwners() (Aset.saveOwners/
// InvestmentUI.saveOwners/AccOwners.save) SETELAH simpan berhasil.
// SENGAJA non-blocking -- checkAll() bisa false-positive utk skenario sah
// (mis. sedang di tengah migrasi data lama, atau titipan investor
// legacy 'titipan_investor' synth yang memang di luar scope
// checkDebtNameStaleness()) -- kalau saveOwners() ditolak gara-gara ini,
// user bisa terkunci tidak bisa menyimpan porsi yang justru BENAR. Jadi:
// console.warn saja (development-visible, tidak mengganggu UI/toast user)
// -- keputusan "warn vs block" ini didiskusikan eksplisit di rencana sesi
// (lihat PATCH-NOTES.md sesi-9), bukan default diam-diam. PURE dari sisi
// modul ini sendiri (checkAll() 0 mutasi) -- efek sampingnya cuma
// console.warn, TIDAK menulis apa pun ke D.
// context = string bebas (nama pemanggil, mis. 'Aset.saveOwners') supaya
// gap di console gampang dilacak sumbernya. Return hasil checkAll() apa
// adanya (pemanggil boleh pakai lebih lanjut kalau perlu, tidak wajib).
warnIfNotOk(context) {
  const r = this.checkAll();
  if (!r.ok && typeof console !== 'undefined' && console.warn) {
    console.warn('[TitipanReconcile] Gap terdeteksi setelah ' + (context || '(unknown)') + ':', r);
  }
  return r;
},

// repairOrphans() — S595, menutup gap yang ditemukan lewat Tes Otomatis
// live (checkAll() -> sync.orphan tidak 0) tapi TIDAK ADA satu pun titik di
// app yang benar-benar membersihkannya di luar saat aset/holding yang
// BERSANGKUTAN kebetulan di-save ulang (_syncOwnerDebts()/_syncTitipanDebt()
// hanya membersihkan D.debts milik ASET/HOLDING itu sendiri tiap dipanggil
// -- lihat komentar di kedua fungsi itu). Kalau owner dicabut/porsi
// dijadikan 0 lewat jalur lain (mis. aset/holding-nya sendiri lalu dihapus
// permanen, restore backup lama, atau edit manual data), baris utang
// "titipan" yang sudah nyangkut (`orphan`, definisi sama persis check()
// di atas) TIDAK PERNAH ketarik bersih sampai ada yang sadar & save ulang
// aset/holding yang sudah tidak relevan itu -- gap ini baru KETAHUAN oleh
// checkAll(), belum ada yang MEMPERBAIKI.
//
// BEDA dgn seluruh fungsi lain di modul ini (check()/checkAll()/dst semua
// PURE baca-saja, 0 mutasi) -- fungsi ini SATU-SATUNYA yang menulis ke D,
// makanya SENGAJA dipisah bukan bagian dari checkAll()/warnIfNotOk(), dan
// TIDAK dipanggil otomatis dari mana pun (bukan dari self-test.js/Tes
// Otomatis -- kartu itu eksplisit bilang "tidak mengubah data asli Anda
// secara permanen", lihat index.html #diagSelfTest-cbody). Harus dipicu
// EKSPLISIT oleh user lewat tombol terpisah "🔧 Perbaiki Gap Dana Titipan"
// (Pengaturan > Diagnostik), yang minta konfirmasi dulu (lihat
// repairTitipanOrphans() di modules/shared/features-helpers-global-security.js).
//
// Aman dihapus (bukan salah tebak): kunci orphan (key sama persis format
// check()/_actualLinkedDebts()/_actualLinkedInvestmentDebts()) berarti
// TIDAK ADA owner aktif (porsi>0, bukan SELF) di a.owners[]/h.owners[] yang
// cocok dgn baris utang itu -- persis kondisi yang bikin _syncOwnerDebts()/
// _syncTitipanDebt() SENDIRI menghapusnya kalau aset/holding itu di-save
// ulang (lihat `D.debts=D.debts.filter(...)` di kedua fungsi itu). Fungsi
// ini cuma menjalankan penghapusan yang SAMA lebih awal/lintas SEMUA
// aset+holding sekaligus, bukan rumus baru.
// Return: {removed, keys[]} -- keys = daftar key orphan yang baris
// utangnya sudah dihapus dari D.debts (kosong kalau memang tidak ada gap).
repairOrphans() {
  if (typeof D === 'undefined' || !Array.isArray(D.debts)) return { removed: 0, keys: [] };
  const orphanKeys = new Set(this.check().orphan.map((o) => o.key));
  if (!orphanKeys.size) return { removed: 0, keys: [] };
  const before = D.debts.length;
  D.debts = D.debts.filter((d) => {
    if (!d) return true;
    if (d.linkedAssetId != null && d.linkedOwnerId != null && orphanKeys.has(d.linkedAssetId + '::' + d.linkedOwnerId)) return false;
    if (d.linkedInvestmentId != null) {
      const ownerId = d.linkedOwnerId || 'titipan_investor';
      if (orphanKeys.has('inv::' + d.linkedInvestmentId + '::' + ownerId)) return false;
    }
    return true;
  });
  return { removed: before - D.debts.length, keys: Array.from(orphanKeys) };
},

// repairMissing() — S621, menutup gap SEBALIKNYA dari repairOrphans() (S595).
// LATAR: tombol "🔧 Perbaiki Gap Dana Titipan" (app_production.html/index.html,
// data-action="repairTitipanOrphans") SUDAH LAMA menjanjikan lewat teks
// hint-nya kalau tombol itu "membuat baris Buku Utang yang seharusnya ada
// tapi belum tercatat (missing), dan/atau menghapus baris yang pemiliknya
// sudah tidak ada (orphan)" -- TAPI implementasinya (repairTitipanOrphans()
// di self-test.js) SELAMA INI cuma pernah memanggil repairOrphans() (yang
// namanya sendiri sudah bilang orphan-only, lihat komentar fungsi itu di
// atas). Kalau check().missing.length>0 TAPI check().orphan.length===0
// (persis kondisi laporan Tes Otomatis: "sync.ok=false (missing:1 orphan:0
// mismatch:0)"), repairTitipanOrphans() lama akan masuk ke cabang
// `if(pre.ok||!pre.orphan.length)` paling atas dan LANGSUNG toast "Tidak ada
// gap orphan yang perlu diperbaiki" TANPA berbuat apa-apa -- tombol terlihat
// jalan (ada toast sukses) tapi gap missing yang dilaporkan Tes Otomatis
// TETAP ADA, muncul lagi identik tiap Tes Otomatis dijalankan ulang. Itu
// sebabnya laporan tetap menunjukkan gap yang sama walau tombol perbaikan
// sudah ditekan.
//
// FUNGSI INI melengkapi separuh yang hilang itu, pola SAMA PERSIS
// repairOrphans() (SATU-SATUNYA lagi di modul ini yang menulis ke D, utk
// alasan yang sama: audit murni baca-saja, mutasi HANYA lewat tombol
// eksplisit + konfirmasi, lihat self-test.js). BUKAN rumus baru -- tiap key
// `missing` dari check() (lihat _expectedFromAssets()/_expectedFromInvestments()
// di atas) ditelusuri balik ke Aset/Holding sumbernya, lalu jalur SINKRON
// YANG SUDAH ADA (TitipanSync.reconcile(a) utk cabang Aset, sama gerbang yg
// dipanggil dari Aset.saveOwners(); Investment._syncTitipanDebt(h) utk
// cabang Investasi) dipanggil ULANG utk aset/holding itu -- fungsi-fungsi
// itu SUDAH idempotent & SUDAH menulis persis baris yang harusnya ada
// (itulah kenapa dipakai di sini, bukan menduplikasi konstruksi objek debt
// yang sudah ada 2 tempat).
// 1 aset/holding cuma disinkron SEKALI walau punya >1 owner yang sama-sama
// missing (Set dipakai supaya tidak redundant memanggil reconcile() N kali
// utk aset yang sama).
// Key yang assetId/holdingId sumbernya SUDAH TIDAK ADA di D.assets/
// D.investments (mis. aset sudah dihapus manual TAPI baris "missing" masih
// kehitung dari cache/snapshot lama) TIDAK bisa diperbaiki di sini -- masuk
// ke `unresolved` apa adanya, TIDAK di-skip diam-diam, supaya pemanggil bisa
// melaporkan ke user/console kalau ada gap yang butuh audit manual (bukan
// auto-repairable).
// Return: {synced, unresolved} -- synced = jumlah aset/holding yang
// disinkron ulang (BUKAN jumlah baris debt, krn 1 aset bisa punya >1 owner
// dibereskan dlm 1 panggilan reconcile()), unresolved = array label
// ('asset:<id>'/'inv:<id>') utk key yang sumbernya tidak ketemu.
repairMissing() {
  if (typeof D === 'undefined' || !Array.isArray(D.debts)) return { synced: 0, unresolved: [] };
  const missing = this.check().missing;
  if (!missing.length) return { synced: 0, unresolved: [] };
  const assetIds = new Set();
  const holdingIds = new Set();
  missing.forEach((m) => {
    const key = m.key;
    if (key.indexOf('inv::') === 0) {
      const rest = key.slice(5);
      const idx = rest.lastIndexOf('::');
      holdingIds.add(idx >= 0 ? rest.slice(0, idx) : rest);
    } else {
      const idx = key.lastIndexOf('::');
      assetIds.add(idx >= 0 ? key.slice(0, idx) : key);
    }
  });
  let synced = 0;
  const unresolved = [];
  assetIds.forEach((id) => {
    const a = (D.assets || []).find((x) => x && String(x.id) === String(id));
    if (!a) { unresolved.push('asset:' + id); return; }
    if (typeof TitipanSync !== 'undefined' && typeof TitipanSync.reconcile === 'function') {
      TitipanSync.reconcile(a);
    } else if (typeof Aset !== 'undefined' && typeof Aset._syncOwnerDebts === 'function') {
      Aset._syncOwnerDebts(a);
    } else { unresolved.push('asset:' + id); return; }
    synced++;
  });
  holdingIds.forEach((id) => {
    const h = (D.investments || []).find((x) => x && String(x.id) === String(id));
    if (!h) { unresolved.push('inv:' + id); return; }
    if (typeof Investment !== 'undefined' && typeof Investment._syncTitipanDebt === 'function') {
      Investment._syncTitipanDebt(h);
    } else { unresolved.push('inv:' + id); return; }
    synced++;
  });
  return { synced, unresolved };
},

// repairOwnerIdConsistency() — SESI FIX-2026-09-01-lanjutan2, menutup jalur
// perbaikan checkOwnerIdConsistency() (S583 sesi-4) yang dari awal MEMANG
// baru audit (lihat komentar fungsi itu: "di luar scope modul PURE read-only
// ini, ditunda sesi terpisah"). Sesi ini = sesi terpisah itu.
// Pola SAMA PERSIS repairOrphans()/repairMissing() di atas: SATU-SATUNYA
// tambahan yang menulis ke D, dipanggil EKSPLISIT (bukan dari checkAll()/
// warnIfNotOk()), aman dipanggil berkali-kali (idempotent — grup yang sudah
// konsisten tidak lagi divergent di panggilan berikutnya).
// Per grup nama divergent: pilih 1 `canonicalId` (utamakan id yang SUDAH
// terdaftar di D.ownerRegistry kalau ada — supaya hasil akhir konsisten dgn
// R4/OwnerRegistry.rename(); kalau tidak ada satu pun id grup itu terdaftar
// —- data lama pre-migrasi —- fallback ke id pertama yang ditemukan), lalu
// tulis ulang `ownerId`+`ownerName` seluruh baris `owners[]` (Aset &
// Investasi) yang id-nya != canonicalId jadi canonicalId + nama kanonik,
// dan propagasi sama ke D.debts[].linkedOwnerId+name (biar
// checkDebtNameStaleness() tidak langsung nyala gara-gara perbaikan ini).
// GUARD tabrakan — pola SAMA PERSIS OwnerRegistry.merge() (R4): kalau 1
// entity (aset/holding) SUDAH punya baris canonicalId DAN salah satu id
// lain di grup yang sama sekaligus, itu 2 porsi BEDA yang kebetulan
// namanya sama (bukan 1 orang yang perlu digabung) — seluruh grup nama itu
// DI-SKIP UTUH, dicatat di `conflicts`, TIDAK di-merge sebagian.
// Return: {unified, conflicts} — unified = jumlah baris owners[]/debts[]
// yang ownerId-nya disatukan, conflicts = [{name, id}] entity yang
// grup-nya dibatalkan gara-gara tabrakan (butuh review manual).
repairOwnerIdConsistency() {
  if (typeof D === 'undefined') return { unified: 0, conflicts: [] };
  const divergent = this.checkOwnerIdConsistency().divergent;
  if (!divergent.length) return { unified: 0, conflicts: [] };
  const registry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
  let unified = 0;
  const conflicts = [];
  divergent.forEach((g) => {
    const ids = g.ids;
    const registered = ids.filter((id) => registry.some((o) => o && String(o.id) === String(id)));
    const canonicalId = registered.length ? registered[0] : ids[0];
    const regEntry = registry.find((o) => o && String(o.id) === String(canonicalId));
    const canonicalName = regEntry ? regEntry.name : g.name;
    const others = ids.filter((id) => String(id) !== String(canonicalId));
    let groupConflict = false;
    const scanConflict = (list) => {
      (Array.isArray(list) ? list : []).forEach((entity) => {
        const eids = (Array.isArray(entity && entity.owners) ? entity.owners : [])
          .filter((o) => o && !o.isSelf).map((o) => String(o.ownerId));
        if (eids.includes(String(canonicalId)) && others.some((oid) => eids.includes(String(oid)))) {
          groupConflict = true;
          conflicts.push({ name: g.name, id: entity.id });
        }
      });
    };
    scanConflict(D.assets);
    scanConflict(D.investments);
    if (groupConflict) return;
    (Array.isArray(D.assets) ? D.assets : []).forEach((a) => {
      (Array.isArray(a && a.owners) ? a.owners : []).forEach((o) => {
        if (o && !o.isSelf && others.includes(String(o.ownerId))) { o.ownerId = canonicalId; o.ownerName = canonicalName; unified++; }
      });
    });
    (Array.isArray(D.investments) ? D.investments : []).forEach((h) => {
      (Array.isArray(h && h.owners) ? h.owners : []).forEach((o) => {
        if (o && !o.isSelf && others.includes(String(o.ownerId))) { o.ownerId = canonicalId; o.ownerName = canonicalName; unified++; }
      });
    });
    (Array.isArray(D.debts) ? D.debts : []).forEach((d) => {
      if (d && others.includes(String(d.linkedOwnerId))) { d.linkedOwnerId = canonicalId; d.name = canonicalName; unified++; }
    });
  });
  if (unified && typeof save === 'function') save();
  return { unified, conflicts };
},

// repairDebtNameStaleness() — menutup jalur perbaikan checkDebtNameStaleness()
// (S583 sesi-5) — pola SAMA repairOwnerIdConsistency() di atas: dipanggil
// EKSPLISIT, idempotent, SATU-SATUNYA aksi = menyalin `registryName` (sumber
// kanonik, sudah dijamin up-to-date oleh OwnerRegistry.rename()) ke
// `D.debts[].name` utk tiap entri stale yang ditemukan check()-nya sendiri
// — TIDAK ada rumus baru, murni menutup gap "rename() propagasi ke
// owners[]/commitments tapi bukan debt snapshot lama" yang dijelaskan di
// komentar checkDebtNameStaleness().
// Return: {synced} — jumlah baris D.debts[].name yang disinkronkan.
repairDebtNameStaleness() {
  if (typeof D === 'undefined' || !Array.isArray(D.debts)) return { synced: 0 };
  const stale = this.checkDebtNameStaleness().stale;
  if (!stale.length) return { synced: 0 };
  const registryNameByDebtId = {};
  stale.forEach((s) => { registryNameByDebtId[String(s.debtId)] = s.registryName; });
  let synced = 0;
  D.debts.forEach((d) => {
    const key = d && String(d.id);
    if (d && Object.prototype.hasOwnProperty.call(registryNameByDebtId, key)) {
      d.name = registryNameByDebtId[key];
      synced++;
    }
  });
  if (synced && typeof save === 'function') save();
  return { synced };
},

// repairTransactionOwnerRefs() — menutup jalur perbaikan checkTransactionOwnerRefs()
// (S635) — beda dgn 2 repair di atas, di sini TIDAK ADA satu "nilai benar"
// yang bisa ditarik balik dari sumber lain (checkOwnerIdConsistency punya
// nama yang sama sbg penanda, checkDebtNameStaleness punya D.ownerRegistry
// sbg kanonik) — `deductionOwnerId` basi cuma bisa ditebak otomatis kalau
// akun itu SEKARANG persis 1 owner valid (resolveOwnerDefaultForAccount(),
// sumber kebenaran yang sama dipakai check()-nya, lihat komentar di sana).
// Kalau owner valid saat ini TEPAT 1 -> pindah `deductionOwnerId` ke situ
// (`fixed`, tidak ambigu). Kalau 0 atau >1 (ambigu, tidak bisa ditebak
// otomatis mana yang benar) -> `deductionOwnerId` DIKOSONGKAN (null),
// BUKAN dibiarkan nunjuk owner basi yang sudah tidak valid (silent-wrong
// lebih buruk drpd eksplisit-kosong yang kelihatan di form transaksi utk
// direview manual) — dicatat di `unresolved` biar tidak dibuang diam-diam.
// Return: {fixed, cleared, unresolved} — unresolved = array txId yang
// deductionOwnerId-nya dikosongkan (butuh isi ulang manual).
// PERUBAHAN (poin 4, sesi lanjutan hasil audit 2026-09-01): sebelum ini,
// `unresolved` cuma nilai balik SESAAT — begitu panggilan selesai, tidak
// ada jalur lain user awam bisa menemukan transaksi mana saja yang kena
// (harus buka Buku Transaksi & cari satu-satu). Sekarang tiap transaksi
// yang di-cleared JUGA ditandai `_deductionOwnerReviewNeeded=true`,
// flag PERSISTEN (tersimpan di data, bukan cuma nilai balik) yang dibaca
// ulang oleh getPendingOwnerReviewTransactions() di bawah kapan saja.
repairTransactionOwnerRefs() {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) return { fixed: 0, cleared: 0, unresolved: [] };
  if (typeof resolveOwnerDefaultForAccount !== 'function') return { fixed: 0, cleared: 0, unresolved: [] };
  const orphan = this.checkTransactionOwnerRefs().orphan;
  if (!orphan.length) return { fixed: 0, cleared: 0, unresolved: [] };
  const orphanTxIds = new Set(orphan.map((o) => String(o.txId)));
  let fixed = 0, cleared = 0;
  const unresolved = [];
  D.transactions.forEach((t) => {
    if (!t || !orphanTxIds.has(String(t.id))) return;
    let resolved;
    try { resolved = resolveOwnerDefaultForAccount(t.accountId); } catch (e) { resolved = null; }
    const owners = (resolved && resolved.ok && resolved.owners) ? resolved.owners : [];
    if (owners.length === 1) {
      t.deductionOwnerId = owners[0].ownerId;
      fixed++;
    } else {
      t.deductionOwnerId = null;
      t._deductionOwnerReviewNeeded = true;
      cleared++;
      unresolved.push(t.id);
    }
  });
  if ((fixed || cleared) && typeof save === 'function') save();
  return { fixed, cleared, unresolved };
},

// checkPendingOwnerReview() — poin 4 (sesi lanjutan hasil audit 2026-09-01),
// jalur BACA daftar transaksi yang deductionOwnerId-nya dikosongkan
// repairTransactionOwnerRefs() (di atas) karena ambigu. PURE baca-saja (0
// mutasi), pola sama seluruh check*() lain di modul ini — hanya membaca
// flag `_deductionOwnerReviewNeeded` yang ditulis repair tsb.
// "Masih perlu direview" = flag ada DAN deductionOwnerId masih kosong —
// begitu user mengisi ulang pemiliknya manual lewat form transaksi (jalur
// normal, di luar modul ini), transaksi itu otomatis TIDAK lagi muncul di
// sini walau flag lama masih menempel (field mati, tidak pernah dibaca
// lagi setelah deductionOwnerId terisi) — jadi daftar ini selalu akurat
// tanpa perlu jalur "tandai selesai" terpisah.
// Return: {ok, pending: [{txId, accountId, tanggal, jumlah, catatan}]} --
// ok=true kalau pending kosong.
checkPendingOwnerReview() {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions)) return { ok: true, pending: [] };
  const pending = D.transactions
    .filter((t) => t && t._deductionOwnerReviewNeeded === true && !t.deductionOwnerId)
    .map((t) => ({ txId: t.id, accountId: t.accountId, tanggal: t.tanggal, jumlah: t.jumlah, catatan: t.catatan }));
  return { ok: pending.length === 0, pending };
},

// _computeOwnerIdConflicts() — helper PURE bersama, dipakai
// checkOwnerIdConflicts() (di bawah) DAN repairOwnerIdConsistency() (di
// atas). LOGIKA IDENTIK dgn guard tabrakan yang sudah ada di dalam
// repairOwnerIdConsistency() sejak awal (SESI FIX-2026-09-01-lanjutan2) --
// diekstrak ke sini SUPAYA bisa dibaca TANPA menjalankan repair (repair
// itu sendiri baru dipanggil EKSPLISIT lewat tombol + konfirmasi, tapi
// user berhak tahu ADA tabrakan yang butuh review manual sebelum/tanpa
// menekan tombol itu -- itu tujuan poin 1 sesi ini). 0 perubahan
// perilaku repairOwnerIdConsistency() itu sendiri (tetap hitung ulang
// inline, bukan dipanggil dari sini, supaya 0 risiko regresi ke logic
// merge yang sudah teruji).
// Per grup nama divergen (checkOwnerIdConsistency()): entity (aset/holding)
// yang SUDAH punya baris canonicalId (id yang diutamakan -- id terdaftar
// di D.ownerRegistry, atau id pertama grup kalau tidak ada yang terdaftar)
// DAN salah satu id lain di grup yang sama SEKALIGUS = tabrakan (2 porsi
// beda yang kebetulan namanya sama, bukan 1 orang yang perlu digabung).
// Return: array [{name, id}] -- id = id entity (aset/holding) yang
// tabrakan, name = nama pemilik yang divergen.
_computeOwnerIdConflicts() {
  if (typeof D === 'undefined') return [];
  const divergent = this.checkOwnerIdConsistency().divergent;
  if (!divergent.length) return [];
  const registry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
  const conflicts = [];
  divergent.forEach((g) => {
    const ids = g.ids;
    const registered = ids.filter((id) => registry.some((o) => o && String(o.id) === String(id)));
    const canonicalId = registered.length ? registered[0] : ids[0];
    const others = ids.filter((id) => String(id) !== String(canonicalId));
    const scanConflict = (list) => {
      (Array.isArray(list) ? list : []).forEach((entity) => {
        const eids = (Array.isArray(entity && entity.owners) ? entity.owners : [])
          .filter((o) => o && !o.isSelf).map((o) => String(o.ownerId));
        if (eids.includes(String(canonicalId)) && others.some((oid) => eids.includes(String(oid)))) {
          conflicts.push({ name: g.name, id: entity.id });
        }
      });
    };
    scanConflict(D.assets);
    scanConflict(D.investments);
  });
  return conflicts;
},

// checkOwnerIdConflicts() — poin 1 (sesi lanjutan hasil audit 2026-09-01):
// "conflicts cuma masuk console.warn -- kalau repairOwnerIdConsistency()
// skip grup karena tabrakan, user awam tidak akan pernah lihat itu
// (console devtools tidak kebuka di HP)". PURE baca-saja (0 mutasi), pola
// sama seluruh check*() lain di modul ini -- reuse _computeOwnerIdConflicts()
// di atas, TIDAK menjalankan repair apa pun. Beda dgn checkPendingOwnerReview()
// (butuh flag persisten krn sinyal aslinya HILANG setelah deductionOwnerId
// dikosongkan) -- tabrakan owner ID di sini SEPENUHNYA bisa dihitung ulang
// tiap saat dari D.assets/D.investments/D.ownerRegistry, jadi TIDAK perlu
// flag apa pun, murni derivasi data yang sudah ada.
// Return: {ok, conflicts: [{name, id}]} -- ok=true kalau conflicts kosong.
checkOwnerIdConflicts() {
  const conflicts = this._computeOwnerIdConflicts();
  return { ok: conflicts.length === 0, conflicts };
},

};

if (typeof module !== 'undefined' && module.exports) module.exports = TitipanReconcile;
if (typeof window !== 'undefined') window.TitipanReconcile = TitipanReconcile;
