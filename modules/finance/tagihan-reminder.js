// modules/finance/tagihan-reminder.js — Tagihan Reminder Foundation
// (sesi lanjutan Fix #3 DASHBOARD-DEDUP.md, "Poin 1": perluasan cakupan
// saran Dashboard Hub — lanjutan dari Piutang/Utang, lihat
// DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md § "Audit kesiapan per modul").
//
// PRINSIP (RULE #1, pola SAMA PERSIS modules/finance/piutang-utang-
// reminder.js/modules/vehicle/vehicle-reminder.js): 100% REUSE, TIDAK ada
// framework/state baru, TIDAK mengubah struktur data D. Sumber dipakai
// apa adanya:
//   - D.bills                        (mentah — field `nextDue`/`freq`,
//                                     HANYA tagihan AKTIF; D.billsArchive
//                                     sengaja TIDAK disertakan, sama
//                                     seperti getBillStats() yang juga
//                                     cuma baca D.bills)
//   - billNextDueLocalMidnight()     (tagihan-kalender.js — parse nextDue
//                                     jadi Date local-midnight, dipakai
//                                     apa adanya, guard typeof)
//   - getBillPaidThisPeriodInfo()    (tagihan-kalender.js — deteksi tagihan
//                                     yg SUDAH dibayar periode berjalan,
//                                     dipakai apa adanya, guard typeof;
//                                     mencegah tagihan yg sudah lunas
//                                     periode ini tapi nextDue belum
//                                     sempat dimajukan/masih menunggu
//                                     periode berikutnya ikut dianggap
//                                     "butuh perhatian")
//
// Ambang "due-soon" (≤7 hari) & "overdue" (<0 hari) — SAMA PERSIS
// PiutangUtangReminder (bukan 30 hari seperti pajak kendaraan), supaya
// konsisten sesama reminder finansial siklus pendek.
//
// TIDAK ada UI/panel baru di file ini — murni fondasi data, dikonsumsi
// PriorityEngine (modules/cross/priority-engine.js) lewat
// LifeDashboardSummaryAPI, sesi ini juga. Semua fungsi PURE — tidak
// pernah memanggil save() atau menulis ke D/localStorage, tidak
// menyentuh DOM.
const TagihanReminder = {

// _daysUntil(dateStr) — reuse billNextDueLocalMidnight() (tagihan-
// kalender.js) apa adanya lewat guard typeof, dibandingkan ke hari ini
// local-midnight. null kalau helper belum dimuat ATAU dateStr kosong/
// tidak valid (pola sama daysUntilDate() yang dipakai PiutangUtangReminder:
// null = "tidak bisa dihitung", bukan 0).
_daysUntil(dateStr) {
  if (typeof billNextDueLocalMidnight !== 'function' || !dateStr) return null;
  const due = billNextDueLocalMidnight(dateStr);
  if (isNaN(due.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
},

// _paidThisPeriod(b) — reuse getBillPaidThisPeriodInfo() (tagihan-
// kalender.js) apa adanya lewat guard typeof, TANPA filter bulan/tahun
// (undefined -> fallback ke bulan berjalan aktual, pola default fungsi
// aslinya) supaya konsisten dgn arti "butuh perhatian SEKARANG".
_paidThisPeriod(b) {
  if (typeof getBillPaidThisPeriodInfo !== 'function') return null;
  return getBillPaidThisPeriodInfo(b, undefined, undefined);
},

// billReminders() — reminder tagihan jatuh tempo dari D.bills (aktif
// saja). Entry SUDAH dibayar periode ini (_paidThisPeriod truthy) ATAU
// tanpa `nextDue` valid dikecualikan total — pola sama exclusion
// `lunas`/`jatuhTempo` kosong milik PiutangUtangReminder. severity
// 'overdue' kalau sudah lewat, 'due-soon' kalau sisa ≤7 hari (termasuk
// hari ini) — sisa >7 hari TIDAK dijadikan reminder.
billReminders() {
  const out = [];
  const list = (typeof D !== 'undefined' && Array.isArray(D.bills)) ? D.bills : [];
  list.forEach((b) => {
    if (!b || this._paidThisPeriod(b)) return;
    const d = this._daysUntil(b.nextDue);
    if (d === null || d > 7) return;
    const severity = d < 0 ? 'overdue' : 'due-soon';
    const message = severity === 'overdue'
      ? `Tagihan "${b.name}" sudah lewat jatuh tempo (${Math.abs(d)} hari lewat).`
      : `Tagihan "${b.name}" segera jatuh tempo (${d === 0 ? 'hari ini' : `H-${d} hari`}).`;
    out.push({
      type: 'bill',
      id: b.id,
      name: b.name,
      severity,
      nextDue: b.nextDue,
      daysUntil: d,
      amount: b.amount,
      message,
    });
  });
  return out;
},

// summary() — Reminder Summary API, satu pintu masuk (dikonsumsi
// LifeDashboardSummaryAPI/PriorityEngine, sesi ini juga) — pola SAMA
// PERSIS PiutangUtangReminder.summary()/VehicleReminder.summary().
summary() {
  const all = this.billReminders();
  return {
    total: all.length,
    overdueCount: all.filter((r) => r.severity === 'overdue').length,
    dueSoonCount: all.filter((r) => r.severity === 'due-soon').length,
    all,
  };
},

};
