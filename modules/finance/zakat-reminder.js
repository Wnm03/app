// modules/finance/zakat-reminder.js — Zakat Reminder Foundation (sesi
// lanjutan, antrian AUDIT-DASHBOARD-INSIGHT-COVERAGE.md §2 "Zakat" —
// dikonfirmasi user: Penghasilan & Maal masuk sesi ini, Fitrah DITUNDA
// karena butuh keputusan ambang due-date tahunan terpisah, belum ada
// datanya sama sekali).
//
// PRINSIP (RULE #1, pola SAMA PERSIS TagihanReminder/PiutangUtangReminder):
// 100% REUSE formula `wajib` yang SUDAH FINAL di Zakat.hitungPenghasilan()/
// Zakat.hitungMaal() (pajak-pbb-zakat.js) — TIDAK ada ambang/rumus baru.
// Ekspresi filter/reduce/threshold DIDUPLIKASI apa adanya (BUKAN dipanggil
// langsung) karena Zakat.hitungPenghasilan()/hitungMaal() adalah fungsi
// render tercampur DOM (document.getElementById(...)) — memanggilnya
// langsung dari modul reminder headless (dikonsumsi dashboard tanpa tab
// Zakat pernah dibuka) akan error DOM null. Pola duplikasi-formula-final
// ini SAMA PERSIS yang sudah dipakai project ini sendiri di
// FI.investmentAssetValue() (modules-calc.js, komentar sesi B8: "duplikat
// dari Zakat.hitungMaal(), bukan reuse") — BUKAN preseden baru.
//
// CATATAN PENTING (temuan sesi ini, bukan ambang baru — soal REUSE yang
// AMAN): FI.investmentAssetValue() SENGAJA TIDAK dipakai di sini walau
// formulanya mirip asetZakatable, karena investmentAssetValue() punya
// cabang `if(fi.assetScope==='semua') return totalAssetValue()` (scope
// toggle milik Financial Freedom, tidak ada hubungan dengan Zakat Maal) —
// kalau user set scope FI ke "semua", investmentAssetValue() akan
// mengembalikan SELURUH nilai aset, bukan cuma yang `zakatable`, dan zakat
// yang dihitung reminder ini akan salah total. Ekspresi filter/reduce
// asetZakatable di bawah DIDUPLIKASI persis dari Zakat.hitungMaal() (BUKAN
// dari FI.investmentAssetValue()) supaya tidak ikut kebawa cabang scope
// yang tidak relevan.
//
// CATATAN PENTING #2 (haul, side-effect di kode asli): Zakat.hitungMaal()
// (fungsi render) MENULIS `pz.haulMaalMulai` sebagai side-effect tiap kali
// dipanggil (auto-mulai haul kalau belum ada, reset ke null kalau di bawah
// nisab) — ini COCOK untuk fungsi render yang hanya jalan saat user buka
// tab Zakat Maal, TAPI TIDAK aman dipanggil dari modul reminder yang jalan
// tiap render dashboard (headless, bisa jalan tanpa user pernah buka tab
// Zakat). Modul ini SENGAJA read-only — TIDAK PERNAH menulis
// `pz.haulMaalMulai`. Konsekuensi (bukan bug, konsekuensi dari keputusan
// read-only ini): kalau user belum pernah buka tab Zakat Maal sama sekali
// (haulMaalMulai masih null/belum ada), reminder TIDAK akan pernah
// menyala walau totalHarta sudah lewat nisab — sama seperti kondisi
// `wajib` SEBELUM tab dibuka pertama kali (haulOk baru bisa true setelah
// haul mulai dihitung, sama seperti sebelum ada reminder ini). Begitu
// haul mulai dihitung (lewat tab Zakat Maal, kapan pun), reminder ini
// otomatis ikut membaca state yang sama.
//
// "Sudah dibayar periode ini" (RULE #1 tambahan kecil dari N, pola SAMA
// PERSIS getBillPaidThisPeriodInfo() milik TagihanReminder): HANYA
// diperlukan utk Zakat Penghasilan — `wajib` Penghasilan murni fungsi
// income bulan berjalan, TIDAK ada state yang berubah setelah dibayar,
// jadi tanpa exclusion ini reminder akan terus menyala sepanjang bulan
// walau sudah dicatat lunas (dicek lewat D.pajakZakat.zakatLog, jenis
// 'penghasilan', tanggal bulan berjalan). Zakat Maal TIDAK butuh exclusion
// serupa — Zakat.catatDibayar() SUDAH me-reset `pz.haulMaalMulai` ke hari
// ini tiap kali maal dibayar (kode asli, dibaca apa adanya di sini),
// sehingga haulOk otomatis balik false setelah dibayar — perilaku
// exclusion-nya SUDAH ADA dari formula final, bukan ditambah baru.
//
// TIDAK ada UI/panel baru di file ini — murni fondasi data, dikonsumsi
// PriorityEngine (modules/cross/priority-engine.js) lewat
// LifeDashboardSummaryAPI, sesi ini juga. Semua fungsi PURE (baca D saja,
// TIDAK PERNAH memanggil save()/menulis ke D, TIDAK menyentuh DOM).
const ZakatReminder = {

// _paidThisMonth(jenis) — cek D.pajakZakat.zakatLog utk entri `jenis` yang
// tanggalnya jatuh di bulan berjalan (local time) — pola SAMA PERSIS
// pengecekan `incomeBulan` milik Zakat.hitungPenghasilan() (filter
// bulan/tahun berjalan), diterapkan ke tanggal log alih-alih tanggal
// transaksi. null-safe kalau D/D.pajakZakat/zakatLog belum ada.
_paidThisMonth(jenis) {
  const log = (typeof D !== 'undefined' && D.pajakZakat && Array.isArray(D.pajakZakat.zakatLog))
    ? D.pajakZakat.zakatLog : [];
  const now = new Date();
  return log.some((l) => {
    if (!l || l.jenis !== jenis || !l.tanggal) return false;
    const d = new Date(l.tanggal);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
},

// penghasilanReminder() — reuse APA ADANYA formula `wajib` milik
// Zakat.hitungPenghasilan(): incomeBulan (D.transactions, type income,
// bulan berjalan) >= D.pajakZakat.nisabPenghasilanBulan. [] kalau belum
// wajib ATAU sudah dicatat dibayar bulan ini.
penghasilanReminder() {
  if (typeof D === 'undefined' || !Array.isArray(D.transactions) || !D.pajakZakat) return [];
  const now = new Date();
  const incomeBulan = D.transactions
    .filter((t) => t && t.type === 'income' && (() => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })())
    .reduce((s, t) => s + (t.amount || 0), 0);
  const nisab = D.pajakZakat.nisabPenghasilanBulan;
  const wajib = incomeBulan >= nisab;
  if (!wajib || this._paidThisMonth('penghasilan')) return [];
  const jumlah = Math.round(incomeBulan * 0.025);
  return [{
    type: 'zakatPenghasilan',
    severity: 'warning',
    jumlah,
    message: `Zakat Penghasilan bulan ini sudah wajib (${fmtFull ? fmtFull(jumlah) : jumlah}), belum tercatat dibayar.`,
  }];
},

// maalReminder() — reuse APA ADANYA formula `wajib` milik Zakat.hitungMaal():
// cukupNisab (totalHarta >= 85gr emas) && haulOk (haul >= 354 hari SEJAK
// `pz.haulMaalMulai` yang SUDAH ADA — dibaca read-only, TIDAK pernah
// ditulis/di-mulai dari sini, lihat catatan di atas berkas).
maalReminder() {
  if (typeof D === 'undefined' || !D.pajakZakat) return [];
  const pz = D.pajakZakat;
  const saldoAkun = (typeof totalSaldoAkun === 'function') ? totalSaldoAkun() : 0;
  const asetZakatable = (D.assets || [])
    .filter((a) => a && a.zakatable && !a._migratedToInvestmentId && !a.investmentId)
    .reduce((s, a) => s + (typeof MultiOwnerEngine !== 'undefined'
      ? MultiOwnerEngine.selfOwnedValue(a, a.nilai || 0) : (a.nilai || 0)), 0)
    + (typeof Investment !== 'undefined' ? Investment.zakatableValue() : 0);
  const piutangZakatable = (typeof totalPiutangValue === 'function') ? totalPiutangValue() : 0;
  const utang = (typeof FI !== 'undefined') ? FI.totalDebt()
    : ((pz.utangJT || 0)
      + (typeof totalDebtValue === 'function' ? totalDebtValue() : 0)
      + (typeof totalCicilanOutstanding === 'function' ? totalCicilanOutstanding() : 0));
  const totalHarta = Math.max(0, saldoAkun + asetZakatable + piutangZakatable - utang);
  const nisab = 85 * (pz.hargaEmasPerGram || 0);
  const cukupNisab = totalHarta >= nisab;
  let haulOk = false;
  if (cukupNisab && pz.haulMaalMulai) {
    const mulai = new Date(pz.haulMaalMulai);
    const hariBerjalan = Math.floor((new Date() - mulai) / 86400000);
    haulOk = hariBerjalan >= 354;
  }
  const wajib = cukupNisab && haulOk;
  if (!wajib) return [];
  const jumlah = Math.round(totalHarta * 0.025);
  return [{
    type: 'zakatMaal',
    severity: 'warning',
    jumlah,
    message: `Zakat Maal sudah wajib (${fmtFull ? fmtFull(jumlah) : jumlah}), sudah mencapai nisab & haul.`,
  }];
},

// summary() — Reminder Summary API, satu pintu masuk (dikonsumsi
// LifeDashboardSummaryAPI/PriorityEngine, sesi ini juga) — pola SAMA
// PERSIS TagihanReminder.summary()/PiutangUtangReminder.summary(), tapi
// BEDA bentuk (sama seperti danaTitipan/financialRisk): SEMUA item
// severity 'warning' ("wajib sekarang", bukan due-date), jadi cuma
// `warningCount` (bukan overdueCount/dueSoonCount).
summary() {
  const all = [...this.penghasilanReminder(), ...this.maalReminder()];
  return {
    total: all.length,
    warningCount: all.filter((r) => r.severity === 'warning').length,
    all,
  };
},

};
