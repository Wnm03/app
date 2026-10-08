'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('N1: Dashboard Hub section reader is allowlisted and fail-closed',()=>{
  const src=read('modules/shared/features-helpers-global-security.js');
  const start=src.indexOf('function readDashboardHubSectionTab()');
  assert.notEqual(start,-1);
  const end=src.indexOf('\n}',start)+2;
  const ctx={localStorage:{getItem:()=>null}}; vm.createContext(ctx);
  vm.runInContext(src.slice(start,end)+';this.readDashboardHubSectionTab=readDashboardHubSectionTab;',ctx);
  assert.equal(ctx.readDashboardHubSectionTab(),'ringkasan');
  ctx.localStorage.getItem=()=> 'widget'; assert.equal(ctx.readDashboardHubSectionTab(),'widget');
  ctx.localStorage.getItem=()=> 'bogus'; assert.equal(ctx.readDashboardHubSectionTab(),'ringkasan');
  ctx.localStorage.getItem=()=>{throw new Error('blocked')}; assert.equal(ctx.readDashboardHubSectionTab(),'ringkasan');
});

test('N2/N3: dead Life OS toggle and duplicate AI registry leaves are gone',()=>{
  const html=read('index.html'), reg=read('modules/dashboard-hub/dashboard-hub-registry.js'), hub=read('modules/dashboard-hub/dashboard-hub.js');
  assert.doesNotMatch(html,/id="lifeOSVisibleToggle"/);
  assert.doesNotMatch(reg,/key: 'dash-lifeos'/);
  assert.doesNotMatch(reg,/key: 'ai-kategorisasi'/);
  assert.doesNotMatch(reg,/key: 'ai-scan-ocr'/);
  assert.doesNotMatch(hub,/lifeOSWrap: 'insight'/);
});

test('N4: resetDashboardLayout clears the section-tab UI preference',()=>{
  const src=read('modules/dashboard-hub/dashboard-hub-settings.js');
  assert.match(src,/removeItem\('dashHubSectionTab'\)/);
});

