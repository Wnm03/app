// modules/finance/cashflow-projection-presenter.js — Cash Flow Projection
// Presenter (Sesi 93, Batch 10). Target sesi: Cash Flow Projection
// Foundation — lihat docs/BATCH_PLAN.md § Batch 10.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// CashFlowProjectionAPI.summary() (modules/finance/
// cashflow-projection-api.js, sesi ini — sendiri 100% reuse
// FinancialForecastAPI.summary(), Sesi 91) — TIDAK ada rumus baru, TIDAK
// menghitung ulang rata-rata income/expense atau proyeksi saldo, TIDAK
// membaca D/FinancialForecastAPI langsung. Pola SAMA PERSIS
// FinancialForecastPresenter.render() (Sesi 91 — 3 kartu, container
// `findash-grid` generik yang sama).
//
// Dipanggil dari DashboardHub.render() (pola "tambahan murni" sama persis
// FinancialForecastPresenter.render()/BudgetRecommendationPresenter.render()
// — lihat komentar di dashboard-hub.js) & dari live-wiring
// renderDashboard() (modules/shared/modules-render.js), TIDAK ada
// mekanisme render baru. CSS TIDAK baru — reuse penuh class
// findash-grid/findash-card (grid generik, sudah dipakai
// FinanceDashboard/FinancialForecastPresenter/BudgetRecommendationPresenter/
// VehicleDashboard/dst).
//
// CASHFLOWPROJ_NAV_TARGETS (S254B — Batch Finance Navigation
// Consistency) — tujuan navigasi tiap kartu #cashflowProjGrid. MURNI
// DATA (0 logic navigasi baru), format {page,goTo} SAMA PERSIS format
// target dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js).
// Nama disendirikan per-file supaya tidak bentrok dgn const global lain
// (lihat kasus S251/S253/S254A). Ketiga kartu murni komposit 1 proyeksi
// arus kas yang sama — TIDAK ada 1 daftar spesifik per pos, jadi target
// = container section-nya sendiri (cashflowProjWrap, dashboard-hub,
// TERVERIFIKASI ADA di index.html/app_production.html), pola sama
// persis FINHEALTH_NAV_TARGETS.self (S254A, self-scroll utk kartu
// komposit).
// S95 (lanjutan Sesi 93): 3 target navigasi TERPISAH per kartu (dulu
// ketiganya cuma self-scroll ke cashflowProjWrap) -- income/expense pindah
// ke tab Kelola > sub-tab Transaksi lalu diberi filter `#kfTipe` (lihat
// `_goToTipeTx()` di bawah, reuse `resetTxPageAndRender()`/`kfTipe` yang
// sudah ada, filter-laporan.js -- 0 filter baru), bills pindah ke tab
// Tagihan (`setKeuanganTab('tagihan')` SUDAH memanggil `renderBillList()`,
// tx-list-cashflow.js, jadi cukup navigasi tab, 0 action tambahan).
const CASHFLOWPROJ_NAV_TARGETS = Object.freeze({
  income: { page: 'keuangan', tab: 'kelola', subtab: 'transaksi', goTo: 'kelolaTab-transaksi', action: 'CashFlowProjectionPresenter._goToIncomeTx' },
  expense: { page: 'keuangan', tab: 'kelola', subtab: 'transaksi', goTo: 'kelolaTab-transaksi', action: 'CashFlowProjectionPresenter._goToExpenseTx' },
  bills: { page: 'keuangan', tab: 'tagihan', goTo: 'billList' },
});
const CashFlowProjectionPresenter = {

  // _goToIncomeTx()/_goToExpenseTx() -- dipanggil via dashHubNavigateToFeature's
  // `target.action` (window[X][method](), 0 argumen) SETELAH tab/scroll
  // selesai. Set `#kfTipe` lalu reuse `resetTxPageAndRender()` (filter-laporan.js)
  // apa adanya -- 0 filter/logic baru.
  _goToIncomeTx() { CashFlowProjectionPresenter._setKfTipe('income'); },
  _goToExpenseTx() { CashFlowProjectionPresenter._setKfTipe('expense'); },
  _setKfTipe(tipe) {
    const el = document.getElementById('kfTipe');
    if (el) el.value = tipe;
    if (typeof resetTxPageAndRender === 'function') resetTxPageAndRender();
  },

  render() {
    const el = document.getElementById('cashflowProjGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    this._renderSettingsToggle(el);

    if (typeof CashFlowProjectionAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data proyeksi arus kas belum tersedia</div></div>';
      return;
    }

    const s = CashFlowProjectionAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data proyeksi arus kas belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._incomeCard(s.income),
      this._expenseCard(s.expense),
      this._cashBalanceCard(s.cashBalance),
    ];

    // S254B (Batch Finance Navigation Consistency): SELURUH kartu
    // clickable lewat mekanisme SAMA PERSIS FinanceDashboard.render()/
    // FinancialHealthScorePresenter.render() (S254A) — tiap kartu carry
    // field onClick:{action,args} sendiri (ditempel di masing2 _xxxCard()
    // di bawah), template di sini CUMA mengecek `c.onClick` (0 logic
    // navigasi baru, 0 percabangan per-index, JANGAN openCard(index)).
    el.innerHTML = cards.map((c) => `
      <div class="findash-card${c.onClick ? ' u-pointer' : ''}"${c.onClick ? ` data-action="${escapeHtml(c.onClick.action)}" data-args="${escapeHtml(JSON.stringify(c.onClick.args))}"` : ''}>
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  // _incomeCard(f) — f = CashFlowProjectionAPI.summary().income, dipakai
  // APA ADANYA (avgMonthly/months/currentMonthIncome — 0 recompute).
  _incomeCard(f) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [CASHFLOWPROJ_NAV_TARGETS.income] };
    if (!f || !f.ok) {
      return { icon: '💰', label: 'Proyeksi Pemasukan', value: '—', cls: '', sub: f && f.reason, onClick };
    }
    return {
      icon: '💰',
      label: 'Proyeksi Pemasukan',
      value: money(f.avgMonthly) + '/bln',
      cls: 'green',
      sub: `Rata-rata ${f.months} bulan terakhir · bulan ini ${money(f.currentMonthIncome)}`,
      onClick,
    };
  },

  // _expenseCard(f) — f = CashFlowProjectionAPI.summary().expense, dipakai
  // APA ADANYA (avgMonthly/months/currentMonthExpense — 0 recompute).
  _expenseCard(f) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [CASHFLOWPROJ_NAV_TARGETS.expense] };
    if (!f || !f.ok) {
      return { icon: '💸', label: 'Proyeksi Pengeluaran', value: '—', cls: '', sub: f && f.reason, onClick };
    }
    return {
      icon: '💸',
      label: 'Proyeksi Pengeluaran',
      value: money(f.avgMonthly) + '/bln',
      cls: 'red',
      sub: `Rata-rata ${f.months} bulan terakhir · bulan ini ${money(f.currentMonthExpense)}`,
      onClick,
    };
  },

  // _cashBalanceCard(f) — f = CashFlowProjectionAPI.summary().cashBalance,
  // dipakai APA ADANYA (saldoNow/projected/billsDue/upcomingCount — 0
  // recompute, `projected` sudah final dari computeCashflowForecast()).
  _cashBalanceCard(f) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [CASHFLOWPROJ_NAV_TARGETS.bills] };
    if (!f || !f.ok) {
      return { icon: '🏦', label: 'Proyeksi Saldo Kas', value: '—', cls: '', sub: f && f.reason, onClick };
    }
    const projected = f.projected;
    return {
      icon: '🏦',
      label: 'Proyeksi Saldo Kas',
      value: (projected < 0 ? '-' : '') + money(Math.abs(projected)),
      cls: projected < 0 ? 'red' : 'green',
      sub: `Saldo sekarang ${money(f.saldoNow)} · ${f.upcomingCount} tagihan jatuh tempo (${money(f.billsDue)})`,
      onClick,
    };
  },

  // ------------------------------------------------------------------
  // S95: panel inline "⚙️ Atur" (CashflowProjSettings — file terpisah
  // cashflow-projection-settings.js). Toggle & panel dirender sebagai
  // SIBLING dari #cashflowProjGrid (bukan child-nya) supaya tidak ikut
  // jadi grid-item CSS grid `findash-grid` (0 CSS baru, murni reuse
  // fg/fl/fs/fi/chip-btn/btn/btn-primary/u-fwrap/u-gap6/u-gap8/u-dnone
  // yang SUDAH ADA -- lihat keuFilterPanel di index.html, pola sama).
  // ------------------------------------------------------------------
  _renderSettingsToggle(gridEl) {
    const wrap = gridEl.parentElement;
    if (!wrap) return;
    let toggle = document.getElementById('cashflowProjSettingsToggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'cashflowProjSettingsToggle';
      toggle.className = 'chip-btn u-mb8';
      toggle.setAttribute('data-action', 'CashFlowProjectionPresenter.toggleSettings');
      wrap.insertBefore(toggle, gridEl);
    }
    const customized = (typeof CashflowProjSettings !== 'undefined') && CashflowProjSettings.isCustomized();
    toggle.textContent = customized ? '⚙️ Atur (aktif)' : '⚙️ Atur';
    if (!document.getElementById('cashflowProjSettingsPanel')) {
      const panel = document.createElement('div');
      panel.id = 'cashflowProjSettingsPanel';
      panel.className = 'u-dnone u-mb10 u-r10';
      panel.style.padding = '10px';
      panel.style.background = 'var(--surface3)';
      wrap.insertBefore(panel, gridEl);
    }
  },

  // toggleSettings() -- buka/tutup panel, isi ulang kontennya SETIAP dibuka
  // (supaya tidak stale kalau setting berubah dari tempat lain, mis. reset
  // filter). data-action="CashFlowProjectionPresenter.toggleSettings".
  toggleSettings() {
    const panel = document.getElementById('cashflowProjSettingsPanel');
    if (!panel) return;
    const opening = panel.classList.contains('u-dnone');
    if (opening) CashFlowProjectionPresenter._fillSettingsPanel(panel);
    panel.classList.toggle('u-dnone', !opening);
  },

  _fillSettingsPanel(panel) {
    if (typeof CashflowProjSettings === 'undefined') {
      panel.innerHTML = '<div class="empty-text">Pengaturan belum tersedia</div>';
      return;
    }
    const s = CashflowProjSettings.get();
    const escape = (typeof escapeHtml === 'function') ? escapeHtml : (x) => x;
    const accOpts = (typeof D !== 'undefined' && Array.isArray(D.accounts))
      ? D.accounts.map((a) => `<option value="${a.id}"${s.accountId === a.id ? ' selected' : ''}>${a.emoji || ''} ${escape(a.name)}</option>`).join('')
      : '';
    const monthsOpts = [3, 6, 12].map((m) => `<option value="${m}"${s.months === m ? ' selected' : ''}>${m} bulan</option>`).join('');
    const modeBtn = (mode, label) => `<button class="chip-btn${s.billWindowMode === mode ? ' active' : ''}" data-action="CashFlowProjectionPresenter._setBillWindowMode" data-args='["${mode}"]'>${label}</button>`;
    panel.innerHTML = `
      <div class="fg u-mb8"><label class="fl">Rentang Bulan (rata-rata)</label>
        <select class="fs" id="cfpMonths" onchange="CashFlowProjectionPresenter._onMonthsChange()">
          <option value=""${!s.months ? ' selected' : ''}>Otomatis</option>
          ${monthsOpts}
        </select>
      </div>
      <div class="fg u-mb8"><label class="fl">Filter Akun</label>
        <select class="fs" id="cfpAcc" onchange="CashFlowProjectionPresenter._onAccChange()">
          <option value="semua"${s.accountId === 'semua' ? ' selected' : ''}>Semua Akun</option>
          ${accOpts}
        </select>
      </div>
      <div class="fg u-mb8"><label class="fl">Mode Jendela Tagihan</label>
        <div class="u-flex u-fwrap u-gap6">
          ${modeBtn('30hari', '30 Hari')}
          ${modeBtn('kalender', 'Kalender Bulan Ini')}
          ${modeBtn('siklus', 'Siklus Custom')}
        </div>
      </div>
      <div class="fg u-mb8${s.billWindowMode === 'siklus' ? '' : ' u-dnone'}" id="cfpCycleWrap">
        <label class="fl">Tanggal Mulai Siklus</label>
        <input type="number" class="fi" id="cfpCycleDay" min="1" max="28" value="${s.cycleStartDay}" onchange="CashFlowProjectionPresenter._onCycleDayChange()">
      </div>
      <div class="u-flex u-gap8">
        <button class="btn btn-primary" data-action="CashFlowProjectionPresenter.resetSettings">↺ Reset ke Default</button>
      </div>
    `;
  },

  // _on*Change()/_setBillWindowMode() -- tiap kontrol LANGSUNG memanggil
  // CashflowProjSettings.set() (0 tombol "Simpan" terpisah, konsisten
  // dgn pola onchange="resetTxPageAndRender()" di keuFilterPanel yang
  // sudah ada) lalu re-render kartu + panel supaya angka & badge "(aktif)"
  // langsung update.
  _onMonthsChange() {
    const el = document.getElementById('cfpMonths');
    const v = el && el.value ? parseInt(el.value, 10) : null;
    CashFlowProjectionPresenter._applySettings({ months: v });
  },
  _onAccChange() {
    const el = document.getElementById('cfpAcc');
    CashFlowProjectionPresenter._applySettings({ accountId: el ? el.value : 'semua' });
  },
  _onCycleDayChange() {
    const el = document.getElementById('cfpCycleDay');
    const v = el ? parseInt(el.value, 10) : 16;
    CashFlowProjectionPresenter._applySettings({ cycleStartDay: (Number.isFinite(v) && v >= 1 && v <= 28) ? v : 16 });
  },
  _setBillWindowMode(mode) {
    CashFlowProjectionPresenter._applySettings({ billWindowMode: mode });
  },
  resetSettings() {
    if (typeof CashflowProjSettings !== 'undefined') CashflowProjSettings.reset();
    CashFlowProjectionPresenter.render();
    const panel = document.getElementById('cashflowProjSettingsPanel');
    if (panel && !panel.classList.contains('u-dnone')) CashFlowProjectionPresenter._fillSettingsPanel(panel);
    // S667B: kartu "💰 Proyeksi Kas Bulan Ini" (dashCashProjCard, modules-render.js) SEKARANG
    // ikut baca CashflowProjSettings yang SAMA (billWindowMode/cycleStartDay) -- refresh 2
    // arah spy tidak stale kalau user ubah dari panel SATUNYA. Guard typeof (aman kalau kartu
    // itu tidak ada di halaman/belum dimuat).
    if (typeof _renderCashProjectionCard === 'function') _renderCashProjectionCard();
    if (typeof toast === 'function') toast('↺ Pengaturan proyeksi arus kas direset');
  },
  _applySettings(partial) {
    if (typeof CashflowProjSettings === 'undefined') return;
    CashflowProjSettings.set(partial);
    CashFlowProjectionPresenter.render();
    const panel = document.getElementById('cashflowProjSettingsPanel');
    if (panel && !panel.classList.contains('u-dnone')) CashFlowProjectionPresenter._fillSettingsPanel(panel);
    // S667B: lihat komentar resetSettings() di atas -- refresh 2 arah dgn dashCashProjCard.
    if (typeof _renderCashProjectionCard === 'function') _renderCashProjectionCard();
  },

};
// window-expose WAJIB (verify-window-expose.js, bug class s345-s348) --
// panel "⚙️ Atur" di atas pakai data-action="CashFlowProjectionPresenter.xxx"
// langsung (toggleSettings/resetSettings/_setBillWindowMode/dst), beda
// dari kartu (yang lewat dashHubNavigateToFeature -> target.action ->
// _dashHubCallAction(), SAMA-SAMA butuh window[X] utk resolve).
window.CashFlowProjectionPresenter = CashFlowProjectionPresenter;
