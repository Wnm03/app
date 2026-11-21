// owner-registry.js — Owner Registry (Sesi 489, langkah 1/5 rencana
// PLAN-owner-registry-multi-session.md).
//
// TARGET: satu sumber kebenaran `ownerId` lintas Aset/Investasi/Titipan.
// Audit S488 menemukan `assetOwnersModal`/`investmentOwnersModal` generate
// `uid()` BARU tiap baris pemilik baru tanpa cek existing owner — "Budi" di
// Aset A dan Aset B bisa punya `ownerId` berbeda, padahal orangnya sama.
//
// SESI INI (S489) = FONDASI SAJA, TANPA WIRING. Tidak menyentuh aset.js,
// investasi-view.js, modals.js, atau titipanCommitmentModal — itu kerjaan
// S490 (aset.js), S491 (investasi-view.js), S492 (titipan), pola sama
// persis "1 task = 1 sesi" yang dipakai multi-owner-engine.js (S390).
//
// GATE #1 (dikunci): seed KOSONG. Registry mulai kosong, TIDAK di-backfill
// dari `D.assets[].owners`/`D.investments[].owners`/`D.titipanCommitments`
// yang sudah ada. Owner lama tetap standalone (nama sama, `ownerId` beda)
// persis seperti sekarang — hanya entri BARU setelah S490+ live yang akan
// konsisten. Konsisten dengan disiplin proyek "0 mutasi data existing".
// (Karena seed kosong, TIDAK perlu flag idempotent-seed seperti yang
// diwanti-wanti di "Danger point" plan — tidak ada proses seed sama sekali.)
//
// Struktur data: `D.ownerRegistry: [{id, name}]` — SATU field baru, tidak
// mengubah skema `owners[]` yang sudah ada di assets/investments/
// titipanCommitments. Field `ownerId`/`ownerName` di record lama tetap
// dibaca apa adanya oleh kode lain (0 sentuhan ke situ sesi ini).
//
// Pola guard `typeof` & getter-lazy-init sama persis
// `DanaTitipanPortfolioAPI.getCommitments()` (S485b) — getter TIDAK menulis
// `D.ownerRegistry` kalau belum ada, cuma balikin array kosong.

var BillDebtPiutangCanonicalWriter=(typeof globalThis!=='undefined'&&globalThis.BillDebtPiutangCanonicalWriter)?globalThis.BillDebtPiutangCanonicalWriter:(typeof require==='function'?require('../finance/bill-debt-piutang-canonical-writer.js'):null);

