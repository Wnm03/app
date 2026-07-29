// lifeos-plugin-loader.js — Plugin Loader, LifeOS Plugin System MVP
// (Sesi 65, Batch 5). Loader MURNI batch-register: terima array manifest,
// panggil LifeOSPluginRegistry.register() satu-satu, dan kumpulkan hasil
// —TIDAK menjalankan/mengeksekusi kode plugin apa pun (Plugin Runtime di
// luar scope sesi ini, keputusan eksplisit user). "Loader" di sini berarti
// "memuat manifest ke registry", bukan "menjalankan plugin".
//
// Satu manifest gagal (invalid/duplikat id) TIDAK menghentikan proses
// batch — sisanya tetap diproses, hasil gagal dikumpulkan di `rejected`
// (pola sama dgn error-per-item, bukan fail-fast) supaya pemanggil bisa
// lapor semua masalah sekaligus.

function lifeOSPluginLoad(manifests) {
  const loaded = [];
  const rejected = [];

  for (const manifest of manifests || []) {
    const result = LifeOSPluginRegistry.register(manifest);
    if (result.valid) {
      loaded.push(result.plugin.id);
    } else {
      rejected.push({ id: manifest && manifest.id, error: result.error });
    }
  }

  return { loaded, rejected };
}
