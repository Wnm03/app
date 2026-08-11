// asset-ownership-split-presenter.js — Sesi 391: split keuntungan aset per
// pemilik berdasarkan porsi (lanjutan Sesi 390, Multi-Owner Engine).
//
// Target eksplisit user: "hitung otomatis keuntungan berdasarkan porsi".
// PRINSIP SESI INI (sama disiplin dgn OwnershipSettingsPresenter S229-230):
//   - 0 engine baru: kalkulasi murni pakai MultiOwnerEngine.getOwners()/
//     splitByPorsi() (S390) + field `keuntungan` yang SUDAH ADA di
//     D.assets (aset.js) — tidak ada rumus untung baru, tidak ada
//     duplikasi logic.
//   - READ-ONLY: presenter ini CUMA baca D.assets & susun ulang jadi split
//     per pemilik. Tidak ada create/update/delete. Field `owners` di
//     entity aset tetap diisi lewat MultiOwnerEngine.setOwners() (dipanggil
//     UI form porsi masa depan, BELUM ada sesi ini) — presenter ini tidak
//     menyentuh D sama sekali.
//   - Guard typeof D/MultiOwnerEngine: kalau salah satu belum dimuat,
//     semua method balik hasil "kosong" aman, TIDAK throw.
//   - Aset dgn 1 pemilik (default/legacy) SENGAJA DILEWATI dari summary()/
//     incompletePortions() — split 1 pemilik 100% = keuntungan utuh, tidak
//     ada info baru utk ditampilkan, jadi tidak perlu membebani hasil.
const AssetOwnershipSplitPresenter = {

// _assets() — helper internal: D.assets kalau ada, array kosong kalau
// tidak (guard typeof D, sama pola OwnershipSettingsPresenter._collect()).
_assets() {
  if (typeof D === 'undefined' || !Array.isArray(D.assets)) return [];
  return D.assets;
},

// splitFor(asset) — split `asset.keuntungan` (field existing dari
// aset.js) ke tiap pemilik sesuai porsi efektifnya (owners eksplisit atau
// disintesis dari legacy `ownership`/default, lihat
// MultiOwnerEngine.getOwners()).
// Parameter:
//   asset (object) — satu entity aset (boleh belum punya `owners`).
// Return: {ok:true, isMultiOwner, owners, splits} — `splits` array
//   {ownerId, ownerName, porsi, bagian} (bagian = null kalau
//   asset.keuntungan bukan angka, mis. aset non-investasi tanpa
//   modalInvestasi — TIDAK dipaksa 0 supaya beda jelas dari "untung Rp0").
//   {ok:false, reason} kalau MultiOwnerEngine belum dimuat atau `asset`
//   bukan object.
splitFor(asset) {
  if (typeof MultiOwnerEngine === 'undefined') {
    return { ok: false, reason: 'MultiOwnerEngine belum dimuat' };
  }
  if (!asset || typeof asset !== 'object') {
    return { ok: false, reason: 'Aset tidak valid' };
  }
  const info = MultiOwnerEngine.getOwners(asset);
  const keuntungan = typeof asset.keuntungan === 'number' && isFinite(asset.keuntungan) ? asset.keuntungan : null;
  if (keuntungan === null) {
    const splits = info.owners.map((o) => ({ ownerId: o.ownerId, ownerName: o.ownerName, porsi: o.porsi, bagian: null }));
    return { ok: true, isMultiOwner: info.isMultiOwner, owners: info.owners, splits };
  }
  const s = MultiOwnerEngine.splitByPorsi(keuntungan, info.owners);
  return { ok: true, isMultiOwner: info.isMultiOwner, owners: info.owners, splits: s.ok ? s.splits : [] };
},

// summary() — daftar SEMUA aset multi-pemilik (owners.length>1) yang
// keuntungannya bisa dihitung (asset.keuntungan bukan null), lengkap dgn
// split per pemilik. Aset single-owner (mayoritas — default/legacy)
// SENGAJA tidak ikut (lihat catatan header file).
// Return: {ok:true, items} — `items` array {assetId, name, keuntungan,
//   splits}. Balikin {ok:true, items:[]} (bukan error) kalau D/
//   MultiOwnerEngine belum siap atau tidak ada aset multi-pemilik.
summary() {
  if (typeof MultiOwnerEngine === 'undefined') return { ok: true, items: [] };
  const items = [];
  this._assets().forEach((a) => {
    const r = this.splitFor(a);
    if (r.ok && r.isMultiOwner && typeof a.keuntungan === 'number' && isFinite(a.keuntungan)) {
      items.push({ assetId: a.id, name: a.name, keuntungan: a.keuntungan, splits: r.splits });
    }
  });
  return { ok: true, items };
},

// incompletePortions() — daftar aset yang SUDAH mulai diisi porsi
// (`asset.owners` berupa array, artinya user sudah pakai fitur ini) TAPI
// belum valid (total porsi != 100% / ownerId duplikat / dst) — kandidat
// pengingat "lengkapi porsi kepemilikan dulu" (dipakai rule AI di
// aset.js).
// Return: {ok:true, items} — `items` array {assetId, name, reason,
//   total}. Aset yang belum sama sekali diisi `owners` (mayoritas) TIDAK
//   dianggap "belum lengkap" — itu default sah (single-owner), bukan
//   pekerjaan yang tertunda.
incompletePortions() {
  if (typeof MultiOwnerEngine === 'undefined') return { ok: true, items: [] };
  const items = [];
  this._assets().forEach((a) => {
    if (!Array.isArray(a.owners)) return;
    const v = MultiOwnerEngine.validateOwners(a.owners);
    if (!v.ok) {
      items.push({ assetId: a.id, name: a.name, reason: v.reason, total: MultiOwnerEngine.totalPorsi(a.owners) });
    }
  });
  return { ok: true, items };
},

};
