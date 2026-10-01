// ownership-canonical-writer.js — S2183 canonical owner identity writer.
//
// Purpose: one authorized normalization path for persisted `owners[]` rows.
// Storage remains owned by the domain (`D.assets[]` / `D.investments[]`);
// this module owns only the identity contract at the write boundary.
// No schema change, no UI, no migration of untouched legacy rows.
//
// Contract:
// - SELF remains the universal literal SELF.
// - Existing non-SELF owner IDs are preserved when already registered.
// - A new/non-registered non-SELF row resolves through OwnerRegistry.findOrCreate(name).
// - If a legacy ID is not registered, the row is remapped by name to the canonical registry ID.
// - Duplicate canonical IDs are rejected before the caller mutates storage.

const OwnershipCanonicalWriter = {
  prepare(owners) {
    if (!Array.isArray(owners) || !owners.length) {
      return { ok: false, reason: 'Daftar pemilik wajib diisi minimal 1 pemilik' };
    }
    if (typeof MultiOwnerEngine === 'undefined' || typeof MultiOwnerEngine.validateOwners !== 'function') {
      return { ok: false, reason: 'MultiOwnerEngine belum dimuat' };
    }
    const input = owners.map((o) => ({
      ownerId: o && o.ownerId != null ? String(o.ownerId).trim() : '',
      ownerName: o && typeof o.ownerName === 'string' ? o.ownerName.trim() : '',
      porsi: o && o.porsi,
      isSelf: !!(o && o.isSelf),
    }));
    for (let i = 0; i < input.length; i++) {
      if (!input[i].ownerName) return { ok: false, reason: `Pemilik ke-${i + 1}: nama wajib diisi` };
    }
    const out = [];
    const remaps = [];
    const seen = new Set();
    const registry = typeof OwnerRegistry !== 'undefined' && typeof OwnerRegistry.listAll === 'function'
      ? OwnerRegistry.listAll() : [];
    const registered = new Set(registry.map((r) => String(r && r.id)).filter(Boolean));

    for (const row of input) {
      let ownerId = row.ownerId;
      if (row.isSelf) {
        ownerId = 'SELF';
      } else if (!ownerId || !registered.has(ownerId)) {
        if (typeof OwnerRegistry === 'undefined' || typeof OwnerRegistry.findOrCreate !== 'function') {
          return { ok: false, reason: 'OwnerRegistry belum dimuat' };
        }
        const canonicalId = String(OwnerRegistry.findOrCreate(row.ownerName));
        if (ownerId && ownerId !== canonicalId) remaps.push({ oldId: ownerId, newId: canonicalId });
        ownerId = canonicalId;
      }
      if (seen.has(ownerId.toLowerCase())) {
        return { ok: false, reason: `ownerId duplikat setelah canonicalization: "${ownerId}"`, remaps };
      }
      seen.add(ownerId.toLowerCase());
      out.push({ ownerId, ownerName: row.ownerName, porsi: row.porsi, isSelf: row.isSelf });
    }
    const validation = MultiOwnerEngine.validateOwners(out);
    if (!validation.ok) return { ok: false, reason: validation.reason, remaps };
    return { ok: true, owners: out, remaps };
  },

  set(entity, owners) {
    if (!entity || typeof entity !== 'object') return { ok: false, reason: 'Entity tidak valid' };
    const prepared = this.prepare(owners);
    if (!prepared.ok) return prepared;
    const res = MultiOwnerEngine.setOwners(entity, prepared.owners);
    if (!res.ok) return { ok: false, reason: res.reason, remaps: prepared.remaps };
    return { ok: true, entity: res.entity, remaps: prepared.remaps };
  },
};

if (typeof window !== 'undefined') window.OwnershipCanonicalWriter = OwnershipCanonicalWriter;
