const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('styles.css','utf8');
const smoke = fs.readFileSync('modules/shared/smoke-test.js','utf8');

 test('S256AA: dev smoke banner cannot cover app chrome and close control is touch-safe', () => {
  assert.match(smoke, /bottom:calc\(78px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.match(smoke, /width:44px;height:44px;min-width:44px;min-height:44px/);
  assert.match(smoke, /Tutup diagnostik developer/);
  assert.doesNotMatch(smoke, /position:fixed;top:0;left:0;right:0/);
});

test('S256AA: Car Notes and AI constrain intrinsic children without disabling intentional inner scrolling', () => {
  assert.match(css, /#page-carnotes \.cn-summary-link,/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /word-break:\s*break-word/);
  assert.match(css, /#page-ai \.chat-bubble \{ max-inline-size: 86%; \}/);
  assert.match(css, /#page-ai \.chat-input-row \{ max-inline-size: 100%; \}/);
});

test('S256AA: Settings compact controls expose >=44px hit areas', () => {
  assert.match(css, /#page-settings \.card-setting-btn,[\s\S]*?min-height:44px/);
  assert.match(css, /#page-settings \.card-collapse-toggle \{ width:44px; height:44px; \}/);
  assert.match(css, /#page-settings \.tgl-switch[\s\S]*?min-height:44px/);
});
