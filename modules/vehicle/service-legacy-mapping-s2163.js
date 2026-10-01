/* S2163 — Explicit Legacy Mapping Registry
 * Registry only. No guessing. Only entries marked reviewed:true may be consumed
 * by a future migration gate. Candidates remain non-authoritative.
 */
(function(g){'use strict';
  const VERSION='SERVICE-LEGACY-MAPPING-S2163';
  const MAPPINGS=Object.freeze([
    {legacy:'Slidepiece', normalized:'slidepiece', serviceComponentId:'slide-piece-cvt', masterCategoryId:'servis-cvt', reviewed:true, reason:'exact legacy spelling variant of canonical Slide Piece CVT'},
    {legacy:'Grease Cvt', normalized:'grease cvt', serviceComponentId:'pelumasan-cvt-grease', masterCategoryId:'servis-cvt', reviewed:true, reason:'explicit CVT grease legacy label'},
    {legacy:'Grmuk cvt', normalized:'grmuk cvt', serviceComponentId:'pelumasan-cvt-grease', masterCategoryId:'servis-cvt', reviewed:true, reason:'documented local typo/abbreviation for CVT grease'},
    {legacy:'Servis Cvt', normalized:'servis cvt', serviceComponentId:null, masterCategoryId:'servis-cvt', reviewed:false, status:'candidate', reason:'category label only; no unique component'},
    {legacy:'Pully', normalized:'pully', serviceComponentId:null, masterCategoryId:'servis-cvt', reviewed:false, status:'blocked', reason:'could map to multiple pulley-related components'},
    {legacy:'Tutup Pully', normalized:'tutup pully', serviceComponentId:null, masterCategoryId:'servis-cvt', reviewed:false, status:'blocked', reason:'no unique canonical component'},
    {legacy:'Gasket Stator Base', normalized:'gasket stator base', serviceComponentId:null, masterCategoryId:'kelistrikan', reviewed:false, status:'blocked', reason:'stator/gasket distinction is not represented as a unique canonical maintenance component'},
    {legacy:'Seal Magnet', normalized:'seal magnet', serviceComponentId:null, masterCategoryId:'servis-mesin', reviewed:false, status:'blocked', reason:'no unique canonical component'},
    {legacy:'Seal Kruk As', normalized:'seal kruk as', serviceComponentId:null, masterCategoryId:'servis-mesin', reviewed:false, status:'blocked', reason:'no unique canonical component'},
    {legacy:'Korter Piston', normalized:'korter piston', serviceComponentId:null, masterCategoryId:'servis-mesin', reviewed:false, status:'blocked', reason:'operation/service wording rather than unique component'},
    {legacy:'Jasa Pasang Stang Laher', normalized:'jasa pasang stang laher', serviceComponentId:null, masterCategoryId:'sistem-kemudi', reviewed:false, status:'blocked', reason:'labor operation; not a canonical component fact'},
    {legacy:'Ban Dalam', normalized:'ban dalam', serviceComponentId:null, masterCategoryId:'roda', reviewed:false, status:'blocked', reason:'no unique canonical component in current master'},
    {legacy:'Filter udara pembersihan', normalized:'filter udara pembersihan', serviceComponentId:'filter-udara', masterCategoryId:'filter-udara', reviewed:false, status:'candidate', reason:'component identity is clear but action wording should not be collapsed into component identity without review'},
    {legacy:'Jasa Overhoul', normalized:'jasa overhoul', serviceComponentId:null, masterCategoryId:'servis-mesin', reviewed:false, status:'blocked', reason:'labor/operation wording'},
    {legacy:'Seal Head', normalized:'seal head', serviceComponentId:null, masterCategoryId:'servis-mesin', reviewed:false, status:'blocked', reason:'no unique canonical component'},
    {legacy:'Pembersihan Rem', normalized:'pembersihan rem', serviceComponentId:null, masterCategoryId:'sistem-pengereman', reviewed:false, status:'candidate', reason:'category is clear but operation has multiple possible brake targets'}
  ]);
  const norm=v=>String(v==null?'':v).trim().toLowerCase().replace(/[()\/\-_.]+/g,' ').replace(/\s+/g,' ').trim();
  function find(label){const n=norm(label);return MAPPINGS.find(x=>x.normalized===n)||null;}
  function reviewed(label){const x=find(label);return x&&x.reviewed?x:null;}
  function audit(){
    const reviewedRows=MAPPINGS.filter(x=>x.reviewed);
    const candidates=MAPPINGS.filter(x=>x.status==='candidate'&&!x.reviewed);
    const blocked=MAPPINGS.filter(x=>x.status==='blocked'&&!x.reviewed);
    const duplicateNormalized=MAPPINGS.map(x=>x.normalized).filter((x,i,a)=>a.indexOf(x)!==i);
    const badReviewed=reviewedRows.filter(x=>!x.serviceComponentId||!x.masterCategoryId);
    return {version:VERSION,total:MAPPINGS.length,reviewed:reviewedRows.length,candidates:candidates.length,blocked:blocked.length,duplicateNormalized:[...new Set(duplicateNormalized)],badReviewed};
  }
  const api={VERSION,MAPPINGS,norm,find,reviewed,audit};
  g.ServiceLegacyMappingS2163=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
