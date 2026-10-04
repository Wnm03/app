const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'production-hardening-gate.js');

test('S2421 production hardening gate resolves project root independently of caller CWD', () => {
  const r = spawnSync(process.execPath, [SCRIPT], {
    cwd: os.tmpdir(), encoding: 'utf8', timeout: 30000, env: process.env,
  });
  assert.notEqual(r.status, null, 'gate process must terminate');
  const output = `${r.stdout || ''}\n${r.stderr || ''}`;
  assert.doesNotMatch(output, /ENOENT:.*\/scripts\/build\.js/);
  assert.doesNotMatch(output, /ENOENT:.*\/car-notes\.js/);
});

test('S2421 production hardening gate no longer uses process.cwd for project-root resolution', () => {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  assert.match(source, /const root=path\.resolve\(__dirname,'\.\.'\);/);
  assert.doesNotMatch(source, /const root\s*=\s*process\.cwd\(\)/);
});
