/**
 * CATEGORY-SOT-09
 * Canonical interval policy.
 *
 * Production precedence:
 *   VehicleCatalog service rule > explicit vehicle KM override > legacy category
 *   fallback. Checklist interval metadata must never override this resolver.
 */
function getCanonicalServiceInterval(category = {}, vehicleOverride = {}) {
  // VehicleServiceSOT is the production authority once a vehicle context is
  // known: linked VehicleCatalog serviceInterval* wins, with an explicit
  // per-vehicle KM override layered on top. This keeps the edit/history UI
  // on the exact same interval source used by the reminder engine.
  const vehicleId=vehicleOverride&&vehicleOverride.vehicleId!=null
    ?vehicleOverride.vehicleId
    :category&&category.vehicleId!=null?category.vehicleId:null;
  if(vehicleId&&typeof VehicleServiceSOT!=='undefined'&&VehicleServiceSOT&&typeof VehicleServiceSOT.resolveReminderRule==='function'){
    const rule=VehicleServiceSOT.resolveReminderRule(category,vehicleId);
    if(rule&&((rule.intervalKm!=null)||(rule.intervalBulan!=null)))return {intervalKm:rule.intervalKm,intervalBulan:rule.intervalBulan};
  }
  // Isolated/legacy callers without vehicle context retain the original
  // category policy. Checklist metadata is intentionally not an input.
  const km = Number.isFinite(vehicleOverride.intervalKm) && vehicleOverride.intervalKm > 0
    ? vehicleOverride.intervalKm
    : Number.isFinite(category.intervalKm) && category.intervalKm > 0
      ? category.intervalKm
      : null;
  const months = Number.isFinite(vehicleOverride.intervalBulan) && vehicleOverride.intervalBulan > 0
    ? vehicleOverride.intervalBulan
    : Number.isFinite(category.intervalBulan) && category.intervalBulan > 0
      ? category.intervalBulan
      : null;
  return { intervalKm: km, intervalBulan: months };
}

function assertChecklistDoesNotOverride(category, vehicleOverride, checklist = {}) {
  const canonical = getCanonicalServiceInterval(category, vehicleOverride);
  return {
    canonical,
    checklistIntervalKm: Number.isFinite(checklist['intervalKm']) ? checklist['intervalKm'] : null,
    checklistIntervalBulan: Number.isFinite(checklist['intervalBulan']) ? checklist['intervalBulan'] : null,
    authoritativeSource: vehicleOverride && (
      Number.isFinite(vehicleOverride.intervalKm) ||
      Number.isFinite(vehicleOverride.intervalBulan)
    ) ? 'vehicle-override' : 'category'
  };
}

if (typeof module !== 'undefined') {
  module.exports = { getCanonicalServiceInterval, assertChecklistDoesNotOverride };
}
