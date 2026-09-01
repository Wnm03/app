// realokasi-sisa-kuota.js — RealokasiSisaKuota (SESI FIX-2026-09-01, fitur "🔀 Alihkan sisa
// kuota titipan ke aset lain"): 1 owner titipan sering punya pokok yang BELUM habis
// teralokasi ke 1 instrumen (mis. pokok Rp11jt, holding cuma py ruang Rp9.145.761, sisa
// Rp377.244 nganggur) -- SEBELUM fitur ini, user harus cari sendiri aset/holding lain yang
// masih punya ruang kosong (porsi "Milik Sendiri") & pindah porsi manual satu-satu.
//
// SCOPE (Bagian 1, disepakati eksplisit user): cakup KEDUA domain porsi kepemilikan yang
// sudah ada -- Buku Aset (D.assets, dipakai lewat Aset._applyOwnersToAsset(), aset-owners.js)
// DAN Holding Investasi (D.investments, dipakai lewat Investment.setOwners(), investasi.js).
// TIDAK membangun rumus porsi/validasi baru -- 100% REUSE MultiOwnerEngine.getOwners()/
// selfPorsi()/setOwners() (multi-owner-engine.js) utk baca & tulis, & 2 fungsi tulis existing
// (Aset._applyOwnersToAsset()/Investment.setOwners()) yang SUDAH menjaga side-effect penuh
// (sync saldo akun tertaut, TitipanSync.reconcile(), save()) per domain masing-masing --
// modul ini murni layer KEPUTUSAN (kandidat mana, berapa Rp per kandidat), BUKAN layer TULIS.
//
// ALGORITMA (2 pilihan user, dipilih eksplisit): (1) isi ruang kosong TERBESAR dulu (bukan
// FIFO/nama, supaya jumlah baris alokasi minimal), (2) ambil dari porsi SELF/"Milik Sendiri"
// SAJA (findCandidates() mengukur "ruang kosong" = nilai * selfPorsi/100 -- TIDAK PERNAH
// memotong porsi owner titipan LAIN yang sudah ada di kandidat itu).
//
// PURE murni utk findCandidates()/buildPlan() (0 penulisan D, aman dipanggil berulang utk
// preview) -- applyAllocationRow() SATU-SATUNYA method yang menulis (dipanggil hanya setelah
// user konfirmasi lewat askConfirm() di caller UI, aset-owners.js/investasi-view.js).
const RealokasiSisaKuota = {

// MIN_ROOM_RP -- ambang "ruang kosong"/alokasi dianggap signifikan (bukan noise pembulatan
// float), mirror PERSIS Aset.DUST_THRESHOLD_RP/InvestmentUI.DUST_THRESHOLD_RP (S687) supaya
// perilaku "dust vs signifikan" konsisten di seluruh fitur kuota titipan, bukan angka baru.
MIN_ROOM_RP: 100,

// _assetRoom(a) -- ruang kosong (Rp) porsi "Milik Sendiri" di 1 aset Buku Aset. 0 kalau aset
// belum punya nilai, atau aset ini TERTAUT ke Holding Investasi (a.investmentId, porsi
// aset itu diatur & disimpan di Holding-nya -- lihat Aset._toggleOwnersEditControls()/
// openOwnersModal() -- BUKAN di Buku Aset, jadi tidak valid jadi target realokasi dari sini;
// holding-nya sendiri tetap ikut kehitung lewat _holdingRoom() di bawah).
_assetRoom(a) {
  if (!a || typeof a.nilai !== 'number' || !isFinite(a.nilai) || !(a.nilai > 0)) return 0;
  if (a.investmentId) return 0;
  if (typeof MultiOwnerEngine === 'undefined') return 0;
  const selfPorsi = MultiOwnerEngine.selfPorsi(a);
  return a.nilai * (selfPorsi / 100);
},

// _holdingRoom(h) -- ruang kosong (Rp) porsi "Milik Sendiri" di 1 Holding Investasi. Basis
// Investment.holdingValue(h) -- SAMA basis yang dipakai InvestmentUI._ownersHoldingValue()
// (S552) utk konversi porsi%<->Rp di modal Holding ini, 0 basis baru.
_holdingRoom(h) {
  if (!h) return 0;
  if (typeof Investment === 'undefined' || typeof Investment.holdingValue !== 'function') return 0;
  if (typeof MultiOwnerEngine === 'undefined') return 0;
  const value = Investment.holdingValue(h) || 0;
  if (!(value > 0)) return 0;
  const selfPorsi = MultiOwnerEngine.selfPorsi(h);
  return value * (selfPorsi / 100);
},

// findCandidates(exclude) -- daftar SEMUA aset Buku Aset + Holding Investasi yang punya ruang
// kosong signifikan (>MIN_ROOM_RP), diurutkan ruang TERBESAR dulu (Algoritma poin 1 di atas).
// Parameter exclude (opsional): {assetId, holdingId} -- entity yang SEDANG dibuka di modal
// caller (tidak masuk akal disarankan "alihkan ke sini" krn owner sedang diedit di situ juga).
// Return: array {type:'asset'|'holding', id, name, room} — PURE, 0 mutasi D.
findCandidates(exclude) {
  exclude = exclude || {};
  const out = [];
  if (typeof D !== 'undefined' && Array.isArray(D.assets)) {
    D.assets.forEach((a) => {
      if (!a || (exclude.assetId && typeof sameId === 'function' && sameId(a.id, exclude.assetId))) return;
      const room = RealokasiSisaKuota._assetRoom(a);
      if (room > RealokasiSisaKuota.MIN_ROOM_RP) out.push({ type: 'asset', id: a.id, name: (a.name && String(a.name).trim()) || '(Aset tanpa nama)', room });
    });
  }
  if (typeof D !== 'undefined' && Array.isArray(D.investments)) {
    D.investments.forEach((h) => {
      if (!h || (exclude.holdingId && typeof sameId === 'function' && sameId(h.id, exclude.holdingId))) return;
      const room = RealokasiSisaKuota._holdingRoom(h);
      if (room > RealokasiSisaKuota.MIN_ROOM_RP) out.push({ type: 'holding', id: h.id, name: (h.name && String(h.name).trim()) || '(Holding tanpa nama)', room });
    });
  }
  out.sort((x, y) => y.room - x.room);
  return out;
},

// buildPlan(sisa, candidates) -- susun rencana alokasi GREEDY dari `sisa` (Rp, sisa kuota
// titipan owner yang belum tertampung) ke `candidates` (HARUS sudah terurut ruang terbesar
// dulu, lihat findCandidates()) -- isi kandidat pertama SEPENUHNYA (min(sisa, room)) dulu
// baru lanjut ke kandidat berikutnya, sampai sisa habis atau kandidat habis. PURE, 0 mutasi.
// Return: {plan:[{type,id,name,alloc}], unallocated} — unallocated>0 kalau ruang kosong total
// semua kandidat < sisa (user tetap perlu tindakan manual utk sisanya).
buildPlan(sisa, candidates) {
  let remaining = typeof sisa === 'number' && isFinite(sisa) ? sisa : 0;
  const list = Array.isArray(candidates) ? candidates : [];
  const plan = [];
  for (let i = 0; i < list.length && remaining > RealokasiSisaKuota.MIN_ROOM_RP; i++) {
    const c = list[i];
    const alloc = Math.min(remaining, c.room);
    if (alloc <= RealokasiSisaKuota.MIN_ROOM_RP) continue;
    plan.push({ type: c.type, id: c.id, name: c.name, alloc });
    remaining -= alloc;
  }
  return { plan, unallocated: Math.max(0, Math.round(remaining)) };
},

// applyAllocationRow(item, ownerId, ownerName) -- SATU-SATUNYA method yang MENULIS D, dipanggil
// PER BARIS plan (hasil buildPlan(), setelah user konfirmasi lewat askConfirm() di caller).
// Baca owners EFEKTIF target (MultiOwnerEngine.getOwners(), toleran data lama), potong porsi
// baris "Milik Sendiri" sebesar item.alloc (dikonversi ke %, dipotong berurutan lintas SEMUA
// baris isSelf kalau >1 -- lihat komentar onOwnerIsSelfToggle() aset-owners.js soal >1 baris
// SELF diperbolehkan), TIDAK PERNAH menyentuh porsi owner titipan lain (Algoritma poin 2).
// Owner (ownerId) yang SUDAH jadi pemilik di target -> porsi-nya ditambah (bukan baris
// duplikat); belum ada -> baris baru non-SELF. Tulis balik lewat fungsi domain yang SUDAH ADA
// (Aset._applyOwnersToAsset()/Investment.setOwners(), 0 rumus tulis baru) supaya sync saldo
// akun tertaut/TitipanSync.reconcile()/save() tetap 100% konsisten dgn jalur modal biasa.
// Return: {ok:true, actualAlloc} atau {ok:false, reason} (mis. race: ruang SELF sudah berubah
// antara preview & konfirmasi -- baris ini gagal TANPA menghentikan baris plan lain, caller
// yang mengumpulkan hasil per baris, lihat _applyRealokasiSisaKuota() di aset-owners.js).
applyAllocationRow(item, ownerId, ownerName) {
  if (!item || !ownerId) return { ok: false, reason: 'Data alokasi tidak valid' };
  if (typeof MultiOwnerEngine === 'undefined') return { ok: false, reason: 'MultiOwnerEngine belum dimuat' };
  let entity = null; let value = 0; let writeBack = null;
  if (item.type === 'asset') {
    entity = (typeof D !== 'undefined' && Array.isArray(D.assets)) ? D.assets.find((x) => typeof sameId === 'function' ? sameId(x.id, item.id) : x.id === item.id) : null;
    value = entity ? (entity.nilai || 0) : 0;
    writeBack = (owners) => {
      if (typeof Aset === 'undefined' || typeof Aset._applyOwnersToAsset !== 'function') throw new Error('Fitur porsi Buku Aset belum siap dimuat');
      return Aset._applyOwnersToAsset(entity, owners);
    };
  } else if (item.type === 'holding') {
    entity = (typeof Investment !== 'undefined' && typeof Investment.getHolding === 'function') ? Investment.getHolding(item.id) : null;
    value = entity && typeof Investment.holdingValue === 'function' ? (Investment.holdingValue(entity) || 0) : 0;
    writeBack = (owners) => {
      if (typeof Investment === 'undefined' || typeof Investment.setOwners !== 'function') throw new Error('Fitur porsi Holding Investasi belum siap dimuat');
      return Investment.setOwners(item.id, owners);
    };
  } else {
    return { ok: false, reason: 'Tipe target tidak dikenal' };
  }
  if (!entity) return { ok: false, reason: 'Target realokasi tidak ditemukan (mungkin sudah dihapus)' };
  if (!(value > 0)) return { ok: false, reason: 'Nilai target tidak valid' };
  const res = MultiOwnerEngine.getOwners(entity);
  if (!res || !res.ok) return { ok: false, reason: 'Gagal membaca daftar pemilik target' };
  const owners = res.owners.map((o) => ({ ownerId: o.ownerId, porsi: o.porsi, ownerName: o.ownerName, isSelf: o.isSelf }));
  const addPorsi = Math.min(100, (item.alloc / value) * 100);
  let toDeduct = addPorsi;
  for (let i = 0; i < owners.length && toDeduct > 0.0001; i++) {
    if (!owners[i].isSelf) continue;
    const cut = Math.min(owners[i].porsi, toDeduct);
    owners[i].porsi -= cut;
    toDeduct -= cut;
  }
  const actualAdd = addPorsi - Math.max(0, toDeduct);
  if (actualAdd <= 0.0001) return { ok: false, reason: 'Ruang porsi Milik Sendiri target sudah tidak cukup (mungkin berubah sejak preview)' };
  const finalOwners = owners.filter((o) => o.porsi > 0.0001 || !o.isSelf);
  const existingRow = finalOwners.find((o) => !o.isSelf && String(o.ownerId) === String(ownerId));
  if (existingRow) {
    existingRow.porsi += actualAdd;
  } else {
    finalOwners.push({ ownerId, ownerName: (ownerName && String(ownerName).trim()) || String(ownerId), porsi: actualAdd, isSelf: false });
  }
  try {
    writeBack(finalOwners);
  } catch (e) {
    return { ok: false, reason: (e && e.message) || 'Gagal menyimpan alokasi' };
  }
  return { ok: true, actualAlloc: value * (actualAdd / 100) };
},

};
