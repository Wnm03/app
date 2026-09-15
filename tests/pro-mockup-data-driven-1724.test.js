const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const presenter=fs.readFileSync(path.join(root,'modules/vehicle/pro-mockup-presenter.js'),'utf8');
const render=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');

test('1724 Pro mockup binds all primary screens to live data placeholders',()=>{
  for(const id of ['proMockVehicleName','proMockKm','proMockKmSrc','proMockComponentName','proMockComponentGroup','proMockComponentStatus','proMockComponentRemaining','proMockComponentProgress','proMockFormService','proMockFormDate','proMockFormKm','proMockFormWorkshop']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(presenter,/function renderHome\(\)/);
  assert.match(presenter,/function renderChecklist\(\)/);
  assert.match(presenter,/function renderComponent\(\)/);
  assert.match(presenter,/function renderReminders\(\)/);
  assert.match(presenter,/function renderHistory\(\)/);
  assert.match(presenter,/function renderForm\(\)/);
  assert.match(presenter,/function renderFuel\(\)/);
  assert.match(presenter,/function renderMap\(\)/);
});

test('1724 presenter reuses existing vehicle/service/fuel engines and is wired into Car Notes render',()=>{
  for(const token of ['getVehicleKm','getVehicleKmSource','predictService','VehicleReminder.serviceReminders','FuelInsightEngine.getSummary','D.servisLogs','ServiceInputCatalog']) assert.match(presenter,new RegExp(token.replace(/[.]/g,'\\.')));
  assert.match(render,/ProMockupPresenter\.render\(\)/);
  assert.match(build,/modules\/vehicle\/pro-mockup-presenter\.js/);
});

test('1724 removes fabricated workshop claims from the Pro map screen',()=>{
  assert.match(presenter,/Data bengkel terdekat belum tersedia/);
  assert.match(presenter,/Belum ada sumber data bengkel terdekat/);
});
