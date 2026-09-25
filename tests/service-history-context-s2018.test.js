'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function load(logs){
  const context={
    console,
    D:{servisLogs:logs,vehicles:[{id:'v1',name:'Vario 125'}],sparepartCats:[
      {id:'cat-filter',name:'Filter Udara',serviceComponentId:'filter-udara',vehicleId:'v1',intervalKm:4000},
      {id:'cat-belt',name:'Servis CVT',serviceComponentId:'v-belt-cvt',vehicleId:'v1',intervalKm:32000}
    ]},
    curVehicleId:'v1',
    ServiceTaxonomySOT:{resolve(input){
      const map={
        'filter-udara':{masterCategoryId:'filter-udara-cat',category:{name:'Filter Udara'},component:{name:'Filter Udara'},serviceComponentId:'filter-udara'},
        'v-belt-cvt':{masterCategoryId:'servis-cvt',category:{name:'Servis CVT'},component:{name:'V-Belt CVT'},serviceComponentId:'v-belt-cvt'}
      };
      if(input&&input.serviceComponentId&&map[input.serviceComponentId])return map[input.serviceComponentId];
      return null;
    }},
    escapeHtml:x=>String(x==null?'':x),
    document:{getElementById(){return null;},addEventListener(){}},
    window:null
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-history-context-s2018.js'),'utf8'),context,{filename:'service-history-context-s2018.js'});
  return context.ServiceHistoryContextS2018;
}

const logs=[
  {id:'h1',vehicleId:'v1',date:'2026-09-24',km:20237,sessionId:'sess-1',serviceComponentId:'filter-udara',item:'Filter Udara',actionType:'periksa'},
  {id:'h2',vehicleId:'v1',date:'2026-09-24',km:20237,sessionId:'sess-1',serviceComponentId:'v-belt-cvt',item:'V-Belt CVT',actionType:'ganti'},
  {id:'h3',vehicleId:'v1',date:'2026-06-01',km:15917,sessionId:'sess-0',serviceComponentId:'filter-udara',item:'Filter Udara',actionType:'periksa'},
  {id:'h4',vehicleId:'v2',date:'2026-09-24',km:20237,sessionId:'other',serviceComponentId:'filter-udara',item:'Filter Udara'}
];

const sot=load(logs);
assert.equal(sot.sessionRows(logs[0]).length,2,'one service session must retain all checklist components');
assert.deepEqual(Array.from(sot.componentsForSession(logs[0]).map(x=>x.serviceComponentId)),['filter-udara','v-belt-cvt']);
assert.equal(sot.componentsForSession(logs[0])[1].componentName,'V-Belt CVT');
assert.equal(sot.sessionRows(logs[0]).some(x=>x.vehicleId==='v2'),false,'session grouping must isolate vehicles');
const audit=sot.auditForLog(logs[0]);
assert.equal(audit.component.serviceComponentId,'filter-udara');
assert.equal(audit.sessionComponentCount,2);
assert.equal(audit.reminder.active,true,'reminder status must be evaluated for the focused component only');
assert.equal(audit.reminder.serviceComponentId,'filter-udara');
assert.equal(audit.sessionComponents.find(x=>x.serviceComponentId==='v-belt-cvt').logId,'h2');
assert.equal(audit.sessionRows.length,2);
assert.equal(sot.auditForLog(logs[1]).component.serviceComponentId,'v-belt-cvt');
assert.equal(sot.auditForLog(logs[1]).reminder.serviceComponentId,'v-belt-cvt');

const source=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-history-context-s2018.js'),'utf8');
assert.match(source,/one service session may contain multiple checklist components/i);
assert.match(source,/componentsForSession/);
assert.match(source,/reminderForComponent/);
assert.match(source,/openHistoryAuditForLog/);
const bundle=fs.readFileSync(path.join(__dirname,'..','app-bundle-b.min.js'),'utf8');
assert.match(bundle,/SERVICE-HISTORY-CONTEXT-S2018/);
assert.match(bundle,/s2018HistoryContext/);
assert.match(bundle,/s2018AuditContext/);
assert.match(bundle,/openHistoryAuditForLog/);

console.log('S2018 multi-checklist history/audit context regression: PASS');
