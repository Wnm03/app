// self-reward-engine.js — Domain Self Reward Engine: cek kelayakan self reward
// Dipindah ke modules/self-reward/self-reward-engine.js (Sesi 12 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// berdasarkan kondisi finansial (Budget, Cashflow, Dana Darurat, Target
// Investasi, Utang Macet, Tagihan). MODUL BARU — tidak mengubah API/modul
// yang sudah ada; hanya MEMBACA D.budgets/D.targets/D.debts/D.bills dan
// method global opsional (FI, Budget, getBillStats) lewat guard
// `typeof x!=='undefined'` (pola sama dgn FI.totalDebt/DebtStrategy.computeDSR
// di piutang-utang.js & modules-calc.js), supaya modul ini aman dimuat/dites
// berdiri sendiri tanpa harus semua modul lain ikut ter-load.
//
// Settings (Level Reward %) disimpan di D.selfReward (bukan localStorage),
// mengikuti pola D.finansialFreedom di modules-calc.js: field baru yang
// dibaca via `D.selfReward||{}` dgn default bawaan, jadi TIDAK perlu
// menyentuh literal default `D={...}` di features-helpers-global-security.js.
//
// Tidak ada DOM/render di file ini — kalau nanti mau ada UI (mis. modal
// hasil cek), taruh di file terpisah (pola sama dgn
// dashboard-hub-favorit.js vs dashboard-hub-favorit-view.js) supaya logika
// murni ini tetap gampang dites lewat loadSource().

const SelfRewardDefaults = {
  level1Pct: 2,
  level2Pct: 5,
  level3Pct: 10,
  // Toleransi hari sebelum utang/tagihan telat dianggap "macet"/belum
  // dibayar. Default 0 = SETIAP kali lewat jatuh tempo langsung dianggap
  // belum beres (paling konservatif, sesuai rule default di spesifikasi).
  graceDaysUtang: 0,
  graceDaysTagihan: 0,
};

