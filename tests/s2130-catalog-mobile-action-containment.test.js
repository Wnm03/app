const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const block = css.slice(css.indexOf('/* S2130 — Parts Catalog mobile action containment.'));

test('S2130: catalog rows contain long part names and metadata', () => {
  assert.match(block, /#catalogList \.tx-item \{[\s\S]*?min-width:\s*0[\s\S]*?max-width:\s*100%/);
  assert.match(block, /#catalogList \.tx-item \.tx-name,[\s\S]*?overflow-wrap:\s*anywhere/);
});

test('S2130: catalog edit/delete actions keep a stable mobile touch box', () => {
  assert.match(block, /#catalogList \.tx-item \.tx-del \{[\s\S]*?min-width:\s*36px[\s\S]*?min-height:\s*36px/);
});

test('S2130: catalog rows use a bounded action grid at 430px and below', () => {
  assert.match(block, /@media \(max-width:\s*430px\)[\s\S]*?#catalogList \.tx-item \{[\s\S]*?grid-template-columns:\s*40px minmax\(0, 1fr\) 36px 36px[\s\S]*?grid-template-areas:\s*"thumb info edit del"/);
});

test('S2130: narrow catalog rows tighten only the action boxes, not the data model', () => {
  assert.match(block, /@media \(max-width:\s*359px\)[\s\S]*?grid-template-columns:\s*36px minmax\(0, 1fr\) 34px 34px/);
  assert.match(block, /-webkit-line-clamp:\s*2/);
});
