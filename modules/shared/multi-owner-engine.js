// multi-owner-engine.js — Multi-Owner Engine (Sesi 390, fondasi porsi
// kepemilikan pecahan lintas-domain).
//
// TARGET EKSPLISIT USER sesi ini: "audit ownership agar 1 aset bisa
// dimiliki beberapa orang dengan porsi beda-beda, hitung otomatis
// keuntungan berdasarkan porsi, tambahkan reko AI." Setelah audit source
// (lihat FIX-s433-audit-fix-renov-edit-not-saving.md), disepakati scope sesi ini
// DIPERSEMPIT jadi FONDASI DULU: engine porsi kepemilikan murni. Split
// keuntungan otomatis (baca dari `keuntungan`/`keuntunganPct` yang sudah
// ada di modules/asset/aset.js) dan rule reko AI (register ke
// AIDecision.recommend, modules/ai/ai-decision-engine.js) SENGAJA
// DITUNDA ke sesi berikutnya — keduanya baru bisa dibangun DI ATAS engine
// ini, dan project ini disiplin 1 task = 1 sesi (lihat pola sama persis
// modules/shared/ownership-engine.js Sesi 191).
//
// KENAPA ENGINE BARU, BUKAN EXTEND OwnershipEngine (S191): OwnershipEngine
// itu modelnya "1 entity = 1 tipe kepemilikan" (SELF/INVESTOR/CUSTOMER/
// THIRD_PARTY/FAMILY), field tunggal `entity.ownership` (string). Model itu
// TIDAK BISA merepresentasikan "70% Ayah + 30% Budi" — nambah porsi ke
// OwnershipEngine berarti mengubah kontrak method existing (resolve/assign/
// filterByType/groupByType/countByType SEMUA mengasumsikan 1 tipe per
// entity), yang melanggar batasan "jangan ubah business logic existing"
// sesi 191 itu sendiri. Jadi: engine terpisah, field terpisah
// (`entity.owners`, array), OwnershipEngine TIDAK disentuh sama sekali
// sesi ini (audit: grep "OwnershipEngine" di file ini -> nihil referensi).
//
// BACKWARD COMPAT: entity lama yang cuma punya `entity.ownership` (string,
// dari OwnershipEngine) dan BELUM punya `entity.owners` (array) tetap valid
// dibaca lewat getOwners() -> disintesis jadi 1 pemilik porsi 100% (label
// dari field `ownership`-nya kalau ada, fallback 'Pemilik'). Entity yang
// benar-benar kosong (tidak ada `ownership` maupun `owners`) disintesis
// jadi 1 pemilik SELF porsi 100% (selaras DEFAULT OwnershipEngine).
//
// PURE & DETERMINISTIK: tidak pernah panggil save()/menyentuh D, tidak ada
// Date.now()/Math.random(); semua method murni menerima input & balikin
// output — pola {ok,...} sama persis OwnershipEngine (S191) &
// fuel-gauge-engine.js (TASK-143).
//
// TIDAK ADA wiring ke modul lain sesi ini (tidak ada field `owners` baru
// ditambahkan ke D.assets/dst, tidak ada UI, tidak dipanggil dari mana
// pun) — sesuai pola persis "1 task = 1 sesi" yang sama dipakai
// ownership-engine.js S191. Wiring ke aset.js (split keuntungan) & AI
// reko jadi kerjaan sesi berikutnya yang eksplisit memintanya.
//
// SESI 406b (Sesi A dari 4 sesi migrasi Dana Titipan -> Multi-Owner):
// tambah 1 cabang sintesis lagi ke getOwners() — baca `titipanAmount`
// legacy (modules/asset/aset.js), lihat `_synthesizeFromTitipan()` di
// bawah utk detail. TETAP pure/0 UI/0 D.debts — cuma nambah cara BACA
// data lama, tidak ada TULIS/migrasi data & tidak menyentuh
// _syncTitipanDebt()/D.debts sama sekali (itu kerjaan Sesi B). Sesi C
// (wiring ke Aset.save()/UI) & Sesi D (dana-kelolaan.js) juga ditunda,
// sama disiplin "1 task = 1 sesi" di atas.

// Toleransi floating point untuk validasi total porsi = 100 (mis. hasil
// 33.33+33.33+33.34 = 100.00000000000001 karena representasi float —
// tanpa toleransi ini akan salah ditolak sbg "tidak valid").
const PORSI_EPSILON = 0.01;
const PORSI_TOTAL = 100;

