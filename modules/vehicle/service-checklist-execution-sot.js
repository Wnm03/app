/* S2004 — Checklist execution status SOT.
 * Additive execution lifecycle; existing ServiceEventSOT.checklistState remains
 * the inspection/result state. This module answers whether a checklist item was
 * planned, completed, or explicitly skipped.
 */
(function(g){'use strict';
  const VERSION='SERVICE-CHECKLIST-EXECUTION-SOT-1';
  const STATES=Object.freeze(['PLANNED','COMPLETED','SKIPPED']);
  function normalizeState(v){const s=String(v||'').trim().toUpperCase();return STATES.includes(s)?s:null;}
  function infer(row){
    if(!row)return 'PLANNED';
    if(row.executionStatus&&normalizeState(row.executionStatus))return normalizeState(row.executionStatus);
    if(row.notApplicable===true)return 'SKIPPED';
    if(row.conditionResult||row.actionType)return 'COMPLETED';
    return 'PLANNED';
  }
  function canTransition(from,to){
    const a=normalizeState(from)||'PLANNED', b=normalizeState(to);
    if(!b)return false;
    if(a===b)return true;
    return (a==='PLANNED'&&(b==='COMPLETED'||b==='SKIPPED')) || (a==='COMPLETED'&&b==='PLANNED') || (a==='SKIPPED'&&b==='PLANNED');
  }
  function transition(current,next){
    const from=normalizeState(current)||'PLANNED', to=normalizeState(next);
    if(!to||!canTransition(from,to))return {ok:false,from,to:to||null,code:'INVALID_EXECUTION_TRANSITION'};
    return {ok:true,from,to};
  }
  function normalize(row){
    const x=Object.assign({},row||{}); const before=x.executionStatus;
    x.executionStatus=infer(x); x.serviceChecklistExecutionSotVersion=VERSION;
    return {ok:true,changed:before!==x.executionStatus,row:x};
  }
  function normalizeRows(rows){return Array.isArray(rows)?rows.map(r=>normalize(r).row):[];}
  const api={VERSION,STATES,normalizeState,infer,canTransition,transition,normalize,normalizeRows};
  g.ServiceChecklistExecutionSOT=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
