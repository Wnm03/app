/* Pure, non-mutating integrity checks for service, finance, stock and reminders. */
(function(g){'use strict';
function reconcile(input){
 const services=Array.isArray(input?.services)?input.services:[], transactions=Array.isArray(input?.transactions)?input.transactions:[];
 const stock=Array.isArray(input?.stock)?input.stock:[], categories=Array.isArray(input?.categories)?input.categories:[];
 const issues=[], byService=new Map(services.filter(Boolean).map(s=>[s.id,s])), byTx=new Map(transactions.filter(Boolean).map(t=>[t.id,t]));
 const seen=new Map();
 services.forEach(s=>{if(!s||!s.id)return;
  if(s.txLinkId){if(seen.has(s.txLinkId))issues.push({code:'DUPLICATE_SERVICE_TX_LINK',serviceId:s.id,transactionId:s.txLinkId,otherServiceId:seen.get(s.txLinkId)});else seen.set(s.txLinkId,s.id);
   const tx=byTx.get(s.txLinkId); if(!tx)issues.push({code:'MISSING_FINANCE',serviceId:s.id,transactionId:s.txLinkId}); else {if(tx.servisLinkId&&tx.servisLinkId!==s.id)issues.push({code:'CROSS_LINK',serviceId:s.id,transactionId:tx.id,linkedServiceId:tx.servisLinkId});if(tx.vehicleId&&s.vehicleId&&tx.vehicleId!==s.vehicleId)issues.push({code:'CROSS_VEHICLE_LINK',serviceId:s.id,transactionId:tx.id});}
  }
  if(s.categoryId&&!categories.some(c=>c&&c.id===s.categoryId))issues.push({code:'MISSING_SERVICE_CATEGORY',serviceId:s.id,categoryId:s.categoryId});
  if(s.usedPartId&&!stock.some(p=>p&&p.id===s.usedPartId))issues.push({code:'MISSING_USED_STOCK',serviceId:s.id,stockId:s.usedPartId});
  if(s.catalogPartLinkedStockId&&!stock.some(p=>p&&p.id===s.catalogPartLinkedStockId))issues.push({code:'MISSING_CATALOG_STOCK',serviceId:s.id,stockId:s.catalogPartLinkedStockId});
  if(s.nextDueDate&&Number.isNaN(Date.parse(s.nextDueDate)))issues.push({code:'INVALID_REMINDER_DATE',serviceId:s.id,value:s.nextDueDate});
  if(s.nextDueKm!=null&&(!Number.isFinite(Number(s.nextDueKm))||Number(s.nextDueKm)<0))issues.push({code:'INVALID_REMINDER_KM',serviceId:s.id,value:s.nextDueKm});
 });
 transactions.forEach(t=>{if(t&&t.servisLinkId&&!byService.has(t.servisLinkId))issues.push({code:'MISSING_SERVICE',serviceId:t.servisLinkId,transactionId:t.id});});
 return {ok:issues.length===0,issues};
}
const api={reconcile}; if(typeof window!=='undefined')window.ServiceIntegrityReconciler=api; if(typeof globalThis!=='undefined')globalThis.ServiceIntegrityReconciler=api; if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
