// titipan-expense-ui.js — Sesi 521 (S521-B2, UI ONLY, DESIGN-S520-DANA-
// TITIPAN-UI-MULTIOWNER.md, baseline v1251/S519 + S521-A/S521-B1).
//
// Scope: SATU-SATUNYA hal baru di sesi ini adalah `TitipanExpenseUI` —
// controller DOM tipis buat modal `titipanExpenseModal` (HTML-nya SUDAH
// dibuat S521-B1 di modules/shared/modals.js, TIDAK disentuh lagi di sini
// selain menambah oninput/onblur pada 1 field Jumlah supaya nyambung ke
// controller ini — lihat catatan di bawah). TIDAK ada perubahan ke
// `TitipanExpenseFlow` (titipan-expense-flow.js, S521-A) ATAU primitive
// S519 (`applyTxTitipanLinkageOnSave()`/`maybeCreateTitipanTalanganPiutang()`/
// `delTx()` dst) — file ini MURNI baca form -> panggil
// `TitipanExpenseFlow.validate()`/`submit()` yang sudah ada & teruji.
//
// Pola mengikuti UI serupa yang sudah ada di repo ini:
//   - Draft-array + render-ulang-list (bukan querySelectorAll) — pola SAMA
//     PERSIS `Aset._renderOwnersList()`/`addOwnerRow()`/`onOwnerPorsiInput()`
//     (modules/asset/aset.js) & `InvestmentUI` owners modal: tiap baris
//     checkbox/porsi punya index eksplisit lewat inline
//     oninput="TitipanExpenseUI.xxx(i,this.value)", BUKAN class selector +
//     querySelectorAll (lebih gampang dites tanpa perlu DOM stub stateful
//     penuh, & konsisten sama codebase).
//   - save() dibungkus `withSaveGuardAsync('titipanExpense',
//     'titipanExpenseModal', fn)` — pola sama `Piutang.save()`/dst — SEBAGAI
//     TAMBAHAN thd guard `_submitting` yang sudah ada di dalam
//     `TitipanExpenseFlow.submit()` sendiri (S521-A §17); dua lapis guard
//     ini tidak saling menduplikasi logic, cuma menutup 2 sumber re-entrant
//     berbeda (klik ganda di DOM vs pemanggilan langsung submit()).
//
// Field HTML yang dipakai (SEMUA sudah ada di titipanExpenseModal, S521-B1):
//   titipanExpenseAmt, titipanExpenseAmtPreview, titipanExpenseOwnersList,
//   titipanExpenseSplitPreview, titipanExpenseTalangan, titipanExpenseNote,
//   titipanExpenseDate, titipanExpensePortfolioInfo, titipanExpenseSaveBtn,
//   titipanExpenseDelBtn.
//
// Keputusan wiring (didokumentasikan eksplisit, BUKAN scope creep diam2):
//   1. Field "Kategori / Keterangan" (titipanExpenseNote) dipakai sbg
//      `category` (fallback 'Dana Titipan' kalau kosong) SEKALIGUS `note`
//      transaksi -- modal ini sengaja 1 field bebas teks (bukan dropdown
//      kategori txModal), sesuai Design Lock §18 ("mengikuti
//      kategori/metadata transaksi existing yang sesuai" -- expense biasa
//      tetap punya field category string, cuma sumbernya di sini 1 field
//      gabungan, bukan 2 field terpisah).
//   2. Modal ini TIDAK punya selector Akun (beda dari txModal) -- per
//      Design Lock §21, tidak ada field D baru yang boleh ditambah di luar
//      wiring yang disetujui eksplisit di S521; account picker akan
//      ditambah sesi terpisah kalau dibutuhkan. Sementara itu accountId
//      default ke akun pertama (`D.accounts[0].id`), pola fallback yang
//      SAMA PERSIS dipakai di banyak titik lain di app (mis.
//      `modules/finance/tagihan-kalender.js` baris `accountId:
//      b.accountId||D.accounts[0]?.id||''`, `pajak-pbb-zakat.js`, dst).
//   3. `titipanExpenseAmt` (S521-B1) belum py oninput/onblur -- ditambah 1
//      baris di modals.js sesi ini (oninput=preview jumlah+split,
//      onblur=evalAmtExpr sama seperti field jumlah lain di app) supaya
//      preview real-time & ekspresi kalkulator ("1.500.000+250.000")
//      benar2 jalan -- TANPA mengubah bagian modal lain (struktur/field
//      lain titipanExpenseModal PERSIS punya S521-B1).
//   4. Tombol Hapus (`titipanExpenseDelBtn`) SELALU disembunyikan --
//      modal ini murni "catat baru" (submit() SELALU membuat transaksi
//      baru, tidak ada mode edit), DELETE tetap satu2nya lewat `delTx()`
//      dari Riwayat Transaksi Keuangan (Design Lock §14). deleteFromModal()
//      cuma diisi supaya data-action tidak error kalau tak sengaja ke-klik.

