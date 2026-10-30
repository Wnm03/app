'use strict';
// Pemindai bersama: handler inline SUNGGUHAN (atribut HTML on*="...") vs handler terdelegasi data-on* (aman CSP).
// `data-onclick`, `data-onchange`, dst. dijalankan dispatcher bernama (features-helpers-global-security.js) tanpa
// new Function()/eval, jadi BUKAN inline handler. Baris komentar (// atau *) diabaikan.
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const EV = 'click|dblclick|change|input|blur|focus|submit|keyup|keydown|keypress|load|error|mouseover|mouseout|touchstart|touchend';
// atribut sungguhan: didahului spasi/kutip/`<tag`, BUKAN '-' (data-on…), '.' (el.onclick=) atau huruf; nilainya diawali kutip.
const REAL = new RegExp('(?<![\\w.\\-])on(?:' + EV + ')\\s*=\\s*\\\\?[\'"]', 'gi');
const DELEGATED = new RegExp('\\bdata-on(?:' + EV + ')\\s*=', 'gi');

function runtimeFiles() {
  const build = fs.readFileSync(path.join(ROOT, 'scripts/build.js'), 'utf8');
  const manifest = build.slice(build.indexOf('const GROUP_A = ['), build.indexOf('const ALL_SOURCE = [...GROUP_A, ...GROUP_B];'));
  const files = [...manifest.matchAll(/'([^']+\.js)'/g)].map(m => m[1]);
  // Hanya sumber yang benar-benar dibundel + halaman HTML. modules/{asset,shop}/modals.js = salinan basi di luar build (kandidat hapus), sengaja tidak dipindai.
  for (const f of ['index.html', 'app_production.html']) files.push(f);
  return [...new Set(files)].filter(f => fs.existsSync(path.join(ROOT, f)));
}
const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, '').split('\n').map(l => (/^\s*(\/\/|\*|\/\*)/.test(l) ? '' : l)).join('\n');

function scan() {
  const rows = [];
  for (const f of runtimeFiles()) {
    const s = stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    const real = [...s.matchAll(REAL)].length, delegated = [...s.matchAll(DELEGATED)].length;
    if (real || delegated) rows.push({ file: f, real, delegated });
  }
  return rows;
}
module.exports = { scan, runtimeFiles };
