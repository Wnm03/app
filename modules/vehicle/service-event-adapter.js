/**
 * SERVICE-EVENT-SOT-08
 * Canonical service-event adapter + idempotency helpers.
 *
 * D.servisLogs remains the persisted service-event store for backward
 * compatibility. These helpers do not create a second store.
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
    id: log.id ?? null,
    txLinkId: log.txLinkId ?? null,
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

/**
 * Find the one service event belonging to a transaction + vehicle.
 * Vehicle is part of the identity boundary: a matching txLinkId on another
 * vehicle is never returned.
 */
function findServiceEventForTransaction(logs = [], txLinkId, vehicleId) {
  if (!txLinkId) return null;
  return logs.find((log) =>
    log &&
    log.txLinkId === txLinkId &&
    log.vehicleId === vehicleId
  ) || null;
}

/**
 * Defensive vehicle isolation check for a service event.
 */
function isServiceEventForVehicle(log = {}, vehicleId) {
  return Boolean(log && vehicleId && log.vehicleId === vehicleId);
}

if (typeof module !== 'undefined') {
  module.exports = {
    toCanonicalServiceEvent,
    findServiceEventForTransaction,
    isServiceEventForVehicle
  };
}
if (typeof window !== 'undefined') {
  window.toCanonicalServiceEvent = toCanonicalServiceEvent;
  window.findServiceEventForTransaction = findServiceEventForTransaction;
  window.isServiceEventForVehicle = isServiceEventForVehicle;
}
