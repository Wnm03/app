const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');

test('S2101 history photo thumbnail occupies the explicit icon grid area on mobile',()=>{
  assert.match(css,/\.servis-history-item\s*>\s*\.servis-history-photo-thumb\s*\{[^}]*grid-area:\s*icon/s);
  assert.match(css,/\.servis-history-item\s*>\s*\.servis-history-photo-thumb\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/s);
});

test('S2101 narrow-phone photo thumbnail follows the 32px icon column',()=>{
  assert.match(css,/@media \(max-width:\s*380px\)[\s\S]*?\.servis-history-item\s*>\s*\.servis-history-photo-thumb\s*\{[^}]*width:\s*32px[^}]*height:\s*32px/s);
});
