/* Pure reminder lifecycle transition helper. */
(function(g){'use strict';
 const STATES=new Set(['ACTIVE','COMPLETED','SNOOZED','DISMISSED','REQUIRES_INSPECTION']);
 function transition(from,to){if(!STATES.has(to))return{ok:false,code:'INVALID_STATE'};if(!STATES.has(from))return{ok:false,code:'INVALID_SOURCE_STATE'};if(from==='COMPLETED'&&to==='ACTIVE')return{ok:false,code:'COMPLETED_CANNOT_REOPEN'};return{ok:true,from,to};}
 const api={STATES:[...STATES],transition};if(typeof window!=='undefined')window.ReminderLifecycle=api;if(typeof globalThis!=='undefined')globalThis.ReminderLifecycle=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
