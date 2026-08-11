'use strict';
// tests/verify-window-expose-s423.test.js — Sesi 423
//
// Test untuk gate baru scripts/verify-window-expose.js (lint otomatis bug
// class s345-s348: modul dipakai lewat data-action="X.method" tapi tidak
// pernah window.X=X). Dua bagian:
//
//   1. Regression guard atas CODEBASE NYATA -- verify() dijalankan
//      terhadap repo apa adanya, harus 0 failures. Kalau sesi masa depan
//      menambah modul baru dengan data-action tapi lupa window-expose,
//      test ini yang pertama merah (sebelum sempat ke-build/rilis).
//   2. Unit test murni fungsi-fungsi penyusun (findTopLevelObjectDecls,
//      findDataActionPrefixes, hasWindowExpose) pakai file sementara
//      (os.tmpdir()) -- supaya logic parsing-nya sendiri tervalidasi
//      independen dari isi repo saat ini (yang bisa berubah).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  verify,
  findTopLevelObjectDecls,
  findDataActionPrefixes,
  hasWindowExpose,
} = require('../scripts/verify-window-expose.js');

test('verify-window-expose — codebase saat ini: 0 modul data-action tanpa window-expose', () => {
  const result = verify();
  const detail = result.failures
    .map((f) => `${f.name} (${f.declFile})`)
    .join(', ');
  assert.equal(
    result.failures.length,
    0,
    `Ditemukan modul dipakai lewat data-action tapi belum di-window-expose: ${detail}`
  );
});

test('verify-window-expose — acceptance: minimal puluhan modul benar-benar diperiksa (bukan 0 karena scan salah)', () => {
  const result = verify();
  // Sesi 423: 62 modul terverifikasi saat gate ini ditulis. Ambang di
  // bawah itu dipakai supaya test tidak rapuh kalau nama modul berubah,
  // tapi tetap menangkap kalau scan-nya rusak total (mis. path salah,
  // balik 0).
  assert.ok(
    result.checked.length >= 50,
    `Modul yang diperiksa cuma ${result.checked.length} -- kemungkinan file scan rusak (harusnya >=50)`
  );
  assert.ok(result.totalDeclared > 0);
  assert.ok(result.totalScanned > 0);
});

// --- Unit test fungsi penyusun, pakai file sementara ---------------------

function withTempFile(content, ext, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-window-expose-test-'));
  const file = path.join(dir, `sample${ext}`);
  fs.writeFileSync(file, content, 'utf8');
  try {
    return fn(file, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('findTopLevelObjectDecls — menangkap const/let/var X={ di top level, abaikan yang nested', () => {
  const src = `
'use strict';
const Foo = { a: 1 };
function wrap() {
  const NestedShouldBeIgnored = { b: 2 };
}
let Bar = {
  c: 3,
};
var Baz = {};
const notObject = 5;
`;
  withTempFile(src, '.js', (file, dir) => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    const names = findTopLevelObjectDecls(rel);
    assert.deepEqual(names.sort(), ['Bar', 'Baz', 'Foo']);
  });
});

test('findDataActionPrefixes — menangkap prefix dari data-action="X.method" (single & double quote)', () => {
  const src = `<button data-action="Foo.doThing">A</button><button data-action='Bar.other'>B</button>`;
  withTempFile(src, '.html', (file) => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    const names = findDataActionPrefixes(rel);
    assert.deepEqual([...names].sort(), ['Bar', 'Foo']);
  });
});

test('hasWindowExpose — mendeteksi 3 gaya penulisan window.X=X', () => {
  withTempFile(`window.Foo=Foo;`, '.js', (file) => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    assert.equal(hasWindowExpose(rel, 'Foo'), true);
  });
  withTempFile(`window['Bar'] = Bar;`, '.js', (file) => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    assert.equal(hasWindowExpose(rel, 'Bar'), true);
  });
  withTempFile(`if(typeof Baz!=='undefined') window["Baz"] = Baz;`, '.js', (file) => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    assert.equal(hasWindowExpose(rel, 'Baz'), true);
  });
  withTempFile(`const Qux = {};`, '.js', (file) => {
    const rel = path.relative(path.join(__dirname, '..'), file);
    assert.equal(hasWindowExpose(rel, 'Qux'), false);
  });
});

test('verify() (end-to-end pakai fixture sendiri) — menangkap kasus s345-s348 persis: dipakai data-action, tidak di-expose', () => {
  // Simulasikan struktur repo minimal: 1 file .js (modul + expose-nya
  // sengaja dihapus) + 1 file .html (pemakai data-action) di dalam
  // ROOT asli, lalu jalankan verify() manual (bukan lewat modul module
  // exports singleton) dengan file sementara diposisikan di dalam repo
  // ROOT supaya path relatif konsisten dengan cara verify() bekerja.
  const ROOT = path.join(__dirname, '..');
  const tmpJs = path.join(ROOT, '__tmp_s423_fixture_module.js');
  const tmpHtml = path.join(ROOT, '__tmp_s423_fixture_usage.html');
  fs.writeFileSync(tmpJs, `'use strict';\nconst FixtureNotExposed = { run(){} };\n`, 'utf8');
  fs.writeFileSync(tmpHtml, `<button data-action="FixtureNotExposed.run">Go</button>`, 'utf8');
  try {
    const result = verify();
    const found = result.failures.find((f) => f.name === 'FixtureNotExposed');
    assert.ok(found, 'FixtureNotExposed harusnya terdeteksi sebagai failure (dipakai data-action, tidak di-expose)');
  } finally {
    fs.rmSync(tmpJs, { force: true });
    fs.rmSync(tmpHtml, { force: true });
  }
});
