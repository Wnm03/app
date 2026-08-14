// titipan-expense-flow.js — Sesi 521 (S521-A, implementasi Design Lock
// DESIGN-S520-DANA-TITIPAN-UI-MULTIOWNER.md, baseline v1251/S519).
//
// Scope: flow pencatatan pengeluaran Dana Titipan (single-owner & multi-owner)
// yang dipanggil dari modal khusus `titipanExpenseModal` (UI wiring: sesi
// terpisah/berikutnya, lihat catatan akhir file). File ini SENGAJA hanya
// berisi fungsi murni + 1 fungsi orkestrasi (`submit`) yang menyentuh
// D.transactions/save() — TIDAK ada engine baru, TIDAK ada schema baru,
// TIDAK ada counter persistent baru (Design Lock §15/§21/§22).
//
// Primitive S519/S390 yang di-reuse (0 re-implementasi logic):
//   - DanaTitipanPortfolioAPI.listExistingOwners() -- sumber daftar owner valid
//   - MultiOwnerEngine.splitByPorsi()/validateOwners() -- pembagian porsi
//   - applyTxTitipanLinkageOnSave() -- linkage titipanLinkId/titipanTalangan
//     (memanggil maybeCreateTitipanTalanganPiutang() sendiri kalau perlu)
//   - delTx() (tx-list-cashflow.js) -- SATU-SATUNYA jalur DELETE, tidak
//     disentuh/diduplikasi sama sekali oleh file ini (Design Lock §14).
//
// Rounding (Design Lock §10): proporsional -> Math.round() per row ->
// residual (input - sum(rounded)) diterapkan ke row TERAKHIR, supaya
// invariant sum(rows.amount)===inputAmount SELALU pas, tidak pernah ada
// uang hilang/tercipta akibat pembulatan.
//
// Duplicate submit (Design Lock §17): guard `_submitting` di-set SEBELUM
// validasi/commit & direset di `finally` -- pola sama `_txSaving`/
// `withSaveGuard()` (features-helpers-global-security.js). `submit()`
// menerima `opts.onBeforeCommit` opsional (dipanggil setelah validasi lolos,
// SEBELUM push ke D.transactions) supaya re-entrant call selama window itu
// bisa diverifikasi diblokir oleh test murni (tanpa perlu DOM/async nyata).

