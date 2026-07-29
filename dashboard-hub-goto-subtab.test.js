'use strict';
/**
 * dashboard-hub-goto-subtab.test.js — Regresi bugfix "kartu Fitur (Penasihat
 * AI/Skor Hidup Seimbang/Refleksi & Self-Care/Kebebasan Finansial/Life OS)
 * selalu terlihat mengarah ke kartu Hero di atas subtab".
 *
 * Root cause (lihat komentar DASHHUB_GOTO_SECTION_MAP di dashboard-hub.js):
 * target.goTo dari kartu-kartu itu hidup di dalam container yang ada di
 * SECTION_GROUPS sub-tab lain (mis. #dashboardHubPinnedWrap = sub-tab
 * "Widget", #lifeOSWrap = sub-tab "Insight"), tapi dashHubNavigateToFeature()
 * SEBELUM fix ini tidak pernah memanggil DashboardHub.setSectionTab() dulu —
 * jadi scrollIntoView() ke elemen yang leluhurnya u-dnone selalu no-op, dan
 * showPage() sudah keburu reset scroll ke 0 duluan (mendarat di kartu Hero
 * yang selalu tampil di atas subtab).
 *
 * Test ini load FILE ASLI (bukan copy-paste logic) lewat vm dgn DOM tiruan
 * minimal yang meniru struktur nyata index.html/app_production.html:
 * advisorCard/lifeBalanceCard/refleksiCard/dashFiCard adalah descendant
 * #dashboardHubPinnedWrap; lifeOSWrap adalah dirinya sendiri; dashHubSummaryGrid
 * dirinya sendiri (sub-tab "ringkasan"); dashHubMainGridCard dirinya sendiri
 * (sub-tab "fitur", tidak perlu switch krn goTo-nya sendiri sudah di 'fitur').
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'dashboard-hub', 'dashboard-hub.js'),
  'utf8'
);

function makeEl(id, parent) {
  const el = {
    id,
    parentElement: parent || null,
    _classes: new Set(),
    classList: {
      add(...c) { c.forEach((x) => el._classes.add(x)); },
      remove(...c) { c.forEach((x) => el._classes.delete(x)); },
      toggle(c, force) {
        const on = force === undefined ? !el._classes.has(c) : !!force;
        if (on) el._classes.add(c); else el._classes.delete(c);
        return on;
      },
      contains(c) { return el._classes.has(c); },
    },
    scrollIntoViewCalls: 0,
    scrollIntoView() { el.scrollIntoViewCalls++; },
    get offsetWidth() { return 0; },
    dataset: {},
  };
  return el;
}

function buildFakeDom() {
  const byId = Object.create(null);

  // Container per sub-tab (persis nama id yang dipakai SECTION_GROUPS &
  // DASHHUB_GOTO_SECTION_MAP asli).
  const dashHubSummaryGrid = makeEl('dashHubSummaryGrid');
  const dashHubMainGridCard = makeEl('dashHubMainGridCard');
  const dashboardHubPinnedWrap = makeEl('dashboardHubPinnedWrap');
  const lifeOSWrap = makeEl('lifeOSWrap');

  // advisorCard dkk ada DI DALAM dashboardHubPinnedWrap, sama seperti
  // struktur nyata index.html/app_production.html (bukan direct child
  // SECTION_GROUPS, tapi cucu -- makanya resolver harus jalan naik).
  const advisorCard = makeEl('advisorCard', dashboardHubPinnedWrap);
  const aiRecommendBody = makeEl('aiRecommendBody', advisorCard);
  const lifeBalanceCard = makeEl('lifeBalanceCard', dashboardHubPinnedWrap);
  const refleksiCard = makeEl('refleksiCard', dashboardHubPinnedWrap);
  const dashFiCard = makeEl('dashFiCard', dashboardHubPinnedWrap);

  // Elemen yang TIDAK terdaftar di section manapun (pola sama Hero Card/
  // Keuangan/Hero -- selalu tampil, tidak butuh switch tab apa pun).
  const dashHubHeroCard = makeEl('dashHubHeroCard');

  [
    dashHubSummaryGrid, dashHubMainGridCard, dashboardHubPinnedWrap, lifeOSWrap,
    advisorCard, aiRecommendBody, lifeBalanceCard, refleksiCard, dashFiCard,
    dashHubHeroCard,
  ].forEach((el) => { byId[el.id] = el; });

  return { byId, advisorCard, aiRecommendBody, lifeBalanceCard, refleksiCard, dashFiCard, lifeOSWrap, dashHubSummaryGrid, dashHubMainGridCard, dashHubHeroCard };
}

function loadSandbox() {
  const dom = buildFakeDom();
  const setSectionTabCalls = [];
  const showPageCalls = [];
  const localStorageStore = {};

  const context = {
    console,
    document: {
      getElementById(id) { return dom.byId[id] || null; },
      querySelectorAll() { return []; },
    },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(localStorageStore, k) ? localStorageStore[k] : null; },
      setItem(k, v) { localStorageStore[k] = v; },
    },
    showPage(page, el) { showPageCalls.push({ page, el }); },
    setTimeout,
    clearTimeout,
  };
  vm.createContext(context);
  vm.runInContext(SRC, context, { filename: 'dashboard-hub.js' });
  // `const`/`let` top-level di SRC (mis. DashboardHub, DASHHUB_GOTO_SECTION_MAP)
  // TIDAK otomatis jadi properti context (beda dari `var`/function declaration)
  // -- tempel eksplisit lewat epilogue kecil yang jalan di context yang sama
  // supaya bisa dites/di-spy dari luar.
  vm.runInContext(
    'this.DashboardHub = DashboardHub; this._dashHubResolveGoToSection = _dashHubResolveGoToSection; this.dashHubNavigateToFeature = dashHubNavigateToFeature; this.DASHHUB_GOTO_SECTION_MAP = DASHHUB_GOTO_SECTION_MAP;',
    context,
    { filename: 'dashboard-hub-test-epilogue.js' }
  );

  // Instrument DashboardHub.setSectionTab SETELAH file di-load (spy, bukan
  // ganti behaviour) -- applySectionTab asli tetap jalan apa adanya.
  const origSetSectionTab = context.DashboardHub.setSectionTab.bind(context.DashboardHub);
  context.DashboardHub.setSectionTab = function (tab) {
    setSectionTabCalls.push(tab);
    return origSetSectionTab(tab);
  };

  return { context, dom, setSectionTabCalls, showPageCalls };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('_dashHubResolveGoToSection: advisorCard/lifeBalanceCard/refleksiCard/dashFiCard -> "widget" (ancestor #dashboardHubPinnedWrap)', () => {
  const { context } = loadSandbox();
  assert.equal(context._dashHubResolveGoToSection('advisorCard'), 'widget');
  assert.equal(context._dashHubResolveGoToSection('lifeBalanceCard'), 'widget');
  assert.equal(context._dashHubResolveGoToSection('refleksiCard'), 'widget');
  assert.equal(context._dashHubResolveGoToSection('dashFiCard'), 'widget');
});

test('_dashHubResolveGoToSection: naik lewat beberapa level ancestor (aiRecommendBody di dalam advisorCard di dalam pinned wrap)', () => {
  const { context } = loadSandbox();
  assert.equal(context._dashHubResolveGoToSection('aiRecommendBody'), 'widget');
});

test('_dashHubResolveGoToSection: lifeOSWrap -> "insight"', () => {
  const { context } = loadSandbox();
  assert.equal(context._dashHubResolveGoToSection('lifeOSWrap'), 'insight');
});

test('_dashHubResolveGoToSection: dashHubSummaryGrid -> "ringkasan", dashHubMainGridCard -> "fitur"', () => {
  const { context } = loadSandbox();
  assert.equal(context._dashHubResolveGoToSection('dashHubSummaryGrid'), 'ringkasan');
  assert.equal(context._dashHubResolveGoToSection('dashHubMainGridCard'), 'fitur');
});

test('_dashHubResolveGoToSection: elemen di luar SECTION_GROUPS manapun (mis. Hero Card) -> null, tidak dipaksa pindah tab', () => {
  const { context } = loadSandbox();
  assert.equal(context._dashHubResolveGoToSection('dashHubHeroCard'), null);
});

test('_dashHubResolveGoToSection: id yang tidak ada di DOM -> null (tidak throw)', () => {
  const { context } = loadSandbox();
  assert.equal(context._dashHubResolveGoToSection('id-tidak-ada'), null);
});

test('dashHubNavigateToFeature: klik kartu "Penasihat AI" (goTo:advisorCard) memanggil setSectionTab("widget") SEBELUM scrollIntoView, lalu benar-benar scroll ke elemen yang sekarang visible', async () => {
  const { context, dom, setSectionTabCalls } = loadSandbox();
  context.dashHubNavigateToFeature({ page: 'dashboard-hub', goTo: 'advisorCard' });
  await wait(200);
  assert.deepEqual(setSectionTabCalls, ['widget']);
  assert.equal(dom.advisorCard.scrollIntoViewCalls, 1);
  // Bukti nyata elemen sekarang benar-benar visible (u-dnone dilepas dari
  // container yang jadi tujuan tab, lewat applySectionTab asli -- bukan
  // stub) -- kontrak inti bugfix ini.
  assert.equal(dom.byId.dashboardHubPinnedWrap.classList.contains('u-dnone'), false);
});

test('dashHubNavigateToFeature: klik kartu "Life OS" (goTo:lifeOSWrap) memanggil setSectionTab("insight")', async () => {
  const { context, dom, setSectionTabCalls } = loadSandbox();
  context.dashHubNavigateToFeature({ page: 'dashboard-hub', goTo: 'lifeOSWrap' });
  await wait(200);
  assert.deepEqual(setSectionTabCalls, ['insight']);
  assert.equal(dom.lifeOSWrap.scrollIntoViewCalls, 1);
});

test('dashHubNavigateToFeature: goTo yang TIDAK butuh pindah tab (mis. Hero Card / target di luar SECTION_GROUPS) -> setSectionTab TIDAK dipanggil sama sekali, tetap scroll ke elemennya', async () => {
  const { context, dom, setSectionTabCalls } = loadSandbox();
  context.dashHubNavigateToFeature({ page: 'dashboard-hub', goTo: 'dashHubHeroCard' });
  await wait(200);
  assert.deepEqual(setSectionTabCalls, []);
  assert.equal(dom.dashHubHeroCard.scrollIntoViewCalls, 1);
});

test('dashHubNavigateToFeature: goTo di halaman LAIN (bukan dashboard-hub) tidak pernah memicu switch sub-tab Dashboard Hub', async () => {
  const { context, setSectionTabCalls, showPageCalls } = loadSandbox();
  // page 'keuangan' tidak akan resolve goTo apa pun krn elemen tidak ada di
  // dom tiruan ini, tapi yang diuji murni: guard `target.page === 'dashboard-hub'`
  // mencegah _dashHubResolveGoToSection/setSectionTab terpanggil sama sekali
  // utk halaman lain.
  context.dashHubNavigateToFeature({ page: 'keuangan', goTo: 'someElementOnFinancePage' });
  await wait(200);
  assert.deepEqual(setSectionTabCalls, []);
  assert.deepEqual(showPageCalls, [{ page: 'keuangan', el: null }]);
});
