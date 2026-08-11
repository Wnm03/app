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
// SESI 449 (BUG-OWN-002 lanjutan): tambah 1 filter exclude akun tertaut ke
// Buku Aset (linkedAssetAccountIds(), sama persis pola totalSaldoAkun()) --
// sejak akun tertaut disinkron ke NILAI PENUH instrumen (bukan porsi SELF
// saja lagi, lihat aset.js), kalau aset & akun tertautnya SAMA-SAMA
// ber-ownership non-SELF (mis. INVESTOR), nilainya kehitung 2x di sini:
// sekali dari sumAssets(type) (a.nilai), sekali lagi dari sini
// (recalcAccBalance(akun tertaut) = a.nilai juga). Akun tertaut TETAP
// tampil apa adanya di kartunya sendiri (Buku Akun) utk info saldo, cuma
// dikecualikan dari AGREGAT Dana Kelolaan di sini.
sumAccounts(type) {
  if (typeof recalcAccBalance !== 'function') return 0;
  const linked = (typeof linkedAssetAccountIds === 'function') ? linkedAssetAccountIds() : new Set();
  return (D.accounts || [])
    .filter((a) => this._resolveType(a) === type && !linked.has(String(a.id)))
    .reduce((s, a) => s + recalcAccBalance(a.id), 0);
},

