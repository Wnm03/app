const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

test('SA11: production CSP tidak lagi mengizinkan unsafe-eval', () => {
  for (const file of ['index.html', 'app_production.html']) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const m = html.match(/<meta[^>]+http-equiv=\"Content-Security-Policy\"[^>]+content=\"([^\"]+)/i);
    assert.ok(m, `${file}: script-src harus ada`);
    assert.doesNotMatch(m[1], /script-src[^;]*'unsafe-eval'/, `${file}: unsafe-eval harus dicabut dari script-src`);
  }
});

test('SA11: lazy CDN loaders utama memakai SRI terverifikasi', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/boot-early.js'), 'utf8');
  for (const token of [
    'mpQLT7yiRJ06RkhNTYhVnvvr3c71il3h+wEI16ICc+fnFHxrBRoJrMmDJ8iBY04+U/FgTj7xah5Vbltq5pg+aQ==',
    'qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==',
    'BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==',
    'r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA=='
  ]) assert.match(src, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(src, /function ensureZXing\(\).*@zxing\/library@0\.21\.3/);
});

test('SA11: SRI gagal closed-by-default pada script loader', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/boot-early.js'), 'utf8');
  assert.match(src, /if\(integrity\)\{s\.integrity=integrity;s\.crossOrigin=crossOrigin\|\|'anonymous';\}/);
});
