/* Car Notes performance/parity guard — S1752.
 * Read-only cache, feature inventory, incremental audit and lightweight metrics.
 * No duplicate business logic: all calculations still belong to existing SoT engines.
 */
(function(g){'use strict';
  const state={revision:0,cache:new Map(),metrics:{renders:0,byTab:{},cacheHits:0,cacheMisses:0,last:null}};
  const arr=v=>Array.isArray(v)?v:[];
  function rev(){return state.revision;}
  function bump(reason){state.revision++;state.cache.clear();state.metrics.last={type:'invalidate',reason:reason||'mutation',revision:state.revision,at:Date.now()};return state.revision;}
  function key(domain,id){return domain+'::'+String(id||'fleet')+'::'+state.revision;}
  function memo(domain,id,fn){const k=key(domain,id);if(state.cache.has(k)){state.metrics.cacheHits++;return state.cache.get(k);}state.metrics.cacheMisses++;const value=fn();state.cache.set(k,value);return value;}
  function render(tab){state.metrics.renders++;const t=String(tab||'unknown');state.metrics.byTab[t]=(state.metrics.byTab[t]||0)+1;state.metrics.last={type:'render',tab:t,revision:state.revision,at:Date.now()};}
  function beginRender(tab){state._renderStart=typeof performance!=='undefined'&&performance.now?performance.now():Date.now();state._renderTab=String(tab||'unknown');}
  function finishRender(tab){if(state._renderStart==null)return null;const now=typeof performance!=='undefined'&&performance.now?performance.now():Date.now();const duration=Math.max(0,now-state._renderStart);state.metrics.lastDurationMs=duration;state.metrics.last={type:'render-complete',tab:String(tab||state._renderTab||'unknown'),revision:state.revision,durationMs:duration,at:Date.now()};state._renderStart=null;return duration;}
  function inventory(){
    const groups={
      dashboard:{VehicleDashboard:()=>typeof VehicleDashboard!=='undefined',VehicleInsightPresenter:()=>typeof VehicleInsightPresenter!=='undefined',VehicleAttentionPresenter:()=>typeof VehicleAttentionPresenter!=='undefined',VehicleAnalyticsPresenter:()=>typeof VehicleAnalyticsPresenter!=='undefined',VehicleAutomationPresenter:()=>typeof VehicleAutomationPresenter!=='undefined'},
      fuel:{FuelCard:()=>typeof FuelCard!=='undefined',FuelDashboard:()=>typeof FuelDashboard!=='undefined',FuelCompare:()=>typeof FuelCompare!=='undefined',FuelTrendDashboard:()=>typeof FuelTrendDashboard!=='undefined',FuelIntelligenceEngine:()=>typeof FuelIntelligenceEngine!=='undefined',FuelInsightEngine:()=>typeof FuelInsightEngine!=='undefined'},
      service:{Servis:()=>typeof Servis!=='undefined',ServiceIntegrityReconciler:()=>typeof ServiceIntegrityReconciler!=='undefined',CarNotesFinalAudit:()=>typeof CarNotesFinalAudit!=='undefined'},
      ride:{RideUI:()=>typeof RideUI!=='undefined',RideStorage:()=>typeof RideStorage!=='undefined',RideActivityMetrics:()=>typeof RideActivityMetrics!=='undefined'},
      tax:{renderVehTaxSim:()=>typeof renderVehTaxSim==='function',renderVehTaxList:()=>typeof renderVehTaxList==='function',renderSimList:()=>typeof renderSimList==='function'},
      audit:{CarNotesIntegritySuite:()=>typeof CarNotesIntegritySuite!=='undefined',CarNotesFinalAudit:()=>typeof CarNotesFinalAudit!=='undefined'},
      persistence:{save:()=>typeof save==='function',saveFlush:()=>typeof saveFlush==='function'}
    };
    const missing=[];const present={};Object.keys(groups).forEach(group=>{present[group]={};Object.keys(groups[group]).forEach(name=>{let ok=false;try{ok=!!groups[group][name]();}catch(e){ok=false;}present[group][name]=ok;if(!ok)missing.push(group+'.'+name);});});
    return {ok:missing.length===0,missing,present};
  }
  function arraySignature(a){
    const list=arr(a);
    // Include a compact content fingerprint, not only ids/length, so an edit to an
    // existing row invalidates the incremental audit too. This runs only for audit.
    let body='';try{body=JSON.stringify(list);}catch(e){body=list.map(x=>String(x&&x.id||'')).join('|');}
    let h=2166136261;for(let i=0;i<body.length;i++){h^=body.charCodeAt(i);h=Math.imul(h,16777619);}return list.length+'#'+(h>>>0).toString(16);
  }
  function domainSignatures(data){
    const d=data||{};return {
      service:arraySignature(d.services),
      fuel:arraySignature(d.bbmLogs),
      finance:arraySignature(d.transactions),
      tax:arraySignature(d.vehicles)+'|'+arraySignature(d.taxRecords),
      ride:arraySignature(d.rideLogs)||arraySignature(d.rides),
      final:arraySignature(d.services)+'|'+arraySignature(d.bbmLogs)+'|'+arraySignature(d.transactions)+'|'+arraySignature(d.vehicles)+'|'+arraySignature(d.partsStock)+'|'+arraySignature(d.reminders)
    };
  }
  function runIncremental(input){
    const x=input||{}, sig=domainSignatures(x), previous=state._auditSig||{};
    const changed=Object.keys(sig).filter(k=>sig[k]!==previous[k]);
    const reports=[];
    function add(domain,api,payload){if(changed.indexOf(domain)===-1&&state._auditReports&&state._auditReports[domain]){reports.push(state._auditReports[domain]);return;}if(api&&typeof api.reconcile==='function'){const report={name:domain,result:api.reconcile(payload||{})};reports.push(report);if(!state._auditReports)state._auditReports={};state._auditReports[domain]=report;}}
    add('service',g.ServiceIntegrityReconciler,{services:x.services,transactions:x.transactions});
    add('fuel',g.FuelIntegrityReconciler,{bbmLogs:x.bbmLogs,transactions:x.transactions});
    add('tax',g.VehicleTaxIntegrityReconciler,{taxRecords:x.taxRecords,vehicles:x.vehicles,transactions:x.transactions});
    add('final',g.CarNotesFinalAudit,{services:x.services,transactions:x.transactions,partsStock:x.partsStock,reminders:x.reminders});
    state._auditSig=sig;
    const issues=reports.flatMap(r=>(r.result&&Array.isArray(r.result.issues)?r.result.issues:[]).map(issue=>Object.assign({domain:r.name},issue)));
    return {ok:issues.length===0,issues,reports,changedDomains:changed,revision:state.revision};
  }
  function auditCurrent(){
    const d=(typeof D!=='undefined'&&D)||{};
    return runIncremental({services:d.servisLogs,bbmLogs:d.bbmLogs,transactions:d.transactions,vehicles:d.vehicles,taxRecords:d.taxRecords});
  }
  function snapshot(){return {revision:state.revision,metrics:JSON.parse(JSON.stringify(state.metrics)),cacheSize:state.cache.size,featureParity:inventory()};}
  const api={revision:rev,bump,invalidate:bump,memo,render,beginRender,finishRender,inventory,domainSignatures,runIncremental,auditCurrent,snapshot};
  g.CarNotesPerformance=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
