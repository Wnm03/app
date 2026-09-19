const assert = require('assert');
const { test } = require('node:test');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('S1842 performance pipeline', async (t) => {
  await t.test('indexes Titipan linked debts instead of scanning all debts per account', () => {
    const s = read('modules/finance/titipan-sync.js');
    assert.ok(s.includes('linkedDebtsByAccount'), 'linked debt index missing');
    assert.ok(s.includes("linkedDebtsByAccount.get(String(acc.id)) || []"), 'account lookup not indexed');
    assert.ok(!s.includes('D.debts.filter((d) => d && d.linkedAccountId != null && String(d.linkedAccountId) === String(acc.id))'), 'per-account debts filter regressed');
  });

  await t.test('provides opt-in performance telemetry without enabling it by default', () => {
    const s = read('modules/shared/features-helpers-global-security.js');
    assert.ok(s.includes('__APP_PERF_ENABLED'), 'perf switch missing');
    assert.ok(s.includes('save:TitipanSync'), 'save timing missing');
    assert.ok(s.includes("_perfMark('render:'"), 'render timing hook missing');
  });

  await t.test('legacy cross-domain refresh bursts use the scoped helper', () => {
    const files = [];
    const walk = (dir) => fs.readdirSync(dir, {withFileTypes:true}).forEach(e => {
      const p=path.join(dir,e.name);
      if(e.isDirectory()) walk(p); else if(e.name.endsWith('.js') && !p.includes(path.join(root,'tests'))) files.push(p);
    });
    walk(path.join(root,'modules'));
    const offenders = files.filter(p => {
      const s=fs.readFileSync(p,'utf8');
      return /save\(\);renderDashboard\(\);renderKeuangan\(\)/.test(s);
    });
    assert.deepStrictEqual(offenders, [], 'unscoped save→Dashboard→Finance burst remains');
  });
});
