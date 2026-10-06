'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {TextEncoder,TextDecoder}=require('node:util');
const btoa=(s)=>Buffer.from(String(s),'binary').toString('base64');
const atob=(s)=>Buffer.from(String(s),'base64').toString('binary');

// Isolated legacy fixtures rarely seed a full D.categories taxonomy, while
// FinanceTxSOT (correctly) fails closed on unknown categories in production.
// For sandboxes that load the REAL FinanceCategorySOT without a seeded taxonomy,
// register unknown labels on first use so fixtures keep exercising the real
// mutation flow. Production code paths are untouched; call is a no-op when the
// SOT is absent or already wrapped.
function installLenientTaxonomy(ctx){
  const sot=ctx&&ctx.FinanceCategorySOT;
  if(!sot||typeof sot.resolve!=='function'||sot.__lenientTestTaxonomy)return;
  const origResolve=sot.resolve;
  sot.resolve=function(input){
    let r=origResolve.call(sot,input);
    const t=input||{};
    if((t.type==='income'||t.type==='expense')&&String(t.category||'').trim()&&(!r||!r.ok||r.code==='SUBCATEGORY_UNRESOLVED')){
      try{
        const D_=ctx.D;
        if(D_&&typeof D_==='object'){
          if(!D_.categories||typeof D_.categories!=='object')D_.categories={income:[],expense:[]};
          if(!Array.isArray(D_.categories[t.type]))D_.categories[t.type]=[];
          let cat=sot.findByName(t.type,t.category);
          if(!cat)cat=sot.addCategory(t.type,{name:String(t.category).trim()});
          if(String(t.subcategory||'').trim()&&!sot.findSub(cat,t.subcategory))sot.addSubcategory(t.type,cat.id,{name:String(t.subcategory).trim()});
          r=origResolve.call(sot,input);
        }
      }catch{ /* keep original unresolved result */ }
    }
    return r;
  };
  sot.__lenientTestTaxonomy=true;
}

