// services/life-object-service.js — SATU-SATUNYA tempat menulis
// LifeOSStore.objects (Life Object). Sesi 58 (Batch 4, lanjutan Sesi 57 —
// registry+resolver+validator sourceRef). Tidak pernah menulis ke D atau
// array D.* lain. Setiap fungsi tulis di sini memanggil lifeOSSave() di
// akhir (dari lifeos-store.js) — SAMA POLA dgn project-service.js.
//
// Scope MVP sesi ini: HANYA 2 kind yang didukung, `kind:"generic"` &
// `kind:"ref"` (kind lain BELUM didesain — ditolak eksplisit dgn
// validation error, bukan diterima diam-diam):
//   - kind:"generic" -> sourceRef SELALU dipaksa `null`, tidak pernah
//     divalidasi via lifeOSObjectRefValidate() (tidak ada sourceRef utk
//     divalidasi) — pola identik dgn project kind:'generic' di
//     project-service.js.
//   - kind:"ref"     -> sourceRef WAJIB lolos lifeOSObjectRefValidate()
//     (lifeos-object-ref.js) SEBELUM object dibuat/diupdate. Kalau gagal,
//     balik `{valid:false, error:'...'}` dan TIDAK PERNAH menulis apa
//     pun ke store (kontrak sama persis dgn lifeOSObjectRefValidate()
//     sendiri — lihat docs/PRODUCT_DECISIONS.md § LifeOS — Life Object
//     sourceRef).
//
// create()/update() balik Promise<{valid:true, object} | {valid:false,
// error}> (beda dari project-service.js yang balik object/null langsung)
// KARENA di sini validasi bisa gagal dgn alasan yang perlu ditunjukkan ke
// pemanggil (mis. ke UI di sesi lanjutan) — bukan sekadar "ketemu/tidak
// ketemu" spt project-service.js. delete()/get()/list() tetap pola lama
// (delete() balik Promise dari lifeOSSave(), get()/list() sync, TIDAK ada
// UI yang mengonsumsi ini di sesi ini — CRUD service layer saja).

const LIFE_OBJECT_KINDS = ['generic', 'ref'];

function _lifeObjectValidateInput({ name, areaKey, kind, sourceRef }) {
  if (!name) return { valid: false, error: 'name wajib diisi' };
  if (!areaKey) return { valid: false, error: 'areaKey wajib diisi' };
  if (LIFE_OBJECT_KINDS.indexOf(kind) === -1) {
    return { valid: false, error: `kind "${kind}" tidak didukung (hanya 'generic'|'ref')` };
  }
  if (kind === 'ref') {
    const refCheck = typeof lifeOSObjectRefValidate === 'function'
      ? lifeOSObjectRefValidate(sourceRef)
      : { valid: false, error: 'lifeOSObjectRefValidate belum ter-load' };
    if (!refCheck.valid) return refCheck;
  }
  return { valid: true };
}

function lifeObjectServiceCreate({ name, areaKey, kind = 'generic', sourceRef = null } = {}) {
  const check = _lifeObjectValidateInput({ name, areaKey, kind, sourceRef });
  if (!check.valid) return Promise.resolve(check);

  const store = lifeOSGetStore();
  const object = {
    id: uid(),
    name,
    areaKey,
    kind,
    sourceRef: kind === 'ref' ? sourceRef : null,
    createdAt: new Date().toISOString(),
  };
  store.objects.push(object);
  return lifeOSSave().then(() => ({ valid: true, object }));
}

function lifeObjectServiceUpdate(id, { name, areaKey, kind, sourceRef } = {}) {
  const store = lifeOSGetStore();
  const obj = store.objects.find((x) => x.id === id);
  if (!obj) return Promise.resolve({ valid: false, error: `Life Object "${id}" tidak ditemukan` });

  const nextName = name !== undefined ? name : obj.name;
  const nextAreaKey = areaKey !== undefined ? areaKey : obj.areaKey;
  const nextKind = kind !== undefined ? kind : obj.kind;
  const nextSourceRef = sourceRef !== undefined ? sourceRef : obj.sourceRef;

  const check = _lifeObjectValidateInput({ name: nextName, areaKey: nextAreaKey, kind: nextKind, sourceRef: nextSourceRef });
  if (!check.valid) return Promise.resolve(check);

  obj.name = nextName;
  obj.areaKey = nextAreaKey;
  obj.kind = nextKind;
  obj.sourceRef = nextKind === 'ref' ? nextSourceRef : null;
  return lifeOSSave().then(() => ({ valid: true, object: obj }));
}

function lifeObjectServiceDelete(id) {
  const store = lifeOSGetStore();
  store.objects = store.objects.filter((x) => x.id !== id);
  return lifeOSSave();
}

function lifeObjectServiceGet(id) {
  const store = lifeOSGetStore();
  return store.objects.find((x) => x.id === id) || null;
}

function lifeObjectServiceList() {
  const store = lifeOSGetStore();
  return store.objects.slice();
}
