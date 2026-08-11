// lifeos-plugin-validation.js — Plugin Validation, LifeOS Plugin System MVP
// (Sesi 65, Batch 4). Validasi MURNI bentuk manifest (tidak menulis apa
// pun, tidak menyentuh registry) — dipakai oleh LifeOSPluginRegistry.
// register() SEBELUM plugin apa pun terdaftar. Pola kontrak sama dgn
// lifeOSObjectRefValidate() (lifeos-object-ref.js): balik
// {valid:true} | {valid:false, error}, TIDAK PERNAH throw.
//
// areaKey (opsional) divalidasi terhadap LIFEOS_AREAS yang SUDAH ADA
// (lifeos-registry.js) — REUSE penuh, 0 taksonomi/registry baru dibuat di
// sini. Kalau LIFEOS_AREAS belum ter-load (guard typeof, sama pola dgn
// LIFEOS_OBJECT_REF_SOURCES.goal.resolver), areaKey manapun ditolak aman
// (tidak throw) drpd diterima diam-diam.
//
// Sesi 69 (Plugin Runtime MVP): tambah validasi `capabilities` (opsional,
// array string) — tiap elemen WAJIB ada di `LIFEOS_PLUGIN_CAPABILITIES`
// (lifeos-plugin-manifest.js). Dipakai `LifeOSPluginRuntime.enable()`
// supaya plugin dgn capability tidak dikenal ditolak sebelum diaktifkan.

function lifeOSPluginValidateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { valid: false, error: 'manifest wajib berupa object' };
  }

  for (const field of LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS) {
    if (!manifest[field] || typeof manifest[field] !== 'string') {
      return { valid: false, error: `manifest.${field} wajib diisi (string)` };
    }
  }

  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    return { valid: false, error: 'manifest.version wajib format semver "x.y.z" (mis. "1.0.0")' };
  }

  if (manifest.areaKey !== undefined && manifest.areaKey !== null) {
    const areas = typeof LIFEOS_AREAS !== 'undefined' ? LIFEOS_AREAS : [];
    const found = areas.some((a) => a.key === manifest.areaKey);
    if (!found) {
      return { valid: false, error: `manifest.areaKey "${manifest.areaKey}" tidak terdaftar di LIFEOS_AREAS` };
    }
  }

  if (manifest.capabilities !== undefined && manifest.capabilities !== null) {
    if (!Array.isArray(manifest.capabilities)) {
      return { valid: false, error: 'manifest.capabilities wajib berupa array' };
    }
    for (const cap of manifest.capabilities) {
      if (typeof cap !== 'string' || !LIFEOS_PLUGIN_CAPABILITIES.includes(cap)) {
        return { valid: false, error: `manifest.capabilities berisi capability tidak dikenal: "${cap}"` };
      }
    }
  }

  return { valid: true };
}
