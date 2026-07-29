// ui/plugins.js — Plugin UI, LifeOS Plugin System (Sesi 66, Batch 5,
// lanjutan Plugin System MVP Sesi 65 — Registry/Manifest/Loader/
// Validation). Scope MVP UI: list + empty state + register (manual, via
// showPromptModal() berantai + showChoiceModal() areaKey opsional) +
// unregister (askConfirm()). Pola sama persis dgn `life-objects.js` Fase 1
// (panel ke-N Life OS, card list, tombol aksi via data-action).
//
// PENTING beda dari Life Object: LifeOSPluginRegistry MURNI in-memory
// (bukan LifeOSStore/D — lihat catatan lifeos-plugin-registry.js), jadi di
// sini TIDAK ADA lifeOSSave()/LifeOSHome.render() setelah register/
// unregister (tidak ada data App inti yang berubah) — render() panel ini
// sendiri cukup.
//
// TIDAK ADA di sini (sesuai scope MVP UI, sama seperti Sesi 65): Plugin
// Marketplace (sumber plugin dari luar), Plugin Runtime (menjalankan kode
// plugin), edit manifest setelah register (unregister + register ulang
// kalau perlu ganti — pola sama Life Object sourceRef/kind yang juga tidak
// diedit).

const LifeOSPlugins = {
  render() {
    const el = document.getElementById('lifeOSPluginsGrid');
    if (!el) return;
    const plugins = LifeOSPluginRegistry.list();
    el.innerHTML = plugins.length
      ? plugins.map((p) => `
        <div class="lifeos-project-card">
          <div class="lifeos-project-name">🔌 ${escapeHtml(p.name || '')}</div>
          <div class="lifeos-project-meta">${escapeHtml(p.id || '')} · v${escapeHtml(p.version || '')}${p.areaKey ? ' · ' + escapeHtml(p.areaKey) : ''}</div>
          <button class="btn btn-ghost" data-action="LifeOSPlugins.remove" data-args='["${p.id}"]' title="Unregister">🗑️</button>
        </div>
      `).join('')
      : '<div class="empty"><div class="empty-text">Belum ada plugin terdaftar</div></div>';
  },

  register(id, name, version, areaKey) {
    const manifest = lifeOSPluginCreateManifest({ id, name, version, areaKey: areaKey || null });
    const result = LifeOSPluginRegistry.register(manifest);
    if (!result.valid) {
      if (typeof toast === 'function') toast('⚠️ ' + result.error);
      return result;
    }
    LifeOSPlugins.render();
    return result;
  },

  /** Alur register manual — showPromptModal() berantai (id lalu nama lalu
   * versi), lalu showChoiceModal() areaKey OPSIONAL dari LIFEOS_AREAS
   * (pilihan pertama "Tidak ada" -> areaKey null). Batal di tahap manapun
   * -> berhenti diam-diam, TIDAK register apa pun (pola sama
   * promptCreateGeneric() di life-objects.js). */
  async promptRegister() {
    if (typeof showPromptModal !== 'function') return;
    const id = await showPromptModal({ title: 'Daftarkan Plugin', message: 'ID Plugin (unik)', placeholder: 'mis. plugin-cuaca' });
    if (!id) return;
    const name = await showPromptModal({ title: 'Daftarkan Plugin', message: 'Nama Plugin', placeholder: 'Nama...' });
    if (!name) return;
    const version = await showPromptModal({ title: 'Daftarkan Plugin', message: 'Versi (format x.y.z)', placeholder: '1.0.0', defaultValue: '1.0.0' });
    if (!version) return;

    if (typeof showChoiceModal !== 'function') return;
    const areas = typeof LIFEOS_AREAS !== 'undefined' ? LIFEOS_AREAS : [];
    const choiceIdx = await showChoiceModal({
      title: 'Pilih Area (opsional)',
      message: 'Plugin ini terkait area mana?',
      choices: [{ label: 'Tidak ada' }, ...areas.map((a) => ({ label: `${a.icon || ''} ${a.label}`.trim() }))],
    });
    if (choiceIdx === null || choiceIdx === undefined) return;
    const areaKey = choiceIdx === 0 ? null : (areas[choiceIdx - 1] ? areas[choiceIdx - 1].key : null);

    LifeOSPlugins.register(id, name, version, areaKey);
  },

  async remove(id) {
    if (typeof askConfirm !== 'function') return;
    const ok = await askConfirm('Batalkan pendaftaran plugin ini?', { title: 'Unregister Plugin', icon: '🗑️' });
    if (!ok) return;
    LifeOSPluginRegistry.unregister(id);
    LifeOSPlugins.render();
  },
};
