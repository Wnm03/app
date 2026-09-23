'use strict';
/** S1909 — additive provenance contract for service events. */
(function(root){
  const TYPES=Object.freeze(['manual','reminder','workshop','import','ocr','external']);
  function normalize(input,fallback){
    const src=input&&typeof input==='object'?input:{};
    const raw=String(src.sourceType||fallback||'manual').trim().toLowerCase();
    const sourceType=TYPES.includes(raw)?raw:'manual';
    const sourceRef=src.sourceRef==null||String(src.sourceRef).trim()===''?null:String(src.sourceRef).trim().slice(0,200);
    const sourceCapturedAt=src.sourceCapturedAt==null||String(src.sourceCapturedAt).trim()===''?null:String(src.sourceCapturedAt).trim();
    return {sourceType,sourceRef,sourceCapturedAt};
  }
  function attach(record,sourceType,sourceRef,sourceCapturedAt){
    if(!record||typeof record!=='object')return record;
    const p=normalize({sourceType,sourceRef,sourceCapturedAt},record.sourceType||'manual');
    record.sourceType=p.sourceType;record.sourceRef=p.sourceRef;record.sourceCapturedAt=p.sourceCapturedAt;return record;
  }
  function audit(records){
    const rows=Array.isArray(records)?records:[],issues=[];
    rows.forEach((r,i)=>{if(!r)return;if(r.sourceType!=null&&!TYPES.includes(String(r.sourceType)))issues.push({index:i,id:r.id||null,type:'invalid_source_type',value:r.sourceType});if(r.sourceRef!=null&&String(r.sourceRef).length>200)issues.push({index:i,id:r.id||null,type:'source_ref_too_long'});});
    return {ok:issues.length===0,total:rows.length,issues,allowedSourceTypes:TYPES.slice(),readOnly:true};
  }
  const api={TYPES,normalize,attach,audit};
  if(root)root.ServiceProvenanceSOT=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
