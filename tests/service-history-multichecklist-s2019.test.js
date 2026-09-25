'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function makeContext(logs){
  const context={
    console,
    D:{servisLogs:logs,vehicles:[{id:'v1',name:'Vario 125'}],sparepartCats:[
      {id:'cat-filter',name:'Filter Udara',serviceComponentId:'filter-udara',vehicleId:'v1',intervalKm:4000},
      {id:'cat-belt',name:'Servis CVT',serviceComponentId:'v-belt-cvt',vehicleId:'v1',intervalKm:32000},
      {id:'cat-busi',name:'Servis Mesin',serviceComponentId:'busi',vehicleId:'v1',intervalKm:8000}
    ]},
    curVehicleId:'v1',
    ServiceInputCatalog:{itemById(id){
      const m={
        'filter-udara':{item:{id:'filter-udara',name:'Filter Udara'},group:{masterCategoryId:'filter-udara-cat'}},
        'v-belt-cvt':{item:{id:'v-belt-cvt',name:'V-Belt CVT'},group:{masterCategoryId:'servis-cvt'}},
        'busi':{item:{id:'busi',name:'Busi'},group:{masterCategoryId:'servis-mesin'}}
      }; return m[id]||null;
    }},
    ServiceTaxonomySOT:{resolve(input){
      if(input&&input.serviceComponentId){
        const id=String(input.serviceComponentId);
        const m={'filter-udara':{serviceComponentId:id,masterCategoryId:'filter-udara-cat',component:{name:'Filter Udara'}},'v-belt-cvt':{serviceComponentId:id,masterCategoryId:'servis-cvt',component:{name:'V-Belt CVT'}},'busi':{serviceComponentId:id,masterCategoryId:'servis-mesin',component:{name:'Busi'}}};
        return m[id]||null;
      }
      return null;
    }},
    Servis:{openHistoryFromReminder(){return 'original';},resolveCanonicalServiceSelection(x){const id=x&&x.serviceComponentId||'';const names={'filter-udara':'Filter Udara','v-belt-cvt':'V-Belt CVT','busi':'Busi'};return {serviceComponentId:id,masterCategoryId:id==='v-belt-cvt'?'servis-cvt':id==='busi'?'servis-mesin':'filter-udara-cat',component:names[id]?{name:names[id]}:null};},openModal(){},setEditTab(){}},
    escapeHtml:x=>String(x==null?'':x),
    document:{addEventListener(){},getElementById(){return null;}},
    resolveServisCatForVehicle(){return null;}
  };
  context.window=context; vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-history-multichecklist-s2019.js'),'utf8'),context,{filename:'service-history-multichecklist-s2019.js'});
  return context;
}

const oneLog={id:'h1',vehicleId:'v1',date:'2026-09-24',km:20237,sessionId:'sess-1',item:'Servis Rutin',checklist:[
  {itemId:'filter-udara',itemName:'Filter Udara',masterCategoryId:'filter-udara-cat',actionType:'periksa'},
  {itemId:'v-belt-cvt',itemName:'V-Belt CVT',masterCategoryId:'servis-cvt',actionType:'ganti'},
  {itemId:'busi',itemName:'Busi',masterCategoryId:'servis-mesin',actionType:'periksa'}
]};
const secondLog={id:'h2',vehicleId:'v1',date:'2026-09-24',km:20237,sessionId:'sess-1',serviceComponentId:'coolant',item:'Coolant'};
const otherVehicle={id:'h3',vehicleId:'v2',sessionId:'sess-1',serviceComponentId:'filter-udara',item:'Filter Udara'};
const c=makeContext([oneLog,secondLog,otherVehicle]);
const api=c.ServiceHistoryMultiChecklistS2019;

assert.deepEqual(Array.from(api.componentsOf(oneLog),x=>x.serviceComponentId),['filter-udara','v-belt-cvt','busi']);
assert.equal(api.componentsOf(oneLog)[1].actionType,'ganti');
assert.equal(api.sessionRows(oneLog).length,2,'same session + same vehicle only');
assert.deepEqual(Array.from(api.sessionComponents(oneLog),x=>x.serviceComponentId),['filter-udara','v-belt-cvt','busi','coolant']);
assert.equal(api.componentMatch(oneLog,'v-belt-cvt'),true);
assert.equal(api.componentMatch(oneLog,'busi'),true);
assert.equal(api.componentMatch(oneLog,'not-there'),false);
assert.equal(api.sessionRows(oneLog).some(x=>x.vehicleId==='v2'),false,'vehicle isolation');
assert.equal(api.reminderState(oneLog,api.componentsOf(oneLog)[1]).serviceComponentId,'v-belt-cvt');
assert.equal(api.reminderState(oneLog,api.componentsOf(oneLog)[1]).active,true);

let opened=[];
c.Servis.openModal=id=>opened.push(['modal',id]);
c.Servis.setEditTab=tab=>opened.push(['tab',tab]);
const nav=api.openComponent('h1','v-belt-cvt','audit');
assert.equal(nav.historyId,'h1'); assert.equal(nav.serviceComponentId,'v-belt-cvt'); assert.equal(nav.tab,'audit');
assert.deepEqual(opened,[['modal','h1'],['tab','audit']]);
assert.equal(c.Servis._s2019ComponentFocusId,'v-belt-cvt');

opened=[];
const fromReminder=c.Servis.openHistoryFromReminder('cat-belt','v-belt-cvt');
assert.equal(fromReminder,'h1','Reminder must find a checklist component even when it is not the first checklist item');
assert.equal(c.Servis._s2019ComponentFocusId,'v-belt-cvt');

const html=api.evidenceHtml(oneLog,api.componentsOf(oneLog)[1]);
assert.match(html,/V-Belt CVT/);
assert.match(html,/v-belt-cvt/);

const source=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-history-multichecklist-s2019.js'),'utf8');
assert.match(source,/componentsOf/);
assert.match(source,/sessionComponents/);
assert.match(source,/openServiceComponentHistoryS2019/);
assert.match(source,/openServiceComponentReminderS2019/);
assert.match(source,/openServiceComponentAuditS2019/);
console.log('S2019 multi-checklist component-context regression: PASS');
