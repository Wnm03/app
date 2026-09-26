/* S2050 — Service Session crash/reload recovery SOT. */
(function(g){'use strict';
if(g.__SERVICE_SESSION_RECOVERY_S2050__)return;g.__SERVICE_SESSION_RECOVERY_S2050__=true;
const VERSION='SERVICE-SESSION-RECOVERY-S2050',KEY='kw_service_session_recovery_s2050';
const str=v=>v==null?'':String(v),clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}};
const storage=()=>{try{return g.localStorage||null;}catch(_){return null;}};
function read(){const s=storage();if(!s)return null;try{const raw=s.getItem(KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}}
function write(j){const s=storage();if(!s)return false;try{s.setItem(KEY,JSON.stringify(j));return true;}catch(_){return false;}}
function clear(){const s=storage();if(!s)return false;try{s.removeItem(KEY);return true;}catch(_){return false;}}
function sessionRows(ctx){const d=g.D||{},vid=str(ctx&&ctx.vehicleId),sid=str(ctx&&ctx.sessionId);return(Array.isArray(d.servisLogs)?d.servisLogs:[]).filter(r=>r&&str(r.vehicleId)===vid&&str(r.sessionId||r.serviceJobId||r.id)===sid);}
function prepare(ctx,payload){
 if(!ctx||!ctx.sessionId||!g.D)return null;
 const rows=sessionRows(ctx),payloadRows=Array.isArray(payload)?payload:[],txIds=[...new Set(rows.map(r=>r&&r.txLinkId).concat(ctx.txId||[]).filter(Boolean).map(str))],stockIds=new Set();
 const collectRow=r=>{if(!r)return;[r.usedPartId,r.catalogPartLinkedStockId,r.autoGantiStockId].filter(Boolean).forEach(id=>stockIds.add(str(id)));(r.checklist||[]).forEach(c=>{[c.usedPartId,c.catalogPartLinkedStockId,c.autoGantiStockId].filter(Boolean).forEach(id=>stockIds.add(str(id)));(c.catalogPartRefs||[]).forEach(x=>x&&x.linkedStockId&&stockIds.add(str(x.linkedStockId)));});};
 rows.forEach(collectRow);payloadRows.forEach(collectRow);
 const tx={},stock={};(g.D.transactions||[]).forEach(t=>{if(t&&txIds.includes(str(t.id)))tx[str(t.id)]=clone(t);});(g.D.partsStock||[]).forEach(p=>{if(p&&stockIds.has(str(p.id)))stock[str(p.id)]=clone(p);});
 const stockMissing=[...stockIds].filter(id=>!Object.prototype.hasOwnProperty.call(stock,id));
 return{version:VERSION,state:'PREPARED',createdAt:new Date().toISOString(),sessionId:str(ctx.sessionId),vehicleId:str(ctx.vehicleId),rows:clone(rows),tx,stock,stockMissing};
}
function persistPrepared(ctx,payload){const j=prepare(ctx,payload);return j?write(j):false;}
function markCommitted(){const j=read();if(!j)return true;j.state='COMMITTED';j.committedAt=new Date().toISOString();return write(j);}
function restore(j){if(!j||!g.D)return false;const vid=str(j.vehicleId),sid=str(j.sessionId),rows=Array.isArray(j.rows)?j.rows:[];const ids=new Set(rows.map(r=>str(r.id)));g.D.servisLogs=(g.D.servisLogs||[]).filter(r=>!(r&&str(r.vehicleId)===vid&&str(r.sessionId||r.serviceJobId||r.id)===sid)||ids.has(str(r.id)));rows.forEach(r=>{const i=g.D.servisLogs.findIndex(x=>x&&str(x.id)===str(r.id));if(i>=0)g.D.servisLogs[i]=clone(r);else g.D.servisLogs.push(clone(r));});g.D.transactions=g.D.transactions||[];Object.entries(j.tx||{}).forEach(([id,t])=>{const i=g.D.transactions.findIndex(x=>x&&str(x.id)===id);if(i>=0)g.D.transactions[i]=clone(t);else g.D.transactions.push(clone(t));});g.D.partsStock=g.D.partsStock||[];Object.entries(j.stock||{}).forEach(([id,p])=>{const i=g.D.partsStock.findIndex(x=>x&&str(x.id)===id);if(i>=0)g.D.partsStock[i]=clone(p);else g.D.partsStock.push(clone(p));});return true;}
function recover(){const j=read();if(!j)return{status:'none'};if(j.state==='COMMITTED'){let reconciliation=null;try{if(g.ServiceSessionReconcileS2051&&typeof g.ServiceSessionReconcileS2051.reconcileJournal==='function')reconciliation=g.ServiceSessionReconcileS2051.reconcileJournal(j);}catch(_reconcileErr){void _reconcileErr;}clear();return{status:'cleared-committed',sessionId:j.sessionId,reconciliation};}try{restore(j);try{if(typeof g.save==='function')g.save({domain:'servis',financeMutation:true,accountIds:[]});}catch(_){void _;}clear();return{status:'rolled-back',sessionId:j.sessionId};}catch(e){return{status:'failed',error:String(e&&e.message||e),sessionId:j.sessionId};}}
g.ServiceSessionRecoveryS2050={VERSION,KEY,prepare,persistPrepared,markCommitted,restore,recover,readJournal:read,clearJournal:clear};
try{if(typeof g.addEventListener==='function')g.addEventListener('DOMContentLoaded',()=>g.ServiceSessionRecoveryS2050.recover());}catch(_){void _;}
})(typeof globalThis!=='undefined'?globalThis:window);