function loadSource(files,globals={},exports=[]){
  const ctx={console,setTimeout:()=>{},clearTimeout:()=>{},queueMicrotask:fn=>{if(typeof fn==='function')fn();},structuredClone:global.structuredClone,TextEncoder,TextDecoder,btoa,atob,crypto:webcrypto};
  Object.assign(ctx,globals);
  if (!ctx.window) ctx.window=ctx;
  // Inert document for isolated sandboxes. Production code null-guards every
  // getElementById() lookup, so an empty DOM (all lookups -> null) is the faithful
  // "element not on this page" case. Caller-supplied `document` always wins and
  // nothing else about the browser (fetch, localStorage, ...) is fabricated.
  if (!ctx.document) {
    const noop=()=>{};
    const makeEl=(tag)=>({tagName:String(tag||'div').toUpperCase(),style:{},dataset:{},children:[],childNodes:[],
      classList:{add:noop,remove:noop,toggle:()=>false,contains:()=>false},
      setAttribute:noop,getAttribute:()=>null,removeAttribute:noop,appendChild(c){return c;},removeChild(c){return c;},
      addEventListener:noop,removeEventListener:noop,click:noop,focus:noop,remove:noop,
      querySelector:()=>null,querySelectorAll:()=>[],innerHTML:'',textContent:'',value:''});
    ctx.document={
      getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],getElementsByClassName:()=>[],getElementsByTagName:()=>[],
      createElement:makeEl,createTextNode:(t)=>({textContent:String(t)}),addEventListener:noop,removeEventListener:noop,
      body:makeEl('body'),head:makeEl('head'),documentElement:makeEl('html'),visibilityState:'visible',hidden:false,cookie:''
    };
  }
  ctx.globalThis=ctx;
  vm.createContext(ctx);

  // SOT dependency closure for isolated sandbox tests. Production loading is
  // dependency-ordered, but focused tests often pass only the module under test.
  // Resolve only known canonical SOT modules referenced by the source. Caller
  // supplied globals remain authoritative test doubles; browser APIs are never
  // fabricated here, so real DOM-environment gaps remain visible.
  const SOT_FILES={
    FinanceCategorySOT:'modules/finance/finance-category-sot.js',
    FinanceTxSOT:'modules/finance/finance-tx-sot.js',
    FinanceEventOutbox:'modules/finance/finance-event-outbox.js',
    FinanceCrossEntityAtomic:'modules/finance/finance-cross-entity-atomic.js',
    BillDebtPiutangCanonicalWriter:'modules/finance/bill-debt-piutang-canonical-writer.js',
    BillDebtPiutangReconciler:'modules/finance/bill-debt-piutang-reconciler.js',
    StockCommandSOT:'modules/vehicle/stock-command-sot.js',
    VehicleStockSOT:'modules/vehicle/vehicle-stock-sot.js'
  };
  const requested=Array.isArray(files)?files.slice():[];
  const provided=new Set(Object.keys(globals||{}));
  const loaded=new Set();
  const ordered=[];
  function addWithDeps(file){
    if(loaded.has(file))return;
    const src=fs.readFileSync(path.resolve(process.cwd(),file),'utf8');
    for(const [symbol,dep] of Object.entries(SOT_FILES)){
      if(dep===file||provided.has(symbol)||loaded.has(dep))continue;
      // FinanceTxSOT has a deliberate taxonomy prerequisite. Auto-loading it
      // into arbitrary legacy tests changes sparse fixture semantics; keep it
      // explicit. The remaining canonical SOT helpers are safe infrastructure
      // dependencies for isolated tests.
      if(new RegExp('\\b'+symbol+'\\b').test(src))addWithDeps(dep);
    }
    loaded.add(file);
    ordered.push([file,src]);
  }
  // S1990/S2000: tests exporting ServisChecklist must receive the consolidated
  // checklist owner directly. Older snapshots assumed the module was implicit.
  if(exports.includes('ServisChecklist') && !provided.has('ServisChecklist') && !loaded.has('modules/vehicle/servis-checklist.js')){
    if(!loaded.has('modules/vehicle/service-master-data.generated.js')) addWithDeps('modules/vehicle/service-master-data.generated.js');
    if(fs.existsSync(path.resolve(process.cwd(),'modules/vehicle/servis-checklist.js'))) addWithDeps('modules/vehicle/servis-checklist.js');
  }
  // Generated checklist data is the canonical runtime input for servis-checklist.js.
  // Load it before the checklist module so the VM does not fall back to an empty
  // array merely because CommonJS `require()` is unavailable inside the sandbox.
  if((requested.includes('modules/vehicle/servis-checklist.js') || exports.includes('SERVICE_CHECKLIST_GROUPS')) && !loaded.has('modules/vehicle/service-master-data.generated.js')){
    addWithDeps('modules/vehicle/service-master-data.generated.js');
  }

  for(const file of requested)addWithDeps(file);

  // S2544: focused Servis tests commonly request the Servis namespace while
  // loading only car-notes.js. Mirror production ownership without requiring
  // every legacy test to duplicate the same dependency list. Only auto-load
  // when the caller explicitly asks for the Servis export and did not inject
  // its own test double.
  if(exports.includes('Servis') && !provided.has('Servis') && !loaded.has('modules/vehicle/servis.js')){
    addWithDeps('modules/vehicle/servis.js');
    for(const extra of [
      'modules/vehicle/sparepart-servis.js',
      'modules/vehicle/service-runtime-projection-sot-s2166.js',
      'modules/vehicle/sparepart-servis-ui.js'
    ]){
      if(!loaded.has(extra) && fs.existsSync(path.resolve(process.cwd(),extra))) addWithDeps(extra);
    }
  }

  // Sparepart owner + UI cluster: production loads sparepart-servis-ui.js right
  // after sparepart-servis.js (S2520-era split). Focused Sparepart tests load only
  // the owner file, so mirror production ordering unless the UI file is supplied.
  if(loaded.has('modules/vehicle/sparepart-servis.js') && !loaded.has('modules/vehicle/sparepart-servis-ui.js') && !provided.has('Sparepart')){
    const uiPath='modules/vehicle/sparepart-servis-ui.js';
    if(fs.existsSync(path.resolve(process.cwd(),uiPath))) addWithDeps(uiPath);
  }

  for(const [file,src] of ordered){
    vm.runInContext(src,ctx,{filename:file});
    // S2520: servis.js is now the owner object; low-risk UI/checklist clusters
    // are loaded immediately after it in production. Mirror that contract in
    // isolated test harnesses so tests never exercise a half-loaded Servis API.
    if(file==='modules/vehicle/servis.js'){
      for(const extra of ['modules/vehicle/servis-ui-filters-parts-s2520.js','modules/vehicle/servis-checklist-ui-s2520.js','modules/vehicle/servis-b.js']){
        if(files.includes(extra) || !fs.existsSync(path.resolve(process.cwd(),extra))) continue;
        const extraSrc=fs.readFileSync(path.resolve(process.cwd(),extra),'utf8');
        vm.runInContext(extraSrc,ctx,{filename:extra});
      }
    }
  }
  // Tes yang secara eksplisit memuat/mengekspor FinanceCategorySOT sedang menguji taksonomi
  // itu sendiri (fail-closed) -> jangan dilonggarkan. Hanya SOT yang dimuat otomatis sbg dependensi.
  if(!provided.has('FinanceCategorySOT') && !requested.includes('modules/finance/finance-category-sot.js') && !exports.includes('FinanceCategorySOT')) installLenientTaxonomy(ctx);

  if(exports.length){
    for(const key of exports){
      // Only bridge top-level lexical bindings (let/const). Ordinary global
      // function/var bindings already live on ctx; wrapping them would recurse.
      if(Object.prototype.hasOwnProperty.call(ctx,key)) continue;
      try {
        const exists = vm.runInContext(`typeof ${key} !== 'undefined'`,ctx);
        if(!exists) continue;
        Object.defineProperty(ctx,key,{configurable:true,enumerable:true,
          get(){ return vm.runInContext(key,ctx); },
          set(v){ vm.runInContext(`${key}=v`,ctx); }
        });
      } catch {
        // Ignore names that are not lexical bindings in this source.
      }
    }
    return ctx;
  }
  return ctx;
}