test('N7: Dana Titipan commitment UI does not toast/close success on false API return',()=>{
  const src=read('modules/finance/dana-titipan-portfolio-render-b.js');
  assert.match(src,/const result = DanaTitipanPortfolioAPI\.saveCommitment\(/);
  assert.match(src,/result === false \|\| \(result && result\.ok === false\)/);
  const block=src.slice(src.indexOf('save() {'),src.indexOf('  delete()',src.indexOf('save() {')));
  assert.ok(block.indexOf('result === false') < block.indexOf("closeModal('titipanCommitmentModal')"));
});

test('N8: debt reminder source skips debt when its active Bill is already represented',()=>{
  const src=read('modules/finance/piutang-utang-reminder.js');
  assert.match(src,/const activeBillIds = new Set\(/);
  assert.match(src,/activeBillDebtIds = new Set/);
  assert.match(src,/activeBillDebtIds\.has\(String\(dbt\.id\)\)/);
});

test('N9/N10: installment badge uses canonical chip class and payoff text is explicit',()=>{
  const src=read('modules/finance/piutang-utang.js');
  assert.match(src,/class="acc-chip">🛒 Cicilan Barang/);
  assert.match(src,/Estimasi lunas semua \(utang tanpa cicilan tidak dihitung\)/);
});

test('N11: Pension form keeps canonical parser and explicit invalid-input guard',()=>{
  const src=read('modules/shared/modules-calc.js');
  assert.match(src,/parsePensionAmount/);
  assert.match(src,/parsePzNum\(raw\)/);
  assert.match(src,/raw\.includes\('-'\)/);
});

test('N12/N13/N14: fuel trend avoids undefined, labels yearly estimate honestly, and does not repeat monthly cost',()=>{
  const src=read('modules/vehicle/fuel-trend-dashboard.js');
  assert.match(src,/km\/Liter Saat Ini', eff\.kmPerLiter == null \? '- · ' \+ escapeHtml\(String\(eff\.reason \|\| 'Data belum tersedia'\)\) : String\(eff\.kmPerLiter\)/);
  assert.match(src,/Estimasi setahun \(12 × bulanan\)/);
  assert.match(src,/Estimasi Pemakaian Bulanan', show\(trend\.monthlyUsage, r => `\$\{r\.estimatedLiter\} L`\)\)/);
});

test('N16: existing JSON exports have live UI actions for vehicle and fleet',()=>{
  const dash=read('modules/vehicle/fuel-dashboard.js'), cmp=read('modules/vehicle/fuel-compare.js');
  assert.match(dash,/data-action="FuelDashboard\.exportVehicleJSON"/);
  assert.match(cmp,/data-action="FuelCompare\.exportFleetJSON"/);
});
test('N17: checklist UI cycle uses a UI-only cursor and delegates transitions to SOT',()=>{
  const src=read('modules/vehicle/servis-checklist.js');
  assert.match(src,/_executionCycleCursor/);
  assert.match(src,/current==='COMPLETED' \? 'PLANNED'/);
  assert.match(src,/cursor===0 \? 'COMPLETED'/);
  assert.match(src,/: 'SKIPPED'/);
  assert.doesNotMatch(src,/ServiceChecklistExecutionSOT\.canTransition\s*=|canTransition\s*=/);
});

test('N18: pure UI/default/file-name date sites use local todayStr; record UTC sites are not globally replaced',()=>{
  const files=['modules/finance/transaksi.js','modules/finance/tx-transfer.js','modules/business/payroll-absensi.js','modules/shop/cobek-order.js','modules/shared/modules-render.js'];
  for(const f of files){const s=read(f); assert.doesNotMatch(s,/\.value=new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/,`${f} still has a direct UTC default form assignment`);}
  assert.match(read('modules/vehicle/fuel-export-utils.js'),/dateTag\(\)\{return \(typeof todayStr==='function'\?todayStr\(\):/);
});

test('N19: maintenance insight de-duplicates the same normalized item label',()=>{
  const src=read('modules/vehicle/fuel-maintenance-engine.js');
  assert.match(src,/seenMaintenanceItems = new Set\(\)/);
  assert.match(src,/seenMaintenanceItems\.has\(key\)/);
});

test('N5: attention card is read-only and uses existing readers only',()=>{
  const hub=read('modules/dashboard-hub/dashboard-hub.js');
  const start=hub.indexOf('const DashboardAttentionReadOnly');
  const end=hub.indexOf('// ================== DASHBOARD OWNERSHIP SUMMARY',start);
  const block=hub.slice(start,end);
  assert.match(block,/getBillStats/);
  assert.match(block,/computeServiceUrgency/);
  assert.match(block,/D\.backupHistory/);
  assert.doesNotMatch(block,/D\.transactions/);
  assert.doesNotMatch(block,/save\(/);
});

test('N6 partial: retired Summary/Analytics implementation and dead openAllFeatures are removed from live source',()=>{
  const hub=read('modules/dashboard-hub/dashboard-hub.js'), renderB=read('modules/shared/modules-render-b.js'), html=read('index.html');
  assert.doesNotMatch(hub,/const DashboardHubSummary/);
  assert.doesNotMatch(hub,/const DashboardHubAnalytics/);
  assert.doesNotMatch(hub,/openAllFeatures\(/);
  assert.doesNotMatch(renderB,/_safeRender\('DashboardHubSummary'/);
  assert.doesNotMatch(renderB,/_safeRender\('DashboardHubAnalytics'/);
  assert.doesNotMatch(hub,/const ShopMiniSummary/);
  assert.doesNotMatch(renderB,/ShopMiniSummary:'insight'/);
  assert.doesNotMatch(html,/id="dashboard-slim-v1879"/);
});
