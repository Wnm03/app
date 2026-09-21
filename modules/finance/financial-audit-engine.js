// modules/finance/financial-audit-engine.js — Audit Keuangan 30 Menit, Phase A.
// Pure/read-only: tidak mengubah D.transactions, tidak memanggil save(), dan tidak menyentuh DOM.
// Semua rentang harus eksplisit di API publik; helper default30Days() hanya pembentuk range.
const FinancialAuditEngine = {
  _toDate(value) {
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      // Date-only dibuat sebagai local midnight agar audit mengikuti kalender pengguna.
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
      if (m) {
        const y = Number(m[1]), mo = Number(m[2]) - 1, day = Number(m[3]);
        const out = new Date(y, mo, day);
        if (out.getFullYear() !== y || out.getMonth() !== mo || out.getDate() !== day) return new Date(NaN);
        return out;
      }
    }
    return new Date(value);
  },

  _validDate(value) {
    const d = this._toDate(value);
    return !Number.isNaN(d.getTime());
  },

  default30Days(now) {
    const end = this._toDate(now == null ? new Date() : now);
    if (Number.isNaN(end.getTime())) return { from: new Date(NaN), to: new Date(NaN) };
    end.setHours(23, 59, 59, 999);
    const from = new Date(end.getTime());
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - 29);
    return { from, to: end };
  },

  _normalizeRange(range) {
    if (!range || range.from == null || range.to == null) {
      return this.default30Days();
    }
    const from = this._toDate(range.from);
    const to = this._toDate(range.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return { from: new Date(NaN), to: new Date(NaN) };
    }
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  },

  _isSelfOwned(t, accountMap) {
    if (typeof FinanceIntelligence !== 'undefined' &&
        typeof FinanceIntelligence._isTxAccountSelf === 'function') {
      return FinanceIntelligence._isTxAccountSelf(t, accountMap);
    }
    if (typeof OwnershipEngine === 'undefined' || !t || !t.accountId) return true;
    const acc = accountMap.get(t.accountId);
    if (!acc) return true;
    return OwnershipEngine.resolve(acc).type === 'SELF';
  },

  _eligibleTransactions(range) {
    const { from, to } = this._normalizeRange(range);
    const invalidRange = Number.isNaN(from.getTime()) || Number.isNaN(to.getTime());
    const all = Array.isArray(D.transactions) ? D.transactions : [];
    const accountMap = new Map((D.accounts || []).map((a) => [a.id, a]));
    const stats = {
      totalRecords: all.length,
      invalidDateCount: 0,
      outsideRangeCount: 0,
      nonCashCount: 0,
      nonExpenseIncomeCount: 0,
      nonSelfOwnedCount: 0,
      eligibleCount: 0,
    };
    if (invalidRange) return { rows: [], range: { from, to }, stats };

    const rows = [];
    all.forEach((t) => {
      const d = this._toDate(t && t.date);
      if (Number.isNaN(d.getTime())) {
        stats.invalidDateCount++;
        return;
      }
      if (d < from || d > to) {
        stats.outsideRangeCount++;
        return;
      }
      if (t && t.hitungKas === false) {
        stats.nonCashCount++;
        return;
      }
      if (!t || (t.type !== 'income' && t.type !== 'expense')) {
        stats.nonExpenseIncomeCount++;
        return;
      }
      if (!this._isSelfOwned(t, accountMap)) {
        stats.nonSelfOwnedCount++;
        return;
      }
      stats.eligibleCount++;
      rows.push({ tx: t, date: d });
    });
    return { rows, range: { from, to }, stats };
  },

  summary(range, options) {
    const opts = options || {};
    const q = opts._eligible || this._eligibleTransactions(range);
    let income = 0;
    let expense = 0;
    q.rows.forEach(({ tx }) => {
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount)) return;
      if (tx.type === 'income') income += amount;
      else expense += amount;
    });
    return {
      from: q.range.from,
      to: q.range.to,
      income,
      expense,
      net: income - expense,
      txCount: q.rows.length,
      dataQuality: opts._dataQuality || (opts.skipDataQuality ? null : this.dataQuality(range, { _eligible: q })),
    };
  },

  topCategories(range, limit, options) {
    const opts = options || {};
    const n = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 3;
    const q = opts._eligible || this._eligibleTransactions(range);
    const groups = new Map();
    q.rows.forEach(({ tx }) => {
      if (tx.type !== 'expense') return;
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const category = String(tx.category || '').trim() || 'Perlu ditinjau';
      const row = groups.get(category) || { category, amount: 0, count: 0 };
      row.amount += amount;
      row.count++;
      groups.set(category, row);
    });
    const total = Array.from(groups.values()).reduce((s, x) => s + x.amount, 0);
    return Array.from(groups.values())
      .sort((a, b) => b.amount - a.amount || b.count - a.count || a.category.localeCompare(b.category))
      .slice(0, n)
      .map((x) => ({ ...x, pct: total > 0 ? x.amount / total : 0, totalExpense: total }));
  },

  smallLeakages(range, options) {
    const opts = options || {};
    const maxAmount = Number.isFinite(Number(opts.maxAmount)) ? Math.max(0, Number(opts.maxAmount)) : 50000;
    const minCount = Number.isFinite(Number(opts.minCount)) ? Math.max(1, Math.floor(Number(opts.minCount))) : 3;
    const q = opts._eligible || this._eligibleTransactions(range);
    const rows = q.rows.filter(({ tx }) => {
      const amount = Number(tx.amount);
      return tx.type === 'expense' && Number.isFinite(amount) && amount > 0 && amount <= maxAmount;
    });
    const total = rows.reduce((s, { tx }) => s + Number(tx.amount), 0);
    return {
      maxAmount,
      minCount,
      count: rows.length,
      total,
      qualifies: rows.length >= minCount,
    };
  },

  _canonicalBusinessKey(tx) {
    return JSON.stringify([
      String(tx && tx.accountId || ''),
      String(tx && tx.type || ''),
      String(tx && tx.date || '').slice(0, 10),
      Number(tx && tx.amount),
      String(tx && tx.category || '').trim().toLowerCase(),
      String(tx && tx.subcategory || '').trim().toLowerCase(),
      String(tx && tx.note || '').trim().toLowerCase(),
      tx && tx.hitungKas === false ? false : true,
    ]);
  },

  duplicateDiagnostics(range, options) {
    const opts = options || {};
    const q = opts._eligible || this._eligibleTransactions(range);
    const byId = new Map();
    const byBusiness = new Map();
    const byNear = new Map();
    q.rows.forEach(({ tx }, eligibleIndex) => {
      const id = String(tx && tx.id != null ? tx.id : '').trim();
      if (id) {
        const bucket = byId.get(id) || [];
        bucket.push({ tx, eligibleIndex });
        byId.set(id, bucket);
      }
      const businessKey = this._canonicalBusinessKey(tx || {});
      const businessBucket = byBusiness.get(businessKey) || [];
      businessBucket.push({ tx, eligibleIndex });
      byBusiness.set(businessKey, businessBucket);
      const nearKey = JSON.stringify([
        String(tx && tx.accountId || ''), String(tx && tx.type || ''),
        String(tx && tx.date || '').slice(0, 10), Number(tx && tx.amount),
      ]);
      const nearBucket = byNear.get(nearKey) || [];
      nearBucket.push({ tx, eligibleIndex });
      byNear.set(nearKey, nearBucket);
    });

    const toGroup = (bucket, kind) => {
      const first = bucket[0] && bucket[0].tx || {};
      const amount = bucket.reduce((n, x) => {
        const a = Number(x.tx && x.tx.amount);
        return n + (Number.isFinite(a) ? a : 0);
      }, 0);
      return {
        kind,
        transactionIds: bucket.map(x => x.tx && x.tx.id).filter(x => x != null),
        count: bucket.length,
        type: first.type || '',
        category: String(first.category || '').trim(),
        date: String(first.date || '').slice(0, 10),
        amount,
        sample: {
          note: String(first.note || ''),
          category: String(first.category || ''),
          subcategory: String(first.subcategory || ''),
        },
      };
    };
    const exactIdGroups = [...byId.values()].filter(x => x.length > 1).map(x => toGroup(x, 'duplicate_id'));
    const exactBusinessGroups = [...byBusiness.values()].filter(x => x.length > 1).map(x => toGroup(x, 'duplicate_business'));
    const exactSets = new Set(exactBusinessGroups.map(g => g.transactionIds.slice().sort().join('\u0000')));
    const nearGroups = [...byNear.values()].filter(x => x.length > 1).map(x => toGroup(x, 'near_duplicate')).filter(g => {
      const key = g.transactionIds.slice().sort().join('\u0000');
      return !exactSets.has(key);
    });
    const impactedIds = new Set();
    exactBusinessGroups.forEach(g => g.transactionIds.forEach(id => impactedIds.add(String(id))));
    exactIdGroups.forEach(g => g.transactionIds.forEach(id => impactedIds.add(String(id))));
    const impacted = q.rows.filter(({ tx }) => impactedIds.has(String(tx && tx.id)));
    const impactedAmountByType = impacted.reduce((acc, { tx }) => {
      const amount = Number(tx && tx.amount);
      if (!Number.isFinite(amount)) return acc;
      const type = tx.type === 'income' ? 'income' : (tx.type === 'expense' ? 'expense' : 'other');
      acc[type] += amount;
      return acc;
    }, { income: 0, expense: 0, other: 0 });
    const maxGroups = Number.isFinite(Number(opts.maxGroups)) ? Math.max(1, Math.floor(Number(opts.maxGroups))) : 50;
    const groups = [...exactBusinessGroups, ...exactIdGroups].slice(0, maxGroups);
    const warnings = [];
    if (exactBusinessGroups.length) warnings.push(`${exactBusinessGroups.length} kelompok transaksi memiliki data bisnis identik; hasil audit dapat terinflasi.`);
    if (exactIdGroups.length) warnings.push(`${exactIdGroups.length} kelompok memiliki ID transaksi ganda; periksa sumber/import data.`);
    if (nearGroups.length) warnings.push(`${nearGroups.length} kelompok transaksi mirip ditemukan; konfirmasi sebelum menganggapnya duplikasi.`);
    return {
      range: q.range,
      totalEligibleRecords: q.rows.length,
      exactIdGroups,
      exactBusinessGroups,
      nearGroups,
      exactIdDuplicateCount: exactIdGroups.reduce((n, g) => n + g.count - 1, 0),
      exactBusinessDuplicateCount: exactBusinessGroups.reduce((n, g) => n + g.count - 1, 0),
      nearDuplicateGroupCount: nearGroups.length,
      impactedTransactionIds: [...impactedIds],
      impactedAmountByType,
      warnings,
      groups,
    };
  },

  expenseGroups(range, options) {
    const opts = options || {};
    const map = opts.categoryMap && typeof opts.categoryMap === 'object' ? opts.categoryMap : {};
    const allowed = new Set(['Kebutuhan', 'Keinginan', 'Masa depan', 'Perlu ditinjau']);
    const groups = new Map([...allowed].map(name => [name, { group: name, amount: 0, count: 0, categories: [] }]));
    const categorySeen = new Map();
    (opts._eligible || this._eligibleTransactions(range)).rows.forEach(({ tx }) => {
      if (tx.type !== 'expense') return;
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const category = String(tx.category || '').trim();
      const group = allowed.has(map[category]) ? map[category] : 'Perlu ditinjau';
      const row = groups.get(group);
      row.amount += amount;
      row.count++;
      categorySeen.set(category || 'Perlu ditinjau', group);
    });
    return [...groups.values()].map(row => ({
      ...row,
      pct: 0,
      categories: [...categorySeen.entries()].filter(([, g]) => g === row.group).map(([c]) => c),
    })).map((row, _, all) => ({ ...row, pct: all.reduce((n, x) => n + x.amount, 0) > 0 ? row.amount / all.reduce((n, x) => n + x.amount, 0) : 0 }));
  },

  previousRange(range) {
    const current = this._normalizeRange(range);
    if (Number.isNaN(current.from.getTime()) || Number.isNaN(current.to.getTime())) {
      return { from: new Date(NaN), to: new Date(NaN) };
    }
    const days = Math.max(1, Math.round((current.to.getTime() - current.from.getTime() + 1) / 86400000));
    const to = new Date(current.from.getTime() - 1);
    to.setHours(23, 59, 59, 999);
    const from = new Date(to.getTime());
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - days + 1);
    return { from, to };
  },

  comparison(range, options) {
    const opts = options || {};
    const normalized = this._normalizeRange(range);
    const currentQ = opts._eligible || this._eligibleTransactions(normalized);
    const current = opts._summary || this.summary(normalized, { _eligible: currentQ, _dataQuality: opts._dataQuality, skipDataQuality: !opts._dataQuality });
    const previousRange = this.previousRange(normalized);
    const previousQ = this._eligibleTransactions(previousRange);
    const previous = this.summary(previousRange, { _eligible: previousQ, skipDataQuality: true });
    const delta = (a, b) => ({
      amount: a - b,
      pct: b !== 0 ? (a - b) / Math.abs(b) : null,
    });
    return {
      current: { ...current, range: normalized },
      previous: { ...previous, range: previousRange },
      income: delta(current.income, previous.income),
      expense: delta(current.expense, previous.expense),
      net: delta(current.net, previous.net),
    };
  },

  _normalizeRecurringKey(tx) {
    const source = String((tx && (tx.note || tx.category || tx.subcategory)) || '').trim().toLowerCase();
    return source.replace(/\s+/g, ' ').replace(/[\d]+/g, '#').slice(0, 120);
  },

  recurringCandidates(range, options) {
    const opts = options || {};
    const minOccurrences = Number.isFinite(Number(opts.minOccurrences)) ? Math.max(2, Math.floor(Number(opts.minOccurrences))) : 2;
    const tolerancePct = Number.isFinite(Number(opts.tolerancePct)) ? Math.max(0, Number(opts.tolerancePct)) : 0.05;
    const q = opts._eligible || this._eligibleTransactions(range);
    const groups = new Map();
    q.rows.forEach(({ tx, date }) => {
      if (tx.type !== 'expense' || tx.billLinkId) return;
      const key = this._normalizeRecurringKey(tx);
      if (!key || key === 'perlu ditinjau') return;
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const row = groups.get(key) || { key, label: String(tx.note || tx.category || tx.subcategory || 'Transaksi'), amounts: [], dates: [], txIds: [], category: String(tx.category || '').trim() };
      row.amounts.push(amount);
      row.dates.push(date);
      if (tx.id != null) row.txIds.push(tx.id);
      groups.set(key, row);
    });
    return Array.from(groups.values()).filter((g) => g.dates.length >= minOccurrences).map((g) => {
      const avgAmount = g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length;
      const min = Math.min(...g.amounts), max = Math.max(...g.amounts);
      const amountStable = avgAmount > 0 && (max - min) / avgAmount <= tolerancePct;
      const sortedDates = g.dates.slice().sort((a, b) => a - b);
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) gaps.push(Math.round((sortedDates[i] - sortedDates[i - 1]) / 86400000));
      const avgGapDays = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
      const monthlyLike = avgGapDays != null && avgGapDays >= 20 && avgGapDays <= 45;
      return {
        key: g.key,
        label: g.label,
        category: g.category,
        occurrences: g.dates.length,
        avgAmount,
        minAmount: min,
        maxAmount: max,
        avgGapDays,
        amountStable,
        monthlyLike,
        confidence: amountStable && monthlyLike ? 'tinggi' : (amountStable || monthlyLike ? 'sedang' : 'rendah'),
        txIds: g.txIds,
        note: 'Kandidat pola berulang; belum dianggap langganan sampai dikonfirmasi pengguna.',
      };
    }).sort((a, b) => b.occurrences - a.occurrences || (b.avgAmount - a.avgAmount));
  },

  dashboardInsight(range, options) {
    const opts = options || {};
    const normalized = this._normalizeRange(range);
    // Dashboard only needs the compact signals it can display. Do not run
    // recurring-candidate or expense-group analysis here; those belong to the
    // full 30-minute audit and are intentionally kept out of the Hub path.
    const eligible = this._eligibleTransactions(normalized);
    const duplicates = this.duplicateDiagnostics(normalized, { ...(opts.duplicates || {}), _eligible: eligible });
    const dataQuality = this.dataQuality(normalized, { _eligible: eligible, _duplicates: duplicates });
    const summary = this.summary(normalized, { _eligible: eligible, _dataQuality: dataQuality });
    const topCategories = this.topCategories(normalized, opts.topLimit || 1, { _eligible: eligible });
    const smallLeakages = this.smallLeakages(normalized, { maxAmount: opts.maxSmallAmount, minCount: opts.minSmallCount, _eligible: eligible });
    const comparison = this.comparison(normalized, { _eligible: eligible, _summary: summary, _dataQuality: dataQuality });
    return { range: normalized, summary, topCategories, smallLeakages, comparison, duplicates, dataQuality };
  },

  audit(range, options) {
    const opts = options || {};
    const normalized = this._normalizeRange(range);
    // S1876+ performance hardening: one eligibility scan is shared by all
    // current-period audit sections. The previous implementation rescanned
    // D.transactions for summary/top/leak/recurring/duplicates/groups and
    // then rescanned again through dataQuality/comparison.
    const eligible = this._eligibleTransactions(normalized);
    const duplicateOptions = { ...(opts.duplicates || {}), _eligible: eligible };
    const duplicates = this.duplicateDiagnostics(normalized, duplicateOptions);
    const dataQuality = this.dataQuality(normalized, { _eligible: eligible, _duplicates: duplicates });
    const summary = this.summary(normalized, { _eligible: eligible, _dataQuality: dataQuality });
    const top = this.topCategories(normalized, opts.topLimit || 3, { _eligible: eligible });
    const leak = this.smallLeakages(normalized, { maxAmount: opts.maxSmallAmount, minCount: opts.minSmallCount, _eligible: eligible });
    const comparison = this.comparison(normalized, { _eligible: eligible, _summary: summary, _dataQuality: dataQuality });
    const recurring = this.recurringCandidates(normalized, { ...(opts.recurring || {}), _eligible: eligible });
    const expenseGroups = this.expenseGroups(normalized, { ...(opts.expenseGroups || {}), _eligible: eligible });
    return { range: normalized, summary, topCategories: top, expenseGroups, smallLeakages: leak, comparison, recurringCandidates: recurring, duplicates, dataQuality };
  },

  dataQuality(range, options) {
    const opts = options || {};
    const q = opts._eligible || this._eligibleTransactions(range);
    const uncategorizedCount = q.rows.filter(({ tx }) =>
      tx.type === 'expense' && !String(tx.category || '').trim()
    ).length;
    const duplicates = opts._duplicates || this.duplicateDiagnostics(range, { _eligible: q });
    const warning = [];
    if (q.stats.totalRecords === 0) warning.push('Belum ada transaksi tercatat.');
    if (q.stats.invalidDateCount > 0) warning.push(`${q.stats.invalidDateCount} transaksi memiliki tanggal tidak valid dan tidak dihitung.`);
    if (uncategorizedCount > 0) warning.push(`${uncategorizedCount} transaksi pengeluaran belum memiliki kategori.`);
    if (q.stats.nonCashCount > 0) warning.push(`${q.stats.nonCashCount} transaksi bertanda "Catatan saja" tidak dihitung ke arus kas.`);
    if (q.stats.nonSelfOwnedCount > 0) warning.push(`${q.stats.nonSelfOwnedCount} transaksi akun non-SELF tidak dimasukkan ke total audit.`);
    warning.push(...duplicates.warnings);
    return {
      ...q.stats,
      uncategorizedCount,
      duplicateIdCount: duplicates.exactIdDuplicateCount,
      duplicateBusinessCount: duplicates.exactBusinessDuplicateCount,
      nearDuplicateGroupCount: duplicates.nearDuplicateGroupCount,
      complete: warning.length === 0,
      warnings: warning,
      hasData: q.stats.eligibleCount > 0,
      range: q.range,
    };
  },
};
