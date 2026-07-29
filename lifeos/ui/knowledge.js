// ui/knowledge.js — render lewat knowledge-adapter.js; aksi simpan/hapus
// HANYA lewat services/knowledge-service.js. D.catatan ditampilkan sebagai
// referensi read-only, tidak pernah dimigrasikan ke sini.

const LifeOSKnowledge = {
  render() {
    const el = document.getElementById('lifeOSKnowledgeList');
    if (!el) return;
    const store = lifeOSGetStore();
    const entries = knowledgeAdapterList(store);
    el.innerHTML = entries.length
      ? entries.map((k) => `
        <div class="lifeos-knowledge-card">
          <div class="lifeos-knowledge-title">${escapeHtml(k.title || '')}</div>
          <div class="lifeos-knowledge-tags">${(k.tags || []).map(escapeHtml).join(', ')}</div>
        </div>
      `).join('')
      : '<div class="empty"><div class="empty-text">Belum ada insight tersimpan</div></div>';
  },

  async saveInsight({ sourceKind, title, content, tags }) {
    await knowledgeServiceSave({ sourceKind, title, content, tags });
    LifeOSKnowledge.render();
  },
};

// BUG NYATA ditemukan saat audit (2026-07-13): sama seperti pola FinCoach
// (2026-07-10) & DashboardHub/DashboardHubSearch (Tahap 2), modul-modul UI
// Life OS ini TIDAK PERNAH ter-expose ke window -- dispatcher global
// data-action (yang lookup lewat window[p]) tidak akan pernah menemukan
// LifeOSHome.switchPanel / LifeOSProjects.open / LifeOSReview.startWeekly,
// dst, jadi tombol-tombol terkait diam/error saat diklik. Fix: expose semua
// modul UI Life OS di sini (file TERAKHIR yang dimuat di GROUP_A untuk
// rumpun lifeos/ui/*, jadi keenamnya sudah pasti ada saat baris ini jalan).
if (typeof window !== 'undefined') {
  window.LifeOSHome = LifeOSHome;
  window.LifeOSAreas = LifeOSAreas;
  window.LifeOSToday = LifeOSToday;
  window.LifeOSGoals = LifeOSGoals;
  window.LifeOSProjects = LifeOSProjects;
  window.LifeOSReview = LifeOSReview;
  window.LifeOSKnowledge = LifeOSKnowledge;
  window.LifeOSLifeObjects = typeof LifeOSLifeObjects !== 'undefined' ? LifeOSLifeObjects : undefined;
  window.LifeOSPlugins = typeof LifeOSPlugins !== 'undefined' ? LifeOSPlugins : undefined;
}
