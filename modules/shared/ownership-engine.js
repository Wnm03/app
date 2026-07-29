// ownership-engine.js — Ownership Engine (Sesi 191, fondasi lintas-domain).
//
// TARGET EKSPLISIT USER: "Implementasikan hanya Ownership Engine. Reuse
// seluruh modul existing. Jangan ubah business logic. Jangan refactor
// besar... Buat satu Ownership Engine sebagai single source of truth. Semua
// modul tetap memakai engine ini. Jangan sinkronkan ke modul lain dulu."
//
// SINGLE SOURCE OF TRUTH: modul ini dimaksudkan jadi SATU-SATUNYA tempat
// 5 tipe kepemilikan (SELF/INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY) divalidasi,
// diberi label Bahasa Indonesia, dan dipakai utk assign/resolve/filter/group
// data. Konsumen MASA DEPAN (finance/asset/vehicle/business, dst) WAJIB
// pakai OwnershipEngine.* alih-alih menghitung/mendefinisikan ulang sendiri
// — SESI INI SENGAJA TIDAK MENYENTUH modul lain apa pun (tidak ada field
// `ownership` baru ditambahkan ke `D.*`, tidak ada UI, tidak ada wiring ke
// akun/aset/kendaraan) sesuai batasan eksplisit "jangan sinkronkan ke modul
// lain dulu" — wiring itu jadi kerjaan sesi lain yang eksplisit memintanya
// (1 task = 1 sesi, sesuai AI_RULES.md/SESSION_RULES.md).
//
// PURE & DETERMINISTIK: tidak pernah panggil save()/menyentuh D, tidak ada
// Date.now()/Math.random(); semua method murni menerima input & balikin
// output — pola {ok,...} sama persis modul engine lain di project ini
// (lihat modules/vehicle/fuel-gauge-engine.js, TASK-143).
//
// TIDAK ADA business logic baru yang menggantikan logic existing — karena
// belum ada satu pun modul di project ini yang punya konsep kepemilikan
// (audit: grep "ownership" di seluruh source sebelum sesi ini nihil), jadi
// tidak ada logic lama yang perlu diganti atau berpotensi ke-refactor.
const OWNERSHIP_TYPES = Object.freeze(['SELF', 'INVESTOR', 'CUSTOMER', 'THIRD_PARTY', 'FAMILY']);

// Label Bahasa Indonesia per tipe — dipakai UI masa depan (belum dipakai
// sesi ini) supaya tidak ada modul lain yang perlu mendefinisikan mapping
// label sendiri-sendiri (konsisten dgn prinsip single source of truth).
const OWNERSHIP_LABELS = Object.freeze({
  SELF: 'Milik Sendiri',
  INVESTOR: 'Investor',
  CUSTOMER: 'Pelanggan',
  THIRD_PARTY: 'Pihak Ketiga',
  FAMILY: 'Keluarga',
});

const DEFAULT_OWNERSHIP = 'SELF';

