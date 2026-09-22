const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function shellDepths(file) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const root = html.indexOf('<div id="scrollRoot">');
  assert.ok(root >= 0, `${file}: #scrollRoot missing`);
  const src = html.slice(root);
  const pages = ['page-keuangan','page-shop','page-carnotes','page-pajak','page-aset','page-ai','page-settings','page-dashboard-hub'];
  const depths = Object.create(null);
  let depth = 0;
  const tokenRe = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<\/?div\b[^>]*>/gi;
  for (const m of src.matchAll(tokenRe)) {
    const t = m[0];
    if (t.startsWith('<!--') || /^<(script|style)\b/i.test(t)) continue;
    if (/^<div\b/i.test(t)) {
      const id = (t.match(/\bid=["']([^"']+)["']/i) || [])[1];
      if (pages.includes(id)) depths[id] = depth + 1;
      if (!/\/\s*>$/.test(t)) depth++;
    } else {
      depth--;
    }
    assert.ok(depth >= 0, `${file}: div depth became negative`);
  }
  return { depths, finalDepth: depth };
}

test('S1931: every primary page stays inside #mainApp -> #scrollRoot', () => {
  const expected = ['page-keuangan','page-shop','page-carnotes','page-pajak','page-aset','page-ai','page-settings','page-dashboard-hub'];
  for (const file of ['index.html', 'app_production.html']) {
    const { depths, finalDepth } = shellDepths(file);
    assert.deepEqual(Object.keys(depths).sort(), [...expected].sort(), `${file}: page set changed`);
    for (const id of expected) assert.equal(depths[id], 3, `${file}: ${id} is not at scrollRoot/mainApp/page depth`);
    assert.equal(finalDepth, 0, `${file}: shell divs do not close cleanly`);
  }
});
