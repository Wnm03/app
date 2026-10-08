'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { auditStartupLoadOrder } = require('../scripts/audit-startup-load-order');

test('startup load-order gate catches a top-level IIFE reading a later const', () => {
  const problems = auditStartupLoadOrder({
    sources: [
      { file: 'a.js', source: '(function(){ console.log(LATER); })();' },
      { file: 'b.js', source: 'const LATER = 1;' },
    ],
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /a\.js:1/);
  assert.match(problems[0], /LATER/);
});

test('startup load-order gate also catches a later lexical declaration in the same file', () => {
  const problems = auditStartupLoadOrder({
    sources: [
      { file: 'same.js', source: '(function(){ useLater(LATER); })();\nconst LATER = 1;' },
    ],
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /same\.js:1/);
});

test('startup load-order gate does not flag hoisted function declarations', () => {
  const problems = auditStartupLoadOrder({
    sources: [
      { file: 'a.js', source: '(function(){ laterFunction(); })();' },
      { file: 'b.js', source: 'function laterFunction() {}' },
    ],
  });
  assert.deepEqual(problems, []);
});

test('current GROUP_A + GROUP_B startup order has no lexical TDZ finding', () => {
  assert.deepEqual(auditStartupLoadOrder(), []);
});
