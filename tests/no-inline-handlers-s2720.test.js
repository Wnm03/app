'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { scan } = require(path.join(__dirname, '..', 'scripts', 'inline-handler-scan.js'));

test('S2720: tidak ada handler inline sungguhan (on*="...") di sumber runtime', () => {
  assert.deepStrictEqual(scan().filter(r => r.real > 0), []);
});

test('S2720: pemindai membedakan data-on* (aman) dari inline sungguhan', () => {
  const src = require('node:fs').readFileSync(path.join(__dirname, '..', 'scripts', 'inline-handler-scan.js'), 'utf8');
  assert.match(src, /\(\?<!\[\\\\w\.\\\\-\]\)/, 'lookbehind harus mengecualikan data-on* dan el.onclick=');
  const re = new RegExp('(?<![\\w.\\-])on(?:click|change)\\s*=\\s*\\\\?[\'"]', 'gi');
  assert.equal('<a onclick="x()">'.match(re).length, 1);
  assert.equal('<a onclick=\\\'x()\\\'>'.match(re).length, 1);
  assert.equal('<a data-onclick="x" data-onchange=\'y\'>'.match(re), null);
  assert.equal('el.onclick = function(){}'.match(re), null);
});
