'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXCLUDED_DIRS = new Set(['node_modules', '.git']);

function collectJs(dir, out=[]) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    if (EXCLUDED_DIRS.has(ent.name) || ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) collectJs(p, out);
    else if (ent.isFile() && ent.name.endsWith('.js') && !ent.name.includes('app-bundle-')) out.push(p);
  }
  return out;
}

test('v22: source tidak memiliki catch block kosong total', () => {
  const re = /\bcatch\b\s*(?:\([^)]*\))?\s*\{/g;
  const failures = [];
  for (const file of collectJs(ROOT)) {
    const s = fs.readFileSync(file, 'utf8');
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      let i = m.index + m[0].length, depth = 1;
      let quote = null;
      for (; i < s.length && depth; i++) {
        const c=s[i], prev=s[i-1];
        if (quote) { if (c===quote && prev!=='\\') quote=null; continue; }
        if (c==='"' || c==="'" || c==='`') { quote=c; continue; }
        if (c==='{') depth++;
        else if (c==='}') depth--;
      }
      if (depth===0 && s.slice(m.index + m[0].length, i-1).trim()==='') {
        failures.push(`${path.relative(ROOT,file)}:${s.slice(0,m.index).split('\n').length}`);
      }
    }
  }
  assert.deepEqual(failures, [], `empty catch ditemukan: ${failures.join(', ')}`);
});
