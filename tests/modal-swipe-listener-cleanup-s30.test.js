const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const sources = [
  'modules/shared/modal-navigasi.js',
  'modules/asset/modal-navigasi.js',
];

test('S30 source swipe lifecycle has cleanup registry and closeModal cleanup hook', () => {
  for (const rel of sources) {
    const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(s, /_swipeDismissCleanupByHandle=typeof WeakMap==='function'\?new WeakMap\(\):null;/, rel);
    assert.match(s, /function _cleanupSwipeDismissForOverlay\(overlay\)/, rel);
    assert.match(s, /if\(typeof _cleanupSwipeDismissForOverlay==='function'\)_cleanupSwipeDismissForOverlay\(el\);/, rel);
    assert.match(s, /_swipeDismissCleanupByHandle\.set\(handle,\(\)=>\{/,
      `${rel}: cleanup callback must be registered per handle`);
    assert.match(s, /window\.removeEventListener\('mousemove',onMove\)/, rel);
    assert.match(s, /window\.removeEventListener\('mouseup',onEnd\)/, rel);
    assert.match(s, /_swipeDismissCleanupByHandle\.delete\(handle\)/, rel);
    assert.doesNotMatch(s, /_swipeDismissBoundHandles/, `${rel}: old WeakSet guard should be replaced by cleanup registry`);
  }
});

test('S30 bundle B contains the same swipe cleanup hardening', () => {
  const s = fs.readFileSync(path.join(ROOT, 'app-bundle-b.min.js'), 'utf8');
  assert.match(s, /_swipeDismissCleanupByHandle=typeof WeakMap==='function'\?new WeakMap\(\):null;/);
  assert.match(s, /function _cleanupSwipeDismissForOverlay\(overlay\)/);
  assert.match(s, /if\(typeof _cleanupSwipeDismissForOverlay==='function'\)_cleanupSwipeDismissForOverlay\(el\);/);
  assert.match(s, /window\.removeEventListener\('mousemove',onMove\)/);
  assert.match(s, /window\.removeEventListener\('mouseup',onEnd\)/);
  assert.doesNotMatch(s, /_swipeDismissBoundHandles/);
});
