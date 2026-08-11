// services/knowledge-service.js — SATU-SATUNYA tempat menulis
// LifeOSStore.knowledge. Tidak pernah menulis ke D.catatan — kalau butuh
// baca catatan lama, pakai adapters/knowledge-adapter.js
// (knowledgeAdapterCatatanRef).

function knowledgeServiceSave({ sourceKind, title, content, tags = [], relatedRefs = [] }) {
  const store = lifeOSGetStore();
  const entry = {
    id: uid(), createdAt: new Date().toISOString(),
    sourceKind, title, content, tags, relatedRefs,
  };
  store.knowledge.push(entry);
  return lifeOSSave().then(() => entry);
}

function knowledgeServiceUpdateTags(entryId, tags) {
  const store = lifeOSGetStore();
  const k = store.knowledge.find((x) => x.id === entryId);
  if (!k) return Promise.resolve(null);
  k.tags = tags;
  return lifeOSSave().then(() => k);
}

function knowledgeServiceDelete(entryId) {
  const store = lifeOSGetStore();
  store.knowledge = store.knowledge.filter((x) => x.id !== entryId);
  return lifeOSSave();
}
