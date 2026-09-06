'use strict';
/**
 * modal-html-index-drift.test.js — versi `npm test` dari lint "MODAL_HTML
 * index drift" yang dipakai `scripts/build.js` sbg gate blocking.
 *
 * Sebelum SA10b, file ini disebut di komentar `scripts/build.js` ("Versi
 * test unit ada di tests/modal-html-index-drift.test.js") tapi TIDAK PERNAH
 * DIBUAT -- jadi drift index modal cuma ketahuan pas `node scripts/build.js`
 * dijalankan, tidak ikut ke-cover kalau orang cuma jalankan `npm test`.
 * SA10b mengekstrak logic-nya ke scripts/lib/modal-html-index-drift.js
 * (dipakai bareng build.js) supaya test ini & gate build.js selalu ngecek
 * pola yang SAMA persis, tidak bisa diam-diam drift satu sama lain.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { checkModalHtmlIndexDrift } = require('../scripts/lib/modal-html-index-drift');

const ROOT = path.join(__dirname, '..');

test('checkModalHtmlIndexDrift() — repo asli saat ini harus "tidak ada drift" (0 masalah)', () => {
  const problems = checkModalHtmlIndexDrift(ROOT);
  assert.deepEqual(problems, [], `Ditemukan drift MODAL_HTML index yang tidak terduga:\n${problems.join('\n')}`);
});

test('checkModalHtmlIndexDrift() — mendeteksi id overlay yang tidak cocok dgn komentar modal:xxx (pola SA10a/modal-write.js)', () => {
  const fakeRoot = makeFakeRoot({
    'modules/shared/modals.js': `var MODAL_HTML = ['<div class="overlay" id="modalAsli">isi</div>'];`,
    'index.html': `<script src="modules/shared/modal-write.js?v=1" data-modal-index="0"></script><!-- modal:modalSalahNama -->`,
  });
  const problems = checkModalHtmlIndexDrift(fakeRoot, ['index.html']);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /TIDAK COCOK dgn komentar/);
});

test('checkModalHtmlIndexDrift() — mendeteksi index di luar jangkauan array MODAL_HTML', () => {
  const fakeRoot = makeFakeRoot({
    'modules/shared/modals.js': `var MODAL_HTML = ['<div class="overlay" id="satuSatunya">isi</div>'];`,
    'index.html': `<script src="modules/shared/modal-write.js?v=1" data-modal-index="5"></script><!-- modal:satuSatunya -->`,
  });
  const problems = checkModalHtmlIndexDrift(fakeRoot, ['index.html']);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /di luar jangkauan array/);
});

test('checkModalHtmlIndexDrift() — pola lama (document.write inline) tetap dikenali, tidak cuma pola SA10a', () => {
  const fakeRoot = makeFakeRoot({
    'modules/shared/modals.js': `var MODAL_HTML = ['<div class="overlay" id="modalLama">isi</div>'];`,
    'index.html': `<script>document.write(MODAL_HTML[0]);</script><!-- modal:modalLama -->`,
  });
  const problems = checkModalHtmlIndexDrift(fakeRoot, ['index.html']);
  assert.deepEqual(problems, []);
});

test('checkModalHtmlIndexDrift() — MODAL_HTML bukan array -> 1 masalah generik, tidak throw', () => {
  const fakeRoot = makeFakeRoot({
    'modules/shared/modals.js': `var MODAL_HTML = 'bukan array';`,
    'index.html': `<!-- tidak relevan -->`,
  });
  const problems = checkModalHtmlIndexDrift(fakeRoot, ['index.html']);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /tidak ditemukan\/bukan array/);
});

// ---------------------------------------------------------------------------
// helper: bikin direktori sementara dgn struktur file minimal spy
// ---------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');

function makeFakeRoot(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'modal-drift-test-'));
  fs.mkdirSync(path.join(dir, 'modules', 'shared'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, rel), content, 'utf8');
  }
  return dir;
}