function _ownerRegistryClone(value){
  try{return JSON.parse(JSON.stringify(value));}catch(_){return value;}
}
// S2917: daftar koleksi lintas fitur yang ikut di-snapshot/rollback selain registry.
const _OWNER_REF_KEYS=['assets','investments','titipanCommitments','accounts','titipanReturns','transactions','bills','billsArchive','piutang','renovProjects'];
function _ownerRegistrySnapshot(){
  if(typeof D==='undefined')return null;
  const snap={ownerRegistry:_ownerRegistryClone(D.ownerRegistry),debts:_ownerRegistryClone(D.debts)};
  _OWNER_REF_KEYS.forEach((k)=>{snap[k]=_ownerRegistryClone(D[k]);});
  return snap;
}
function _ownerRegistryRestore(snapshot){
  if(!snapshot||typeof D==='undefined')return;
  D.ownerRegistry=snapshot.ownerRegistry;
  _OWNER_REF_KEYS.forEach((k)=>{if(snapshot[k]!==undefined)D[k]=snapshot[k];else delete D[k];});
  if(typeof BillDebtPiutangCanonicalWriter==='undefined'||!BillDebtPiutangCanonicalWriter||typeof BillDebtPiutangCanonicalWriter.replace!=='function') throw new Error('BILL_DEBT_CANONICAL_WRITER_REQUIRED'); BillDebtPiutangCanonicalWriter.replace('debts',snapshot.debts);
}
// S2917: SATU peta tempat penyimpan id pemilik lintas fitur. Dipakai rename(), merge(),
// auditRefs() dan countRefs() supaya tidak ada tempat yang terlupa. Callback menerima
// (holder, field, nameField|null, kind, scope). `holder[field]` = id pemilik; scope = objek
// pembungkus (rekening/proyek) untuk deteksi konflik. Baris isSelf / id 'SELF' tidak dikunjungi.
function _ownerRefVisit(fn){
  if(typeof D==='undefined'||!D)return;
  const arr=(v)=>Array.isArray(v)?v:[];
  const has=(v)=>v!=null&&v!==''&&String(v)!=='SELF';
  arr(D.accounts).forEach((a)=>{
    if(!a)return;
    arr(a.owners).forEach((o)=>{if(o&&!o.isSelf&&has(o.ownerId))fn(o,'ownerId','ownerName','accountOwner',a);});
    if(a.ownerAnchor&&Array.isArray(a.ownerAnchor.ids))a.ownerAnchor.ids.forEach((v,i)=>{if(has(v))fn(a.ownerAnchor.ids,i,null,'ownerAnchor',a);});
  });
  arr(D.titipanReturns).forEach((r)=>{if(r&&has(r.ownerId))fn(r,'ownerId','ownerName','titipanReturn',null);});
  arr(D.transactions).forEach((t)=>{
    if(!t)return;
    ['deductionOwnerId','titipanLinkId','renovLabaOwnerId','talanganPelunasanOwnerId'].forEach((f)=>{if(has(t[f]))fn(t,f,null,'tx.'+f,null);});
  });
  arr(D.bills).concat(arr(D.billsArchive)).forEach((b)=>{if(b&&has(b.deductionOwnerId))fn(b,'deductionOwnerId',null,'bill.deductionOwnerId',null);});
  arr(D.piutang).forEach((p)=>{if(p&&has(p.autoTitipanOwnerId))fn(p,'autoTitipanOwnerId',null,'piutang.autoTitipanOwnerId',null);});
  arr(D.renovProjects).forEach((p)=>{
    const f=p&&p.pencairanFinal;
    arr(f&&f.rows).forEach((r)=>{if(r&&!r.isSelf&&has(r.ownerId))fn(r,'ownerId','ownerName','pencairanFinal',p);});
  });
}
function _ownerRegistrySaveOrRollback(snapshot){
  try{
    if(typeof save!=='function')return {ok:true};
    const result=save();
    if(result===false){_ownerRegistryRestore(snapshot);return {ok:false,reason:'persistence-failed'};}
    return {ok:true};
  }catch(error){
    _ownerRegistryRestore(snapshot);
    return {ok:false,reason:'persistence-failed',error};
  }
}