function makePermissiveStub(name='stub'){
  const fn=function(){return proxy;};
  const proxy=new Proxy(fn,{
    get(target,prop){
      if(prop==='name')return name;
      if(prop==='style')return target.style||(target.style=makePermissiveStub(name+'.style'));
      if(prop==='classList')return target.classList||(target.classList={add(){},remove(){},toggle(){return false},contains(){return false}});
      if(prop==='matches')return ()=>false;
      if(prop==='querySelectorAll')return ()=>({forEach(){}});
      if(prop==='querySelector')return ()=>null;
      if(prop==='length')return 0;
      if(prop==='value')return target.value??'';
      return target[prop]!==undefined?target[prop]:makePermissiveStub(name+'.'+String(prop));
    },
    set(target,prop,value){target[prop]=value;return true;},
    apply(){return proxy;},
  });
  return proxy;
}
function extractFunctionAutoStub(file,fnName,extraGlobals={} ){
  const fullPath=path.resolve(process.cwd(),file);
  const src=fs.readFileSync(fullPath,'utf8');
  const marker=`function ${fnName}(`;
  const start=src.indexOf(marker);
  if(start<0)throw new Error(`extractFunctionAutoStub: "${marker}" tidak ditemukan di ${file}`);
  const braceOpen=src.indexOf('{',start); let depth=1,i=braceOpen+1;
  while(i<src.length&&depth>0){if(src[i]==='{')depth++;else if(src[i]==='}')depth--;i++;}
  const snippet=src.slice(start,i);
  const ctx={console,...extraGlobals};

  // Bring simple top-level constants from the same source into the sandbox.
  // This is intentionally limited to single-line declarations; complex source
  // expressions are left alone rather than guessed.
  const declarations=[];
  const dr=/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=([^;\n]+);/gm;
  let dm; while((dm=dr.exec(src))) declarations.push([dm[1],dm[2]]);
  for(let pass=0;pass<4;pass++){
    let progress=false;
    for(const [key,expr] of declarations){
      if(Object.prototype.hasOwnProperty.call(ctx,key))continue;
      try{
        const box=vm.createContext(ctx);
        new vm.Script(`this.__v=(${expr});`,{filename:`${file}#${key}`}).runInContext(box);
        ctx[key]=box.__v; delete ctx.__v; progress=true;
      }catch(_extractErr){void _extractErr;}
    }
    if(!progress)break;
  }
  // The S679 extracted tab functions are presentation-only probes. Any
  // remaining renderer/helper call is safely replaced with a permissive stub;
  // caller-supplied spies (especially scrollTabBarIntoView) remain untouched.
  const knownHelperNames=[
    'renderBillList','renderDashboard','renderKeuangan','renderCnTab','renderShop',
    'renderProductList','renderPajak','renderSettings','closeModal','openModal',
    'toast','save','populateKeuFilters','loadKeuFilterPrefsIntoDOM','setActiveNav','setPage','activatePage','Kasir'
  ];
  for(const key of knownHelperNames)if(!Object.prototype.hasOwnProperty.call(ctx,key))ctx[key]=makePermissiveStub(key);

  const sandbox=vm.createContext(ctx);
  new vm.Script(`${snippet}\nthis.__fn=${fnName};`,{filename:`${file}#${fnName}`}).runInContext(sandbox);
  return sandbox.__fn;
}

