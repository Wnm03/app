// dashboard-hub-overview.js — Pusat Pantau Beranda (tab Ringkasan Dashboard Hub).
//
// TUJUAN: Beranda harus INFORMATIF lintas domain. Sebelumnya tab Ringkasan hanya
// berisi "Ownership Summary" (hitungan entitas, bukan insight) sementara
// pemasukan/pengeluaran bulan ini disembunyikan CSS dan "Perlu Perhatian" cuma
// membaca tagihan/servis/backup. File ini MURNI PRESENTER (read-only, 0 rumus
// finansial baru, 0 penulisan data): semua angka dibaca dari API yang sudah
// final — PriorityEngine, FinanceIntelligence, FinancialHealthScoreAPI,
// AssetPortfolioAPI, getBillStats, VehicleReminder, ShopBusinessEnginePresenter,
// ZakatReminder. Setiap pembacaan di-guard typeof + try/catch: satu domain gagal
// tidak menjatuhkan domain lain.
//
// Dua blok:
//   1. Pusat Perhatian  — PriorityEngine.getItems() dikelompokkan PER DOMAIN
//      (bukan 20 baris datar), plus status backup. Tiap grup: jumlah, pesan
//      terparah, tombol buka domain.
//   2. Pantau Domain    — kartu ringkas: Arus Kas, Kekayaan Bersih, Tagihan,
//      Kesehatan Finansial, Kendaraan, Shop, Zakat. Domain tanpa data
//      disembunyikan (bukan menampilkan "0" yang tidak informatif).

const DASHHUB_OVERVIEW_DOMAINS = {
  tagihan:      { label: 'Tagihan & Cicilan', icon: '🧾', target: { page: 'keuangan', tab: 'tagihan' } },
  piutangUtang: { label: 'Utang & Piutang',   icon: '🤝', target: { page: 'keuangan', tab: 'utangpiutang' } },
  finance:      { label: 'Anggaran',          icon: '🎯', target: { page: 'keuangan', tab: 'budget' } },
  vehicle:      { label: 'Kendaraan',         icon: '🏍️', target: { page: 'carnotes', tab: 'insight' } },
  shopRestock:  { label: 'Stok Shop',         icon: '📦', target: { page: 'shop', tab: 'etalase' } },
  danaTitipan:  { label: 'Dana Titipan',      icon: '💼', target: { page: 'keuangan', tab: 'laporan', subtab: 'titipan' } },
  financialRisk:{ label: 'Risiko Keuangan',   icon: '🩺', target: { page: 'keuangan', tab: 'laporan', subtab: 'ringkasan' } },
  zakat:        { label: 'Zakat',             icon: '🕌', target: { page: 'pajak', tab: 'zakat' } },
};
// Urutan tampil grup = urutan kepentingan operasional (jatuh tempo dulu, lalu risiko).
const DASHHUB_OVERVIEW_ORDER = ['tagihan', 'piutangUtang', 'finance', 'vehicle', 'shopRestock', 'danaTitipan', 'zakat', 'financialRisk'];
const DASHHUB_OVERVIEW_SEV_RANK = { overdue: 0, over: 0, 'due-soon': 1, warning: 2 };

function _dhoEsc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s); }
function _dhoMoney(n) { return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(Math.abs(n || 0)).toLocaleString('id-ID')); }
function _dhoMoneySigned(n) { return (Number(n) < 0 ? '-' : '') + _dhoMoney(n); }
function _dhoTry(fn, fallback) { try { return fn(); } catch (e) { void e; return fallback; } }

// Akun baru (belum ada data) tidak boleh dibanjiri peringatan semu: skor kesehatan 33/100 atau
// "10 servis segera" dari kendaraan default tanpa riwayat KM bukan insight, hanya noise.
function _dhoHasFinanceData() { return typeof D !== 'undefined' && Array.isArray(D.transactions) && D.transactions.length >= 3; }
function _dhoHasVehicleData() {
  if (typeof D === 'undefined') return false;
  return ['kmLogs', 'bbmLogs', 'servisLogs'].some((k) => Array.isArray(D[k]) && D[k].length > 0);
}

