// owner-registry-settings-ui.js — R4 UI wiring (audit ownership/titipan,
// AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md, menutup OWNREG-GATE3-001
// SEPENUHNYA). `OwnerRegistry.rename()`/`merge()` (modules/shared/
// owner-registry.js) sudah ditulis & diuji sejak Sesi 561
// (FIX-s561-r4-owner-registry-rename-merge.md, 7/7 test pass) TAPI sesi itu
// eksplisit "fondasi dulu, tanpa wiring" — 0 tempat di UI manapun yang
// memanggilnya, jadi user tetap tidak bisa rename/merge pemilik dari app.
// Sesi ini menutup gap itu: 1 titik akses terpusat di Settings.
//
// KENAPA 1 layar terpusat (Settings -> tab Kepemilikan, card baru), BUKAN
// tombol per-baris di 3 modal (assetOwnersModal/investmentOwnersModal/
// titipanCommitmentModal): `OwnerRegistry` itu SATU registry global dipakai
// lintas 3 domain sekaligus (lihat owner-registry.js) — pusatkan CRUD-nya
// di 1 tempat menghindari 3x duplikasi UI rename/merge yang harus
// disinkronkan manual tiap ada perubahan pola. Beda dgn `CustodianRegistry`
// (S540/S542) yang cukup 1 dropdown karena cuma dipakai 1 domain
// (investasi) — owner dipakai 3 domain, jadi butuh 1 layar ringkasan
// tersendiri supaya user bisa lihat SEMUA pemilik + dampak lintas-domain
// sebelum rename/merge, bukan cuma dampak di 1 modal yang kebetulan lagi
// dibuka.
//
// Reuse PENUH, 0 logic baru: `OwnerRegistry.listAll()/rename()/merge()`
// (S489/S561) untuk data, `showPromptModal()/showChoiceModal()/askConfirm()/
// showAlertModal()` (modal-navigasi.js) untuk interaksi — pola SAMA PERSIS
// `InvestmentListUI.renameCustodian()` (S542) untuk rename, dan `delAcc()`
// (akun.js, pilih akun tujuan sebelum hapus) untuk alur pilih target merge.
// Presenter ini MURNI render + wiring tipis ke fungsi-fungsi itu.