const MultiOwnerEngine = {

// _isPlainObject(v) — helper internal: true kalau v object biasa (bukan
// null, bukan array). Dipakai guard di beberapa method di bawah supaya
// tidak duplikat pengecekan yang sama berkali-kali.
_isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
},

// _resolveIsSelf(o) — helper internal (Sesi 393): tentukan apakah 1 baris
// pemilik mewakili pemilik aplikasi ("saya") — dipakai getOwners()/
// setOwners() supaya konsisten. Prioritas: (1) field eksplisit `isSelf`
// (diisi user via checkbox "👤 Saya" di modal porsi kepemilikan, S393),
// (2) fallback ownerId==='SELF' (case-insensitive) — sentinel yang SUDAH
// dipakai konsisten di seluruh codebase (OwnershipEngine.DEFAULT, filter
// vehOwnFilter, dst), supaya data lama (owners lahir dari sintesis field
// `ownership` legacy, atau ditulis manual/DevTools/import sebelum field
// isSelf ada) tetap TOLERAN terbaca benar tanpa perlu migrasi data.
_resolveIsSelf(o) {
  if (o && o.isSelf === true) return true;
  return !!(o && typeof o.ownerId === 'string' && o.ownerId.trim().toUpperCase() === 'SELF');
},

// _synthesizeFromTitipan(entity) — helper internal getOwners() (Sesi 406b):
// sintesis 2 baris pemilik dari field dana titipan legacy milik
// modules/asset/aset.js (`nilai`, `titipanAmount`, `titipanOwnerType`,
// `titipanOwnerName` — pola PARSIAL: 1 nominal dari total `nilai`, beda
// dari `fundSource`/`titipanOwner` di modules/asset/investasi.js yang
// all-or-nothing per holding, jadi TIDAK disintesis di sini, biar tetap
// balik ke sintesis default 100% SELF via cabang `ownership`/fallback).
// Nominal titipan dijepit ke [0, nilai] (jaga-jaga data korup/basi — pola
// clamp sama persis dgn Aset.save()) supaya total porsi selalu PERSIS 100
// (selfPorsi dihitung sbg SISA dari titipanPorsi, bukan dibagi terpisah,
// jadi tidak ada residu float yang bikin total != 100).
// Parameter:
//   entity (object|null|undefined) — entity yang MUNGKIN punya field
//     `nilai`/`titipanAmount`/`titipanOwnerType`/`titipanOwnerName`.
// Return: {ok:true, owners, isSynthesized:true, isMultiOwner} kalau
//   entity punya titipanAmount>0 & nilai>0 (angka valid & finite).
//   `owners` berisi 1 baris (titipanAmount>=nilai, porsi sendiri habis)
//   atau 2 baris (SELF + pemilik titipan). null kalau tidak berlaku
//   (bukan kasus titipan legacy) — caller (getOwners()) lanjut ke cabang
//   berikutnya.
_synthesizeFromTitipan(entity) {
  if (!this._isPlainObject(entity)) return null;
  const titipanAmt = entity.titipanAmount;
  const nilai = entity.nilai;
  if (typeof titipanAmt !== 'number' || !isFinite(titipanAmt) || titipanAmt <= 0) return null;
  if (typeof nilai !== 'number' || !isFinite(nilai) || nilai <= 0) return null;
  const clampedTitipan = Math.min(titipanAmt, nilai);
  const titipanPorsi = (clampedTitipan / nilai) * PORSI_TOTAL;
  const selfPorsi = PORSI_TOTAL - titipanPorsi;
  const typeLabel = entity.titipanOwnerType === 'keluarga' ? 'Keluarga' : (entity.titipanOwnerType === 'lainnya' ? 'Pihak Lain' : 'Investor');
  const titipanName = (entity.titipanOwnerName && String(entity.titipanOwnerName).trim()) ? (String(entity.titipanOwnerName).trim() + ' (' + typeLabel + ')') : typeLabel;
  const titipanOwnerId = 'titipan_' + (entity.titipanOwnerType || 'investor');
  const owners = [];
  if (selfPorsi > 0) {
    owners.push({ ownerId: 'SELF', porsi: selfPorsi, ownerName: 'Milik Sendiri', isSelf: true });
  }
  owners.push({ ownerId: titipanOwnerId, porsi: titipanPorsi, ownerName: titipanName, isSelf: false });
  return { ok: true, owners, isSynthesized: true, isMultiOwner: owners.length > 1 };
},