// sumAssets(type) — jumlah nilai aset (D.assets) ber-ownership `type`,
// pakai field a.nilai apa adanya (0 rumus baru, sama seperti
// Aset.totalValue() di aset.js).
// PERUBAHAN SESI B12 (follow-up B7-B9, gap yang sama persis ditemukan di
// modul ini): aset yang ditautkan ke Holding Investasi lewat dropdown B1
// (`a.investmentId`) sekarang DIKECUALIKAN dari sini juga -- sebelum sesi
// ini, kalau aset non-SELF (mis. ownership INVESTOR) ditautkan ke holding
// ber-ownership INVESTOR yang sama, nilainya kehitung 2x di byType():
// sekali di sini (a.nilai), sekali lagi di sumInvestasi() (Investment.
// holdingValue(h)). Filter `&&!a.investmentId` pola SAMA PERSIS Opsi A
// Aset.totalValue() (B8) -- 0 validasi ulang ke D.investments (aset
// dengan tautan orphan tetap dikecualikan sampai user melepas tautannya,
// sikap sama dgn B8).
sumAssets(type) {
  return (D.assets || [])
    .filter((a) => this._resolveType(a) === type)
    .filter((a) => !a.investmentId)
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

// sumTitipanAset() — jumlah porsi NON-SELF dari `nilai` SEMUA aset yang
// kepemilikan efektifnya SELF. SENGAJA dipisah dari sumAssets('THIRD_PARTY')
// dkk di atas: field `ownership` = status SELURUH aset (whole-entity),
// sedangkan porsi titipan = SEBAGIAN nilai aset SELF yang dananya titipan
// orang lain (dicatat jadi utang di Buku Utang lewat
// Aset._syncOwnerDebts(), TIDAK mengubah `ownership`). Filter
// ownership===SELF di sini murni jaga-jaga anti dobel: kalau suatu saat
// ada aset non-SELF yang porsi titipannya ikut terisi, nilainya SUDAH
// kehitung penuh lewat sumAssets(type) di atas, jadi TIDAK perlu (dan
// TIDAK boleh) dijumlah lagi di sini.
//
// Sesi D (lanjutan migrasi Dana Titipan -> Multi-Owner Engine, S406b-408):
// SEBELUM sesi ini baca `a.titipanAmount` legacy langsung. Sekarang baca
// lewat MultiOwnerEngine.selfPorsi(a) (100% reuse, 0 rumus baru) supaya
// ikut porsi MAJEMUK hasil "Atur Porsi Kepemilikan" (392a-e, `a.owners`
// >1 baris non-SELF), bukan cuma 1 slot titipan tunggal. 0 REGRESI: aset
// yang belum sempat auto-migrate (Sesi C) TETAP terhitung benar karena
// MultiOwnerEngine.getOwners() sendiri masih baca titipanAmount legacy
// lewat cabang sintesis _synthesizeFromTitipan() (Sesi 406b) kalau
// `a.owners` belum ada — sumTitipanAset() TIDAK PERLU TAHU beda keduanya,
// tinggal pakai porsi efektif apa pun sumbernya. Guard typeof
// MultiOwnerEngine: kalau engine belum dimuat, fallback 0 (pola sama
// persis guard OwnershipEngine di _resolveType() di atas).
sumTitipanAset() {
  if (typeof MultiOwnerEngine === 'undefined') return 0;
  return (D.assets || [])
    .filter((a) => this._resolveType(a) === 'SELF')
    .reduce((s, a) => {
      const nilai = typeof a.nilai === 'number' && isFinite(a.nilai) ? a.nilai : 0;
      const selfPorsi = MultiOwnerEngine.selfPorsi(a);
      // Math.round per aset (bukan di total) -- jaga presisi Rupiah &
      // hindari residu float (mis. .../3*3 != nilai persis) menumpuk kalau
      // dijumlah dulu baru dibulatkan di akhir.
      return s + Math.round(nilai * (1 - selfPorsi / 100));
    }, 0);
},

// sumTitipanInvestasi() — BUGFIX Sesi 458: jumlah cost basis SEMUA holding
// investasi (Investment.getHoldings(), investasi.js) yang ownership
// keseluruhan holding-nya SELF TAPI `fundSource==='titipan'` (dana yang
// dipakai buat beli instrumen ini sebagian/seluruhnya dititipkan orang
// lain). SEBELUM sesi ini, titipan investasi SAMA SEKALI TIDAK terhitung
// di Dana Kelolaan: sumInvestasi(type) di atas cuma baca field `ownership`
// (status kepemilikan SELURUH holding), sedangkan fundSource='titipan'
// TIDAK PERNAH mengubah `ownership` holding (lihat isHoldingOwnershipSelf()
// & addHolding()/updateHolding() di investasi.js -- pola SENGAJA sama
// dgn aset: whole-entity ownership vs partial-titipan terpisah). Padahal
// investasi.js SUDAH mencatat titipan ini sbg 1 entry Buku Utang
// (Investment._syncTitipanDebt(), `debtLinkId`) — jadi datanya ada &
// akurat, cuma Dana Kelolaan belum menjumlahkannya. Pola SAMA PERSIS
// sumTitipanAset() di atas (partial/whole-SELF-but-titipan, dipisah dari
// sumInvestasi(type) supaya tidak dobel-hitung), bedanya investasi cuma
// 1 flag biner (bukan porsi majemuk % seperti aset), jadi nilainya =
// Investment.holdingCost(h) APA ADANYA (angka SAMA PERSIS yang dipakai
// _syncTitipanDebt() buat isi `nilai` di Buku Utang, 0 rumus baru).
// Filter _resolveType(h)==='SELF' sama alasannya dgn sumTitipanAset():
// kalau suatu saat holding titipan punya `ownership` non-SELF juga, itu
// SUDAH kehitung penuh via sumInvestasi(type), jadi TIDAK boleh dobel di
// sini. Guard typeof Investment: kalau modul investasi belum dimuat,
// fallback 0 (pola sama semua guard lain di file ini).
sumTitipanInvestasi() {
  if (typeof Investment === 'undefined') return 0;
  const holdings = Investment.getHoldings ? Investment.getHoldings() : [];
  return holdings
    .filter((h) => h.fundSource === 'titipan' && this._resolveType(h) === 'SELF')
    .reduce((s, h) => s + (Investment.holdingCost(h) || 0), 0);
},

// listTitipan() — Sesi 459 (rekomendasi #2 dari audit "dana titipan"):
// daftar RINCI per-entri titipan yang bermuara ke titipanAset/
// titipanInvestasi di atas (nama pemilik, sumber aset/investasi, nominal,
// referensi id entitas asal supaya presenter bisa link balik). MURNI
// presenter-support, BACA SAJA (0 mutasi, 0 rumus baru) — reuse
// MultiOwnerEngine.getOwners() (utk pecah tiap baris owner non-SELF per
// aset, pola SAMA PERSIS sumTitipanAset() tapi TANPA agregasi jadi 1
// angka) & Investment.holdingCost() (utk holding titipan, pola SAMA
// PERSIS sumTitipanInvestasi()). SENGAJA TIDAK mencakup whole-entity
// non-SELF (THIRD_PARTY/INVESTOR/CUSTOMER/FAMILY dari byType()) --
// entitas itu SUDAH terlihat apa adanya di modul asalnya masing2 (Buku
// Akun/Aset/Investasi/Shop dgn ownership sendiri), sedangkan titipan
// PARSIAL di dalam aset/holding SELF itu yang sebelumnya "tersembunyi"
// (cuma nongol sbg 1 angka gabungan di summary()) -- itu fokus daftar
// rinci ini. Return array {owner, source, name, nominal, refId}, urutan
// nominal terbesar dulu (guna presentasi, bukan makna data).
listTitipan() {
  const out = [];
  if (typeof MultiOwnerEngine !== 'undefined') {
    (D.assets || [])
      .filter((a) => this._resolveType(a) === 'SELF')
      .forEach((a) => {
        const nilai = typeof a.nilai === 'number' && isFinite(a.nilai) ? a.nilai : 0;
        const res = MultiOwnerEngine.getOwners(a);
        (res.owners || []).filter((o) => !o.isSelf).forEach((o) => {
          const nominal = Math.round(nilai * (o.porsi / 100));
          if (nominal <= 0) return;
          out.push({ owner: o.ownerName || o.ownerId, source: 'aset', name: a.name || 'Aset', nominal, refId: a.id });
        });
      });
  }
  if (typeof Investment !== 'undefined') {
    const holdings = Investment.getHoldings ? Investment.getHoldings() : [];
    holdings
      .filter((h) => h.fundSource === 'titipan' && this._resolveType(h) === 'SELF')
      .forEach((h) => {
        const nominal = Investment.holdingCost(h) || 0;
        if (nominal <= 0) return;
        out.push({ owner: (h.titipanOwner && String(h.titipanOwner).trim()) || 'Pemilik dana titipan', source: 'investasi', name: h.name || 'Holding', nominal, refId: h.id });
      });
  }
  return out.sort((x, y) => y.nominal - x.nominal);
},

// summary() — ringkasan Dana Kelolaan, 1 angka per tipe kepemilikan
// non-SELF + total. Label sesuai spesifikasi sesi ini:
//   INVESTOR -> "Dana Investor", THIRD_PARTY -> "Dana Titipan",
//   CUSTOMER -> "DP Customer", FAMILY -> "Dana Keluarga".
// titipanAset (baris baru, terpisah dari `titipan` di atas supaya tidak
// mencampur whole-asset THIRD_PARTY dgn partial-titipan aset SELF) -> ikut
// masuk `total` supaya Dana Kelolaan tetap 1 angka utuh yang mewakili
// SEMUA dana pihak lain yang tercatat di app, dari sumber mana pun.
// titipanInvestasi (Sesi 458, BUGFIX) — pola SAMA PERSIS titipanAset,
// sumber investasi (lihat sumTitipanInvestasi() di atas) -> ikut masuk
// `total` dgn alasan sama: dana titipan tetap dana titipan, tidak peduli
// "wadahnya" aset atau instrumen investasi.
summary() {
  const investor = this.byType('INVESTOR');
  const titipan = this.byType('THIRD_PARTY');
  const dpCustomer = this.byType('CUSTOMER');
  const keluarga = this.byType('FAMILY');
  const titipanAset = this.sumTitipanAset();
  const titipanInvestasi = this.sumTitipanInvestasi();
  const total = investor + titipan + dpCustomer + keluarga + titipanAset + titipanInvestasi;
  // utangNonSelf (Sesi 255, Ownership Sync Piutang & Utang) — total utang
  // ber-ownership non-SELF, SENGAJA TIDAK ikut `total` di atas (lihat
  // komentar sumDebt()). Field tambahan murni informasional supaya utang
  // yang dikecualikan dari Total Utang tetap terlihat/terlacak di sini.
  const utangNonSelf = this.sumDebt('INVESTOR') + this.sumDebt('THIRD_PARTY') + this.sumDebt('CUSTOMER') + this.sumDebt('FAMILY');
  return { investor, titipan, dpCustomer, keluarga, titipanAset, titipanInvestasi, utangNonSelf, total };
},

};