const OwnerRegistrySettingsUI = {

  // _usageCounts(id) — hitung berapa baris yang mereferensikan ownerId ini
  // lintas 3 domain, MURNI baca (0 mutasi). Dipakai utk (a) tampilan
  // "dipakai di N Aset/Investasi/Komitmen" per baris, (b) pesan konfirmasi
  // merge supaya user tahu skala dampak SEBELUM konfirmasi. Cara hitung
  // sama seperti bagian counting di `OwnerRegistry.rename()`/`merge()`
  // sendiri (owner-registry.js) — di sini cuma dibaca ulang utk ditampilkan,
  // bukan bagian dari mutasi.
  _usageCounts(id) {
    if (typeof D === 'undefined') return { assets: 0, investments: 0, commitments: 0, total: 0 };
    const assets = (Array.isArray(D.assets) ? D.assets : []).reduce((n, a) =>
      n + ((Array.isArray(a && a.owners) ? a.owners : []).filter((o) => o && !o.isSelf && String(o.ownerId) === String(id)).length), 0);
    const investments = (Array.isArray(D.investments) ? D.investments : []).reduce((n, h) =>
      n + ((Array.isArray(h && h.owners) ? h.owners : []).filter((o) => o && !o.isSelf && String(o.ownerId) === String(id)).length), 0);
    const commitments = (Array.isArray(D.titipanCommitments) ? D.titipanCommitments : [])
      .filter((c) => c && String(c.ownerId) === String(id)).length;
    return { assets, investments, commitments, total: assets + investments + commitments };
  },

  // render() — isi `#ownerRegistrySettingsList` (Settings -> tab
  // Kepemilikan) dgn 1 baris per entri `OwnerRegistry`, urut nama
  // (localeCompare, konsisten dgn dropdown lain di app, mis.
  // `InvestmentUI._ownerNameFieldHtml()`). Guard container/OwnerRegistry
  // tidak ada -> aman diam-diam, pola sama semua presenter render() lain di
  // project ini (mis. `OwnershipSettingsPresenter`/`BackupHealthPresenter`).
  render() {
    const el = typeof document !== 'undefined' ? document.getElementById('ownerRegistrySettingsList') : null;
    if (!el) return;
    if (typeof OwnerRegistry === 'undefined') {
      el.innerHTML = '<div class="u-hint10">Owner Registry belum tersedia.</div>';
      return;
    }
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    const list = OwnerRegistry.listAll().slice().sort((a, b) => String(a && a.name).localeCompare(String(b && b.name)));
    if (!list.length) {
      el.innerHTML = '<div class="u-hint10">Belum ada pemilik terdaftar. Entri baru otomatis muncul di sini setelah dipakai lewat "⚖️ Atur Porsi Kepemilikan" di Aset/Investasi/Dana Titipan.</div>';
      return;
    }
    el.innerHTML = list.map((o) => {
      const usage = OwnerRegistrySettingsUI._usageCounts(o.id);
      const parts = [];
      if (usage.assets) parts.push(usage.assets + ' Aset');
      if (usage.investments) parts.push(usage.investments + ' Investasi');
      if (usage.commitments) parts.push(usage.commitments + ' Komitmen Titipan');
      const sub = parts.length ? 'Dipakai di ' + parts.join(', ') : 'Belum dipakai di mana pun';
      const idArg = esc(JSON.stringify([String(o.id)]));
      return '<div class="setting-item"><div><div class="setting-label">' + esc(o.name) + '</div>'
        + '<div class="setting-sub">' + esc(sub) + '</div></div>'
        + '<div class="u-flex u-gap6"><button class="btn btn-sm btn-ghost" data-action="OwnerRegistrySettingsUI.renameOwner" data-args=\'' + idArg + '\'>✏️ Ubah Nama</button>'
        + '<button class="btn btn-sm btn-ghost" data-action="OwnerRegistrySettingsUI.mergeOwner" data-args=\'' + idArg + '\'>🔀 Gabung</button></div></div>';
    }).join('');
  },

  // renameOwner(id) — prompt nama baru (prefill nama lama lewat
  // `showPromptModal` defaultValue), delegasi PENUH ke
  // `OwnerRegistry.rename()` (S561, SUDAH propagasi ke `ownerName` di 3
  // domain sendiri — 0 propagasi manual di sini). Pola SAMA PERSIS
  // `InvestmentListUI.renameCustodian()` (S542).
  async renameOwner(id) {
    if (typeof OwnerRegistry === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pemilik belum siap dimuat'); return; }
    const entry = OwnerRegistry.listAll().find((o) => o && String(o.id) === String(id));
    if (!entry) { if (typeof toast === 'function') toast('⚠️ Pemilik tidak ditemukan'); return; }
    const name = typeof showPromptModal === 'function'
      ? await showPromptModal({ title: 'Ubah Nama Pemilik', message: 'Nama baru akan otomatis tampil di semua Aset/Investasi/Komitmen Titipan yang memakai pemilik ini.', defaultValue: entry.name, placeholder: 'Nama pemilik' })
      : (typeof prompt === 'function' ? prompt('Nama baru pemilik', entry.name) : null);
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const res = OwnerRegistry.rename(id, trimmed);
    if (!res.ok) { if (typeof toast === 'function') toast('⚠️ ' + (res.reason || 'Gagal mengubah nama')); return; }
    OwnerRegistrySettingsUI.render();
    if (typeof toast === 'function') toast('✅ Nama diubah ke "' + trimmed + '" (' + (res.assets + res.investments + res.commitments) + ' baris ikut diperbarui)');
  },

  // mergeOwner(id) — pilih target gabung lewat `showChoiceModal()` (modal
  // generik pilihan button-list, pola SAMA PERSIS `delAcc()` di akun.js:
  // "Pindahkan Data ke Akun Mana?"), konfirmasi eksplisit yang menjelaskan
  // tindakan irreversible, lalu delegasi PENUH ke `OwnerRegistry.merge()`
  // (S561, SUDAH punya guard tabrakan sendiri — `{ok:false,
  // reason:'conflict', conflicts}` kalau ada Aset/Investasi yang sudah
  // punya baris target DAN source sekaligus, BATAL TOTAL, 0 perubahan
  // parsial). 0 logic konflik baru ditulis di sini — presenter ini cuma
  // menerjemahkan hasil `merge()` jadi pesan yang bisa dipahami user.
  async mergeOwner(id) {
    if (typeof OwnerRegistry === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pemilik belum siap dimuat'); return; }
    const list = OwnerRegistry.listAll();
    const src = list.find((o) => o && String(o.id) === String(id));
    if (!src) { if (typeof toast === 'function') toast('⚠️ Pemilik tidak ditemukan'); return; }
    const others = list.filter((o) => o && String(o.id) !== String(id));
    if (!others.length) { if (typeof toast === 'function') toast('⚠️ Tidak ada pemilik lain untuk digabung'); return; }
    const choices = others.map((o) => ({ label: o.name }));
    const pickedIdx = typeof showChoiceModal === 'function'
      ? await showChoiceModal({
        title: 'Gabung "' + src.name + '" ke Pemilik Mana?',
        icon: '🔀',
        message: 'Semua Aset/Investasi/Komitmen Titipan milik "' + src.name + '" akan dipindah ke pemilik yang dipilih, lalu entri "' + src.name + '" dihapus dari daftar. Tindakan ini TIDAK BISA dibatalkan.',
        choices,
      })
      : null;
    if (pickedIdx === null || pickedIdx === undefined) return;
    const target = others[pickedIdx];
    if (!target) return;
    const confirmed = typeof askConfirm === 'function'
      ? await askConfirm('Gabung "' + src.name + '" ke "' + target.name + '"? Entri "' + src.name + '" akan dihapus dari daftar pemilik, semua Aset/Investasi/Komitmen Titipan miliknya dipindah ke "' + target.name + '".', { title: 'Konfirmasi Gabung Pemilik', okText: 'Ya, Gabung' })
      : true;
    if (!confirmed) return;
    const res = OwnerRegistry.merge(id, target.id);
    if (!res.ok) {
      if (res.reason === 'conflict') {
        const n = (res.conflicts || []).length;
        const msg = 'Gagal digabung: ' + n + ' Aset/Investasi sudah punya baris "' + src.name + '" DAN "' + target.name + '" sekaligus di daftar pemilik yang sama. Gabung dibatalkan total (0 perubahan) supaya kedua porsi tidak ke-collapse diam-diam — review manual dulu Aset/Investasi tsb sebelum coba gabung lagi.';
        if (typeof showAlertModal === 'function') await showAlertModal(msg, { title: '⚠️ Konflik Porsi' });
        else if (typeof toast === 'function') toast('⚠️ ' + msg);
      } else if (typeof toast === 'function') {
        toast('⚠️ ' + (res.reason || 'Gagal menggabung'));
      }
      return;
    }
    OwnerRegistrySettingsUI.render();
    if (typeof toast === 'function') toast('✅ "' + src.name + '" digabung ke "' + target.name + '" (' + (res.assets + res.investments + res.commitments + res.debts) + ' baris dipindah)');
  },

};

if (typeof window !== 'undefined') {
  window.OwnerRegistrySettingsUI = OwnerRegistrySettingsUI;
}
