// investasi-view.js — InvestmentUI: modal "⚖️ Atur Porsi Kepemilikan" untuk holding investasi
// (S464, lanjutan AUD-008/S462). File BARU, terpisah dari investasi.js (logika murni, 0 DOM) —
// pola sama persis dashboard-hub-favorit.js vs dashboard-hub-favorit-view.js, supaya investasi.js
// tetap gampang dites lewat loadSource() tanpa DOM.
//
// Mirror Aset.openOwnersModal()/_renderOwnersList()/updateOwnersTotal()/addOwnerRow()/
// removeOwnerRow()/onOwnerNameInput()/onOwnerPorsiInput()/onOwnerIsSelfToggle()/saveOwners()/
// resetOwners() di aset.js (S392a-S453) — draft pemilik disimpan di memori
// (InvestmentUI._ownersDraft, SALINAN — bukan referensi ke D.investments langsung) sampai user tap
// "Simpan Porsi", indikator total porsi interaktif (hijau = pas 100%, merah = belum), tombol Simpan
// dimatikan otomatis kalau total belum pas 100% (sinkron syarat MultiOwnerEngine.validateOwners()).
// Validasi & penyimpanan 100% reuse Investment.setOwners() (SUDAH ADA sejak S462, yang di dalamnya
// delegasi penuh ke MultiOwnerEngine) — TIDAK ada rumus/validasi porsi baru ditulis di sini.
//
// SESI 551 (audit S540/B1-B12 rekomendasi #1): tambah field "Nominal (Rp)" per baris. Basis:
// Investment.holdingValue(h) (nilai pasar terkini holding, SUDAH ADA sejak awal investasi.js, 0
// rumus baru) x draft[i].porsi/100.
//
// SESI 552 (permintaan user: "nominal bisa diubah dan persen menyesuaikan atau sebaliknya"):
// field Nominal (Rp) sebelumnya READ-ONLY (S551) — sekarang DUA ARAH, mirror pola
// Aset.onOwnerPorsiInput()/onOwnerNominalInput() (S429/S457): ketik Porsi (%) -> Nominal (Rp)
// baris ini ikut sync live (_updateOwnerNominalDisplay), ketik Nominal (Rp) -> Porsi (%) baris
// ini dihitung ulang & disinkronkan balik (onOwnerNominalInput, presisi 4 desimal sama S457).
// Basis konversi tunggal: holding investasi SELALU punya Investment.holdingValue() (diturunkan
// dari riwayat transaksi, beda dari Aset yang nilainya manual & bisa 0) — jadi TIDAK perlu cabang
// "nilai belum diisi"/nilai tersirat seperti Aset.onOwnerNominalInput(), & TIDAK perlu
// _autoDistributeRemaining() ke baris lain (di luar cakupan permintaan — user cuma minta field
// ini bisa diedit dua arah, bukan auto-bagi sisa ke pemilik lain). 0 field baru di draft/holding —
// porsi tetap satu-satunya sumber kebenaran yang dibaca saveOwners()/updateOwnersTotal(), Nominal
// murni tampilan+input turunan.

