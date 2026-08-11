// modules/asset/asset-maintenance-api.js — Asset Maintenance API (S104,
// Batch 10). Target sesi: Asset Maintenance Foundation.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA —
// TIDAK ada rumus baru, TIDAK duplikasi logic, TIDAK framework baru,
// TIDAK mengubah struktur data D (TIDAK ada field baru spt "status
// perawatan"/"tanggal servis" ditambahkan ke D.assets). "Kebutuhan
// perawatan/perhatian" di sini murni dibaca dari SINYAL yang SUDAH ADA:
//   - `Penyusutan.hitung(a)` (modules/asset/aset.js) — field
//     `habisManfaat` (boolean, SUDAH DIHITUNG oleh `Penyusutan.
//     garisLurus()`/`saldoMenurun()`, true kalau umur manfaat aset
//     sudah habis) dipakai APA ADANYA sbg sinyal "aset perlu
//     ditinjau/diganti" — TIDAK ada ambang baru dikarang di sini.
//   - `Penyusutan._monthsBetween(dariStr,keStr)` (modules/asset/aset.js
//     — helper SUDAH ADA, dipakai `Penyusutan.garisLurus()`/
//     `saldoMenurun()` sendiri utk hitung umur berjalan) dipakai apa
//     adanya utk `ageMonths` per aset (dari `a.tanggal` ke `todayStr()`,
//     modules/shared/features-helpers-global-security.js) — BUKAN rumus
//     umur baru, persis fungsi yang sudah dipakai internal Penyusutan.
// pola guard berlapis (`typeof X==='undefined'` -> {ok:false,reason})
// SAMA PERSIS `PropertyManagementAPI`/`AssetPortfolioAPI`/
// `RentalManagementAPI` (S101-S103) supaya file ini aman dimuat/dites
// berdiri sendiri lewat loadSource() tanpa dependency-nya.
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM.
const AssetMaintenanceAPI = {

  // _assets() — helper internal: satu titik akses ke D.assets. Guard
  // berlapis, pola sama persis `AssetPortfolioAPI._asset()`.
  _assets() {
    if (typeof D === 'undefined' || !D || !Array.isArray(D.assets)) {
      return { ok: true, list: [] };
    }
    return { ok: true, list: D.assets };
  },

  // _ageMonths() — helper internal: umur aset dalam bulan dari
  // `a.tanggal` ke hari ini, via `Penyusutan._monthsBetween()` apa
  // adanya (fungsi SUDAH ADA, dipakai internal Penyusutan sendiri).
  // Guard berlapis (Penyusutan/todayStr belum dimuat, a.tanggal kosong).
  _ageMonths(a) {
    if (typeof Penyusutan === 'undefined' || typeof Penyusutan._monthsBetween !== 'function') return null;
    if (!a || !a.tanggal) return null;
    const today = (typeof todayStr === 'function') ? todayStr() : null;
    if (!today) return null;
    try {
      return Penyusutan._monthsBetween(a.tanggal, today);
    } catch (e) {
      return null;
    }
  },

  // maintenanceOverview() — Asset Maintenance API. Utk TIAP aset di
  // D.assets: `ageMonths` (lihat `_ageMonths()` di atas) + `depreciation`
  // (hasil `Penyusutan.hitung(a)` APA ADANYA, `null` kalau penyusutan
  // aset itu belum aktif — sesuai guard bawaan `Penyusutan.hitung()`
  // sendiri) + `needsAttention` (murni `depreciation.habisManfaat===true`,
  // BUKAN ambang baru).
  maintenanceOverview() {
    if (typeof Penyusutan === 'undefined' || typeof Penyusutan.hitung !== 'function') {
      return { ok: false, reason: 'Penyusutan belum dimuat' };
    }
    const a = this._assets();
    const icon = (typeof Aset !== 'undefined' && Aset.ICON) ? Aset.ICON : {};
    const items = a.list.map((asset) => {
      let depreciation = null;
      try {
        depreciation = Penyusutan.hitung(asset);
      } catch (e) {
        depreciation = null;
      }
      return {
        id: asset.id,
        name: asset.name,
        jenis: asset.jenis,
        icon: icon[asset.jenis] || '📦',
        ageMonths: this._ageMonths(asset),
        depreciationActive: !!(asset.penyusutan && asset.penyusutan.aktif),
        depreciation,
        needsAttention: !!(depreciation && depreciation.habisManfaat === true),
      };
    });
    return { ok: true, count: items.length, items };
  },

  // needsAttentionList() — Derivatif murni dari `maintenanceOverview()`
  // di atas — filter `needsAttention===true` saja (pola filter sederhana
  // sama persis dipakai di seluruh codebase, mis.
  // `PropertyManagementAPI._properti()`).
  needsAttentionList() {
    const mo = this.maintenanceOverview();
    if (!mo.ok) return mo;
    const items = mo.items.filter((x) => x.needsAttention);
    return { ok: true, count: items.length, items };
  },

  // maintenanceSummary() — Asset Maintenance Summary. Derivatif murni
  // dari `maintenanceOverview()` — hitungan count sederhana (`.length`,
  // pola sama persis `LaporanAset.penyusutan()`'s `jumlahAktif`/
  // `belumLengkap`), TIDAK ada logic tambahan.
  maintenanceSummary() {
    const mo = this.maintenanceOverview();
    if (!mo.ok) return mo;
    const tracked = mo.items.filter((x) => x.depreciationActive);
    const needsAttention = mo.items.filter((x) => x.needsAttention);
    const untracked = mo.items.filter((x) => !x.depreciationActive);
    return {
      ok: true,
      totalAssets: mo.count,
      trackedCount: tracked.length,
      untrackedCount: untracked.length,
      needsAttentionCount: needsAttention.length,
    };
  },

  // summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
  // masa depan), murni memanggil fungsi-fungsi di atas, TIDAK ada logic
  // tambahan. `ok` true kalau `maintenanceSummary()` ok (pola sama
  // persis `PropertyManagementAPI.summary()`).
  summary() {
    const stats = this.maintenanceSummary();
    const needsAttention = this.needsAttentionList();
    return {
      ok: !!stats.ok,
      stats,
      needsAttention,
    };
  },

};