const SelfReward = {
  DEFAULTS: SelfRewardDefaults,

  getSettings() {
    const s = D.selfReward || {};
    return {
      level1Pct: isFinite(s.level1Pct) && s.level1Pct >= 0 ? s.level1Pct : SelfRewardDefaults.level1Pct,
      level2Pct: isFinite(s.level2Pct) && s.level2Pct >= 0 ? s.level2Pct : SelfRewardDefaults.level2Pct,
      level3Pct: isFinite(s.level3Pct) && s.level3Pct >= 0 ? s.level3Pct : SelfRewardDefaults.level3Pct,
      graceDaysUtang: isFinite(s.graceDaysUtang) && s.graceDaysUtang >= 0 ? s.graceDaysUtang : SelfRewardDefaults.graceDaysUtang,
      graceDaysTagihan: isFinite(s.graceDaysTagihan) && s.graceDaysTagihan >= 0 ? s.graceDaysTagihan : SelfRewardDefaults.graceDaysTagihan,
    };
  },

  // partial: object berisi sebagian/semua field di SelfRewardDefaults.
  saveSettings(partial) {
    const current = SelfReward.getSettings();
    D.selfReward = { ...current, ...(partial || {}) };
    save();
    return D.selfReward;
  },

  // ---------- Cek per-kondisi (masing-masing berdiri sendiri, gampang dites) ----------

  // 1) Budget aman (tidak ada anggaran yang over budget bulan berjalan).
  checkBudgetAman() {
    if (typeof Budget === 'undefined' || !D.budgets || !D.budgets.length) {
      return { ok: true, overBudgetList: [] };
    }
    const overBudgetList = D.budgets
      .map((b) => {
        const limit = Budget.getEffectiveLimit(b);
        const used = Budget.getUsed(b);
        return { name: b.name, limit, used };
      })
      .filter((x) => x.limit > 0 && x.used > x.limit);
    return { ok: overBudgetList.length === 0, overBudgetList };
  },

  // 2) Cashflow positif (rata-rata pemasukan - pengeluaran bulanan > 0).
  checkCashflowPositif() {
    const surplus = typeof FI !== 'undefined' ? FI.monthlySurplus() : 0;
    return { ok: surplus > 0, surplus };
  },

  // 3) Dana darurat mencapai target (target yang ditandai isDanaDarurat).
  checkDanaDarurat() {
    const t = (D.targets || []).find((x) => x.isDanaDarurat);
    if (!t) return { ok: false, hasTarget: false, pct: null };
    const pct = t.amount > 0 ? Math.round((t.saved / t.amount) * 100) : 0;
    return { ok: t.amount > 0 && t.saved >= t.amount, hasTarget: true, pct, target: t };
  },

  // 4) Target investasi tercapai (semua Target selain Dana Darurat yang
  // punya nominal > 0). Kalau belum punya Target investasi sama sekali,
  // dianggap TIDAK menghalangi (tidak ada yang bisa dicek) — dokumentasikan
  // asumsi ini kalau perilaku ini perlu diubah nanti.
  checkTargetInvestasi() {
    const list = (D.targets || []).filter((x) => !x.isDanaDarurat && (x.amount || 0) > 0);
    const detail = list.map((t) => ({
      name: t.name,
      pct: Math.round((t.saved / t.amount) * 100),
      done: t.saved >= t.amount,
    }));
    const notDone = detail.filter((x) => !x.done);
    return { ok: notDone.length === 0, targets: detail, notDone };
  },

  // 5) Tidak ada utang macet (utang belum lunas & sudah lewat jatuh tempo
  // lebih dari graceDaysUtang hari).
  checkUtangMacet() {
    const { graceDaysUtang } = SelfReward.getSettings();
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date(todayStr + 'T00:00:00');
    const macetList = (D.debts || [])
      .filter((d) => !d.lunas && d.jatuhTempo)
      .map((d) => {
        const jt = new Date(d.jatuhTempo + 'T00:00:00');
        const daysOverdue = Math.round((today - jt) / (1000 * 60 * 60 * 24));
        return { name: d.name, daysOverdue };
      })
      .filter((x) => x.daysOverdue > graceDaysUtang);
    return { ok: macetList.length === 0, macetList };
  },

  // 6) Seluruh tagihan sudah dibayar (tidak ada tagihan/cicilan di D.bills
  // yang nextDue-nya sudah lewat lebih dari graceDaysTagihan hari). Pakai
  // getBillStats() global kalau tersedia (satu sumber kebenaran yang sama
  // dgn Kalender Tagihan) supaya tidak dobel logika; fallback hitung
  // manual kalau modul itu belum dimuat (mis. saat dites berdiri sendiri).
  checkTagihanLunas() {
    const { graceDaysTagihan } = SelfReward.getSettings();
    if (graceDaysTagihan === 0 && typeof getBillStats === 'function') {
      const stats = getBillStats();
      return { ok: (stats.overdueCount || 0) === 0, overdueCount: stats.overdueCount || 0 };
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date(todayStr + 'T00:00:00');
    const overdueList = (D.bills || [])
      .map((b) => {
        const due = new Date(b.nextDue + 'T00:00:00');
        const daysOverdue = Math.round((today - due) / (1000 * 60 * 60 * 24));
        return { name: b.name, daysOverdue };
      })
      .filter((x) => x.daysOverdue > graceDaysTagihan);
    return { ok: overdueList.length === 0, overdueCount: overdueList.length, overdueList };
  },

  // ---------- Skor kekuatan finansial (dipakai HANYA utk menentukan Level
  // Reward saat status Eligible; tidak memengaruhi Eligible/Not Eligible). ----------
  // Skor 0-150 per komponen (100 = pas mencapai syarat minimum, di atas 100
  // = surplus/melebihi target), lalu dirata-rata. Ini heuristik sederhana &
  // sengaja transparan (bukan cuma pass/fail) supaya "Level Reward" bisa
  // membedakan pengguna yang baru PAS memenuhi syarat vs yang jauh lebih
  // sehat keuangannya.
  computeStrengthScore(cashflowResult, danaDaruratResult, targetInvestasiResult) {
    const cap = (v) => Math.max(0, Math.min(150, v));
    const ddScore = danaDaruratResult.pct != null ? cap(danaDaruratResult.pct) : 100;
    const investList = targetInvestasiResult.targets || [];
    const investScore = investList.length
      ? cap(investList.reduce((s, t) => s + t.pct, 0) / investList.length)
      : 100;
    let surplusScore = 100;
    if (typeof FI !== 'undefined') {
      const avgMonthlyExpense = FI.annualExpense() / 12;
      surplusScore = avgMonthlyExpense > 0
        ? cap((cashflowResult.surplus / avgMonthlyExpense) * 100)
        : 100;
    }
    return (ddScore + investScore + surplusScore) / 3;
  },

  levelFromScore(score) {
    if (score >= 130) return 3;
    if (score >= 100) return 2;
    return 1;
  },

  maxRewardForLevel(level, surplus) {
    const settings = SelfReward.getSettings();
    const pct = level === 3 ? settings.level3Pct : level === 2 ? settings.level2Pct : settings.level1Pct;
    return Math.max(0, Math.round(surplus * (pct / 100)));
  },

  // ---------- Evaluasi utama ----------
  // Mengembalikan:
  //   Eligible:      {eligible:true, reasons:[...], rewardLevel, maxReward}
  //   Not Eligible:  {eligible:false, reasons:[...], priorities:[...]}
  evaluate() {
    const budgetAman = SelfReward.checkBudgetAman();
    const cashflow = SelfReward.checkCashflowPositif();
    const danaDarurat = SelfReward.checkDanaDarurat();
    const targetInvestasi = SelfReward.checkTargetInvestasi();
    const utangMacet = SelfReward.checkUtangMacet();
    const tagihanLunas = SelfReward.checkTagihanLunas();

    const checks = [
      { key: 'budgetAman', label: 'Budget aman (tidak over budget)', result: budgetAman },
      { key: 'cashflowPositif', label: 'Cashflow positif', result: cashflow },
      { key: 'danaDarurat', label: 'Dana darurat mencapai target', result: danaDarurat },
      { key: 'targetInvestasi', label: 'Target investasi tercapai', result: targetInvestasi },
      { key: 'utangMacet', label: 'Tidak ada utang macet', result: utangMacet },
      { key: 'tagihanLunas', label: 'Seluruh tagihan sudah dibayar', result: tagihanLunas },
    ];

    const reasons = checks.map((c) => ({ key: c.key, label: c.label, ok: c.result.ok }));
    const eligible = checks.every((c) => c.result.ok);

    if (!eligible) {
      const priorities = checks.filter((c) => !c.result.ok).map((c) => c.label);
      return { eligible: false, reasons, priorities };
    }

    const score = SelfReward.computeStrengthScore(cashflow, danaDarurat, targetInvestasi);
    const rewardLevel = SelfReward.levelFromScore(score);
    const maxReward = SelfReward.maxRewardForLevel(rewardLevel, cashflow.surplus);

    return { eligible: true, reasons, rewardLevel, maxReward, surplus: cashflow.surplus, score };
  },
};

if (typeof window !== 'undefined') {
  window.SelfReward = SelfReward;
}