function makePermissiveDocument(){
  const elements=new Map();
  function makeEl(tag='div'){
    const el={
      id:'',tagName:String(tag).toUpperCase(),style:{},dataset:{},children:[],childNodes:[],
      className:'',classList:{add(){},remove(){},toggle(){return false},contains(){return false}},textContent:'',innerHTML:'',value:'',checked:false,disabled:false,
      appendChild(child){this.children.push(child);this.childNodes.push(child);return child;},
      removeChild(child){this.children=this.children.filter(x=>x!==child);this.childNodes=this.childNodes.filter(x=>x!==child);return child;},
      remove(){},setAttribute(k,v){this[k]=String(v);},getAttribute(k){return this[k]??null;},matches(){return false},
      addEventListener(){},removeEventListener(){},focus(){},click(){},querySelector(){return null;},querySelectorAll(){return []},
    };
    return el;
  }
  const doc={
    readyState:'complete',
    getElementById(id){if(!elements.has(id)){const el=makeEl();el.id=id;elements.set(id,el);}return elements.get(id);},
    querySelector(){return null},querySelectorAll(){return []},
    createElement(tag){return makeEl(tag);},
    createTextNode(text){return {textContent:String(text)};},
    addEventListener(){},removeEventListener(){},
    body:makeEl('body'),documentElement:makeEl('html'),
  };
  return doc;
}
function loadSourceDom(files,globals={},exports=[]){
  return loadSource(files,Object.assign({document:makePermissiveDocument(),crypto:webcrypto},globals),exports);
}

function loadFinanceSource(files,globals={},exports=[]){
  const requested=Array.isArray(files)?files.slice():[];
  const hasFinanceSot=requested.includes('modules/finance/finance-tx-sot.js');
  const hasCategory=requested.includes('modules/finance/finance-category-sot.js');
  if(!hasFinanceSot && !(globals&&globals.FinanceTxSOT)){
    const financeFiles=['modules/finance/finance-category-sot.js','modules/finance/finance-tx-sot.js'];
    const merged=[...financeFiles,...requested];
    const uniq=[...new Set(merged)];
    return loadSource(uniq,globals,exports);
  }
  return loadSource(requested,globals,exports);
}
function makeFinanceTxSOTCompat(D){
  const db=D||{};
  const idOf=x=>String(x&&typeof x==='object'?x.id:x);
  return {
    create(tx){ if(!tx||typeof tx!=='object')throw new TypeError('FinanceTxSOT.create membutuhkan object transaksi'); if(!Array.isArray(db.transactions))db.transactions=[]; db.transactions.push(tx); return tx; },
    createMany(rows){ if(!Array.isArray(rows))throw new TypeError('FinanceTxSOT.createMany membutuhkan array'); rows.forEach(tx=>this.create(tx)); return rows; },
    updateById(id,patch){ const tx=db.transactions.find(t=>t&&idOf(t)===idOf(id)); if(!tx||!patch)return tx; Object.assign(tx,patch); return tx; },
    removeById(id){ const i=db.transactions.findIndex(t=>t&&idOf(t)===idOf(id)); return i<0?null:db.transactions.splice(i,1)[0]||null; },
    removeWhere(predicate){ const removed=[]; for(let i=db.transactions.length-1;i>=0;i--){if(predicate(db.transactions[i]))removed.unshift(db.transactions.splice(i,1)[0]);} return removed; },
    replaceSnapshot(rows){ db.transactions=JSON.parse(JSON.stringify(Array.isArray(rows)?rows:[])); return db.transactions; },
  };
}
function loadFinanceTxCompat(files,globals,exports,baseLoader=loadSource){
  const g=Object.assign({},globals||{});
  if(!g.FinanceTxSOT)g.FinanceTxSOT=makeFinanceTxSOTCompat(g.D);
  return baseLoader(files,g,exports);
}
module.exports={installLenientTaxonomy,loadSource,loadSourceDom,makePermissiveDocument,loadFinanceSource,makePermissiveStub,extractFunctionAutoStub,extractFunction:extractFunctionAutoStub,makeFinanceTxSOTCompat,loadFinanceTxCompat};
