// lifeos-object-ref.js — resolver & validator utk `sourceRef` milik Life
// Object `kind:"ref"`. Sesi 58 (Batch 4, keputusan produk FINAL — lihat
// docs/PRODUCT_DECISIONS.md § LifeOS — Life Object sourceRef):
//
//   sourceRef = { domain: "...", id: "..." }
//
// `domain` WAJIB terdaftar di LIFEOS_OBJECT_REF_SOURCES (lifeos-registry.js:
// goal/project/knowledge/review). Ini BUKAN referensi ke Life Object lain,
// BUKAN generic resolver bebas {kind,id}, BUKAN recursive, BUKAN wildcard
// domain — file ini SATU-SATUNYA tempat sourceRef divalidasi/di-resolve,
// pola read-only sama persis dgn lifeos-nav.js (LIFEOS_NAV_MAP: satu-satunya
// tempat yg tahu cara "pergi ke sourceKind" — di sini satu-satunya tempat yg
// tahu cara "resolve sourceRef domain").
//
// Depends on: lifeos-registry.js (LIFEOS_OBJECT_REF_SOURCES).

/**
 * Resolve 1 sourceRef ke object aslinya di domain terdaftar.
 * @param {string} domain kunci di LIFEOS_OBJECT_REF_SOURCES (mis. 'goal').
 * @param {string} id id di dalam domain tsb.
 * @returns {*} object hasil resolve, atau `null` kalau domain tidak
 *   terdaftar / id tidak ketemu / adapter sumbernya belum ter-load.
 */
function lifeOSObjectRefResolve(domain, id) {
  const src = typeof LIFEOS_OBJECT_REF_SOURCES !== 'undefined' ? LIFEOS_OBJECT_REF_SOURCES[domain] : null;
  if (!src || typeof src.resolver !== 'function') return null;
  return src.resolver(id);
}

/**
 * Cek keberadaan id di domain terdaftar tanpa perlu resolve object penuh.
 * @param {string} domain kunci di LIFEOS_OBJECT_REF_SOURCES.
 * @param {string} id id di dalam domain tsb.
 * @returns {boolean}
 */
function lifeOSObjectRefExists(domain, id) {
  const src = typeof LIFEOS_OBJECT_REF_SOURCES !== 'undefined' ? LIFEOS_OBJECT_REF_SOURCES[domain] : null;
  if (!src || typeof src.exists !== 'function') return false;
  return !!src.exists(id);
}

/**
 * Validator sourceRef — dipanggil saat create/update Life Object
 * `kind:"ref"`. TIDAK PERNAH membuat/menulis object apa pun (itu
 * tanggung jawab pemanggil) — murni mengembalikan hasil validasi supaya
 * pemanggil bisa menolak pembuatan object kalau `valid:false`.
 * @param {{domain?: string, id?: string}} sourceRef
 * @returns {{valid: true} | {valid: false, error: string}}
 */
function lifeOSObjectRefValidate(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'object') {
    return { valid: false, error: 'sourceRef wajib diisi' };
  }
  const { domain, id } = sourceRef;
  if (!domain || typeof LIFEOS_OBJECT_REF_SOURCES === 'undefined' || !LIFEOS_OBJECT_REF_SOURCES[domain]) {
    return { valid: false, error: `domain "${domain || ''}" tidak terdaftar di LIFEOS_OBJECT_REF_SOURCES` };
  }
  if (!id) {
    return { valid: false, error: 'id wajib diisi' };
  }
  if (!lifeOSObjectRefExists(domain, id)) {
    return { valid: false, error: `id "${id}" tidak ditemukan di domain "${domain}"` };
  }
  return { valid: true };
}

if (typeof window !== 'undefined') {
  window.lifeOSObjectRefResolve = lifeOSObjectRefResolve;
  window.lifeOSObjectRefExists = lifeOSObjectRefExists;
  window.lifeOSObjectRefValidate = lifeOSObjectRefValidate;
}
