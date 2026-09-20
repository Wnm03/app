// vehicle-model-registry-sot.js — SOT-4B
// Registry metadata untuk identifikasi kendaraan. Tidak mengarang model/part;
// taxonomy komponen diambil dari sumber model/VehiclePartSOT yang memang ada.
const VEHICLE_MODEL_REGISTRY_SOT_VERSION='SOT-VEHICLE-MODEL-REGISTRY-V1';
const VEHICLE_MODEL_PROFILE_OVERRIDES={
  'vario-125':{vehicleType:'motor',bodyType:'matic',manufacturerId:'honda',generation:'KZR',yearRange:'2012–2014',aliases:['honda vario 125','vario 125 kzr','vario techno 125','vario techno 125 kzr','vario kzr']},
  'beat-fi':{vehicleType:'motor',bodyType:'matic',manufacturerId:'honda',generation:'Gen 1',yearRange:null,aliases:['honda beat fi','beat fi gen 1']}
};
function vmrsNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[()[\],./_-]+/g,' ').replace(/\s+/g,' ').trim();}
function vmrsModels(){if(typeof DatabaseAPI!=='undefined'){if(DatabaseAPI.vehicleModel&&typeof DatabaseAPI.vehicleModel.getAll==='function')return DatabaseAPI.vehicleModel.getAll();if(DatabaseAPI.vehicle&&typeof DatabaseAPI.vehicle.modelGetAll==='function')return DatabaseAPI.vehicle.modelGetAll();}return []}
function vmrsProfile(model){if(!model)return null;const o=VEHICLE_MODEL_PROFILE_OVERRIDES[String(model.id)]||{};return Object.assign({id:model.id,name:model.name||model.displayName||model.id,manufacturerId:model.manufacturerId||o.manufacturerId||null,vehicleType:o.vehicleType||model.vehicleType||null,bodyType:o.bodyType||model.bodyType||null,generation:o.generation||model.generation||null,yearRange:o.yearRange||model.yearRange||null,aliases:[]},o,{id:model.id,name:model.name||model.displayName||model.id});}
function vmrsFind(input={}){const models=vmrsModels();const explicit=String(input.modelId||'').trim();if(explicit){const m=models.find(x=>String(x.id)===explicit);if(m)return {model:m,profile:vmrsProfile(m),confidence:'explicit'};}
 const n=vmrsNorm(input.name||input.vehicleName||'');if(!n)return {model:null,profile:null,confidence:'none',candidates:[]};
 const hits=[];models.forEach(m=>{const p=vmrsProfile(m);const a=[m.name,m.displayName].concat(m.matchNames||[],p.aliases||[]).map(vmrsNorm).filter(Boolean);let score=0;let matched=null;a.forEach(x=>{if(n===x&&score<100){score=100;matched=x;}else if((n.includes(x)||x.includes(n))&&score<70){score=70;matched=x;}});if(score)hits.push({model:m,profile:p,score,matched});});
 hits.sort((a,b)=>b.score-a.score);if(!hits.length)return {model:null,profile:null,confidence:'none',candidates:[]};const top=hits[0],ties=hits.filter(x=>x.score===top.score);if(ties.length>1)return {model:null,profile:null,confidence:'ambiguous',candidates:ties.map(x=>x.profile)};return {model:top.model,profile:top.profile,confidence:top.score>=100?'exact':'alias',matched:top.matched,candidates:[top.profile]};}
