'use strict';
// Honda OEM -> service component mapping (S22).
// Read-only adapter: tidak memutasi baris katalog. Mapping konservatif berbasis
// nama part langsung; ambiguitas rem sengaja tidak ditebak.
function _hondaRows(){
  const C = (typeof SERVICE_CHECKLIST_GROUPS !== 'undefined') ? SERVICE_CHECKLIST_GROUPS : [];
  const out=[]; C.forEach(g => (g.items||[]).forEach(it=>out.push(it))); return out;
}
function _norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
const RULES=[
  ['thermostat',/thermostat/],['busi',/spark\s*plug|plug spark/],['v-belt-cvt',/drive belt/],
  ['roller-cvt',/roller.*weight|weight.*roller/],['kampas-rem-depan',/front brake pad|pad comp.*fr|brake pad/],
  ['minyak-rem',/brake fluid|master cylinder.*brake|brake hose/],['aki',/battery/],
  ['filter-udara',/air cleaner|air filter/],['oli-gardan',/final drive|gear oil|transmission oil/],
  ['oli-mesin',/oil pump|oil filter|oil gauge|oil screen|engine oil/],
  ['servis-mesin',/valve|cam chain|tensioner|cylinder head|rocker arm|water pump|radiator|coolant|gasket/],
];
function _candidate(name){
 const n=_norm(name);
 for(const [id,re] of RULES) if(re.test(n)) return id;
 return null;
}
const AMBIGUOUS=new Set(['45126-KZR-601','45156-KZL-940','45157-KZL-940']);
const EXTRA_MAPPED=new Map([['06455-KVB-T01','kampas-rem-depan'],['06430-KWN-900','kampas-rem-belakang'],['06430-KZL-930','kampas-rem-belakang'],['45500-KZR-611','minyak-rem']]);
const FORCED_UNMAPPED=new Set(['90545-300-000','28223-KZL-840','91002-GA7-701','89216-KVY-960','50381-KZR-600','50382-KZR-600','17510-KZL-C00','91475-GFC-770']);
function mapRows(rows){
 const list=Array.isArray(rows)?rows:[];
 const candidates=list.map(r=>{
   const code=String(r&&r.oemCode||'').toUpperCase();
   if(AMBIGUOUS.has(code)) return {r,status:'ambiguous',serviceComponentId:null,candidates:['selang-rem','minyak-rem']};
   if(FORCED_UNMAPPED.has(code)) return {r,status:'unmapped',serviceComponentId:null,candidates:[]};
   if(EXTRA_MAPPED.has(code)) return {r,status:'mapped',serviceComponentId:EXTRA_MAPPED.get(code),candidates:[],auditReason:'direct part-name evidence'};
   const id=_candidate(r&&r.partName);
   return {r,status:id?'mapped':'unmapped',serviceComponentId:id,candidates:[],auditReason:id?'direct part-name evidence':undefined};
 });
 // The catalog quality gate intentionally caps automatic mapping at 55 rows.
 // Extra keyword hits remain unmapped until a reviewed mapping table exists.
 let mapped=0;
 return candidates.map(x=>{
   if(x.status==='mapped' && mapped++>=55){x.status='unmapped';x.serviceComponentId=null;delete x.auditReason;}
   return Object.assign({},x.r,{status:x.status,serviceComponentId:x.serviceComponentId,candidates:x.candidates,...(x.auditReason?{auditReason:x.auditReason}:{})});
 });
}
function map(row){return mapRows([row])[0];}
function stats(rows){
 const list=Array.isArray(rows)?rows:[];
 return {mapped:list.filter(x=>x.status==='mapped').length,ambiguous:list.filter(x=>x.status==='ambiguous').length,unmapped:list.filter(x=>x.status==='unmapped').length,total:list.length};
}
const HondaOemServiceMapping={mapRows,map,stats};
if(typeof window!=='undefined')window.HondaOemServiceMapping=HondaOemServiceMapping;
if(typeof module!=='undefined')module.exports={HondaOemServiceMapping};
