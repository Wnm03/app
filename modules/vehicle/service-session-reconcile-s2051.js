/* S2051 — Service Session post-reload reconciliation SOT.
 * Safe reconciliation only: it repairs deterministic ownership/link drift,
 * reports stale/missing projections, and never invents a second service row.
 */
(function(g){'use strict';
if(g.__SERVICE_SESSION_RECONCILE_S2051__)return;g.__SERVICE_SESSION_RECONCILE_S2051__=true;
const VERSION='SERVICE-SESSION-RECONCILE-S2051';
const str=v=>v==null?'':String(v);
const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}};
const sessionKey=r=>str(r&&(r.sessionId||r.serviceJobId||r.id));
function rowsFor(vehicleId,sessionId){const d=g.D||{};return(Array.isArray(d.servisLogs)?d.servisLogs:[]).filter(r=>r&&str(r.vehicleId)===str(vehicleId)&&sessionKey(r)===str(sessionId));}
function componentIds(rows){const s=new Set();(rows||[]).forEach(r=>{const cs=Array.isArray(r.checklist)&&r.checklist.length?r.checklist:[r];cs.forEach(c=>{const id=str(c&&(c.serviceComponentId||c.itemId||c.checklistItemId||c.itemName));if(id)s.add(id);});});return s;}
function signature(rows){return JSON.stringify((rows||[]).map(r=>({id:str(r.id),cid:str(r.serviceComponentId||r.itemId),cat:str(r.masterCategoryId||r.categoryId),cost:Number(r.cost)||0,tx:str(r.txLinkId),check:Array.isArray(r.checklist)?r.checklist.map(c=>str(c&&(c.serviceComponentId||c.itemId||c.itemName))).sort():[]})).sort((a,b)=>a.id.localeCompare(b.id)));}
function auditSession(vehicleId,sessionId){
 const rows=rowsFor(vehicleId,sessionId),txs=Array.isArray(g.D&&g.D.transactions)?g.D.transactions:[],owners=new Map(),issues=[];
 txs.forEach(t=>{if(t&&t.servisLinkId){const k=str(t.servisLinkId);if(!owners.has(k))owners.set(k,[]);owners.get(k).push(t);}});
 const ownerRows=rows.filter(r=>r&&r.txLinkId);
 if(ownerRows.length>1)issues.push({type:'multiple_row_tx_owners',ids:ownerRows.map(r=>r.id)});
 ownerRows.forEach(r=>{const linked=owners.get(str(r.id))||[];if(!linked.length)issues.push({type:'missing_finance_target',rowId:r.id,txId:r.txLinkId});if(linked.length>1)issues.push({type:'duplicate_finance_transactions',rowId:r.id,transactionIds:linked.map(t=>t.id)});});
 txs.filter(t=>t&&t.servisLinkId).forEach(t=>{if(!rows.some(r=>r.id===t.servisLinkId))issues.push({type:'orphan_finance_link',transactionId:t.id,servisId:t.servisLinkId});});
 const ids=componentIds(rows);
 const reminderCats=Array.isArray(g.D&&g.D.sparepartCats)?g.D.sparepartCats.filter(c=>c&&str(c.vehicleId||vehicleId)===str(vehicleId)&&c.serviceComponentId):[];
 const staleReminder=reminderCats.filter(c=>!ids.has(str(c.serviceComponentId)));
 if(staleReminder.length)issues.push({type:'stale_reminder_projection',categoryIds:staleReminder.map(c=>c.id),componentIds:staleReminder.map(c=>c.serviceComponentId)});
 return {version:VERSION,vehicleId:vehicleId||null,sessionId:sessionId||null,rows,signature:signature(rows),componentIds:[...ids],issues,ok:issues.length===0};
}
function repairReminder(vehicleId){
 const d=g.D||{};if(!Array.isArray(d.sparepartCats)||!Array.isArray(d.servisLogs))return{changed:false,removed:[]};
 const vid=str(vehicleId||'');const active=componentIds(d.servisLogs.filter(r=>r&&str(r.vehicleId)===vid));const removed=[];
 d.sparepartCats=d.sparepartCats.filter(c=>{
   if(!c||str(c.vehicleId||vid)!==vid||!str(c.serviceComponentId))return true;
   const cid=str(c.serviceComponentId);if(active.has(cid))return true;
   if(!str(c.id).startsWith('sp_component_'))return true;
   removed.push(c.id);return false;
 });
 return{changed:removed.length>0,removed};
}
function repairFinance(vehicleId){
 const d=g.D||{};if(!Array.isArray(d.servisLogs)||!Array.isArray(d.transactions))return {changed:false,issues:[]};
 let changed=false;const issues=[];
 const byService=new Map();d.transactions.forEach(t=>{if(t&&t.servisLinkId){const k=str(t.servisLinkId);if(!byService.has(k))byService.set(k,[]);byService.get(k).push(t);}});
 const valid=new Set(d.servisLogs.filter(r=>!vehicleId||str(r.vehicleId)===str(vehicleId)).map(r=>str(r.id)));
 d.transactions.forEach(t=>{if(t&&t.servisLinkId&&valid.has(str(t.servisLinkId))===false){t.servisLinkId=null;changed=true;issues.push({type:'cleared_orphan_finance_link',transactionId:t.id});}});
 byService.forEach((list,sid)=>{if(list.length<2)return;const row=d.servisLogs.find(r=>str(r.id)===sid);if(!row|| (vehicleId&&str(row.vehicleId)!==str(vehicleId)))return;const keepId=str(row.txLinkId||list[0].id);const keep=list.find(t=>str(t.id)===keepId)||list[0];row.txLinkId=keep.id;list.forEach(t=>{if(t!==keep){t.servisLinkId=null;changed=true;issues.push({type:'detached_duplicate_finance_link',transactionId:t.id,keptTransactionId:keep.id,servisId:sid});}});});
 return {changed,issues};
}
function reconcileVehicle(vehicleId){
 const sessions=new Set();(g.D&&Array.isArray(g.D.servisLogs)?g.D.servisLogs:[]).filter(r=>r&&(!vehicleId||str(r.vehicleId)===str(vehicleId))).forEach(r=>sessions.add(str(r.sessionId||r.serviceJobId||r.id)));
 const before=[...sessions].map(sid=>auditSession(vehicleId,sid));const repair=repairFinance(vehicleId);const reminder=repairReminder(vehicleId);if((repair.changed||reminder.changed)&&typeof g.save==='function')try{g.save({domain:'servis',financeMutation:repair.changed,accountIds:[]});}catch(_){void _;}
 const reports=[...sessions].map(sid=>auditSession(vehicleId,sid));
 return {version:VERSION,vehicleId:vehicleId||null,reports,beforeReports:before,repair,reminder,ok:reports.every(r=>r.ok)&&!repair.issues.length};
}
function reconcileJournal(journal){if(!journal)return null;return reconcileVehicle(journal.vehicleId);}
g.ServiceSessionReconcileS2051={VERSION,rowsFor,auditSession,repairFinance,repairReminder,reconcileVehicle,reconcileJournal,signature};
})(typeof globalThis!=='undefined'?globalThis:window);
