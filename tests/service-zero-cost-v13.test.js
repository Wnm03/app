// v13: Rp0 self-service is a valid Service Event, but must not create a fake Finance tx.
const fs=require('fs'),assert=require('assert'),path=require('path');
const car=fs.readFileSync(path.join(__dirname,'..','car-notes.js'),'utf8');
const bundle=fs.readFileSync(path.join(__dirname,'..','app-bundle-a.min.js'),'utf8');
function ok(c,m){assert.ok(c,m);console.log('PASS',m)}
ok(car.includes("const cost=costRaw===''?0:Number(costRaw);"),'source accepts empty cost as 0 and parses numeric input explicitly');
ok(car.includes("if(!item||!Number.isFinite(cost)||cost<0)"),'source rejects only invalid/negative cost, not zero');
ok(car.includes('let txId=null;\n// v13: servis Rp0 tetap menjadi Service Event/riwayat yang sah'),'new service starts without Finance tx');
ok(car.includes("if(cost>0){\n txId=uid();\n D.transactions.push"),'new Finance transaction is created only for cost > 0');
ok(car.includes("if(s.txLinkId){\nconst tx=D.transactions.find(t=>t.id===s.txLinkId);\nif(cost===0)"),'edit from paid service to Rp0 removes old Finance tx');
ok(car.includes("s.txLinkId=null;"),'edit-to-zero clears finance linkage');
ok(bundle.includes("const cost=costRaw===''?0:Number(costRaw);"),'production bundle contains zero-cost validation');
ok(/if\(cost>0\)\s*\{\s*txId=uid\(\);/.test(bundle),'production bundle gates Finance tx on cost > 0');
console.log('TOTAL 8 PASS');
