'use strict';
// S2041.1 — behavior tests (fake DOM + vm) for part-crud-s2041.js. Covers audit findings C1,C2,C3,R1,R2,R3,W1,W2.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const vm=require('vm');const path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/part-crud-s2041.js'),'utf8');

function makeEnv(partsStock,extra){
  const els={},order=[],timers=[];
  const mk=(id,tag)=>{const el={id,tag,dataset:{},style:{},value:'',checked:false,className:'',textContent:'',options:[],listeners:{},attrs:{},
    addEventListener(t,f){(this.listeners[t]=this.listeners[t]||[]).push(f)},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},
    insertAdjacentElement(pos,n){if(n.id){els[n.id]=n;order.push(n.id)}return n},closest(){return null},querySelectorAll(){return[]},
    set innerHTML(h){this._html=h;if(tag==='select'){const re=/<option value="([^"]*)">([^<]*)<\/option>/g;let m;this.options=[];while((m=re.exec(h)))this.options.push({value:m[1].replace(/&amp;/g,'&'),textContent:m[2]});if(!this.options.some(o=>o.value===this.value))this.value=this.options[0]?this.options[0].value:'';}
      else{const r=/id="([^"]+)"/g;let x;while((x=r.exec(h)))ensure(x[1],'input');}},get innerHTML(){return this._html}};return el};
  const ensure=(id,tag)=>{if(!els[id]){els[id]=mk(id,tag||'div');order.push(id)}return els[id]};
  const select=(id,html,val)=>{const e=ensure(id,'select');e.innerHTML=html;e.value=val===undefined?(e.options[0]?e.options[0].value:''):val;return e};
  const D={vehicles:[{id:'v1'},{id:'v2'}],sparepartCats:[{id:'c1',name:'Oli',masterCategoryId:'m1'},{id:'c2',name:'Busi'}],partsStock,servisLogs:[],transactions:[]};
  let ensureCalls=0,saves=0;
  const Sparepart={stockEditIdx:null,
    openStockModal(idx){this.stockEditIdx=(typeof idx==='number')?idx:null},
    saveStock(){const name=ensure('stockName').value.trim();if(!name)return;
      if(this.stockEditIdx!==null)Object.assign(D.partsStock[this.stockEditIdx],{name,qty:parseFloat(ensure('stockQty').value)||0});
      else{D.partsStock.push({id:'st_'+D.partsStock.length+'_n',name,catId:'c1',code:'INT-001',qty:parseFloat(ensure('stockQty').value)||0,vehicleId:'v1'});ensureCalls++;}},
    async delStock(i){D.partsStock.splice(i,1)},
    async removeAllStockConfirm(){D.partsStock=D.partsStock.filter(p=>false)},
    isPartForVehicle(p,vid){if(!vid||!p)return true;if(p.vehicleId)return p.vehicleId===vid;return true},
    calcDashboardStats(parts){return{count:parts.length}},
    renderStockList(){this.rendered=(this.rendered||0)+1;this.lastVisible=D.partsStock.filter(p=>this.isPartForVehicle(p,'v1')).map(p=>p.id)}};
  const document={getElementById:id=>els[id]||null,createElement:t=>mk('',t),readyState:'complete',addEventListener(){},body:{},querySelectorAll:()=>[]};
  const sb=Object.assign({D,document,console,setTimeout:(f)=>{timers.push(f);return 1},MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{}},
    curVehicleId:'v1',escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
    save(){saves++},toast(){},askConfirm:async()=>true,Sparepart,Servis:{populatePartSelect(){}}},extra||{});
  sb.window=sb;vm.createContext(sb);vm.runInContext(SRC,sb);
  const flush=async()=>{while(timers.length)timers.splice(0).forEach(f=>f());await Promise.resolve();};
  return{D,els,order,select,ensure,Sparepart,api:sb.PartCrudS2041,flush,sb,stats:()=>({ensureCalls,saves})};
}
const P=(o)=>Object.assign({vehicleId:'v1',qty:1,catId:'c1'},o);

