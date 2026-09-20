'use strict';
// Service Master Database — canonical category/component master backed by the
// app's existing IDBStore key/value architecture. This intentionally does NOT
// create a second IndexedDB wrapper or a parallel maintenance-history store.
const SERVICE_MASTER_DB_KEY='service-master:store';
const SERVICE_MASTER_DB_SCHEMA_VERSION=1;
let _serviceMasterLoaded=false;
let _serviceMasterLoadPromise=null;
let _serviceMasterStore=null;
function _smdSource(){
  if(typeof globalThis!=='undefined'&&globalThis.__SERVICE_MASTER_DATA__)return globalThis.__SERVICE_MASTER_DATA__;
  if(typeof module!=='undefined'&&module.exports&&typeof require==='function'){try{return require('./service-master-data.generated.js').SERVICE_MASTER_DATA;}catch(e){ /* isolated test/runtime without CommonJS require */ }}
  return {source:null,masterCategoryCount:0,componentCount:0,masterCategories:[],components:[]};
}
function _smdClone(v){return JSON.parse(JSON.stringify(v));}
function _smdCanonicalComponent(x){return {masterCategoryId:x.masterCategoryId,masterCategory:x.masterCategory,componentNo:x.componentNo,componentId:x.componentId,componentName:x.componentName,linkCat:!!x.linkCat,actionMode:x.actionMode??null,resetType:x.resetType??null,intervalKm:x.intervalKm??null,intervalTimeMonths:x.intervalTimeMonths??null,gantiResetsInterval:x.gantiResetsInterval??null,intervalLabel:x.intervalLabel??'',sumber:x.sumber??'',needsReview:!!x.needsReview,catatan:x.catatan??'',catatanTambahan:x.catatanTambahan??'',catalogRefs:Array.isArray(x.catalogRefs)?x.catalogRefs.slice():[]};}
function _smdCanonicalCategory(x){return {no:x.no,masterCategoryId:x.masterCategoryId,masterCategory:x.masterCategory};}
function _smdMeta(source,checksum,importedAt){return {id:'service-components-master',schemaVersion:SERVICE_MASTER_DB_SCHEMA_VERSION,dataVersion:checksum,importedAt,checksum,componentCount:source.components.length,categoryCount:source.masterCategories.length,source:source.source||null};}
function _smdSame(a,b){return JSON.stringify(_smdCanonicalComponent(a))===JSON.stringify(_smdCanonicalComponent(b));}
function _smdSameCat(a,b){return JSON.stringify(_smdCanonicalCategory(a))===JSON.stringify(_smdCanonicalCategory(b));}
async function _smdImport(source,checksum,reason){
  const old=_serviceMasterStore&&_serviceMasterStore.components||[];const oldCats=_serviceMasterStore&&_serviceMasterStore.categories||[];
  const now=new Date().toISOString();
  const oldBy=new Map(old.filter(Boolean).map(x=>[String(x.componentId),x]));
  const newIds=new Set(source.components.map(x=>String(x.componentId)));
  let inserted=0,updated=0,unchanged=0;
  const components=source.components.map(raw=>{const c=_smdCanonicalComponent(raw);const prev=oldBy.get(String(c.componentId));if(!prev){inserted++;return Object.assign(c,{deprecated:false,updatedAt:now});}if(_smdSame(prev,c)){unchanged++;return Object.assign({},prev,{deprecated:false,deprecatedAt:null});}updated++;return Object.assign({},prev,c,{deprecated:false,deprecatedAt:null,updatedAt:now});});
  const deprecated=old.filter(x=>x&&x.componentId&&!newIds.has(String(x.componentId))).map(x=>Object.assign({},x,{deprecated:true,deprecatedAt:x.deprecatedAt||now}));
  const catsBy=new Map(oldCats.filter(Boolean).map(x=>[String(x.masterCategoryId),x]));
  const catIds=new Set(source.masterCategories.map(x=>String(x.masterCategoryId)));
  const categories=source.masterCategories.map(raw=>{const c=_smdCanonicalCategory(raw);const prev=catsBy.get(String(c.masterCategoryId));return prev&&_smdSameCat(prev,c)?Object.assign({},prev,{deprecated:false,deprecatedAt:null}):Object.assign({},c,{deprecated:false,deprecatedAt:null,updatedAt:now});});
  const deprecatedCats=oldCats.filter(x=>x&&x.masterCategoryId&&!catIds.has(String(x.masterCategoryId))).map(x=>Object.assign({},x,{deprecated:true,deprecatedAt:x.deprecatedAt||now}));
  _serviceMasterStore={schemaVersion:SERVICE_MASTER_DB_SCHEMA_VERSION,categories:categories.concat(deprecatedCats),components:components.concat(deprecated),meta:_smdMeta(source,checksum,now),lastImport:{reason,inserted,updated,unchanged,deprecated:deprecated.length,categoryCount:categories.length,componentCount:components.length}};
  if(typeof IDBStore==='undefined'||!IDBStore||typeof IDBStore.set!=='function')return _serviceMasterStore;
  await IDBStore.set(SERVICE_MASTER_DB_KEY,_serviceMasterStore);return _serviceMasterStore;
}
async function _smdLoad(){
  const source=_smdSource();const checksum=(typeof globalThis!=='undefined'&&globalThis.__SERVICE_MASTER_CHECKSUM__)||null;
  let stored=null;
  if(typeof IDBStore!=='undefined'&&IDBStore&&typeof IDBStore.get==='function'){try{stored=await IDBStore.get(SERVICE_MASTER_DB_KEY);}catch(e){console.warn('[ServiceMasterDB] IDB read failed; using generated master',e);}}
  if(stored&&Array.isArray(stored.components)&&Array.isArray(stored.categories)&&stored.meta){_serviceMasterStore=stored;if(checksum&&stored.meta.checksum!==checksum)return _smdImport(source,checksum,'changed-version');return stored;}
  return _smdImport(source,checksum,'first-install');
}
async function ensureLoaded(){if(_serviceMasterLoaded)return _serviceMasterStore;if(!_serviceMasterLoadPromise)_serviceMasterLoadPromise=_smdLoad().finally(()=>{_serviceMasterLoaded=true;_serviceMasterLoadPromise=null;});return _serviceMasterLoadPromise;}
function getStore(){return _serviceMasterStore;}
async function getAllComponents(){const s=await ensureLoaded();return s.components.filter(x=>!x.deprecated).map(_smdClone);}
async function getComponent(componentId){const s=await ensureLoaded();const x=s.components.find(c=>String(c.componentId)===String(componentId)&&!c.deprecated);return x?_smdClone(x):null;}
async function getComponentsByCategory(masterCategoryId){const s=await ensureLoaded();return s.components.filter(c=>!c.deprecated&&String(c.masterCategoryId)===String(masterCategoryId)).map(_smdClone);}
async function getAllCategories(){const s=await ensureLoaded();return s.categories.filter(x=>!x.deprecated).map(_smdClone);}
async function getMasterVersion(){const s=await ensureLoaded();return _smdClone(s.meta);}
async function importMasterData(input){const source=input&&input.components?input:_smdSource();if(!Array.isArray(source.components)||!Array.isArray(source.masterCategories))throw new Error('Master service data tidak valid');const checksum=source===_smdSource()&&typeof globalThis!=='undefined'?globalThis.__SERVICE_MASTER_CHECKSUM__:null;return _smdImport(source,checksum||'runtime-import','manual-import');}
const ServiceMasterDB={key:SERVICE_MASTER_DB_KEY,schemaVersion:SERVICE_MASTER_DB_SCHEMA_VERSION,ensureLoaded,getStore,getAllComponents,getComponent,getComponentsByCategory,getAllCategories,getMasterVersion,importMasterData};
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI)DatabaseAPI.serviceMaster=ServiceMasterDB;
if(typeof globalThis!=='undefined')globalThis.ServiceMasterDB=ServiceMasterDB;
if(typeof module!=='undefined')module.exports=ServiceMasterDB;