const TitipanExpenseFlow = {
  _submitting: false,

  // resolveOwner(ownerId) — guard existing-owner-only, pola SAMA PERSIS
  // resolveTxTitipanOwner() (transaksi.js S519). Tidak pernah mempercayai
  // ownerId yang tidak dikenal DanaTitipanPortfolioAPI.listExistingOwners().
  resolveOwner(ownerId) {
    if (!ownerId) return null;
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return null;
    if (typeof DanaTitipanPortfolioAPI.listExistingOwners !== 'function') return null;
    const list = DanaTitipanPortfolioAPI.listExistingOwners() || [];
    return list.find((o) => o && o.ownerId === ownerId) || null;
  },

  // computeSplitRows(nominal, owners) — Design Lock §9-10. `owners` di sini
  // sudah ter-resolve ({ownerId, ownerName, porsi}). Single owner: seluruh
  // nominal jadi 1 row (porsi tidak relevan, §7). Multi owner: reuse
  // MultiOwnerEngine.splitByPorsi() (PURE, 0 rounding di dalamnya per
  // dokumentasi engine itu sendiri) lalu rounding+residual jadi tanggung
  // jawab caller di sini, persis seperti didesain.
  computeSplitRows(nominal, owners) {
    if (typeof nominal !== 'number' || !isFinite(nominal) || nominal <= 0) {
      return { ok: false, reason: 'Nominal harus berupa angka lebih dari 0' };
    }
    if (!Array.isArray(owners) || owners.length === 0) {
      return { ok: false, reason: 'Minimal satu pemilik harus dipilih' };
    }
    const inputRounded = Math.round(nominal);
    if (owners.length === 1) {
      const o = owners[0];
      return {
        ok: true,
        rows: [{ ownerId: o.ownerId, ownerName: o.ownerName || o.ownerId, amount: inputRounded }],
      };
    }
    if (typeof MultiOwnerEngine === 'undefined' || typeof MultiOwnerEngine.splitByPorsi !== 'function') {
      return { ok: false, reason: 'MultiOwnerEngine belum dimuat' };
    }
    const split = MultiOwnerEngine.splitByPorsi(nominal, owners);
    if (!split.ok) return split;
    const rows = split.splits.map((s) => ({
      ownerId: s.ownerId,
      ownerName: s.ownerName,
      amount: Math.round(s.bagian),
    }));
    const sumRounded = rows.reduce((sum, r) => sum + r.amount, 0);
    const residual = inputRounded - sumRounded;
    rows[rows.length - 1].amount += residual;
    return { ok: true, rows };
  },

  // validate(input) — Design Lock §11. Tidak melakukan perubahan apa pun ke
  // D; murni memeriksa & mengembalikan {ok:true, owners, rows} siap pakai
  // atau {ok:false, reason}.
  //
  // input: {
  //   nominal (number), owners: [{ownerId, porsi?}],
  //   category, subcategory?, accountId, date, note?, talangan? (boolean)
  // }
  validate(input) {
    if (!input || typeof input !== 'object') {
      return { ok: false, reason: 'Input tidak valid' };
    }
    const nominal = input.nominal;
    if (typeof nominal !== 'number' || !isFinite(nominal) || nominal <= 0) {
      return { ok: false, reason: 'Nominal harus berupa angka lebih dari 0' };
    }
    const MAX_AMOUNT = 999000000000;
    if (nominal > MAX_AMOUNT) {
      return { ok: false, reason: 'Nominal terlalu besar' };
    }
    const ownerSel = Array.isArray(input.owners) ? input.owners : [];
    if (ownerSel.length === 0) {
      return { ok: false, reason: 'Minimal satu pemilik harus dipilih' };
    }
    const resolved = [];
    const seen = new Set();
    for (let i = 0; i < ownerSel.length; i++) {
      const sel = ownerSel[i];
      const known = this.resolveOwner(sel && sel.ownerId);
      if (!known) {
        return { ok: false, reason: `Pemilik ke-${i + 1} tidak dikenal/tidak valid: ${(sel && sel.ownerId) || '(kosong)'}` };
      }
      const key = String(known.ownerId).toLowerCase();
      if (seen.has(key)) {
        return { ok: false, reason: `Pemilik duplikat: "${known.ownerId}"` };
      }
      seen.add(key);
      resolved.push({
        ownerId: known.ownerId,
        ownerName: known.ownerName,
        porsi: ownerSel.length === 1 ? 100 : (sel && sel.porsi),
      });
    }
    if (resolved.length > 1) {
      if (typeof MultiOwnerEngine === 'undefined' || typeof MultiOwnerEngine.validateOwners !== 'function') {
        return { ok: false, reason: 'MultiOwnerEngine belum dimuat' };
      }
      const v = MultiOwnerEngine.validateOwners(resolved);
      if (!v.ok) return v;
    }
    if (!input.category) return { ok: false, reason: 'Kategori wajib diisi' };
    if (!input.accountId) return { ok: false, reason: 'Akun wajib dipilih' };
    if (!input.date) return { ok: false, reason: 'Tanggal wajib diisi' };

    const split = this.computeSplitRows(nominal, resolved);
    if (!split.ok) return split;
    const inputRounded = Math.round(nominal);
    const sumRows = split.rows.reduce((sum, r) => sum + r.amount, 0);
    if (sumRows !== inputRounded) {
      // Hard invariant Design Lock §10 -- seharusnya tidak pernah terjadi
      // (residual sudah diterapkan di computeSplitRows), tapi tetap dijaga
      // eksplisit di sini supaya submit() tidak pernah lolos kalau ada
      // regresi rounding di masa depan.
      return { ok: false, reason: 'Hasil pembagian tidak sama dengan nominal input' };
    }
    return { ok: true, owners: resolved, rows: split.rows };
  },

  // submit(input, opts) — Design Lock §12 (Atomicity) + §13 (Linkage) + §17
  // (Duplicate Submit). Sinkron total (0 await) supaya window race
  // double-click sesingkat mungkin; guard `_submitting` tetap disediakan
  // utk re-entrant call (mis. dipanggil lagi dari dalam onBeforeCommit,
  // yang disengaja hanya utk keperluan test tanpa DOM nyata).
  //
  // opts.onBeforeCommit() — opsional, dipanggil SETELAH validasi lolos,
  // SEBELUM transaksi dibuat/di-push. Kalau callback ini melempar/return
  // {abort:true}, submit dibatalkan tanpa menyentuh D.
  submit(input, opts) {
    opts = opts || {};
    if (this._submitting) {
      return { ok: false, reason: 'Sedang memproses transaksi sebelumnya, coba lagi' };
    }
    this._submitting = true;
    try {
      const v = this.validate(input);
      if (!v.ok) return v;

      if (typeof opts.onBeforeCommit === 'function') {
        const pre = opts.onBeforeCommit();
        if (pre && pre.abort) {
          return { ok: false, reason: pre.reason || 'Dibatalkan' };
        }
      }

      if (!D.transactions) D.transactions = [];
      const talangan = input.talangan === true;
      const txs = v.rows.map((row) => {
        const tx = {
          id: uid(),
          type: 'expense',
          amount: row.amount,
          category: input.category,
          subcategory: input.subcategory || '',
          accountId: input.accountId,
          payMethod: 'tunai',
          note: input.note || '',
          date: input.date,
          titipanLinkId: row.ownerId,
          // FIX (audit "Pemilik Sumber Potongan" tidak sync ke Dana Titipan):
          // isi juga `deductionOwnerId` -- field yang sejak S608 dibaca
          // dashboard Dana Titipan (badge "Ditanggung", kartu "Porsi per
          // Pemilik", "Estimasi dari Transaksi Akun") via
          // resolveTxOwnerAssignment() (filter-laporan.js). Modal ini
          // sebelumnya HANYA mengisi titipanLinkId, jadi transaksi lewat
          // sini selalu jatuh ke fallback owner pertama di layar2 itu. Di
          // sini aman diisi langsung dari row.ownerId (1 baris split = 1
          // owner sudah tervalidasi lewat resolveOwner()/validate() di
          // atas), TIDAK perlu divalidasi ulang terhadap owners akun.
          deductionOwnerId: row.ownerId,
        };
        if (talangan) tx.titipanTalangan = true;
        return tx;
      });

      // Step 3 (Design Lock §12): push semua transaksi secara synchronous.
      txs.forEach((tx) => { D.transactions.push(tx); });
      // Step 4: jalankan linkage S519 per transaksi (0 logic piutang baru
      // ditulis di sini -- 100% delegasi ke primitive S519).
      txs.forEach((tx) => { applyTxTitipanLinkageOnSave(tx, null); });
      // Step 5: satu save() setelah seluruh data valid & siap.
      save();

      return { ok: true, txIds: txs.map((t) => t.id), rows: v.rows, owners: v.owners };
    } finally {
      this._submitting = false;
    }
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitipanExpenseFlow;
}

// =====================================================================
// CATATAN UNTUK SESI BERIKUTNYA (S521-B) -- BELUM DIKERJAKAN SESI INI:
//
// Modal `titipanExpenseModal` (Design Lock §5) + tombol pemicu (mis. dari
// tab Dana Titipan) BELUM ditambahkan ke modals.js/index.html/
// app_production.html sesi ini. TitipanExpenseFlow di atas sudah lengkap &
// teruji (lihat tests/s521-titipan-expense-flow.test.js) sebagai lapis
// logic/orkestrasi -- sesi berikutnya tinggal:
//   1. Tambah entry MODAL_HTML baru (modals.js) utk #titipanExpenseModal
//      (field: nominal, owner selector multi-select dari
//      DanaTitipanPortfolioAPI.listExistingOwners(), porsi per owner kalau
//      >1 dipilih, kategori/akun/tanggal/catatan existing pattern, toggle
//      talangan) + 1 baris document.write(MODAL_HTML[N]) baru di KEDUA
//      index.html & app_production.html (index harus identik, lihat
//      FIX-v1139-to-v1141-s425-dedup-html-source-of-truth.md).
//   2. Handler buka modal (populate owner list) + handler save yang
//      mengumpulkan field form -> panggil TitipanExpenseFlow.submit()
//      via withSaveGuardAsync('titipanExpense','titipanExpenseModal', fn)
//      (pola sama Piutang.save()).
//   3. Daftarkan file ini di scripts/build.js GROUP_B (setelah
//      piutang-utang.js/transaksi.js/tx-list-cashflow.js) SEBELUM build
//      release dijalankan.
// Design ini sudah dibaca ulang; tidak ada bagian di atas yang mengubah
// primitive S519 atau menduplikasi logic delete/piutang.
// =====================================================================