test('C1: service picker keeps selected part when qty=0 or archived (edit old service)',async()=>{
  const e=makeEnv([P({id:'pA',name:'Oli',qty:0}),P({id:'pB',name:'Filter',qty:3}),P({id:'pX',name:'Lama',qty:0,isArchived:true})]);
  e.select('servisPartId','<option value="">Tidak pakai stok</option><option value="pA">Oli</option>','pA');
  e.api.install();e.api.refreshAll();await e.flush();
  assert.strictEqual(e.els.servisPartId.value,'pA');
  assert.ok(e.els.servisPartId.options.some(o=>o.value==='pA'&&/habis/.test(o.textContent)));
  assert.ok(!e.els.servisPartId.options.some(o=>o.value==='pX'),'archived not offered normally');
  e.els.servisPartId.value='pX';e.els.servisPartId.options.push({value:'pX',textContent:'Lama'});
  e.api.PartPicker.refresh('servisPartId');
  assert.strictEqual(e.els.servisPartId.value,'pX');
  assert.ok(e.els.servisPartId.options.some(o=>o.value==='pX'&&/arsip/.test(o.textContent)));
});

test('C2: purchase picker keeps "__new__" sentinel and its selection',async()=>{
  const e=makeEnv([P({id:'pA',name:'Oli',qty:0}),P({id:'pB',name:'Filter',qty:3})]);
  e.select('txStockItem','<option value="__new__">➕ Sparepart Baru</option><option value="pA">Oli</option>','__new__');
  e.api.install();e.api.refreshAll();await e.flush();
  assert.strictEqual(e.els.txStockItem.options[0].value,'__new__');
  assert.strictEqual(e.els.txStockItem.value,'__new__');
  assert.ok(e.els.txStockItem.options.some(o=>o.value==='pA'),'purchase default OFF: qty 0 part still offered');
});

test('defaults: service ON / purchase OFF; strict category+component; archived hidden; vehicle scoped',async()=>{
  const e=makeEnv([P({id:'a',name:'A',qty:0,serviceComponentId:'k1'}),P({id:'b',name:'B',qty:2,serviceComponentId:'k1'}),P({id:'c',name:'C',qty:2}),P({id:'d',name:'D',qty:2,isArchived:true,serviceComponentId:'k1'}),P({id:'e',name:'E',qty:2,vehicleId:'v2',serviceComponentId:'k1'})]);
  e.select('servisPartId','<option value="">-</option>','');e.select('txStockItem','<option value="__new__">n</option>','__new__');
  e.api.install();e.api.refreshAll();await e.flush();
  assert.strictEqual(e.els.servisPartId_availableOnly.checked,true);
  assert.strictEqual(e.els.txStockItem_availableOnly.checked,false);
  const ids=(x)=>e.api.PartPicker.list(x).map(p=>p.id).sort().join(',');
  assert.strictEqual(ids({vehicleId:'v1',componentId:'k1'}),'a,b');
  assert.strictEqual(ids({vehicleId:'v1',componentId:'k1',onlyAvailable:true}),'b');
  assert.strictEqual(ids({vehicleId:'v1',categoryId:'c2'}),'');
});

test('idempotent: repeated refresh adds no elements',async()=>{
  const e=makeEnv([P({id:'a',name:'A'})]);e.select('servisPartId','<option value="">-</option>','');e.select('txStockItem','<option value="__new__">n</option>','__new__');
  e.api.install();e.api.refreshAll();await e.flush();const n=e.order.length;
  for(let i=0;i<3;i++){e.api.refreshAll();await e.flush();}
  assert.strictEqual(e.order.length,n);
});

test('load guard: evaluating the file twice keeps one API instance',()=>{
  const e=makeEnv([]);const first=e.sb.PartCrudS2041;vm.runInContext(SRC,e.sb);assert.strictEqual(e.sb.PartCrudS2041,first);
});

test('R1: new manual part persists OEM+component, no duplicate catalog call, no context leak',async()=>{
  const e=makeEnv([]);['stockName','stockQty','stockCode'].forEach(i=>e.ensure(i,'input'));e.ensure('stockCatId','input').value='c1';
  e.api.install();
  e.api.PartPicker.openAdd({componentId:'comp_ctx',categoryId:'c1'});await e.flush();
  e.ensure('stockName').value='Part Baru';e.ensure('stockQty').value='2';e.ensure('stockOemCode','input').value='15410-k1z';
  e.Sparepart.saveStock();await e.flush();
  const p=e.D.partsStock[0];
  assert.strictEqual(p.oemCode,'15410-K1Z');assert.strictEqual(p.serviceComponentId,'comp_ctx');
  assert.strictEqual(e.stats().ensureCalls,1,'orig saveStock catalog path runs once');
  e.Sparepart.openStockModal(null);e.ensure('stockServiceComponentId','select').value='';await e.flush();
  assert.strictEqual(e.els.stockServiceComponentId.value,'','stale context must not prefill later plain Add');
});

