// lifeos-plugin-runtime.js — Plugin Runtime MVP, LifeOS Plugin System
// (Sesi 69, Batch 5, target eksplisit user: "Plugin Runtime" di atas
// Registry + Manifest + Loader yang sudah ada — TIDAK Marketplace, TIDAK
// Plugin UI baru). Layer BARU murni tambahan, TIDAK mengubah perilaku
// `LifeOSPluginRegistry`/`lifeOSPluginValidateManifest`/`lifeOSPluginLoad`
// yang sudah ada (Sesi 65/66) — Runtime cuma mengonsumsinya.
//
// PENTING — TETAP TIDAK ADA eksekusi kode plugin arbitrer (keputusan
// arsitektur Sesi 65 tidak berubah): manifest tidak punya `entry`, dan
// Runtime ini TIDAK men-`eval`/`import()` apa pun. "Runtime" di sini
// berarti *state machine lifecycle* (loaded → enabled ⇄ disabled →
// unloaded) + gerbang capability, BUKAN sandbox eksekusi kode. Hook
// opsional (`onEnable`/`onDisable`, lihat `load()`) sengaja hanya
// callback JS yang pemanggil sendiri yang sediakan di sesi runtime yang
// sama (mis. dari kode app, bukan dari isi manifest/file plugin) — jadi
// tidak ada "kode plugin dari luar" yang dijalankan di sini.
//
// State machine per plugin id:
//   loaded → enabled  (enable())
//   enabled → disabled (disable())
//   disabled → enabled (enable() lagi)
//   loaded|enabled|disabled|error → unloaded (unload(), state akhir permanen)
// Transisi di luar itu (mis. enable() saat sudah 'unloaded', disable() saat
// 'loaded') DITOLAK eksplisit ({ok:false, error}), bukan silent no-op.
//
// Capability validation: `enable()` menolak plugin yang manifest-nya
// mengandung capability di luar `LIFEOS_PLUGIN_CAPABILITIES` (harusnya
// sudah tertolak dari `register()`/`lifeOSPluginValidateManifest()` —
// pengecekan di sini lapisan kedua/defense-in-depth, jaga-jaga manifest
// masuk lewat jalur lain).
//
// Error isolation: hook `onEnable`/`onDisable` (kalau ada) dibungkus
// try/catch. Hook yang throw TIDAK PERNAH merambat ke pemanggil
// `enable()`/`disable()` dan TIDAK PERNAH menjatuhkan plugin lain — state
// plugin yang error ditandai 'error' + `lastError` disimpan, plugin lain
// di runtime registry tidak terpengaruh sama sekali (pola: satu plugin
// gagal, sisanya tetap jalan — sama semangat dgn `lifeOSPluginLoad()`
// yang satu manifest gagal tidak menghentikan batch).

const LIFEOS_PLUGIN_RUNTIME_STATES = ['loaded', 'enabled', 'disabled', 'unloaded', 'error'];

