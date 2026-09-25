'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','modules/vehicle/service-history-component-identity-sot.js'),'utf8');
function api(catalog){const ctx={ServiceInputCatalog:catalog||{},console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);return ctx.ServiceHistoryComponentIdentitySOT;}
const a=api({itemById(id){const m={brake:{item:{id:'brake',masterCategoryId:'brakes'},group:{masterCategoryId:'brakes'}},disc:{item:{id:'disc',masterCategoryId:'brakes'},group:{masterCategoryId:'brakes'}}};return m[id]||null;},infer(){return null;}});
const multi={id:'h1',vehicleId:'v1',checklist:[{itemId:'brake'},{itemId:'disc'}]};
assert.deepEqual(Array.from(a.ids(multi)),['brake','disc']);
assert.equal(a.resolve(multi).serviceComponentId,null);
assert.equal(a.resolve(multi).ambiguous,true);
assert.equal(a.resolve(multi,{componentId:'disc'}).serviceComponentId,'disc');
assert.equal(a.matches(multi,'brake'),true);
assert.equal(a.matches(multi,'disc'),true);
assert.equal(a.matches(multi,'other'),false);
const single={id:'h2',serviceComponentId:'brake',checklist:[{itemId:'brake'}]};
assert.equal(a.resolve(single).serviceComponentId,'brake');
console.log('Service History Component Identity SOT: PASS');