const VEHICLE_MANUFACTURER_HINTS=[
  {id:'honda',label:'Honda',aliases:['honda']},
  {id:'yamaha',label:'Yamaha',aliases:['yamaha']},
  {id:'suzuki',label:'Suzuki',aliases:['suzuki']},
  {id:'kawasaki',label:'Kawasaki',aliases:['kawasaki']},
  {id:'toyota',label:'Toyota',aliases:['toyota']},
  {id:'daihatsu',label:'Daihatsu',aliases:['daihatsu']},
  {id:'mitsubishi',label:'Mitsubishi',aliases:['mitsubishi']},
  {id:'isuzu',label:'Isuzu',aliases:['isuzu']},
  {id:'nissan',label:'Nissan',aliases:['nissan']},
  {id:'hyundai',label:'Hyundai',aliases:['hyundai']},
  {id:'kia',label:'Kia',aliases:['kia']}
];
const VEHICLE_TYPE_HINTS=[
  {type:'motor',bodyType:'matic',aliases:['matic','scoopy','vario','beat','aerox','nmax','lexi','pcx','adv','mio','fino','address']},
  {type:'motor',bodyType:'bebek',aliases:['supra','revo','jupiter','vega','shogun','smash']},
  {type:'motor',bodyType:'sport',aliases:['cbr','cb150','r15','r25','ninja','gsx','vixion']},
  {type:'mobil',bodyType:'pickup',aliases:['grand max pickup','gran max pickup','pickup','carry pickup','hilux','traga']},
  {type:'mobil',bodyType:'mpv',aliases:['xenia','avanza','sigra','calya','ertiga','mobilio','innova']},
  {type:'mobil',bodyType:'suv',aliases:['rush','terios','pajero','fortuner','brv','hrv','crv']},
  {type:'mobil',bodyType:'hatchback',aliases:['brio','agya','ayla','jazz','yaris']},
  {type:'mobil',bodyType:'sedan',aliases:['civic sedan','city sedan','vios','camry','corolla']}
];
function vmrsInferMeta(input={}){
  const n=vmrsNorm(input.name||input.vehicleName||'');
  if(!n)return {status:'none',manufacturer:null,vehicleType:null,bodyType:null,confidence:'none'};
  const brands=VEHICLE_MANUFACTURER_HINTS.filter(b=>(b.aliases||[]).some(a=>n===vmrsNorm(a)||n.includes(' '+vmrsNorm(a))||n.startsWith(vmrsNorm(a)+' ')));
  const types=VEHICLE_TYPE_HINTS.filter(t=>(t.aliases||[]).some(a=>n.includes(vmrsNorm(a))));
  const manufacturer=brands.length===1?brands[0]:null;
  const typeKeys=[...new Set(types.map(t=>t.type))];
  const bodyKeys=[...new Set(types.map(t=>t.bodyType).filter(Boolean))];
  return {
    status:manufacturer||typeKeys.length===1?'detected':'partial',
    manufacturer:manufacturer?{id:manufacturer.id,label:manufacturer.label}:null,
    vehicleType:typeKeys.length===1?typeKeys[0]:null,
    bodyType:bodyKeys.length===1?bodyKeys[0]:null,
    confidence:(manufacturer&&typeKeys.length===1)?'hint':'partial',
    candidates:types.map(t=>({vehicleType:t.type,bodyType:t.bodyType,alias:t.aliases.find(a=>n.includes(vmrsNorm(a)))||null}))
  };
}
function vmrsTaxonomy(model){
 const cats=[];const seen=new Set();const add=(name,sub,source)=>{const c=String(name||'').trim();if(!c)return;const k=vmrsNorm(c);let row=cats.find(x=>x.key===k);if(!row){row={key:k,name:c,source:source||'model',subcategories:[],components:[]};cats.push(row);}const s=String(sub||'').trim();if(s&&!row.subcategories.includes(s))row.subcategories.push(s);};
 if(model&&String(model.id)==='vario-125'&&typeof VehiclePartSOT!=='undefined'&&Array.isArray(VehiclePartSOT.seed)){VehiclePartSOT.seed.forEach(x=>{add(x.category,x.subcategory,'catalog-seed');if(x.partName){const row=cats.find(y=>y.key===vmrsNorm(x.category));if(row&&!row.components.includes(x.partName))row.components.push(x.partName);}});}
 if(!cats.length&&model&&model.torsi&&Array.isArray(model.torsi.cats))model.torsi.cats.forEach(c=>{add(c&&c.cat,null,'vehicle-database');const row=cats[cats.length-1];(c.items||[]).forEach(i=>{if(i&&i.name&&!row.components.includes(i.name))row.components.push(i.name);});});
 return cats.map(({key,...x})=>x);
}
const VehicleModelRegistrySOT={version:VEHICLE_MODEL_REGISTRY_SOT_VERSION,normalize:vmrsNorm,find:vmrsFind,inferMeta:vmrsInferMeta,profile:vmrsProfile,taxonomy:vmrsTaxonomy,getAll:()=>vmrsModels().map(vmrsProfile),manufacturers:()=>VEHICLE_MANUFACTURER_HINTS.slice()};
if(typeof window!=='undefined')window.VehicleModelRegistrySOT=VehicleModelRegistrySOT;
