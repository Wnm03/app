'use strict';
// Multi-model part catalog DB. Catalog data remains lazy/on-demand and model-scoped.
const PARTS_CATALOG_CATALOGS={
  KZRJ:{catalogId:'honda-vario-techno-125-kzrj-2013-2015',catalogCode:'KZRJ',model:'Honda Vario Techno 125',jsonUrl:'data/parts-catalog-vario-techno-125-kzrj.json'},
  K46:{catalogId:'honda-vario-110-fi-k46-2014-2015',catalogCode:'K46',model:'Honda Vario 110 FI',jsonUrl:'data/parts-catalog-vario-110-fi-k46.json'}
};
const DEFAULT_CATALOG='KZRJ';
const _cache=Object.create(null), _promises=Object.create(null);
const DYNAMIC_KEY='honda-pdf-catalog:store';
let _dynamic=null;
async function _loadDynamic(){if(_dynamic)return _dynamic;try{_dynamic=typeof IDBStore!=='undefined'&&IDBStore?await IDBStore.get(DYNAMIC_KEY):null;}catch(e){_dynamic=null;}return _dynamic&&Array.isArray(_dynamic.catalogs)?_dynamic:{catalogs:[]};}
function _resolveCatalog(id){
  if(!id)return PARTS_CATALOG_CATALOGS[DEFAULT_CATALOG];
  const s=String(id).toUpperCase();
  return PARTS_CATALOG_CATALOGS[s]||Object.values(PARTS_CATALOG_CATALOGS).find(x=>x.catalogId===id||x.catalogCode===id||x.model===id)||null;
}
function _nodeSource(c){
  if(typeof module!=='undefined'&&module.exports&&typeof require==='function'){
    try{return require(`../../${c.jsonUrl}`);}catch(e){/* browser uses fetch */}
  }
  return null;
}
async function _load(c){
  if(_cache[c.catalogId])return _cache[c.catalogId];
  if(!_promises[c.catalogId])_promises[c.catalogId]=(async()=>{
    const node=_nodeSource(c); if(node){_cache[c.catalogId]=node;return node;}
    if(typeof fetch==='function'){
      const res=await fetch(c.jsonUrl,{cache:'no-cache'}); if(!res.ok)throw new Error(`Parts catalog fetch failed: ${res.status}`);
      const data=await res.json(); _cache[c.catalogId]=data; return data;
    }
    throw new Error(`Parts catalog unavailable: ${c.catalogCode}`);
  })().finally(()=>{delete _promises[c.catalogId];});
  return _promises[c.catalogId];
}
function _clone(v){return JSON.parse(JSON.stringify(v));}
async function ensureLoaded(catalogId){const c=_resolveCatalog(catalogId);if(!c)throw new Error(`Unknown parts catalog: ${catalogId}`);return _load(c);}
async function getCatalogs(){const base=Object.values(PARTS_CATALOG_CATALOGS).map(_clone);const d=await _loadDynamic();return base.concat((d.catalogs||[]).map(c=>({catalogId:c.id,catalogCode:c.catalogCode||'PDF',model:c.model||'',sourceFileName:c.sourceFileName||'',vehicleId:c.vehicleId||null,dynamic:true})));}
async function getCatalogByVehicle(vehicleId){const d=await _loadDynamic();const x=(d.catalogs||[]).filter(c=>c&&c.vehicleId!=null&&String(c.vehicleId)===String(vehicleId)).sort((a,b)=>String(b.updatedAt||b.importedAt||'').localeCompare(String(a.updatedAt||a.importedAt||'')))[0];return x?_clone({catalogId:x.id,catalogCode:x.catalogCode||'PDF',model:x.model||'',vehicleId:x.vehicleId,sourceFileName:x.sourceFileName||'',parts:x.parts||[]}):null;}
function getAvailableCatalogs(){return Object.values(PARTS_CATALOG_CATALOGS).map(_clone);}
async function getCatalog(catalogId){const c=_resolveCatalog(catalogId);if(c)return _clone(await ensureLoaded(catalogId));const d=await _loadDynamic();const x=(d.catalogs||[]).find(x=>String(x.id)===String(catalogId)||String(x.catalogCode||'').toUpperCase()===String(catalogId||'').toUpperCase());return x?_clone({catalogId:x.id,catalogCode:x.catalogCode||'PDF',model:x.model||'',parts:x.parts||[],sourceFileName:x.sourceFileName||''}):null;}
async function getPart(partNumber,catalogId){const c=_resolveCatalog(catalogId);if(c){const s=await ensureLoaded(catalogId);const x=s.parts.find(p=>String(p.partNumber)===String(partNumber));return x?_clone(x):null;}const s=await getCatalog(catalogId);const x=s&&Array.isArray(s.parts)?s.parts.find(p=>String(p.partNumber)===String(partNumber)):null;return x?_clone(x):null;}
async function getPartsByComponent(componentId,catalogId){const s=await getCatalog(catalogId||DEFAULT_CATALOG);return s&&Array.isArray(s.parts)?s.parts.filter(p=>Array.isArray(p.componentIds)&&p.componentIds.includes(String(componentId))).map(_clone):[];}
async function getPartsBySection(section,catalogId){const s=await getCatalog(catalogId||DEFAULT_CATALOG);return s&&Array.isArray(s.parts)?s.parts.filter(p=>String(p.section)===String(section)).map(_clone):[];}
async function search(query,options){const catalogId=typeof options==='string'?options:(options&&options.catalogId);const q=String(query||'').trim().toLowerCase();if(!q)return [];if(catalogId){const s=await getCatalog(catalogId);return s&&Array.isArray(s.parts)?s.parts.filter(p=>[p.partNumber,p.name,p.section,...(p.componentIds||[])].some(v=>String(v).toLowerCase().includes(q))).map(_clone):[];}const catalogs=await getCatalogs();const out=[];for(const c of catalogs){const s=await getCatalog(c.catalogId);for(const p of (s&&s.parts)||[]){if([p.partNumber,p.name,p.section,...(p.componentIds||[])].some(v=>String(v).toLowerCase().includes(q)))out.push(_clone(Object.assign({},p,{catalogId:c.catalogId})));}}return out;}
const PartsCatalogDB={getCatalogByVehicle,getCatalogs,key:`parts-catalog:${PARTS_CATALOG_CATALOGS[DEFAULT_CATALOG].catalogCode.toLowerCase()}`,jsonUrl:PARTS_CATALOG_CATALOGS[DEFAULT_CATALOG].jsonUrl,defaultCatalog:DEFAULT_CATALOG,catalogs:PARTS_CATALOG_CATALOGS,getAvailableCatalogs,ensureLoaded,getCatalog,getPart,getPartsByComponent,getPartsBySection,search};
if(typeof globalThis!=='undefined')globalThis.PartsCatalogDB=PartsCatalogDB;
if(typeof DatabaseAPI!=='undefined'&&DatabaseAPI)DatabaseAPI.partsCatalog=PartsCatalogDB;
if(typeof module!=='undefined')module.exports=PartsCatalogDB;
