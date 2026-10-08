const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const productionFiles = [];
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    if(['node_modules','.git','backups','.test-checkpoints'].includes(name)) continue;
    const full=path.join(dir,name);
    const st=fs.statSync(full);
    if(st.isDirectory()) walk(full);
    else if(/\.(js|html|css)$/.test(name) && !/\.min\.js$/.test(name)) productionFiles.push(full);
  }
}
walk(ROOT);

function sourceWithoutTestsAndDocs(file){
  if(/(^|[\\/])(tests|docs)([\\/]|$)/.test(file)) return '';
  return fs.readFileSync(file,'utf8');
}

test('N5: legacy dashboard renderers with no live target/caller are retired',()=>{
  const retired=[
    'renderDashCashflowForecast',
    'renderDashboardBills',
    'renderDashboardBackupReminder',
    'dismissBackupReminder',
    'renderDashLaporanMini',
  ];
  const hay=productionFiles.map(sourceWithoutTestsAndDocs).join('\n');
  for(const name of retired){
    assert.equal(hay.includes(`function ${name}(`),false,`${name} definition must be retired`);
    assert.equal(new RegExp(`\\b${name}\\s*\\(`).test(hay),false,`${name} must have no production call site`);
  }
  for(const id of ['dashCashflowForecastCard','dashBillCard','dashBackupReminderCard','dashLapKatMini','dashLapTrend']){
    const html=['index.html','app_production.html'].map(f=>path.join(ROOT,f)).filter(fs.existsSync)
      .map(f=>fs.readFileSync(f,'utf8')).join('\n');
    assert.equal(html.includes(`id="${id}"`),false,`retired target #${id} must not exist in production HTML`);
  }
});

test('N5: renderers with live callers are retained rather than deleted speculatively',()=>{
  const names={
    renderDashboardServisReminder:['car-notes.js','modules/vehicle/sparepart-servis.js'],
    renderDashboardSewaKiosReminder:['modules/business/sewakios.js'],
    renderDashAccList:['modules/finance/akun.js','modules/shared/scan-ocr-b.js','modules/asset/aset.js','modules/asset/aset-owners.js'],
  };
  for(const [name,files] of Object.entries(names)){
    const definition=fs.readFileSync(path.join(ROOT,'modules/shared',name==='renderDashAccList'||name==='renderDashboardServisReminder'||name==='renderDashboardSewaKiosReminder'?'modules-render.js':'modules-render.js'),'utf8');
    assert.match(definition,new RegExp(`function ${name}\\s*\\(`));
    const callers=files.filter(f=>fs.readFileSync(path.join(ROOT,f),'utf8').includes(name+'('));
    assert.ok(callers.length>0,`${name} has no proven live caller`);
  }
});