const InvestmentUI = {
  // _ownersDraft — salinan array pemilik yang sedang diedit di modal ini (aman diubah lewat
  // addOwnerRow/removeOwnerRow/onOwnerNameInput/onOwnerPorsiInput/onOwnerIsSelfToggle tanpa
  // menyentuh h.owners asli sampai saveOwners() benar-benar dipanggil).
  _ownersDraft: [],
  // _ownersModalHolding — holding (D.investments[i]) yang sedang dibuka di modal ini, null kalau
  // id yang diberikan ke openOwnersModal() tidak ditemukan.
  _ownersModalHolding: null,

  // openOwnersModal(id) — dipanggil dgn id holding LANGSUNG (beda dari Aset.openOwnersModal() yang
  // baca Aset.editId — investasi belum punya "form Tambah/Edit Holding" terpusat spt assetModal,
  // jadi caller di file lain cukup lempar id holding-nya langsung, mis.
  // data-action="InvestmentUI.openOwnersModal" data-args='["<id>"]').
  openOwnersModal(id) {
    const h = id ? Investment.getHolding(id) : null;
    const nameBox = document.getElementById('investmentOwnersHoldingName');
    if (nameBox) nameBox.textContent = h ? ('📋 ' + h.name) : '';
    InvestmentUI._ownersModalHolding = h;
    if (!h) {
      InvestmentUI._ownersDraft = [];
      InvestmentUI._renderOwnersList();
      InvestmentUI._renderLinkBanner();
      openModal('investmentOwnersModal');
      return;
    }
    const owners = Investment.getOwners(h);
    InvestmentUI._ownersDraft = owners.map((o) => ({
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      porsi: o.porsi,
      isSelf: !!o.isSelf,
    }));
    InvestmentUI._renderOwnersList();
    // SESI 552 (Rekomendasi #2, audit S540/B1-B12 — lihat RENCANA-SESI-S552-BANNER-SAMAKAN-PORSI.md):
    // tampilkan banner saran link kalau ada pasangan Aset yang belum tertaut & namanya mirip.
    InvestmentUI._renderLinkBanner();
    openModal('investmentOwnersModal');
  },

  // _linkBannerDismissed — set id holding yang bannernya sudah di-dismiss user DI SESI INI (in-memory,
  // reset tiap reload app) — keputusan produk sengaja SEMENTARA (bukan disimpan permanen ke D), supaya
  // kalau user salah tap "bukan ini" banner tidak hilang selamanya walau kandidatnya sebenarnya cocok;
  // ia cukup buka lagi modal ini di sesi berikutnya utk lihat sarannya lagi.
  _linkBannerDismissed: {},

  // _findLinkCandidate(holding) — SESI 552: cari 1 kandidat Aset (belum tertaut, `investmentId`
  // kosong) yang namanya mirip holding ini, 100% REUSE Aset._findInvestmentMigrationCandidates()
  // (SUDAH ADA dari patch B1-B12/Sesi B4, dipakai jalur 🩺 Data Health Check) — 0 rumus
  // fuzzy-match baru ditulis di sini. PURE, guard typeof Aset (module aset.js/hasil patch B1-B12
  // belum tentu selalu dimuat bareng investasi-view.js). Balikin null kalau: module Aset belum
  // dimuat/fungsinya belum ada, holding tidak ada, tidak ada kandidat cocok utk holding ini, ATAU
  // banner utk holding ini sudah di-dismiss user di sesi ini.
  _findLinkCandidate(holding) {
    if (!holding) return null;
    if (InvestmentUI._linkBannerDismissed[holding.id]) return null;
    if (typeof Aset === 'undefined' || typeof Aset._findInvestmentMigrationCandidates !== 'function') return null;
    const candidates = Aset._findInvestmentMigrationCandidates();
    return candidates.find((c) => String(c.holdingId) === String(holding.id)) || null;
  },

  // _renderLinkBanner() — render banner "✅ Samakan Porsi dari Aset Ini & Tautkan" ke
  // #investmentOwnersLinkBanner (SESI 552) berdasarkan _findLinkCandidate() di atas. Kosongkan
  // elemen (banner tidak tampil) kalau tidak ada kandidat — dipanggil dari openOwnersModal() &
  // ulang dari applySamakanPorsiFromAsset()/dismissLinkBanner() supaya banner langsung
  // hilang setelah ditautkan/di-dismiss tanpa perlu tutup-buka modal lagi.
  _renderLinkBanner() {
    const box = document.getElementById('investmentOwnersLinkBanner');
    if (!box) return;
    const candidate = InvestmentUI._findLinkCandidate(InvestmentUI._ownersModalHolding);
    if (!candidate) { box.innerHTML = ''; return; }
    box.innerHTML = '<div style="background:var(--accent-soft);border:1px solid var(--accent);border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:12px;line-height:1.5">'
      + '💡 Ditemukan aset serupa di 📋 Buku Aset: <b>' + escapeHtml(candidate.assetName) + '</b> — kemungkinan instrumen yang sama, belum ditautkan. Tautkan &amp; salin porsi kepemilikannya ke draft di bawah?'
      + '<button type="button" class="btn btn-primary btn-sm u-mt8" style="width:100%" data-action="InvestmentUI.applySamakanPorsiFromAsset" data-args=\'["' + candidate.assetId + '"]\'>✅ Samakan Porsi dari Aset Ini &amp; Tautkan</button>'
      + '<div style="text-align:right;margin-top:6px"><span style="font-size:11px;color:var(--text2);cursor:pointer;text-decoration:underline" data-action="InvestmentUI.dismissLinkBanner">Bukan ini, sembunyikan</span></div>'
      + '</div>';
  },

  // dismissLinkBanner() — sembunyikan banner utk holding yang sedang dibuka, sisa sesi ini (lihat
  // catatan _linkBannerDismissed di atas soal kenapa in-memory bukan permanen).
  dismissLinkBanner() {
    const h = InvestmentUI._ownersModalHolding;
    if (h) InvestmentUI._linkBannerDismissed[h.id] = true;
    InvestmentUI._renderLinkBanner();
  },

  // applySamakanPorsiFromAsset(assetId) — SESI 552 (Rekomendasi #2 audit S540/B1-B12). Aksi tombol
  // banner: (1) TAUTKAN — isi `a.investmentId` di record Aset (arsitektur link SATU ARAH dari
  // Aset -> holding, ditetapkan patch B1-B12 Sesi B1, field ada di SISI ASET bukan holding) & save().
  // (2) SALIN porsi dari Aset (lewat MultiOwnerEngine.getOwners(a), SUDAH ADA & 100% reuse — sama
  // fungsi yang membaca a.owners/legacy titipan/ownership) KE DRAFT MODAL INI SAJA
  // (InvestmentUI._ownersDraft) — SENGAJA TIDAK langsung commit ke holding (Investment.setOwners()
  // TIDAK dipanggil di sini); user tetap wajib tap "✅ Simpan Porsi" existing utk commit final,
  // sesuai instruksi eksplisit user di RENCANA-SESI-S552-BANNER-SAMAKAN-PORSI.md (cegah
  // auto-overwrite diam-diam). Guard: holding harus ada, module Aset & D.assets harus tersedia,
  // aset harus ketemu by id — kalau salah satu gagal, toast peringatan & tidak ada perubahan.
  applySamakanPorsiFromAsset(assetId) {
    const h = InvestmentUI._ownersModalHolding;
    if (!h) { toast('⚠️ Holding investasi ini tidak ditemukan'); return; }
    if (typeof D === 'undefined' || !Array.isArray(D.assets)) { toast('⚠️ Data Aset belum siap dimuat'); return; }
    const a = D.assets.find((x) => String(x.id) === String(assetId));
    if (!a) { toast('⚠️ Aset tidak ditemukan (mungkin sudah dihapus)'); return; }
    // (1) Tautkan — pola persis Aset._saveInner() (patch B1-B12): field investmentId di sisi Aset.
    a.investmentId = h.id;
    if (typeof save === 'function') save();
    // (2) Salin porsi Aset -> draft modal ini SAJA (belum commit ke holding).
    const res = (typeof MultiOwnerEngine !== 'undefined') ? MultiOwnerEngine.getOwners(a) : null;
    const ownersFromAsset = (res && res.ok && Array.isArray(res.owners)) ? res.owners : [];
    InvestmentUI._ownersDraft = ownersFromAsset.map((o) => ({
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      porsi: o.porsi,
      isSelf: !!o.isSelf,
    }));
    InvestmentUI._renderOwnersList();
    InvestmentUI._renderLinkBanner();
    toast('🔗 Aset ditautkan & porsi disalin ke draft — tap ✅ Simpan Porsi utk konfirmasi final');
  },

  // _ownerNameFieldHtml(o,i) — SESI 491 (langkah 3/5 PLAN-owner-registry-multi-session.md),
  // replikasi PERSIS Aset._ownerNameFieldHtml() (S490): baris isSelf tetap free-text (TIDAK
  // berubah). Baris non-SELF: kalau OwnerRegistry SUDAH punya minimal 1 entri & baris ini TIDAK
  // sedang mode "buat baru" (o._creatingNew), render <select> (pilih existing owner atau "Buat
  // pemilik baru..."). Registry masih kosong ATAU baris sedang _creatingNew -> fallback free-text
  // SAMA PERSIS perilaku sebelum S491 — onOwnerNameInput() TIDAK diubah, dipakai apa adanya di
  // kedua fallback ini. Opsi dropdown SELALU sertakan ownerId lama baris ini kalau belum terdaftar
  // di registry (owner legacy dari data sebelum S489/S491 ada) — supaya buka modal tidak
  // "kehilangan" nama yang sudah tersimpan. 0 perbedaan logic dgn Aset._ownerNameFieldHtml() selain
  // namespace (InvestmentUI vs Aset) & nama handler onchange.
  _ownerNameFieldHtml(o, i) {
    const registryList = (typeof OwnerRegistry !== 'undefined') ? OwnerRegistry.listAll() : [];
    if (o.isSelf || !registryList.length || o._creatingNew) {
      return '<input type="text" class="fi" style="flex:1" placeholder="Nama pemilik" value="' + escapeHtml(o.ownerName || '') + '" oninput="InvestmentUI.onOwnerNameInput(' + i + ',this.value)">';
    }
    let matched = false;
    let opts = '<option value="">— Pilih pemilik —</option>';
    registryList.forEach((r) => {
      const sel = (o.ownerId === r.id) ? ' selected' : '';
      if (o.ownerId === r.id) matched = true;
      opts += '<option value="' + escapeHtml(r.id) + '"' + sel + '>' + escapeHtml(r.name) + '</option>';
    });
    if (o.ownerId && !matched && o.ownerName) {
      opts += '<option value="' + escapeHtml(o.ownerId) + '" selected>' + escapeHtml(o.ownerName) + '</option>';
    }
    opts += '<option value="__new__">➕ Buat pemilik baru…</option>';
    return '<select class="fi" style="flex:1" onchange="InvestmentUI.onOwnerSelectChange(' + i + ',this.value)">' + opts + '</select>';
  },

  // onOwnerSelectChange(i,val) — SESI 491: replikasi PERSIS Aset.onOwnerSelectChange() (S490).
  // Dipanggil dari dropdown pilih pemilik (_ownerNameFieldHtml(), baris non-SELF, hanya muncul
  // kalau OwnerRegistry sudah punya entri). val==="__new__" -> masuk mode _creatingNew (render
  // ulang jadi free-text kosong, sama seperti baris baru dari addOwnerRow()). val kosong ->
  // kosongkan ownerId/ownerName (belum pilih apa-apa). val id existing -> isi ownerId/ownerName
  // draft dari entri registry yang cocok. Render ulang list — event onchange DISKRIT (bukan tiap
  // ketik), aman & tidak kena masalah fokus/kursor seperti onOwnerNameInput()/onOwnerPorsiInput().
  onOwnerSelectChange(i, val) {
    if (!Array.isArray(InvestmentUI._ownersDraft) || !InvestmentUI._ownersDraft[i]) return;
    if (val === '__new__') {
      InvestmentUI._ownersDraft[i]._creatingNew = true;
      InvestmentUI._ownersDraft[i].ownerId = '';
      InvestmentUI._ownersDraft[i].ownerName = '';
      InvestmentUI._renderOwnersList();
      return;
    }
    if (!val) {
      InvestmentUI._ownersDraft[i].ownerId = '';
      InvestmentUI._ownersDraft[i].ownerName = '';
      InvestmentUI._renderOwnersList();
      return;
    }
    const registryList = (typeof OwnerRegistry !== 'undefined') ? OwnerRegistry.listAll() : [];
    const entry = registryList.find((r) => r.id === val);
    InvestmentUI._ownersDraft[i].ownerId = val;
    InvestmentUI._ownersDraft[i].ownerName = entry ? entry.name : InvestmentUI._ownersDraft[i].ownerName;
    InvestmentUI._ownersDraft[i]._creatingNew = false;
    InvestmentUI._renderOwnersList();
  },

  // _ownerQuotaText(o) — SESI 494 (Gate 2, PLAN-owner-registry-multi-session.md, dikonfirmasi:
  // basis nominal holdingCost, owner belum punya commitment -> prompt "catat pokok dulu" bukan
  // tampil tanpa batas, pelanggaran kuota = soft warning bukan hard block). Hitung & render "Kuota
  // sisa: Rp X" LIVE utk 1 baris owner non-SELF, TERPISAH dari validasi total-porsi 100%
  // (updateOwnersTotal() TIDAK dibaca/diubah di sini, & fungsi ini TIDAK PERNAH menonaktifkan
  // #investmentOwnersSaveBtn — soft warning saja, sesuai Gate 2 #3).
  //
  // 100% REUSE: `DanaTitipanPortfolioAPI.getCommitments()` (baca principalAmount mentah by
  // ownerId — bukan build(), supaya tidak ikut proyeksi holding lain yang tidak relevan di sini),
  // `DanaTitipanPortfolioAPI.allocatedExcluding()` (S494, alokasi owner ini di holding LAIN), &
  // `Investment.holdingCost()` (utk konversi porsi% draft baris ini -> nominal, basis holdingCost
  // holding yang SEDANG dibuka di modal ini — Gate 2 #1). 0 rumus baru selain penjumlahan
  // "principal - allocatedExcluding - nominal draft saat ini" yang sudah didefinisikan eksplisit
  // di rencana sesi (RENCANA S494).
  //
  // Owner belum punya record commitment (`getCommitments()` tidak ketemu / principalAmount bukan
  // angka) -> Gate 2 #2: prompt "catat pokok dulu" (BUKAN tampil tanpa batas/diam saja).
  _ownerQuotaText(o) {
    if (!o || o.isSelf || !o.ownerId) return '';
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return '';
    const commit = DanaTitipanPortfolioAPI.getCommitments().find((c) => c && c.ownerId === o.ownerId);
    if (!commit || !isFinite(commit.principalAmount)) {
      return '<div class="u-fs11 u-t2 u-mt2">💰 Kuota titipan: <span class="u-fw700">belum dicatat</span> — catat pokok dulu di menu Dana Titipan</div>';
    }
    const principal = Number(commit.principalAmount);
    const holding = InvestmentUI._ownersModalHolding;
    const holdingId = holding ? holding.id : null;
    const excluding = DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId, holdingId);
    const holdingCost = (holding && typeof Investment !== 'undefined' && typeof Investment.holdingCost === 'function')
      ? (Investment.holdingCost(holding) || 0) : 0;
    const porsiNum = typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : 0;
    const draftNominal = holdingCost * (porsiNum / 100);
    const sisa = principal - excluding - draftNominal;
    const money = (typeof fmtFull === 'function') ? fmtFull : ((typeof fmt === 'function') ? fmt : (n) => 'Rp ' + Math.round(n || 0));
    if (sisa < 0) {
      return '<div class="u-fs11 u-mt2"><span class="u-fw700 red">⚠️ Kuota sisa: ' + money(sisa) + ' (melebihi pokok dikomit)</span></div>';
    }
    return '<div class="u-fs11 u-t2 u-mt2">💰 Kuota sisa: <span class="u-fw700">' + money(sisa) + '</span></div>';
  },

  // _updateOwnerQuotaDisplay(i) — SESI 494. Update HANYA elemen #investOwnerKuota{i} tiap ketik
  // porsi (dipanggil dari onOwnerPorsiInput()), TANPA render ulang seluruh list — pola sama alasan
  // onOwnerPorsiInput()/onOwnerNameInput() TIDAK memanggil _renderOwnersList() (supaya fokus/kursor
  // input porsi tidak hilang tiap karakter diketik).
  _updateOwnerQuotaDisplay(i) {
    const el = document.getElementById('investOwnerKuota' + i);
    if (!el) return;
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!draft[i]) return;
    el.innerHTML = InvestmentUI._ownerQuotaText(draft[i]);
  },

  // _ownersHoldingValue() — SESI 552. Basis Rp tunggal dipakai konversi porsi%<->nominal Rp di
  // modal ini, ambil dari Investment.holdingValue(h) (nilai pasar terkini holding yang SEDANG
  // dibuka — SAMA fungsi yang sudah dipakai _ownerQuotaText()/_ownerNominalText() sejak S494/S551,
  // 0 rumus baru).
  _ownersHoldingValue() {
    const holding = InvestmentUI._ownersModalHolding;
    if (!holding) return 0;
    return (typeof Investment !== 'undefined' && typeof Investment.holdingValue === 'function')
      ? (Investment.holdingValue(holding) || 0) : 0;
  },

  // _ownerNominalValue(o) — SESI 552 (sebelumnya _ownerNominalText S551, READ-ONLY). Sekarang
  // dipakai buat ISI value input Nominal (Rp) yang bisa diketik langsung (mirror
  // Aset._renderOwnersList() nominalVal — angka polos, BUKAN string format "Rp ..." supaya bisa
  // ditulis balik ke parseFloat tanpa strip formatting tambahan), basis _ownersHoldingValue() ×
  // draft[i].porsi/100, dibulatkan ke rupiah.
  _ownerNominalValue(o) {
    const value = InvestmentUI._ownersHoldingValue();
    const porsiNum = typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : 0;
    return Math.round(value * (porsiNum / 100));
  },

  // _updateOwnerNominalDisplay(i) — SESI 552 (sebelumnya SESI 551, dulu textContent ke div
  // read-only). Update HANYA elemen input #investOwnerNominal{i} tiap ketik porsi (dipanggil dari
  // onOwnerPorsiInput()), TANPA render ulang seluruh list — pola sama persis
  // _updateOwnerQuotaDisplay(i) (S494), supaya fokus/kursor input porsi tidak hilang.
  _updateOwnerNominalDisplay(i) {
    const el = document.getElementById('investOwnerNominal' + i);
    if (!el) return;
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!draft[i]) return;
    el.value = InvestmentUI._ownerNominalValue(draft[i]);
  },

  // _renderOwnersList() — render ulang #investmentOwnersList dari InvestmentUI._ownersDraft.
  // Dipanggil tiap ada tambah/hapus baris (addOwnerRow/removeOwnerRow), TIDAK dipanggil tiap
  // karakter diketik di input nama/porsi (lihat onOwnerNameInput/onOwnerPorsiInput di bawah) supaya
  // fokus/kursor input tidak hilang tiap ketik — pola sama persis Aset._renderOwnersList().
  // SESI 491: baris nama pemilik sekarang lewat _ownerNameFieldHtml(o,i) (dropdown registry/
  // free-text, sama pola Aset._renderOwnersList() sejak S490) — 0 perubahan lain di fungsi ini.
  _renderOwnersList() {
    const listBox = document.getElementById('investmentOwnersList');
    if (!listBox) { InvestmentUI.updateOwnersTotal(); return; }
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!InvestmentUI._ownersModalHolding) {
      listBox.innerHTML = '<div class="empty"><div class="empty-text">Holding investasi ini tidak ditemukan.</div></div>';
      InvestmentUI.updateOwnersTotal();
      return;
    }
    if (!draft.length) {
      listBox.innerHTML = '<div class="empty"><div class="empty-text">Belum ada pemilik. Tap "➕ Tambah Pemilik" di bawah.</div></div>';
      InvestmentUI.updateOwnersTotal();
      return;
    }
    listBox.innerHTML = draft.map((o, i) => {
      const porsiNum = typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : null;
      return '<div style="margin-bottom:8px">'
        + '<div class="u-flex u-gap8" style="align-items:center;margin-bottom:6px">'
        + InvestmentUI._ownerNameFieldHtml(o, i)
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="InvestmentUI.removeOwnerRow" data-args=\'[' + i + ']\' aria-label="Hapus pemilik">✕</button>'
        + '</div>'
        + '<div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Porsi (%)</label><input type="number" class="fi" id="investOwnerPorsi' + i + '" placeholder="%" inputmode="decimal" value="' + (porsiNum !== null ? porsiNum : '') + '" oninput="InvestmentUI.onOwnerPorsiInput(' + i + ',this.value)"></div>'
        + '<div class="fg u-mb0" style="margin-top:6px"><label class="fl" style="margin-bottom:2px">Nominal (Rp)</label><input type="text" class="fi" id="investOwnerNominal' + i + '" placeholder="0" inputmode="decimal" value="' + InvestmentUI._ownerNominalValue(o) + '" oninput="InvestmentUI.onOwnerNominalInput(' + i + ',this.value)"></div>'
        + '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);margin-top:4px;cursor:pointer">'
        + '<input type="checkbox" style="width:14px;height:14px"' + (o.isSelf ? ' checked' : '') + ' onchange="InvestmentUI.onOwnerIsSelfToggle(' + i + ',this.checked)"> 👤 Ini saya (porsi ini dihitung ke Zakat/Pajak milikmu)'
        + '</label>'
        + (o.isSelf ? '' : ('<div id="investOwnerKuota' + i + '">' + InvestmentUI._ownerQuotaText(o) + '</div>'))
        + '</div>';
    }).join('');
    InvestmentUI.updateOwnersTotal();
  },

  // updateOwnersTotal() — hitung ulang & tampilkan total porsi InvestmentUI._ownersDraft saat ini
  // di #investmentOwnersTotalBox (hijau = pas 100%, merah = belum), & matikan/nyalakan tombol
  // Simpan sesuai validitas — PURE UI, 100% reuse MultiOwnerEngine.totalPorsi()/remainingPorsi(),
  // pola sama persis Aset.updateOwnersTotal().
  updateOwnersTotal() {
    const box = document.getElementById('investmentOwnersTotalBox');
    const saveBtn = document.getElementById('investmentOwnersSaveBtn');
    if (!box) { if (saveBtn) saveBtn.disabled = true; return; }
    if (!InvestmentUI._ownersModalHolding) { box.textContent = ''; box.style.color = ''; if (saveBtn) saveBtn.disabled = true; return; }
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!draft.length) {
      box.textContent = 'Belum ada pemilik ditambahkan.';
      box.style.color = 'var(--text2)';
      if (saveBtn) saveBtn.disabled = true;
      return;
    }
    if (typeof MultiOwnerEngine === 'undefined') { box.textContent = ''; box.style.color = ''; if (saveBtn) saveBtn.disabled = true; return; }
    const total = MultiOwnerEngine.totalPorsi(draft);
    const sisa = MultiOwnerEngine.remainingPorsi(draft);
    const isValid = Math.abs(sisa) <= 0.01;
    box.style.color = isValid ? 'var(--accent3)' : 'var(--accent2)';
    box.style.fontWeight = '700';
    box.textContent = isValid
      ? ('✅ Total porsi: ' + total + '% (pas 100%)')
      : ('⚠️ Total porsi: ' + total + '% (' + (sisa > 0 ? ('kurang ' + sisa + '%') : ('lebih ' + Math.abs(sisa) + '%')) + ')');
    if (saveBtn) saveBtn.disabled = !isValid;
  },

  // addOwnerRow() — tambah 1 baris pemilik kosong ke draft, murni ubah draft di memori — TIDAK
  // menulis apa pun ke D.investments sampai saveOwners() dipanggil. Baris pertama (draft masih
  // kosong) default ditandai "👤 Ini saya" (sama alasan Aset.addOwnerRow(), S393).
  addOwnerRow() {
    if (!InvestmentUI._ownersModalHolding) { toast('⚠️ Holding investasi ini tidak ditemukan'); return; }
    InvestmentUI._ownersDraft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    InvestmentUI._ownersDraft.push({
      ownerId: '',
      ownerName: '',
      porsi: 0,
      isSelf: InvestmentUI._ownersDraft.length === 0,
    });
    InvestmentUI._renderOwnersList();
  },

  // removeOwnerRow(i) — hapus 1 baris pemilik dari draft (index i), lalu render ulang list.
  removeOwnerRow(i) {
    if (!Array.isArray(InvestmentUI._ownersDraft)) return;
    InvestmentUI._ownersDraft.splice(i, 1);
    InvestmentUI._renderOwnersList();
  },

  // onOwnerNameInput(i,val) — tulis perubahan ketikan nama pemilik ke draft[i], TANPA render ulang
  // list (render ulang cuma perlu saat baris ditambah/dihapus, supaya fokus/kursor input tidak
  // hilang tiap karakter diketik — pola sama persis Aset.onOwnerNameInput()).
  onOwnerNameInput(i, val) {
    if (!Array.isArray(InvestmentUI._ownersDraft) || !InvestmentUI._ownersDraft[i]) return;
    InvestmentUI._ownersDraft[i].ownerName = val;
  },

  // onOwnerPorsiInput(i,val) — tulis perubahan porsi ke draft[i] & update indikator total realtime
  // tiap ketik (pola sama persis Aset.onOwnerPorsiInput(), TANPA cabang sync Nominal (Rp) — lihat
  // catatan "VERSI RINGKAS" di atas file ini).
  onOwnerPorsiInput(i, val) {
    if (!Array.isArray(InvestmentUI._ownersDraft) || !InvestmentUI._ownersDraft[i]) return;
    const n = parseFloat(val);
    InvestmentUI._ownersDraft[i].porsi = isFinite(n) ? n : 0;
    InvestmentUI.updateOwnersTotal();
    // SESI 494 — "Kuota sisa" per owner terpisah dari validasi total-porsi 100% di atas (soft
    // warning, TIDAK menyentuh saveBtn.disabled — lihat _ownerQuotaText()/_updateOwnerQuotaDisplay()).
    InvestmentUI._updateOwnerQuotaDisplay(i);
    // SESI 552 (dulu SESI 551, read-only) — live-sync input "Nominal (Rp)" tiap ketik %, sama
    // pola kuota di atas. Update value DOM langsung (BUKAN _renderOwnersList ulang) supaya
    // fokus/kursor input porsi yang sedang diketik tidak hilang — pola sama persis
    // Aset.onOwnerPorsiInput().
    InvestmentUI._updateOwnerNominalDisplay(i);
  },

  // onOwnerNominalInput(i,val) — SESI 552. Arah sebaliknya dari onOwnerPorsiInput(): user isi
  // Nominal (Rp) baris ini, porsi% baris ini dihitung ulang (nominal/holdingValue*100, dibulatkan
  // 4 desimal — presisi sama dgn Aset.onOwnerNominalInput() sejak FIX S457, supaya round-trip
  // Rp->porsi%->Rp praktis lossless) & ditulis ke InvestmentUI._ownersDraft[i].porsi (SAMA persis
  // field yang dibaca saveOwners()/updateOwnersTotal() — 0 field baru, Nominal murni tampilan
  // turunan dari porsi% + holdingValue(), TIDAK pernah disimpan sbg field sendiri).
  // Holding investasi SELALU punya nilai pasar (Investment.holdingValue(), diturunkan dari
  // riwayat transaksi — beda dari Aset yang nilainya manual & bisa 0), jadi TIDAK perlu cabang
  // "nilai belum diisi" seperti Aset.onOwnerNominalInput() — di sini basis Rp selalu tersedia.
  onOwnerNominalInput(i, val) {
    if (!Array.isArray(InvestmentUI._ownersDraft) || !InvestmentUI._ownersDraft[i]) return;
    const value = InvestmentUI._ownersHoldingValue();
    if (value <= 0) return;
    const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    const nominal = isFinite(n) ? n : 0;
    const porsi = Math.round((nominal / value * 100) * 10000) / 10000;
    InvestmentUI._ownersDraft[i].porsi = porsi;
    const porsiEl = document.getElementById('investOwnerPorsi' + i);
    if (porsiEl) porsiEl.value = porsi;
    InvestmentUI.updateOwnersTotal();
    InvestmentUI._updateOwnerQuotaDisplay(i);
  },

  // onOwnerIsSelfToggle(i,checked) — tandai/lepas baris ke-i draft sbg porsi milik sendiri (dipakai
  // Zakat Maal/Pajak lewat MultiOwnerEngine.selfOwnedValue()). 0 batasan cuma-1-baris, sama persis
  // Aset.onOwnerIsSelfToggle().
  onOwnerIsSelfToggle(i, checked) {
    if (!Array.isArray(InvestmentUI._ownersDraft) || !InvestmentUI._ownersDraft[i]) return;
    InvestmentUI._ownersDraft[i].isSelf = !!checked;
    // SESI 497 FIX (laporan user, screenshot): _ownerNameFieldHtml() nentuin free-text vs
    // dropdown lewat o.isSelf, tapi keputusan itu cuma dievaluasi ulang saat _renderOwnersList()
    // jalan -- toggle checkbox ini sebelumnya TIDAK memanggilnya, jadi field name "macet" di
    // tipe field lama (mis. baris pertama default isSelf:true -> free-text, user uncheck "Ini
    // saya" -> dropdown existing-owner TIDAK PERNAH muncul walau OwnerRegistry sudah ada isi).
    // Event ini diskrit (bukan tiap keystroke spt onOwnerNameInput/onOwnerPorsiInput), jadi aman
    // render ulang penuh -- porsi tidak ikut ter-reset krn dibaca balik dari draft[i].porsi yang
    // tidak disentuh di sini.
    InvestmentUI._renderOwnersList();
  },

  // saveOwners() — tulis InvestmentUI._ownersDraft ke holding lewat Investment.setOwners() (SUDAH
  // ADA sejak S462, 100% reuse — validasi/normalisasi/sync Buku Utang titipan semuanya di dalam
  // fungsi itu, 0 rumus baru ditulis di sini). Baris draft yang ownerId-nya masih kosong (baris baru
  // dari addOwnerRow(), belum pernah tersimpan) diberi id via uid() sebelum divalidasi — pola sama
  // persis Aset.saveOwners(). Investment.setOwners() melempar Error (bukan {ok,reason} spt
  // MultiOwnerEngine.setOwners() mentah) kalau validasi gagal, jadi dibungkus try/catch di sini.
  // SESI 491: baris baru (ownerId masih kosong) non-SELF -> ownerId lewat OwnerRegistry.
  // findOrCreate() (dedup by nama, konsisten lintas aset/investasi — TUJUAN UTAMA S489-S491),
  // BUKAN uid() langsung lagi. Baris SELF & baris yang ownerId-nya SUDAH ada (dari dropdown pilih
  // existing, atau data lama) TIDAK disentuh — perilaku persis sebelum S491, replikasi PERSIS
  // Aset.saveOwners() (S490).
  saveOwners() {
    if (!InvestmentUI._ownersModalHolding) { toast('⚠️ Holding investasi ini tidak ditemukan'); return; }
    if (typeof Investment === 'undefined') { toast('⚠️ Fitur porsi kepemilikan investasi belum siap dimuat'); return; }
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!draft.length) { toast('⚠️ Tambahkan minimal 1 pemilik sebelum menyimpan'); return; }
    for (let i = 0; i < draft.length; i++) {
      if (!draft[i].ownerName || !draft[i].ownerName.trim()) {
        toast('⚠️ Nama pemilik baris ke-' + (i + 1) + ' wajib diisi');
        return;
      }
    }
    // SESI 547 (GAP3-AUD-001 poin 4, mirror Aset.saveOwners() S547): baris baru
    // isSelf:true tanpa ownerId existing pakai literal 'SELF' (sama seperti
    // dipakai getOwners() default & fallback investasi.js) -- bukan uid() acak
    // lagi -- supaya "Milik Sendiri" konsisten 1 identitas lintas aset/investasi.
    // 'SELF' cuma dipakai SEKALI per holding (ownerId wajib unik), baris isSelf
    // ke-2 dst (kalau ada, sama seperti Aset -- lihat onOwnerIsSelfToggle()
    // di bawah) tetap fallback uid() spt sebelumnya.
    let selfIdUsed = draft.some((o) => o.ownerId && String(o.ownerId).trim() === 'SELF');
    const owners = draft.map((o) => {
      let ownerId;
      if (o.ownerId && String(o.ownerId).trim()) {
        ownerId = String(o.ownerId).trim();
      } else if (o.isSelf && !selfIdUsed) {
        ownerId = 'SELF';
        selfIdUsed = true;
      } else if (!o.isSelf && typeof OwnerRegistry !== 'undefined') {
        ownerId = OwnerRegistry.findOrCreate(o.ownerName.trim());
      } else {
        ownerId = String(typeof uid === 'function' ? uid() : Date.now() + Math.random());
      }
      return { ownerId, ownerName: o.ownerName.trim(), porsi: o.porsi, isSelf: !!o.isSelf };
    });
    let h;
    try {
      h = Investment.setOwners(InvestmentUI._ownersModalHolding.id, owners);
    } catch (e) {
      toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan porsi kepemilikan'));
      return;
    }
    InvestmentUI._ownersModalHolding = h;
    InvestmentUI._ownersDraft = Investment.getOwners(h).map((o) => ({
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      porsi: o.porsi,
      isSelf: !!o.isSelf,
    }));
    InvestmentUI._renderOwnersList();
    // Porsi berubah -> Kekayaan Bersih/Zakat Maal/Buku Utang (entry titipan investasi, lihat
    // Investment._syncTitipanDebt() yang dipanggil di dalam setOwners()) ikut berubah — sync render
    // yang sudah ada, pola sama persis Aset.saveOwners() (0 rumus baru, cuma panggil fungsi render
    // yang sudah ada kalau tersedia di halaman ini).
    if (typeof renderKekayaanBersih === 'function') renderKekayaanBersih();
    if (typeof hitungZakatMaal === 'function') hitungZakatMaal();
    if (typeof renderDebtList === 'function') renderDebtList();
    if (typeof AIBus !== 'undefined') AIBus.emit('investment.updated', { ownersUpdated: true, holdingId: h.id });
    // S583 sesi-9 (Rekomendasi #3 enforcement): audit checkAll() SETELAH simpan
    // berhasil -- non-blocking (lihat komentar warnIfNotOk() di titipan-reconcile.js),
    // TIDAK pernah menahan/menolak simpan yang di atas sudah selesai.
    if (typeof TitipanReconcile !== 'undefined') TitipanReconcile.warnIfNotOk('InvestmentUI.saveOwners');
    // FIX (audit "3 titik Simpan Porsi tidak me-refresh widget Dana Titipan"):
    // sama alasan Aset.saveOwners() (aset.js) — porsi titipan holding investasi
    // ini ikut membentuk usedTotal/available di kartu "Dana Kelolaan" & tab
    // "Dana Titipan" (DanaTitipanPortfolioPresenter), tapi jalur ini belum pernah
    // memanggilnya. 0 logic baru, cuma menyamakan pola render()+renderInto()
    // yang sudah baku di modul lain (tx-list-cashflow.js, dana-titipan-portfolio-render.js).
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    toast('✅ Porsi kepemilikan tersimpan');
  },

  // resetOwners() — buang perubahan draft yang belum disimpan, muat ulang InvestmentUI._ownersDraft
  // dari data TERSIMPAN (via Investment.getOwners(), sama persis logic openOwnersModal() — 0 rumus
  // baru). Dipakai kalau user salah edit & mau mulai ulang tanpa menutup modal.
  resetOwners() {
    if (!InvestmentUI._ownersModalHolding) return;
    const owners = typeof Investment !== 'undefined' ? Investment.getOwners(InvestmentUI._ownersModalHolding) : [];
    InvestmentUI._ownersDraft = owners.map((o) => ({
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      porsi: o.porsi,
      isSelf: !!o.isSelf,
    }));
    InvestmentUI._renderOwnersList();
    toast('↺ Draft direset ke data yang terakhir tersimpan');
  },
};

if (typeof window !== 'undefined') {
  window.InvestmentUI = InvestmentUI;
}
