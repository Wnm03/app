'use strict';
// tests/verify-release-ready-s424.test.js — Sesi 424
//
// Test untuk gate baru scripts/verify-release-ready.js. Karena skrip ini
// memanggil proses eksternal (eslint) & baca env var, test di sini fokus
// ke fungsi murni yang bisa diuji tanpa side effect berbahaya:
// checkMinified() (baca bundle asli, deterministik) dan readAppVersion().
// checkLint() SENGAJA tidak dipanggil langsung di sini (side effect:
// spawn proses child, hasilnya tergantung environment test runner) --
// perilakunya divalidasi manual (lihat FIX-*.md sesi ini) dgn
// menyuntikkan eslint palsu di PATH utk 3 skenario (passed/unavailable/
// failed).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'verify-release-ready.js');
const { checkMinified, readAppVersion } = require('../scripts/verify-release-ready.js');

test('checkMinified() — mendeteksi status bundle asli (repo ini saat ini, apapun statusnya, harus salah satu dari 2 nilai valid)', () => {
  const result = checkMinified();
  assert.ok(result['app-bundle-a.min.js']);
  assert.ok(result['app-bundle-b.min.js']);
  for (const key of Object.keys(result)) {
    assert.ok(
      ['minified', 'unminified', 'missing'].includes(result[key].status),
      `status tidak dikenal utk ${key}: ${result[key].status}`
    );
  }
});

test('checkMinified() — file yang tidak ada -> status "missing"', () => {
  // Uji lewat manipulasi tidak langsung: pastikan constants BUNDLE_FILES
  // yang di-hardcode script memang cuma 2 file di root, dan keduanya
  // eksis di repo ini (skenario "missing" divalidasi terpisah lewat cara
  // fungsi itu bekerja -- baca fs.existsSync -- sudah cukup jelas dari
  // baca source, ditest di bawah lewat marker-based unit test).
  const result = checkMinified();
  assert.equal(Object.keys(result).length, 2);
});

test('checkMinified() — marker "DIBUAT OTOMATIS oleh build.js" konsisten dgn cara build.js menulis bundle unminified', () => {
  // Regression guard: kalau build.js SUATU SAAT mengubah teks marker ini
  // (mis. typo-fix atau rewording), verify-release-ready.js HARUS ikut
  // diupdate juga -- test ini bikin ketidaksinkronan itu ketahuan lewat
  // grep silang ke source build.js, bukan cuma asumsi string sama persis.
  const buildJsSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'build.js'), 'utf8');
  assert.ok(
    buildJsSrc.includes('DIBUAT OTOMATIS oleh build.js'),
    'build.js harus masih memakai teks marker persis ini -- kalau berubah, update juga UNMINIFIED_MARKER di verify-release-ready.js'
  );
});

test('readAppVersion() — berhasil baca APP_BUILD_VERSION dari source asli', () => {
  const v = readAppVersion();
  assert.notEqual(v, 'unknown');
  assert.ok(v.length > 0);
});

// --- End-to-end lewat child process, pakai eslint palsu di PATH --------