const DashboardHubOverview = {
  // Jumlah pemasukan/pengeluaran bulan tertentu — pola filter yang sama dengan
  // _dashHubMonthTxShared() (hitungKas === false dilewati). Bulan berjalan
  // memakai helper bersama itu supaya angkanya identik dengan Hero.
  _monthTx(offset) {
    if (offset === 0 && typeof _dashHubMonthTxShared === 'function') return _dashHubMonthTxShared();
    if (typeof D === 'undefined' || !Array.isArray(D.transactions)) return { inc: 0, exp: 0, count: 0 };
    const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() + (offset || 0));
    const m = ref.getMonth(), y = ref.getFullYear();
    let inc = 0, exp = 0, count = 0;
    for (const t of D.transactions) {
      if (!t || t.hitungKas === false) continue;
      const d = new Date(t.date);
      if (d.getMonth() !== m || d.getFullYear() !== y) continue;
      if (t.type === 'income') { inc += Number(t.amount) || 0; count++; }
      else if (t.type === 'expense') { exp += Number(t.amount) || 0; count++; }
    }
    return { inc, exp, count };
  },

  // ---------- 1. PUSAT PERHATIAN ----------
  // Mengembalikan [{key,label,icon,count,worst,message,target}] — satu entri per domain.
  attentionGroups() {
    const groups = [];
    const res = (typeof PriorityEngine !== 'undefined') ? _dhoTry(() => PriorityEngine.getItems(), null) : null;
    const items = (res && res.ok && Array.isArray(res.items)) ? res.items : [];
    const by = {};
    items.forEach((it) => { (by[it.kind] = by[it.kind] || []).push(it); });
    DASHHUB_OVERVIEW_ORDER.forEach((kind) => {
      const list = by[kind];
      if (!list || !list.length) return;
      if (kind === 'vehicle' && !_dhoHasVehicleData()) return;
      if (kind === 'financialRisk' && !_dhoHasFinanceData()) return;
      const meta = DASHHUB_OVERVIEW_DOMAINS[kind];
      const sorted = list.slice().sort((a, b) => (DASHHUB_OVERVIEW_SEV_RANK[a.severity] ?? 9) - (DASHHUB_OVERVIEW_SEV_RANK[b.severity] ?? 9));
      const top = sorted[0];
      const worst = (top.severity === 'overdue' || top.severity === 'over') ? 'danger' : (top.severity === 'due-soon' ? 'warn' : 'info');
      let message = top.message || '';
      if (kind === 'finance') message = list.length === 1 ? `Anggaran "${top.name}" melebihi limit bulan ini.` : `${list.length} anggaran melebihi limit bulan ini (mis. "${top.name}").`;
      // financialRisk: pesan anggaran sudah diwakili grup Anggaran → jangan dobel.
      let count = list.length;
      if (kind === 'financialRisk') {
        const own = list.filter((r) => r.domain !== 'cashflow_budget');
        if (!own.length) return;
        count = own.length; message = own[0].message;
      }
      groups.push({ key: kind, label: meta.label, icon: meta.icon, count, worst, message, target: meta.target });
    });
    // Backup terakhir gagal (sebelumnya satu-satunya sumber non-domain di kartu lama).
    const hist = (typeof D !== 'undefined' && Array.isArray(D.backupHistory)) ? D.backupHistory : [];
    if (hist[0] && hist[0].status !== 'success') {
      groups.push({ key: 'backup', label: 'Backup', icon: '💾', count: 1, worst: 'warn', message: 'Backup terakhir tidak berhasil: ' + hist[0].status, target: { action: 'openBackupModal' } });
    } else if (typeof D !== 'undefined' && D.lastBackup) {
      const days = Math.floor((Date.now() - new Date(D.lastBackup).getTime()) / 86400000);
      if (days >= 14) groups.push({ key: 'backup', label: 'Backup', icon: '💾', count: 1, worst: 'info', message: `Terakhir backup ${days} hari lalu.`, target: { action: 'openBackupModal' } });
    } else if (typeof D !== 'undefined' && !D.lastBackup && Array.isArray(D.transactions) && D.transactions.length >= 20) {
      groups.push({ key: 'backup', label: 'Backup', icon: '💾', count: 1, worst: 'info', message: 'Belum pernah backup padahal data sudah banyak.', target: { action: 'openBackupModal' } });
    }
    return groups;
  },

  renderAttention() {
    const wrap = document.getElementById('dashHubAttentionWrap');
    const el = document.getElementById('dashHubAttentionBody');
    if (!el) return;
    const groups = this.attentionGroups();
    const total = groups.reduce((s, g) => s + g.count, 0);
    const badge = document.getElementById('dashHubAttentionBadge');
    if (badge) { badge.textContent = total ? String(total) : ''; badge.style.display = total ? '' : 'none'; }
    if (!groups.length) {
      el.innerHTML = '<div class="dhb-ov-ok">✅ Semua domain aman — tidak ada tagihan jatuh tempo, anggaran jebol, servis, atau kewajiban zakat yang menunggu.</div>';
    } else {
      el.innerHTML = groups.map((g) => `
        <button type="button" class="dhb-ov-att dhb-ov-${g.worst}" data-action="DashboardHubOverview.go" data-args='${_dhoEsc(JSON.stringify([g.key]))}'>
          <span class="dhb-ov-att-ico">${g.icon}</span>
          <span class="dhb-ov-att-txt"><b>${_dhoEsc(g.label)}</b><span>${_dhoEsc(g.message)}</span></span>
          <span class="dhb-ov-att-n">${g.count}</span>
        </button>`).join('');
    }
    if (wrap) wrap.style.display = '';
  },

  go(key) {
    const meta = DASHHUB_OVERVIEW_DOMAINS[key];
    const target = key === 'backup' ? { action: 'openBackupModal' } : (meta && meta.target);
    if (target && typeof dashHubNavigateToFeature === 'function') dashHubNavigateToFeature(target);
  },

  goTarget(page, tab) {
    if (typeof dashHubNavigateToFeature === 'function') dashHubNavigateToFeature(tab ? { page, tab } : { page });
  },

  // ---------- 2. PANTAU DOMAIN ----------
  // Tiap builder mengembalikan {icon,title,main,mainCls,rows:[[label,value,cls]],hint,target} atau null (disembunyikan).
  tiles() {
    const tiles = [];
    const push = (t) => { if (t) tiles.push(t); };

    // Arus Kas bulan ini + tingkat tabungan + banding bulan lalu.
    push(_dhoTry(() => {
      const cur = this._monthTx(0), prev = this._monthTx(-1);
      if (!cur.count && !prev.count) return null;
      const net = cur.inc - cur.exp;
      const rate = cur.inc > 0 ? Math.round(net / cur.inc * 100) : null;
      const rows = [['Masuk', _dhoMoney(cur.inc), 'pos'], ['Keluar', _dhoMoney(cur.exp), 'neg']];
      if (rate !== null) rows.push(['Tingkat tabungan', rate + '%', rate >= 20 ? 'pos' : (rate < 0 ? 'neg' : '')]);
      if (prev.count) { const d = cur.exp - prev.exp; rows.push(['Pengeluaran vs bulan lalu', (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + _dhoMoney(d), d > 0 ? 'neg' : (d < 0 ? 'pos' : '')]); }
      let hint = '';
      if (cur.exp > cur.inc && cur.inc > 0) hint = 'Pengeluaran sudah melebihi pemasukan bulan ini.';
      else if (rate !== null && rate < 10 && rate >= 0) hint = 'Tingkat tabungan di bawah 10% — cek pos pengeluaran terbesar.';
      return { icon: '💰', title: 'Arus Kas Bulan Ini', main: _dhoMoneySigned(net), mainCls: net < 0 ? 'neg' : 'pos', mainSub: 'bersih', rows, hint, target: { page: 'keuangan', tab: 'laporan', subtab: 'aruskas' } };
    }, null));

    // Kekayaan bersih & komposisi.
    push(_dhoTry(() => {
      if (typeof AssetPortfolioAPI === 'undefined') return null;
      const s = AssetPortfolioAPI.summary();
      if (!s || !s.ok || !s.netWorth || !s.netWorth.ok) return null;
      if (!s.composition || !s.composition.ok || !s.composition.totalValue) return null;
      const c = (s.composition && s.composition.ok) ? s.composition : null;
      const rows = [];
      if (c) { rows.push(['Kas & akun', _dhoMoney(c.cashValue)]); rows.push(['Aset fisik', _dhoMoney(c.assetValue)]); if (c.investmentValue) rows.push(['Investasi', _dhoMoney(c.investmentValue)]); }
      const debt = (s.netWorth.portfolioValue || 0) - (s.netWorth.netWorth || 0);
      if (debt > 0) rows.push(['Kewajiban/utang', _dhoMoney(debt), 'neg']);
      let hint = '';
      const top = s.allocation && s.allocation.ok && Array.isArray(s.allocation.breakdown) ? s.allocation.breakdown.slice().sort((a, b) => b.pct - a.pct)[0] : null;
      if (top && top.pct >= 70) hint = `${Math.round(top.pct)}% kekayaan ada di "${top.category}" — pertimbangkan diversifikasi.`;
      return { icon: '🏛️', title: 'Kekayaan Bersih', main: _dhoMoneySigned(s.netWorth.netWorth), mainCls: s.netWorth.netWorth < 0 ? 'neg' : '', rows, hint, target: { page: 'aset', tab: 'ringkasan' } };
    }, null));

    // Tagihan & cicilan.
    push(_dhoTry(() => {
      if (typeof getBillStats !== 'function' || typeof D === 'undefined' || !Array.isArray(D.bills) || !D.bills.length) return null;
      const b = getBillStats();
      const rows = [['Total bulan ini', _dhoMoney(b.monthTotal)]];
      if (b.overdueCount) rows.push(['Lewat jatuh tempo', b.overdueCount + ' tagihan', 'neg']);
      if (b.soonCount) rows.push(['Jatuh tempo ≤7 hari', b.soonCount + ' tagihan', 'warn']);
      if (b.outstanding) rows.push(['Sisa cicilan', _dhoMoney(b.outstanding)]);
      const nx = (b.nearest || []).find((x) => x.diff >= 0);
      const hint = nx ? `Terdekat: ${nx.b.name} (${nx.diff === 0 ? 'hari ini' : 'H-' + nx.diff}) ${_dhoMoney(nx.b.amount)}` : '';
      return { icon: '🧾', title: 'Tagihan & Cicilan', main: _dhoMoney(b.monthTotal), mainSub: 'bulan ini', mainCls: b.overdueCount ? 'neg' : '', rows, hint, target: { page: 'keuangan', tab: 'tagihan' } };
    }, null));

    // Anggaran.
    push(_dhoTry(() => {
      if (typeof FinanceIntelligence === 'undefined') return null;
      const bs = FinanceIntelligence.budgetSummary();
      if (!bs || !bs.ok || !bs.items.length) return null;
      const pct = Math.round(bs.overallPct * 100);
      const worst = bs.items.filter((x) => x.limit > 0).sort((a, b) => b.pct - a.pct).slice(0, 2);
      const rows = [['Terpakai', _dhoMoney(bs.totalUsed) + ' / ' + _dhoMoney(bs.totalLimit)], ['Sisa', _dhoMoneySigned(bs.totalSisa), bs.totalSisa < 0 ? 'neg' : 'pos']];
      worst.forEach((w) => rows.push([w.name, Math.round(w.pct * 100) + '%', w.over ? 'neg' : (w.pct >= 0.8 ? 'warn' : '')]));
      return { icon: '🎯', title: 'Anggaran', main: pct + '%', mainSub: 'terpakai', mainCls: bs.overCount ? 'neg' : (pct >= 80 ? 'warn' : 'pos'), rows, hint: bs.overCount ? `${bs.overCount} anggaran melebihi limit.` : '', target: { page: 'keuangan', tab: 'budget' } };
    }, null));

    // Kesehatan finansial.
    push(_dhoTry(() => {
      if (typeof FinancialHealthScoreAPI === 'undefined' || !_dhoHasFinanceData()) return null;
      const s = FinancialHealthScoreAPI.summary();
      if (!s || !s.ok) return null;
      const o = s.scoreOverview;
      const comps = (s.componentBreakdown && Array.isArray(s.componentBreakdown.items)) ? s.componentBreakdown.items : [];
      const rows = comps.slice(0, 4).map((c) => [c.label || c.key, Math.round((c.pct || 0) * 100) + '%', (c.pct || 0) < 0.5 ? 'warn' : 'pos']);
      const rec = (s.recommendation && s.recommendation[0]) ? (s.recommendation[0].message || s.recommendation[0].text || s.recommendation[0]) : '';
      return { icon: '🩺', title: 'Kesehatan Finansial', main: String(o.score), mainSub: '/100 · ' + o.label, mainCls: o.score >= 60 ? 'pos' : (o.score >= 40 ? 'warn' : 'neg'), rows, hint: typeof rec === 'string' ? rec : '', target: { page: 'keuangan', tab: 'laporan', subtab: 'ringkasan' } };
    }, null));

    // Kendaraan.
    push(_dhoTry(() => {
      if (typeof VehicleReminder === 'undefined' || typeof D === 'undefined' || !Array.isArray(D.vehicles) || !D.vehicles.length || !_dhoHasVehicleData()) return null;
      const s = VehicleReminder.summary();
      const rows = [];
      const cnt = (arr, sev) => arr.filter((r) => r.severity === sev).length;
      if (s.overdueCount) rows.push(['Terlewat', s.overdueCount + ' item', 'neg']);
      if (s.dueSoonCount) rows.push(['Segera', s.dueSoonCount + ' item', 'warn']);
      rows.push(['Servis', cnt(s.service, 'overdue') + ' terlewat · ' + cnt(s.service, 'due-soon') + ' segera']);
      rows.push(['Pajak/STNK', cnt(s.tax, 'overdue') + ' terlewat · ' + cnt(s.tax, 'due-soon') + ' segera']);
      const logs = (D.bbmLogs || []).filter((l) => l && l.liter > 0).slice(-6);
      if (logs.length >= 3) { const kms = logs.map((l) => Number(l.km)).filter((k) => k > 0); const lit = logs.slice(1).reduce((a, l) => a + Number(l.liter), 0); if (kms.length >= 3 && lit > 0) { const kmpl = (Math.max(...kms) - Math.min(...kms)) / lit; if (isFinite(kmpl) && kmpl > 0) rows.push(['Konsumsi BBM', kmpl.toFixed(1) + ' km/L']); } }
      const bad = s.overdueCount + s.dueSoonCount;
      return { icon: '🏍️', title: 'Kendaraan', main: bad ? String(bad) : 'Aman', mainSub: bad ? 'item perlu perhatian' : '', mainCls: s.overdueCount ? 'neg' : (bad ? 'warn' : 'pos'), rows, hint: '', target: { page: 'carnotes', tab: 'insight' } };
    }, null));

    // Shop — hanya jika ada aktivitas/stok.
    push(_dhoTry(() => {
      if (typeof ShopBusinessEnginePresenter === 'undefined') return null;
      const s = ShopBusinessEnginePresenter.summary();
      const p = s && s.profit && s.profit.ok ? s.profit : null;
      const inv = s && s.inventory && s.inventory.ok ? s.inventory : null;
      if ((!p || !p.omzet) && (!inv || !inv.totalModal)) return null;
      const rows = [];
      if (p) { rows.push(['Omzet', _dhoMoney(p.omzet)]); rows.push(['Margin', (p.marginPct || 0).toFixed(1) + '%', p.marginPct < 10 ? 'warn' : 'pos']); }
      if (inv) { rows.push(['Modal stok', _dhoMoney(inv.totalModal)]); rows.push(['Nilai jual stok', _dhoMoney(inv.totalNilaiJual)]); }
      return { icon: '🏪', title: 'Shop / Bisnis', main: _dhoMoneySigned(p ? p.untung : 0), mainSub: 'untung', mainCls: p && p.untung < 0 ? 'neg' : 'pos', rows, hint: '', target: { page: 'shop', tab: 'laporan' } };
    }, null));

    // Zakat.
    push(_dhoTry(() => {
      if (typeof ZakatReminder === 'undefined') return null;
      const z = ZakatReminder.summary();
      if (!z || !z.total) return null;
      const rows = (z.all || []).slice(0, 3).map((r) => [r.type === 'zakatMaal' ? 'Zakat Maal' : 'Zakat Penghasilan', r.jumlah ? _dhoMoney(r.jumlah) : 'wajib', 'warn']);
      return { icon: '🕌', title: 'Zakat', main: String(z.total), mainSub: 'kewajiban belum dicatat', mainCls: 'warn', rows, hint: 'Catat pembayaran di menu Pajak & Zakat setelah ditunaikan.', target: { page: 'pajak', tab: 'zakat' } };
    }, null));

    return tiles;
  },

  renderTiles() {
    const el = document.getElementById('dashHubOverviewTiles');
    if (!el) return;
    const tiles = this.tiles();
    if (!tiles.length) {
      el.innerHTML = '<div class="dhb-ov-empty">Belum ada data untuk dipantau. Catat transaksi, tagihan, atau aset pertama Anda — ringkasan tiap domain akan muncul di sini.</div>';
      return;
    }
    el.innerHTML = tiles.map((t, i) => `
      <div class="dhb-ov-tile" data-action="DashboardHubOverview.goTile" data-args='[${i}]'>
        <div class="dhb-ov-tile-h"><span>${t.icon}</span><b>${_dhoEsc(t.title)}</b><span>›</span></div>
        <div class="dhb-ov-main ${t.mainCls || ''}">${_dhoEsc(t.main)}<small>${_dhoEsc(t.mainSub || '')}</small></div>
        ${t.rows.map((r) => `<div class="dhb-ov-row"><span>${_dhoEsc(r[0])}</span><span class="${r[2] || ''}">${_dhoEsc(r[1])}</span></div>`).join('')}
        ${t.hint ? `<div class="dhb-ov-hint">💡 ${_dhoEsc(t.hint)}</div>` : ''}
      </div>`).join('');
    this._lastTiles = tiles;
  },

  goTile(i) {
    const t = this._lastTiles && this._lastTiles[i];
    if (t && t.target && typeof dashHubNavigateToFeature === 'function') dashHubNavigateToFeature(t.target);
  },

  // ---------- 3. LAPORAN TREN (tab Insight) ----------
  // Tren 6 bulan (masuk/keluar/tabungan) + 5 kategori pengeluaran terbesar bulan ini
  // dibanding bulan lalu. Agregasi sederhana atas D.transactions (pola filter sama
  // dgn _dashHubMonthTxShared: hitungKas === false dilewati).
  trendData() {
    if (typeof D === 'undefined' || !Array.isArray(D.transactions)) return null;
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ y: d.getFullYear(), m: d.getMonth(), inc: 0, exp: 0, cats: {} }); }
    const idx = {}; months.forEach((mo, i) => { idx[mo.y + '-' + mo.m] = i; });
    D.transactions.forEach((t) => {
      if (!t || t.hitungKas === false) return;
      const d = new Date(t.date); const i = idx[d.getFullYear() + '-' + d.getMonth()];
      if (i === undefined) return;
      const a = Number(t.amount) || 0;
      if (t.type === 'income') months[i].inc += a;
      else if (t.type === 'expense') { months[i].exp += a; const c = t.category || 'Lainnya'; months[i].cats[c] = (months[i].cats[c] || 0) + a; }
    });
    if (!months.some((x) => x.inc || x.exp)) return null;
    return months;
  },

  renderTrend() {
    const el = document.getElementById('dashHubTrendBody');
    if (!el) return;
    const months = _dhoTry(() => this.trendData(), null);
    if (!months) { el.innerHTML = '<div class="dhb-ov-empty">Belum ada transaksi 6 bulan terakhir.</div>'; return; }
    const NAMA = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const max = Math.max(1, ...months.map((x) => Math.max(x.inc, x.exp)));
    const active = months.filter((x) => x.inc || x.exp);
    const avgInc = active.reduce((a, x) => a + x.inc, 0) / active.length;
    const avgExp = active.reduce((a, x) => a + x.exp, 0) / active.length;
    const bars = months.map((x) => `
      <div class="dhb-tr-col" title="${NAMA[x.m]}: masuk ${_dhoEsc(_dhoMoney(x.inc))}, keluar ${_dhoEsc(_dhoMoney(x.exp))}">
        <div class="dhb-tr-bars"><i class="in" style="height:${Math.round(x.inc / max * 100)}%"></i><i class="out" style="height:${Math.round(x.exp / max * 100)}%"></i></div>
        <span>${NAMA[x.m]}</span>
      </div>`).join('');
    const cur = months[5], prev = months[4];
    const cats = Object.keys(cur.cats).map((k) => ({ k, v: cur.cats[k], p: prev.cats[k] || 0 })).sort((a, b) => b.v - a.v).slice(0, 5);
    const catRows = cats.map((c) => {
      const share = cur.exp > 0 ? Math.round(c.v / cur.exp * 100) : 0;
      const d = c.v - c.p;
      const delta = c.p > 0 && d === 0 ? '<span>=</span>' : c.p > 0 ? `<span class="${d > 0 ? 'neg' : 'pos'}">${d > 0 ? '▲' : '▼'} ${Math.abs(Math.round(d / c.p * 100))}%</span>` : '<span>baru</span>';
      return `<div class="dhb-ov-row"><span>${_dhoEsc(c.k)} · ${share}%</span><span>${_dhoEsc(_dhoMoney(c.v))} ${delta}</span></div>`;
    }).join('');
    el.innerHTML = `
      <div class="dhb-tr-chart">${bars}</div>
      <div class="dhb-ov-hint"><span class="pos">■ Masuk</span> &nbsp; <span class="neg">■ Keluar</span></div>
      <div class="dhb-ov-row"><span>Rata-rata masuk / bulan</span><span>${_dhoEsc(_dhoMoney(avgInc))}</span></div>
      <div class="dhb-ov-row"><span>Rata-rata keluar / bulan</span><span>${_dhoEsc(_dhoMoney(avgExp))}</span></div>
      ${cats.length ? `<div class="dhb-ov-title">Pengeluaran terbesar bulan ini (vs bulan lalu)</div><div class="dhb-ov-tile-static">${catRows}</div>` : ''}`;
  },

  render() {
    this.renderAttention();
    this.renderTiles();
    this.renderTrend();
  },
};

if (typeof window !== 'undefined') window.DashboardHubOverview = DashboardHubOverview;
