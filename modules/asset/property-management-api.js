// modules/asset/property-management-api.js — Property Management API
// (S102, Batch 10). Target sesi: Property Management Foundation.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA —
// TIDAK ada rumus keuangan baru, TIDAK duplikasi logic, TIDAK framework
// baru, TIDAK mengubah struktur data D. "Properti" didefinisikan APA
// ADANYA lewat `PajakAset.JENIS_PROPERTI` (modules/asset/aset.js —
// `['Tanah','Rumah/Bangunan']`, SATU-SATUNYA daftar jenis properti yang
// sudah dipakai `PajakAset.renderList()`/`PajakAset.hitungPBB()` — TIDAK
// dibuat daftar baru di sini). File ini murni MEMBACA ULANG &
// MENGELOMPOKKAN dari:
//   - `D.assets` difilter `PajakAset.JENIS_PROPERTI.includes(a.jenis)`
//     (pola filter SAMA PERSIS `PajakAset.renderList()`)
//   - `PajakAset.hitungPBB(a,s)`  (modules/asset/aset.js — estimasi PBB
//     per aset properti, formula SUDAH ADA, dipanggil apa adanya per
//     item lalu dijumlahkan — pola sama persis loop `properti.map()` di
//     `PajakAset.renderList()`)
//   - `Penyusutan.hitung(a)`      (modules/asset/aset.js — nilai buku &
//     akumulasi penyusutan per aset, formula SUDAH ADA, dipanggil apa
//     adanya — pola sama persis `LaporanAset.penyusutan()`)
//   - `Aset.totalValue()`/`Aset.ICON`  (modules/asset/aset.js)
// pola guard berlapis (`typeof X==='undefined'` -> {ok:false,reason})
// SAMA PERSIS `AssetPortfolioAPI` (modules/asset/asset-portfolio-api.js,
// S101) supaya file ini aman dimuat/dites berdiri sendiri lewat
// loadSource() tanpa dependency-nya.
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM.
const PropertyManagementAPI = {

  // _properti() — helper internal: satu titik akses ke D.assets yang
  // jenisnya termasuk `PajakAset.JENIS_PROPERTI` (pola filter SAMA
  // PERSIS `PajakAset.renderList()` — `(D.assets||[]).filter(a=>
  // PajakAset.JENIS_PROPERTI.includes(a.jenis))`). Guard berlapis, pola
  // sama persis `AssetPortfolioAPI._asset()`.
  _properti() {
    if (typeof PajakAset === 'undefined' || !Array.isArray(PajakAset.JENIS_PROPERTI)) {
      return { ok: false, reason: 'PajakAset belum dimuat' };
    }
    if (typeof D === 'undefined' || !D || !Array.isArray(D.assets)) {
      return { ok: true, list: [] };
    }
    let list;
    try {
      list = D.assets.filter((a) => PajakAset.JENIS_PROPERTI.includes(a.jenis));
    } catch (e) {
      return { ok: false, reason: 'filter D.assets gagal dipanggil' };
    }
    return { ok: true, list };
  },

  // propertyList() — Property Management API. Daftar aset properti APA
  // ADANYA (field asli D.assets, TIDAK diubah bentuknya) + `icon` dari
  // `Aset.ICON` (pola sama persis `LaporanAset.build().daftarAset`).
  propertyList() {
    const p = this._properti();
    if (!p.ok) return p;
    const icon = (typeof Aset !== 'undefined' && Aset.ICON) ? Aset.ICON : {};
    const properties = p.list.map((a) => ({
      id: a.id,
      name: a.name,
      jenis: a.jenis,
      icon: icon[a.jenis] || '📦',
      nilai: a.nilai || 0,
      lokasi: a.lokasi || '',
      tanggal: a.tanggal || '',
      accountId: a.accountId || null,
      zakatable: !!a.zakatable,
    }));
    return { ok: true, count: properties.length, properties };
  },

  // portfolioValue() — Property Portfolio Value. Derivatif murni dari
  // `propertyList()` di atas — total nilai (murni penjumlahan `nilai`,
  // pola sama persis `Aset.totalValue()`/`LaporanAset.nilaiAset()`) +
  // breakdown per jenis (Tanah vs Rumah/Bangunan).
  portfolioValue() {
    const pl = this.propertyList();
    if (!pl.ok) return pl;
    const totalValue = pl.properties.reduce((s, a) => s + a.nilai, 0);
    const perJenis = {};
    pl.properties.forEach((a) => {
      if (!perJenis[a.jenis]) perJenis[a.jenis] = { count: 0, nilai: 0 };
      perJenis[a.jenis].count++;
      perJenis[a.jenis].nilai += a.nilai;
    });
    const breakdown = Object.entries(perJenis)
      .map(([jenis, v]) => ({ jenis, count: v.count, nilai: v.nilai, pct: totalValue > 0 ? (v.nilai / totalValue) * 100 : 0 }))
      .sort((a, b) => b.nilai - a.nilai);
    return { ok: true, count: pl.count, totalValue, breakdown };
  },

  // taxSummary() — Property Tax Summary. Estimasi PBB per aset properti
  // via `PajakAset.hitungPBB(a,s)` (formula SUDAH ADA, dipanggil apa
  // adanya per item), `totalPBB` murni dijumlahkan dari `.terutang` tiap
  // item — pola sama persis loop `properti.map()` di
  // `PajakAset.renderList()`, TIDAK dihitung ulang dgn rumus baru.
  taxSummary() {
    if (typeof PajakAset === 'undefined' || typeof PajakAset.hitungPBB !== 'function') {
      return { ok: false, reason: 'PajakAset belum dimuat' };
    }
    const pl = this.propertyList();
    if (!pl.ok) return pl;
    let settings;
    try {
      settings = PajakAset.settings();
    } catch (e) {
      return { ok: false, reason: 'PajakAset.settings gagal dipanggil' };
    }
    let totalPBB = 0;
    const items = pl.properties.map((a) => {
      const r = PajakAset.hitungPBB(a, settings) || { njop: a.nilai, njoptkp: 0, dasar: 0, terutang: 0 };
      totalPBB += r.terutang || 0;
      return { id: a.id, name: a.name, jenis: a.jenis, icon: a.icon, pbb: r };
    });
    return { ok: true, count: items.length, totalPBB, items };
  },

  // depreciationSummary() — Property Depreciation Summary. Khusus aset
  // properti yang penyusutannya Aktif (`a.penyusutan.aktif`, syarat SAMA
  // PERSIS `LaporanAset.penyusutan()`), via `Penyusutan.hitung(a)`
  // (formula SUDAH ADA) — TIDAK ada rumus penyusutan baru, murni
  // dijumlahkan dari hasil yang sudah final per item.
  depreciationSummary() {
    if (typeof Penyusutan === 'undefined' || typeof Penyusutan.hitung !== 'function') {
      return { ok: false, reason: 'Penyusutan belum dimuat' };
    }
    const pl = this.propertyList();
    if (!pl.ok) return pl;
    const p = this._properti();
    const raw = p.ok ? p.list : [];
    const aktif = raw.filter((a) => a.penyusutan && a.penyusutan.aktif);
    let totalAkumulasi = 0;
    let totalNilaiBuku = 0;
    let belumLengkap = 0;
    aktif.forEach((a) => {
      const hasil = Penyusutan.hitung(a);
      if (!hasil) { belumLengkap++; return; }
      if (hasil.metode !== 'manual' && hasil.hargaPerolehan == null) { belumLengkap++; return; }
      totalNilaiBuku += hasil.nilaiBuku || 0;
      if (hasil.akumulasi != null) totalAkumulasi += hasil.akumulasi;
    });
    return { ok: true, jumlahAktif: aktif.length, totalAkumulasi, totalNilaiBuku, belumLengkap };
  },

  // summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
  // masa depan), murni memanggil fungsi-fungsi di atas, TIDAK ada logic
  // tambahan. `ok` true kalau `portfolioValue()` ok (pola sama persis
  // `AssetPortfolioAPI.summary()`).
  summary() {
    const portfolio = this.portfolioValue();
    const tax = this.taxSummary();
    const depreciation = this.depreciationSummary();
    return {
      ok: !!portfolio.ok,
      portfolio,
      tax,
      depreciation,
    };
  },

};