// validateOwner(owner) — validasi SATU baris pemilik: {ownerId, porsi,
// [ownerName]}.
// Parameter:
//   owner (object) — ownerId (string wajib, non-kosong setelah trim),
//     porsi (number wajib, >0 dan <=100 — porsi 0 atau negatif ditolak
//     karena berarti "bukan pemilik"), ownerName (string opsional, cuma
//     label tampilan, tidak divalidasi isinya).
// Return: {ok:true} kalau valid. {ok:false, reason} kalau tidak.
validateOwner(owner) {
  if (!this._isPlainObject(owner)) {
    return { ok: false, reason: 'Data pemilik tidak valid — harus berupa object' };
  }
  if (typeof owner.ownerId !== 'string' || !owner.ownerId.trim()) {
    return { ok: false, reason: 'ownerId wajib diisi (string, tidak boleh kosong)' };
  }
  if (typeof owner.porsi !== 'number' || !isFinite(owner.porsi)) {
    return { ok: false, reason: 'porsi wajib berupa angka' };
  }
  if (owner.porsi <= 0 || owner.porsi > PORSI_TOTAL) {
    return { ok: false, reason: 'porsi harus lebih dari 0 dan maksimal 100' };
  }
  return { ok: true };
},

// totalPorsi(owners) — jumlah porsi mentah (TIDAK divalidasi dulu, dipakai
// internal validateOwners() & caller yang mau tahu total sebelum commit,
// mis. UI slider porsi). Baris yang bukan object/porsi bukan angka
// dilewati (dianggap 0) supaya tidak throw di tengah penjumlahan.
// Parameter:
//   owners (array) — array baris pemilik (boleh belum tervalidasi).
// Return: number (0 kalau owners bukan array atau kosong).
totalPorsi(owners) {
  if (!Array.isArray(owners)) return 0;
  return owners.reduce((sum, o) => {
    const p = this._isPlainObject(o) && typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : 0;
    return sum + p;
  }, 0);
},

// validateOwners(owners) — validasi SELURUH daftar pemilik satu aset:
// setiap baris lolos validateOwner(), ownerId tidak boleh duplikat, dan
// total porsi harus PERSIS 100 (dalam toleransi PORSI_EPSILON).
// Parameter:
//   owners (array) — array baris pemilik, minimal 1 baris.
// Return: {ok:true, total} kalau valid (`total` = total porsi ternormalisasi,
//   selalu 100 dlm batas epsilon). {ok:false, reason} kalau: bukan array,
//   array kosong, ada baris tidak valid (reason menyebut index-nya),
//   ownerId duplikat, atau total porsi != 100.
validateOwners(owners) {
  if (!Array.isArray(owners) || owners.length === 0) {
    return { ok: false, reason: 'Daftar pemilik wajib diisi minimal 1 pemilik' };
  }
  const seen = new Set();
  for (let i = 0; i < owners.length; i++) {
    const v = this.validateOwner(owners[i]);
    if (!v.ok) return { ok: false, reason: `Pemilik ke-${i + 1}: ${v.reason}` };
    const key = owners[i].ownerId.trim().toLowerCase();
    if (seen.has(key)) {
      return { ok: false, reason: `ownerId duplikat: "${owners[i].ownerId}"` };
    }
    seen.add(key);
  }
  const total = this.totalPorsi(owners);
  if (Math.abs(total - PORSI_TOTAL) > PORSI_EPSILON) {
    return { ok: false, reason: `Total porsi harus 100% (saat ini ${total}%)` };
  }
  return { ok: true, total };
},

// remainingPorsi(owners) — sisa porsi yang belum dialokasikan (100 -
// totalPorsi), dibulatkan ke 2 desimal (menghindari residu float spt
// 0.30000000000000004 tampil di UI masa depan). TIDAK divalidasi dulu
// (owners boleh sedang "belum lengkap", mis. form yang masih diisi) —
// beda sengaja dari validateOwners() yang strict.
// Parameter:
//   owners (array) — array baris pemilik (boleh parsial/belum valid).
// Return: number — sisa porsi (bisa negatif kalau total porsi > 100).
remainingPorsi(owners) {
  const sisa = PORSI_TOTAL - this.totalPorsi(owners);
  return Math.round(sisa * 100) / 100;
},

