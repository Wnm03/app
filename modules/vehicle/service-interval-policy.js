/**
 * CATEGORY-SOT-09
 * Canonical interval policy.
 *
 * Precedence:
 *   vehicle override > concrete category > null
 *
 * Checklist interval metadata must not silently override canonical category data.
 */
function getCanonicalServiceInterval(category = {}, vehicleOverride = {}) {
  // Vehicle override is a per-vehicle exception to the category SoT.
  // Checklist metadata is intentionally not an input to this resolver.
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