const LifeOSPluginRuntime = {
  // _runtime[id] = { state, manifest, hooks: {onEnable, onDisable}, lastError }
  _runtime: {},

  // Lifecycle: load — daftarkan manifest ke LifeOSPluginRegistry (reuse
  // penuh, 0 duplikasi validasi) lalu buat entri runtime state='loaded'.
  // `hooks` opsional ({onEnable, onDisable}), disimpan di memori runtime
  // SAJA (tidak pernah masuk manifest/registry).
  load(manifest, hooks = {}) {
    const result = LifeOSPluginRegistry.register(manifest);
    if (!result.valid) return result;

    const id = result.plugin.id;
    this._runtime[id] = {
      state: 'loaded',
      manifest: result.plugin,
      hooks: {
        onEnable: typeof hooks.onEnable === 'function' ? hooks.onEnable : null,
        onDisable: typeof hooks.onDisable === 'function' ? hooks.onDisable : null,
      },
      lastError: null,
    };
    return { valid: true, plugin: result.plugin };
  },

  // Lifecycle: enable — capability validation dulu (defense-in-depth),
  // lalu transisi state, lalu panggil onEnable() (kalau ada) dgn error
  // isolation. Boleh dipanggil dari 'loaded' ATAU 'disabled' (re-enable).
  enable(id) {
    const entry = this._runtime[id];
    if (!entry) return { ok: false, error: `Plugin "${id}" belum di-load ke runtime` };
    if (entry.state !== 'loaded' && entry.state !== 'disabled') {
      return { ok: false, error: `Plugin "${id}" tidak bisa enable() dari state "${entry.state}"` };
    }

    const capCheck = this._checkCapabilities(entry.manifest);
    if (!capCheck.ok) return capCheck;

    const hookResult = this._runHookIsolated(entry, 'onEnable');
    if (!hookResult.ok) return hookResult;

    entry.state = 'enabled';
    return { ok: true, state: 'enabled' };
  },

  // Lifecycle: disable — hanya dari 'enabled'. onDisable() (kalau ada)
  // dgn error isolation yang sama.
  disable(id) {
    const entry = this._runtime[id];
    if (!entry) return { ok: false, error: `Plugin "${id}" belum di-load ke runtime` };
    if (entry.state !== 'enabled') {
      return { ok: false, error: `Plugin "${id}" tidak bisa disable() dari state "${entry.state}"` };
    }

    const hookResult = this._runHookIsolated(entry, 'onDisable');
    if (!hookResult.ok) return hookResult;

    entry.state = 'disabled';
    return { ok: true, state: 'disabled' };
  },

  // Lifecycle: unload — state akhir permanen, dari state manapun (termasuk
  // 'error'). Unregister dari LifeOSPluginRegistry (reuse) + hapus entri
  // runtime sepenuhnya (bukan cuma tandai 'unloaded').
  unload(id) {
    const entry = this._runtime[id];
    if (!entry) return { ok: false, error: `Plugin "${id}" belum di-load ke runtime` };

    LifeOSPluginRegistry.unregister(id);
    delete this._runtime[id];
    return { ok: true, state: 'unloaded' };
  },

  getState(id) {
    const entry = this._runtime[id];
    return entry ? entry.state : null;
  },

  isEnabled(id) {
    const entry = this._runtime[id];
    return !!entry && entry.state === 'enabled';
  },

  lastError(id) {
    const entry = this._runtime[id];
    return entry ? entry.lastError : null;
  },

  list() {
    return Object.keys(this._runtime).map((id) => ({
      id,
      state: this._runtime[id].state,
      manifest: this._runtime[id].manifest,
    }));
  },

  // Internal — defense-in-depth capability check (lihat catatan header).
  _checkCapabilities(manifest) {
    const caps = (manifest && manifest.capabilities) || [];
    for (const cap of caps) {
      if (!LIFEOS_PLUGIN_CAPABILITIES.includes(cap)) {
        return { ok: false, error: `Plugin "${manifest.id}" punya capability tidak dikenal: "${cap}"` };
      }
    }
    return { ok: true };
  },

  // Internal — jalankan hook (onEnable/onDisable) dgn error isolation.
  // Hook yang throw/tidak ada TIDAK PERNAH merambat: kalau throw, state
  // ditandai 'error' + lastError disimpan, dan hasil balik {ok:false}
  // supaya pemanggil enable()/disable() tahu transisi dibatalkan — tapi
  // exception itu sendiri TIDAK PERNAH lolos ke luar fungsi ini.
  _runHookIsolated(entry, hookName) {
    const hook = entry.hooks && entry.hooks[hookName];
    if (!hook) return { ok: true };

    try {
      hook(entry.manifest);
      return { ok: true };
    } catch (err) {
      entry.state = 'error';
      entry.lastError = err && err.message ? err.message : String(err);
      return { ok: false, error: `Hook "${hookName}" plugin "${entry.manifest.id}" gagal: ${entry.lastError}` };
    }
  },
};
