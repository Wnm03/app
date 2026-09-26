/* S2036 — Checklist Edit Session Reconciliation
 * Edit pada checklist adalah mutasi satu service session. Parent history tetap
 * menyimpan snapshot checklist lengkap, sementara setiap komponen yang dipilih
 * harus punya row session agar History/Reminder membaca komponen yang sama.
 * D.servisLogs tetap menjadi storage SoT; sparepartCats hanya compatibility index.
 */
(function(g){'use strict';
  if(g.__SERVICE_HISTORY_CHECKLIST_EDIT_S2036__)return;
  g.__SERVICE_HISTORY_CHECKLIST_EDIT_S2036__=true;
  const VERSION='SERVICE-HISTORY-CHECKLIST-EDIT-S2036';
  const str=v=>v==null?'':String(v).trim();
  function ensureProjection(row,vehicleId){
    const r=row||{}, vid=str(vehicleId||g.curVehicleId), cid=str(r.serviceComponentId||r.itemId||r.checklistItemId);
    let master=null;
    if(cid&&g.ServiceInputCatalog&&typeof g.ServiceInputCatalog.itemById==='function'){
      const hit=g.ServiceInputCatalog.itemById(cid);if(hit&&hit.item)master=hit;
    }
    const name=str(r.itemName||r.serviceComponentNameSnapshot||r.item||(master&&master.item&&master.item.name));
    let cat=cid?(g.D.sparepartCats||[]).find(c=>c&&str(c.serviceComponentId)===cid&&(!c.vehicleId||str(c.vehicleId)===vid)):null;
    if(!cat&&r.categoryId)cat=(g.D.sparepartCats||[]).find(c=>c&&str(c.id)===str(r.categoryId)&&(!c.vehicleId||str(c.vehicleId)===vid))||null;
    const masterCategoryId=str(r.masterCategoryId||(master&&master.group&&master.group.masterCategoryId))||null;
    const masterInterval=master&&master.item&&Number(master.item.intervalKm)>0?Number(master.item.intervalKm):null;
    const masterMonths=master&&master.item&&Number(master.item.intervalTimeMonths)>0?Number(master.item.intervalTimeMonths):null;
    const override=Number(r.intervalKmOverride)>0?Number(r.intervalKmOverride):null;
    const intervalKm=override||masterInterval;
    if(!cat&&cid){
      const base='sp_component_'+cid;let id=base;
      if((g.D.sparepartCats||[]).some(c=>c&&str(c.id)===id))id=base+'_'+vid;
      cat={id,name:name||cid,code:typeof g.codeFromName==='function'?g.codeFromName(name||cid):cid.toUpperCase(),intervalKm:intervalKm||0,intervalBulan:masterMonths||0,masterCategoryId,serviceComponentId:cid,showInReminder:!!(intervalKm||masterMonths),group:master&&master.group&&master.group.group||null,groupIcon:master&&master.group&&master.group.icon||''};
      if(vid)cat.vehicleId=vid;
      if(g.VehicleCarNotesSOT&&typeof g.VehicleCarNotesSOT.syncLegacyCategoryProjection==='function')g.VehicleCarNotesSOT.syncLegacyCategoryProjection(cat,'checklist-projection');
      g.D.sparepartCats.push(cat);
    }else if(cat){
      const vehicle=(g.D.vehicles||[]).find(v=>v&&str(v.id)===vid);
      const categoryOverride=vehicle&&vehicle.intervalOverrides&&Number(vehicle.intervalOverrides[cat.id])>0?Number(vehicle.intervalOverrides[cat.id]):null;
      if(cid&&!cat.serviceComponentId)cat.serviceComponentId=cid;
      if(masterCategoryId&&!cat.masterCategoryId)cat.masterCategoryId=masterCategoryId;
      if(name&&!cat.name)cat.name=name;
      if(master&&master.group){if(!cat.group)cat.group=master.group.group||null;if(!cat.groupIcon)cat.groupIcon=master.group.icon||'';}
      if(intervalKm&&!categoryOverride)cat.intervalKm=intervalKm;
      if(masterMonths)cat.intervalBulan=masterMonths;
      if(intervalKm||masterMonths)cat.showInReminder=true;
    }
    const effectiveKm=cat&&typeof g.getEffectiveIntervalKm==='function'?g.getEffectiveIntervalKm(vid,cat):(cat&&Number(cat.intervalKm)>0?Number(cat.intervalKm):intervalKm);
    const effectiveMonths=cat&&typeof g.getEffectiveIntervalBulan==='function'?g.getEffectiveIntervalBulan(cat,vid):(cat&&Number(cat.intervalBulan)>0?Number(cat.intervalBulan):masterMonths);
    return {category:cat,serviceComponentId:cid||null,masterCategoryId:masterCategoryId||null,intervalKm:override||effectiveKm||null,intervalBulan:effectiveMonths||null};
  }
  function reconcile(s,checklistPayload,vehicleId,serviceDate,serviceKm){
    if(!s||!Array.isArray(checklistPayload)||!checklistPayload.length)return {rows:[],createdRows:[],added:0,updated:0,removed:0};
    const vid=str(vehicleId||s.vehicleId||g.curVehicleId),sid=str(s.sessionId||s.serviceJobId||s.id);
    const sessionRows=(g.D.servisLogs||[]).filter(x=>x&&str(x.vehicleId)===vid&&str(x.sessionId||x.serviceJobId||x.id)===sid);
    const componentIdOf=row=>str(row&&(row.serviceComponentId||row.itemId||row.checklistItemId));
    const payloadById=new Map();checklistPayload.forEach(r=>{const id=componentIdOf(r);if(id&&!payloadById.has(id))payloadById.set(id,r);});
    const existingById=new Map();
    sessionRows.forEach(row=>{const ids=Array.isArray(row.checklist)&&row.checklist.length?row.checklist.map(componentIdOf).filter(Boolean):[componentIdOf(row)].filter(Boolean);ids.forEach(id=>{if(!existingById.has(id))existingById.set(id,row);});});
    let added=0,updated=0,removed=0;const createdRows=[];
    const makeSnapshot=(row,owner)=>{
      const projection=ensureProjection(row,vid),cat=projection.category,action=row.actionType||owner.actionType||'ganti';
      const snap=cat&&typeof g.buildServiceNextDueSnapshot==='function'?g.buildServiceNextDueSnapshot({vehicleId:vid,cat,serviceKm,serviceDate,actionType:action}):{nextDueKm:null,nextDueDate:null,nextDueAxis:null};
      row.categoryId=cat&&cat.id||row.categoryId||owner.categoryId||null;
      row.masterCategoryId=projection.masterCategoryId||row.masterCategoryId||owner.masterCategoryId||null;
      row.serviceComponentId=projection.serviceComponentId||row.serviceComponentId||null;
      row.serviceComponentNameSnapshot=str(row.itemName||row.item||row.serviceComponentNameSnapshot)||null;
      row.intervalKmAtService=projection.intervalKm;row.intervalBulanAtService=projection.intervalBulan;
      row.reminderIntervalSource=Number(row.intervalKmOverride)>0?'component-override':(projection.serviceComponentId?'service-master':'legacy-category');
      row.nextDueKm=snap.nextDueKm;row.nextDueDate=snap.nextDueDate;row.nextDueAxis=snap.nextDueAxis;
      return row;
    };
    checklistPayload.forEach((payload,index)=>{
      const cid=componentIdOf(payload);if(!cid)return;
      let owner=existingById.get(cid)||null;if(!owner&&index===0)owner=s;
      if(!owner){
        const id=typeof g.uid==='function'?g.uid():'servis_'+Date.now()+'_'+index;
        owner={id,sessionId:s.sessionId||s.serviceJobId||null,serviceJobId:s.serviceJobId||s.sessionId||null,vehicleId:vid,date:serviceDate,item:payload.itemName||cid,categoryId:null,masterCategoryId:payload.masterCategoryId||null,serviceComponentId:cid,serviceComponentNameSnapshot:payload.itemName||cid,serviceJobType:s.serviceJobType||null,serviceJobLabel:s.serviceJobLabel||null,serviceJobEvidence:s.serviceJobEvidence||null,actionType:payload.actionType||s.actionType||'ganti',km:serviceKm,cost:0,note:s.note||'',accountId:s.accountId||null,txLinkId:null,usedPartId:null,usedPartQty:0,catalogPartId:null,catalogPartQty:0,catalogPartRefs:[],catalogPartOemCode:'',catalogPartLinkedStockId:null,foto:[],checklist:[],checklistNotApplicable:Array.isArray(s.checklistNotApplicable)?s.checklistNotApplicable.slice():[],conditionResult:null,conditionNote:'',costBreakdown:{labor:null,parts:null,consumables:null,other:null,total:0,source:'component'},serviceCost:null,source:'CHECKLIST-EDIT'};
        g.D.servisLogs.push(owner);existingById.set(cid,owner);createdRows.push(owner);added++;
      }
      owner.item=payload.itemName||owner.item;owner.actionType=payload.actionType||owner.actionType;owner.masterCategoryId=payload.masterCategoryId||owner.masterCategoryId||null;owner.serviceComponentId=cid;owner.checklist=[payload];owner.conditionResult=payload.conditionResult||null;owner.conditionNote=payload.conditionNote||'';makeSnapshot(owner,s);updated++;
    });
    s.checklist=checklistPayload.slice();
    const mainId=str(s.id),keepIds=new Set(createdRows.map(r=>str(r.id)));
    checklistPayload.forEach(payload=>{const id=componentIdOf(payload),owner=existingById.get(id);if(owner)keepIds.add(str(owner.id));});
    const beforeLen=g.D.servisLogs.length;
    g.D.servisLogs=g.D.servisLogs.filter(row=>{
      if(!row||str(row.id)===mainId)return true;
      if(str(row.vehicleId)!==vid||str(row.sessionId||row.serviceJobId||row.id)!==sid)return true;
      const cid=componentIdOf(row);if(!cid||payloadById.has(cid)||keepIds.has(str(row.id)))return true;
      return !(Number(row.cost||0)===0&&!row.txLinkId);
    });
    removed=Math.max(0,beforeLen-g.D.servisLogs.length);
    return {rows:g.D.servisLogs.filter(row=>row&&str(row.vehicleId)===vid&&str(row.sessionId||row.serviceJobId||row.id)===sid),createdRows,added,updated,removed};
  }
  const api={VERSION,ensureProjection,reconcile};
  g.ServiceHistoryChecklistEditS2036=api;
  if(g.Servis)g.Servis.serviceHistoryChecklistEditS2036=api;
})(typeof globalThis!=='undefined'?globalThis:window);
