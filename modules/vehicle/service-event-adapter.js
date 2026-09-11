/**
 * SERVICE-EVENT-SOT-07
 * Non-destructive adapter from legacy servis log shapes to the canonical event shape.
 * It does not mutate the original record.
 */
function toCanonicalServiceEvent(log = {}, category = null) {
  const masterCategoryId =
    log.masterCategoryId ??
    category?.masterCategoryId ??
    null;

  const categoryId =
    log.categoryId ??
    log.catId ??
    category?.id ??
    null;

  return {
    vehicleId: log.vehicleId ?? log.vehicle ?? null,
    masterCategoryId,
    categoryId,
    item: log.item ?? log.name ?? null,
    actionType: log.actionType ?? null,
    km: Number.isFinite(log.km) ? log.km : null,
    date: log.date ?? log.tanggal ?? null,
    cost: Number.isFinite(log.cost) ? log.cost : 0,
    source: log.source ?? 'legacy-service-log'
  };
}

if (typeof module !== 'undefined') {
  module.exports = { toCanonicalServiceEvent };
}
