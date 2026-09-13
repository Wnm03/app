/* Final Car Notes audit helpers. Pure, deterministic, non-mutating. */
(function(g){'use strict';
  function arr(v){return Array.isArray(v)?v:[];}
  function reconcile(input){
    input=input||{}; const services=arr(input.services), txs=arr(input.transactions), stock=arr(input.partsStock), reminders=arr(input.reminders);
    const issues=[]; const add=(code,detail)=>issues.push(Object.assign({code},detail||{}));
    const serviceIds=new Set(services.map(x=>x&&x.id).filter(Boolean));
    const txIds=new Set(txs.map(x=>x&&x.id).filter(Boolean));
    const stockIds=new Set(stock.map(x=>x&&x.id).filter(Boolean));
    const usedTx=new Map();
    services.forEach(s=>{if(!s||!s.id)return;
      if(s.txLinkId){if(!txIds.has(s.txLinkId))add('SERVICE_FINANCE_MISSING',{serviceId:s.id,transactionId:s.txLinkId});
        if(usedTx.has(s.txLinkId))add('SERVICE_FINANCE_DUPLICATE',{serviceId:s.id,transactionId:s.txLinkId,otherServiceId:usedTx.get(s.txLinkId)}); else usedTx.set(s.txLinkId,s.id);}
      if(s.usedPartId&&!stockIds.has(s.usedPartId))add('SERVICE_STOCK_MISSING',{serviceId:s.id,stockId:s.usedPartId});
      if(s.usedPartQty!=null&&(!Number.isFinite(Number(s.usedPartQty))||Number(s.usedPartQty)<0))add('SERVICE_STOCK_QTY_INVALID',{serviceId:s.id,qty:s.usedPartQty});
      if(s.km!=null&&(!Number.isFinite(Number(s.km))||Number(s.km)<0))add('SERVICE_ODOMETER_INVALID',{serviceId:s.id,km:s.km});
      if(s.foto!=null&&!Array.isArray(s.foto))add('SERVICE_PHOTO_INVALID',{serviceId:s.id});
    });
    txs.forEach(t=>{if(!t||!t.id)return; if(t.servisLinkId&&!serviceIds.has(t.servisLinkId))add('FINANCE_SERVICE_MISSING',{transactionId:t.id,serviceId:t.servisLinkId});});
    reminders.forEach(r=>{if(!r||!r.id)return; if(r.serviceId&&!serviceIds.has(r.serviceId))add('REMINDER_SERVICE_MISSING',{reminderId:r.id,serviceId:r.serviceId}); if(r.status&&!['ACTIVE','COMPLETED','SNOOZED','DISMISSED','REQUIRES_INSPECTION'].includes(r.status))add('REMINDER_STATUS_INVALID',{reminderId:r.id,status:r.status});});
    return {ok:issues.length===0,issues};
  }
  const api={reconcile}; if(typeof window!=='undefined')window.CarNotesFinalAudit=api; if(typeof globalThis!=='undefined')globalThis.CarNotesFinalAudit=api; if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
