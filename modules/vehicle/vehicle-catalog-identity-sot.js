/* SOT-3J — identity mutation safety.
 * Strong catalog identity fields may not be changed while a catalog part is
 * referenced by operational/history domains. Classification/service fields
 * remain editable. Reconciliation/migration must explicitly handle identity.
 */
const VEHICLE_CATALOG_IDENTITY_SOT_VERSION='SOT-CATALOG-IDENTITY-V1';
const VC_IDENTITY_FIELDS=['oemCode','barcode','aftermarketCode'];
function vcIdNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\s\-_/.]+/g,'');}
function vcIdChanged(a,b){return vcIdNorm(a)!==vcIdNorm(b);}
function vcIdRefs(row){
 const out=[];
 if(row&&row.catalogPartId)out.push(String(row.catalogPartId));
 if(row&&row.catalogId)out.push(String(row.catalogId));
 Array.isArray(row&&row.catalogPartRefs)&&row.catalogPartRefs.forEach(r=>{if(r&&r.catalogId)out.push(String(r.catalogId));});
 return [...new Set(out)];
}
function vcIdUsage(input){
 const usage=new Map();
 [['stock',input.partsStock],['transactions',input.transactions],['services',input.servisLogs||input.services],['carNotes',input.carNotes||input.carNotesComponents]].forEach(([domain,rows])=>{
  (Array.isArray(rows)?rows:[]).forEach((row,index)=>vcIdRefs(row).forEach(id=>{
   if(!usage.has(id))usage.set(id,[]); usage.get(id).push({domain,index});
  }));
 });
 return usage;
}
function vcIdGuard(id,patch,existing,input){
 const changed=VC_IDENTITY_FIELDS.filter(k=>vcIdChanged(existing&&existing[k],patch&&Object.prototype.hasOwnProperty.call(patch,k)?patch[k]:existing&&existing[k]));
 if(!changed.length)return {ok:true,changed:[]};
 const usage=vcIdUsage(input||{}), refs=usage.get(String(id))||[];
 if(refs.length)return {ok:false,changed,referenced:true,usage:refs,errors:['Tidak dapat mengubah identitas OEM/barcode/aftermarket part katalog yang masih direferensikan. Jalankan rekonsiliasi terlebih dahulu.']};
 return {ok:true,changed,referenced:false,usage:[]};
}
const VehicleCatalogIdentitySOT={version:VEHICLE_CATALOG_IDENTITY_SOT_VERSION,fields:VC_IDENTITY_FIELDS.slice(),norm:vcIdNorm,guard:vcIdGuard};
if(typeof window!=='undefined')window.VehicleCatalogIdentitySOT=VehicleCatalogIdentitySOT;
if(typeof globalThis!=='undefined')globalThis.VehicleCatalogIdentitySOT=VehicleCatalogIdentitySOT;
(function install(){
 if(typeof VehicleCatalog==='undefined'||!VehicleCatalog||VehicleCatalog.__identityGateInstalled||typeof VehicleCatalog.update!=='function')return;
 const original=VehicleCatalog.update;
 VehicleCatalog.update=async function(id,patch){
  if(typeof VehicleCatalog.getById!=='function')return original.call(VehicleCatalog,id,patch);
  const existing=await VehicleCatalog.getById(id);
  if(!existing)return original.call(VehicleCatalog,id,patch);
  const data={partsStock:(typeof D!=='undefined'&&D.partsStock)||[],transactions:(typeof D!=='undefined'&&D.transactions)||[],servisLogs:(typeof D!=='undefined'&&D.servisLogs)||[],carNotes:(typeof D!=='undefined'&&(D.carNotes||D.carNotesComponents))||[]};
  const g=vcIdGuard(id,patch||{},existing,data);
  if(!g.ok)return {success:false,blocked:true,identityMutationBlocked:true,errors:g.errors,changedFields:g.changed,usage:g.usage};
  return original.call(VehicleCatalog,id,patch);
 };
 Object.defineProperty(VehicleCatalog,'__identityGateInstalled',{value:true,enumerable:false});
})();
if(typeof module!=='undefined')module.exports=VehicleCatalogIdentitySOT;
