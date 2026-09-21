'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

const renderB=fs.readFileSync('modules/shared/modules-render-b.js','utf8');
const hub=fs.readFileSync('modules/dashboard-hub/dashboard-hub.js','utf8');
const wrappers=fs.readFileSync('modules/shared/action-wrappers.js','utf8');

// The screenshot showed an old dashboard build doing duplicate work. These are
// source-level contracts for the fixes so a later refactor cannot silently
// reintroduce the same hot path.
test('dashboard navigation does not render DashboardHub twice',()=>{
  assert.match(wrappers,/function goToDashboardHub\(\)\{ showPage\('dashboard-hub'\); \}/);
  assert.doesNotMatch(wrappers,/function goToDashboardHub\(\)\{[^}]*DashboardHub\.render\(\)/);
});

test('renderDashboard skips legacy/pinned work unless dashboard or Hub Widget tab is visible',()=>{
  assert.match(renderB,/const _dashboardHubActive=!!\(_activePage&&_activePage\.id==='page-dashboard-hub'\)/);
  assert.match(renderB,/const _legacyDashboardActive=!!\(_activePage&&_activePage\.id==='page-dashboard'\)/);
  assert.match(renderB,/const _renderLegacyDashboard=options\.force===true\|\|_legacyDashboardActive\|\|\(_dashboardHubActive&&_hubSection==='widget'\)/);
  assert.match(renderB,/if\(!_dashboardHubActive\|\|!_hubLive\)return;/);
});

test('Dashboard Hub only renders section-specific presenters for the active section',()=>{
  assert.match(hub,/renderSection\(tab\)/);
  assert.match(hub,/if \(tab === 'ringkasan'\)/);
  assert.match(hub,/if \(tab === 'insight'\)/);
  assert.match(hub,/const activeSection = this\._currentSectionTab\(\);/);
  assert.match(hub,/this\.renderSection\(activeSection\);/);
  // v1877 slim Insight: EIE tidak lagi dirender di Hub (modul canonical tetap ada); yang dirender hanya insight audit.
  assert.doesNotMatch(hub,/safe\('EIEDashboard',/);
  assert.match(hub,/safe\('FinancialAuditDashboardInsight',/);
});

test('Dashboard Hub month aggregate uses a single pass and mutation-aware cache',()=>{
  assert.match(hub,/let _dashHubMonthTxCache/);
  assert.match(hub,/typeof _saveStateVersion === 'number'/);
  assert.match(hub,/for \(const t of D\.transactions\)/);
  assert.doesNotMatch(hub,/D\.transactions\.filter\(\(t\) =>/);
});

test('Dashboard Hub feature grid is lazy and owned only by the active Fitur section',()=>{
  assert.match(hub,/renderFeatureGrid\(\)/);
  assert.match(hub,/safe\('DashboardHubFeatureGrid', \(\) => this\.renderFeatureGrid\(\)\)/);
  // Full FEATURE_REGISTRY.map() must not sit directly in DashboardHub.render().
  const renderStart=hub.indexOf('  render() {',hub.indexOf('const DashboardHub ='));
  const renderEnd=hub.indexOf('  // Ganti sub-tab aktif',renderStart);
  const renderBody=hub.slice(renderStart,renderEnd);
  assert.doesNotMatch(renderBody,/FEATURE_REGISTRY\.map\(cat =>/);
});

test('Dashboard Hub Fitur does not double-render Favorit during tab switch',()=>{
  const applyStart=hub.indexOf('  applySectionTab(tab) {');
  const applyEnd=hub.indexOf('  // Discoverability fix',applyStart);
  const applyBody=hub.slice(applyStart,applyEnd);
  assert.doesNotMatch(applyBody,/DashboardHubFavoritView\.render\(\)/);
  const setStart=hub.indexOf('  setSectionTab(tab) {');
  const setEnd=hub.indexOf('  // Toggle visibility',setStart);
  assert.match(hub.slice(setStart,setEnd),/this\.renderSection\(next\)/);
});

test('Dashboard Hub Widget render disables recursive Hub live wiring',()=>{
  assert.match(hub,/renderDashboard\(\{ hubLive: false \}\)/);
  assert.match(renderB,/const _hubLive=options\.hubLive!==false/);
  assert.match(renderB,/if\(!_dashboardHubActive\|\|!_hubLive\)return;/);
});

test('Dashboard preference mutations render only a visible dashboard target',()=>{
  const settings=fs.readFileSync('modules/dashboard-hub/dashboard-hub-settings.js','utf8');
  assert.match(settings,/function shouldRenderDashboardFromSettings\(\)/);
  assert.match(settings,/dashActive=!!dash\?\.classList\?\.contains\('active'\)/);
  assert.match(settings,/hubActive=!!hub\?\.classList\?\.contains\('active'\)/);
  assert.match(settings,/localStorage\.getItem\('dashHubSectionTab'\)==='widget'/);
  const r=fs.readFileSync('modules/shared/modules-render.js','utf8');
  assert.doesNotMatch(r,/document\.querySelector\('\.page\.active'/);
});
