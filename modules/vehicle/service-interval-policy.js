/** S2092 compatibility facade: all runtime interval reads route through the new single SOT. */
function getCanonicalServiceInterval(category = {}, vehicleOverride = {}) {
  const vid=vehicleOverride&&vehicleOverride.vehicleId!=null?vehicleOverride.vehicleId:category&&category.vehicleId||null;
  if(typeof ServiceIntervalSOT!=='undefined'&&ServiceIntervalSOT&&typeof ServiceIntervalSOT.resolveCanonicalInterval==='function'){
    return ServiceIntervalSOT.resolveCanonicalInterval(category,{vehicleId:vid});
  }
  const km=Number.isFinite(Number(category&&category.intervalKm))&&Number(category.intervalKm)>0?Number(category.intervalKm):null;
  const months=Number.isFinite(Number(category&&category.intervalBulan))&&Number(category.intervalBulan)>0?Number(category.intervalBulan):null;
  return {intervalKm:km,intervalBulan:months,source:'pedoman'};
}
function assertChecklistDoesNotOverride(category, vehicleOverride, checklist = {}) {
  const canonical=getCanonicalServiceInterval(category,vehicleOverride);
  return {canonical,checklistIntervalKm:Number.isFinite(checklist['intervalKm'])?checklist['intervalKm']:null,checklistIntervalBulan:Number.isFinite(checklist['intervalBulan'])?checklist['intervalBulan']:null,authoritativeSource:canonical.source||'sot'};
}
if(typeof module!=='undefined')module.exports={getCanonicalServiceInterval,assertChecklistDoesNotOverride};
