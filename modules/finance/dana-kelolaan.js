// dana-kelolaan.js — Dana Kelolaan / Managed Funds (Sesi 195).
//
// TARGET EKSPLISIT USER: "S195 Managed Funds. Reuse OwnershipEngine.
// Implementasikan Dana Kelolaan... Reuse existing modules. No audit. No
// refactor. No business logic changes."
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE — OwnershipEngine (Sesi 191)
// utk normalisasi/resolve 5 tipe kepemilikan, DAN nilai per-entity yang
// SUDAH ADA di masing2 modul domain (0 rumus baru):
//   - Akun (D.accounts)              -> recalcAccBalance(a.id)  (akun.js)
//   - Aset (D.assets)                -> a.nilai                 (aset.js)
//   - Investasi (Investment.getHoldings()) -> Investment.holdingValue(h) (investasi.js)
//   - Shop (D.cobek)                 -> t.total                 (cobek-order.js)
//
// Modul ini MURNI MENJUMLAHKAN entity yang kepemilikan efektifnya (lewat
// OwnershipEngine.resolve()) SALAH SATU dari INVESTOR/CUSTOMER/
// THIRD_PARTY/FAMILY per tipe (SELF sengaja TIDAK dijumlahkan di sini —
// itu tetap masuk Kas/Aset/Net Worth/Dashboard Keuangan/Insight Keuangan
// seperti biasa, TIDAK disentuh sesi ini). Dana Kelolaan adalah
// "cermin"/komplemen dari exclude ownership Sesi 192-194: dana yang
// DIKECUALIKAN dari agregat SELF itu, sekarang dijumlahkan & ditampilkan
// terpisah di sini SUPAYA tetap terlihat/terlacak (bukan hilang).
//
// PURE (tidak menyimpan state, tidak menyentuh D langsung selain baca,
// tidak Date.now()/Math.random()) — pola sama dgn AsetKeluarga.build()/
// OwnershipEngine sendiri.
//
// Guard typeof di setiap sumber data opsional (Investment/recalcAccBalance)
// supaya modul ini tetap aman dipakai berdiri sendiri / kalau salah satu
// domain belum dimuat (headless test, urutan load, dst) — pola SAMA
// PERSIS isAccOwnershipSelf()/isAssetOwnershipSelf()/isHoldingOwnershipSelf()/
// isCobekOwnershipSelf() (Sesi 192-194).
const DanaKelolaan = {

// _resolveType(entity) — helper internal: kepemilikan efektif via
// OwnershipEngine.resolve() (toleran data lama, fallback SELF). Guard
// typeof OwnershipEngine: kalau engine belum dimuat, SEMUA entity
// dianggap SELF (tidak pernah masuk Dana Kelolaan) — sama seperti fallback
// isXOwnershipSelf() di modul lain (anggap SELF/tidak exclude apa pun).
_resolveType(entity) {
  if (typeof OwnershipEngine === 'undefined') return 'SELF';
  return OwnershipEngine.resolve(entity).type;
},

// sumAccounts(type) — jumlah saldo akun (D.accounts) ber-ownership `type`,
// pakai recalcAccBalance() apa adanya (0 rumus baru, sama seperti
// totalSaldoAkun() di akun.js). Guard typeof recalcAccBalance opsional.
sumAccounts(type) {
  if (typeof recalcAccBalance !== 'function') return 0;
  return (D.accounts || [])
    .filter((a) => this._resolveType(a) === type)
    .reduce((s, a) => s + recalcAccBalance(a.id), 0);
},

// sumAssets(type) — jumlah nilai aset (D.assets) ber-ownership `type`,
// pakai field a.nilai apa adanya (0 rumus baru, sama seperti
// Aset.totalValue() di aset.js).
sumAssets(type) {
  return (D.assets || [])
    .filter((a) => this._resolveType(a) === type)
    .reduce((s, a) => s + (a.nilai || 0), 0);
},

// sumInvestasi(type) — jumlah nilai holding investasi ber-ownership
// `type`, pakai Investment.holdingValue(h) apa adanya (0 rumus baru, sama
// seperti Investment.portfolioSummary() di investasi.js). Guard typeof
// Investment opsional.
sumInvestasi(type) {
  if (typeof Investment === 'undefined') return 0;
  const holdings = Investment.getHoldings ? Investment.getHoldings() : [];
  return holdings
    .filter((h) => this._resolveType(h) === type)
    .reduce((s, h) => s + Investment.holdingValue(h), 0);
},

// sumShop(type) — jumlah omzet transaksi Shop (D.cobek) ber-ownership
// `type`, pakai field t.total apa adanya (0 rumus baru, sama seperti
// Laporan.render()/renderTab() di cobek-order.js).
sumShop(type) {
  return (D.cobek || [])
    .filter((t) => this._resolveType(t) === type)
    .reduce((s, t) => s + (t.total || 0), 0);
},

// sumPiutang(type) — jumlah nilai piutang belum lunas (D.piutang)
// ber-ownership `type`, pakai field p.nilai apa adanya (0 rumus baru, sama
// seperti Piutang.totalValue() di piutang-utang.js, Sesi 255 Ownership
// Sync). Piutang bersifat asset-like (uang yang DITAGIH ke pihak lain),
// jadi diikutkan ke `byType()`/`total` sama seperti sumAssets() dkk.
sumPiutang(type) {
  return (D.piutang || [])
    .filter((p) => !p.lunas)
    .filter((p) => this._resolveType(p) === type)
    .reduce((s, p) => s + (p.nilai || 0), 0);
},

// sumDebt(type) — jumlah nilai utang belum lunas (D.debts) ber-ownership
// `type`, pakai field d.nilai apa adanya (0 rumus baru, sama seperti
// Debt.totalValue() di piutang-utang.js, Sesi 255 Ownership Sync). SENGAJA
// TIDAK diikutkan ke byType()/total di atas: Piutang/Aset/Akun/Investasi/
// Shop semua bersifat DANA/ASET (nilai positif yang "dititipkan"), sedangkan
// Utang bersifat KEWAJIBAN (nilai negatif dari sudut pandang SELF) — beda
// sifat, jadi TIDAK dijumlah campur ke satu total yang sama (supaya makna
// `total` Dana Kelolaan tetap konsisten: total dana pihak lain yang
// tercatat di app, BUKAN net dana dikurangi kewajiban pihak lain).
// Ditampilkan terpisah di summary() (`utangNonSelf`) supaya tetap
// terlihat/terlacak, bukan hilang begitu saja dari Total Utang (Sesi 255,
// pola sama filosofinya dgn titipanAset di bawah).
sumDebt(type) {
  return (D.debts || [])
    .filter((d) => !d.lunas)
    .filter((d) => this._resolveType(d) === type)
    .reduce((s, d) => s + (d.nilai || 0), 0);
},

// byType(type) — total gabungan 5 sumber di atas utk 1 tipe kepemilikan
// (Sesi 255: +sumPiutang, mengikuti pola SAMA PERSIS 4 sumber sebelumnya).
// `type` HARUS salah satu dari OWNERSHIP_TYPES non-SELF (INVESTOR/
// CUSTOMER/THIRD_PARTY/FAMILY) — dipanggil internal oleh summary(), tidak
// divalidasi ulang di sini (caller = summary(), sudah pasti benar).
byType(type) {
  return this.sumAccounts(type) + this.sumAssets(type) + this.sumInvestasi(type) + this.sumShop(type) + this.sumPiutang(type);
},

// sumTitipanAset() — jumlah titipanAmount (Sesi 249-250, Buku Aset ->
// toggle "Ada Dana Titipan?") dari SEMUA aset yang kepemilikan efektifnya
// SELF. SENGAJA dipisah dari sumAssets('THIRD_PARTY') dkk di atas: field
// `ownership` = status SELURUH aset (whole-entity), sedangkan titipanAmount
// = porsi SEBAGIAN nilai aset SELF yang dananya titipan orang lain (dicatat
// jadi utang di Buku Utang lewat Aset._syncTitipanDebt(), TIDAK mengubah
// `ownership`). Filter ownership===SELF di sini murni jaga-jaga anti dobel:
// kalau suatu saat ada aset non-SELF yang titipanAmount-nya ikut terisi,
// nilainya SUDAH kehitung penuh lewat sumAssets(type) di atas, jadi TIDAK
// perlu (dan TIDAK boleh) dijumlah lagi di sini.
sumTitipanAset() {
  return (D.assets || [])
    .filter((a) => this._resolveType(a) === 'SELF')
    .reduce((s, a) => s + (a.titipanAmount || 0), 0);
},

// summary() — ringkasan Dana Kelolaan, 1 angka per tipe kepemilikan
// non-SELF + total. Label sesuai spesifikasi sesi ini:
//   INVESTOR -> "Dana Investor", THIRD_PARTY -> "Dana Titipan",
//   CUSTOMER -> "DP Customer", FAMILY -> "Dana Keluarga".
// titipanAset (baris baru, terpisah dari `titipan` di atas supaya tidak
// mencampur whole-asset THIRD_PARTY dgn partial-titipan aset SELF) -> ikut
// masuk `total` supaya Dana Kelolaan tetap 1 angka utuh yang mewakili
// SEMUA dana pihak lain yang tercatat di app, dari sumber mana pun.
summary() {
  const investor = this.byType('INVESTOR');
  const titipan = this.byType('THIRD_PARTY');
  const dpCustomer = this.byType('CUSTOMER');
  const keluarga = this.byType('FAMILY');
  const titipanAset = this.sumTitipanAset();
  const total = investor + titipan + dpCustomer + keluarga + titipanAset;
  // utangNonSelf (Sesi 255, Ownership Sync Piutang & Utang) — total utang
  // ber-ownership non-SELF, SENGAJA TIDAK ikut `total` di atas (lihat
  // komentar sumDebt()). Field tambahan murni informasional supaya utang
  // yang dikecualikan dari Total Utang tetap terlihat/terlacak di sini.
  const utangNonSelf = this.sumDebt('INVESTOR') + this.sumDebt('THIRD_PARTY') + this.sumDebt('CUSTOMER') + this.sumDebt('FAMILY');
  return { investor, titipan, dpCustomer, keluarga, titipanAset, utangNonSelf, total };
},

};
