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
  // DUST_THRESHOLD_RP -- SESI S687, mirror PERSIS Aset.DUST_THRESHOLD_RP (aset-owners.js).
  DUST_THRESHOLD_RP: 100,

  // _rebalancePending — FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026, permintaan user,
  // sesi lanjutan setelah domain Aset & Akun): {editedIndex,method,manualIndex} kalau panel
  // penyesuaian SEDANG tampil, null kalau tidak. 100% REUSE calculateRebalance() (modules-calc.js,
  // SSOT yang sama dipakai Aset.*/AccOwners.*) — 0 rumus baru di sini, method2 di bawah
  // (_checkRebalanceTrigger/_renderRebalancePanel/setRebalanceMethod/setRebalanceManualOwner/
  // applyRebalance/cancelRebalance) murni UI/state, copy pola PERSIS Aset.*/AccOwners.* dgn id
  // elemen & radio name diganti versi Investasi.
  _rebalancePending: null,

  // openOwnersModal(id) — dipanggil dgn id holding LANGSUNG (beda dari Aset.openOwnersModal() yang
  // baca Aset.editId — investasi belum punya "form Tambah/Edit Holding" terpusat spt assetModal,
  // jadi caller di file lain cukup lempar id holding-nya langsung, mis.
  // data-action="InvestmentUI.openOwnersModal" data-args='["<id>"]').
  openOwnersModal(id) {
    const h = id ? Investment.getHolding(id) : null;
    const nameBox = document.getElementById('investmentOwnersHoldingName');
    if (nameBox) nameBox.textContent = h ? ('📋 ' + h.name) : '';
    InvestmentUI._ownersModalHolding = h;
    InvestmentUI._rebalancePending = null;
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
      // settlement (S661, lanjutan fondasi S660 Investment.getOwnerSettlement()):
      // 'titipan' (default) | 'milik' — dibaca per-baris SEKARANG saat modal dibuka,
      // bukan disintesis ulang, supaya toggle di bawah selalu mencerminkan status
      // TERSIMPAN terakhir (h.ownerSettlement), bukan asumsi.
      settlement: (h && typeof Investment.getOwnerSettlement === 'function') ? Investment.getOwnerSettlement(h, o.ownerId) : 'titipan',
    }));
    InvestmentUI._renderOwnersList();
    // SESI 552 (Rekomendasi #2, audit S540/B1-B12 — lihat RENCANA-SESI-S552-BANNER-SAMAKAN-PORSI.md):
    // tampilkan banner saran link kalau ada pasangan Aset yang belum tertaut & namanya mirip.
    InvestmentUI._renderLinkBanner();
    openModal('investmentOwnersModal');
    // MIGRASI data lama (Agustus 2026, sesi lanjutan setelah Aset.openOwnersModal()/
    // AccOwners.open() — lihat komentar identik di aset.js/akun.js): holding investasi yang
    // sudah overflow >100% SEBELUM fitur Auto-Rebalance ini ada tidak akan pernah memicu
    // _checkRebalanceTrigger() lewat ketikan user kalau user tidak menyentuh field porsi sama
    // sekali sesudah buka modal — panggil manual di sini pakai baris TERAKHIR draft sbg
    // "editedIndex" (hasil kalkulasi tidak bergantung baris mana yang dianggap "diedit" utk
    // kasus migrasi ini) supaya panel penyesuaian otomatis tampil begitu modal dibuka, bukan
    // cuma saat user mulai mengetik. PURE (tidak menulis draft), aman dipanggil di sini.
    InvestmentUI._checkRebalanceTrigger(InvestmentUI._ownersDraft.length - 1);
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
    // SESI AF2 (fitur "Auto-fill dari Kuota Sisa Titipan", mirror PERSIS Aset.onOwnerSelectChange()
    // — lihat komentarnya): owner dipilih & baris masih kosong (porsi<=0, belum _touched) -> isi
    // otomatis Porsi (%) (& Nominal (Rp) ikut lewat _renderOwnersList) dari sisa kuota titipan
    // owner tsb, dibatasi supaya tidak mendorong total porsi lewat 100%. Tetap bisa diedit manual.
    if (!InvestmentUI._ownersDraft[i]._touched) {
      const curPorsi = typeof InvestmentUI._ownersDraft[i].porsi === 'number' && isFinite(InvestmentUI._ownersDraft[i].porsi) ? InvestmentUI._ownersDraft[i].porsi : 0;
      if (curPorsi <= 0) {
        const cap = InvestmentUI._ownerQuotaPorsiCap(i);
        if (typeof cap === 'number' && cap > 0) {
          InvestmentUI._ownersDraft[i].porsi = cap;
          InvestmentUI._ownersDraft[i]._touched = true;
          InvestmentUI._ownersDraft[i]._autoFilled = true;
          if (typeof toast === 'function') toast('💡 Porsi diisi otomatis dari sisa kuota titipan (' + cap + '%) — bisa diedit manual');
        }
      }
    }
    InvestmentUI._renderOwnersList();
  },

  // _ownerQuotaPorsiCap(i) — SESI AF2, mirror PERSIS Aset._ownerQuotaPorsiCap(). Hitung Porsi (%)
  // maksimum yang aman diisi otomatis utk baris owner ke-i dari sisa kuota titipannya, TANPA
  // mendorong total porsi lewat 100%. 100% REUSE rumus sisa kuota yang sama persis dgn
  // _ownerQuotaText() (draftNominal baris ini dianggap 0 krn baris belum diisi), basis Rp dari
  // _ownersHoldingValue() (Investment.holdingValue(), sama dgn _ownerNominalValue()). Balikin null
  // kalau tidak berlaku, 0 kalau kuota sisa <=0 atau ruang porsi (100% - baris lain) sudah habis.
  _ownerQuotaPorsiCap(i) {
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    const o = draft[i];
    if (!o || o.isSelf || !o.ownerId) return null;
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return null;
    const commit = DanaTitipanPortfolioAPI.getCommitments().find((c) => c && c.ownerId === o.ownerId);
    if (!commit || !isFinite(commit.principalAmount)) return null;
    const value = InvestmentUI._ownersHoldingValue();
    if (!(value > 0)) return null;
    const principal = Number(commit.principalAmount);
    const holding = InvestmentUI._ownersModalHolding;
    const holdingId = holding ? holding.id : null;
    const excluding = DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId, holdingId);
    const projection = (typeof DanaTitipanPortfolioAPI.build === 'function') ? DanaTitipanPortfolioAPI.build() : null;
    const ownerBucket = (projection && Array.isArray(projection.owners)) ? projection.owners.find((ow) => ow && ow.ownerId === o.ownerId) : null;
    const usedTotal = ownerBucket ? (ownerBucket.usedTotal || 0) : 0;
    const linkedExpenseTotal = ownerBucket ? (ownerBucket.linkedExpenseTotal || 0) : 0;
    // SESI FIX-2026-08-31 (mirror aset-owners.js, lihat komentar
    // DanaTitipanPortfolioAPI._renovExpenseTotalForOwner()).
    const renovExpenseTotal = ownerBucket ? (ownerBucket.renovExpenseTotal || 0) : 0;
    const sisaRp = principal - excluding - usedTotal - linkedExpenseTotal - renovExpenseTotal;
    if (!(sisaRp > 0)) return 0;
    const quotaPorsi = sisaRp / value * 100;
    const otherTotal = draft.reduce((sum, row, k) => k === i ? sum : sum + (typeof row.porsi === 'number' && isFinite(row.porsi) ? row.porsi : 0), 0);
    const remainingPorsi = Math.max(0, 100 - otherTotal);
    const capped = Math.min(quotaPorsi, remainingPorsi);
    return Math.round(Math.max(0, capped) * 10000) / 10000;
  },

  // applyQuotaToRow(i) — SESI AF2, mirror PERSIS Aset.applyQuotaToRow(). Tombol manual "🔄 Isi dari
  // kuota sisa" di baris kuota tiap owner — bisa dipanggil kapan saja utk menimpa ulang porsi baris
  // ke nilai kuota-sisa terkini, TIDAK dicek _touched/curPorsi<=0 (beda dgn auto-fill pasif di atas).
  applyQuotaToRow(i) {
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!draft[i]) return;
    const value = InvestmentUI._ownersHoldingValue();
    if (!(value > 0)) { if (typeof toast === 'function') toast('⚠️ Nilai holding ini belum tersedia, tidak bisa isi otomatis dari kuota'); return; }
    const cap = InvestmentUI._ownerQuotaPorsiCap(i);
    if (cap === null) { if (typeof toast === 'function') toast('⚠️ Owner ini belum punya pokok titipan tercatat'); return; }
    if (cap <= 0) { if (typeof toast === 'function') toast('⚠️ Kuota sisa owner ini sudah habis / ruang porsi sudah penuh'); return; }
    // FIX (mirror Aset.applyQuotaToRow(), laporan user "field tidak bertambah/berkurang"):
    // kalau cap hasil hitung praktis SAMA dgn porsi yang sudah ada (baris sudah memakai
    // hampir seluruh kuotanya), jangan tetap kasih toast sukses yang menyesatkan -- kasih
    // toast jujur, 0 tulis draft/render.
    const prevPorsi = typeof draft[i].porsi === 'number' && isFinite(draft[i].porsi) ? draft[i].porsi : 0;
    if (Math.abs(cap - prevPorsi) < 0.0001) {
      if (typeof toast === 'function') toast('ℹ️ Porsi baris ini sudah memakai hampir seluruh kuota titipannya -- sisa yang bisa ditambahkan cuma sedikit sekali, jadi angkanya tidak berubah');
      return;
    }
    draft[i].porsi = cap;
    draft[i]._touched = true;
    draft[i]._autoFilled = true;
    InvestmentUI._renderOwnersList();
    if (typeof toast === 'function') toast('✅ Porsi diisi dari sisa kuota titipan (' + cap + '%)');
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
  //
  // DL-NEXT-9 REVISI 3 (poin 4) — SEBELUM fix ini, "Kuota sisa" di modal ini HANYA
  // mengurangi `allocatedExcluding()` (pokok yang sudah dialokasikan NOMINAL ke
  // instrumen lain) + `draftNominal` (porsi baris ini yang sedang diketik) dari
  // `principal`. Itu MENGABAIKAN 2 jalur pengeluaran lain yang SUDAH jadi bagian
  // formula `spent` di `build()`/`estimatedUnallocated` sejak Sesi 519 & Sesi
  // PATCH-2026-08-14 — `usedTotal` (jalur "💸 Catat Pengeluaran Dana Titipan",
  // `tx.titipanLinkId`) & `linkedExpenseTotal` (pengeluaran akun tertaut yang
  // `deductionOwnerId`-nya mengarah ke owner ini) — sehingga "Kuota sisa" bisa
  // menunjuk angka yang tidak sinkron dengan dashboard Dana Titipan (root cause,
  // lihat DESIGN-LOCK-DL-NEXT-9-OWNER-QUOTA-SISA-SPENT-SYNC-2.md). FIX: tambah
  // kedua komponen itu, dibaca dari owner bucket `DanaTitipanPortfolioAPI.build()`
  // (SATU sumber kebenaran yang sama dgn `estimatedUnallocated`, 0 rumus baru
  // ditulis di sini). Keduanya sudah diverifikasi dihitung GLOBAL per-ownerId
  // (bukan per-holding) di `build()` — jadi 0 exclusion tambahan diperlukan utk
  // dua komponen ini (beda dgn `allocatedExcluding()` yang memang harus exclude
  // instrumen yang sedang dibuka di modal ini).
  //
  // HARD INVARIANT (DL-Next-9): `o.gain`/`gainSplit`/`currentValue` (Untung-Rugi)
  // TIDAK PERNAH masuk formula ini — HANYA `principalAmount`/`allocatedPrincipal`
  // (lewat `allocatedExcluding()`)/`usedTotal`/`linkedExpenseTotal` yang boleh
  // mempengaruhi "Kuota sisa".
  _ownerQuotaText(o, i) {
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
    const projection = (typeof DanaTitipanPortfolioAPI.build === 'function') ? DanaTitipanPortfolioAPI.build() : null;
    const ownerBucket = (projection && Array.isArray(projection.owners))
      ? projection.owners.find((ow) => ow && ow.ownerId === o.ownerId) : null;
    const usedTotal = ownerBucket ? (ownerBucket.usedTotal || 0) : 0;
    const linkedExpenseTotal = ownerBucket ? (ownerBucket.linkedExpenseTotal || 0) : 0;
    // SESI FIX-2026-08-31 (mirror aset-owners.js, lihat komentar
    // DanaTitipanPortfolioAPI._renovExpenseTotalForOwner()).
    const renovExpenseTotal = ownerBucket ? (ownerBucket.renovExpenseTotal || 0) : 0;
    const holdingCost = (holding && typeof Investment !== 'undefined' && typeof Investment.holdingCost === 'function')
      ? (Investment.holdingCost(holding) || 0) : 0;
    const porsiNum = typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : 0;
    const draftNominal = holdingCost * (porsiNum / 100);
    const sisa = principal - excluding - usedTotal - linkedExpenseTotal - renovExpenseTotal - draftNominal;
    const money = (typeof fmtFull === 'function') ? fmtFull : ((typeof fmt === 'function') ? fmt : (n) => 'Rp ' + Math.round(n || 0));
    const btnIdx = typeof i === 'number' ? i : (Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft.indexOf(o) : -1);
    const quotaBtn = '<button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:10.5px" data-action="InvestmentUI.applyQuotaToRow" data-args=\'[' + btnIdx + ']\'>🔄 Isi dari kuota sisa</button>';
    // SESI S687 (mirror PERSIS Aset._ownerQuotaText(), lihat komentarnya di aset-owners.js
    // utk alasan lengkap) — sisa sekecil |sisa|<DUST_THRESHOLD_RP dianggap noise pembulatan
    // float, bukan sisa sungguhan -- tampil pudar tanpa tombol/warning, berlaku simetris utk
    // sisa negatif kecil juga.
    if (Math.abs(sisa) < InvestmentUI.DUST_THRESHOLD_RP) {
      return '<div class="u-fs11 u-mt2" style="opacity:.55">💰 Kuota sisa: ' + money(sisa) + '</div>';
    }
    if (sisa < 0) {
      // FIX (mirror Aset._ownerQuotaText(), laporan user "diklik tidak bereaksi"): tombol
      // sekarang disisipkan di cabang minus JUGA -- sebelumnya cabang ini tidak punya tombol
      // sama sekali, jadi klik di teks merahnya wajar tidak bereaksi.
      return '<div class="u-fs11 u-mt2 u-flex u-gap8" style="align-items:center;flex-wrap:wrap"><span class="u-fw700 red">⚠️ Kuota sisa: ' + money(sisa) + ' (melebihi pokok dikomit)</span>' + quotaBtn + '</div>';
    }
    // SESI AF2: sisipkan tombol "🔄 Isi dari kuota sisa" — pemicu manual applyQuotaToRow(),
    // mirror PERSIS Aset._ownerQuotaText().
    // SESI FIX-2026-09-01 ("Alihkan sisa ke aset lain", mirror PERSIS Aset._ownerQuotaText()
    // — lihat komentarnya di aset-owners.js utk desain lengkap): tombol KEDUA khusus sisa
    // POSITIF signifikan, memindahkan sisa yang tidak tertampung HOLDING INI ke aset Buku
    // Aset/holding LAIN yang masih punya ruang kosong (porsi Milik Sendiri) — Bagian 1 dari
    // temuan audit S687-lanjutan: sebelumnya cakupan realokasi cuma Buku Aset, domain
    // Investasi (holding ini sendiri) belum pernah bisa jadi SUMBER realokasi.
    const realokasiBtn = '<button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:10.5px" data-action="InvestmentUI.previewRealokasiSisaKuota" data-args=\'[' + btnIdx + ']\'>🔀 Alihkan sisa ke aset lain</button>';
    return '<div class="u-fs11 u-t2 u-mt2 u-flex u-gap8" style="align-items:center;flex-wrap:wrap">💰 Kuota sisa: <span class="u-fw700">' + money(sisa) + '</span>' + quotaBtn + realokasiBtn + '</div>';
  },

  // previewRealokasiSisaKuota(i) — SESI FIX-2026-09-01, mirror PERSIS Aset.previewRealokasiSisaKuota()
  // (aset-owners.js — lihat komentarnya utk desain lengkap fitur). Beda basis sisa: holding
  // investasi baca lewat _ownerQuotaText()-nya sendiri (formula sama, holdingCost() bukan
  // a.nilai) — dihitung ULANG di sini dgn cara yang SAMA PERSIS (0 rumus baru) supaya
  // konsisten dgn angka yang tampil di baris kuota yang sama.
  async previewRealokasiSisaKuota(i) {
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    const o = draft[i];
    if (!o || o.isSelf || !o.ownerId) return;
    if (typeof RealokasiSisaKuota === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur realokasi belum siap dimuat'); return; }
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    const commit = DanaTitipanPortfolioAPI.getCommitments().find((c) => c && c.ownerId === o.ownerId);
    if (!commit || !isFinite(commit.principalAmount)) { if (typeof toast === 'function') toast('⚠️ Owner ini belum punya pokok titipan tercatat'); return; }
    const principal = Number(commit.principalAmount);
    const holding = InvestmentUI._ownersModalHolding;
    const holdingId = holding ? holding.id : null;
    const excluding = DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId, holdingId);
    const projection = (typeof DanaTitipanPortfolioAPI.build === 'function') ? DanaTitipanPortfolioAPI.build() : null;
    const ownerBucket = (projection && Array.isArray(projection.owners)) ? projection.owners.find((ow) => ow && ow.ownerId === o.ownerId) : null;
    const usedTotal = ownerBucket ? (ownerBucket.usedTotal || 0) : 0;
    const linkedExpenseTotal = ownerBucket ? (ownerBucket.linkedExpenseTotal || 0) : 0;
    const renovExpenseTotal = ownerBucket ? (ownerBucket.renovExpenseTotal || 0) : 0;
    const holdingCost = (holding && typeof Investment !== 'undefined' && typeof Investment.holdingCost === 'function') ? (Investment.holdingCost(holding) || 0) : 0;
    const porsiNum = typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : 0;
    const draftNominal = holdingCost * (porsiNum / 100);
    const sisa = principal - excluding - usedTotal - linkedExpenseTotal - renovExpenseTotal - draftNominal;
    if (!(sisa > InvestmentUI.DUST_THRESHOLD_RP)) { if (typeof toast === 'function') toast('⚠️ Tidak ada sisa kuota signifikan untuk dialihkan'); return; }
    const candidates = RealokasiSisaKuota.findCandidates({ holdingId });
    if (!candidates.length) { if (typeof toast === 'function') toast('⚠️ Tidak ada aset/holding lain dengan ruang kosong (porsi Milik Sendiri) untuk dialihkan'); return; }
    const built = RealokasiSisaKuota.buildPlan(sisa, candidates);
    if (!built.plan.length) { if (typeof toast === 'function') toast('⚠️ Tidak ada aset/holding lain dengan ruang kosong untuk dialihkan'); return; }
    const money = (typeof fmtFull === 'function') ? fmtFull : ((typeof fmt === 'function') ? fmt : (n) => 'Rp ' + Math.round(n || 0));
    let msg = '🔀 Alihkan sisa kuota titipan ' + (o.ownerName || 'owner ini') + ' (' + money(sisa) + ') ke:\n';
    built.plan.forEach((p) => { msg += '• ' + p.name + ' (' + (p.type === 'holding' ? 'Holding Investasi' : 'Buku Aset') + '): ' + money(p.alloc) + '\n'; });
    if (built.unallocated > InvestmentUI.DUST_THRESHOLD_RP) msg += 'Sisa ' + money(built.unallocated) + ' tetap belum teralokasi (tidak cukup ruang kosong di aset/holding lain).';
    const ok = await askConfirm(msg.trim(), { title: 'Alihkan Sisa Kuota', okText: 'Ya, Alihkan', danger: false, icon: '🔀' });
    if (!ok) return;
    InvestmentUI._applyRealokasiSisaKuota(built.plan, o.ownerId, o.ownerName);
  },

  // _applyRealokasiSisaKuota(plan,ownerId,ownerName) — mirror PERSIS Aset._applyRealokasiSisaKuota(),
  // 0 duplikasi logic tulis (SATU fungsi tulis bersama RealokasiSisaKuota.applyAllocationRow()).
  _applyRealokasiSisaKuota(plan, ownerId, ownerName) {
    let successCount = 0; let failCount = 0; let totalApplied = 0;
    (plan || []).forEach((item) => {
      const res = RealokasiSisaKuota.applyAllocationRow(item, ownerId, ownerName);
      if (res && res.ok) { successCount++; totalApplied += res.actualAlloc || 0; } else { failCount++; }
    });
    const money = (typeof fmtFull === 'function') ? fmtFull : ((typeof fmt === 'function') ? fmt : (n) => 'Rp ' + Math.round(n || 0));
    if (successCount > 0) {
      if (typeof toast === 'function') toast('✅ Sisa kuota dialihkan ke ' + successCount + ' aset/holding (' + money(totalApplied) + ')' + (failCount ? ', ' + failCount + ' gagal' : ''));
    } else {
      if (typeof toast === 'function') toast('⚠️ Gagal mengalihkan sisa kuota — coba lagi');
    }
    InvestmentUI._renderOwnersList();
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
    el.innerHTML = InvestmentUI._ownerQuotaText(draft[i], i);
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
        + (o.isSelf ? '' : InvestmentUI._ownerSettlementFieldHtml(o, i))
        + (o.isSelf ? '' : ('<div id="investOwnerKuota' + i + '">' + InvestmentUI._ownerQuotaText(o, i) + '</div>'))
        + '</div>';
    }).join('');
    InvestmentUI.updateOwnersTotal();
    // FITUR "Auto-Rebalance Porsi Pemilik": refresh panel penyesuaian (kalau sedang pending) tiap
    // kali list ini di-render ulang penuh — lihat _renderRebalancePanel(). Sama pola persis
    // Aset._renderOwnersList()/AccOwners._renderList().
    InvestmentUI._renderRebalancePanel();
  },

  // _ownerSettlementFieldHtml(o,i) — S661 (wiring UI dari fondasi S660
  // Investment.getOwnerSettlement()/setOwnerSettlement()): toggle status
  // owner non-SELF, HANYA dirender utk baris non-SELF (pemilik = "saya"
  // tidak relevan, tidak pernah masuk Buku Utang). 2 pilihan:
  //   - 'titipan' (default): perilaku SAMA seperti sebelum S660/S661 — porsi
  //     owner ini masuk Buku Utang (Investment._syncTitipanDebt()).
  //   - 'milik': owner ini pemilik SUNGGUHAN (mis. emas istri sendiri, BUKAN
  //     dana yang dititipkan buat dikelola) — porsi TETAP tercatat sbg
  //     kepemilikan owner ini (bisa difilter), TAPI TIDAK menghasilkan entry
  //     Buku Utang.
  // <select> dipilih (bukan checkbox) supaya label kedua opsi eksplisit
  // tampil, tidak ambigu spt checkbox bertuliskan status sebelumnya.
  _ownerSettlementFieldHtml(o, i) {
    const val = o.settlement === 'milik' ? 'milik' : 'titipan';
    return '<div class="fg u-mb0" style="margin-top:6px">'
      + '<label class="fl" style="margin-bottom:2px">Status Dana</label>'
      + '<select class="fi" id="investOwnerSettlement' + i + '" onchange="InvestmentUI.onOwnerSettlementChange(' + i + ',this.value)">'
      + '<option value="titipan"' + (val === 'titipan' ? ' selected' : '') + '>🔒 Dana Titipan (tercatat di Buku Utang)</option>'
      + '<option value="milik"' + (val === 'milik' ? ' selected' : '') + '>✅ Milik Sendiri Pemilik Ini (bukan titipan, tidak ada utang)</option>'
      + '</select>'
      + '</div>';
  },

  // onOwnerSettlementChange(i,val) — tulis pilihan status ke draft[i].settlement
  // saja (murni state, TIDAK menulis D.investments sampai saveOwners() — pola
  // sama persis onOwnerNameInput()/onOwnerPorsiInput() di atas). Efeknya baru
  // benar2 disinkronkan ke Buku Utang saat saveOwners() memanggil
  // Investment.setOwnerSettlement() (lihat di bawah).
  onOwnerSettlementChange(i, val) {
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!draft[i]) return;
    draft[i].settlement = val === 'milik' ? 'milik' : 'titipan';
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
      settlement: 'titipan',
    });
    InvestmentUI._renderOwnersList();
  },

  // removeOwnerRow(i) — hapus 1 baris pemilik dari draft (index i), lalu render ulang list.
  removeOwnerRow(i) {
    if (!Array.isArray(InvestmentUI._ownersDraft)) return;
    InvestmentUI._ownersDraft.splice(i, 1);
    // Index baris bisa bergeser setelah hapus — buang panel rebalance yang sedang tampil (kalau
    // ada) sama pola Aset.removeOwnerRow()/AccOwners.removeRow(), _renderOwnersList() di bawah
    // akan render ulang panel dari kondisi bersih (_rebalancePending null).
    InvestmentUI._rebalancePending = null;
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
    // SESI AF1 (fitur "Auto-fill Sisa Porsi", lihat DESIGN-LOCK-autofill-sisa-porsi.md): tandai
    // baris ini "ditulis manual" supaya tidak jadi target auto-fill (calculateRemainingShare(),
    // modules-calc.js) di kemudian hari.
    InvestmentUI._ownersDraft[i]._touched = true;
    InvestmentUI.updateOwnersTotal();
    // SESI 494 — "Kuota sisa" per owner terpisah dari validasi total-porsi 100% di atas (soft
    // warning, TIDAK menyentuh saveBtn.disabled — lihat _ownerQuotaText()/_updateOwnerQuotaDisplay()).
    InvestmentUI._updateOwnerQuotaDisplay(i);
    // SESI 552 (dulu SESI 551, read-only) — live-sync input "Nominal (Rp)" tiap ketik %, sama
    // pola kuota di atas. Update value DOM langsung (BUKAN _renderOwnersList ulang) supaya
    // fokus/kursor input porsi yang sedang diketik tidak hilang — pola sama persis
    // Aset.onOwnerPorsiInput().
    InvestmentUI._updateOwnerNominalDisplay(i);
    // SESI AF1 — auto-fill baris kosong berikutnya dgn sisa porsi (lihat _applyRemainingShare()).
    InvestmentUI._applyRemainingShare(i);
    // FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026): kalau ketikan ini bikin total porsi
    // >100% DAN ada porsi pemilik lain yang bisa dikurangi, tawarkan penyesuaian (proporsional/
    // dari terbesar/manual) lewat panel di bawah list — TIDAK pernah mengubah porsi pemilik lain
    // diam-diam, lihat _checkRebalanceTrigger()/_renderRebalancePanel(). Sama persis
    // Aset.onOwnerPorsiInput()/AccOwners.onPorsiInput().
    InvestmentUI._checkRebalanceTrigger(i);
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
    // SESI AF1: tandai baris ini "ditulis manual" (lihat onOwnerPorsiInput() di atas).
    InvestmentUI._ownersDraft[i]._touched = true;
    const porsiEl = document.getElementById('investOwnerPorsi' + i);
    if (porsiEl) porsiEl.value = porsi;
    InvestmentUI.updateOwnersTotal();
    InvestmentUI._updateOwnerQuotaDisplay(i);
    // SESI AF1 — auto-fill baris kosong berikutnya dgn sisa porsi (lihat _applyRemainingShare()).
    InvestmentUI._applyRemainingShare(i);
    // BUGFIX S622 (sama audit dgn Aset.onOwnerNominalInput(), lihat komentar panjangnya di
    // aset.js): onOwnerPorsiInput() (baris ~472) sudah memanggil _checkRebalanceTrigger()
    // tiap ketik, cabang Nominal (Rp) ini lupa -- padahal sama-sama bisa mendorong total
    // >100%. Tanpa baris ini, panel "⚖️ Porsi melebihi 100%" tidak pernah muncul kalau
    // user mendorong total lewat kolom Nominal, bukan Porsi (%).
    InvestmentUI._checkRebalanceTrigger(i);
  },

  // _applyRemainingShare(editedIndex) — SESI AF1 (fitur "Auto-fill Sisa Porsi", lihat
  // DESIGN-LOCK-autofill-sisa-porsi.md). Wrapper DOM+draft di sekitar calculateRemainingShare()
  // (PURE, modules-calc.js, SSOT dipakai 3 modal: sini, Aset._applyRemainingShare(),
  // AccOwners.onPorsiInput()) — kalau ada 1 baris kosong yg belum disentuh user, isi porsi &
  // Nominal (Rp) baris itu (holding investasi SELALU punya nilai>0, beda dari Aset), lalu refresh
  // total & kuota baris itu. Guard typeof: modules-calc.js selalu dimuat lebih dulu (GROUP_A
  // awal) jadi seharusnya selalu ada, tapi dijaga tetap aman kalau urutan berubah.
  _applyRemainingShare(editedIndex) {
    if (typeof calculateRemainingShare !== 'function') return;
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    const result = calculateRemainingShare(draft, editedIndex);
    if (!result) return;
    draft[result.targetIndex].porsi = result.porsi;
    const porsiEl = document.getElementById('investOwnerPorsi' + result.targetIndex);
    if (porsiEl) porsiEl.value = result.porsi;
    const value = InvestmentUI._ownersHoldingValue();
    if (value > 0) {
      const nomEl = document.getElementById('investOwnerNominal' + result.targetIndex);
      if (nomEl) nomEl.value = Math.round(value * result.porsi / 100);
    }
    InvestmentUI.updateOwnersTotal();
    InvestmentUI._updateOwnerQuotaDisplay(result.targetIndex);
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
    // S607 (OwnerRegistry.findOrCreate() wajib, mirror Aset.saveOwners()): baris
    // pemilik BARU non-SELF WAJIB lolos OwnerRegistry -- OwnerRegistry gagal
    // load / findOrCreate() bukan function -> saveOwners() FAIL-FAST (toast +
    // return SEBELUM Investment.setOwners() dipanggil, D.investments TIDAK
    // disentuh), bukan diam-diam fallback uid() acak spt sebelumnya.
    // Baris isSelf:true & baris yang ownerId-nya sudah ada TIDAK kena guard ini.
    let owners;
    try {
      owners = draft.map((o) => {
        let ownerId;
        if (o.ownerId && String(o.ownerId).trim()) {
          ownerId = String(o.ownerId).trim();
        } else if (o.isSelf && !selfIdUsed) {
          ownerId = 'SELF';
          selfIdUsed = true;
        } else if (!o.isSelf) {
          if (typeof OwnerRegistry === 'undefined' || typeof OwnerRegistry.findOrCreate !== 'function') {
            throw new Error('S607_OWNER_REGISTRY_UNAVAILABLE');
          }
          ownerId = OwnerRegistry.findOrCreate(o.ownerName.trim());
        } else {
          ownerId = String(typeof uid === 'function' ? uid() : Date.now() + Math.random());
        }
        return { ownerId, ownerName: o.ownerName.trim(), porsi: o.porsi, isSelf: !!o.isSelf };
      });
    } catch (e) {
      if (e && e.message === 'S607_OWNER_REGISTRY_UNAVAILABLE') { toast('⚠️ Fitur pemilik belum siap dimuat, coba lagi'); return; }
      throw e;
    }
    let h;
    try {
      h = Investment.setOwners(InvestmentUI._ownersModalHolding.id, owners);
    } catch (e) {
      toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan porsi kepemilikan'));
      return;
    }
    // S661: sinkronkan status "Titipan"/"Milik Sendiri" per owner non-SELF —
    // HARUS setelah Investment.setOwners() di atas (baris/ownerId final baru
    // pasti sudah ada di h.owners), 100% reuse Investment.setOwnerSettlement()
    // (fondasi S660, di dalamnya sudah memanggil _syncTitipanDebt() sendiri —
    // 0 rumus/sync Buku Utang baru ditulis di sini). Guard `typeof` (bukan
    // wajib): beberapa test unit memasang stub Investment minimal tanpa
    // method ini (pola sama guard TitipanReconcile/AIBus di bawah) — modul
    // investasi.js SUNGGUHAN (bukan stub) SELALU punya method ini sejak S660.
    if (typeof Investment.setOwnerSettlement === 'function') {
      owners.forEach((o) => {
        if (o.isSelf) return;
        const draftRow = draft.find((d) => (d.ownerId && String(d.ownerId).trim() === o.ownerId) || d.ownerName.trim() === o.ownerName);
        const settlement = draftRow && draftRow.settlement === 'milik' ? 'milik' : 'titipan';
        Investment.setOwnerSettlement(h.id, o.ownerId, settlement);
      });
      h = Investment.getHolding(h.id);
    }
    InvestmentUI._ownersModalHolding = h;
    InvestmentUI._ownersDraft = Investment.getOwners(h).map((o) => ({
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      porsi: o.porsi,
      isSelf: !!o.isSelf,
      settlement: (typeof Investment.getOwnerSettlement === 'function') ? Investment.getOwnerSettlement(h, o.ownerId) : 'titipan',
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
    const h = InvestmentUI._ownersModalHolding;
    const owners = typeof Investment !== 'undefined' ? Investment.getOwners(h) : [];
    InvestmentUI._ownersDraft = owners.map((o) => ({
      ownerId: o.ownerId,
      ownerName: o.ownerName,
      porsi: o.porsi,
      isSelf: !!o.isSelf,
      settlement: (typeof Investment !== 'undefined' && typeof Investment.getOwnerSettlement === 'function') ? Investment.getOwnerSettlement(h, o.ownerId) : 'titipan',
    }));
    InvestmentUI._rebalancePending = null;
    InvestmentUI._renderOwnersList();
    toast('↺ Draft direset ke data yang terakhir tersimpan');
    // MIGRASI data lama (Agustus 2026) — sama alasan openOwnersModal() di atas: draft dimuat
    // ulang dari data tersimpan bisa saja masih overflow >100% (data lama), jadi panel
    // penyesuaian perlu dicek ulang di sini juga, bukan cuma saat modal pertama dibuka.
    InvestmentUI._checkRebalanceTrigger(InvestmentUI._ownersDraft.length - 1);
  },

  // ============================================================================
  // FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026, permintaan user) — wiring UI modal
  // Investasi (investmentOwnersModal), sesi lanjutan setelah domain Aset & Akun (aset.js /
  // finance/akun.js). Rumus murni 100% REUSE calculateRebalance() (modules-calc.js, SSOT yang
  // sama dipakai Aset & AccOwners) — 0 rumus baru ditulis di sini, method2 di bawah PURE
  // UI/state di sekitarnya, copy pola PERSIS Aset._checkRebalanceTrigger()/_renderRebalancePanel()/
  // setRebalanceMethod()/setRebalanceManualOwner()/applyRebalance()/cancelRebalance() (aset.js)
  // dgn penyesuaian: id elemen 'assetOwners*'/'accountOwners*' -> 'investmentOwners*', radio name
  // 'assetRebalanceMethod'/'accountRebalanceMethod' -> 'investmentRebalanceMethod'. Field Nominal
  // (Rp) TIDAK disentuh langsung oleh applyRebalance() — _renderOwnersList() (dipanggil di
  // dalamnya) sudah menghitung ulang Nominal tiap baris dari porsi baru via _ownerNominalValue(),
  // sama seperti Aset/AccOwners.
  // ============================================================================
  // _checkRebalanceTrigger(editedIndex) — dipanggil dari onOwnerPorsiInput() tiap ketik. Set/reset
  // InvestmentUI._rebalancePending berdasarkan kondisi total porsi draft saat ini, TANPA pernah
  // menulis ke draft[].porsi — murni menentukan APAKAH panel penyesuaian perlu ditampilkan (& utk
  // baris mana), penulisan porsi beneran hanya lewat applyRebalance().
  _checkRebalanceTrigger(editedIndex) {
    if (typeof MultiOwnerEngine === 'undefined' || typeof calculateRebalance !== 'function') return;
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    if (!draft[editedIndex]) return;
    const total = MultiOwnerEngine.totalPorsi(draft);
    // Total masih <=100% — tidak ada yang perlu dikurangi, bersihkan pending kalau ada (mis. user
    // baru saja mengurangi lagi angka yang tadinya bikin overflow).
    if (total <= 100.0001) {
      if (InvestmentUI._rebalancePending) { InvestmentUI._rebalancePending = null; InvestmentUI._renderRebalancePanel(); }
      return;
    }
    let oldTotal = 0;
    draft.forEach((o, k) => { if (k === editedIndex || !o) return; oldTotal += typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : 0; });
    // Overflow tapi TIDAK ADA porsi pemilik lain yang bisa dikurangi (mis. cuma 1 baris terisi &
    // user isi angka >100% sendiri) — bukan kasus rebalance, biarkan updateOwnersTotal() (sudah
    // dipanggil sebelum ini) yang tampilkan peringatan "lebih X%".
    if (oldTotal <= 0) {
      if (InvestmentUI._rebalancePending) { InvestmentUI._rebalancePending = null; InvestmentUI._renderRebalancePanel(); }
      return;
    }
    if (!InvestmentUI._rebalancePending || InvestmentUI._rebalancePending.editedIndex !== editedIndex) {
      InvestmentUI._rebalancePending = { editedIndex, method: 'proporsional', manualIndex: null };
    }
    InvestmentUI._renderRebalancePanel();
  },

  // _rebalanceOwnerLabel(draft,i) — nama tampilan 1 baris pemilik utk preview panel, fallback
  // "Pemilik ke-N" (1-indexed) kalau nama masih kosong (baris baru yang belum diisi nama).
  _rebalanceOwnerLabel(draft, i) {
    const nm = draft[i] && typeof draft[i].ownerName === 'string' ? draft[i].ownerName.trim() : '';
    return nm ? nm : ('Pemilik ke-' + (i + 1));
  },

  // _renderRebalancePanel() — SATU titik render panel "⚖️ Porsi melebihi 100%" (pilihan metode +
  // preview penyesuaian + tombol Terapkan/Batal), dipasang sbg elemen sibling TEPAT SETELAH
  // #investmentOwnersList (dibuat sekali via insertAdjacentElement, dipakai ulang di render
  // berikutnya) supaya tidak perlu mengubah markup modal (modals.js) sama sekali. innerHTML
  // dikosongkan kalau InvestmentUI._rebalancePending null (tidak ada apa2 utk ditampilkan).
  _renderRebalancePanel() {
    const listBox = document.getElementById('investmentOwnersList');
    if (!listBox) return;
    let box = document.getElementById('investmentOwnersRebalanceBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'investmentOwnersRebalanceBox';
      listBox.insertAdjacentElement('afterend', box);
    }
    const pending = InvestmentUI._rebalancePending;
    if (!pending) { box.innerHTML = ''; return; }
    if (typeof calculateRebalance !== 'function') { box.innerHTML = ''; return; }
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    const calc = calculateRebalance(draft, pending.editedIndex, pending.method, pending.manualIndex);
    let body = '';
    if (!calc || !calc.ok) {
      const errMsg = calc && calc.error === 'manual_owner_insufficient'
        ? ('Porsi pemilik terpilih tidak cukup (kurang ' + calc.shortfall + '%) — pilih pemilik lain atau ganti metode.')
        : (calc && calc.error === 'manual_owner_not_selected' ? 'Pilih dulu pemilik yang porsinya mau dikurangi.' : 'Penyesuaian tidak bisa diterapkan — coba metode lain.');
      body = '<div style="font-size:12px;color:var(--accent2);font-weight:600;margin-bottom:10px;line-height:1.5">⚠️ ' + escapeHtml(errMsg) + '</div>';
    } else {
      body = '<div style="font-size:12px;line-height:1.6;margin-bottom:10px">'
        + calc.adjustments.map((a) => {
          const label = InvestmentUI._rebalanceOwnerLabel(draft, a.index);
          const changed = Math.abs(a.to - a.from) > 0.0001;
          return '<div style="display:flex;justify-content:space-between;gap:8px' + (changed ? '' : ';opacity:.6') + '"><span>' + escapeHtml(label) + '</span><span style="font-weight:600">' + a.from + '% → ' + a.to + '%</span></div>';
        }).join('')
        + '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);font-weight:700;color:var(--accent3)"><span>Total</span><span>' + calc.totalAfter + '%</span></div>'
        + '</div>';
    }
    const eligibleOthers = draft.map((o, k) => ({ o, k })).filter((x) => x.k !== pending.editedIndex && x.o && typeof x.o.porsi === 'number' && x.o.porsi > 0);
    const manualSelectHtml = pending.method === 'manual' ? (
      '<select class="fs u-mb10" onchange="InvestmentUI.setRebalanceManualOwner(this.value)">'
      + '<option value="">— Pilih pemilik —</option>'
      + eligibleOthers.map((x) => '<option value="' + x.k + '"' + (pending.manualIndex === x.k ? ' selected' : '') + '>' + escapeHtml(InvestmentUI._rebalanceOwnerLabel(draft, x.k)) + ' (' + x.o.porsi + '%)</option>').join('')
      + '</select>'
    ) : '';
    box.innerHTML =
      '<div style="background:var(--accent2-soft);border:1px solid var(--accent2);border-radius:12px;padding:12px 14px;margin-bottom:10px">'
      + '<div style="font-size:12.5px;font-weight:700;color:var(--accent2);margin-bottom:4px">⚖️ Porsi melebihi 100%</div>'
      + '<div style="font-size:11.5px;color:var(--text2);line-height:1.5;margin-bottom:10px">Porsi pemilik lama akan disesuaikan otomatis agar total kembali menjadi 100%.</div>'
      + '<div style="font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Cara menyesuaikan porsi</div>'
      + '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="radio" name="investmentRebalanceMethod" value="proporsional"' + (pending.method === 'proporsional' ? ' checked' : '') + ' onchange="InvestmentUI.setRebalanceMethod(this.value)"> Proporsional</label>'
      + '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="radio" name="investmentRebalanceMethod" value="largest"' + (pending.method === 'largest' ? ' checked' : '') + ' onchange="InvestmentUI.setRebalanceMethod(this.value)"> Kurangi dari pemilik terbesar</label>'
      + '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:10px;cursor:pointer"><input type="radio" name="investmentRebalanceMethod" value="manual"' + (pending.method === 'manual' ? ' checked' : '') + ' onchange="InvestmentUI.setRebalanceMethod(this.value)"> Pilih pemilik manual</label>'
      + manualSelectHtml
      + '<div style="font-size:11px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Penyesuaian porsi</div>'
      + body
      + '<div style="display:flex;gap:8px;margin-top:4px">'
      + '<button type="button" class="btn btn-primary u-flex1" style="padding:11px" data-action="InvestmentUI.applyRebalance"' + ((!calc || !calc.ok) ? ' disabled' : '') + '>✅ Terapkan Penyesuaian</button>'
      + '<button type="button" class="btn btn-ghost u-flex1" style="padding:11px" data-action="InvestmentUI.cancelRebalance">Batal</button>'
      + '</div>'
      + '</div>';
  },

  // setRebalanceMethod(method) — ganti metode penyesuaian di panel yang sedang tampil & render
  // ulang preview-nya. Pindah ke 'manual' otomatis pilih kandidat pertama (porsi terbesar dulu,
  // pola sama default "largest") supaya preview langsung ada isinya tanpa user harus pilih dulu
  // (tetap bisa diganti lewat dropdown).
  setRebalanceMethod(method) {
    if (!InvestmentUI._rebalancePending) return;
    InvestmentUI._rebalancePending.method = method;
    if (method === 'manual' && InvestmentUI._rebalancePending.manualIndex == null) {
      const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
      const editedIndex = InvestmentUI._rebalancePending.editedIndex;
      let best = -1; let bestPorsi = -1;
      draft.forEach((o, k) => { if (k === editedIndex || !o) return; const p = typeof o.porsi === 'number' && isFinite(o.porsi) ? o.porsi : 0; if (p > bestPorsi) { bestPorsi = p; best = k; } });
      InvestmentUI._rebalancePending.manualIndex = best >= 0 ? best : null;
    }
    if (method !== 'manual') InvestmentUI._rebalancePending.manualIndex = null;
    InvestmentUI._renderRebalancePanel();
  },

  // setRebalanceManualOwner(val) — dipanggil dari dropdown pemilih pemilik manual.
  setRebalanceManualOwner(val) {
    if (!InvestmentUI._rebalancePending) return;
    const idx = parseInt(val, 10);
    InvestmentUI._rebalancePending.manualIndex = isFinite(idx) ? idx : null;
    InvestmentUI._renderRebalancePanel();
  },

  // applyRebalance() — tulis hasil calculateRebalance() (metode & pilihan manual yang SEDANG aktif
  // di panel) ke InvestmentUI._ownersDraft, lalu render ulang list PENUH (aman — ini aksi diskrit
  // dari tap tombol, bukan tiap ketikan, jadi tidak ada masalah fokus/kursor input yang hilang
  // sama seperti addOwnerRow/removeOwnerRow). Baris yang porsinya berubah ditandai _touched supaya
  // tidak jadi target auto-fill calculateRemainingShare() di kemudian hari. _renderOwnersList()
  // yang dipanggil di bawah otomatis menghitung ulang Nominal (Rp) tiap baris dari porsi baru
  // (_ownerNominalValue()) — tidak perlu sync manual terpisah.
  applyRebalance() {
    const pending = InvestmentUI._rebalancePending;
    if (!pending) return;
    if (typeof calculateRebalance !== 'function') { toast('⚠️ Fitur penyesuaian porsi belum siap dimuat'); return; }
    const draft = Array.isArray(InvestmentUI._ownersDraft) ? InvestmentUI._ownersDraft : [];
    const calc = calculateRebalance(draft, pending.editedIndex, pending.method, pending.manualIndex);
    if (!calc || !calc.ok) { toast('⚠️ Penyesuaian tidak bisa diterapkan, coba metode lain'); return; }
    calc.adjustments.forEach((a) => {
      if (!draft[a.index]) return;
      draft[a.index].porsi = a.to;
      draft[a.index]._touched = true;
    });
    InvestmentUI._rebalancePending = null;
    InvestmentUI._renderOwnersList();
    toast('✅ Porsi pemilik lama disesuaikan otomatis');
  },

  // cancelRebalance() — tutup panel TANPA mengubah draft sama sekali (porsi yang baru diketik
  // user tetap seperti apa adanya, termasuk kalau totalnya masih >100% — total box di atas akan
  // terus tampilkan peringatan merah sampai user edit ulang sendiri).
  cancelRebalance() {
    InvestmentUI._rebalancePending = null;
    InvestmentUI._renderRebalancePanel();
  },
};

if (typeof window !== 'undefined') {
  window.InvestmentUI = InvestmentUI;
}
