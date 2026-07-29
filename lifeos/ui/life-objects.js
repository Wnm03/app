// ui/life-objects.js — panel ke-7 Life OS (LifeOSLifeObjects). Render lewat
// lifeObjectServiceList(); aksi tulis (create/update/delete) HANYA lewat
// services/life-object-service.js. Fase 1 (Sesi 61) + Fase 2 (Sesi 62) +
// Update UI (Sesi 63, lanjutan keputusan FINAL Sesi 59 — lihat
// docs/PRODUCT_DECISIONS.md § "LifeOS — Life Object UI (FINAL — Sesi 59)"):
//   - List + empty state + create kind:"generic" + archive/delete (Fase 1).
//   - Create kind:"ref" 2-modal showChoiceModal() (domain lalu id, via
//     LIFEOS_OBJECT_REF_SOURCES + adapter domain terkait, REUSE apa
//     adanya — TIDAK ada agregasi/query baru) (Fase 2, Sesi 62).
//   - Update UI (Sesi 63): edit nama (showPromptModal(), prefill) +
//     areaKey (showChoiceModal() dari LIFEOS_AREAS, pola sama create).
//     sourceRef/kind TIDAK diedit — belum ada keputusan produk utk ganti
//     referensi (hapus+buat baru kalau perlu).
//   - Jump-to-source Option (C): domain goal/project reuse
//     lifeOSNavigateToSource() apa adanya (sudah punya sourceKind). Domain
//     knowledge/review pakai mapping lokal di file ini sendiri (duplikasi
//     kecil disengaja, scope sempit — hanya dipakai saat open() Life
//     Object kind:"ref") — TIDAK mengubah knowledgeAdapterList()/
//     LifeOSStore.reviewLog/lifeOSNavigateToSource()/LIFEOS_NAV_MAP.
//   - Domain "finance" (Sesi 71, Batch 6 — "Finance Domain Foundation"):
//     sama pola dgn knowledge/review (mapping lokal di _openRefLocal()),
//     tapi reuse editTx() (modal edit transaksi yang SUDAH ADA) alih-alih
//     showAlertModal() — transaksi sudah punya UI edit sendiri, tidak
//     perlu modal baca-saja baru. _refSourceItems('finance') baca
//     D.transactions apa adanya (TIDAK ada adapter baru).
//   - Domain "financeAccount"/"financeCategory" (Sesi 73, Batch 6 —
//     "Finance Account & Finance Category Foundation"): sama pola dgn
//     "finance" di atas — reuse modal edit yang SUDAH ADA (openAccModal()/
//     openCatModal(), modules/finance/akun.js & kategori.js) alih-alih
//     showAlertModal(). Beda dgn editTx(id) (terima id langsung),
//     openAccModal(idx)/openCatModal(idx,type) terima INDEX array (bukan
//     id) — jadi _openRefLocal() cari idx-nya dulu dari D.accounts/
//     D.categories[type] sebelum manggil, TIDAK mengubah signature modal
//     lama. _refSourceItems() baca D.accounts/D.categories.income+expense
//     apa adanya (TIDAK ada adapter baru, TIDAK ada agregasi/query baru —
//     mis. TIDAK memanggil recalcAccBalance()).