const OwnershipEngine = {

// TYPES — daftar 5 tipe kepemilikan yang valid, urutan tetap SELF/
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY sesuai spesifikasi. Array baru
// (slice()) dibalikin tiap akses supaya caller tidak bisa mutasi daftar
// resmi lewat referensi yang dibagikan (OWNERSHIP_TYPES sendiri di-freeze).
get TYPES() {
  return OWNERSHIP_TYPES.slice();
},

// DEFAULT — tipe kepemilikan default kalau data belum diisi (SELF, sesuai
// asumsi wajar utk aplikasi keluarga single-user/rumah tangga: aset/akun
// yang belum diberi label kepemilikan explisit dianggap milik sendiri).
get DEFAULT() {
  return DEFAULT_OWNERSHIP;
},

// _normalizeRaw(type) — helper internal: trim + uppercase kalau string,
// selain itu balikin apa adanya (biar isValidType/validate yang nolak).
// Tidak divalidasi terhadap daftar resmi di sini — itu tugas caller.
_normalizeRaw(type) {
  return typeof type === 'string' ? type.trim().toUpperCase() : type;
},

// isValidType(type) — cek apakah `type` (SUDAH dinormalisasi kalau string:
// trim + uppercase, jadi 'self'/' Self '/'SELF' semua diterima) salah satu
// dari 5 tipe resmi. Return boolean murni (bukan {ok,...} — dipakai sbg
// guard ringan oleh method lain & caller eksternal).
isValidType(type) {
  return OWNERSHIP_TYPES.indexOf(this._normalizeRaw(type)) !== -1;
},

// normalize(type) — normalisasi + validasi satu langkah: balikin tipe
// resmi (uppercase, salah satu OWNERSHIP_TYPES) kalau valid, atau `null`
// kalau tidak (bukan string, string kosong, atau bukan salah satu dari 5
// tipe resmi). Dipakai internal oleh validate()/assign()/resolve() supaya
// aturan normalisasi konsisten satu tempat.
normalize(type) {
  const norm = this._normalizeRaw(type);
  return this.isValidType(norm) ? norm : null;
},

// validate(type) — versi {ok,...} dari normalize(), utk caller yang butuh
// alasan gagal (mis. form input UI masa depan).
// Return: {ok:true, type} kalau valid (type SUDAH dinormalisasi uppercase).
//   {ok:false, reason} kalau: bukan string, string kosong/whitespace, atau
//   bukan salah satu dari 5 tipe resmi (reason menyebutkan daftar valid).
validate(type) {
  if (typeof type !== 'string' || !type.trim()) {
    return { ok: false, reason: 'Tipe kepemilikan wajib diisi' };
  }
  const norm = this.normalize(type);
  if (!norm) {
    return { ok: false, reason: `Tipe kepemilikan tidak valid — harus salah satu dari: ${OWNERSHIP_TYPES.join(', ')}` };
  }
  return { ok: true, type: norm };
},

// label(type) — label Bahasa Indonesia utk satu tipe kepemilikan. Terima
// tipe belum dinormalisasi (mis. 'self' lowercase) sekalipun. Balikin
// string label resmi kalau valid, atau `type` apa adanya (fallback
// tampilan, tidak crash) kalau tidak dikenali/bukan string.
label(type) {
  const norm = this.normalize(type);
  if (norm) return OWNERSHIP_LABELS[norm];
  return typeof type === 'string' ? type : String(type);
},

// resolve(entity) — baca kepemilikan efektif dari sebuah entity (objek apa
// pun yang PUNYA/BELUM PUNYA field `ownership`), TOLERAN thd data lama yang
// belum punya field ini (fallback ke DEFAULT) — beda sengaja dari
// validate()/assign() yang strict, karena resolve() dipakai utk MEMBACA
// data existing yang mayoritas belum ada field ownership (semua data
// project ini sebelum sesi ini) sehingga tidak boleh menolaknya sbg error.
// Parameter:
//   entity (object|null|undefined) — entity apa pun (akun, aset, kendaraan,
//     transaksi, dst.) yang MUNGKIN punya field `ownership`.
// Return: {ok:true, type, isDefault} — `type` salah satu dari 5 tipe resmi,
//   `isDefault` true kalau entity tidak punya field `ownership` valid
//   (dipakai caller yang mau membedakan "eksplisit SELF" vs "belum diisi").
//   entity null/undefined/bukan object, atau field `ownership`-nya bukan
//   salah satu dari 5 tipe resmi, SAMA-SAMA dianggap "belum diisi" ->
//   fallback DEFAULT (bukan error — lihat alasan di atas).
resolve(entity) {
  const raw = entity && typeof entity === 'object' ? entity.ownership : undefined;
  const norm = this.normalize(raw);
  if (norm) return { ok: true, type: norm, isDefault: false };
  return { ok: true, type: DEFAULT_OWNERSHIP, isDefault: true };
},

// assign(entity, type) — PURE: balikin SALINAN BARU `entity` dgn field
// `ownership` diisi/diganti tipe yang sudah divalidasi & dinormalisasi.
// Entity ASLI TIDAK DIMUTASI (spread copy) — caller bertanggung jawab
// menyimpannya lewat pola save() masing-masing domain (di luar cakupan
// engine ini, sesuai batasan "jangan sinkronkan ke modul lain dulu").
// Parameter:
//   entity (object) — entity yang mau diberi/diganti kepemilikan.
//   type (string) — salah satu dari 5 tipe resmi (case-insensitive, boleh
//     ada whitespace, dinormalisasi lewat validate()).
// Return: {ok:true, entity} kalau sukses (entity = salinan baru + field
//   `ownership` ternormalisasi). {ok:false, reason} kalau: entity bukan
//   object (null/undefined/array/primitive) atau type tidak valid (lihat
//   validate()).
assign(entity, type) {
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
    return { ok: false, reason: 'Entity tidak valid — harus berupa object' };
  }
  const validated = this.validate(type);
  if (!validated.ok) return validated;
  return { ok: true, entity: { ...entity, ownership: validated.type } };
},

