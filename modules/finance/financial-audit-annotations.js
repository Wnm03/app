// Financial Audit annotations & action plans.
// Data terpisah dari D.transactions; semua mutasi hanya ke D.financeAuditAnnotations.
const FinancialAuditAnnotations = {
  _ensure() {
    if (typeof D === 'undefined') return [];
    if (!Array.isArray(D.financeAuditAnnotations)) D.financeAuditAnnotations = [];
    return D.financeAuditAnnotations;
  },

  settings() {
    if (typeof D === 'undefined') return { smallLeakMaxAmount: 50000, smallLeakMinCount: 3, recurringMinOccurrences: 2, recurringTolerancePct: 0.05, expenseGroupMap: {} };
    if (!D.financeAuditSettings || typeof D.financeAuditSettings !== 'object') D.financeAuditSettings = {};
    return {
      smallLeakMaxAmount: Number.isFinite(Number(D.financeAuditSettings.smallLeakMaxAmount)) ? Math.max(0, Number(D.financeAuditSettings.smallLeakMaxAmount)) : 50000,
      smallLeakMinCount: Number.isFinite(Number(D.financeAuditSettings.smallLeakMinCount)) ? Math.max(1, Math.floor(Number(D.financeAuditSettings.smallLeakMinCount))) : 3,
      recurringMinOccurrences: Number.isFinite(Number(D.financeAuditSettings.recurringMinOccurrences)) ? Math.max(2, Math.floor(Number(D.financeAuditSettings.recurringMinOccurrences))) : 2,
      recurringTolerancePct: Number.isFinite(Number(D.financeAuditSettings.recurringTolerancePct)) ? Math.max(0, Number(D.financeAuditSettings.recurringTolerancePct)) : 0.05,
      expenseGroupMap: D.financeAuditSettings.expenseGroupMap && typeof D.financeAuditSettings.expenseGroupMap === 'object' ? { ...D.financeAuditSettings.expenseGroupMap } : {},
    };
  },

  updateSettings(patch) {
    if (typeof D === 'undefined') return { ok: false, reason: 'Data belum siap' };
    const current = this.settings();
    D.financeAuditSettings = { ...current, ...(patch || {}) };
    D.financeAuditSettings.smallLeakMaxAmount = Math.max(0, Number(D.financeAuditSettings.smallLeakMaxAmount) || 0);
    D.financeAuditSettings.smallLeakMinCount = Math.max(1, Math.floor(Number(D.financeAuditSettings.smallLeakMinCount) || 1));
    D.financeAuditSettings.recurringMinOccurrences = Math.max(2, Math.floor(Number(D.financeAuditSettings.recurringMinOccurrences) || 2));
    D.financeAuditSettings.recurringTolerancePct = Math.max(0, Number(D.financeAuditSettings.recurringTolerancePct) || 0);
    D.financeAuditSettings.expenseGroupMap = D.financeAuditSettings.expenseGroupMap && typeof D.financeAuditSettings.expenseGroupMap === 'object' ? { ...D.financeAuditSettings.expenseGroupMap } : {};
    this._save();
    return { ok: true, ...this.settings() };
  },

  setCategoryGroup(category, group) {
    if (typeof D === 'undefined') return { ok: false, reason: 'Data belum siap' };
    const key = String(category || '').trim();
    const allowed = ['Kebutuhan', 'Keinginan', 'Masa depan', 'Perlu ditinjau'];
    if (!key) return { ok: false, reason: 'Kategori wajib diisi' };
    if (!allowed.includes(group)) return { ok: false, reason: 'Kelompok tidak valid' };
    const current = this.settings();
    current.expenseGroupMap[key] = group;
    D.financeAuditSettings = { ...current, expenseGroupMap: current.expenseGroupMap };
    this._save();
    return { ok: true, category: key, group, settings: this.settings() };
  },

  list() {
    return this._ensure().slice();
  },

  forTransaction(transactionId) {
    const id = String(transactionId || '');
    if (!id) return null;
    const rows = this._ensure().filter((x) => String(x.transactionId || '') === id);
    return rows.length ? rows[rows.length - 1] : null;
  },

  upsertTransaction(transactionId, patch) {
    const id = String(transactionId || '').trim();
    if (!id) return { ok: false, reason: 'transactionId wajib diisi' };
    const rows = this._ensure();
    const now = new Date().toISOString();
    let row = rows.find((x) => String(x.transactionId || '') === id);
    if (!row) {
      row = { id: 'audit_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7), transactionId: id, createdAt: now };
      rows.push(row);
    }
    Object.assign(row, {
      reviewFlag: !!(patch && patch.reviewFlag),
      trigger: patch && patch.trigger ? String(patch.trigger) : '',
      note: patch && patch.note ? String(patch.note).slice(0, 1000) : '',
      updatedAt: now,
    });
    this._save();
    return { ok: true, ...row };
  },

  savePlan(action, payload) {
    const key = String(action || '').trim();
    if (!key) return { ok: false, reason: 'action wajib diisi' };
    const rows = this._ensure();
    const now = new Date().toISOString();
    let plan = rows.find((x) => x.type === 'plan' && x.active !== false);
    if (!plan) {
      plan = { id: 'audit_plan_' + Date.now().toString(36), type: 'plan', createdAt: now };
      rows.push(plan);
    }
    Object.assign(plan, {
      action: key,
      title: payload && payload.title ? String(payload.title) : key,
      target: payload && payload.target != null ? String(payload.target) : '',
      category: payload && payload.category ? String(payload.category) : '',
      note: payload && payload.note ? String(payload.note).slice(0, 1000) : '',
      active: true,
      updatedAt: now,
    });
    this._save();
    return { ok: true, ...plan };
  },

  activePlan() {
    return this._ensure().find((x) => x.type === 'plan' && x.active !== false) || null;
  },

  completePlan() {
    const plan = this.activePlan();
    if (!plan) return { ok: false, reason: 'Belum ada rencana aktif' };
    plan.active = false;
    plan.completedAt = new Date().toISOString();
    this._save();
    return { ok: true, ...plan };
  },

  _save() {
    if (typeof save === 'function') save({ domain: 'finance', financeMutation: false });
  },
};