const LifeOSLifeObjects = {
  render() {
    const el = document.getElementById('lifeOSLifeObjectsGrid');
    if (!el) return;
    const objects = lifeObjectServiceList();
    el.innerHTML = objects.length
      ? objects.map((o) => `
        <div class="lifeos-project-card" data-action="LifeOSLifeObjects.open" data-args='["${o.id}"]'>
          <div class="lifeos-project-name">${o.kind === 'ref' ? '🔗' : '🧩'} ${escapeHtml(o.name || '')}</div>
          <div class="lifeos-project-meta">${escapeHtml(o.areaKey || '')}</div>
          <button class="btn btn-ghost" data-action="LifeOSLifeObjects.promptEdit" data-args='["${o.id}"]' title="Edit">✏️</button>
          <button class="btn btn-ghost" data-action="LifeOSLifeObjects.remove" data-args='["${o.id}"]' title="Hapus">🗑️</button>
        </div>
      `).join('')
      : '<div class="empty"><div class="empty-text">Belum ada Life Object</div></div>';
  },

  /** Buka satu Life Object. kind:"generic" tidak punya referensi lama
   * (lahir di Life OS sendiri, pola sama dgn project generic) -> toast
   * saja. kind:"ref" -> resolve sourceRef.domain lewat mapping lokal di
   * bawah (Risiko #1 opsi c). */
  open(id) {
    const obj = lifeObjectServiceGet(id);
    if (!obj) return;
    if (obj.kind !== 'ref' || !obj.sourceRef) {
      if (typeof toast === 'function') toast('🌱 Life Object ini murni tersimpan di Life OS — belum ada halaman lama untuk ini.');
      return;
    }
    const { domain, id: sourceId } = obj.sourceRef;

    // domain goal/project: sudah punya sourceKind sendiri lewat adapter
    // masing2 -> reuse lifeOSNavigateToSource() apa adanya, TIDAK ditulis
    // ulang di sini.
    if (domain === 'goal' || domain === 'project') {
      const resolved = typeof lifeOSObjectRefResolve === 'function' ? lifeOSObjectRefResolve(domain, sourceId) : null;
      if (!resolved) {
        if (typeof toast === 'function') toast('⚠️ Referensi tidak ditemukan');
        return;
      }
      if (typeof lifeOSNavigateToSource === 'function') {
        lifeOSNavigateToSource(domain === 'goal' ? resolved.sourceKind : resolved.kind, resolved.sourceId || resolved.id);
      }
      return;
    }

    // domain knowledge/review: TIDAK ada halaman/modal lama utk ini
    // (knowledgeAdapterList()/reviewLog murni data Life OS sendiri, bukan
    // lensa ke modul lain) -> mapping lokal opsi (c): tampilkan isinya
    // lewat showAlertModal() (modal generik yang sudah ada), bukan
    // menambah sistem navigasi/modal baru.
    LifeOSLifeObjects._openRefLocal(domain, sourceId);
  },

  _openRefLocal(domain, sourceId) {
    const resolved = typeof lifeOSObjectRefResolve === 'function' ? lifeOSObjectRefResolve(domain, sourceId) : null;
    if (!resolved) {
      if (typeof toast === 'function') toast('⚠️ Referensi tidak ditemukan');
      return;
    }
    if (typeof showAlertModal !== 'function') return;
    if (domain === 'knowledge') {
      showAlertModal(resolved.content || '', { icon: '💡', title: resolved.title || 'Knowledge' });
      return;
    }
    if (domain === 'review') {
      const status = resolved.completedAt ? `Selesai ${resolved.completedAt}` : 'Belum selesai';
      showAlertModal(`${status}${resolved.notes ? '\n\n' + resolved.notes : ''}`, { icon: '🔁', title: `Review ${resolved.period || ''}` });
      return;
    }
    // finance — Sesi 71 (Batch 6). Beda dgn knowledge/review (yang tidak
    // punya halaman/modal lama, ditampilkan lewat showAlertModal()),
    // transaksi SUDAH punya modal edit sendiri (editTx(), modules/finance/
    // transaksi.js) — reuse APA ADANYA (guard typeof, pola sama seluruh
    // file ini), TIDAK ditulis ulang jadi entri LIFEOS_NAV_MAP baru krn
    // sourceId di sini adalah id transaksi langsung (bukan sourceKind Today/
    // Goal/Project yang dikonsumsi lifeOSNavigateToSource()).
    if (domain === 'finance') {
      if (typeof editTx === 'function') editTx(sourceId);
      return;
    }
    // financeAccount — Sesi 73 (Batch 6). Sama pola dgn "finance" di atas
    // (reuse modal edit yang SUDAH ADA), tapi openAccModal(idx) terima
    // INDEX array (bukan id) — jadi cari idx-nya dulu dari D.accounts
    // via sourceId SEBELUM manggil, TIDAK mengubah signature openAccModal().
    if (domain === 'financeAccount') {
      if (typeof D === 'undefined' || !D.accounts) return;
      const idx = D.accounts.findIndex((a) => a.id === sourceId);
      if (idx === -1) return;
      if (typeof openAccModal === 'function') openAccModal(idx);
      return;
    }
    // financeCategory — Sesi 73 (Batch 6). Sama pola. `resolved.type`
    // ('income'/'expense') datang dari LIFEOS_OBJECT_REF_SOURCES.
    // financeCategory.resolver() (lifeos-registry.js) — dipakai utk tahu
    // array D.categories mana yg harus dicari idx-nya + diteruskan ke
    // openCatModal(idx, type), TIDAK mengubah signature openCatModal().
    if (domain === 'financeCategory') {
      if (typeof D === 'undefined' || !D.categories || typeof resolved.type !== 'string') return;
      const idx = (D.categories[resolved.type] || []).findIndex((c) => c.id === sourceId);
      if (idx === -1) return;
      if (typeof openCatModal === 'function') openCatModal(idx, resolved.type);
      return;
    }
  },

  async createGeneric(name, areaKey) {
    const result = await lifeObjectServiceCreate({ name, areaKey, kind: 'generic' });
    if (!result.valid) {
      if (typeof toast === 'function') toast('⚠️ ' + result.error);
      return result;
    }
    LifeOSLifeObjects.render();
    if (typeof LifeOSHome !== 'undefined') LifeOSHome.render();
    return result;
  },

  /** Alur create kind:"generic" lewat showPromptModal() (nama) lalu
   * showChoiceModal() (areaKey dari LIFEOS_AREAS, dropdown - bukan input
   * bebas teks, sesuai keputusan FINAL Sesi 59). */
  async promptCreateGeneric() {
    if (typeof showPromptModal !== 'function') return;
    const name = await showPromptModal({ title: 'Life Object Baru', message: 'Nama Life Object', placeholder: 'Nama...' });
    if (!name) return;
    if (typeof showChoiceModal !== 'function') return;
    const areas = typeof LIFEOS_AREAS !== 'undefined' ? LIFEOS_AREAS : [];
    const choiceIdx = await showChoiceModal({
      title: 'Pilih Area',
      message: 'Life Object ini masuk area mana?',
      choices: areas.map((a) => ({ label: `${a.icon || ''} ${a.label}`.trim() })),
    });
    if (choiceIdx === null || choiceIdx === undefined || !areas[choiceIdx]) return;
    await LifeOSLifeObjects.createGeneric(name, areas[choiceIdx].key);
  },

  async createRef(name, areaKey, sourceRef) {
    const result = await lifeObjectServiceCreate({ name, areaKey, kind: 'ref', sourceRef });
    if (!result.valid) {
      if (typeof toast === 'function') toast('⚠️ ' + result.error);
      return result;
    }
    LifeOSLifeObjects.render();
    if (typeof LifeOSHome !== 'undefined') LifeOSHome.render();
    return result;
  },

  /** Daftar item yang bisa dijadikan sourceRef utk 1 domain — REUSE adapter
   * domain terkait apa adanya (goalAdapterList/projectAdapterList/
   * knowledgeAdapterList/LifeOSStore.reviewLog), TIDAK ada agregasi/query
   * baru. Balik [] (aman, tidak throw) kalau dependency belum ter-load.
   *
   * `filter` (opsional, Sesi 72 Batch 6 — Finance Domain: builder filter):
   * HANYA dipakai domain "finance" saat ini — `{ type: 'income'|'expense' }`
   * mempersempit D.transactions berdasarkan field `type` SEBELUM di-map ke
   * {id,label}. Filter TIDAK mengubah bentuk sourceRef (tetap nunjuk 1
   * transaksi tunggal) — murni mempersempit daftar pilihan di picker.
   * Domain lain mengabaikan parameter ini (belum ada kebutuhan produk). */
  _refSourceItems(domain, filter) {
    const store = typeof lifeOSGetStore === 'function' ? lifeOSGetStore() : null;
    if (domain === 'goal') {
      if (typeof D === 'undefined' || typeof goalAdapterList !== 'function') return [];
      return goalAdapterList(D).map((g) => ({ id: g.id, label: g.name }));
    }
    if (domain === 'project') {
      if (typeof D === 'undefined' || !store || typeof projectAdapterList !== 'function') return [];
      return projectAdapterList(D, store).map((p) => ({ id: p.id, label: p.name }));
    }
    if (domain === 'knowledge') {
      if (!store || typeof knowledgeAdapterList !== 'function') return [];
      return knowledgeAdapterList(store).map((k) => ({ id: k.id, label: k.title }));
    }
    if (domain === 'review') {
      if (!store) return [];
      return (store.reviewLog || []).map((r) => ({
        id: r.id,
        label: `${r.period || ''} ${r.completedAt ? '· ' + r.completedAt : '(belum selesai)'}`.trim(),
      }));
    }
    // finance — Sesi 71 (Batch 6, Finance Domain Foundation). D.transactions
    // dibaca apa adanya (TIDAK ada adapter list terpisah, sama pola dgn
    // domain review di atas yang baca store.reviewLog langsung). fmtFull()
    // dipakai kalau tersedia (guard typeof, pola sama seluruh file ini).
    if (domain === 'finance') {
      if (typeof D === 'undefined' || !D.transactions) return [];
      const txs = (filter && filter.type)
        ? D.transactions.filter((t) => t.type === filter.type)
        : D.transactions;
      return txs.map((t) => ({
        id: t.id,
        label: `${t.category || 'Transaksi'}${t.subcategory ? ' / ' + t.subcategory : ''} · ${typeof fmtFull === 'function' ? fmtFull(t.amount) : t.amount} · ${t.date || ''}`.trim(),
      }));
    }
    // financeAccount — Sesi 73 (Batch 6, Finance Account & Finance
    // Category Foundation). D.accounts dibaca apa adanya (TIDAK ada
    // adapter list terpisah, TIDAK memanggil recalcAccBalance() — sama
    // disiplin "no agregasi baru" dgn domain finance di atas).
    if (domain === 'financeAccount') {
      if (typeof D === 'undefined' || !D.accounts) return [];
      return D.accounts.map((a) => ({ id: a.id, label: `${a.emoji || ''} ${a.name || ''}`.trim() }));
    }
    // financeCategory — Sesi 73 (Batch 6, sama pola). D.categories.income +
    // D.categories.expense digabung apa adanya (TIDAK ada subs/subkategori
    // ikut dilist — scope foundation ini murni kategori level atas).
    if (domain === 'financeCategory') {
      if (typeof D === 'undefined' || !D.categories) return [];
      const income = (D.categories.income || []).map((c) => ({ id: c.id, label: `${c.emoji || ''} ${c.name || ''} (Pemasukan)`.trim() }));
      const expense = (D.categories.expense || []).map((c) => ({ id: c.id, label: `${c.emoji || ''} ${c.name || ''} (Pengeluaran)`.trim() }));
      return income.concat(expense);
    }
    return [];
  },

  /** Alur create kind:"ref" — 2 tahap showChoiceModal() (pilih domain dari
   * LIFEOS_OBJECT_REF_SOURCES, lalu pilih id dari domain terkait lewat
   * _refSourceItems()), lalu showPromptModal() (nama) + showChoiceModal()
   * (areaKey dari LIFEOS_AREAS, pola sama Fase 1/promptCreateGeneric()). */
  async promptCreateRef() {
    if (typeof showChoiceModal !== 'function') return;
    const sources = typeof LIFEOS_OBJECT_REF_SOURCES !== 'undefined' ? LIFEOS_OBJECT_REF_SOURCES : {};
    const domains = Object.keys(sources);
    if (!domains.length) return;
    const domainIdx = await showChoiceModal({
      title: 'Pilih Sumber',
      message: 'Life Object ini merujuk ke domain apa?',
      choices: domains.map((d) => ({ label: sources[d].label || d })),
    });
    if (domainIdx === null || domainIdx === undefined || !domains[domainIdx]) return;
    const domain = domains[domainIdx];

    // Sesi 72 (Batch 6) — builder filter: domain "finance" saja, tanya tipe
    // transaksi dulu (Semua/Pemasukan/Pengeluaran) sebelum daftar item,
    // supaya picker tidak perlu scroll semua transaksi kalau datanya banyak.
    // sourceRef akhir tetap {domain:'finance', id:<1 transaksi>} — filter ini
    // murni mempersempit pilihan, bukan struktur ref baru.
    let financeFilter;
    if (domain === 'finance') {
      const filterIdx = await showChoiceModal({
        title: 'Filter Transaksi',
        message: 'Tampilkan transaksi tipe apa?',
        choices: [{ label: 'Semua' }, { label: 'Pemasukan' }, { label: 'Pengeluaran' }],
      });
      if (filterIdx === null || filterIdx === undefined) return;
      if (filterIdx === 1) financeFilter = { type: 'income' };
      else if (filterIdx === 2) financeFilter = { type: 'expense' };
    }

    const items = LifeOSLifeObjects._refSourceItems(domain, financeFilter);
    if (!items.length) {
      if (typeof toast === 'function') toast('⚠️ Belum ada data di sumber ini');
      return;
    }
    const itemIdx = await showChoiceModal({
      title: 'Pilih Item',
      message: `Pilih ${sources[domain].label || domain} yang ingin dijadikan referensi`,
      choices: items.map((it) => ({ label: it.label })),
    });
    if (itemIdx === null || itemIdx === undefined || !items[itemIdx]) return;
    const sourceId = items[itemIdx].id;

    if (typeof showPromptModal !== 'function') return;
    const name = await showPromptModal({ title: 'Life Object Baru', message: 'Nama Life Object', placeholder: 'Nama...' });
    if (!name) return;

    const areas = typeof LIFEOS_AREAS !== 'undefined' ? LIFEOS_AREAS : [];
    const areaIdx = await showChoiceModal({
      title: 'Pilih Area',
      message: 'Life Object ini masuk area mana?',
      choices: areas.map((a) => ({ label: `${a.icon || ''} ${a.label}`.trim() })),
    });
    if (areaIdx === null || areaIdx === undefined || !areas[areaIdx]) return;

    await LifeOSLifeObjects.createRef(name, areas[areaIdx].key, { domain, id: sourceId });
  },

  /** Update nama/areaKey Life Object — sourceRef/kind TIDAK diedit (belum
   * ada keputusan produk utk ganti referensi; hapus+buat baru kalau perlu
   * ganti). lifeObjectServiceUpdate() sudah ada sejak Sesi 58, di sini
   * cuma dipanggil apa adanya. */
  async update(id, name, areaKey) {
    const result = await lifeObjectServiceUpdate(id, { name, areaKey });
    if (!result.valid) {
      if (typeof toast === 'function') toast('⚠️ ' + result.error);
      return result;
    }
    LifeOSLifeObjects.render();
    if (typeof LifeOSHome !== 'undefined') LifeOSHome.render();
    return result;
  },

  /** Alur edit — showPromptModal() (nama, prefill dari obj.name) lalu
   * showChoiceModal() (areaKey dari LIFEOS_AREAS, pola sama create). */
  async promptEdit(id) {
    const obj = lifeObjectServiceGet(id);
    if (!obj) return;
    if (typeof showPromptModal !== 'function') return;
    const name = await showPromptModal({
      title: 'Edit Life Object', message: 'Nama Life Object', placeholder: 'Nama...', defaultValue: obj.name,
    });
    if (!name) return;
    if (typeof showChoiceModal !== 'function') return;
    const areas = typeof LIFEOS_AREAS !== 'undefined' ? LIFEOS_AREAS : [];
    const choiceIdx = await showChoiceModal({
      title: 'Pilih Area',
      message: 'Life Object ini masuk area mana?',
      choices: areas.map((a) => ({ label: `${a.icon || ''} ${a.label}`.trim() })),
    });
    if (choiceIdx === null || choiceIdx === undefined || !areas[choiceIdx]) return;
    await LifeOSLifeObjects.update(id, name, areas[choiceIdx].key);
  },

  async remove(id) {
    if (typeof askConfirm !== 'function') return;
    const ok = await askConfirm('Hapus Life Object ini?', { title: 'Hapus Life Object', icon: '🗑️' });
    if (!ok) return;
    await lifeObjectServiceDelete(id);
    LifeOSLifeObjects.render();
    if (typeof LifeOSHome !== 'undefined') LifeOSHome.render();
  },
};
