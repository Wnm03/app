const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','modules','shared','backup-restore.js'),'utf8');
const a=src.indexOf('function validateServiceOdometerImportIntegrity(');
const b=src.indexOf('\n// P11 — Restore/Backup service integrity reconciliation.',a);
const fnSrc=src.slice(a,b);
function load(D,validate){const ctx={D,Servis:{validateServiceOdometer:validate},console};vm.createContext(ctx);vm.runInContext(fnSrc+'\nthis.fn=validateServiceOdometerImportIntegrity;',ctx);return ctx.fn;}
let D={servisLogs:[{id:'old',vehicleId:'v1',date:'2026-01-01',km:80000}]};
let calls=0;let fn=load(D,(x)=>{calls++;return x.km<80000?{ok:false,code:'below_previous_service',message:'too low'}:{ok:true};});
let candidate={id:'new',vehicleId:'v1',date:'2026-02-01',km:81000};
let r=fn([candidate]);assert.equal(r.ok,true);assert.equal(calls,1);assert.deepEqual(D.servisLogs,[{id:'old',vehicleId:'v1',date:'2026-01-01',km:80000}]);
D={servisLogs:[{id:'old',vehicleId:'v1',date:'2026-01-01',km:80000}]};fn=load(D,(x)=>x.km<80000?{ok:false,code:'below_previous_service',message:'too low'}:{ok:true});r=fn([{id:'bad',vehicleId:'v1',date:'2026-02-01',km:70000}]);assert.equal(r.ok,false);assert.equal(r.invalid[0].code,'below_previous_service');assert.equal(D.servisLogs.length,1);
console.log('P23 service import/restore odometer integrity: 2/2 PASS');
