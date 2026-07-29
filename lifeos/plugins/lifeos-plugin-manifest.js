// lifeos-plugin-manifest.js — Plugin Manifest, LifeOS Plugin System MVP
// (Sesi 65, Batch 5). Scope MVP sesi ini SENGAJA sempit: manifest MURNI
// METADATA (id/name/version/areaKey/description) — TIDAK ada `entry`/kode
// eksekusi apa pun. Plugin Runtime (menjalankan kode plugin) & Plugin UI/
// Marketplace SENGAJA di luar scope (keputusan eksplisit user, 1 sesi =
// 1 milestone) — menyusul di sesi lanjutan kalau ada keputusan produk.
//
// `areaKey` opsional TAPI kalau diisi WAJIB salah satu `LIFEOS_AREAS.key`
// (`lifeos-registry.js`, REUSE apa adanya — 0 registry/taksonomi baru).
//
// Sesi 69 (Plugin Runtime MVP): tambah `capabilities` opsional (array
// string) — deklarasi "izin" murni bookkeeping yang divalidasi terhadap
// `LIFEOS_PLUGIN_CAPABILITIES` (di bawah). Plugin Runtime (lihat
// `lifeos-plugin-runtime.js`) TIDAK mengeksekusi kode plugin apa pun,
// jadi capability di sini TIDAK men-gate akses nyata — murni deklarasi
// yang divalidasi bentuknya, dipakai Runtime buat cegah `enable()`
// plugin yang deklarasi capability-nya tidak dikenal. Manifest TETAP
// tanpa `entry`/kode eksekusi (keputusan Sesi 65 tidak berubah).

const LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS = ['id', 'name', 'version'];
const LIFEOS_PLUGIN_MANIFEST_OPTIONAL_FIELDS = ['areaKey', 'description', 'capabilities'];

// Daftar capability yang dikenal Plugin Runtime MVP (Sesi 69). Generik,
// TIDAK terikat domain LIFEOS_AREAS tertentu — merefleksikan jenis
// interaksi plugin dgn LifeOS (baca data read-only, render panel UI,
// kirim notifikasi), bukan sumber data spesifik.
const LIFEOS_PLUGIN_CAPABILITIES = ['read-data', 'ui-panel', 'notify'];

// Factory murni (tidak menulis ke registry/store) — sekadar bentuk objek
// manifest yang konsisten, dipakai pemanggil sebelum diserahkan ke
// lifeOSPluginValidateManifest()/LifeOSPluginRegistry.register().
function lifeOSPluginCreateManifest({ id, name, version, areaKey = null, description = '', capabilities = [] } = {}) {
  return { id, name, version, areaKey, description, capabilities: Array.isArray(capabilities) ? capabilities.slice() : [] };
}
