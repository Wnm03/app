'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MODULE_ROOTS = [
  path.join(ROOT, 'modules', 'finance'),
  path.join(ROOT, 'modules', 'asset'),
  path.join(ROOT, 'modules', 'shop'),
  path.join(ROOT, 'modules', 'shared'),
  path.join(ROOT, 'modules', 'ai')
];
const CANONICAL = /D\.(bills|billsArchive|debts|piutang)/g;
const DIRECT_COLLECTION_MUTATION = /D\.(bills|billsArchive|debts|piutang)\s*(?:\.|\[)[^\n]*(?:push|splice|unshift|pop|shift)\s*\(/;
const DIRECT_COLLECTION_REPLACE = /D\.(bills|billsArchive|debts|piutang)\s*=\s*(?!undefined|null)(?!D\.(bills|billsArchive|debts|piutang)\s*\|\|)/;
const STORAGE_REFERENCE = /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\([^\n]*(?:bills|billsArchive|debts|piutang)/i;

function productionFiles() {
  const out = [];
  for (const root of MODULE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      if (!name.endsWith('.js')) continue;
      out.push(path.join(root, name));
    }
  }
  return out;
}

function bodyWithoutComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, '$1');
}

test('S2190 consumer sweep: canonical collections are read from D, not cached in browser storage', () => {
  const offenders = [];
  for (const file of productionFiles()) {
    const relFile = path.relative(ROOT, file);
    if (relFile === 'modules/shared/backup-restore.js' || relFile.startsWith('modules/shared/self-test-cases-')) continue;
    const src = bodyWithoutComments(fs.readFileSync(file, 'utf8'));
    if (!CANONICAL.test(src)) { CANONICAL.lastIndex = 0; continue; }
    CANONICAL.lastIndex = 0;
    if (STORAGE_REFERENCE.test(src)) offenders.push(`${path.relative(ROOT, file)}: browser-storage canonical collection reference`);
    STORAGE_REFERENCE.lastIndex = 0;
    if (DIRECT_COLLECTION_MUTATION.test(src)) offenders.push(`${path.relative(ROOT, file)}: direct collection mutation`);
    DIRECT_COLLECTION_MUTATION.lastIndex = 0;
    // Collection replacement is allowed only for initialization guards in boot/migration modules;
    // those are excluded from this consumer-only sweep.
    if (DIRECT_COLLECTION_REPLACE.test(src) && !/features-helpers-global-security\.js$/.test(file)) {
      offenders.push(`${path.relative(ROOT, file)}: direct collection replacement`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

test('S2190 known read-side adapters remain projection/read-only', () => {
  const files = [
    'modules/finance/piutang-utang-reminder.js',
    'modules/finance/tagihan-reminder.js',
    'modules/finance/cash-projection.js',
    'modules/finance/debt-optimizer-api.js',
    'modules/finance/dana-kelolaan.js',
    'modules/ai/feature-insights.js',
    'modules/shared/modules-calc.js',
    'modules/shared/modules-render.js'
  ];
  for (const rel of files) {
    const src = bodyWithoutComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    assert.equal(DIRECT_COLLECTION_MUTATION.test(src), false, `${rel} mutates canonical collection directly`);
    DIRECT_COLLECTION_MUTATION.lastIndex = 0;
  }
});
