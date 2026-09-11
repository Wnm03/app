/**
 * Canonical service interval resolver.
 * Category data is authoritative; checklist values are display/default metadata only.
 */
function resolveCanonicalInterval(category, vehicleOverride = null) {
  const c = category || {};
  const o = vehicleOverride || {};
  const km = Number.isFinite(o.intervalKm) ? o.intervalKm :
             (Number.isFinite(c.intervalKm) ? c.intervalKm : null);
  const months = Number.isFinite(o.intervalBulan) ? o.intervalBulan :
                 (Number.isFinite(c.intervalBulan) ? c.intervalBulan : null);
  return { intervalKm: km, intervalBulan: months };
}

if (typeof module !== 'undefined') module.exports = { resolveCanonicalInterval };
