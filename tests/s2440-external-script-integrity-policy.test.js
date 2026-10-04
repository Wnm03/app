const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const boot=fs.readFileSync(path.join(ROOT,'modules/shared/boot-early.js'),'utf8');
const debug=fs.readFileSync(path.join(ROOT,'modules/shared/debug-console.js'),'utf8');

test('S2440: Eruda debug loader is version-pinned',()=>{
  assert.match(boot,/cdn\.jsdelivr\.net\/npm\/eruda@3\.4\.3/);
  assert.match(debug,/cdn\.jsdelivr\.net\/npm\/eruda@3\.4\.3/);
  assert.doesNotMatch(boot,/cdn\.jsdelivr\.net\/npm\/eruda['"]\s*\)/);
  assert.doesNotMatch(debug,/cdn\.jsdelivr\.net\/npm\/eruda['"]\s*;/);
});

test('S2440: Google GSI remains an explicit non-versioned exception',()=>{
  assert.match(boot,/Google Identity Services is an intentional external-script exception/);
  assert.match(boot,/accounts\.google\.com\/gsi\/client/);
});

test('S2440: version-pinned CDN loaders cannot silently claim SRI',()=>{
  const zxing=boot.match(/function ensureZXing\(\)\{([^}]+)\}/)?.[1]||'';
  assert.match(zxing,/@zxing\/library@0\.21\.3/);
  assert.doesNotMatch(zxing,/sha(256|384|512)-/);
  const pdf=fs.readFileSync(path.join(ROOT,'modules/vehicle/vehicle-catalog-import.js'),'utf8');
  assert.match(pdf,/pdfjs-dist@3\.11\.174/);
  assert.doesNotMatch(pdf,/sha(256|384|512)-/);
});
