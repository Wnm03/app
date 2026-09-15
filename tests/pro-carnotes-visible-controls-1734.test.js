const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-core.js'),'utf8');
const presenter=fs.readFileSync(path.join(root,'modules/vehicle/pro-mockup-presenter.js'),'utf8');

function carn(){const a=html.indexOf('<div class="page pro-vehicle-page" id="page-carnotes">');const b=html.indexOf('<!-- PAJAK & ZAKAT -->',a);return html.slice(a,b);}

test('1734: every Car Notes Pro mockup button has a declared interaction contract',()=>{
  const s=carn();
  const re=/<button\b[^>]*>/g; let m; const dead=[];
  while((m=re.exec(s))){const tag=m[0];if(!/(data-action|data-pro-goto|data-pro-vehicle|onclick)=/.test(tag))dead.push(tag);}
  assert.equal(dead.length,0,`dead buttons: ${dead.join(' | ')}`);
});

test('1734: feature-nav escape hatch remains wired to app-wide dashboard hub',()=>{
  const s=carn();
  assert.match(s,/data-action="proReturnToMainNav"/);
  assert.match(core,/function proReturnToMainNav\(\)/);
  assert.match(core,/showPage\('dashboard-hub'\)/);
  assert.match(core,/nav\.classList\.remove\('u-dnone'\)/);
});

test('1734: Pro search/notification/activity controls are not dead',()=>{
  const s=carn();
  assert.match(s,/data-action="openGlobalSearch"[^>]*aria-label="Cari"/);
  assert.match(s,/data-action="proOpenNotifications"[^>]*aria-label="Notifikasi"/);
  assert.match(s,/(data-action="proOpenActivity"|data-pro-goto="5")[^>]*aria-label="Aktivitas"/);
  assert.match(core,/function proOpenGlobalSearch\(\)/);
  assert.match(core,/function proOpenNotifications\(\)/);
  assert.match(core,/function proOpenActivity\(\)/);
});

test('1734: service/history chips drive real presenter filters',()=>{
  const s=carn();
  assert.match(s,/data-action="proMockupActivateGroup"[^>]*>Semua<\/button>/);
  assert.match(core,/setServiceFilter\(key\)/);
  assert.match(core,/setHistoryFilter\(key\)/);
  assert.match(presenter,/let serviceFilter='all'/);
  assert.match(presenter,/let historyFilter='all'/);
  assert.match(presenter,/window\.ProMockupPresenter=.*setServiceFilter/);
  assert.match(presenter,/window\.ProMockupPresenter=.*setHistoryFilter/);
});

test('1734: Pro screen navigation participates in browser/Android back history',()=>{
  assert.match(core,/function proMockupPushHistory\(n\)/);
  assert.match(core,/history\.pushState\(Object\.assign\(\{\},history\.state\|\|\{\},\{__carnotesPro:true,screen:Number\(n\)\|\|1\}\)/);
  assert.match(core,/addEventListener\('popstate'/);
  assert.match(core,/st\.\__carnotesPro&&document\.body/);
});

test('1734: workshop shell buttons fail safely instead of pretending to be live data',()=>{
  const s=carn();
  assert.match(s,/data-action="proMockupMapUnavailable"/);
  assert.match(core,/function proMockupMapUnavailable\(\)/);
  assert.match(core,/Data bengkel\/peta belum tersedia/);
});
