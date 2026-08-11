// lifeos-plugin-registry.js — Plugin Registry, LifeOS Plugin System MVP
// (Sesi 65, Batch 5). SATU-SATUNYA tempat menyimpan plugin yang berhasil
// terdaftar (in-memory, `_plugins` map by id) — pola sama dgn EIERegistry
// (economic-intelligence/eie-registry.js, "arsitektur yang sudah ada" yang
// dipakai ulang sesi ini): object tunggal + `register()`/getter, TANPA
// side-effect ke `D`/`LifeOSStore` (LifeOS Plugin System TIDAK menyentuh
// data app inti — beda total dari `LifeOSStore.objects` dkk).
//
// register() SELALU validasi via lifeOSPluginValidateManifest() dulu
// (lifeos-plugin-validation.js) — manifest tidak valid TIDAK PERNAH masuk
// registry. id duplikat DITOLAK eksplisit (bukan overwrite diam-diam) —
// pemanggil yang mau update harus unregister() dulu.
//
// TIDAK ADA di sini (sesuai scope MVP eksplisit sesi ini): eksekusi kode
// plugin apa pun (Plugin Runtime), UI, Marketplace — registry ini murni
// bookkeeping metadata manifest.

const LifeOSPluginRegistry = {
  _plugins: {},

  register(manifest) {
    const check = lifeOSPluginValidateManifest(manifest);
    if (!check.valid) return check;

    if (this._plugins[manifest.id]) {
      return { valid: false, error: `Plugin "${manifest.id}" sudah terdaftar` };
    }

    this._plugins[manifest.id] = manifest;
    return { valid: true, plugin: manifest };
  },

  unregister(id) {
    if (!this._plugins[id]) return false;
    delete this._plugins[id];
    return true;
  },

  get(id) {
    return this._plugins[id] || null;
  },

  list() {
    return Object.values(this._plugins);
  },

  has(id) {
    return !!this._plugins[id];
  },
};
