// FinanceCategorySOT — canonical owner for Finance income/expense taxonomy.
// Categories/subcategories are the ONLY persisted taxonomy; transaction
// spending classification is derived here and is never stored on transactions.
(function(g){
'use strict';
const VERSION='S2481-FINANCE-CATEGORY-SOT-001';
const CLASSES=Object.freeze(['POKOK','WAJIB','RUTIN','KEINGINAN','BISNIS','INVESTASI','SOSIAL','NON_BELANJA','PERLU_DITINJAU','PENGHASILAN']);
const TYPE={INCOME:'income',EXPENSE:'expense'};
const norm=v=>String(v==null?'':v).trim().toLocaleLowerCase('id');
const slug=v=>norm(v).replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'item';
const clone=v=>JSON.parse(JSON.stringify(v));
function cats(type){return typeof D!=='undefined'&&D.categories&&Array.isArray(D.categories[type])?D.categories[type]:[];}
function validType(type){return type===TYPE.INCOME||type===TYPE.EXPENSE;}
function ensureShape(){
 if(typeof D==='undefined')return false;
 if(!D.categories||typeof D.categories!=='object')D.categories={income:[],expense:[]};
 if(!Array.isArray(D.categories.income))D.categories.income=[];
 if(!Array.isArray(D.categories.expense))D.categories.expense=[];
 D.categories.income.forEach(c=>{if(c&&!Array.isArray(c.subs))c.subs=[];});
 D.categories.expense.forEach(c=>{if(c&&!Array.isArray(c.subs))c.subs=[];});
 return true;
}
const SUB_RULES=[
 [/^(aksesoris|aksesori|shoping|shopping|outfit|skincare|salon|jajan|mainan|mainan & buku|baju|pakaian)$/,'KEINGINAN'],
 [/^(vario 110|vario 125)$/,'WAJIB'],
 [/(wisata|hotel|tiket|rekreasi)/,'KEINGINAN'],
 [/(susu|gizi|sekolah|pendidikan|buku|sangu|sabun|apotik|obat)/,'POKOK'],
 [/(bensin|bbm|oli|servis|sparepart|onderdil|cvt|ban|elektrik|pajak|perawatan kendaraan|perawatan)/,'WAJIB'],
 [/(kuota|pulsa|telepon|wifi|listrik|bpjs|admin|materai)/,'RUTIN'],
 [/(cobek|mebel|bantal|blouse|pengiriman|pemasaran)/,'BISNIS'],
 [/(donasi|sedekah|kurban|tahlilan|thr)/,'SOSIAL']
];
const LEGACY_CLASS_ALIASES=Object.freeze({
 expense:{'tagihan':'WAJIB','dana titipan':'NON_BELANJA','istri':'WAJIB','keluarga':'SOSIAL'},
 income:{}
});
const CAT_RULES=[
 [/^(makan|bahan makanan|anak|kesehatan)$/,'POKOK'],
 [/(belanja)/,'POKOK'],
 [/(tagihan|biaya|bpjs|rumah|renov|transport|kendaraan|vario|bepergian|mesin|servis jasa)/,'WAJIB'],
 [/^(istri)$/,'WAJIB'],
 [/^(keluarga)$/,'SOSIAL'],
 [/^(dana titipan|piutang)$/,'NON_BELANJA'],
 [/^(dana titipan|piutang)$/,'NON_BELANJA'],
 [/(handphone|elektronik)/,'RUTIN'],
 [/(shopping|perawatan)/,'KEINGINAN'],
 [/(bisnis|usaha)/,'BISNIS'],
 [/(investasi)/,'INVESTASI'],
 [/(sedekah|donasi|hadiah)/,'SOSIAL'],
 [/(gaji|penghasilan|tambahan|tani)/,'PENGHASILAN']
];
function inferCategoryClass(type,name){
 if(type===TYPE.INCOME)return 'PENGHASILAN';
 const n=norm(name);
 for(const [re,c] of CAT_RULES)if(re.test(n))return c;
 return 'PERLU_DITINJAU';
}
function inferSubClass(type,catName,subName,catClass){
 if(type===TYPE.INCOME)return 'PENGHASILAN';
 const s=norm(subName), c=norm(catName);
 // Context-specific mappings take precedence over generic lexical rules.
 // They are derived from observed transaction taxonomy and avoid known semantic collisions.
 if(c==='makan'&&s==='jajan')return 'POKOK';
 if(c==='handphone'&&s==='aksesoris hp')return 'KEINGINAN';
 if(c==='handphone'&&s==='hp')return 'RUTIN';
 if(c==='bepergian'&&s==='kamar kecil')return 'WAJIB';
 for(const [re,cl] of SUB_RULES)if(re.test(s))return cl;
 // Context-specific overrides avoid broad category guesses.
 if(c==='istri')return 'WAJIB';
 if(c==='dana titipan')return 'NON_BELANJA';
 if(c==='piutang')return 'NON_BELANJA';
 if(c==='servis jasa')return 'WAJIB';
 if(c==='keluarga')return 'SOSIAL';
 if(c==='belanja')return 'POKOK';
 if(c==='rumah'||c==='renov'||c==='tagihan & biaya'||c==='tagihan')return 'WAJIB';
 return catClass||'PERLU_DITINJAU';
}
function normalizeMetadata(){
 ensureShape();
 ['income','expense'].forEach(type=>cats(type).forEach((c,ci)=>{
   if(!c||typeof c!=='object')return;
   if(!c.id)c.id='cat_'+type+'_'+slug(c.name)+'_'+ci;
   if(!Array.isArray(c.subs))c.subs=[];
   if(!validClass(c.classification))c.classification=inferCategoryClass(type,c.name);
   c.subs.forEach((s,si)=>{
     if(!s||typeof s!=='object')return;
     if(!s.id)s.id='sub_'+slug(c.name)+'_'+slug(s.name)+'_'+si;
     if(!validClass(s.classification))s.classification=inferSubClass(type,c.name,s.name,c.classification);
   });
 }));
 return true;
}
function validClass(c){return CLASSES.includes(c);}
function findById(type,id){return cats(type).find(c=>c&&String(c.id)===String(id))||null;}
function findByName(type,name){const n=norm(name);const exact=cats(type).find(c=>c&&norm(c.name)===n);if(exact)return exact;const aliases=type===TYPE.EXPENSE?{'tagihan':'tagihan & biaya'}:{};const target=aliases[n];return target?cats(type).find(c=>c&&norm(c.name)===norm(target))||null:null;}
function findSub(cat,sub){if(!cat)return null;const n=norm(sub);return (cat.subs||[]).find(s=>s&&(String(s.id)===String(sub)||norm(s.name)===n))||null;}
function resolve(input){
 const t=input||{}; const type=t.type==='income'?TYPE.INCOME:t.type==='expense'?TYPE.EXPENSE:null;
 if(!type)return {ok:false,code:'INVALID_TYPE',classification:'PERLU_DITINJAU'};
 let cat=(t.categoryId?findById(type,t.categoryId):null)||findByName(type,t.category);
 let sub=cat?((t.subcategoryId?findSub(cat,t.subcategoryId):null)||findSub(cat,t.subcategory)):null;
 // S2504: explicit subcategory references are fail-closed. Never silently
 // detach a subcategory that belongs to another category or does not exist.
 const explicitSubId=t.subcategoryId!=null&&String(t.subcategoryId)!=='';
 const explicitSubName=t.subcategory!=null&&String(t.subcategory).trim()!=='';
 if(cat&&((explicitSubId&&!findSub(cat,t.subcategoryId))||(explicitSubName&&!sub)))
   return {ok:false,code:'SUBCATEGORY_UNRESOLVED',type,categoryId:cat.id,subcategoryId:null,categoryName:cat.name,subcategoryName:null,classification:'PERLU_DITINJAU',source:'unresolved'};
 const categoryId=cat?cat.id:null, subcategoryId=sub?sub.id:null;
 const alias=!cat&&type===TYPE.EXPENSE?LEGACY_CLASS_ALIASES.expense[norm(t.category)]:null; const inferredCat=cat?inferCategoryClass(type,cat.name):null; const inferredSub=sub?inferSubClass(type,cat&&cat.name,sub.name,(cat&&validClass(cat.classification)?cat.classification:inferredCat)):null; const classification=type===TYPE.INCOME?'PENGHASILAN':(sub&&validClass(sub.classification)?sub.classification:(inferredSub|| (cat&&validClass(cat.classification)?cat.classification:(inferredCat||(alias||'PERLU_DITINJAU')))));
 return {ok:!!cat,type,categoryId,subcategoryId,categoryName:cat&&cat.name||null,subcategoryName:sub&&sub.name||null,classification,source:sub?'subcategory':cat?'category':'unresolved'};
}
const SEVEN_CLASSES=Object.freeze(['POKOK','WAJIB','RUTIN','KEINGINAN','BISNIS','INVESTASI','SOSIAL']);
function reconcileLegacyTransactionTaxonomy(rows){
 const list=Array.isArray(rows)?rows:[];
 const changed=[];
 const issues=[];
 const ensureLegacyCategory=(name)=>{
   let c=findByName(TYPE.EXPENSE,name);
   if(c)return c;
   if(norm(name)==='dana titipan'){
     c={id:'cat_dana_titipan_legacy',name:'Dana Titipan',emoji:'📦',subs:[],classification:'NON_BELANJA',legacyAlias:'restore-legacy-finance-taxonomy'};
     cats(TYPE.EXPENSE).push(c);
     changed.push({kind:'category-created',name:c.name,id:c.id});
     return c;
   }
   return null;
 };
 const ensureLegacySubcategory=(cat,name)=>{
   if(!cat)return null;
   let s=findSub(cat,name);
   if(s)return s;
   if(norm(cat.name)==='tagihan & biaya'&&norm(name)==='pulsa/kuota'){
     s={id:'sub_tagihan_biaya_pulsa_kuota_legacy',name:'Pulsa/Kuota',classification:'RUTIN',legacyAlias:'restore-legacy-finance-taxonomy'};
     if(!Array.isArray(cat.subs))cat.subs=[];
     cat.subs.push(s);
     changed.push({kind:'subcategory-created',categoryId:String(cat.id),categoryName:cat.name,name:s.name,id:s.id});
     return s;
   }
   return null;
 };
 list.forEach((tx,index)=>{
   if(!tx||!validType(tx.type)||tx.type!==TYPE.EXPENSE)return;
   const rawCategory=String(tx.category==null?'':tx.category).trim();
   const rawSub=String(tx.subcategory==null?'':tx.subcategory).trim();
   if(norm(rawCategory)==='dana titipan'){
     const c=ensureLegacyCategory('Dana Titipan');
     if(!c)issues.push({code:'LEGACY_FINANCE_CATEGORY_UNRESOLVED',index,id:tx.id,category:rawCategory});
   }
   if(norm(rawCategory)==='tagihan'&&norm(rawSub)==='pulsa/kuota'){
     const c=findByName(TYPE.EXPENSE,'Tagihan');
     const s=ensureLegacySubcategory(c,'Pulsa/Kuota');
     if(!s)issues.push({code:'LEGACY_FINANCE_SUBCATEGORY_UNRESOLVED',index,id:tx.id,category:rawCategory,subcategory:rawSub});
   }
 });
 return {ok:issues.length===0,changed,issues};
}
function resolveSeven(input){
 const classification=resolve(input||{}).classification;
 return SEVEN_CLASSES.includes(classification)?classification:null;
}
function classify(input){return resolve(input||{}).classification;}
function matches(input,classification){return classify(input)===classification;}
function list(type){return validType(type)?cats(type).map(clone):[];}
function addCategory(type,data){
 if(!validType(type))throw new Error('INVALID_CATEGORY_TYPE'); normalizeMetadata();
 const name=String(data&&data.name||'').trim(); if(!name)throw new Error('CATEGORY_NAME_REQUIRED');
 if(findByName(type,name))throw new Error('CATEGORY_DUPLICATE');
 const c={id:data&&data.id||('cat_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)),name,emoji:data&&data.emoji||'📦',subs:[],classification:validClass(data&&data.classification)?data.classification:inferCategoryClass(type,name)};
 cats(type).push(c); return c;
}
function updateCategory(type,id,patch){
 const c=findById(type,id); if(!c)throw new Error('CATEGORY_NOT_FOUND');
 const oldName=c.name;
 const nextName=patch&&patch.name!==undefined?String(patch.name).trim():c.name;
 if(!nextName)throw new Error('CATEGORY_NAME_REQUIRED');
 const dupe=cats(type).find(x=>x!==c&&norm(x.name)===norm(nextName)); if(dupe)throw new Error('CATEGORY_DUPLICATE');
 c.name=nextName;
 if(patch&&patch.emoji!==undefined)c.emoji=patch.emoji||'📦';
 if(patch&&validClass(patch.classification))c.classification=patch.classification;
 if(patch&&Object.prototype.hasOwnProperty.call(patch,'linkedVehicleId'))c.linkedVehicleId=patch.linkedVehicleId||null;
 if(oldName!==nextName){
   const d=typeof D!=='undefined'?D:null;
   (Array.isArray(d&&d.transactions)?d.transactions:[]).forEach(tx=>{
     if(tx&&tx.type===type&&(String(tx.categoryId||'')===String(c.id)||norm(tx.category)===norm(oldName))){tx.category=nextName;}
   });
   if(type==='expense')(Array.isArray(d&&d.bills)?d.bills:[]).forEach(b=>{if(b&&b.category===oldName)b.category=nextName;});
 }
 return c;
}
function removeCategory(type,id){
 const a=cats(type),i=a.findIndex(c=>c&&String(c.id)===String(id));
 if(i<0)throw new Error('CATEGORY_NOT_FOUND');
 const removed=a[i], cid=String(removed.id), subIds=new Set((removed.subs||[]).map(s=>String(s&&s.id||'')));
 const d=typeof D!=='undefined'?D:null;
 if(d){
   (Array.isArray(d.transactions)?d.transactions:[]).forEach(tx=>{
     if(!tx||tx.type!==type)return;
     if(String(tx.categoryId||'')===cid){
       delete tx.categoryId;
       if(subIds.has(String(tx.subcategoryId||'')))delete tx.subcategoryId;
     }else if(subIds.has(String(tx.subcategoryId||''))){
       delete tx.subcategoryId;
     }
   });
   (Array.isArray(d.budgets)?d.budgets:[]).forEach(b=>{
     if(!Array.isArray(b.catIds))return;
     b.catIds=[...new Set(b.catIds.filter(raw=>String(raw)!==cid&&!subIds.has(String(raw))))];
     if(!b.catIds.length)b.catIds=['__total__'];
   });
 }
 return a.splice(i,1)[0];
}
function addSubcategory(type,catId,data){const c=findById(type,catId);if(!c)throw new Error('CATEGORY_NOT_FOUND');if(!Array.isArray(c.subs))c.subs=[];const name=String(data&&data.name||'').trim();if(!name)throw new Error('SUBCATEGORY_NAME_REQUIRED');if(c.subs.some(s=>norm(s.name)===norm(name)))throw new Error('SUBCATEGORY_DUPLICATE');const s={id:data&&data.id||('sub_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)),name,classification:validClass(data&&data.classification)?data.classification:inferSubClass(type,c.name,name,c.classification)};c.subs.push(s);return s;}
function updateSubcategory(type,catId,subId,patch){
 const c=findById(type,catId),s=findSub(c,subId);if(!c||!s)throw new Error('SUBCATEGORY_NOT_FOUND');
 const oldName=s.name,name=patch&&patch.name!==undefined?String(patch.name).trim():s.name;
 if(!name)throw new Error('SUBCATEGORY_NAME_REQUIRED');
 if(c.subs.some(x=>x!==s&&norm(x.name)===norm(name)))throw new Error('SUBCATEGORY_DUPLICATE');
 s.name=name;if(validClass(patch&&patch.classification))s.classification=patch.classification;
 if(oldName!==name){
   const d=typeof D!=='undefined'?D:null;
   (Array.isArray(d&&d.transactions)?d.transactions:[]).forEach(tx=>{
     if(tx&&tx.type===type&&String(tx.categoryId||'')===String(c.id)&&(String(tx.subcategoryId||'')===String(s.id)||norm(tx.subcategory)===norm(oldName)))tx.subcategory=name;
   });
   if(type==='expense')(Array.isArray(d&&d.bills)?d.bills:[]).forEach(b=>{if(b&&b.category===c.name&&b.subcategory===oldName)b.subcategory=name;});
 }
 return s;
}
function removeSubcategory(type,catId,subId){
 const c=findById(type,catId);if(!c)throw new Error('CATEGORY_NOT_FOUND');
 const sid=String(subId),i=c.subs.findIndex(s=>s&&String(s.id)===sid);
 if(i<0)throw new Error('SUBCATEGORY_NOT_FOUND');
 const d=typeof D!=='undefined'?D:null;
 if(d){
   (Array.isArray(d.transactions)?d.transactions:[]).forEach(tx=>{
     if(tx&&tx.type===type&&String(tx.subcategoryId||'')===sid)delete tx.subcategoryId;
   });
   (Array.isArray(d.budgets)?d.budgets:[]).forEach(b=>{
     if(!Array.isArray(b.catIds))return;
     b.catIds=[...new Set(b.catIds.filter(raw=>String(raw)!==sid))];
     if(!b.catIds.length)b.catIds=['__total__'];
   });
 }
 return c.subs.splice(i,1)[0];
}
function ensureCategory(type,data){normalizeMetadata();const c=findByName(type,data&&data.name);if(c){if(data&&data.linkedVehicleId&&!c.linkedVehicleId)c.linkedVehicleId=data.linkedVehicleId;return c;}return addCategory(type,data);}
function ensureSubcategory(type,catId,data){const c=findById(type,catId);if(!c)throw new Error('CATEGORY_NOT_FOUND');const s=findSub(c,data&&data.name);if(s)return s;return addSubcategory(type,catId,data);}
function _remapTaxonomyReferences(type,catMap,subMap){
 const d=typeof D!=='undefined'?D:null; if(!d)return;
 const txs=Array.isArray(d.transactions)?d.transactions:[];
 txs.forEach(tx=>{
   if(!tx||tx.type!==type)return;
   const cid=tx.categoryId==null?'':String(tx.categoryId);
   const sid=tx.subcategoryId==null?'':String(tx.subcategoryId);
   if(cid&&catMap.has(cid))tx.categoryId=catMap.get(cid);
   if(sid&&subMap.has(sid))tx.subcategoryId=subMap.get(sid);
   const canonicalCat=tx.categoryId?findById(type,tx.categoryId):null;
   if(canonicalCat){tx.category=canonicalCat.name;const canonicalSub=tx.subcategoryId?findSub(canonicalCat,tx.subcategoryId):null;if(canonicalSub)tx.subcategory=canonicalSub.name;}
 });
 const budgets=Array.isArray(d.budgets)?d.budgets:[];
 budgets.forEach(b=>{
   if(!b)return;
   if(Array.isArray(b.catIds))b.catIds=[...new Set(b.catIds.map(raw=>catMap.get(String(raw))||subMap.get(String(raw))||raw))];
   if(b.catId!=null)b.catId=catMap.get(String(b.catId))||subMap.get(String(b.catId))||b.catId;
 });
}
function mergeDuplicates(type){
 if(!validType(type))throw new Error('INVALID_CATEGORY_TYPE');
 normalizeMetadata(); const a=cats(type), seen=new Map(), out=[], catMap=new Map(), subMap=new Map();
 a.forEach(c=>{
   const k=norm(c&&c.name); if(!c||!k)return;
   const prior=seen.get(k);
   if(!prior){seen.set(k,c);out.push(c);return;}
   if(c.id&&prior.id&&String(c.id)!==String(prior.id))catMap.set(String(c.id),String(prior.id));
   const priorSubs=Array.isArray(prior.subs)?prior.subs:[];
   const subSeen=new Map(priorSubs.filter(Boolean).map(s=>[norm(s.name),s]));
   (c.subs||[]).forEach(s=>{
     if(!s)return;
     const sk=norm(s.name), existing=subSeen.get(sk);
     if(existing){if(s.id&&existing.id&&String(s.id)!==String(existing.id))subMap.set(String(s.id),String(existing.id));}
     else {priorSubs.push(s);subSeen.set(sk,s);}
   });
   if((!validClass(prior.classification)||prior.classification==='PERLU_DITINJAU')&&validClass(c.classification))prior.classification=c.classification;
 });
 _remapTaxonomyReferences(type,catMap,subMap);
 D.categories[type]=out;
 return {categories:out,categoryRemap:Object.fromEntries(catMap),subcategoryRemap:Object.fromEntries(subMap)};
}
function reconcileBudgetReferences(budgets){
 const valid=new Set(), legacy=new Map(), legacySub=new Map(), ambiguousSub=new Set();
 ['income','expense'].forEach(type=>cats(type).forEach(c=>{
   valid.add(String(c.id)); legacy.set('cat_'+slug(c.name),String(c.id));
   (c.subs||[]).forEach(s=>{
     valid.add(String(s.id));
     legacy.set('sub_'+slug(c.name)+'_'+slug(s.name),String(s.id));
     const k='sub_'+slug(s.name), prev=legacySub.get(k);
     if(prev&&prev!==String(s.id))ambiguousSub.add(k); else if(!ambiguousSub.has(k))legacySub.set(k,String(s.id));
   });
 }));
 ambiguousSub.forEach(k=>legacySub.delete(k));
 legacySub.forEach((id,k)=>legacy.set(k,id));
 const rows=Array.isArray(budgets)?budgets:[]; let changed=0,removed=0,unresolved=0;
 rows.forEach(b=>{if(!b||!Array.isArray(b.catIds))return;const before=b.catIds.slice();const mapped=[];
   for(const raw of before){const id=String(raw);if(id==='__total__'||valid.has(id)){mapped.push(id);continue;}const hit=legacy.get(id);if(hit){mapped.push(hit);changed++;}else{mapped.push(id);unresolved++;}}
   b.catIds=[...new Set(mapped)]; if(!b.catIds.length){b.catIds=['__total__'];removed++;}
 });
 return {changed,removed,unresolved};
}
function replaceSnapshot(snapshot){
 const next=clone(snapshot||{income:[],expense:[]});
 D.categories={income:Array.isArray(next.income)?next.income:[],expense:Array.isArray(next.expense)?next.expense:[]};
 normalizeMetadata(); return clone(D.categories);
}
const api={VERSION,TYPE,CLASSES,SEVEN_CLASSES,normalizeMetadata,mergeDuplicates,reconcileBudgetReferences,reconcileLegacyTransactionTaxonomy,list,findById,findByName,findSub,resolve,resolveSeven,classify,matches,addCategory,updateCategory,removeCategory,addSubcategory,updateSubcategory,removeSubcategory,ensureCategory,ensureSubcategory,replaceSnapshot};
g.FinanceCategorySOT=api;
if(typeof window!=='undefined')window.FinanceCategorySOT=api;
})(typeof globalThis!=='undefined'?globalThis:this);
