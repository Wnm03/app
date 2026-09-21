const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'modules/dashboard-hub/dashboard-insight-dedup.js'), 'utf8');
function el(id){ return {id, hidden:false, dataset:{}, setAttribute(){}, removeAttribute(){}, querySelector(){return this;}, textContent:''}; }
function run(activeId){
  const nodes={};
  ['findashWrap','vehdashWrap','shopBusinessEngineWrap','crossBriefWrap','financialHealthScoreWrap','fuelDashWrap','shopInsightCard','recommendationPanelWrap'].forEach(id=>nodes[id]=el(id));
  nodes.crossBriefWrap.textContent='Insight lintas domain'; nodes.shopBusinessEngineWrap.textContent='Omzet'; nodes.shopInsightCard.textContent='Insight toko';
  const active=el(activeId); active.classList={};
  const document={
    documentElement:{dataset:{}},
    body:{},
    querySelector(sel){ if(sel==='.page.active[id^="page-"]') return active; return null; },
    getElementById(id){return nodes[id]||null;},
    querySelectorAll(sel){ if(sel==='[data-dashboard-role-hidden="1"]') return Object.values(nodes).filter(n=>n.dataset.dashboardRoleHidden==='1'); return []; },
    addEventListener(){}
  };
  const sandbox={document,window:{},console,MutationObserver:undefined,requestAnimationFrame:null,setTimeout,clearTimeout};
  vm.runInNewContext(source,sandbox);
  return {D:sandbox.window.DashboardInsightDedup,nodes,document};
}
let x=run('page-keuangan'); x.D.run();
assert.strictEqual(x.nodes.findashWrap.hidden,false);
assert.strictEqual(x.nodes.financialHealthScoreWrap.hidden,false);
assert.strictEqual(x.nodes.vehdashWrap.hidden,true);
assert.strictEqual(x.nodes.shopBusinessEngineWrap.hidden,true);

x=run('page-carnotes'); x.D.run();
assert.strictEqual(x.nodes.vehdashWrap.hidden,false);
assert.strictEqual(x.nodes.findashWrap.hidden,true);
assert.strictEqual(x.nodes.shopBusinessEngineWrap.hidden,true);

x=run('page-shop'); x.D.run();
assert.strictEqual(x.nodes.shopBusinessEngineWrap.hidden,false);
assert.strictEqual(x.nodes.shopInsightCard.hidden,false);
assert.strictEqual(x.nodes.findashWrap.hidden,true);
assert.strictEqual(x.nodes.vehdashWrap.hidden,true);

x=run('page-dashboard-hub'); x.D.run();
assert.strictEqual(x.nodes.crossBriefWrap.hidden,false);
assert.strictEqual(x.nodes.findashWrap.hidden,true);
assert.strictEqual(x.nodes.vehdashWrap.hidden,true);


// pindah halaman: widget finance yang sebelumnya disembunyikan harus kembali terlihat
x=run('page-keuangan'); x.D.run();
assert.strictEqual(x.nodes.vehdashWrap.hidden,true);
x.document.querySelector = function(sel){ if(sel==='.page.active[id^="page-"]') return null; return null; };
// simulasi kembali ke Vehicle dengan elemen active baru
const vehicleActive=el('page-carnotes');
x.document.querySelector = function(sel){ if(sel==='.page.active[id^="page-"]') return vehicleActive; return null; };
x.D.run();
assert.strictEqual(x.nodes.vehdashWrap.hidden,false);
assert.strictEqual(x.nodes.findashWrap.hidden,true);

console.log('dashboard-role-visibility: 5/5 PASS');
