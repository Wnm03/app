// services/project-service.js — SATU-SATUNYA tempat menulis
// LifeOSStore.projects (generic project). Tidak pernah menulis ke
// D.renovProjects atau array D.* lain — kalau butuh baca renovasi, pakai
// adapters/project-adapter.js. Setiap fungsi di sini memanggil
// lifeOSSave() di akhir (dari lifeos-store.js).

function projectServiceCreate({ name, areaKey, dueDate = null }) {
  const store = lifeOSGetStore();
  const project = {
    id: uid(), name, areaKey, kind: 'generic', sourceRef: null,
    status: 'active', dueDate, checklist: [], goalIds: [],
    createdAt: new Date().toISOString(),
  };
  store.projects.push(project);
  return lifeOSSave().then(() => project);
}

function projectServiceAddChecklistItem(projectId, text) {
  const store = lifeOSGetStore();
  const p = store.projects.find((x) => x.id === projectId);
  if (!p) return Promise.resolve(null);
  p.checklist.push({ id: uid(), text, done: false });
  return lifeOSSave().then(() => p);
}

function projectServiceToggleChecklistItem(projectId, itemId) {
  const store = lifeOSGetStore();
  const p = store.projects.find((x) => x.id === projectId);
  const item = p && p.checklist.find((c) => c.id === itemId);
  if (!item) return Promise.resolve(null);
  item.done = !item.done;
  return lifeOSSave().then(() => item);
}

function projectServiceSetStatus(projectId, status) {
  const store = lifeOSGetStore();
  const p = store.projects.find((x) => x.id === projectId);
  if (!p) return Promise.resolve(null);
  p.status = status; // 'active' | 'done' | 'paused'
  return lifeOSSave().then(() => p);
}

function projectServiceDelete(projectId) {
  const store = lifeOSGetStore();
  store.projects = store.projects.filter((x) => x.id !== projectId);
  return lifeOSSave();
}