// filterByType(list, type) — filter array entity yang kepemilikan
// EFEKTIF-nya (lewat resolve(), jadi entity tanpa field `ownership` ikut
// dianggap DEFAULT/SELF) sama dgn `type`.
// Parameter:
//   list (array) — array of entity (object apa pun, boleh campur ada/tidak
//     ada field `ownership`).
//   type (string) — tipe yang dicari (case-insensitive, dinormalisasi).
// Return: {ok:true, items} — `items` array baru (TIDAK memutasi `list`,
//   subset entity aslinya, bukan salinan — filter tidak perlu clone tiap
//   item). {ok:false, reason} kalau `list` bukan array atau `type` tidak
//   valid (lihat validate()).
filterByType(list, type) {
  if (!Array.isArray(list)) return { ok: false, reason: 'List tidak valid — harus berupa array' };
  const validated = this.validate(type);
  if (!validated.ok) return validated;
  const items = list.filter((item) => this.resolve(item).type === validated.type);
  return { ok: true, items };
},

// groupByType(list) — kelompokkan array entity ke 5 bucket kepemilikan
// resmi (SEMUA 5 tipe selalu jadi key hasil, meski bucket-nya kosong — jadi
// caller tidak perlu guard existence key). Entity tanpa field `ownership`
// valid ikut masuk bucket DEFAULT/SELF (lewat resolve()).
// Parameter:
//   list (array) — array of entity.
// Return: {ok:true, groups} — `groups` object {SELF:[...], INVESTOR:[...],
//   CUSTOMER:[...], THIRD_PARTY:[...], FAMILY:[...]}. {ok:false, reason}
//   kalau `list` bukan array.
groupByType(list) {
  if (!Array.isArray(list)) return { ok: false, reason: 'List tidak valid — harus berupa array' };
  const groups = {};
  OWNERSHIP_TYPES.forEach((t) => { groups[t] = []; });
  list.forEach((item) => { groups[this.resolve(item).type].push(item); });
  return { ok: true, groups };
},

// countByType(list) — sama seperti groupByType() tapi balikin jumlah per
// tipe (bukan array item), lebih murah utk caller yang cuma butuh angka
// (mis. widget ringkasan masa depan).
// Parameter:
//   list (array) — array of entity.
// Return: {ok:true, counts} — `counts` object {SELF:N, INVESTOR:N, ...}
//   (SEMUA 5 tipe selalu jadi key, default 0). {ok:false, reason} kalau
//   `list` bukan array.
countByType(list) {
  const grouped = this.groupByType(list);
  if (!grouped.ok) return grouped;
  const counts = {};
  OWNERSHIP_TYPES.forEach((t) => { counts[t] = grouped.groups[t].length; });
  return { ok: true, counts };
},

};
