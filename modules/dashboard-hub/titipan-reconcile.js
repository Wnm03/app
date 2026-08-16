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
_expectedFromAssets() {
  const out = {};
  if (typeof MultiOwnerEngine === 'undefined' || typeof D === 'undefined') return out;
  (D.assets || []).forEach((a) => {
    const res = MultiOwnerEngine.getOwners(a);
    const owners = (res && res.ok) ? res.owners : [];
    const nilai = typeof a.nilai === 'number' && isFinite(a.nilai) ? a.nilai : 0;
    owners.filter((o) => !o.isSelf && o.porsi > 0).forEach((o) => {
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
_expectedFromInvestments() {
  const out = {};
  if (typeof Investment === 'undefined' || typeof D === 'undefined') return out;
  (D.investments || []).forEach((h) => {
    let owners;
    try { owners = Investment.getOwners(h).filter((o) => !o.isSelf && o.porsi > 0); }
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
checkAll() {
  const sync = this.check();
  const ownerIdConsistency = this.checkOwnerIdConsistency();
  const debtNameStaleness = this.checkDebtNameStaleness();
  const accountSync = this.checkAccounts();
  const transactionOwnerRefs = this.checkTransactionOwnerRefs();
  const ownershipDualSource = this.checkOwnershipDualSource();
  return {
    ok: sync.ok && ownerIdConsistency.ok && debtNameStaleness.ok && accountSync.ok && transactionOwnerRefs.ok && ownershipDualSource.ok,
    sync,
    ownerIdConsistency,
    debtNameStaleness,
    accountSync,
    transactionOwnerRefs,
    ownershipDualSource,
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

};

if (typeof module !== 'undefined' && module.exports) module.exports = TitipanReconcile;
if (typeof window !== 'undefined') window.TitipanReconcile = TitipanReconcile;