test('R1: validation failure (empty name) touches nothing',async()=>{
  const e=makeEnv([P({id:'a',name:'A',qty:5})]);['stockName','stockQty'].forEach(i=>e.ensure(i,'input'));
  e.api.install();e.Sparepart.openStockModal(0);await e.flush();e.ensure('stockName').value='';e.ensure('stockQty').value='9';
  e.Sparepart.saveStock();assert.strictEqual(e.D.partsStock[0].adjustmentHistory,undefined);
});

test('R3/W1: manual qty edit and archive both journal qtyBefore/After/delta/reason/source/date',async()=>{
  const e=makeEnv([P({id:'a',name:'A',qty:5,priceHistory:[{date:'2026-01-01',price:1000,qty:5}],price:1000})]);['stockName','stockQty'].forEach(i=>e.ensure(i,'input'));
  e.api.install();e.Sparepart.openStockModal(0);await e.flush();e.ensure('stockName').value='A';e.ensure('stockQty').value='3';e.Sparepart.saveStock();
  let h=e.D.partsStock[0].adjustmentHistory;assert.strictEqual(h.length,1);
  assert.deepStrictEqual([h[0].qtyBefore,h[0].qtyAfter,h[0].delta,h[0].reason,h[0].source],[5,3,-2,'manual-edit','stock-modal']);assert.ok(h[0].date);
  await e.Sparepart.delStock(0);const p=e.D.partsStock[0];h=p.adjustmentHistory;
  assert.strictEqual(p.isArchived,true);assert.strictEqual(p.qty,0);assert.strictEqual(p.archivedQtyBefore,3);
  assert.deepStrictEqual([h[1].qtyBefore,h[1].qtyAfter,h[1].delta,h[1].reason],[3,0,-3,'archive']);
  assert.strictEqual(p.priceHistory.length,1,'price history intact');assert.strictEqual(p.price,1000);
  assert.ok(p.archivedAt&&p.archivedReason);
});

test('archive vs hard delete: unreferenced part is deleted, referenced one archived',async()=>{
  const e=makeEnv([P({id:'free',name:'Free'}),P({id:'used',name:'Used'})]);e.D.servisLogs.push({id:'s1',usedPartId:'used'});
  e.api.install();await e.Sparepart.delStock(0);assert.deepStrictEqual(e.D.partsStock.map(p=>p.id),['used']);
  await e.Sparepart.delStock(0);assert.strictEqual(e.D.partsStock.length,1);assert.strictEqual(e.D.partsStock[0].isArchived,true);
  assert.ok(e.D.servisLogs[0].usedPartId==='used','service history reference untouched');
});

test('C3: "Hapus Semua" never hard-deletes parts with history',async()=>{
  const e=makeEnv([P({id:'free',name:'Free'}),P({id:'used',name:'Used',qty:4}),P({id:'tx',name:'Tx'})]);
  e.D.servisLogs.push({id:'s1',usedPartId:'used'});e.D.transactions.push({id:'t1',partStockId:'tx'});
  e.api.install();await e.Sparepart.removeAllStockConfirm();
  assert.deepStrictEqual(e.D.partsStock.map(p=>p.id).sort(),['tx','used']);
  assert.ok(e.D.partsStock.every(p=>p.isArchived&&p.qty===0));
  assert.strictEqual(e.D.partsStock.find(p=>p.id==='used').archivedQtyBefore,4);
});

test('R2: archived hidden from normal vehicle matching and dashboard; toggle only during list render; restore works',async()=>{
  const e=makeEnv([P({id:'a',name:'A'}),P({id:'z',name:'Z',isArchived:true,qty:0})]);e.api.install();
  assert.strictEqual(e.Sparepart.isPartForVehicle(e.D.partsStock[1],'v1'),false);
  assert.strictEqual(e.Sparepart.calcDashboardStats(e.D.partsStock).count,1);
  e.Sparepart.renderStockList();assert.deepStrictEqual(e.Sparepart.lastVisible,['a']);
  assert.strictEqual(e.api.restorePart('z'),true);
  assert.strictEqual(e.D.partsStock[1].isArchived,false);
  assert.strictEqual(e.D.partsStock[1].adjustmentHistory.slice(-1)[0].reason,'restore');
  assert.strictEqual(e.Sparepart.isPartForVehicle(e.D.partsStock[1],'v1'),true);
});

test('security: part names with HTML are escaped in picker options',async()=>{
  const e=makeEnv([P({id:'x',name:'<img src=x onerror=alert(1)>',qty:1})]);e.select('servisPartId','<option value="">-</option>','');
  e.api.install();e.api.refreshAll();await e.flush();
  const html=e.els.servisPartId.innerHTML;assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
});
