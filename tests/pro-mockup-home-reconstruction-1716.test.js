const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('pro-ui-layer.css','utf8');
const core=fs.readFileSync('modules/vehicle/vehicle-core.js','utf8');
const render=fs.readFileSync('modules/shared/modules-render-b.js','utf8');

test('Pro mockup home reconstructs dashboard shell instead of theme-only skin',()=>{
  for(const id of ['cnTab-beranda','proHomeVehicleName','proHomeKm','proHomeReminders','proHomeHealth','proHomeServiceStatus','proHomeFuelStatus','proCnBottomNav']) assert.match(html,new RegExp(`id=["']${id}["']`));
  assert.match(html,/pro-icon-button/);
  assert.match(html,/pro-home-actions/);
  assert.match(html,/pro-cn-bottom-nav/);
  assert.match(css,/pro-home-screen/);
  assert.match(css,/pro-home-vehicle/);
  assert.match(css,/pro-home-stats/);
  assert.match(css,/pro-home-actions/);
  assert.match(css,/pro-cn-bottom-nav/);
});

test('Pro navigation has five mockup destinations and keeps existing action contracts',()=>{
  assert.match(html,/data-args='\["beranda", "\$el"\]'/);
  assert.match(html,/data-args='\["servis", "\$el"\]'/);
  assert.match(html,/data-args='\["bbm", "\$el"\]'/);
  assert.match(html,/data-action="proOpenHistory"/);
  assert.match(html,/data-args='\["pajak", "\$el"\]'/);
  assert.match(core,/const CN_TAB_LABEL=\{beranda:/);
  assert.match(core,/function proOpenHistoryTab\(\)/);
  assert.match(core,/\['beranda','insight','bbm','servis','pajak','jalan'\]/);
  assert.match(render,/function renderProHome\(\)/);
  assert.match(render,/renderProHome\(\);/);
});
