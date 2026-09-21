'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('runtime version/cache is synchronized at v1880', () => {
  const index = read('index.html');
  const prod = read('app_production.html');
  const sw = read('sw.js');
  assert.match(index, /(?:\?v=1880|pwa-ui-layer\.css\?v=1880)/);
  assert.match(prod, /(?:\?v=1880|pwa-ui-layer\.css\?v=1880)/);
  assert.match(sw, /kw-cache-v1880/);
  assert.match(index, /pwa-ui-layer\.css\?v=1880/);
  assert.match(prod, /pwa-ui-layer\.css\?v=1880/);
  assert.doesNotMatch(sw, /kw-cache-v1879/);
});

test('Dashboard Slim keeps heavy analytics out of default Dashboard Hub render', () => {
  const src = read('modules/dashboard-hub/dashboard-hub.js');
  assert.match(src, /Slim mode: Hero \+ Ticker/);
  assert.match(src, /renderFeatureGrid\(\)/);
  assert.match(src, /FinancialAuditDashboardInsight/);
  assert.match(src, /DecisionCenterHome/);
  const section = src.slice(src.indexOf('renderSection(tab) {'), src.indexOf('  render() {', src.indexOf('renderSection(tab) {')));
  assert.doesNotMatch(section, /DashboardHubSummary\.render\(\)/);
  assert.doesNotMatch(section, /DashboardHubAnalytics\.render\(\)/);
});

test('Dashboard Slim CSS hides duplicate Analytics instead of deleting its compatibility DOM', () => {
  const html = read('index.html');
  assert.match(html, /#page-dashboard-hub #dashHubAnalyticsRow\{display:none!important;\}/);
});

test('stale bundle-B preload is not present', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /rel="preload"[^>]+app-bundle-b\.min\.js/);
});

test('retired pro UI layer is explicitly declared for deletion', () => {
  const manifest = read('DELETE-FILES.txt');
  assert.match(manifest, /(?:^|\n)pro-ui-layer\.css(?:\n|$)/);
});
