'use strict';
// S2041.2 — regresi performa: #servisPartId di build produksi adalah <input type="hidden"> (tanpa .options).
// Dulu refreshSelect menulis innerHTML ke elemen itu di SETIAP refreshAll(): nextHtml!==currentHtml selalu benar
// karena oldOpts kosong -> mutasi DOM -> MutationObserver body (boot) memanggil refreshAll lagi -> loop ±11 mutasi/dtk.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const vm=require('vm');const path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/part-crud-s2041.js'),'utf8');
const STOCK_SOT_SRC=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/stock-command-sot.js'),'utf8');

function makeEnv(kind){
  const els={},timers=[];let writes=0;
  const mk=(id,tag)=>{const el={id,tag,dataset:{},style:{},value:'',checked:false,className:'',textContent:'',listeners:{},
    addEventListener(){},insertAdjacentElement(pos,n){if(n.id)els[n.id]=n;return n},closest(){return null},querySelectorAll(){return[]},
    set innerHTML(h){writes++;this._html=h;if(tag==='select'){const re=/<option value="([^"]*)">([^<]*)<\/option>/g;let m;this.options=[];while((m=re.exec(h)))this.options.push({value:m[1],textContent:m[2]});}else{const r=/id="([^"]+)"/g;let x;while((x=r.exec(h)))if(!els[x[1]])els[x[1]]=mk(x[1],'input');}},
    get innerHTML(){return this._html}};
    if(tag==='select')el.options=[]; // <input> sengaja TANPA properti options (meniru HTMLInputElement)
    return el};
  els.servisPartId=mk('servisPartId',kind);
  const document={getElementById:id=>els[id]||null,createElement:t=>mk('',t),readyState:'complete',addEventListener(){},body:{},querySelectorAll:()=>[]};
  const D={vehicles:[{id:'v1'}],sparepartCats:[{id:'c1',name:'Oli'}],partsStock:[{id:'pA',name:'Oli',qty:2,catId:'c1',vehicleId:'v1'}],servisLogs:[],transactions:[]};
  const sb={D,document,console,setTimeout:f=>{timers.push(f);return 1},MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{}},curVehicleId:'v1',
    escapeHtml:s=>String(s),save(){},toast(){},askConfirm:async()=>true,
    Sparepart:{openStockModal(){},isPartForVehicle:()=>true,renderStockList(){},calcDashboardStats:p=>({count:p.length})},Servis:{populatePartSelect(){}}};
  sb.window=sb;vm.createContext(sb);vm.runInContext(STOCK_SOT_SRC,sb);vm.runInContext(SRC,sb);
  const flush=()=>{while(timers.length)timers.splice(0).forEach(f=>f());};
  return{els,api:sb.PartCrudS2041,flush,writes:()=>writes};
}

test('input hidden (tanpa .options): refreshAll berulang TIDAK menulis innerHTML (memutus loop observer)',()=>{
  const e=makeEnv('input');e.api.install();
  e.api.refreshAll();e.flush(); // pemanasan: injeksi UI satu kali (checkbox filter) wajar
  const before=e.writes();
  for(let i=0;i<5;i++){e.api.refreshAll();e.flush();}
  assert.strictEqual(e.writes(),before,'tidak boleh ada penulisan innerHTML ke elemen non-select');
  assert.strictEqual(e.api.PartPicker.refresh('servisPartId'),false);
});

test('select asli: tetap diisi saat pertama, lalu idempoten (tidak menulis ulang bila opsi sama)',()=>{
  const e=makeEnv('select');e.api.install();
  e.api.refreshAll();e.flush();
  assert.ok(e.els.servisPartId.options.some(o=>o.value==='pA'),'opsi part terisi');
  const w=e.writes();
  for(let i=0;i<3;i++){e.api.refreshAll();e.flush();}
  assert.strictEqual(e.writes(),w,'tidak ada tulis ulang saat isi opsi tidak berubah');
});