const OwnerRegistry = {

  // listAll() — getter read-only. Balikin `D.ownerRegistry` apa adanya
  // (atau `[]` kalau belum pernah diisi) — dipakai sebagai sumber dropdown
  // "Pilih Pemilik" di S490/S491 (belum ada consumer sesi ini).
  listAll() {
    return (typeof D !== 'undefined' && Array.isArray(D.ownerRegistry)) ? D.ownerRegistry : [];
  },

  // findOrCreate(name) — cari entri existing by NAMA (trim, case-insensitive)
  // dulu; kalau ketemu, balikin `id`-nya (TIDAK membuat entri baru/duplikat).
  // Kalau tidak ketemu, buat entri baru (`id` via `uid()`), push ke
  // `D.ownerRegistry`, panggil `save()` kalau tersedia, balikin `id` baru.
  //
  // CATATAN — batas fungsi ini: matching by nama HANYA dipakai di titik
  // input "buat baru" (user mengetik nama, S490+ dropdown). Registry
  // sendiri tetap dedup by `id`, BUKAN by nama — `rename()`/`merge()` (R4)
  // TIDAK mengubah itu: rename tidak auto-collapse ke entri lain yang
  // kebetulan namanya jadi sama (lihat komentar `rename()` di bawah), harus
  // lewat `merge()` eksplisit kalau memang mau digabung.
  //
  // Parameter:
  //   name (string) — wajib non-empty setelah di-trim, kalau tidak throw
  //     Error (pola sama `saveCommitment()`/`recordReturn()`).
  // Return: string `id` (existing atau baru).
  findOrCreate(name) {
    const trimmed = (name && String(name).trim()) || '';
    if (!trimmed) throw new Error('Nama pemilik wajib diisi');
    if (typeof D === 'undefined') throw new Error('Registry belum siap dimuat');
    D.ownerRegistry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
    const lower = trimmed.toLowerCase();
    const existing = D.ownerRegistry.find((o) => o && typeof o.name === 'string' && o.name.trim().toLowerCase() === lower);
    if (existing) return String(existing.id);
    const id = String((typeof uid === 'function') ? uid() : ('owner_' + Date.now()));
    const snapshot = _ownerRegistrySnapshot();
    D.ownerRegistry.push({ id, name: trimmed });
    try {
      if(typeof save==='function' && save()===false){
        D.ownerRegistry.splice(D.ownerRegistry.length-1,1);
        throw new Error('Gagal menyimpan owner registry');
      }
    } catch(error) {
      if(error && error.message==='Gagal menyimpan owner registry') throw error;
      D.ownerRegistry.splice(D.ownerRegistry.length-1,1);
      throw new Error('Gagal menyimpan owner registry');
    }
    return id;
  },

  // rename(id, newName) — R4 (audit ownership/titipan, menutup
  // OWNREG-GATE3-001). Ganti `name` 1 entri registry + PROPAGASI ke semua
  // salinan `ownerName` yang tersimpan denormalized per baris (owners[] di
  // Aset/Investasi, D.titipanCommitments[], D.debts[] tertaut) — tanpa
  // propagasi ini, rename di registry saja TIDAK akan terlihat di UI karena
  // seluruh consumer baca `ownerName` dari baris masing-masing, bukan
  // lookup ke registry saat render (lihat komentar `_holdingSplits()`/
  // `_assetSplits()` di dana-titipan-portfolio-presenter.js).
  //
  // KEPUTUSAN Gate #3 (dikunci sesi ini): rename TIDAK auto-collapse ke
  // entri lain yang kebetulan namanya jadi sama (opsi (b) dari
  // OWNREG-GATE3-001) — 2 `id` tetap 2 entri terpisah walau nama akhirnya
  // sama, konsisten dgn "registry dedup by id, bukan by nama" (S489).
  // Kalau memang mau digabung, pakai `merge()` di bawah secara eksplisit.
  //
  // Return: {ok:true, assets, investments, commitments} — jumlah baris yang
  // ikut diupdate per domain. {ok:false, reason} kalau id tidak ditemukan
  // atau newName kosong.
  rename(id, newName) {
    if (typeof D === 'undefined') return { ok: false, reason: 'Registry belum siap dimuat' };
    D.ownerRegistry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
    const entry = D.ownerRegistry.find((o) => o && String(o.id) === String(id));
    if (!entry) return { ok: false, reason: 'Owner tidak ditemukan di registry' };
    const trimmed = (newName && String(newName).trim()) || '';
    if (!trimmed) return { ok: false, reason: 'Nama baru wajib diisi' };
    const snapshot = _ownerRegistrySnapshot();
    entry.name = trimmed;
    let assets = 0, investments = 0, commitments = 0, debts = 0, bagiHasil = 0;
    (Array.isArray(D.assets) ? D.assets : []).forEach((a) => {
      (Array.isArray(a && a.owners) ? a.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(id)) { o.ownerName = trimmed; assets++; }
      });
    });
    (Array.isArray(D.investments) ? D.investments : []).forEach((h) => {
      (Array.isArray(h && h.owners) ? h.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(id)) { o.ownerName = trimmed; investments++; }
      });
    });
    (Array.isArray(D.titipanCommitments) ? D.titipanCommitments : []).forEach((c) => {
      if (c && String(c.ownerId) === String(id)) { c.ownerName = trimmed; commitments++; }
    });
    // Cermin blok debts di merge() (baris di bawah) — temuan sesi-5:
    // rename() sebelumnya tidak propagasi ke D.debts[].name, jadi
    // checkDebtNameStaleness() (titipan-reconcile.js) nyala merah palsu
    // setiap kali owner registry di-rename tanpa ganti nama debt terkait.
    (Array.isArray(D.debts) ? D.debts : []).forEach((d) => {
      if (d && String(d.linkedOwnerId) === String(id)) { if(BillDebtPiutangCanonicalWriter&&typeof BillDebtPiutangCanonicalWriter.updateById==='function') BillDebtPiutangCanonicalWriter.updateById('debts',d.id,d0=>{ d0.name = trimmed; }); else d.name=trimmed; debts++; }
    });
    // S2897: bagi hasil proyek renovasi menyimpan salinan ownerName sendiri
    // (D.renovProjects[].bagiHasil.owners[]). Tanpa propagasi, sinkron utang
    // bagi hasil berikutnya mengembalikan nama utang ke nama lama.
    (Array.isArray(D.renovProjects) ? D.renovProjects : []).forEach((p) => {
      (Array.isArray(p && p.bagiHasil && p.bagiHasil.owners) ? p.bagiHasil.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(id)) { o.ownerName = trimmed; bagiHasil++; }
      });
    });
    // S2917: akun, riwayat pengembalian titipan dan baris pencairan final menyimpan salinan nama sendiri.
    let lintas = 0;
    _ownerRefVisit((h, f, nf, kind) => {
      if (nf && String(h[f]) === String(id) && h[nf] !== trimmed) { h[nf] = trimmed; lintas++; }
    });
    const persisted = _ownerRegistrySaveOrRollback(snapshot);
    if(!persisted.ok)return {ok:false,reason:'persistence-failed'};
    return { ok: true, assets, investments, commitments, debts, bagiHasil, lintas };
  },

  // merge(sourceId, targetId) — R4: gabung 2 entri registry yang ternyata
  // orang yang sama (mis. dulu diketik "Budi" & "Budi W" terpisah). SEMUA
  // referensi `sourceId` (owners[] Aset/Investasi, D.titipanCommitments[],
  // D.debts[].linkedOwnerId) dipindah ke `targetId`, `ownerName` disamakan
  // ke nama `targetId` di registry, lalu entri `sourceId` DIHAPUS dari
  // registry. Penghapusan HANYA di `D.ownerRegistry` — tidak pernah
  // menghapus Aset/Investasi/Commitment/Debt itu sendiri.
  //
  // GUARD tabrakan (pola sama persis Aset/Investment.migrateOwnersToRegistry()
  // R2): kalau 1 entity (aset/holding) SUDAH punya baris `targetId` DAN
  // `sourceId` sekaligus, entity itu di-SKIP UTUH (porsi tidak digabung
  // otomatis — butuh review manual, dua porsi yang beda tidak boleh
  // ke-collapse diam-diam). Kalau ADA konflik di entity mana pun, `merge()`
  // BATAL TOTAL (tidak ada perubahan parsial) — return
  // {ok:false, reason:'conflict', conflicts:[...]}.
  //
  // Return sukses: {ok:true, assets, investments, commitments, debts}.
  merge(sourceId, targetId) {
    if (typeof D === 'undefined') return { ok: false, reason: 'Registry belum siap dimuat' };
    if (String(sourceId) === String(targetId)) return { ok: false, reason: 'sourceId dan targetId sama' };
    D.ownerRegistry = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
    const src = D.ownerRegistry.find((o) => o && String(o.id) === String(sourceId));
    const tgt = D.ownerRegistry.find((o) => o && String(o.id) === String(targetId));
    if (!src || !tgt) return { ok: false, reason: 'sourceId atau targetId tidak ditemukan di registry' };
    const snapshot = _ownerRegistrySnapshot();
    const conflicts = [];
    (Array.isArray(D.assets) ? D.assets : []).forEach((a) => {
      const ids = (Array.isArray(a && a.owners) ? a.owners : []).filter((o) => o && !o.isSelf).map((o) => String(o.ownerId));
      if (ids.includes(String(sourceId)) && ids.includes(String(targetId))) conflicts.push({ domain: 'asset', id: a.id });
    });
    (Array.isArray(D.investments) ? D.investments : []).forEach((h) => {
      const ids = (Array.isArray(h && h.owners) ? h.owners : []).filter((o) => o && !o.isSelf).map((o) => String(o.ownerId));
      if (ids.includes(String(sourceId)) && ids.includes(String(targetId))) conflicts.push({ domain: 'investment', id: h.id });
    });
    // S2897: penerima bagi hasil ganda dalam satu proyek (source DAN target) tidak digabung otomatis.
    (Array.isArray(D.renovProjects) ? D.renovProjects : []).forEach((p) => {
      const ids = (Array.isArray(p && p.bagiHasil && p.bagiHasil.owners) ? p.bagiHasil.owners : []).filter((o) => o && !o.isSelf).map((o) => String(o.ownerId));
      if (ids.includes(String(sourceId)) && ids.includes(String(targetId))) conflicts.push({ domain: 'renovBagiHasil', id: p.id });
    });
    // S2917: rekening, pencairan final dan komitmen titipan yang memuat pemilik asal DAN tujuan sekaligus.
    const _sid = String(sourceId), _tid = String(targetId);
    const _byScope = new Map();
    _ownerRefVisit((h, f, nf, kind, scope) => {
      if (!scope || (kind !== 'accountOwner' && kind !== 'pencairanFinal')) return;
      const v = String(h[f]); if (v !== _sid && v !== _tid) return;
      const key = kind + ':' + String(scope.id);
      if (!_byScope.has(key)) _byScope.set(key, { kind, id: scope.id, ids: new Set() });
      _byScope.get(key).ids.add(v);
    });
    _byScope.forEach((e) => { if (e.ids.size > 1) conflicts.push({ domain: e.kind === 'accountOwner' ? 'account' : 'pencairanFinal', id: e.id }); });
    const _cm = (Array.isArray(D.titipanCommitments) ? D.titipanCommitments : []).filter((c) => c && (String(c.ownerId) === _sid || String(c.ownerId) === _tid));
    if (_cm.some((c) => String(c.ownerId) === _sid) && _cm.some((c) => String(c.ownerId) === _tid)) conflicts.push({ domain: 'titipanCommitment', id: _tid });
    if (conflicts.length) return { ok: false, reason: 'conflict', conflicts };
    let assets = 0, investments = 0, commitments = 0, debts = 0, bagiHasil = 0;
    (Array.isArray(D.assets) ? D.assets : []).forEach((a) => {
      (Array.isArray(a && a.owners) ? a.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(sourceId)) { o.ownerId = targetId; o.ownerName = tgt.name; assets++; }
      });
    });
    (Array.isArray(D.investments) ? D.investments : []).forEach((h) => {
      (Array.isArray(h && h.owners) ? h.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(sourceId)) { o.ownerId = targetId; o.ownerName = tgt.name; investments++; }
      });
    });
    (Array.isArray(D.titipanCommitments) ? D.titipanCommitments : []).forEach((c) => {
      if (c && String(c.ownerId) === String(sourceId)) { c.ownerId = targetId; c.ownerName = tgt.name; commitments++; }
    });
    (Array.isArray(D.debts) ? D.debts : []).forEach((d) => {
      if (d && String(d.linkedOwnerId) === String(sourceId)) { if(BillDebtPiutangCanonicalWriter&&typeof BillDebtPiutangCanonicalWriter.updateById==='function') BillDebtPiutangCanonicalWriter.updateById('debts',d.id,d0=>{ d0.linkedOwnerId = targetId; d0.name = tgt.name; if (String(d0.renovBagiOwnerId) === String(sourceId)) d0.renovBagiOwnerId = targetId; }); else { d.linkedOwnerId=targetId; d.name=tgt.name; if (String(d.renovBagiOwnerId) === String(sourceId)) d.renovBagiOwnerId = targetId; } debts++; }
    });
    (Array.isArray(D.renovProjects) ? D.renovProjects : []).forEach((p) => {
      (Array.isArray(p && p.bagiHasil && p.bagiHasil.owners) ? p.bagiHasil.owners : []).forEach((o) => {
        if (o && !o.isSelf && String(o.ownerId) === String(sourceId)) { o.ownerId = targetId; o.ownerName = tgt.name; bagiHasil++; }
      });
    });
    // S2917: pindahkan semua referensi lintas fitur (akun, transaksi, tagihan, piutang talangan, pengembalian, pencairan final).
    let lintas = 0;
    _ownerRefVisit((h, f, nf) => {
      if (String(h[f]) !== _sid) return;
      h[f] = targetId; if (nf) h[nf] = tgt.name; lintas++;
    });
    D.ownerRegistry = D.ownerRegistry.filter((o) => String(o.id) !== String(sourceId));
    const persisted = _ownerRegistrySaveOrRollback(snapshot);
    if(!persisted.ok)return {ok:false,reason:'persistence-failed'};
    return { ok: true, assets, investments, commitments, debts, bagiHasil, lintas };
  },

  // S2917: countRefs(id) — jumlah referensi id pemilik di semua fitur (baca-saja).
  countRefs(id) {
    let n = 0;
    if (typeof D === 'undefined') return n;
    _ownerRefVisit((h, f) => { if (String(h[f]) === String(id)) n++; });
    const cnt = (list, get) => (Array.isArray(list) ? list : []).forEach((x) => { if (x && get(x) && String(get(x)) === String(id)) n++; });
    cnt(D.titipanCommitments, (c) => c.ownerId);
    cnt(D.debts, (d) => d.linkedOwnerId);
    [D.assets, D.investments].forEach((l) => (Array.isArray(l) ? l : []).forEach((e) => (Array.isArray(e && e.owners) ? e.owners : []).forEach((o) => { if (o && !o.isSelf && String(o.ownerId) === String(id)) n++; })));
    return n;
  },

  // S2917: auditRefs() — baca-saja. {orphans, duplicateNames, staleNames}. Dipakai gerbang health-check.
  auditRefs() {
    const out = { orphans: [], duplicateNames: [], staleNames: [] };
    if (typeof D === 'undefined') return out;
    const reg = Array.isArray(D.ownerRegistry) ? D.ownerRegistry : [];
    const byId = new Map(reg.filter(Boolean).map((o) => [String(o.id), o]));
    const orphan = new Map(), stale = new Map();
    const note = (h, f, nf, kind) => {
      const v = String(h[f]);
      const e = byId.get(v);
      if (!e) { if (!orphan.has(v)) orphan.set(v, { ownerId: v, kinds: new Set() }); orphan.get(v).kinds.add(kind); return; }
      if (nf && typeof h[nf] === 'string' && h[nf].trim() && h[nf].trim() !== String(e.name).trim()) {
        const k = v + '|' + h[nf]; if (!stale.has(k)) stale.set(k, { ownerId: v, registryName: e.name, rowName: h[nf], kind });
      }
    };
    _ownerRefVisit(note);
    (Array.isArray(D.titipanCommitments) ? D.titipanCommitments : []).forEach((c) => { if (c && c.ownerId && String(c.ownerId) !== 'SELF') note(c, 'ownerId', 'ownerName', 'titipanCommitment'); });
    // Hanya pemilik yang tercatat di registry yang dianggap yatim bila id-nya hilang; seed registry kosong (S489) = tidak ada temuan.
    out.orphans = reg.length ? [...orphan.values()].map((o) => ({ ownerId: o.ownerId, kinds: [...o.kinds] })) : [];
    out.staleNames = reg.length ? [...stale.values()] : [];
    const seen = new Map();
    reg.forEach((o) => { if (!o) return; const k = String(o.name || '').trim().toLowerCase(); if (!k) return; if (!seen.has(k)) seen.set(k, []); seen.get(k).push(String(o.id)); });
    seen.forEach((ids, k) => { if (ids.length > 1) out.duplicateNames.push({ name: k, ids }); });
    return out;
  },

};

if (typeof window !== 'undefined') {
  window.OwnerRegistry = OwnerRegistry;
}
