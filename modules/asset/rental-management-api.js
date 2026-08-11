// modules/asset/rental-management-api.js — Rental Management API (S103,
// Batch 10). Target sesi: Rental Management Foundation.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE modul Asset yang SUDAH ADA —
// TIDAK ada rumus keuangan baru, TIDAK duplikasi logic, TIDAK framework
// baru, TIDAK mengubah struktur data D. "Unit sewa" di sini BUKAN
// konsep/field baru — murni aset properti (`PajakAset.JENIS_PROPERTI`,
// via `PropertyManagementAPI.propertyList()`, S102) yang SUDAH ditautkan
// ke Akun Transaksi (`a.accountId`, field yang SUDAH ADA di D.assets),
// dan "pendapatan sewa" murni transaksi `type:'income'` yang SUDAH masuk
// ke akun tertaut itu — TIDAK ada field/status "disewakan" baru yang
// ditambahkan ke D.assets.
//
// Sumber angka SATU-SATUNYA:
//   - `PropertyManagementAPI.propertyList()` (modules/asset/
//     property-management-api.js, S102) — daftar aset properti APA
//     ADANYA, TIDAK dibaca ulang dari D.assets langsung di file ini.
//   - `LaporanAset.riwayatTransaksi()` (modules/asset/aset.js) —
//     SATU-SATUNYA titik hitung total masuk/keluar transaksi per aset
//     yang ditautkan ke akun (formula SUDAH ADA: reduce
//     `t.type==='income'`/`'expense'` per akun tertaut, pola SAMA PERSIS
//     dipakai `AsetKeluarga`/`LaporanAset.build()`) — dipanggil APA
//     ADANYA lalu HANYA difilter ke assetId yang merupakan properti
//     (irisan dgn `PropertyManagementAPI.propertyList()`), TIDAK
//     dihitung ulang.
// pola guard berlapis (`typeof X==='undefined'` -> {ok:false,reason})
// SAMA PERSIS `PropertyManagementAPI`/`AssetPortfolioAPI` (S101/S102)
// supaya file ini aman dimuat/dites berdiri sendiri lewat loadSource()
// tanpa dependency-nya.
//
// `netIncome = totalMasuk - totalKeluar` di bawah BUKAN rumus baru —
// pengurangan sederhana, bentuk SAMA PERSIS `Kekayaan.currentNetWorth()`
// (modules/shared/modules-calc.js) & `AsetKeluarga.keuangan().net`
// (modules/asset/aset-keluarga.js, `saldoAkun-utang`).
//
// Semua fungsi di bawah PURE (read-only) — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM.
const RentalManagementAPI = {

  // _properties() — helper internal: satu titik akses ke
  // `PropertyManagementAPI.propertyList()` (S102). Guard berlapis, pola
  // sama persis `FinancialGoalAPI._goals()`.
  _properties() {
    if (typeof PropertyManagementAPI === 'undefined' || typeof PropertyManagementAPI.propertyList !== 'function') {
      return { ok: false, reason: 'PropertyManagementAPI belum dimuat' };
    }
    let pl;
    try {
      pl = PropertyManagementAPI.propertyList();
    } catch (e) {
      return { ok: false, reason: 'PropertyManagementAPI.propertyList gagal dipanggil' };
    }
    if (!pl || !pl.ok) return pl || { ok: false, reason: 'propertyList tidak tersedia' };
    return { ok: true, properties: pl.properties };
  },

  // _riwayat() — helper internal: satu titik akses ke
  // `LaporanAset.riwayatTransaksi()` (modules/asset/aset.js). Guard
  // berlapis, pola sama persis `AssetPortfolioAPI._investment()`.
  _riwayat() {
    if (typeof LaporanAset === 'undefined' || typeof LaporanAset.riwayatTransaksi !== 'function') {
      return { ok: false, reason: 'LaporanAset belum dimuat' };
    }
    let r;
    try {
      r = LaporanAset.riwayatTransaksi();
    } catch (e) {
      return { ok: false, reason: 'LaporanAset.riwayatTransaksi gagal dipanggil' };
    }
    return { ok: true, akunTertaut: (r && Array.isArray(r.akunTertaut)) ? r.akunTertaut : [] };
  },

  // rentalUnits() — Rental Management API. Irisan aset properti (S102)
  // dengan hasil `LaporanAset.riwayatTransaksi()` APA ADANYA
  // (totalMasuk/totalKeluar/jumlahTx/accountName/accountExists TIDAK
  // dihitung ulang) — hanya property yang SUDAH ditautkan ke akun
  // (`accountId`) yang muncul di sini, ditambah `netIncome` (pengurangan
  // sederhana, lihat catatan file di atas) & data properti (jenis/icon/
  // nilai) dari `propertyList()`.
  rentalUnits() {
    const p = this._properties();
    if (!p.ok) return p;
    const r = this._riwayat();
    if (!r.ok) return r;
    const propertyIds = new Set(p.properties.map((a) => String(a.id)));
    const units = r.akunTertaut
      .filter((x) => propertyIds.has(String(x.assetId)))
      .map((x) => {
        const prop = p.properties.find((a) => String(a.id) === String(x.assetId));
        return {
          assetId: x.assetId,
          name: x.assetName,
          jenis: prop ? prop.jenis : null,
          icon: prop ? prop.icon : '📦',
          nilai: prop ? prop.nilai : 0,
          accountId: x.accountId,
          accountName: x.accountName,
          accountExists: x.accountExists,
          jumlahTx: x.jumlahTx,
          totalMasuk: x.totalMasuk,
          totalKeluar: x.totalKeluar,
          netIncome: x.totalMasuk - x.totalKeluar,
        };
      });
    return { ok: true, count: units.length, units };
  },

  // unmanagedProperties() — Property yang BELUM ditautkan ke Akun
  // Transaksi (`!a.accountId`), sehingga belum ikut terlacak sbg unit
  // sewa di sini — pola perbandingan sama persis `AsetKeluarga.
  // carNotes()` (membandingkan jumlah tercatat vs belum tercatat, TIDAK
  // ada field penghubung baru).
  unmanagedProperties() {
    const p = this._properties();
    if (!p.ok) return p;
    const list = p.properties.filter((a) => !a.accountId);
    return { ok: true, count: list.length, properties: list };
  },

  // incomeSummary() — Rental Income Summary. Derivatif murni dari
  // `rentalUnits()` di atas — `totalIncome`/`totalExpense`/`netIncome`
  // murni dijumlahkan dari field final tiap unit (reduce sederhana, pola
  // sama persis `Investment.portfolioSummary()`/
  // `AssetPortfolioAPI.portfolioComposition()`).
  incomeSummary() {
    const ru = this.rentalUnits();
    if (!ru.ok) return ru;
    const totalIncome = ru.units.reduce((s, u) => s + u.totalMasuk, 0);
    const totalExpense = ru.units.reduce((s, u) => s + u.totalKeluar, 0);
    const netIncome = totalIncome - totalExpense;
    return {
      ok: true,
      unitCount: ru.count,
      totalIncome,
      totalExpense,
      netIncome,
    };
  },

  // summary() — satu pintu masuk gabungan (dipakai presenter/AI briefing
  // masa depan), murni memanggil fungsi-fungsi di atas + `portfolioValue()`
  // (S102, konteks nilai total properti), TIDAK ada logic tambahan. `ok`
  // true kalau `incomeSummary()` ok (pola sama persis
  // `PropertyManagementAPI.summary()`).
  summary() {
    const income = this.incomeSummary();
    const units = this.rentalUnits();
    const unmanaged = this.unmanagedProperties();
    const portfolio = (typeof PropertyManagementAPI !== 'undefined' && typeof PropertyManagementAPI.portfolioValue === 'function')
      ? PropertyManagementAPI.portfolioValue()
      : { ok: false, reason: 'PropertyManagementAPI belum dimuat' };
    return {
      ok: !!income.ok,
      income,
      units,
      unmanaged,
      portfolio,
    };
  },

};
