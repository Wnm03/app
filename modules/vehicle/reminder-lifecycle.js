/* S1913 — pure reminder lifecycle transition contract. */
(function(g){'use strict';
 const STATES=Object.freeze(['ACTIVE','COMPLETED','SNOOZED','DISMISSED','REQUIRES_INSPECTION']);
 const TERMINAL=new Set(['COMPLETED','DISMISSED']);
 const TRANSITIONS=Object.freeze({ACTIVE:new Set(['ACTIVE','COMPLETED','SNOOZED','DISMISSED','REQUIRES_INSPECTION']),SNOOZED:new Set(['ACTIVE','COMPLETED','DISMISSED','REQUIRES_INSPECTION']),REQUIRES_INSPECTION:new Set(['ACTIVE','COMPLETED','SNOOZED','DISMISSED','REQUIRES_INSPECTION']),COMPLETED:new Set(['COMPLETED']),DISMISSED:new Set(['DISMISSED'])});
 function transition(from,to){if(!STATES.includes(to))return{ok:false,code:'INVALID_STATE'};if(!STATES.includes(from))return{ok:false,code:'INVALID_SOURCE_STATE'};if(!TRANSITIONS[from].has(to))return{ok:false,code:from==='COMPLETED'?'COMPLETED_CANNOT_REOPEN':from==='DISMISSED'?'DISMISSED_CANNOT_REOPEN':'INVALID_TRANSITION'};return{ok:true,from,to,terminal:TERMINAL.has(to)};}
 function audit(rows){const issues=[];(Array.isArray(rows)?rows:[]).forEach((r,i)=>{if(!r||!r.status)return;if(!STATES.includes(r.status))issues.push({index:i,id:r.id||null,code:'INVALID_REMINDER_STATE',status:r.status});});return{ok:issues.length===0,total:Array.isArray(rows)?rows.length:0,issues,states:STATES.slice(),readOnly:true};}
 const api={STATES:[...STATES],TERMINAL:[...TERMINAL],transition,audit};if(typeof window!=='undefined')window.ReminderLifecycle=api;if(typeof globalThis!=='undefined')globalThis.ReminderLifecycle=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
