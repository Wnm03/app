const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

function read(p){ return fs.readFileSync(p,'utf8'); }

function functionBody(source, signature){
  const start=source.indexOf(signature);
  assert.notEqual(start,-1,`missing function signature: ${signature}`);
  const open=source.indexOf('{',start);
  assert.notEqual(open,-1,`missing opening brace: ${signature}`);
  let depth=0, quote=null, esc=false, lineComment=false, blockComment=false;
  for(let i=open;i<source.length;i++){
    const c=source[i], n=source[i+1];
    if(lineComment){ if(c==='\n') lineComment=false; continue; }
    if(blockComment){ if(c==='*'&&n==='/'){ blockComment=false; i++; } continue; }
    if(quote){ if(esc){esc=false; continue;} if(c==='\\'){esc=true; continue;} if(c===quote)quote=null; continue; }
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(`unterminated function: ${signature}`);
}

test('S1843 saveFlush serializes the critical snapshot only once',()=>{
  const s=read('modules/shared/features-helpers-global-security.js');
  const body=functionBody(s,'function saveFlush(){');
  const snapshotHelper=functionBody(s,'function _getSaveSnapshotForVersion(version){');
  const code=(body+'\n'+snapshotHelper).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
  assert.equal((code.match(/_buildSaveJson\(\)/g)||[]).length,1);
  assert.match(body,/_getSaveSnapshotForVersion\(version\)/);
  assert.match(body,/IDBStore\.set\('kw_v4_mirror',json\)/);
  assert.match(body,/_writeLocalSnapshot\(json\)/);
});

test('S1843 cumulative saveFlush mirrors do not re-serialize D for localStorage',()=>{
  const files=[
    'modules/shared/features-helpers-global-security.js',
    'modules/asset/features-helpers-global-security.js',
    'modules/finance/features-helpers-global-security.js',
    'modules/shop/features-helpers-global-security.js',
    'app-bundle-b.min.js',
    'docs/app-bundle-b.min.js',
  ];
  for(const file of files){
    const s=read(file);
    assert.equal(s.includes('_writeLocalSnapshot(_buildSaveJson())'),false,`${file} still serializes D twice in saveFlush()`);
  }
});

test('S1843 Dashboard month context uses one D.transactions pass',()=>{
  const s=read('modules/shared/modules-render-b.js');
  const start=s.indexOf('function renderDashboard(){');
  const end=s.indexOf('\nfunction renderDashLaporanMini',start);
  const body=s.slice(start,end);
  assert.equal((body.match(/D\.transactions\.filter\(/g)||[]).length,0);
  assert.match(body,/for\(const t of D\.transactions\)/);
  assert.match(body,/hitungKas/);
});

test('S1843 Finance transaction rows reuse render lookup maps',()=>{
  const render=read('modules/shared/modules-render-b.js');
  const tx=read('modules/finance/tx-list-cashflow.js');
  assert.match(render,/const txRenderCtx=\{/);
  assert.match(render,/accounts:\(typeof _getPerfAccountIndex/);
  assert.match(render,/visible\.map\(t=>txHTML\(t,txRenderCtx\)\)/);
  assert.match(tx,/function txHTML\(t,renderCtx\)/);
  assert.match(tx,/function txTableHTML\(items,accIdForBalance,renderCtx\)/);
});

test('S1843 Finance month totals are computed in one transaction pass',()=>{
  const s=read('modules/shared/modules-render-b.js');
  const start=s.indexOf('function renderKeuangan(){');
  const end=s.indexOf('\nfunction renderBudgets',start);
  const body=s.slice(start,end);
  const afterMonth=body.slice(body.indexOf('const txM=[]'));
  assert.equal((afterMonth.match(/D\.transactions\.filter\(/g)||[]).length,1); // txList remains a separate filtered view
  assert.match(body,/for\(const t of D\.transactions\)/);
  assert.match(body,/let inc=0,exp=0,incReal=0,expReal=0/);
});