// getOwners(entity) — baca daftar pemilik EFEKTIF dari sebuah entity,
// TOLERAN thd data lama (beda sengaja dari validateOwners() yang strict,
// sama alasan dgn OwnershipEngine.resolve() vs validate() — lihat S191).
// Prioritas baca:
//   1. entity.owners (array) — kalau lolos validateOwners(), dipakai apa
//      adanya (isSynthesized:false).
//   2. entity.titipanAmount legacy (Sesi 406b — lihat modules/asset/aset.js
//      `a.nilai`/`a.titipanAmount`/`a.titipanOwnerType`/`a.titipanOwnerName`)
//      — kalau titipanAmount>0 & nilai>0, disintesis jadi 2 pemilik: sisa
//      (nilai-titipanAmount) porsi 'SELF', & titipanAmount porsi pemilik
//      dana titipan. Dicek SEBELUM cabang `ownership` di bawah krn
//      titipanAmount kasih info split PARSIAL yang lebih rinci (`ownership`
//      cuma 1 tipe utk SELURUH entity — lihat komentar
//      modules/finance/dana-kelolaan.js soal beda keduanya).
//   3. entity.ownership (string, dari OwnershipEngine S191) — kalau ada &
//      valid, disintesis jadi 1 pemilik porsi 100%, ownerId = tipe
//      kepemilikan itu sendiri (mis. 'SELF'), ownerName = label
//      Bahasa Indonesia-nya KALAU OwnershipEngine tersedia di scope global
//      (guard typeof — modul ini tidak boleh WAJIB dimuat berbarengan),
//      fallback ownerName = tipe mentah kalau tidak.
//   4. Tidak ada satu pun di atas (atau entity.owners invalid) -> disintesis
//      jadi 1 pemilik default: ownerId 'SELF', porsi 100 (selaras
//      OwnershipEngine.DEFAULT).
// Parameter:
//   entity (object|null|undefined) — entity apa pun (aset, akun,
//     investasi, kendaraan, dst) yang MUNGKIN punya field `owners`/
//     `titipanAmount`/`ownership`.
// Return: {ok:true, owners, isSynthesized, isMultiOwner} — `owners` array
//   baris {ownerId, porsi, ownerName} (SALINAN, aman dimutasi caller),
//   `isSynthesized` true kalau bukan dibaca langsung dari entity.owners
//   yang valid, `isMultiOwner` true kalau owners.length > 1.
getOwners(entity) {
  const raw = this._isPlainObject(entity) ? entity.owners : undefined;
  if (Array.isArray(raw)) {
    const v = this.validateOwners(raw);
    if (v.ok) {
      const owners = raw.map((o) => ({ ownerId: o.ownerId, porsi: o.porsi, ownerName: typeof o.ownerName === 'string' ? o.ownerName : o.ownerId, isSelf: this._resolveIsSelf(o) }));
      return { ok: true, owners, isSynthesized: false, isMultiOwner: owners.length > 1 };
    }
  }
  const titipanRes = this._synthesizeFromTitipan(entity);
  if (titipanRes) return titipanRes;
  const legacyType = this._isPlainObject(entity) ? entity.ownership : undefined;
  const hasEngine = typeof OwnershipEngine !== 'undefined';
  const normType = hasEngine && OwnershipEngine.normalize ? OwnershipEngine.normalize(legacyType) : null;
  if (normType) {
    const label = OwnershipEngine.label(normType);
    return { ok: true, owners: [{ ownerId: normType, porsi: PORSI_TOTAL, ownerName: label, isSelf: this._resolveIsSelf({ ownerId: normType }) }], isSynthesized: true, isMultiOwner: false };
  }
  return { ok: true, owners: [{ ownerId: 'SELF', porsi: PORSI_TOTAL, ownerName: 'Milik Sendiri', isSelf: true }], isSynthesized: true, isMultiOwner: false };
},

