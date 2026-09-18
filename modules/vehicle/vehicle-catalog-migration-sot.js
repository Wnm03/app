// SOT-3I — read-only dry-run + explicit apply for legacy catalog backfill.
// Adds only deterministic catalog identity fields; never rewrites historical
// snapshots, amounts, dates, names, ownership, or legacy IDs.
(function(g){'use strict';
 const VERSION='SOT-CATALOG-MIGRATION-V1';
 function norm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\s\-_/.]+/g,'');}
 function id(v){return String(v==null?'':v).trim();}
 function arr(v){return Array.isArray(v)?v:[];}
 function vehicleMatch(item,vehicleId){
   if(!vehicleId)return true;
   const ids=arr(item&&item.compatibleVehicleIds);
   return !ids.length||ids.some(x=>id(x)===id(vehicleId));
 }
 function candidatesBy(list,key,value,vehicleId){
   const n=norm(value); if(!n)return [];
   return list.filter(it=>vehicleMatch(it,vehicleId)&&norm(it&&it[key])===n);
 }
 function resolve(row,list,vehicleId,stockById){
   if(!row)return {status:'unlinked',reason:'empty-row'};
   const direct=id(row.catalogPartId||row.catalogId);
   if(direct){
     const hit=list.find(it=>id(it.id)===direct);
     return hit&&vehicleMatch(hit,vehicleId)?{status:'linked',item:hit,method:'direct-catalog-id'}:{status:'invalid',method:'direct-catalog-id',catalogPartId:direct};
   }
   // Strong legacy bridge: a transaction/service record that points to a
   // stock row inherits that row's catalog identity; no name guessing.
   const stockId=id(row.partStockId||row.usedPartId||row.catalogPartLinkedStockId);
   if(stockId&&stockById){
     const stock=stockById.get(stockId);
     if(stock){
       const sr=resolve(stock,list,vehicleId,null);
       if(sr.status==='linked')return {status:'linked',item:sr.item,method:'legacy-stock-link',stockId};
       if(sr.status==='invalid')return {status:'invalid',method:'legacy-stock-link',stockId};
     }
   }
   const oem=row.oemCode||row.catalogPartOemCode;
   let hits=candidatesBy(list,'oemCode',oem,vehicleId);
   if(hits.length===1)return {status:'linked',item:hits[0],method:'normalized-oem'};
   if(hits.length>1)return {status:'ambiguous',method:'normalized-oem',candidates:hits.map(x=>x.id)};
   hits=candidatesBy(list,'barcode',row.barcode,vehicleId);
   if(hits.length===1)return {status:'linked',item:hits[0],method:'barcode'};
   if(hits.length>1)return {status:'ambiguous',method:'barcode',candidates:hits.map(x=>x.id)};
   hits=candidatesBy(list,'aftermarketCode',row.aftermarketCode,vehicleId);
   if(hits.length===1)return {status:'linked',item:hits[0],method:'aftermarket-code'};
   if(hits.length>1)return {status:'ambiguous',method:'aftermarket-code',candidates:hits.map(x=>x.id)};
   const name=norm(row.name||row.item||row.partName||row.catalogPartName);
   const cat=norm(row.category||row.catalogCategory);
   if(name){
     hits=list.filter(it=>vehicleMatch(it,vehicleId)&&norm(it.partName)===name&&(!cat||norm(it.category)===cat));
     if(hits.length===1)return {status:'linked',item:hits[0],method:'unique-name-category'};
     if(hits.length>1)return {status:'ambiguous',method:'name-category',candidates:hits.map(x=>x.id)};
   }
   return {status:'unlinked',reason:'no-deterministic-match'};
 }
 function domains(input){return [
   ['stock',arr(input.partsStock)],
   ['transactions',arr(input.transactions)],
   ['services',arr(input.servisLogs||input.services)],
   ['carNotes',arr(input.carNotes||input.carNotesComponents)]
 ];}
 function audit(input){
   const x=input||{}; const list=arr(x.catalogItems); const stock=arr(x.partsStock);
   const stockById=new Map(stock.map(p=>[id(p&&p.id),p]).filter(([k])=>k));
   const reports=[], changes=[];
   domains(x).forEach(([domain,rows])=>{
     const report={domain,total:rows.length,alreadyLinked:0,deterministic:0,ambiguous:0,unlinked:0,invalid:0,methods:{},rows:[]};
     rows.forEach((row,index)=>{
       const vehicleId=row&&row.vehicleId||x.vehicleId||null;
       const r=resolve(row,list,vehicleId,domain==='stock'?null:stockById);
       if(r.status==='linked'){
         if(row.catalogPartId||row.catalogId)report.alreadyLinked++;else report.deterministic++;
         report.methods[r.method]=(report.methods[r.method]||0)+1;
         if(!(row.catalogPartId||row.catalogId))changes.push({domain,index,catalogPartId:r.item.id,method:r.method,stockId:r.stockId||null});
       } else report[r.status==='ambiguous'?'ambiguous':r.status==='invalid'?'invalid':'unlinked']++;
       if(r.status!=='linked' || !(row.catalogPartId||row.catalogId))report.rows.push({index,status:r.status,method:r.method||r.reason,candidates:r.candidates||[],catalogPartId:r.item&&r.item.id||null,stockId:r.stockId||null});
     });
     reports.push(report);
   });
   return {version:VERSION,ok:true,catalogCount:list.length,reports,changes,summary:{deterministic:changes.length,ambiguous:reports.reduce((n,r)=>n+r.ambiguous,0),unlinked:reports.reduce((n,r)=>n+r.unlinked,0),invalid:reports.reduce((n,r)=>n+r.invalid,0)},rules:{directId:true,stockLink:true,oem:true,barcode:true,aftermarketCode:true,uniqueNameCategory:true,ambiguousNoGuess:true,differentOemNoMerge:true,snapshotPreserved:true,historyPreserved:true,crossVehicleGuard:true,createCatalog:false}};
 }
 function applyToRows(rows,domain,list,stockById,vehicleId,changed){
   let applied=0;
   rows.forEach((row,index)=>{
     if(!row||row.catalogPartId||row.catalogId)return;
     const r=resolve(row,list,row.vehicleId||vehicleId,domain==='stock'?null:stockById);
     if(r.status!=='linked')return;
     row.catalogPartId=r.item.id;
     // Compatibility alias only; identity remains catalogPartId.
     row.catalogId=r.item.id;
     row.catalogPartName=r.item.partName||row.catalogPartName||'';
     row.catalogPartOemCode=r.item.oemCode||row.catalogPartOemCode||'';
     row.catalogCategory=r.item.category||row.catalogCategory||'';
     row.catalogSubcategory=r.item.subcategory||row.catalogSubcategory||null;
     changed.push({domain,index,catalogPartId:r.item.id,method:r.method}); applied++;
   });
   return applied;
 }
 async function dryRun(input){
   const x=input||{};
   if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.ensureLoaded==='function')await VehicleCatalog.ensureLoaded();
   const catalog=arr(x.catalogItems).length?arr(x.catalogItems):(typeof VehicleCatalog!=='undefined'&&VehicleCatalog.getAll?await VehicleCatalog.getAll():[]);
   return audit(Object.assign({},x,{catalogItems:catalog}));
 }
 async function apply(input){
   const x=input||{};
   if(typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.ensureLoaded==='function')await VehicleCatalog.ensureLoaded();
   const catalog=arr(x.catalogItems).length?arr(x.catalogItems):(typeof VehicleCatalog!=='undefined'&&VehicleCatalog.getAll?await VehicleCatalog.getAll():[]);
   const stock=arr(x.partsStock||(typeof D!=='undefined'?D.partsStock:[]));
   const transactions=arr(x.transactions||(typeof D!=='undefined'?D.transactions:[]));
   const services=arr(x.servisLogs||(typeof D!=='undefined'?D.servisLogs:[]));
   const carNotes=arr(x.carNotes||x.carNotesComponents||(typeof D!=='undefined'?(D.carNotes||D.carNotesComponents):[]));
   const stockById=new Map(stock.map(p=>[id(p&&p.id),p]).filter(([k])=>k)); const changed=[];
   applyToRows(stock,'stock',catalog,stockById,x.vehicleId,changed);
   applyToRows(transactions,'transactions',catalog,stockById,x.vehicleId,changed);
   applyToRows(services,'services',catalog,stockById,x.vehicleId,changed);
   applyToRows(carNotes,'carNotes',catalog,stockById,x.vehicleId,changed);
   if(typeof save==='function'&&changed.length&&!x.noSave)save();
   return {version:VERSION,ok:true,applied:changed.length,changes:changed,saved:!!(changed.length&&!x.noSave)};
 }
 const api={version:VERSION,norm,resolve,dryRun,audit,apply};
 if(typeof window!=='undefined')window.VehicleCatalogMigrationSOT=api;
 if(typeof globalThis!=='undefined')globalThis.VehicleCatalogMigrationSOT=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
