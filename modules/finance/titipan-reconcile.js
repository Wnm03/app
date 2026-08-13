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
checkAll() {
  const sync = this.check();
  const ownerIdConsistency = this.checkOwnerIdConsistency();
  const debtNameStaleness = this.checkDebtNameStaleness();
  return {
    ok: sync.ok && ownerIdConsistency.ok && debtNameStaleness.ok,
    sync,
    ownerIdConsistency,
    debtNameStaleness,
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

};

if (typeof module !== 'undefined' && module.exports) module.exports = TitipanReconcile;
if (typeof window !== 'undefined') window.TitipanReconcile = TitipanReconcile;
