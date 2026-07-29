// ui/projects.js — render lewat projectAdapterList(D, store); aksi tulis
// (create/toggle checklist/dsb) HANYA lewat services/project-service.js.

const LifeOSProjects = {
  render() {
    const el = document.getElementById('lifeOSProjectsGrid');
    if (!el) return;
    const store = lifeOSGetStore();
    const projects = projectAdapterList(D, store);
    el.innerHTML = projects.length
      ? projects.map((p) => `
        <div class="lifeos-project-card" data-action="LifeOSProjects.open" data-args='["${p.id}"]'>
          <div class="lifeos-project-name">${escapeHtml(p.name || '')}</div>
          <div class="lifeos-project-meta">${p.kind === 'renovasi' ? '🔧 Renovasi' : '📋 Project'} · ${p.checklistCount} item</div>
        </div>
      `).join('')
      : '<div class="empty"><div class="empty-text">Belum ada project</div></div>';
  },

  open(projectId) {
    const store = lifeOSGetStore();
    const p = projectAdapterFindOne(D, store, projectId);
    if (!p) return;
    // Tidak ada modal detail sendiri di Life OS (sengaja, lihat catatan
    // project-adapter.js) — langsung arahkan ke referensi aslinya lewat
    // lifeos-nav.js. kind:'renovasi' -> Renov.openDetail() (modal existing
    // renovasi.js). kind:'generic' -> belum ada referensi lama (project ini
    // lahir di Life OS sendiri), lifeOSNavigateToSource() akan kasih tahu
    // user lewat toast, bukan diam saja.
    if (typeof lifeOSNavigateToSource === 'function') {
      lifeOSNavigateToSource(p.kind, p.sourceRef ? p.sourceRef.id : null);
    }
  },

  async createGeneric(name, areaKey) {
    await projectServiceCreate({ name, areaKey });
    LifeOSProjects.render();
  },
};
