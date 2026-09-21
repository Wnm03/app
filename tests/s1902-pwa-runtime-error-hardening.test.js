const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const ux=fs.readFileSync(path.join(root,'modules/shared/pwa-ux-performance.js'),'utf8');
const boot=fs.readFileSync(path.join(root,'modules/shared/boot-early.js'),'utf8');
const bundle=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');

function makeDocument(){
  const listeners={};
  const body={classList:{ops:[],toggle(name,value){this.ops.push([name,value]);}}};
  return {
    readyState:'loading',
    documentElement:{clientWidth:0,clientHeight:0,style:{setProperty(){}}},
    body:null,
    listeners,
    addEventListener(name,fn){(listeners[name]||(listeners[name]=[])).push(fn);},
    querySelectorAll(){return[];},
    getElementById(){return null;},
    createElement(){return {style:{},setAttribute(){},appendChild(){},remove(){}};},
    _body:body
  };
}

test('S1902 viewport helper does not dereference document.body before DOMContentLoaded',()=>{
  const document=makeDocument();
  const window={__pwaViewportStateInstalled:false,innerWidth:390,innerHeight:800,addEventListener(){}};
  const context={window,document,navigator:{onLine:true},globalThis:window,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),setInterval:()=>0,console};
  window.document=document;
  assert.doesNotThrow(()=>vm.runInNewContext(ux,context,{filename:'pwa-ux-performance.js'}));
  assert.ok(Array.isArray(document.listeners.DOMContentLoaded));
  document.body=document._body;
  assert.doesNotThrow(()=>document.listeners.DOMContentLoaded.forEach(fn=>fn()));
  assert.deepEqual(document.body.classList.ops,[['pwa-landscape',false],['pwa-keyboard-open',false]]);
});

test('S1902 production bundle contains the same pre-body guard',()=>{
  assert.match(bundle,/const body=document\.body;\s*if\(!body\)return;\s*body\.classList\.toggle\(/);
});

test('S1902 global error banner keeps resource location out of user-visible text',()=>{
  assert.match(boot,/window\.__showRuntimeErrorBanner\(msg\);/);
  assert.doesNotMatch(boot,/window\.__showRuntimeErrorBanner\(msg\+loc\);/);
  assert.match(boot,/console\.error\('\[Global Error\]',msg\+loc/);
});

for(const file of ['index.html','app_production.html']){
  test(`S1902 ${file} keeps the fixed runtime cache-busted`,()=>{
    const html=fs.readFileSync(path.join(root,file),'utf8');
    const m=html.match(/app-bundle-a\.min\.js\?v=(\d+)/);
    assert.ok(m && Number(m[1])>=1895);
    assert.match(html,new RegExp(`boot-early\\.js\\?v=${m[1]}`));
  });
}