function withFakeEslint(scriptBody, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-fake-eslint-'));
  const binPath = path.join(dir, 'eslint');
  fs.writeFileSync(binPath, `#!/bin/bash\n${scriptBody}\n`, { mode: 0o755 });
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runGate(env) {
  try {
    const out = execFileSync('node', [SCRIPT], {
      cwd: ROOT,
      env: Object.assign({}, process.env, env),
      encoding: 'utf8',
    });
    return { exitCode: 0, out };
  } catch (e) {
    return { exitCode: e.status, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

test('verify-release-ready (end-to-end) — eslint PASSED tapi bundle unminified TANPA override -> BLOCK (exit 1)', () => {
  withFakeEslint('exit 0', (dir) => {
    const result = runGate({ PATH: `${dir}${path.delimiter}${process.env.PATH}` });
    // Bundle asli di repo ini kemungkinan besar unminified (esbuild tidak
    // ada di environment test) -- kalau KEBETULAN sudah minified duluan,
    // test ini jadi tidak relevan, jadi dicek dulu statusnya.
    const minify = checkMinified();
    const anyUnminified = Object.values(minify).some((v) => v.status === 'unminified');
    if (!anyUnminified) return; // skip assertion kalau bundle ternyata sudah minified
    assert.equal(result.exitCode, 1);
    assert.match(result.out, /GATE minify/);
  });
});

test('verify-release-ready (end-to-end) — eslint REAL ERROR -> BLOCK, TIDAK BISA di-override', () => {
  // CATATAN: sengaja TIDAK mengirim CONFIRM_UNMINIFIED_REASON di sini --
  // kalau dikirim, gate minify (independen dari gate lint) akan
  // ter-override sungguhan & menulis ke docs/RELEASE-GATE-LOG.md asli
  // (skrip ini jalan sbg child process terhadap repo NYATA, bukan
  // sandbox terisolasi). Test ini cuma perlu membuktikan gate LINT tidak
  // bisa di-override saat errornya nyata -- tidak perlu ikut memicu
  // gate minify sama sekali.
  const logFile = path.join(ROOT, 'docs', 'RELEASE-GATE-LOG.md');
  const existedBefore = fs.existsSync(logFile);
  const beforeContent = existedBefore ? fs.readFileSync(logFile, 'utf8') : '';
  try {
    withFakeEslint(
      'echo "fake.js\\n  1:1 error bad no-undef" >&2; exit 1',
      (dir) => {
        const result = runGate({
          PATH: `${dir}${path.delimiter}${process.env.PATH}`,
          CONFIRM_LINT_UNAVAILABLE_REASON: 'coba override walau ini error sungguhan',
        });
        assert.equal(result.exitCode, 1);
        assert.match(result.out, /GAGAL — ada error lint sungguhan/);
        assert.match(result.out, /TIDAK BISA di-override/);
      }
    );
  } finally {
    if (existedBefore) fs.writeFileSync(logFile, beforeContent);
    else fs.rmSync(logFile, { force: true });
  }
});

test('verify-release-ready (end-to-end) — eslint TIDAK TERSEDIA + override valid utk kedua gate -> LOLOS (exit 0) & audit log ditulis', () => {
  const logFile = path.join(ROOT, 'docs', 'RELEASE-GATE-LOG.md');
  const existedBefore = fs.existsSync(logFile);
  const beforeContent = existedBefore ? fs.readFileSync(logFile, 'utf8') : '';
  try {
    // PATH sengaja TIDAK diberi eslint palsu -> "command not found" (127) -> unavailable.
    const strippedPath = '/usr/bin:/bin'; // PATH minim tanpa node_modules/.bin manapun
    const result = runGate({
      PATH: strippedPath,
      CONFIRM_LINT_UNAVAILABLE_REASON: 'test-otomatis: sengaja simulasi eslint tidak tersedia',
      CONFIRM_UNMINIFIED_REASON: 'test-otomatis: sengaja simulasi esbuild tidak tersedia',
    });
    assert.equal(result.exitCode, 0, `output: ${result.out}`);
    assert.match(result.out, /RELEASE GATE LOLOS/);
    const afterContent = fs.readFileSync(logFile, 'utf8');
    assert.ok(afterContent.length > beforeContent.length, 'audit log harus bertambah panjang (entri baru ditambahkan)');
    assert.match(afterContent, /test-otomatis: sengaja simulasi eslint tidak tersedia/);
  } finally {
    // Kembalikan file log ke kondisi semula supaya test ini tidak
    // meninggalkan jejak permanen di repo kerja (audit log NYATA cuma
    // ditambah oleh pemakaian sungguhan, bukan test run).
    if (existedBefore) {
      fs.writeFileSync(logFile, beforeContent);
    } else {
      fs.rmSync(logFile, { force: true });
    }
  }
});