const TitipanExpenseUI = {

  // _draft — array {ownerId, ownerName, selected, porsi} hasil
  // DanaTitipanPortfolioAPI.listExistingOwners() saat open(). Index di
  // draft ini yang dipakai sbg argumen inline (toggleOwner(i,...)/
  // onPorsiInput(i,...)) -- BUKAN ownerId langsung -- supaya render ulang
  // list tetap murah (tidak perlu re-fetch listExistingOwners() tiap
  // ketik) & konsisten sama pola Aset._ownersDraft.
  _draft: [],

  // open() — reset seluruh form + isi daftar owner dari
  // DanaTitipanPortfolioAPI.listExistingOwners() (Design Lock §6: HANYA
  // owner existing, tidak bisa bikin baru di sini). 0 tulis ke D.
  open() {
    if (typeof TitipanExpenseFlow === 'undefined' || typeof DanaTitipanPortfolioAPI === 'undefined') {
      if (typeof toast === 'function') toast('⚠️ Fitur pengeluaran dana titipan belum siap dimuat');
      return;
    }
    const owners = (typeof DanaTitipanPortfolioAPI.listExistingOwners === 'function')
      ? (DanaTitipanPortfolioAPI.listExistingOwners() || []) : [];
    this._draft = owners.map((o) => ({ ownerId: o.ownerId, ownerName: o.ownerName, selected: false, porsi: null }));
    this._renderOwnersList();

    const amtEl = document.getElementById('titipanExpenseAmt');
    if (amtEl) amtEl.value = '';
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanExpenseAmt', 'titipanExpenseAmtPreview');
    const talanganEl = document.getElementById('titipanExpenseTalangan');
    if (talanganEl) talanganEl.checked = false;
    const noteEl = document.getElementById('titipanExpenseNote');
    if (noteEl) noteEl.value = '';
    const dateEl = document.getElementById('titipanExpenseDate');
    if (dateEl) dateEl.value = (typeof todayStr === 'function') ? todayStr() : '';
    const previewEl = document.getElementById('titipanExpenseSplitPreview');
    if (previewEl) previewEl.innerHTML = '';
    const infoEl = document.getElementById('titipanExpensePortfolioInfo');
    if (infoEl) infoEl.innerHTML = owners.length ? '' : '';
    const delBtn = document.getElementById('titipanExpenseDelBtn');
    if (delBtn) delBtn.style.display = 'none';

    if (typeof openModal === 'function') openModal('titipanExpenseModal');
  },

  // _renderOwnersList() — render ulang #titipanExpenseOwnersList dari
  // _draft. Kolom porsi (%) HANYA muncul kalau >1 owner tercentang
  // (Design Lock §7 single-owner: porsi tidak relevan). Dipanggil tiap
  // ada perubahan centang (bukan tiap ketik porsi, supaya fokus input
  // porsi tidak hilang -- pola sama Aset._renderOwnersList()).
  _renderOwnersList() {
    const listBox = document.getElementById('titipanExpenseOwnersList');
    if (!listBox) return;
    if (!this._draft.length) {
      listBox.innerHTML = '<div class="empty"><div class="empty-text">Belum ada owner Dana Titipan. Catat Pokok Dana Titipan dulu.</div></div>';
      return;
    }
    const selectedCount = this._draft.filter((o) => o.selected).length;
    listBox.innerHTML = this._draft.map((o, i) => {
      const porsiField = (selectedCount > 1 && o.selected)
        ? `<input type="number" class="fi" id="titipanExpenseOwnerPorsi${i}" style="width:70px" placeholder="%" inputmode="decimal" value="${o.porsi !== null && o.porsi !== undefined ? o.porsi : ''}" oninput="TitipanExpenseUI.onPorsiInput(${i},this.value)">`
        : '';
      return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
        <input type="checkbox" style="width:16px;height:16px" ${o.selected ? 'checked' : ''} onchange="TitipanExpenseUI.toggleOwner(${i},this.checked)">
        <span style="flex:1;font-size:13px">${escapeHtml(o.ownerName)}</span>
        ${porsiField}
      </label>`;
    }).join('');
  },

  // toggleOwner(i, checked) — murni ubah draft di memori + render ulang
  // list (supaya kolom porsi muncul/hilang sesuai jumlah tercentang) +
  // update preview split. 0 tulis ke D.
  toggleOwner(i, checked) {
    if (!this._draft[i]) return;
    this._draft[i].selected = !!checked;
    this._renderOwnersList();
    this._updateSplitPreview();
  },

  // onPorsiInput(i, val) — murni ubah draft.porsi, TIDAK render ulang
  // list (supaya fokus input tidak hilang tiap ketik), cuma update
  // preview split.
  onPorsiInput(i, val) {
    if (!this._draft[i]) return;
    this._draft[i].porsi = (val === '' || val === null || typeof val === 'undefined') ? null : parseFloat(val);
    this._updateSplitPreview();
  },

  // onAmtInput() — dipanggil dari oninput field Jumlah (lihat catatan
  // wiring §3 di atas file). Cuma update preview split, TIDAK menyentuh D.
  onAmtInput() {
    this._updateSplitPreview();
  },

  // onNoteInput() — S(baru): auto-suggest owner dari isi field Kategori/
  // Keterangan (titipanExpenseNote). Kalau catatan yang diketik mengandung
  // PERSIS NAMA 1 owner existing (case-insensitive substring match) DAN
  // belum ada owner manapun yang tercentang (supaya TIDAK menimpa pilihan
  // manual user), owner itu otomatis tercentang -- murni kemudahan input,
  // user tetap bebas uncheck/ubah manual kapan saja setelahnya. Kalau
  // catatan cocok ke >1 nama owner sekaligus (ambigu) atau tidak ada yang
  // cocok, tidak ada yang diubah. 0 tulis ke D, pola sama toggleOwner().
  onNoteInput() {
    const noteEl = document.getElementById('titipanExpenseNote');
    const note = noteEl ? String(noteEl.value || '').trim().toLowerCase() : '';
    if (!note || !this._draft.length) return;
    if (this._draft.some((o) => o.selected)) return;
    const matches = this._draft.filter((o) => o.ownerName && note.indexOf(String(o.ownerName).toLowerCase()) !== -1);
    if (matches.length !== 1) return;
    const idx = this._draft.indexOf(matches[0]);
    this._draft[idx].selected = true;
    this._renderOwnersList();
    this._updateSplitPreview();
  },

  // _readAmount() — baca nilai numerik field Jumlah (sudah dibersihkan
  // dari format ribuan/simbol Rp kalau evalAmtExpr belum sempat jalan).
  _readAmount() {
    const amtEl = document.getElementById('titipanExpenseAmt');
    if (!amtEl) return NaN;
    const raw = String(amtEl.value || '').replace(/[^\d.-]/g, '');
    return raw === '' ? NaN : parseFloat(raw);
  },

  // _selectedOwnersInput() — bentuk owners[] sesuai shape yang diterima
  // TitipanExpenseFlow.validate()/submit() ({ownerId} utk single,
  // {ownerId,porsi} utk multi) -- 0 validasi di sini, murni transformasi
  // draft -> input flow (validasi 100% didelegasikan ke
  // TitipanExpenseFlow, S521-A).
  _selectedOwnersInput() {
    const sel = this._draft.filter((o) => o.selected);
    if (sel.length <= 1) return sel.map((o) => ({ ownerId: o.ownerId }));
    return sel.map((o) => ({ ownerId: o.ownerId, porsi: o.porsi }));
  },

  // _updateSplitPreview() — panggil TitipanExpenseFlow.computeSplitRows()
  // (PURE, sudah ada sejak S521-A) buat preview pembagian nominal
  // real-time, TIDAK menyentuh D sama sekali (beda dari submit()).
  _updateSplitPreview() {
    const previewEl = document.getElementById('titipanExpenseSplitPreview');
    if (!previewEl) return;
    if (typeof TitipanExpenseFlow === 'undefined') { previewEl.innerHTML = ''; return; }
    const nominal = this._readAmount();
    const ownersInput = this._selectedOwnersInput();
    if (!ownersInput.length || !nominal || !isFinite(nominal) || nominal <= 0) { previewEl.innerHTML = ''; return; }
    const resolved = ownersInput.map((o) => {
      const known = this._draft.find((d) => d.ownerId === o.ownerId);
      return { ownerId: o.ownerId, ownerName: known ? known.ownerName : o.ownerId, porsi: ownersInput.length === 1 ? 100 : o.porsi };
    });
    const split = TitipanExpenseFlow.computeSplitRows(nominal, resolved);
    if (!split.ok) {
      previewEl.innerHTML = '<span style="color:var(--accent2)">⚠️ ' + escapeHtml(split.reason) + '</span>';
      return;
    }
    previewEl.innerHTML = split.rows
      .map((r) => escapeHtml(r.ownerName) + ': ' + (typeof fmt === 'function' ? fmt(r.amount) : String(r.amount)))
      .join(' &middot; ');
  },

  // save() — baca form -> TitipanExpenseFlow.submit() (SATU-SATUNYA jalur
  // penulisan ke D.transactions, 0 logic ditulis ulang di sini, pola sama
  // DanaTitipanCommitmentUI.save()/DanaTitipanReturnUI.save()). Dibungkus
  // withSaveGuardAsync() (Design Lock §17 duplicate-submit, LAPIS UI --
  // TitipanExpenseFlow._submitting sendiri sudah jadi LAPIS logic).
  async save() {
    if (typeof TitipanExpenseFlow === 'undefined') {
      if (typeof toast === 'function') toast('⚠️ Fitur pengeluaran dana titipan belum siap dimuat');
      return;
    }
    const run = async () => {
      if (typeof evalAmtExpr === 'function') evalAmtExpr('titipanExpenseAmt');
      const nominal = this._readAmount();
      const ownersInput = this._selectedOwnersInput();
      if (!ownersInput.length) {
        if (typeof toast === 'function') toast('⚠️ Pilih minimal satu pemilik Dana Titipan');
        return;
      }
      const noteEl = document.getElementById('titipanExpenseNote');
      const note = noteEl ? String(noteEl.value || '').trim() : '';
      const dateEl = document.getElementById('titipanExpenseDate');
      const date = dateEl ? dateEl.value : '';
      const talanganEl = document.getElementById('titipanExpenseTalangan');
      const talangan = !!(talanganEl && talanganEl.checked);
      const accountId = (typeof D !== 'undefined' && D && Array.isArray(D.accounts) && D.accounts[0]) ? D.accounts[0].id : '';

      const input = {
        nominal,
        owners: ownersInput,
        category: note || 'Dana Titipan',
        subcategory: '',
        accountId,
        date,
        note,
        talangan,
      };
      const res = TitipanExpenseFlow.submit(input);
      if (!res || !res.ok) {
        if (typeof toast === 'function') toast('⚠️ ' + ((res && res.reason) || 'Gagal menyimpan pengeluaran dana titipan'));
        return;
      }
      if (typeof closeModal === 'function') closeModal('titipanExpenseModal');
      if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
      if (typeof renderKeuangan === 'function') renderKeuangan();
      if (typeof toast === 'function') {
        toast(res.txIds.length > 1
          ? ('✅ ' + res.txIds.length + ' transaksi pengeluaran dana titipan tersimpan')
          : '✅ Pengeluaran dana titipan tersimpan');
      }
    };
    if (typeof withSaveGuardAsync === 'function') {
      await withSaveGuardAsync('titipanExpense', 'titipanExpenseModal', run);
    } else {
      await run();
    }
  },

  // deleteFromModal() — tombol ini SELALU disembunyikan oleh open() (lihat
  // catatan §4 di atas file); fungsi ini cuma jaga2 supaya data-action
  // tidak error kalau ke-trigger. TIDAK memanggil delTx() dari sini --
  // DELETE tetap 100% lewat Riwayat Transaksi (Design Lock §14).
  async deleteFromModal() {
    if (typeof toast === 'function') toast('ℹ️ Hapus transaksi pengeluaran dana titipan lewat Riwayat Transaksi di tab Keuangan.');
  },

};

if (typeof window !== 'undefined') {
  window.TitipanExpenseUI = TitipanExpenseUI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitipanExpenseUI;
}
