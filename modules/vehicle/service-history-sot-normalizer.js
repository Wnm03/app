'use strict';
/**
 * Service History SOT Normalizer
 *
 * Safe legacy normalization only. It NEVER invents a category/component and
 * NEVER requires a catalog part or price. Legacy service/labour records may
 * remain intentionally unmapped while retaining their original identity,
 * cost, links, notes and dates.
 */
(function(global){
  const UNMAPPED='LEGACY_UNMAPPED';
  const MAPPED='CANONICAL';
  const LABOR='LABOR';
  const SERVICE='SERVICE';

  function str(v){return v==null?'':String(v).trim();}
  function clone(v){return v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v;}

  function componentFromChecklist(log){
    const rows=Array.isArray(log&&log.checklist)?log.checklist:[];
    for(const row of rows){
      const id=str(row&&row.itemId||row&&row.serviceComponentId);
      if(id)return id;
    }
    return '';
  }

  function lookupComponent(id){
    if(!id)return null;
    try{
      if(global.ServiceInputCatalog&&typeof global.ServiceInputCatalog.itemById==='function'){
        const hit=global.ServiceInputCatalog.itemById(id);
        if(hit&&hit.item)return hit.item;
      }
    }catch(_e){/* canonical catalog lookup unavailable; preserve legacy data */}
    try{
      const groups=Array.isArray(global.SERVICE_CHECKLIST_GROUPS)?global.SERVICE_CHECKLIST_GROUPS:[];
      for(const g of groups){
        for(const item of (Array.isArray(g&&g.items)?g.items:[])){
          if(item&&String(item.id)===String(id))return Object.assign({},item,{group:g,masterCategoryId:g.masterCategoryId});
        }
      }
    }catch(_e){/* canonical catalog lookup unavailable; preserve legacy data */}
    return null;
  }

  function lookupCategory(log,vehicleId){
    const cats=global.D&&Array.isArray(global.D.sparepartCats)?global.D.sparepartCats:[];
    const id=str(log&&log.categoryId);
    if(id){
      const direct=cats.find(c=>c&&String(c.id)===id&&(!c.vehicleId||!vehicleId||String(c.vehicleId)===String(vehicleId)));
      if(direct)return direct;
    }
    const item=str(log&&log.item).toLowerCase();
    if(!item)return null;
    return cats.find(c=>c&&String(c.name||'').trim().toLowerCase()===item&&(!c.vehicleId||!vehicleId||String(c.vehicleId)===String(vehicleId)))||null;
  }

  function normalizeOne(input,opts){
    const log=clone(input||{});
    if(!log||typeof log!=='object')return log;
    const vehicleId=str(log.vehicleId);
    let componentId=str(log.serviceComponentId);
    let masterId=str(log.masterCategoryId);
    let item=str(log.item);
    let evidence='existing';

    // Existing explicit component is authoritative only when it resolves to
    // the canonical master. An unknown ID is preserved but not trusted.
    let component=componentId?lookupComponent(componentId):null;
    if(!component){
      const checklistId=componentFromChecklist(log);
      const checklistComponent=lookupComponent(checklistId);
      if(checklistComponent){
        componentId=str(checklistComponent.id||checklistComponent.componentId||checklistId);
        component=checklistComponent;
        evidence='checklist';
      }
    }

    if(component){
      const componentMaster=str(component.masterCategoryId||(component.group&&component.group.masterCategoryId));
      if(componentMaster){
        if(!masterId||masterId!==componentMaster){masterId=componentMaster; evidence=evidence==='existing'?'component':evidence;}
      }
      const canonicalName=str(component.name||component.componentName);
      if(canonicalName){item=canonicalName;}
    }else{
      const cat=lookupCategory(log,vehicleId);
      if(cat){
        if(!masterId&&cat.masterCategoryId)masterId=str(cat.masterCategoryId);
        if(!item&&cat.name)item=str(cat.name);
        if(!masterId&&typeof global.resolveCatGroup==='function'){
          try{const g=global.resolveCatGroup(cat,vehicleId);if(g&&g.masterCategoryId)masterId=str(g.masterCategoryId);}catch(_e){/* canonical catalog lookup unavailable; preserve legacy data */}
        }
        evidence='category';
      }
    }

    const hasCanonical=!!(componentId&&lookupComponent(componentId));
    const lower=item.toLowerCase();
    const laborHint=/^(jasa\b|jasa\s+overhoul|jasa\s+overhaul|overhoul|overhaul|turun\s+mesin)/i.test(item)||/\bjasa\b/i.test(lower);
    const overhaulJob=/\b(overhoul|overhaul|turun\s+mesin)\b/i.test(item);
    const out=Object.assign({},log);
    if(item)out.item=item;
    out.masterCategoryId=masterId||null;
    out.serviceComponentId=hasCanonical?componentId:null;
    // categoryId remains the original compatibility/reference field. Never
    // manufacture a sparepart category merely to make the record look mapped.
    out.categoryId=log.categoryId||null;
    if(overhaulJob && !masterId){
      masterId='servis-mesin';
      evidence='job-type';
    }
    out.masterCategoryId=masterId||null;
    out.serviceJobType=overhaulJob?'overhaul_turun_mesin':(log.serviceJobType||null);
    out.serviceJobLabel=overhaulJob?'Overhaul / Turun Mesin':(log.serviceJobLabel||null);
    out.serviceJobEvidence=overhaulJob?'item-text':(log.serviceJobEvidence||null);
    out.serviceSotStatus=hasCanonical||masterId?MAPPED:UNMAPPED;
    out.serviceType=laborHint?LABOR:SERVICE;
    out.serviceSotEvidence=evidence;
    if(!hasCanonical&&!masterId){
      out.serviceSotReason='Tidak ada bukti kategori/komponen canonical pada data legacy';
    }else delete out.serviceSotReason;
    // Explicitly keep catalog/stock fields untouched. Empty price is valid.
    if(opts&&opts.addNormalizationMeta){
      if(!out.serviceSotNormalizedAt)out.serviceSotNormalizedAt=opts.normalizedAt||new Date().toISOString();
      if(!out.serviceSotNormalizerVersion)out.serviceSotNormalizerVersion='SOT-NORMALIZER-1';
    }
    return out;
  }

  function normalizeLogs(logs,opts){
    const rows=Array.isArray(logs)?logs:[];
    const stats={total:rows.length,canonical:0,unmapped:0,labor:0,changed:0,componentFromChecklist:0};
    const out=rows.map(x=>{
      const n=normalizeOne(x,opts||{});
      if(n.serviceSotStatus===MAPPED)stats.canonical++;else stats.unmapped++;
      if(n.serviceType===LABOR)stats.labor++;
      if(n.serviceSotEvidence==='checklist')stats.componentFromChecklist++;
      if(JSON.stringify(n)!==JSON.stringify(x))stats.changed++;
      return n;
    });
    return {logs:out,stats};
  }

  function apply(opts){
    const target=global.D&&Array.isArray(global.D.servisLogs)?global.D.servisLogs:[];
    const result=normalizeLogs(target,Object.assign({},opts,{addNormalizationMeta:true}));
    if(!opts||opts.dryRun!==true){
      if(result.stats.changed){
        for(let i=0;i<target.length;i++)target[i]=result.logs[i];
        if(typeof global.save==='function')global.save({domain:'vehicle'});
      }
    }
    return result.stats;
  }

  const api={version:'SOT-NORMALIZER-1',UNMAPPED,MAPPED,LABOR,SERVICE,normalizeOne,normalizeLogs,apply};
  global.ServiceHistorySOTNormalizer=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
