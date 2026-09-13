/* Pure odometer audit helpers; never mutates source records. */
(function(g){'use strict';
 function compare(original,next){const a=Number(original),b=Number(next);if(!Number.isFinite(b)||b<0)return{ok:false,code:'INVALID_ODOMETER'};if(Number.isFinite(a)&&a>=0&&b<a)return{ok:false,code:'ODOMETER_ROLLBACK'};return{ok:true,changed:Number.isFinite(a)&&a!==b,from:Number.isFinite(a)?a:null,to:b};}
 const api={compare};if(typeof window!=='undefined')window.OdometerAudit=api;if(typeof globalThis!=='undefined')globalThis.OdometerAudit=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
