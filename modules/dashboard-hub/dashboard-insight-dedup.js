// modules/dashboard-hub/dashboard-insight-dedup.js
// Presentation-only consolidation + role-based dashboard visibility.
// Principle: one insight has one canonical home; each dashboard shows only
// information that belongs to its domain. No engine/API/transaction mutation.
const DashboardInsightDedup = {
  WRAPPERS: [
    ['crossBriefWrap', 10], ['crossInsightWrap', 20], ['personalOverviewWrap', 30],
    ['crossWidgetsWrap', 40], ['lifePriorityWrap', 50],
    ['recommendationPanelWrap', 60], ['actionQueueWrap', 70],
  ],
  MIRRORS: [
    ['aiUnifiedBriefBody', 'crossBriefBody', 'mirror-cross-brief'],
    ['aiRecommendBody', 'recommendationPanelBody', 'mirror-recommendation-panel'],
    ['aiActionQueueBody', 'actionQueueBody', 'mirror-action-queue'],
  ],
  // Domain ownership. IDs not listed here are intentionally untouched.
  ROLE_RULES: {
    'dashboard-hub': {
      keep: ['dashHubWrap','dashboardHubWrap','dashboardHubHeroCard','dashHubHeroCard','dashHubMainGridCard','dashHubFavoritSection','dashHubOwnershipSummaryCard','personalOverviewWrap','crossBriefWrap','lifeBalanceCard','lifeOSWrap','lifeOSReviewPanel'],
      hide: ['findashWrap','financialHealthScoreWrap','financialRiskDashboardWrap','cashflowProjWrap','forecastWrap','debtOptimizerWrap','financialGoalWrap','retirementPlannerWrap','keuanganInsightCard','budgetRecoWrap','vehdashWrap','vehAnalyticsWrap','vehAttentionWrap','vehAutomationWrap','vehBriefWrap','vehinsightWrap','fuelDashWrap','fuelIntelWrap','fuelTrendWrap','fuelCompareWrap','shopBusinessEngineWrap','shopInsightCard','shopMiniSummaryWrap','shopBizEngineCard','businessFlowWrap','danaKelolaanWrap','eieWrap','eieStatusCard','eieWatchlistCard','pajakInsightCard','pajakRekomendasiCard']
    },
    dashboard: {
      keep: ['advisorCard','lifeBalanceCard','lifeOSWrap','lifeOSReviewPanel','crossBriefWrap','personalOverviewWrap','recommendationPanelWrap','actionQueueWrap','aiWidgetReport'],
      hide: ['findashWrap','financialHealthScoreWrap','vehdashWrap','vehAnalyticsWrap','shopBusinessEngineWrap','danaKelolaanWrap','eieWrap']
    },
    keuangan: {
      keep: ['findashWrap','financialHealthScoreWrap','financialRiskDashboardWrap','cashflowProjWrap','forecastWrap','debtOptimizerWrap','financialGoalWrap','retirementPlannerWrap','keuanganInsightCard','budgetRecoWrap','keuAbsensiGajiCard','sGajiBulananWrap','sGajiHarianWrap','sGajiMingguanWrap','financialAuditWrap','financialAuditPanelWrap'],
      hide: ['crossDashWrap','crossBriefWrap','crossInsightWrap','crossWidgetsWrap','personalOverviewWrap','lifePriorityWrap','recommendationPanelWrap','actionQueueWrap','advisorCard','vehdashWrap','vehAnalyticsWrap','vehAttentionWrap','vehAutomationWrap','vehBriefWrap','vehinsightWrap','fuelDashWrap','fuelIntelWrap','fuelTrendWrap','fuelCompareWrap','shopBusinessEngineWrap','shopInsightCard','shopMiniSummaryWrap','shopBizEngineCard','businessFlowWrap','danaKelolaanWrap','eieWrap','pajakInsightCard','pajakRekomendasiCard']
    },
    carnotes: {
      keep: ['vehdashWrap','vehAnalyticsWrap','vehAttentionWrap','vehAutomationWrap','vehBriefWrap','vehSpecCard','vehinsightWrap','fuelDashWrap','fuelIntelWrap','fuelTrendWrap','fuelCompareWrap','fuelPriceRefSummaryCard','bbmTrendCard','servisReminderCard','tripPresenterWrap','tripPresenterCard'],
      hide: ['crossDashWrap','crossBriefWrap','crossInsightWrap','crossWidgetsWrap','personalOverviewWrap','lifePriorityWrap','recommendationPanelWrap','actionQueueWrap','advisorCard','findashWrap','financialHealthScoreWrap','cashflowProjWrap','forecastWrap','debtOptimizerWrap','financialGoalWrap','retirementPlannerWrap','keuanganInsightCard','budgetRecoWrap','shopBusinessEngineWrap','shopInsightCard','shopMiniSummaryWrap','shopBizEngineCard','businessFlowWrap','danaKelolaanWrap','eieWrap','pajakInsightCard','pajakRekomendasiCard']
    },
    shop: {
      keep: ['shopBusinessEngineWrap','shopInsightCard','shopMiniSummaryWrap','shopBizEngineCard','businessFlowWrap','businessFlowCard','kasirAiCard','kasirCheckoutSection','stockRekoWidgetCard','priceRekoWidgetCard','shopModalStokCard'],
      hide: ['crossDashWrap','crossBriefWrap','crossInsightWrap','crossWidgetsWrap','personalOverviewWrap','lifePriorityWrap','recommendationPanelWrap','actionQueueWrap','advisorCard','findashWrap','financialHealthScoreWrap','cashflowProjWrap','forecastWrap','debtOptimizerWrap','financialGoalWrap','retirementPlannerWrap','keuanganInsightCard','budgetRecoWrap','vehdashWrap','vehAnalyticsWrap','vehAttentionWrap','vehAutomationWrap','vehBriefWrap','vehinsightWrap','fuelDashWrap','fuelIntelWrap','fuelTrendWrap','fuelCompareWrap','danaKelolaanWrap','eieWrap','pajakInsightCard','pajakRekomendasiCard']
    },
    aset: {
      keep: ['assetInsightCard','assetMaintenanceWrap','assetPortfolioWrap','asetKeluargaCard','laporanAsetCard','propertyManagementWrap','rentalManagementWrap','investPlannerWrap','investPlannerWrap','penyusutanAiWidget','ghostAssetCleanupCard','danaKelolaanWrap'],
      hide: ['crossDashWrap','crossBriefWrap','crossInsightWrap','crossWidgetsWrap','personalOverviewWrap','lifePriorityWrap','recommendationPanelWrap','actionQueueWrap','advisorCard','findashWrap','financialHealthScoreWrap','vehdashWrap','vehAnalyticsWrap','shopBusinessEngineWrap','shopInsightCard','eieWrap','pajakInsightCard','pajakRekomendasiCard']
    },
    pajak: {
      keep: ['pajakInsightCard','pajakRekomendasiCard'],
      hide: ['crossDashWrap','crossBriefWrap','crossInsightWrap','crossWidgetsWrap','personalOverviewWrap','lifePriorityWrap','recommendationPanelWrap','actionQueueWrap','advisorCard','findashWrap','financialHealthScoreWrap','vehdashWrap','vehAnalyticsWrap','shopBusinessEngineWrap','shopInsightCard','danaKelolaanWrap','eieWrap']
    }
  },
  SIMILARITY_THRESHOLD: 0.94,
  _observer: null,
  _timer: null,
  _norm(text) {
    return String(text || '').replace(/\s+/g, ' ')
      .replace(/Ringkasan harian finance & vehicle/ig, '')
      .replace(/finance & vehicle insight/ig, '')
      .replace(/ringkasan hidup pribadi/ig, '')
      .replace(/prioritas hidup pribadi/ig, '')
      .replace(/rekomendasi utk anda/ig, '')
      .replace(/antrean tindakan/ig, '')
      .replace(/insight cepat/ig, '')
      .replace(/laporan ai/ig, '')
      .replace(/^[\s:–—-]+|[\s:–—-]+$/g, '')
      .trim().toLowerCase();
  },
  _tokens(text) {
    const stop = new Set(['dan','yang','untuk','dari','ini','itu','anda','kamu','hari','dengan','pada','ke','di','atau','akan','agar']);
    return new Set(this._norm(text).split(/[^a-z0-9À-ÿ]+/i).filter(x => x.length > 2 && !stop.has(x)));
  },
  _similarity(a, b) {
    const na = this._norm(a), nb = this._norm(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const A = this._tokens(na), B = this._tokens(nb);
    if (!A.size || !B.size) return 0;
    let intersection = 0;
    A.forEach(t => { if (B.has(t)) intersection++; });
    return intersection / (A.size + B.size - intersection);
  },
  _body(id) {
    if (typeof document === 'undefined') return null;
    const el = document.getElementById(id);
    if (!el) return null;
    return el.querySelector('.card-collapse-body') || el;
  },
  _bodyText(id) {
    const el = this._body(id);
    return el ? this._norm(el.textContent) : '';
  },
  _setHidden(el, reason) {
    if (!el) return;
    el.dataset.dashboardDedupHidden = '1';
    el.dataset.dashboardDedupReason = reason || 'duplicate';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  },
  _setInnerHidden(id, reason) {
    if (typeof document === 'undefined') return false;
    const el = document.getElementById(id);
    if (!el || !this._norm(el.textContent)) return false;
    this._setHidden(el, reason);
    return true;
  },
  _activeRole() {
    if (typeof document === 'undefined') return null;
    const active = document.querySelector('.page.active[id^="page-"]');
    if (!active) return null;
    const id = active.id.replace(/^page-/, '');
    if (id === 'dashboard-hub') return 'dashboard-hub';
    if (this.ROLE_RULES[id]) return id;
    return null;
  },
  restoreRoleVisibility() {
    if (typeof document === 'undefined') return [];
    const role = this._activeRole();
    const rule = role ? this.ROLE_RULES[role] : null;
    const hiddenIds = new Set((rule && rule.hide) || []);
    const restored = [];
    document.querySelectorAll('[data-dashboard-role-hidden="1"]').forEach((el) => {
      if (!hiddenIds.has(el.id)) {
        el.hidden = false;
        el.removeAttribute('aria-hidden');
        delete el.dataset.dashboardRoleHidden;
        restored.push(el.id || 'role-hidden');
      }
    });
    return restored;
  },
  applyRoleVisibility() {
    if (typeof document === 'undefined') return [];
    const role = this._activeRole();
    if (!role) return [];
    const rule = this.ROLE_RULES[role];
    const hidden = [];
    this.restoreRoleVisibility();
    (rule.hide || []).forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.dashboardRoleHidden) {
        this._setHidden(el, `out-of-scope:${role}`);
        el.dataset.dashboardRoleHidden = '1';
        hidden.push(id);
      }
    });
    return hidden;
  },
  hideEmpty() {
    if (typeof document === 'undefined') return [];
    const hidden = [];
    this.WRAPPERS.forEach(([wrapId]) => {
      const wrap = document.getElementById(wrapId);
      if (!wrap || wrap.dataset.dashboardDedupHidden === '1' || wrap.dataset.dashboardRoleHidden === '1') return;
      const body = wrap.querySelector('.card-collapse-body');
      const text = this._norm(body ? body.textContent : '');
      if (!text) { this._setHidden(wrap, 'empty'); hidden.push(wrapId); }
    });
    return hidden;
  },
  dedupeExactWrappers() {
    if (typeof document === 'undefined') return [];
    const seen = [], hidden = [];
    this.WRAPPERS.forEach(([wrapId, priority]) => {
      const wrap = document.getElementById(wrapId);
      if (!wrap || wrap.dataset.dashboardDedupHidden === '1' || wrap.dataset.dashboardRoleHidden === '1') return;
      const body = wrap.querySelector('.card-collapse-body');
      const text = this._norm(body ? body.textContent : '');
      if (!text) return;
      const prior = seen.find(x => this._similarity(x.text, text) >= this.SIMILARITY_THRESHOLD);
      if (prior) { this._setHidden(wrap, `duplicate-of:${prior.id}`); hidden.push(wrapId); }
      else seen.push({ id: wrapId, priority, text });
    });
    return hidden;
  },
  dedupeKnownMirrors() {
    if (typeof document === 'undefined') return [];
    const hidden = [];
    this.MIRRORS.forEach(([mirrorId, canonicalId, reason]) => {
      const canonical = this._bodyText(canonicalId), mirror = this._bodyText(mirrorId);
      if (!canonical || !mirror) return;
      if (this._similarity(canonical, mirror) >= this.SIMILARITY_THRESHOLD) {
        if (this._setInnerHidden(mirrorId, reason)) hidden.push(mirrorId);
      }
    });
    return hidden;
  },
  dedupeMarkedMirrors() {
    if (typeof document === 'undefined') return [];
    const hidden = [], nodes = document.querySelectorAll('[data-insight-mirror-of]');
    nodes.forEach((mirror) => {
      const targetId = mirror.getAttribute('data-insight-mirror-of');
      const canonical = targetId ? document.getElementById(targetId) : null;
      if (!canonical) return;
      const a = this._norm(canonical.textContent), b = this._norm(mirror.textContent);
      if (a && b && this._similarity(a, b) >= this.SIMILARITY_THRESHOLD) {
        this._setHidden(mirror, `marked-mirror-of:${targetId}`); hidden.push(mirror.id || 'marked-mirror');
      }
    });
    return hidden;
  },
  run() {
    const hidden = [
      ...this.applyRoleVisibility(),
      ...this.hideEmpty(),
      ...this.dedupeExactWrappers(),
      ...this.dedupeKnownMirrors(),
      ...this.dedupeMarkedMirrors(),
    ];
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset.dashboardInsightDedup = String(hidden.length);
      document.documentElement.dataset.dashboardInsightDedupRun = String(Date.now());
      document.documentElement.dataset.dashboardRole = this._activeRole() || 'unknown';
    }
    return hidden;
  },
  schedule() {
    if (typeof window === 'undefined') return;
    const run = () => { try { this.run(); } catch (e) { console.warn('DashboardInsightDedup gagal:', e); } };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(run));
    else setTimeout(run, 0);
  },
  observe() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || this._observer) return;
    const root = document.body || document.documentElement;
    if (!root) return;
    this._observer = new MutationObserver(() => {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.run(), 80);
    });
    this._observer.observe(root, { childList: true, subtree: true });
  },
  disconnect() {
    if (this._observer) this._observer.disconnect();
    this._observer = null;
    clearTimeout(this._timer);
    this._timer = null;
  },
};
if (typeof window !== 'undefined') window.DashboardInsightDedup = DashboardInsightDedup;
try {
  if (typeof DashboardHub !== 'undefined' && typeof DashboardHub.render === 'function') {
    const _dashboardHubRenderOriginal = DashboardHub.render.bind(DashboardHub);
    DashboardHub.render = function(...args) {
      const result = _dashboardHubRenderOriginal(...args);
      DashboardInsightDedup.schedule();
      DashboardInsightDedup.observe();
      return result;
    };
  }
} catch (e) { console.warn('DashboardInsightDedup wiring gagal:', e); }
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  DashboardInsightDedup.schedule();
  DashboardInsightDedup.observe();
}, { once: true });
