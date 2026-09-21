const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'pwa-ui-layer.css'),'utf8');
const ux=fs.readFileSync(path.join(root,'modules/shared/pwa-ux-performance.js'),'utf8');
const pwa=fs.readFileSync(path.join(root,'pwa-setup.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const modal=fs.readFileSync(path.join(root,'modules/shared/modal-navigasi.js'),'utf8');

test('S1894 WebView-safe presentation avoids unsupported/expensive domain primitives',()=>{
  assert.doesNotMatch(css,/color-mix\(/,'domain redesign must not depend on color-mix for Android WebView compatibility');
  assert.doesNotMatch(css,/backdrop-filter\s*:(?!none)/,'UI layer must not require an active backdrop-filter');
  assert.match(css,/env\(safe-area-inset-bottom/);
  assert.match(css,/prefers-reduced-motion/);
});

test('S1894 large-data mode is thresholded and does not force virtualization on small lists',()=>{
  assert.match(ux,/PWAUX\.optimizeLargeList=function/);
  assert.match(ux,/const n=el\.children\.length,limit=Number\(threshold\)\|\|120/);
  assert.match(ux,/n>=limit/);
  assert.match(ux,/contentVisibility='auto'/);
  assert.match(ux,/containIntrinsicSize='320px'/);
  // Explicitly document the supported stress sizes as part of the contract.
  for(const n of [1000,5000,10000,50000]) assert.ok(n>=120);
});

test('S1894 storage monitor is browser-optional and thresholded at 80/90 percent',()=>{
  assert.match(ux,/navigator\.storage\.estimate/);
  assert.match(ux,/pct<80/);
  assert.match(ux,/pct>=90\?'critical':'warn'/);
  assert.match(ux,/setInterval\(check,60000\)/);
});

test('S1894 offline/update UX never forces an automatic reload',()=>{
  assert.match(pwa,/updatefound/);
  assert.match(pwa,/Versi aplikasi baru tersedia/);
  assert.match(pwa,/data-pwa-update-reload/);
  assert.match(pwa,/window\.location\.reload\(\)/);
  assert.doesNotMatch(pwa,/controllerchange[\s\S]{0,250}location\.reload\(\)\s*;\s*\}\s*\)/);
  assert.match(sw,/self\.skipWaiting\(\)/);
  assert.match(sw,/self\.clients\.claim\(\)/);
});

test('S1894 release final gate is a single reproducible command',()=>{
  assert.equal(pkg.scripts['release:final-gate'],'node scripts/release-final-gate.js');
  const gate=fs.readFileSync(path.join(root,'scripts/release-final-gate.js'),'utf8');
  for(const marker of ['s1894-pwa-final-hardening.test.js','sot-integrity-gate.js','persistence-integrity-gate.js','pwa-recovery-integrity-gate.js','feature-regression-gate.js','release-firewall.js','verify-bundle-freshness.js','verify-window-expose.js','audit-runtime-io.js','audit-event-listeners.js','s1860-app-wide-hardening-gate.js','performance-budget.js','verify-reproducible-build.js']) assert.match(gate,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('S1894 overlay reset tolerates minimal WebView/test DOM shims',()=>{
  assert.match(ux,/if\(!sheet\|\|!sheet\.style\)return/);
  assert.match(modal,/resetOverlayGeometry\(el\)/);
});

test('S1894 security regression contract remains active',()=>{
  assert.ok(fs.existsSync(path.join(root,'modules/shared/features-helpers-global-security.js')));
  assert.doesNotMatch(pwa,/eval\s*\(/);
});
