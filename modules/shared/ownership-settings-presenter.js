// ownership-settings-presenter.js — Sesi 229-230: Settings → Ownership
// (tampilan read-only 5 tipe kepemilikan).
//
// Target eksplisit user: "Reuse existing: OwnershipEngine. No new engine.
// No business logic changes... Show existing ownership: SELF/INVESTOR/
// CUSTOMER/FAMILY/THIRD_PARTY. Read only from OwnershipEngine. No CRUD.
// No redesign."
//
// PRINSIP SESI INI:
//   - 0 engine baru: satu-satunya sumber daftar tipe/label/hitung adalah
//     OwnershipEngine (modules/shared/ownership-engine.js, S191) — TYPES,
//     label(), countByType() SEMUA method yang SUDAH ADA, tidak ada satu
//     pun ditambah/diubah di file itu sesi ini.
//   - 0 business logic baru: presenter ini CUMA menggabungkan 4 koleksi
//     yang SUDAH punya field `ownership` opsional sejak sesi-sesi
//     sebelumnya (D.accounts — S192, D.assets/D.investments — S193,
//     D.vehicles — S196) jadi satu array, lalu oper ke
//     OwnershipEngine.countByType() apa adanya. Tidak ada rumus/filter
//     baru yang menggantikan/menduplikasi isAccOwnershipSelf() dkk (fungsi2
//     itu tetap dipakai di tempat asalnya masing2, TIDAK disentuh).
//   - READ-ONLY: tidak ada create/update/delete apa pun di sini — presenter
//     ini cuma render angka. Ubah kepemilikan satu entity tetap lewat form
//     masing2 domain (Akun/Aset/Investasi/Kendaraan) seperti biasa, TIDAK
//     ditambah UI CRUD baru di sini sesuai batasan eksplisit "No CRUD".
//   - Guard typeof OwnershipEngine/D: kalau salah satu belum dimuat, render()
//     tampil aman (pesan kosong), TIDAK throw — pola sama presenter lain di
//     project ini (mis. DashboardSettings/BackupHealthPresenter).
const OwnershipSettingsPresenter = {

  // _collect() — gabungkan 4 koleksi existing yang SUDAH punya field
  // `ownership` opsional jadi satu array datar. TIDAK memvalidasi/mengubah
  // isi tiap entity (itu tugas OwnershipEngine.resolve() yang dipanggil
  // OwnershipEngine.countByType() sendiri) — murni concat referensi asli,
  // tidak clone (read-only, tidak ada mutasi jadi aman dibagikan apa
  // adanya).
  _collect() {
    if (typeof D === 'undefined') return [];
    return [].concat(D.accounts || [], D.assets || [], D.investments || [], D.vehicles || []);
  },

  // summary() — PURE, {ok,...} sama polanya dgn OwnershipEngine sendiri.
  // Return: {ok:true, total, counts} kalau OwnershipEngine tersedia,
  //   `counts` persis hasil OwnershipEngine.countByType() (SEMUA 5 tipe
  //   selalu jadi key, default 0). {ok:false, reason} kalau OwnershipEngine
  //   belum dimuat.
  summary() {
    if (typeof OwnershipEngine === 'undefined') {
      return { ok: false, reason: 'OwnershipEngine belum dimuat' };
    }
    const items = this._collect();
    const counted = OwnershipEngine.countByType(items);
    if (!counted.ok) return counted;
    return { ok: true, total: items.length, counts: counted.counts };
  },

  // render() — isi container '#ownershipSettingsList' (Settings → tab
  // Kepemilikan, index.html) dgn 1 baris read-only per tipe kepemilikan
  // resmi (urutan & label 100% dari OwnershipEngine.TYPES/label(), TIDAK
  // ada daftar tipe/label duplikat di sini). Guard container tidak ada ->
  // aman diam2 (pola sama semua presenter render() lain di project ini).
  render() {
    const el = typeof document !== 'undefined' ? document.getElementById('ownershipSettingsList') : null;
    if (!el) return;
    const s = this.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="u-hint10">Ownership Engine belum tersedia.</div>';
      return;
    }
    const esc = typeof escapeHtml === 'function' ? escapeHtml : String;
    el.innerHTML = OwnershipEngine.TYPES.map((t) => {
      const label = OwnershipEngine.label(t);
      const count = s.counts[t] || 0;
      return '<div class="setting-item"><div><div class="setting-label">' + esc(label) + '</div>'
        + '<div class="setting-sub">' + esc(t) + '</div></div>'
        + '<div class="u-fs14 u-fw600">' + count + '</div></div>';
    }).join('');
    const totalEl = document.getElementById('ownershipSettingsTotal');
    if (totalEl) totalEl.textContent = String(s.total);
  },

};
