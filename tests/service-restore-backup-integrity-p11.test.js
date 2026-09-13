const fs=require('fs');
const path=require('path');
const vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','modules','shared','backup-restore.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);console.log('PASS',m)}
const a=src.indexOf('function reconcileRestoredServiceIntegrity(){');
const b=src.indexOf('\nasync function applyRestoredData(imp){',a);
ok(a>=0&&b>a,'P11 reconciliation helper exists');
const fnSrc=src.slice(a,b);
const ctx={console,D:{servisLogs:[],transactions:[],sparepartCats:[]}};
vm.createContext(ctx); vm.runInContext(fnSrc,ctx);
ok(typeof ctx.reconcileRestoredServiceIntegrity==='function','helper is executable');

// one-sided service -> finance link must become bidirectional
ctx.D={servisLogs:[{id:'s1',txLinkId:'t1',nextDueAxis:'km'}],transactions:[{id:'t1'}],sparepartCats:[]};
let st=ctx.reconcileRestoredServiceIntegrity();
ok(ctx.D.transactions[0].servisLinkId==='s1'&&st.backlinked===1,'service txLinkId backfills transaction.servisLinkId');

// one-sided finance -> service link must recover service.txLinkId
ctx.D={servisLogs:[{id:'s2',txLinkId:null,nextDueAxis:'date'}],transactions:[{id:'t2',servisLinkId:'s2'}],sparepartCats:[]};
st=ctx.reconcileRestoredServiceIntegrity();
ok(ctx.D.servisLogs[0].txLinkId==='t2','transaction.servisLinkId recovers service.txLinkId');

// dangling links are cleared, never fabricated
ctx.D={servisLogs:[{id:'s3',txLinkId:'missing',nextDueAxis:'none'}],transactions:[{id:'t3',servisLinkId:'missing-service'}],sparepartCats:[]};
st=ctx.reconcileRestoredServiceIntegrity();
ok(ctx.D.servisLogs[0].txLinkId===null&&ctx.D.transactions[0].servisLinkId===null,'dangling service/finance links are cleared');
ok(ctx.D.transactions.length===1&&ctx.D.servisLogs.length===1,'reconciliation does not create/delete records');

// snapshot backfill only when missing; existing historical snapshot stays untouched
ctx.canonicalServisCategoryId=()=> 'cat1';
ctx.buildServiceNextDueSnapshot=()=>({intervalKmAtService:7500,intervalBulanAtService:6,nextDueKm:87500,nextDueDate:'2027-03-10',nextDueAxis:'km_or_date'});
ctx.D={servisLogs:[{id:'s4',vehicleId:'v1',item:'Oli',km:80000,date:'2026-09-10',txLinkId:null}],transactions:[],sparepartCats:[{id:'cat1'}]};
st=ctx.reconcileRestoredServiceIntegrity();
ok(ctx.D.servisLogs[0].nextDueKm===87500&&ctx.D.servisLogs[0].nextDueAxis==='km_or_date'&&st.snapshots===1,'missing canonical next-due snapshot is backfilled');
ctx.D.servisLogs[0].nextDueKm=85000;ctx.D.servisLogs[0].nextDueAxis='km';
ctx.reconcileRestoredServiceIntegrity();
ok(ctx.D.servisLogs[0].nextDueKm===85000&&ctx.D.servisLogs[0].nextDueAxis==='km','existing historical snapshot is never overwritten');

ok(src.includes('const _serviceRestoreIntegrity=reconcileRestoredServiceIntegrity();'),'full restore runs reconciliation before save/init');
console.log('P11 regression: 8/8 PASS');
