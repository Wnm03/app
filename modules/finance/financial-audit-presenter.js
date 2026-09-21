// Financial Audit UI. Presenter only: calculations live in FinancialAuditEngine;
// annotations/plans live in FinancialAuditAnnotations and never mutate transactions.
function _financialAuditMoney(n) {
  return typeof fmt === 'function' ? fmt(n) : ('Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'));
}
function _financialAuditDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function _financialAuditPct(pct) {
  if (pct == null || !Number.isFinite(Number(pct))) return '—';
  return `${pct >= 0 ? '+' : ''}${Math.round(Number(pct) * 100)}%`;
}
function _financialAuditEscape(v) { return typeof escapeHtml === 'function' ? escapeHtml(String(v == null ? '' : v)) : String(v == null ? '' : v); }
function _financialAuditNow() { return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now(); }
function _financialAuditDuration(start) {
  const ms = Math.max(0, _financialAuditNow() - start);
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2).replace('.', ',')} detik`;
}

const FinancialAuditPresenter = {
  _range() { return typeof FinancialAuditEngine !== 'undefined' ? FinancialAuditEngine.default30Days() : null; },

  // Dashboard Hub Insight — ringkasan ringan dari engine Audit 30 Menit.
  // Hanya presenter: tidak membuat rumus audit baru dan tidak mengubah data.
  renderDashboardInsight() {
    const body = document.getElementById('financialAuditInsightBody');
    if (!body || typeof FinancialAuditEngine === 'undefined') return;
    const range = this._range();
    const settings = typeof FinancialAuditAnnotations !== 'undefined'
      ? FinancialAuditAnnotations.settings()
      : { smallLeakMaxAmount: 50000, smallLeakMinCount: 3, recurringMinOccurrences: 2, recurringTolerancePct: 0.05, expenseGroupMap: {} };
    const auditStartedAt = _financialAuditNow();
    const audit = FinancialAuditEngine.dashboardInsight(range, {
      maxSmallAmount: settings.smallLeakMaxAmount,
      minSmallCount: settings.smallLeakMinCount,
      recurring: { minOccurrences: settings.recurringMinOccurrences, tolerancePct: settings.recurringTolerancePct },
      expenseGroups: { categoryMap: settings.expenseGroupMap },
      duplicates: { maxGroups: 50 },
    });
    const auditDuration = _financialAuditDuration(auditStartedAt);
    const summary = audit.summary || {};
    const comparison = audit.comparison || {};
    const top = audit.topCategories && audit.topCategories[0];
    const leak = audit.smallLeakages || {};
    const dup = audit.duplicates || {};
    const quality = audit.dataQuality || { warnings: [] };
    const money = (n) => _financialAuditEscape(_financialAuditMoney(n));
    const period = `${_financialAuditEscape(_financialAuditDate(range.from))} – ${_financialAuditEscape(_financialAuditDate(range.to))}`;

    if (!summary.txCount) {
      body.innerHTML = `<div class="u-hint10">Belum ada transaksi yang memenuhi aturan audit pada ${period}.</div><button class="btn btn-ghost btn-sm u-mt8" data-action="openFinancialAudit30Menit">Buka audit lengkap</button>`;
      return;
    }

    let insight = '';
    if (dup.exactBusinessDuplicateCount || dup.exactIdDuplicateCount) {
      insight = `⚠️ Terdeteksi ${Number(dup.exactBusinessDuplicateCount || 0) + Number(dup.exactIdDuplicateCount || 0)} duplikasi pasti. Periksa sumber data sebelum memakai hasil audit sebagai dasar tindakan.`;
    } else if (quality.warnings && quality.warnings.length) {
      insight = `⚠️ Kualitas data perlu ditinjau: ${_financialAuditEscape(quality.warnings[0])}`;
    } else if (leak.qualifies) {
      insight = `🪙 ${leak.count} transaksi kecil berjumlah ${money(leak.total)} memenuhi ambang audit.`;
    } else if (top) {
      insight = `🔎 Pengeluaran terbesar: ${_financialAuditEscape(top.category)} ${money(top.amount)} (${Math.round(Number(top.pct || 0) * 100)}%).`;
    } else {
      insight = '✅ Tidak ada sinyal audit utama yang perlu ditonjolkan dari periode ini.';
    }

    const expenseDelta = comparison.expense || {};
    const deltaText = Number.isFinite(Number(expenseDelta.amount))
      ? `Pengeluaran ${Number(expenseDelta.amount) > 0 ? 'naik' : Number(expenseDelta.amount) < 0 ? 'turun' : 'tetap'} ${money(Math.abs(Number(expenseDelta.amount)))} vs 30 hari sebelumnya.`
      : '';

    body.innerHTML = `<div class="card u-mb8" style="border-left:3px solid var(--accent)">
      <div class="u-flex u-flex-between u-gap8"><div><div class="u-fw700">🔎 Audit Keuangan Cepat · 30 hari terakhir</div><div class="u-hint10">${period} · ${summary.txCount} transaksi · ${auditDuration}</div></div><button class="btn btn-ghost btn-sm" data-action="openFinancialAudit30Menit">Buka</button></div>
      <div class="u-hint10 u-mt8">${insight}</div>
      <div class="u-hint10 u-mt4">Pengeluaran ${money(summary.expense)} · Pemasukan ${money(summary.income)}${deltaText ? ` · ${_financialAuditEscape(deltaText)}` : ''}</div>
    </div>`;
  },

  render() {
    const body = document.getElementById('financialAudit30Body');
    if (!body || typeof FinancialAuditEngine === 'undefined') return;
    const range = this._range();
    const settings = typeof FinancialAuditAnnotations !== 'undefined' ? FinancialAuditAnnotations.settings() : { smallLeakMaxAmount: 50000, smallLeakMinCount: 3, recurringMinOccurrences: 2, recurringTolerancePct: 0.05, expenseGroupMap: {} };
    const auditStartedAt = _financialAuditNow();
    const audit = FinancialAuditEngine.audit(range, { maxSmallAmount: settings.smallLeakMaxAmount, minSmallCount: settings.smallLeakMinCount, recurring: { minOccurrences: settings.recurringMinOccurrences, tolerancePct: settings.recurringTolerancePct }, expenseGroups: { categoryMap: settings.expenseGroupMap }, duplicates: { maxGroups: 50 } });
    const auditDuration = _financialAuditDuration(auditStartedAt);
    const plan = typeof FinancialAuditAnnotations !== 'undefined' ? FinancialAuditAnnotations.activePlan() : null;
    const warningHtml = audit.dataQuality.warnings.length
      ? `<div class="u-hint10 u-mb12" style="border-left:3px solid var(--warning);padding-left:10px">⚠️ ${audit.dataQuality.warnings.map(_financialAuditEscape).join('<br>')}</div>`
      : `<div class="u-hint10 u-mb12">✓ Tidak ada masalah kualitas data yang terdeteksi pada transaksi yang diaudit.</div>`;
    const topHtml = audit.topCategories.length ? audit.topCategories.map((x, i) => `
      <div class="card u-mb8"><div class="u-flex u-flex-between u-gap8">
        <div><b>${i + 1}. ${_financialAuditEscape(x.category)}</b><div class="u-hint10">${x.count} transaksi · ${Math.round(x.pct * 100)}% pengeluaran</div></div>
        <div class="u-fw700">${_financialAuditEscape(_financialAuditMoney(x.amount))}</div>
      </div></div>`).join('') : `<div class="empty"><div class="empty-text">Belum ada pengeluaran berkategori dalam periode ini.</div></div>`;
    const cmp = audit.comparison;
    const compareHtml = `<div class="card u-mb12"><div class="u-fw700">📊 Dibanding 30 hari sebelumnya</div>
      <div class="u-hint10 u-mt4">Pengeluaran ${_financialAuditEscape(_financialAuditMoney(cmp.current.expense))} · perubahan ${_financialAuditEscape(_financialAuditMoney(cmp.expense.amount))} (${_financialAuditEscape(_financialAuditPct(cmp.expense.pct))})</div>
      <div class="u-hint10">Pemasukan ${_financialAuditEscape(_financialAuditMoney(cmp.current.income))} · perubahan ${_financialAuditEscape(_financialAuditMoney(cmp.income.amount))} (${_financialAuditEscape(_financialAuditPct(cmp.income.pct))})</div>
      <div class="u-hint10">Selisih ${_financialAuditEscape(_financialAuditMoney(cmp.current.net))} · perubahan ${_financialAuditEscape(_financialAuditMoney(cmp.net.amount))} (${_financialAuditEscape(_financialAuditPct(cmp.net.pct))})</div>
    </div>`;
    const leak = audit.smallLeakages;
    const leakHtml = leak.qualifies
      ? `<div class="card u-mb12"><div class="u-fw700">🪙 Akumulasi transaksi kecil</div><div class="u-hint10">${leak.count} transaksi ≤ ${_financialAuditEscape(_financialAuditMoney(leak.maxAmount))} dengan total ${_financialAuditEscape(_financialAuditMoney(leak.total))}.</div></div>`
      : `<div class="card u-mb12"><div class="u-fw700">🪙 Akumulasi transaksi kecil</div><div class="u-hint10">${leak.count} transaksi ≤ ${_financialAuditEscape(_financialAuditMoney(leak.maxAmount))}; minimum ${leak.minCount} transaksi.</div></div>`;
    const recurringHtml = audit.recurringCandidates.length ? audit.recurringCandidates.slice(0, 5).map((x) => `
      <div class="card u-mb8"><div class="u-fw700">🔁 ${_financialAuditEscape(x.label)}</div>
        <div class="u-hint10">${x.occurrences}× · rata-rata ${_financialAuditEscape(_financialAuditMoney(x.avgAmount))} · jarak ${x.avgGapDays == null ? '—' : Math.round(x.avgGapDays) + ' hari'} · keyakinan ${_financialAuditEscape(x.confidence)}</div>
        <div class="u-hint10 u-mt4">Kandidat pola berulang, bukan langganan otomatis.</div>
        <button class="btn btn-ghost btn-sm u-mt8" data-action="openFinancialAuditAnnotation" data-args="[${JSON.stringify(String(x.txIds[0] || '')).replace(/"/g, '&quot;')}]">⭐ Tinjau transaksi</button>
      </div>`).join('') : `<div class="card u-mb12"><div class="u-hint10">Belum ditemukan pola transaksi berulang yang cukup konsisten.</div></div>`;
    const groupHtml = audit.expenseGroups.some(x => x.amount > 0) ? `<div class="card u-mb12"><div class="u-fw700">🧩 Kelompok pengeluaran</div><div class="u-hint10 u-mb8">Kategori hanya dikelompokkan jika Anda sudah memetakannya. Kategori ambigu tetap berada di “Perlu ditinjau”.</div>${audit.expenseGroups.filter(x => x.amount > 0).map(x => `<div class="u-flex u-flex-between u-gap8 u-mb8"><span>${_financialAuditEscape(x.group)} <span class="u-hint10">${x.count} transaksi · ${Math.round(x.pct*100)}%</span></span><b>${_financialAuditEscape(_financialAuditMoney(x.amount))}</b></div>`).join('')}</div>` : '';
    const dup = audit.duplicates;
    const duplicateHtml = (dup.exactBusinessDuplicateCount || dup.exactIdDuplicateCount || dup.nearDuplicateGroupCount)
      ? `<div class="card u-mb12" style="border-left:3px solid var(--warning)"><div class="u-fw700">🧬 Pemeriksaan data ganda</div><div class="u-hint10 u-mb8">${dup.exactBusinessDuplicateCount} duplikasi bisnis · ${dup.exactIdDuplicateCount} ID ganda · ${dup.nearDuplicateGroupCount} kelompok mirip.</div>${dup.groups.slice(0, 5).map(g => `<div class="u-hint10 u-mb4">${_financialAuditEscape(g.kind)} · ${g.count} record · ${_financialAuditEscape(_financialAuditMoney(g.amount))}${g.transactionIds.length ? ` · ${g.transactionIds.map(id => `<button class="btn btn-ghost btn-sm" data-action="FinancialAuditPresenter.openSourceTransaction" data-args='[${JSON.stringify(String(id)).replace(/'/g,"&#39;")}]'>${_financialAuditEscape(String(id))}</button>`).join(' ')}` : ''}</div>`).join('')}<div class="u-hint10 u-mt4">Duplikasi tidak dihapus otomatis. Periksa transaksi sumber sebelum memperbaiki data.</div></div>`
      : `<div class="card u-mb12"><div class="u-fw700">🧬 Pemeriksaan data ganda</div><div class="u-hint10">Tidak ditemukan duplikasi pasti pada data yang memenuhi aturan audit.</div></div>`;
    const planHtml = plan ? `<div class="card u-mb12" style="border-left:3px solid var(--accent)"><div class="u-fw700">🎯 Rencana aktif</div><div class="u-hint10">${_financialAuditEscape(plan.title)}${plan.target ? ' · ' + _financialAuditEscape(plan.target) : ''}</div><div class="u-flex u-gap8 u-mt8"><button class="btn btn-ghost btn-sm" data-action="FinancialAuditPresenter.completePlan">Selesai</button></div></div>` : '';
    body.innerHTML = `
      <div class="card u-mb12"><div class="u-hint10">Periode audit</div><div class="u-fw700">${_financialAuditEscape(_financialAuditDate(range.from))} – ${_financialAuditEscape(_financialAuditDate(range.to))}</div>
        <div class="u-hint10 u-mt4">Waktu audit: ${_financialAuditEscape(auditDuration)}</div>
        <div class="u-mt8">Pengeluaran <b>${_financialAuditEscape(_financialAuditMoney(audit.summary.expense))}</b> dari ${audit.summary.txCount} transaksi yang tercatat dan memenuhi aturan audit.</div>
        <div class="u-hint10 u-mt4">Pemasukan ${_financialAuditEscape(_financialAuditMoney(audit.summary.income))} · Selisih ${_financialAuditEscape(_financialAuditMoney(audit.summary.net))}</div></div>
      ${warningHtml}
      ${duplicateHtml}
      ${groupHtml}
      ${compareHtml}
      <div class="u-fw700 u-mb8">3 kategori pengeluaran terbesar</div>${topHtml}
      ${leakHtml}
      <div class="card u-mb12"><div class="u-fw700">⚙️ Pengaturan audit</div><div class="u-hint10 u-mb8">Atur ambang dan pemetaan kategori. Audit tidak menebak niat transaksi yang ambigu.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label class="fl">Maks transaksi kecil</label><input class="fi" id="auditSmallLeakMax" type="number" min="0" step="1000" value="${Math.round(settings.smallLeakMaxAmount)}"></div><div><label class="fl">Min jumlah</label><input class="fi" id="auditSmallLeakMin" type="number" min="1" step="1" value="${settings.smallLeakMinCount}"></div></div><div class="fg u-mt8"><label class="fl">Min kemunculan pola berulang</label><input class="fi" id="auditRecurringMin" type="number" min="2" step="1" value="${settings.recurringMinOccurrences}"></div><button class="btn btn-ghost btn-full" data-action="FinancialAuditPresenter.saveSettings">Simpan ambang audit</button></div>
      <div class="u-fw700 u-mb8">🔁 Kandidat pengeluaran berulang</div>${recurringHtml}
      ${planHtml}
      <div class="card u-mb12"><div class="u-fw700">🧭 Pilih satu tindakan</div><div class="u-hint10 u-mb8">Aplikasi tidak membuat keputusan atau transaksi otomatis. Pilih fokus yang ingin Anda kerjakan.</div>
        ${this._actionButtons()}
      </div>
      <div class="card u-mb12"><div class="u-fw700">⭐ Transaksi untuk dievaluasi</div><div class="u-hint10 u-mb8">Flag, pemicu, dan catatan disimpan terpisah dari transaksi asli.</div>
        <button class="btn btn-ghost btn-full" data-action="FinancialAuditPresenter.openReviewList">Buka daftar review</button>
      </div>
      <div class="card u-mb12"><div class="u-fw700">🔎 Sumber data</div><div class="u-hint10 u-mb8">Periksa transaksi asli sebelum mengambil tindakan.</div>
        <button class="btn btn-ghost btn-full" data-action="goToList" data-args='["allTx","keuangan",null,null,null,"kelola"]'>📋 Lihat transaksi</button>
      </div>
      <div class="u-hint10 u-mb12">Audit bersifat informatif. Transaksi yang tidak tercatat tidak dapat disimpulkan sebagai Rp0, dan kandidat berulang tetap perlu dikonfirmasi.</div>`;
  },

  _actionButtons() {
    const buttons = [
      ['reduce_category','📉 Batasi kategori tertentu'],
      ['review_bill','🧾 Evaluasi tagihan/langganan'],
      ['small_leak','🪙 Pantau transaksi kecil'],
      ['review_transactions','⭐ Evaluasi transaksi bertanda'],
      ['set_budget','📊 Tetapkan batas anggaran'],
    ];
    return buttons.map(([key, label]) => `<button class="btn btn-ghost btn-full u-mb8" data-action="FinancialAuditPresenter.chooseAction" data-args='["${key}"]'>${label}</button>`).join('');
  },

  saveSettings() {
    if (typeof FinancialAuditAnnotations === 'undefined') return;
    const max = document.getElementById('auditSmallLeakMax');
    const min = document.getElementById('auditSmallLeakMin');
    const recurring = document.getElementById('auditRecurringMin');
    FinancialAuditAnnotations.updateSettings({
      smallLeakMaxAmount: max ? max.value : 50000,
      smallLeakMinCount: min ? min.value : 3,
      recurringMinOccurrences: recurring ? recurring.value : 2,
    });
    this.render();
  },

  chooseAction(action) {
    const labels = {
      reduce_category: 'Batasi kategori tertentu', review_bill: 'Evaluasi tagihan/langganan',
      small_leak: 'Pantau transaksi kecil', review_transactions: 'Evaluasi transaksi bertanda', set_budget: 'Tetapkan batas anggaran',
    };
    const title = labels[action] || 'Rencana audit';
    const body = document.getElementById('financialAudit30Body');
    if (!body) return;
    body.insertAdjacentHTML('afterbegin', `<div class="card u-mb12" id="financialAuditPlanForm"><div class="u-fw700">🎯 ${_financialAuditEscape(title)}</div>
      <div class="fg u-mt8"><label class="fl">Target (opsional)</label><input class="fi" id="financialAuditPlanTarget" placeholder="Contoh: maksimal Rp1.000.000/bulan"></div>
      <div class="fg"><label class="fl">Catatan</label><textarea class="fi" id="financialAuditPlanNote" rows="3" placeholder="Apa yang ingin saya ubah atau tinjau?"></textarea></div>
      <div class="u-flex u-gap8"><button class="btn btn-primary" data-action="FinancialAuditPresenter.savePlan" data-args='["${_financialAuditEscape(action)}","${_financialAuditEscape(title)}"]'>Simpan rencana</button><button class="btn btn-ghost" data-action="FinancialAuditPresenter.cancelPlan">Batal</button></div></div>`);
    body.scrollTop = 0;
  },

  savePlan(action, title) {
    if (typeof FinancialAuditAnnotations === 'undefined') return;
    const target = document.getElementById('financialAuditPlanTarget');
    const note = document.getElementById('financialAuditPlanNote');
    FinancialAuditAnnotations.savePlan(action, { title, target: target ? target.value : '', note: note ? note.value : '' });
    this.render();
    const route = { reduce_category: ['keuangan','budget'], review_bill: ['keuangan','tagihan'], small_leak: ['keuangan','laporan'], review_transactions: ['keuangan','laporan'], set_budget: ['keuangan','budget'] }[action];
    if (typeof closeModal === 'function') closeModal('financialAudit30Modal');
    if (route && typeof setKeuanganTab === 'function') setKeuanganTab(route[1]);
  },

  cancelPlan() { const el = document.getElementById('financialAuditPlanForm'); if (el) el.remove(); },

  completePlan() {
    if (typeof FinancialAuditAnnotations !== 'undefined') FinancialAuditAnnotations.completePlan();
    this.render();
  },

  openSourceTransaction(txId) {
    const id = String(txId || '').trim();
    if (!id) return;
    if (typeof closeModal === 'function') closeModal('financialAudit30Modal');
    if (typeof goToList === 'function') {
      goToList('allTx', 'keuangan', null, null, null, 'kelola');
      setTimeout(() => {
        const escId = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') ? CSS.escape(id) : id.replace(/[\\"'\[\\\]().:#]/g, '\\$&');
        const row = document.querySelector(`[data-tx-id="${escId}"]`);
        if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  },

  openReviewList() {
    const body = document.getElementById('financialAudit30Body');
    if (!body || typeof FinancialAuditEngine === 'undefined') return;
    const rows = FinancialAuditEngine._eligibleTransactions(this._range()).rows.filter(({ tx }) => tx.type === 'expense').sort((a,b) => Number(b.tx.amount||0)-Number(a.tx.amount||0)).slice(0, 15);
    const html = rows.length ? rows.map(({tx}) => {
      const ann = typeof FinancialAuditAnnotations !== 'undefined' ? FinancialAuditAnnotations.forTransaction(tx.id) : null;
      return `<div class="card u-mb8"><div class="u-flex u-flex-between u-gap8"><div><b>${_financialAuditEscape(tx.note || tx.category || 'Transaksi')}</b><div class="u-hint10">${_financialAuditEscape(tx.date || '')} · ${_financialAuditEscape(tx.category || 'Perlu ditinjau')}</div></div><div class="u-fw700">${_financialAuditEscape(_financialAuditMoney(tx.amount))}</div></div><div class="u-hint10 u-mt4">${ann && ann.reviewFlag ? '⭐ Ditandai' : 'Belum ditandai'}${ann && ann.trigger ? ' · pemicu: '+_financialAuditEscape(ann.trigger) : ''}</div><button class="btn btn-ghost btn-sm u-mt8" data-action="openFinancialAuditAnnotation" data-args="[${JSON.stringify(String(tx.id || '')).replace(/"/g, '&quot;')}]">${ann && ann.reviewFlag ? '✏️ Ubah review' : '⭐ Tandai untuk evaluasi'}</button></div>`;
    }).join('') : '<div class="empty"><div class="empty-text">Belum ada transaksi pengeluaran untuk direview.</div></div>';
    body.innerHTML = `<div class="u-fw700 u-mb8">⭐ Review transaksi</div><div class="u-hint10 u-mb12">Menampilkan sampai 15 pengeluaran terbesar dalam periode audit. Ini hanya daftar review, bukan penilaian otomatis.</div>${html}<button class="btn btn-ghost btn-full u-mt8" data-action="FinancialAuditPresenter.render">← Kembali ke audit</button>`;
  },

  openAnnotation(txId) {
    if (typeof FinancialAuditAnnotations === 'undefined') return;
    const current = FinancialAuditAnnotations.forTransaction(txId) || {};
    let modal = document.getElementById('financialAuditAnnotationModal');
    if (!modal) {
      modal = document.createElement('div'); modal.className = 'overlay'; modal.id = 'financialAuditAnnotationModal';
      modal.innerHTML = `<div class="modal"><div class="modal-handle"></div><div class="modal-title"><span>⭐ Evaluasi transaksi</span><button class="modal-close" data-action="closeModal" data-args='["financialAuditAnnotationModal"]'>✕</button></div><div id="financialAuditAnnotationBody"></div></div>`;
      document.body.appendChild(modal);
    }
    document.getElementById('financialAuditAnnotationBody').innerHTML = `<div class="u-hint10 u-mb12">Data ini disimpan sebagai anotasi terpisah; transaksi asli tidak diubah.</div>
      <label class="u-flex u-gap8 u-mb12"><input type="checkbox" id="auditReviewFlag" ${current.reviewFlag ? 'checked' : ''}> Tandai untuk dievaluasi</label>
      <div class="fg"><label class="fl">Pemicu</label><select class="fs" id="auditTrigger"><option value="">Belum dipilih</option><option value="bosan" ${current.trigger==='bosan'?'selected':''}>Bosan</option><option value="promo" ${current.trigger==='promo'?'selected':''}>Promo</option><option value="stres" ${current.trigger==='stres'?'selected':''}>Stres</option><option value="setelah_gajian" ${current.trigger==='setelah_gajian'?'selected':''}>Setelah gajian</option><option value="malam_hari" ${current.trigger==='malam_hari'?'selected':''}>Malam hari</option><option value="lainnya" ${current.trigger==='lainnya'?'selected':''}>Lainnya</option></select></div>
      <div class="fg"><label class="fl">Catatan refleksi</label><textarea class="fi" id="auditReviewNote" rows="4" placeholder="Apa yang ingin saya ingat saat mengevaluasi transaksi ini?">${_financialAuditEscape(current.note || '')}</textarea></div>
      <button class="btn btn-primary btn-full" data-action="FinancialAuditPresenter.saveAnnotation" data-args='["${_financialAuditEscape(String(txId))}"]'>Simpan</button>`;
    if (typeof openModal === 'function') openModal('financialAuditAnnotationModal');
  },

  saveAnnotation(txId) {
    if (typeof FinancialAuditAnnotations === 'undefined') return;
    const flag = document.getElementById('auditReviewFlag');
    const trigger = document.getElementById('auditTrigger');
    const note = document.getElementById('auditReviewNote');
    FinancialAuditAnnotations.upsertTransaction(txId, { reviewFlag: !!(flag && flag.checked), trigger: trigger ? trigger.value : '', note: note ? note.value : '' });
    if (typeof closeModal === 'function') closeModal('financialAuditAnnotationModal');
    this.openReviewList();
  },
};

if (typeof window !== 'undefined') window.FinancialAuditPresenter = FinancialAuditPresenter;

function openFinancialAudit30Menit() {
  if (typeof FinancialAuditEngine === 'undefined') return;
  let modal = document.getElementById('financialAudit30Modal');
  if (!modal) {
    modal = document.createElement('div'); modal.className = 'overlay'; modal.id = 'financialAudit30Modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `<div class="modal" style="display:flex;flex-direction:column;overflow-y:hidden"><div class="modal-handle" style="flex-shrink:0"></div><div class="modal-title" style="flex-shrink:0"><span>💡 Audit Keuangan Cepat</span><button class="modal-close" data-action="closeModal" data-args='["financialAudit30Modal"]' aria-label="Tutup">✕</button></div><div id="financialAudit30Body" style="flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch"></div></div>`;
    document.body.appendChild(modal);
  }
  FinancialAuditPresenter.render();
  if (typeof openModal === 'function') openModal('financialAudit30Modal');
}
function renderFinancialAudit30Menit() { FinancialAuditPresenter.render(); }
function openFinancialAuditAnnotation(txId) { FinancialAuditPresenter.openAnnotation(txId); }
