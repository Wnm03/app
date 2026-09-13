/* Canonical, pure stock delta planner for service edits. */
(function(g){'use strict';
 function normalize(usages){return (Array.isArray(usages)?usages:[]).filter(x=>x&&x.stockId&&Number.isFinite(Number(x.qty))&&Number(x.qty)>0).map(x=>({stockId:String(x.stockId),qty:Number(x.qty),source:x.source||'manual'}));}
 function plan(before,after){const a=new Map(),b=new Map();normalize(before).forEach(x=>a.set(x.stockId,(a.get(x.stockId)||0)+x.qty));normalize(after).forEach(x=>b.set(x.stockId,(b.get(x.stockId)||0)+x.qty));const ids=new Set([...a.keys(),...b.keys()]);return [...ids].sort().map(stockId=>({stockId,delta:(b.get(stockId)||0)-(a.get(stockId)||0)})).filter(x=>x.delta!==0);}
 const api={normalize,plan};if(typeof window!=='undefined')window.ServiceStockLedger=api;if(typeof globalThis!=='undefined')globalThis.ServiceStockLedger=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
