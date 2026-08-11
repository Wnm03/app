// services/review-service.js — SATU-SATUNYA tempat menulis
// LifeOSStore.reviewLog. Boleh MEMBACA D.wealthSnapshots/
// D.lifeBalanceSnapshots (lewat adapters/review-adapter.js) untuk
// menyimpan referensi id-nya, tapi tidak pernah menulis ke D.

function reviewServiceStartSession(period, periodKey) {
  const store = lifeOSGetStore();
  const session = {
    id: uid(), period, periodKey, completedAt: null,
    snapshotRefs: { wealthSnapshotId: null, lifeBalanceSnapshotId: null },
    notes: '', actionItems: [],
  };
  store.reviewLog.push(session);
  return lifeOSSave().then(() => session);
}

function reviewServiceComplete(sessionId, { notes = '', snapshotRefs = {} } = {}) {
  const store = lifeOSGetStore();
  const s = store.reviewLog.find((x) => x.id === sessionId);
  if (!s) return Promise.resolve(null);
  s.completedAt = new Date().toISOString();
  s.notes = notes;
  s.snapshotRefs = { ...s.snapshotRefs, ...snapshotRefs };
  return lifeOSSave().then(() => s);
}

function reviewServiceAddActionItem(sessionId, text) {
  const store = lifeOSGetStore();
  const s = store.reviewLog.find((x) => x.id === sessionId);
  if (!s) return Promise.resolve(null);
  s.actionItems.push({ id: uid(), text, done: false });
  return lifeOSSave().then(() => s);
}
