const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'pro-ui-layer.css'), 'utf8');
const core = fs.readFileSync(path.join(root, 'modules/vehicle/vehicle-core.js'), 'utf8');

test('1718 mockup has all 8 dedicated visual screens', () => {
  for (let i=1;i<=8;i++) assert.match(html, new RegExp(`id="proMockScreen${i}"`));
  assert.match(html, /id="proMockBottomNav"/);
  assert.equal((html.match(/class="pro-mock-screen/g)||[]).length, 8);
});

test('1718 mockup maps bottom navigation and drill-down screens', () => {
  for (const n of [1,3,5,7,8]) assert.match(html, new RegExp(`data-pro-goto="${n}"`));
  for (const n of [2,4,6]) assert.match(html, new RegExp(`data-pro-goto="${n}"`));
  assert.match(core, /function proMockupSetScreen\(n\)/);
  assert.match(core, /function proMockupInit\(\)/);
  assert.match(core, /proMockupSetScreen\(document\.getElementById\('page-carnotes'\)/);
});

test('1718 mockup uses dedicated component classes, not theme-only styling', () => {
  for (const cls of ['pro-mock-vehicle','pro-mock-odo','pro-mock-stat-grid','pro-check-grid','pro-reminder-detail','pro-history-entry','pro-stepper','pro-fuel-card','pro-map','pro-shop-list','pro-mock-bottom-nav']) {
    assert.match(html, new RegExp(`class="[^"]*${cls}`));
    assert.match(css, new RegExp(`\\.${cls}`));
  }
  assert.doesNotMatch(html, /proMockScreen9/);
});
