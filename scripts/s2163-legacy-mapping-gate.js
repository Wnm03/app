#!/usr/bin/env node
'use strict';
const M=require('../modules/vehicle/service-legacy-mapping-s2163.js');
const T=require('../modules/vehicle/service-master-data.generated.js');
const groups=T.SERVICE_CHECKLIST_GROUPS||[];
const cats=new Set(groups.map(x=>x.masterCategoryId));
const comps=new Map();groups.forEach(g=>(g.items||[]).forEach(i=>comps.set(i.id,{id:i.id,masterCategoryId:g.masterCategoryId})));
function assert(x,m){if(!x)throw new Error(m)}
const a=M.audit();
assert(a.total===16,'registry count drift');
assert(a.reviewed===3,'reviewed mapping count drift');
assert(a.candidates===3,'candidate mapping count drift');
assert(a.blocked===10,'blocked mapping count drift');
assert(a.duplicateNormalized.length===0,'duplicate legacy keys');
assert(a.badReviewed.length===0,'reviewed mapping incomplete');
for(const x of M.MAPPINGS.filter(x=>x.reviewed)){assert(cats.has(x.masterCategoryId),'reviewed category not canonical');const c=comps.get(x.serviceComponentId);assert(c,'reviewed component not canonical');assert(c.masterCategoryId===x.masterCategoryId,'reviewed category/component mismatch')}
assert(M.reviewed('Pully')===null,'blocked mapping must not be consumable');
assert(M.reviewed('Servis Cvt')===null,'candidate category-only mapping must not be consumable');
assert(M.reviewed('Slidepiece').serviceComponentId==='slide-piece-cvt','reviewed mapping failed');
console.log('S2163 legacy mapping gate: PASS 8/8');
console.log(JSON.stringify(a,null,2));
