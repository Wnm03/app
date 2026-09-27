const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const s2109Start = css.lastIndexOf('S2109');
const s2110Start = css.indexOf('S2110', s2109Start);
const s2109 = css.slice(s2109Start, s2110Start > s2109Start ? s2110Start : undefined);

test('S2109 keeps navigation touch targets at 44px without the previous min-inline-size override', () => {
  assert.match(s2109, /\.nav-item\s*\{[\s\S]*?min-inline-size:\s*44px/);
  assert.match(s2109, /\.nav-item\s*\{[\s\S]*?min-width:\s*44px/);
  assert.doesNotMatch(s2109, /min-inline-size:\s*0/);
});

test('S2109 prevents the dashboard feature grid from becoming cramped below 360px', () => {
  assert.match(s2109, /@media \(max-width:\s*359px\)[\s\S]*?\.dashhub-feature-grid--icon\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2/);
  assert.match(s2109, /\.dashhub-feature-grid--icon \.dashhub-feature-card--icon h3,[\s\S]*?overflow-wrap:\s*anywhere/);
});

test('S2109 adds narrow-screen containment without changing theme selectors', () => {
  assert.match(s2109, /@media \(max-width:\s*320px\)[\s\S]*?\.pwa-domain-page > \*/);
  assert.match(s2109, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(s2109, /\[data-theme=/);
});

test('S2109 remains presentation-only and does not introduce runtime dependencies', () => {
  assert.doesNotMatch(s2109, /addEventListener|localStorage|indexedDB|fetch\s*\(/);
});
