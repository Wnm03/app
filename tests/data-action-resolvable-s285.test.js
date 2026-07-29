'use strict';
// tests/data-action-resolvable-s285.test.js — S285, tindak lanjut audit UI &
// Navigation Test: dispatcher klik global (features-helpers-global-security.js)
// resolve data-action="Owner.method" via window[Owner][method] SAAT RUNTIME
// SAJA -- kalau typo/method dihapus tapi data-action lupa diupdate, baru
// ketahuan pas user klik (toast "Tombol ini belum berfungsi"). Test ini
// mengotomasi cek yang sebelumnya cuma dilakukan manual (audit UI & Nav
// Test): scan SEMUA string data-action="..."/'...' di source (skip baris
// komentar `//`, supaya contoh pola di komentar dokumentasi -- mis.
// "data-action=\"setXxxTab\"" di dashboard-hub-registry.js -- tidak
// dihitung), lalu pastikan tiap method-name-nya punya minimal 1 pola
// definisi (method shorthand/property/assignment) di codebase. Longgar
// by design (bukan parser JS sungguhan, false-negative amat jarang) --
// tujuannya nangkep typo/nama-berubah, bukan verifikasi tipe/scope penuh.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'backups', 'tests', '.git', 'dist']);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const files = walk(ROOT, []);
const fileContents = files.map((f) => fs.readFileSync(f, 'utf8'));
const combinedSource = fileContents.join('\n');

function extractDataActions(files, contents) {
  const actions = new Set();
  const actionRe = /data-action=(["'])([A-Za-z_][A-Za-z0-9_.]*)\1/g;
  contents.forEach((src) => {
    src.split('\n').forEach((line) => {
      if (line.trim().startsWith('//')) return; // skip baris komentar
      let m;
      actionRe.lastIndex = 0;
      while ((m = actionRe.exec(line))) actions.add(m[2]);
    });
  });
  return [...actions];
}

function isResolvable(action, combinedSource) {
  const method = action.split('.').pop();
  const defRe = new RegExp(`(^|[^A-Za-z0-9_])${method}\\s*[:(=]`);
  return defRe.test(combinedSource);
}

test('data-action: berhasil menemukan file source & minimal 1 data-action', () => {
  assert.ok(files.length > 50);
  const actions = extractDataActions(files, fileContents);
  assert.ok(actions.length > 50, `hanya ketemu ${actions.length} data-action, kemungkinan regex/scan salah`);
});

test('data-action: setiap target resolve ke definisi fungsi/method yang ada (cegah tombol mati)', () => {
  const actions = extractDataActions(files, fileContents);
  const broken = actions.filter((a) => !isResolvable(a, combinedSource));
  assert.deepEqual(broken, [], `data-action tanpa definisi ditemukan: ${broken.join(', ')}`);
});
