/* S2047 — Service Session Mutation SOT
 * One checklist edit is one session mutation: ADD / REMOVE / REPLACE / UNCHANGED.
 * This module reconciles the post-edit state across History, Reminder projection,
 * stock usage, Finance ownership, lifecycle and reload-safe persistence.
 */
(function(g){'use strict';
  if(g.__SERVICE_SESSION_MUTATION_S2047__)return;
  g.__SERVICE_SESSION_MUTATION_S2047__=true;
  const VERSION='SERVICE-SESSION-MUTATION-S2047-HARDENED';
  const str=v=>v==null?'':String(v).trim();
  const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return v&&typeof v==='object'?Object.assign({},v):v;}};
  const cid=row=>str(row&&(row.serviceComponentId||row.itemId||row.checklistItemId||row.itemName));
  const key=row=>str(row&&(row.serviceComponentId||row.itemId||row.itemName));
  const componentMap=payload=>{
    const m=new Map();(Array.isArray(payload)?payload:[]).forEach(r=>{const k=key(r);if(k&&!m.has(k))m.set(k,r);});return m;
  };
  const stockEntriesFromRows=(rows,vehicleId)=>{
    const out=[];
    (Array.isArray(rows)?rows:[]).forEach(row=>{
      const list=Array.isArray(row&&row.checklist)&&row.checklist.length?row.checklist:[row];
      list.forEach(r=>{
        if(!r)return;
        if(r.usedPartId&&Number(r.usedPartQty)>0)out.push({partId:r.usedPartId,qty:Number(r.usedPartQty)});
        (Array.isArray(r.catalogPartRefs)?r.catalogPartRefs:[]).forEach(ref=>{
          if(!ref||!ref.catalogId)return;
          let linked=null;
          try{if(g.Servis&&typeof g.Servis.findMatchingStockByCatalogId==='function')linked=g.Servis.findMatchingStockByCatalogId(ref.catalogId,vehicleId);}catch(_){void _;}
          if(linked)out.push({partId:linked.id,qty:Number(ref.qty)>0?Number(ref.qty):1});
        });
      });
    });
    return out;
  };
  function classify(oldPayload,newPayload){
    const oldM=componentMap(oldPayload),newM=componentMap(newPayload),added=[],removed=[],unchanged=[],replaced=[];
    oldM.forEach((oldRow,k)=>{if(!newM.has(k))removed.push({key:k,old:clone(oldRow)});else{
      const n=newM.get(k);const same=JSON.stringify(oldRow)===JSON.stringify(n);(same?unchanged:replaced).push({key:k,old:clone(oldRow),new:clone(n)});
    }});
    newM.forEach((newRow,k)=>{if(!oldM.has(k))added.push({key:k,new:clone(newRow)});});
    return {added,removed,unchanged,replaced};
  }
  function desiredRows(ctx,payload){
    const original=Array.isArray(ctx&&ctx.originalRows)?ctx.originalRows:[];
    const byKey=new Map();original.forEach(r=>{const k=key(r);if(k&&!byKey.has(k))byKey.set(k,r);});
    const firstOriginal=original[0]||{};
    const rows=[];
    (Array.isArray(payload)?payload:[]).forEach((p,i)=>{
      const k=key(p);if(!k)return;
      const base=clone(byKey.get(k)||{});
      const row=Object.assign(base,p);
      row.id=base.id||((i===0&&ctx.selected&&ctx.selected.id)?ctx.selected.id:(typeof g.uid==='function'?g.uid():'servis_'+Date.now()+'_'+i));
      row.sessionId=ctx.sessionId;row.serviceJobId=ctx.sessionId;row.vehicleId=ctx.vehicleId;
      row.date=p.date||base.date||ctx.date||ctx.selected?.date;
      row.km=p.km!=null?p.km:(base.km!=null?base.km:ctx.selected?.km);
      row.note=p.note!=null?p.note:(base.note!=null?base.note:ctx.selected?.note||'');
      row.accountId=p.accountId||base.accountId||ctx.selected?.accountId||null;
      row.item=p.itemName||p.item||base.item||k;
      row.serviceComponentId=p.serviceComponentId||p.itemId||base.serviceComponentId||base.itemId||k;
      row.serviceComponentNameSnapshot=p.itemName||base.serviceComponentNameSnapshot||row.item;
      row.checklist=[clone(p)];
      row.cost=0;row.txLinkId=null;
      if(g.ServiceHistoryChecklistEditS2036&&typeof g.ServiceHistoryChecklistEditS2036.ensureProjection==='function'){
        try{
          const projection=g.ServiceHistoryChecklistEditS2036.ensureProjection(row,ctx.vehicleId);
          if(projection){row.categoryId=projection.category?.id||row.categoryId||null;row.masterCategoryId=projection.masterCategoryId||row.masterCategoryId||null;row.intervalKmAtService=projection.intervalKm;row.intervalBulanAtService=projection.intervalBulan;row.reminderIntervalSource=projection.serviceComponentId?'service-master':'legacy-category';
            const cat=projection.category;
            if(cat&&typeof g.buildServiceNextDueSnapshot==='function'){
              const snap=g.buildServiceNextDueSnapshot({vehicleId:ctx.vehicleId,cat,serviceKm:row.km,serviceDate:row.date,actionType:row.actionType||null});
              row.nextDueKm=snap.nextDueKm;row.nextDueDate=snap.nextDueDate;row.nextDueAxis=snap.nextDueAxis;
            }
          }
        }catch(_projectionErr){void _projectionErr;}
      }
      rows.push(row);
    });
    if(rows.length===0)return [];
    return rows.map((r,i)=>{if(i===0){const src=ctx.selected||firstOriginal;['foto','conditionResult','conditionNote','catalogPartId','catalogPartQty','catalogPartOemCode','catalogPartLinkedStockId','catalogPartRefs','usedPartId','usedPartQty'].forEach(k=>{if(r[k]==null&&src[k]!=null)r[k]=clone(src[k]);});}return r;});
  }
  function reconcileRows(ctx,payload){
    const logs=Array.isArray(g.D&&g.D.servisLogs)?g.D.servisLogs:[];
    const vid=str(ctx.vehicleId),sid=str(ctx.sessionId);
    const before=logs.filter(r=>r&&str(r.vehicleId)===vid&&str(r.sessionId||r.serviceJobId||r.id)===sid);
    const rows=desiredRows(ctx,payload);
    const oldByKey=new Map();before.forEach(r=>{const k=key(r);if(k&&!oldByKey.has(k))oldByKey.set(k,r);});
    const keepIds=new Set(rows.map(r=>str(r.id)));
    const newKeys=new Set(rows.map(r=>key(r)));
    const removedRows=before.filter(r=>!newKeys.has(key(r)));
    g.D.servisLogs=logs.filter(r=>!(r&&str(r.vehicleId)===vid&&str(r.sessionId||r.serviceJobId||r.id)===sid)||keepIds.has(str(r.id)));
    rows.forEach((r,i)=>{
      const idx=g.D.servisLogs.findIndex(x=>x&&str(x.id)===str(r.id));
      if(idx>=0)g.D.servisLogs[idx]=r;else g.D.servisLogs.push(r);
    });
    return {before,rows,removedRows,oldByKey};
  }
  function consolidateFinance(ctx,rows){
    const linkedIds=new Set((ctx.originalRows||[]).map(r=>r&&r.txLinkId).filter(Boolean));
    const oldTxId=ctx.txId||[...linkedIds][0]||null;
    const componentCosts=(Array.isArray(rows)?rows:[]).flatMap(r=>Array.isArray(r.checklist)?r.checklist:[]).filter(c=>c&&c.costBreakdown&&c.costBreakdown.source==='component');
    const total=componentCosts.length?componentCosts.reduce((n,c)=>n+Number(c.costBreakdown?.total||0),0):(rows.length?Number(ctx.legacyCost||0):0);
    const owner=rows[0]||null;
    const tx=(oldTxId&&Array.isArray(g.D.transactions))?(g.D.transactions.find(t=>t&&t.id===oldTxId)||null):null;
    if(!owner){
      if(oldTxId&&Array.isArray(g.D.transactions))g.D.transactions=g.D.transactions.filter(t=>t&&t.id!==oldTxId);
      return {txId:null,total:0};
    }
    if(!owner.txLinkId&&tx)owner.txLinkId=tx.id;
    (g.D.transactions||[]).filter(t=>t&&linkedIds.has(t.id)&&t.id!==owner.txLinkId).forEach(t=>{g.D.transactions=g.D.transactions.filter(x=>x!==t);});
    if(owner.txLinkId){const active=(g.D.transactions||[]).find(t=>t&&t.id===owner.txLinkId);if(active){if(total>0){active.amount=total;active.date=owner.date;active.accountId=owner.accountId;active.note=owner.item||'Servis';active.servisLinkId=owner.id;}else{g.D.transactions=g.D.transactions.filter(t=>t.id!==active.id);owner.txLinkId=null;}}else owner.txLinkId=null;}
    if(total>0&&!owner.txLinkId){const id=typeof g.uid==='function'?g.uid():'tx_'+Date.now();g.D.transactions.push({id,type:'expense',amount:total,category:typeof g.resolveVehicleTxCategory==='function'?g.resolveVehicleTxCategory((g.D.vehicles||[]).find(v=>v&&v.id===owner.vehicleId)):'Servis',subcategory:'Servis & Oli',accountId:owner.accountId||null,payMethod:'tunai',note:owner.item||'Servis',date:owner.date,servisLinkId:owner.id});owner.txLinkId=id;}
    rows.forEach(r=>{if(r!==owner){r.cost=0;r.txLinkId=null;}});owner.cost=total;
    return {txId:owner.txLinkId||null,total};
  }
  async function reconcileStock(ctx,rows){
    if(!g.Servis||typeof g.Servis.replaceStockUsages!=='function')return true;
    const current=stockEntriesFromRows(rows,ctx.vehicleId);
    const desired=current; // rows are the desired post-edit state; this call is intentionally a no-op unless caller supplies a current snapshot.
    return {current,desired};
  }
  function snapshotState(){
    const d=g.D||{};
    return {
      servisLogs:clone(Array.isArray(d.servisLogs)?d.servisLogs:[]),
      transactions:clone(Array.isArray(d.transactions)?d.transactions:[]),
      partsStock:clone(Array.isArray(d.partsStock)?d.partsStock:[]),
      sparepartCats:clone(Array.isArray(d.sparepartCats)?d.sparepartCats:[])
    };
  }
  function restoreState(s){
    if(!s||!g.D)return false;
    g.D.servisLogs=clone(s.servisLogs||[]);
    g.D.transactions=clone(s.transactions||[]);
    g.D.partsStock=clone(s.partsStock||[]);
    if(Array.isArray(s.sparepartCats))g.D.sparepartCats=clone(s.sparepartCats);
    try{if(typeof g.save==='function')g.save({domain:'servis',financeMutation:true,accountIds:[]});}catch(_saveRollbackErr){void _saveRollbackErr;}
    return true;
  }
  async function reconcileAfterSave(ctx,payload){
    if(!ctx||!ctx.sessionId)return {ok:false,reason:'no-session'};
    const fingerprint=()=>{try{return JSON.stringify({sessionId:ctx.sessionId,vehicleId:ctx.vehicleId,payload:payload||[]});}catch(_){return String(ctx.sessionId)+'|'+String(Date.now());}};
    const fp=fingerprint();
    if(ctx._s2047MutationFingerprint===fp)return {ok:true,idempotent:true,sessionId:ctx.sessionId};
    if(ctx._s2047MutationInFlight)return ctx._s2047MutationInFlight;
    ctx._s2047MutationInFlight=(async()=>{
    const journal=ctx._s2047PreMutationState||snapshotState();
    if(g.ServiceSessionRecoveryS2050&&typeof g.ServiceSessionRecoveryS2050.persistPrepared==='function')g.ServiceSessionRecoveryS2050.persistPrepared(ctx,payload);
    if(g.ServiceSessionRecoveryS2050&&typeof g.ServiceSessionRecoveryS2050.persistPrepared==='function')g.ServiceSessionRecoveryS2050.persistPrepared(ctx,payload);
    try{
    const oldPayload=(ctx.originalRows||[]).flatMap(r=>Array.isArray(r.checklist)?r.checklist:[]);
    const desiredPayload=Array.isArray(payload)?payload:[];
    const classification=classify(oldPayload,desiredPayload);
    const oldStock=stockEntriesFromRows(ctx.originalRows,ctx.vehicleId);
    const currentBefore=(g.D.servisLogs||[]).filter(r=>r&&str(r.vehicleId)===str(ctx.vehicleId)&&str(r.sessionId||r.serviceJobId||r.id)===str(ctx.sessionId));
    const currentStock=stockEntriesFromRows(currentBefore,ctx.vehicleId);
    const desiredRowsPreview=desiredRows(ctx,desiredPayload);
    const desiredStock=stockEntriesFromRows(desiredRowsPreview,ctx.vehicleId);
    const stockFingerprint=entries=>{const m=new Map();(Array.isArray(entries)?entries:[]).forEach(e=>{const id=str(e&&e.partId),q=Number(e&&e.qty);if(id&&Number.isFinite(q)&&q>0)m.set(id,(m.get(id)||0)+q);});return JSON.stringify([...m.entries()].sort((a,b)=>a[0].localeCompare(b[0])));};
    if(g.Servis&&typeof g.Servis.replaceStockUsages==='function'&&stockFingerprint(currentStock)!==stockFingerprint(desiredStock)){
      const stockOk=await g.Servis.replaceStockUsages(currentStock,desiredStock);
      if(stockOk===false)throw new Error('SERVICE_SESSION_STOCK_RECONCILIATION_FAILED');
    }
    const rowResult=reconcileRows(ctx,desiredPayload);
    const finance=consolidateFinance(ctx,rowResult.rows);
    const beforeIds=new Set(rowResult.before.map(r=>str(r.id)));
    rowResult.rows.forEach(r=>{
      if(g.ServiceEventLifecycle){
        try{
          if(!beforeIds.has(str(r.id))&&typeof g.ServiceEventLifecycle.create==='function')g.ServiceEventLifecycle.create(r);
          else if(typeof g.ServiceEventLifecycle.update==='function')g.ServiceEventLifecycle.update(r,{txId:r.txLinkId||null,categoryId:r.categoryId||null});
        }catch(_){void _;}
      }
    });
    rowResult.removedRows.forEach(r=>{if(g.ServiceEventLifecycle&&typeof g.ServiceEventLifecycle.remove==='function'){try{g.ServiceEventLifecycle.remove(r,{deletedTxId:r.txLinkId||null,categoryId:r.categoryId||null,vehicleId:r.vehicleId||null});}catch(_){void _;}}});
    if(rowResult.rows.length){
      const owner=rowResult.rows[0];
      const changes=classification.added.map(x=>({type:'ADDED',component:x.key})).concat(classification.removed.map(x=>({type:'REMOVED',component:x.key})),classification.replaced.map(x=>({type:'REPLACED',component:x.key})));
      if(changes.length){if(!Array.isArray(owner.editHistory))owner.editHistory=[];owner.editHistory.push({changedAt:new Date().toISOString(),changedBy:'self',scope:'service-session-checklist',changes});if(owner.editHistory.length>50)owner.editHistory=owner.editHistory.slice(-50);}
    }
    if(g.save)g.save({domain:'servis',financeMutation:true,accountIds:[...new Set(rowResult.rows.map(r=>r.accountId).filter(Boolean))]});
    if(g.ServiceSessionRecoveryS2050&&typeof g.ServiceSessionRecoveryS2050.markCommitted==='function')g.ServiceSessionRecoveryS2050.markCommitted();
    if(finance.txId&&g.AIBus&&typeof g.AIBus.emit==='function'){try{const owner=rowResult.rows[0];g.AIBus.emit('finance.updated',{txId:finance.txId,category:typeof g.resolveVehicleTxCategory==='function'?g.resolveVehicleTxCategory((g.D.vehicles||[]).find(v=>v&&v.id===owner?.vehicleId)):'Servis',type:'expense',amount:finance.total,kind:'servis',action:'session-reconcile'});}catch(_){void _;}}
    if(typeof g.refreshCarNotesAfterMutation==='function')try{g.refreshCarNotesAfterMutation({stock:true});}catch(_){void _;}
    if(typeof g.ServiceSessionIntegrityS2045!=='undefined'&&g.ServiceSessionIntegrityS2045&&rowResult.rows.length&&typeof g.ServiceSessionIntegrityS2045.repair==='function'){
      try{rowResult.rows.forEach(r=>g.ServiceSessionIntegrityS2045.repair(r));}catch(_integrityErr){void _integrityErr;}
    }
    if(typeof g.Servis==='object'&&g.Servis){
      try{if(typeof g.Servis.renderReminder==='function')g.Servis.renderReminder();}catch(_reminderErr){void _reminderErr;}
      try{if(typeof g.renderDashboardServisReminder==='function')g.renderDashboardServisReminder();}catch(_dashboardReminderErr){void _dashboardReminderErr;}
    }
    const result={ok:true,classification,rows:rowResult.rows,removedRows:rowResult.removedRows,finance,oldStock,currentStock,recovery:'committed'};
    ctx._s2047MutationFingerprint=fp;
    return result;
    }catch(err){
      restoreState(journal);
      if(g.ServiceSessionRecoveryS2050&&typeof g.ServiceSessionRecoveryS2050.clearJournal==='function')g.ServiceSessionRecoveryS2050.clearJournal();
      throw err;
    }
    })();
    try{return await ctx._s2047MutationInFlight;}finally{ctx._s2047MutationInFlight=null;}
  }
  g.ServiceSessionMutationS2047={VERSION,classify,reconcileAfterSave,stockEntriesFromRows};
})(typeof globalThis!=='undefined'?globalThis:window);
