'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['tests', 'scripts'];
const EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const checks = [
  { name: 'absolute-workspace-path', re: /(?:\/mnt\/(?:data|user-data)|[A-Za-z]:\\(?:Users|tmp)\\)/g },
  { name: 'historical-replay-path', re: /(?:replay|fresh|work)\d{4}/gi },
];

function filesUnder(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const findings = [];
for (const relDir of SCAN_DIRS) {
  for (const file of filesUnder(path.join(ROOT, relDir))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const check of checks) {
      for (const match of src.matchAll(check.re)) {
        const before = src.slice(0, match.index);
        const line = before.split('\n').length;
        findings.push({
          check: check.name,
          file: path.relative(ROOT, file).replaceAll(path.sep, '/'),
          line,
          match: match[0],
        });
      }
    }
  }
}

if (findings.length) {
  console.error(`TEST REPLAY PORTABILITY: FAIL — ${findings.length} external/historical path reference(s)`);
  for (const f of findings) console.error(`${f.file}:${f.line} [${f.check}] ${f.match}`);
  process.exitCode = 1;
} else {
  console.log('TEST REPLAY PORTABILITY: PASS — no absolute workspace, temporary-session, or historical replay path references found.');
}
