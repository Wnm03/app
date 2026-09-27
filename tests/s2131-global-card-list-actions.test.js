import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2131: reusable card/list action controls have a bounded base contract', () => {
  assert.match(css, /\.tx-item > \.tx-del[\s\S]*?min-width:\s*36px/);
  assert.match(css, /\.aset-item > button[\s\S]*?max-width:\s*100%/);
  assert.match(css, /\.shop-product-actions > button[\s\S]*?flex:\s*0 0 auto/);
});

test('S2131: mobile action rows remain contained at 430px', () => {
  const block = css.slice(css.lastIndexOf('/* S2131'));
  assert.match(block, /@media \(max-width: 430px\)/);
  assert.match(block, /\.shop-product-card \.shop-product-actions[\s\S]*?width:\s*100%/);
  assert.match(block, /\.tx-item > \.tx-del[\s\S]*?min-height:\s*36px/);
});

test('S2131: narrow 359px controls stay inside their cards', () => {
  const block = css.slice(css.lastIndexOf('/* S2131'));
  assert.match(block, /@media \(max-width: 359px\)/);
  assert.match(block, /min-width:\s*34px/);
  assert.match(block, /\.aset-item > \.tx-amount[\s\S]*?max-width:\s*38%/);
});

test('S2131: action audit is presentation-only', () => {
  const block = css.slice(css.lastIndexOf('/* S2131'));
  assert.doesNotMatch(block, /localStorage|indexedDB|VehicleCarNotesSOT|save\(|fetch\(|addEventListener/);
});