// setOwners(entity, owners) — PURE: balikin SALINAN BARU `entity` dgn
// field `owners` diisi/diganti daftar pemilik yang sudah divalidasi
// (pola sama persis OwnershipEngine.assign() — spread copy, entity asli
// TIDAK dimutasi, caller tanggung jawab save() di domain masing-masing).
// Parameter:
//   entity (object) — entity yang mau diberi/diganti daftar pemilik.
//   owners (array) — daftar baris pemilik baru (lihat validateOwners()).
// Return: {ok:true, entity} kalau sukses (entity = salinan baru + field
//   `owners` berisi array baris ternormalisasi: hanya {ownerId, porsi,
//   ownerName} per baris, field asing di tiap baris dibuang).
//   {ok:false, reason} kalau: entity bukan object, atau owners tidak lolos
//   validateOwners().
setOwners(entity, owners) {
  if (!this._isPlainObject(entity)) {
    return { ok: false, reason: 'Entity tidak valid — harus berupa object' };
  }
  const v = this.validateOwners(owners);
  if (!v.ok) return v;
  const normalized = owners.map((o) => ({
    ownerId: o.ownerId.trim(),
    porsi: o.porsi,
    ownerName: typeof o.ownerName === 'string' && o.ownerName.trim() ? o.ownerName.trim() : o.ownerId.trim(),
    isSelf: this._resolveIsSelf(o),
  }));
  return { ok: true, entity: { ...entity, owners: normalized } };
},

// selfPorsi(entity) — Sesi 393: total porsi % yang mewakili pemilik aplikasi
// ("saya") dari daftar pemilik EFEKTIF entity (lewat getOwners(), jadi ikut
// toleran thd data lama/tersintesis). Dipakai Zakat Maal & Pajak Aset supaya
// yang dihitung wajib zakat/pajak cuma porsi milik sendiri, bukan nilai aset
// penuh kalau aset itu patungan/multi-pemilik. Aset single-owner (mayoritas
// — default/legacy) selalu balik 100 (perilaku SAMA seperti sebelum Sesi 393,
// 0 regresi utk kasus paling umum).
// Return: number 0..100 (0 kalau tidak ada satu pun baris ditandai isSelf).
selfPorsi(entity) {
  const res = this.getOwners(entity);
  if (!res || !res.ok) return 0;
  return res.owners.reduce((s, o) => s + (o.isSelf ? o.porsi : 0), 0);
},

// selfOwnedValue(entity, nilai) — Sesi 393: `nilai` (mis. nilai aset) yang
// jadi porsi milik sendiri, murni `nilai * selfPorsi(entity)/100`. Pure
// kalkulasi, TIDAK baca `D` — nilai & entity dioper eksplisit oleh caller.
// Parameter:
//   entity (object|null|undefined) — entity apa pun yang MUNGKIN punya
//     field `owners`/`ownership` (lihat getOwners()).
//   nilai (number) — angka yang mau dipotong sesuai porsi (mis. a.nilai).
// Return: number (0 kalau `nilai` bukan angka valid).
selfOwnedValue(entity, nilai) {
  if (typeof nilai !== 'number' || !isFinite(nilai)) return 0;
  return nilai * (this.selfPorsi(entity) / PORSI_TOTAL);
},

// splitByPorsi(nilai, owners) — bagi satu angka (mis. keuntungan aset)
// SESUAI porsi masing-masing pemilik. Pure kalkulasi, TIDAK baca `D`/aset
// mana pun — nilai & owners dioper eksplisit oleh caller (mis. sesi
// berikutnya yang wiring ke aset.js akan panggil dgn `a.keuntungan` &
// `MultiOwnerEngine.getOwners(a).owners`).
// Parameter:
//   nilai (number) — angka yang mau dibagi (boleh negatif, mis. rugi).
//   owners (array) — daftar baris pemilik, HARUS lolos validateOwners()
//     (total 100%) — kalau tidak, split tidak proporsional/tidak akurat.
// Return: {ok:true, splits} — `splits` array {ownerId, ownerName, porsi,
//   bagian} (bagian = nilai * porsi/100, TIDAK dibulatkan — pembulatan
//   tampilan jadi tanggung jawab caller/formatter, sama pola `fmt()`
//   dipakai terpisah dari kalkulasi di project ini). {ok:false, reason}
//   kalau `nilai` bukan angka valid, atau `owners` tidak lolos
//   validateOwners().
splitByPorsi(nilai, owners) {
  if (typeof nilai !== 'number' || !isFinite(nilai)) {
    return { ok: false, reason: 'nilai wajib berupa angka' };
  }
  const v = this.validateOwners(owners);
  if (!v.ok) return v;
  const splits = owners.map((o) => ({
    ownerId: o.ownerId,
    ownerName: typeof o.ownerName === 'string' && o.ownerName.trim() ? o.ownerName.trim() : o.ownerId,
    porsi: o.porsi,
    bagian: nilai * (o.porsi / PORSI_TOTAL),
  }));
  return { ok: true, splits };
},

};
