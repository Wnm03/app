// modules/finance/piutang-utang-reminder.js — Piutang/Utang Reminder
// Foundation (sesi lanjutan Fix #3 DASHBOARD-DEDUP.md, "Poin 1": perluasan
// cakupan saran Dashboard Hub). Lihat DESIGN-LOCK-PERLUASAN-SARAN-DASHBOARD.md
// utk audit kesiapan tiap modul & keputusan scope sesi ini (Piutang/Utang
// dulu, Tagihan/Dana Titipan/Zakat menyusul sesi terpisah).
//
// PRINSIP (RULE #1, pola SAMA PERSIS modules/vehicle/vehicle-reminder.js):
// 100% REUSE sebisa mungkin, TIDAK ada framework/state baru, TIDAK
// mengubah struktur data D. Sumber data dipakai apa adanya:
//   - D.piutang / D.debts    (mentah — field `jatuhTempo`, `lunas`)
//   - daysUntilDate()        (modules/vehicle/vehicle-core.js — generic
//                             day-diff helper, TIDAK spesifik kendaraan,
//                             dipakai apa adanya, guard typeof)
//
// Ambang "due-soon" (≤7 hari) & "overdue" (<0 hari) adalah SATU-SATUNYA
// logic genuinely baru di file ini (belum ada presedennya utk piutang/
// utang sebelum sesi ini — beda dari VehicleReminder yang ambangnya semua
// reuse dari layer di bawah). 7 hari dipilih (bukan 30 hari seperti pajak
// kendaraan) karena siklus piutang/utang pribadi biasanya lebih pendek —
// dikonfirmasi eksplisit oleh user sebelum implementasi (lihat Design
// Lock, "Pertanyaan terbuka" #1).
//
// Entry TANPA `jatuhTempo` diisi ATAU sudah `lunas` — dikecualikan TOTAL
// dari reminder (TIDAK dianggap overdue), dikonfirmasi eksplisit user
// (Design Lock, "Pertanyaan terbuka" #3).
//
// TIDAK ada UI/panel/dashboard card baru di file ini, TIDAK ada wiring ke
// reminder-notif.js — murni fondasi data, dikonsumsi PriorityEngine
// (modules/cross/priority-engine.js) lewat LifeDashboardSummaryAPI, sesi
// ini juga. Semua fungsi di bawah PURE — tidak pernah memanggil save()
// atau menulis ke D/localStorage, tidak menyentuh DOM.
const PiutangUtangReminder = {

// _daysUntil(dateStr) — helper internal: reuse daysUntilDate() (vehicle-
// core.js) apa adanya lewat guard typeof, pola sama VehicleReminder yang
// juga guard tiap helper cross-modul yang dipakainya. null kalau helper
// belum dimuat ATAU dateStr kosong (daysUntilDate() sendiri sudah
// menghasilkan null utk dateStr kosong).
_daysUntil(dateStr) {
  if (typeof daysUntilDate !== 'function') return null;
  return daysUntilDate(dateStr);
},

// receivableReminders() — reminder piutang jatuh tempo dari D.piutang.
// Entry `lunas` ATAU tanpa `jatuhTempo` dikecualikan total (lihat catatan
// header). severity 'overdue' kalau sudah lewat tanggal, 'due-soon' kalau
// sisa ≤7 hari (termasuk hari ini) — entry dengan sisa >7 hari TIDAK
// dijadikan reminder (belum perlu diingatkan).
receivableReminders() {
  const out = [];
  const list = (typeof D !== 'undefined' && Array.isArray(D.piutang)) ? D.piutang : [];
  list.forEach((p) => {
    if (p.lunas || !p.jatuhTempo) return;
    const d = this._daysUntil(p.jatuhTempo);
    if (d === null || d > 7) return;
    const severity = d < 0 ? 'overdue' : 'due-soon';
    const message = severity === 'overdue'
      ? `Piutang "${p.name}" sudah lewat jatuh tempo (${Math.abs(d)} hari lewat).`
      : `Piutang "${p.name}" segera jatuh tempo (${d === 0 ? 'hari ini' : `H-${d} hari`}).`;
    out.push({
      type: 'receivable',
      id: p.id,
      name: p.name,
      severity,
      jatuhTempo: p.jatuhTempo,
      daysUntil: d,
      amount: p.amount,
      message,
    });
  });
  return out;
},

// debtReminders() — sama persis receivableReminders(), sumber D.debts.
debtReminders() {
  const out = [];
  const list = (typeof D !== 'undefined' && Array.isArray(D.debts)) ? D.debts : [];
  list.forEach((dbt) => {
    if (dbt.lunas || !dbt.jatuhTempo) return;
    const d = this._daysUntil(dbt.jatuhTempo);
    if (d === null || d > 7) return;
    const severity = d < 0 ? 'overdue' : 'due-soon';
    const message = severity === 'overdue'
      ? `Utang "${dbt.name}" sudah lewat jatuh tempo (${Math.abs(d)} hari lewat).`
      : `Utang "${dbt.name}" segera jatuh tempo (${d === 0 ? 'hari ini' : `H-${d} hari`}).`;
    out.push({
      type: 'debt',
      id: dbt.id,
      name: dbt.name,
      severity,
      jatuhTempo: dbt.jatuhTempo,
      daysUntil: d,
      amount: dbt.amount,
      message,
    });
  });
  return out;
},

// summary() — Reminder Summary API, satu pintu masuk gabungan (dikonsumsi
// LifeDashboardSummaryAPI/PriorityEngine, sesi ini juga), murni memanggil
// 2 fungsi di atas & menggabungkan hasilnya, TIDAK ada logic tambahan —
// pola SAMA PERSIS VehicleReminder.summary().
summary() {
  const receivable = this.receivableReminders();
  const debt = this.debtReminders();
  const all = [...receivable, ...debt];
  return {
    total: all.length,
    overdueCount: all.filter((r) => r.severity === 'overdue').length,
    dueSoonCount: all.filter((r) => r.severity === 'due-soon').length,
    receivable,
    debt,
    all,
  };
},

};
