const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function loadD(D){
  const ctx={D,SCHEMA_VERSION:11,uid:()=>`uid_${Math.random()}`,console};
  vm.createContext(ctx);
  const src=fs.readFileSync(path.join(__dirname,'../modules/shared/features-helpers-global-security.js'),'utf8');
  // Extract only migration table + runner to avoid unrelated runtime dependencies.
  const start=src.indexOf('const SCHEMA_VERSION = 11;');
  const end=src.indexOf('// isDevMode()');
  const chunk=src.slice(start,end)+";this.DATA_MIGRATIONS=DATA_MIGRATIONS;this.runDataMigrations=runDataMigrations;this.SCHEMA_VERSION=SCHEMA_VERSION;";
  vm.runInContext(chunk,ctx);
  return ctx;
}
test('S2193: legacy billLinkId migration is type-safe for numeric/string bill IDs',()=>{
  const D={schemaVersion:4,bills:[{id:101}],billsArchive:[{id:'202'}],transactions:[
    {id:'t1',billLinkId:'101'},
    {id:'t2',billLinkId:202},
    {id:'t3',billLinkId:'999'},
    {id:'t4',billLinkId:null},
  ]};
  const ctx=loadD(D); ctx.runDataMigrations(4);
  assert.equal(D.transactions[0].billLinkId,'101');
  assert.equal(D.transactions[1].billLinkId,202);
  assert.equal(D.transactions[2].billLinkId,undefined);
  assert.equal(D.transactions[3].billLinkId,null);
});

test('S2193: legacy migration does not erase a valid archived bill link',()=>{
  const D={schemaVersion:4,bills:[],billsArchive:[{id:77}],transactions:[{id:'t',billLinkId:'77'}]};
  const ctx=loadD(D); ctx.runDataMigrations(4);
  assert.equal(D.transactions[0].billLinkId,'77');
});
