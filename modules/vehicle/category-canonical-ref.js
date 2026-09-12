/**
 * CATEGORY-SOT-08
 * Canonical reference helper.
 * masterCategoryId is authoritative; legacy group/name fields are fallback-only.
 */
function getCanonicalMasterCategoryId(record = {}, resolver = null) {
  if (record.masterCategoryId) return record.masterCategoryId;
  if (typeof resolver === 'function') {
    const resolved = resolver(record);
    if (typeof resolved === 'string' && resolved) return resolved;
    if (resolved && typeof resolved.id === 'string' && resolved.id) return resolved.id;
  }
  return null;
}

function isCanonicalReference(record = {}) {
  return Boolean(record.masterCategoryId);
}

if (typeof module !== 'undefined') {
  module.exports = { getCanonicalMasterCategoryId, isCanonicalReference };
}
