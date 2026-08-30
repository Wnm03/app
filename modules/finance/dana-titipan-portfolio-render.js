// dana-titipan-portfolio-render.js — Dana Titipan: render/UI
// (`DanaTitipanPortfolioPresenter`, `DanaTitipanCommitmentUI`,
// `DanaTitipanReturnUI`), termasuk baris pembanding otomatis "Estimasi
// dari Transaksi <Akun>" (`_expenseComparisonForOwner()`, Sesi C/S597).
//
// SESI R5 — REALISASI (sesi ini). PECAHAN KETIGA dari
// `dana-titipan-portfolio-presenter.js` (versi produksi s597) — lihat
// header `dana-titipan-aggregation-api.js` utk latar belakang split
// lengkap. WAJIB dimuat SETELAH `dana-titipan-aggregation-api.js` DAN
// `dana-titipan-commitment-return-api.js` di `scripts/build.js` — semua
// panggilan API di sini sudah fully-qualified `DanaTitipanPortfolioAPI.
// xxx()`, bukan `this.xxx()`, jadi 0 perubahan diperlukan akibat split.
// 0 rumus/logic diubah dari versi produksi s597, cuma dipindah apa
// adanya.
//
// DanaTitipanPortfolioPresenter — UI read-only di area Dana Kelolaan yang
// SUDAH ADA (kartu #danaKelolaanLapCard, tab Laporan Keuangan), container
// baru #danaTitipanPortfolioList ditaruh SETELAH
// #danaKelolaanTitipanDetailList (dana-kelolaan-presenter.js) di kartu yang
// sama — pola sama persis (baca-saja, guard container opsional, 0 CSS
// baru: reuse `<details>`/`<summary>` native browser utk expand per owner,
// class `u-flex`/`u-jcb`/`u-fs11`/`u-t2`/`u-fw700` yang sudah dipakai
// `renderTitipanDetail()`). TIDAK mengubah modal "Atur Porsi Kepemilikan"
// (`investasi-view.js`) sama sekali.
const DanaTitipanPortfolioPresenter = {

  // filterOwnerId / filterSettlement — S668 (sesi lanjutan eksplisit dari catatan
  // "Belum dikerjakan" SESSION-NOTE-S667.md: "filter Owner+Status nyambung ke tab
  // Dana Titipan (DanaTitipanPortfolioPresenter) — supaya konsisten dgn filter yang
  // sudah ada di daftar Investasi (S662, investasi-list-view.js) & daftar Buku Aset
  // (S667, aset.js)"), pola SAMA PERSIS InvestmentListUI.filterOwnerId/filterSettlement
  // tapi domain owner Dana Titipan (projection.owners hasil DanaTitipanPortfolioAPI.
  // build(), SUDAH per-owner NON-SELF, beda struktur dari Investasi/Aset yang per-item).
  // State UI MURNI (bukan ditulis ke D), direset ke '' tiap reload halaman.
  // filterOwnerId: '' = Semua Pemilik, atau ownerId dari salah satu projection.owners.
  // filterSettlement: '' = Semua Status, atau 'titipan'/'milik' (Aset.getOwnerSettlement()/
  // Investment.getOwnerSettlement(), S660/S665) -- HANYA relevan kalau filterOwnerId terisi.
  // SENGAJA hanya aktif utk container tab (#danaTitipanTabList, sub-tab Laporan > Dana
  // Titipan) -- kartu ringkas #danaTitipanPortfolioList di tab Ringkasan (Dana Kelolaan)
  // TIDAK diubah sama sekali, lihat gating `isTabView` di `_renderNow()`.
  filterOwnerId: '',
  filterSettlement: '',

  _money(n) {
    return (typeof fmtFull === 'function') ? fmtFull(n) : ((typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0)));
  },

  // _gainMoney(n) — SESI 634 (lanjutan audit UI/UX S631-633, temuan baru dari
  // screenshot user): _money()/fmtFull() SELALU pakai Math.abs() di dalamnya
  // (lihat modules/shared/format-tema.js) -- jadi utk nilai RUGI (gain < 0),
  // pola lama `${n>=0?'+':''}${this._money(n)}` menghasilkan teks TANPA tanda
  // minus sama sekali, cuma dibedakan lewat warna merah (mis. "Rp 13.070"
  // padahal itu KERUGIAN -13070). Ini bug keterbacaan/aksesibilitas nyata --
  // user bisa salah baca angka rugi sebagai untung kalau warna kurang
  // kontras/color-blind/mode grayscale. FIX: reuse `fmtFullSigned()` yang
  // SUDAH ADA (format-tema.js, cuma belum pernah dipakai di file ini) --
  // otomatis kasih prefix "-" utk negatif & "+" bisa kita tambah manual utk
  // positif spy tetap konsisten dgn pola "+Rp 0" yang sudah ada utk gain nol.
  _gainMoney(n) {
    n = Number(n || 0);
    if (typeof fmtFullSigned === 'function') return (n >= 0 ? '+' : '') + fmtFullSigned(n);
    return (n >= 0 ? '+' : '') + this._money(n);
  },

  _gainCls(n) {
    if (n > 0) return 'green';
    if (n < 0) return 'red';
    return '';
  },

  // _principalCell(o) — Sesi 485d: tampilkan "Pokok Dikomit" per owner.
  // "Belum dicatat" (BUKAN "Rp0") kalau owner ini belum punya record
  // commitment sama sekali (`principalAmount === null`, lihat build() S485c
  // — sengaja tidak didefault ke 0 supaya "belum pernah diisi" & "sudah
  // diisi 0" tetap kebedakan di tampilan).
  _principalCell(o) {
    if (o.principalAmount === null) return '<span class="u-t2">Belum dicatat</span>';
    return `<span class="u-fw700">${this._money(o.principalAmount)}</span>`;
  },

  // _unallocatedCell(o) — Sesi 485d: label WAJIB "Estimasi Belum
  // Teralokasi" (bukan Kas/Saldo/Dana Tersisa, sesuai rencana sesi —
  // angka ini estimasi dari pokok dikomit dikurangi yang sudah masuk
  // holding, BUKAN saldo kas riil). "Belum dicatat" kalau
  // PRINCIPAL_NOT_SET (estimatedUnallocated null dari build()), badge
  // ⚠️ + tampilkan kelebihan alokasi kalau OVER_ALLOCATED.
  _unallocatedCell(o) {
    if (o.allocationStatus === 'PRINCIPAL_NOT_SET') return '<span class="u-t2">Belum dicatat</span>';
    if (o.allocationStatus === 'OVER_ALLOCATED') {
      return `<span class="titipan-over-badge red">⚠️ Lebih ${this._money(o.overAllocatedAmount)}</span>`;
    }
    return `<span class="u-fw700">${this._money(o.estimatedUnallocated)}</span>`;
  },

  // _outstandingCell(o) — Sesi 486 (Case F). Label WAJIB "Pokok Belum
  // Dikembalikan" (bukan "Outstanding", sesuai rencana sesi). "Belum
  // dicatat" kalau PRINCIPAL_NOT_SET (outstandingPrincipal null dari
  // build() — konsisten dgn `_principalCell()`/`_unallocatedCell()`).
  _outstandingCell(o) {
    if (o.outstandingPrincipal === null) return '<span class="u-t2">Belum dicatat</span>';
    return `<span class="u-fw700">${this._money(o.outstandingPrincipal)}</span>`;
  },

  // _expenseComparisonForOwner(o) — Sesi C (Langkah B,
  // AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md §3 Langkah B): baris
  // pembanding OTOMATIS "Estimasi dari Transaksi <Akun>" di sebelah "Pokok
  // Dikomit" manual (§2 poin 1). REUSE 100% resolveTxOwnerSplitForAccount()
  // (filter-laporan.js, Sesi A — sumber owners SUDAH anti-basi, prioritas
  // Investment.getOwners() kalau linked) + MultiOwnerEngine.splitByPorsi()
  // -- 0 rumus baru ditulis di sini.
  //
  // SESI s597 (audit s595/s596, AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md):
  // fungsi ini SEBELUMNYA ditulis ke `dana-titipan-portfolio-render.js`
  // (file orphan, tidak pernah dibundle scripts/build.js) — TIDAK PERNAH
  // sampai ke user meski tes aslinya hijau (menguji file yang salah).
  // Diporting APA ADANYA ke sini (file produksi satu-satunya) — 0
  // rumus/logic diubah dari versi orphan, murni pindah lokasi + wiring
  // markup di renderInto() di bawah.
  //
  // Untuk tiap holding owner ini (o.holdings[], baik domain Aset MAUPUN
  // Investasi yang tertaut balik ke sebuah Aset ber-accountId): resolve
  // akun tertautnya, lalu HANYA proses kalau resolveTxOwnerSplitForAccount()
  // mengenali akun itu sebagai akun multi-owner DAN owner ini match salah
  // satu baris owners-nya (guard yang sama persis S567/568 -- kalau tidak
  // match, holding itu dilewati, BUKAN error). Total expense akun itu
  // dihitung ALL-TIME (seluruh `D.transactions`, TIDAK difilter periode --
  // beda dari modal Riwayat yang scope ke filter aktif, karena baris ini
  // representasi "total historis" sepadan `principalAmount` manual yang
  // juga bukan angka per-periode). `seenAcc` dedup by accountId (kalau
  // owner ini kebetulan punya >1 holding yang mengarah ke akun YANG SAMA
  // -- mis. Aset lama + Holding hasil link -- supaya expense akun itu
  // TIDAK dihitung dobel).
  //
  // FIX SESI S608 (audit user "apakah data dari akun transaksi yg
  // ditautkan dari dana titipan sync otomatis ke dashboard Dana Titipan"):
  // SEBELUM sesi ini, bagian owner dihitung PROPORSIONAL lewat
  // `MultiOwnerEngine.splitByPorsi(pengeluaranTotal, owners)` -- tidak
  // sinkron dgn kartu "Porsi per Pemilik" di Riwayat Transaksi yang sudah
  // pakai assignment eksplisit per transaksi (`resolveTxOwnerAssignment()`,
  // `t.deductionOwnerId`). Sekarang KEDUA tempat REUSE fungsi split yang
  // SAMA PERSIS -- 0 rumus baru, cuma pemanggilan
  // `resolveTxOwnerAssignment()` per transaksi lalu filter ke `o.ownerId`,
  // bukan proporsi lagi (lihat badan fungsi di bawah, & catatan lengkap di
  // `resolveTxOwnerAssignment()` sendiri, filter-laporan.js).
  //
  // FIX (laporan user Agustus 2026 -- "riwayat transaksi akun cicilan yang
  // ditautkan ke holding tidak terhitung di Dana Titipan" -- lihat catatan
  // Temuan #1/S601-3 di `resolveTxOwnerSplitForAccount()`, filter-laporan.js):
  // SEBELUM fix ini, `accountId` di sini HANYA pernah diisi lewat sebuah
  // Aset perantara (`h.linkedAssetId`/`h.linkedInvestmentId` -> `asset.
  // accountId`) -- holding yang ditautkan LANGSUNG ke akun lewat "🔗
  // Hubungkan ke Akun" (investasi-list-view.js, field `h.accountId`, S601-3)
  // TANPA Aset sama sekali di antaranya tidak pernah menghasilkan
  // `accountId` di sini, jadi baris ini diam-diam melewati holding itu
  // (bukan cuma nilainya 0 -- baris "Estimasi dari Transaksi <Akun>" tidak
  // muncul sama sekali kalau itu satu-satunya holding owner ini). FIX: cek
  // tautan LANGSUNG holding->akun LEBIH DULU (`Investment.getHolding(h.
  // linkedInvestmentId).accountId`, pola prioritas SAMA PERSIS
  // `resolveOwnerDefaultForAccount()` di transaksi.js -- "Holding MENANG"),
  // baru fallback ke rute lewat Aset kalau holding itu sendiri tidak
  // ditautkan akun secara langsung -- 0 regresi utk kasus lama (Aset ber-
  // accountId, holding TANPA h.accountId sendiri).
  //
  // Tidak menyentuh `principalAmount`/`outstandingPrincipal`/
  // `_principalCell()`/`_outstandingCell()` -- murni baca tambahan.
  //
  // Return: null kalau tidak ada satupun holding owner ini yang tertaut ke
  // akun ber-transaksi multi-owner (baris disembunyikan) -- kalau tidak,
  // `{total, accountNames}` (`total` angka, `accountNames` array nama akun
  // unik yang ikut menyumbang, dipakai label baris supaya generik/tidak
  // hardcode "Majoris").
  //
  // CATATAN SESI PATCH-2026-08-14 (audit user: "Estimasi Belum Teralokasi"
  // tidak mencerminkan akun tertaut yang modal-pengeluarannya sudah
  // terpotong): formula fungsi ini DIDUPLIKASI SENGAJA (bukan dipindah) ke
  // `DanaTitipanPortfolioAPI._linkedExpenseTotalForOwner()`
  // (dana-titipan-aggregation-api.js, dipanggil dari `build()`) supaya
  // hasilnya bisa jadi INPUT pengurang `estimatedUnallocated` (sebelumnya
  // baris "Estimasi dari Transaksi <Akun>" di sini PASIF, tidak pernah
  // mengurangi apa pun). Fungsi INI (di render) TETAP dipertahankan
  // menghitung mandiri (bukan dialihkan baca `o.linkedExpenseTotal`) demi
  // 0 regresi terhadap kontrak test yang sudah ada
  // (`tests/sC-titipan-majoris-expense-comparison.test.js`, memanggil
  // fungsi ini langsung dgn `o` buatan tangan tanpa lewat `build()`) — 0
  // rumus/logic diubah dari versi s608, cuma komentar ini ditambah. Kedua
  // fungsi 100% sama formulanya (copy identik dari sini ke
  // `_linkedExpenseTotalForOwner()`, satu-satunya beda kontrak: fungsi di
  // sini balik `null` utk "sembunyikan baris", punya itu balik
  // `{total:0, accountNames:[]}` supaya caller `build()` bisa langsung
  // dijumlah) — kalau salah satu diubah di sesi mendatang, WAJIB ubah
  // keduanya bersamaan (lihat catatan silang di
  // `_linkedExpenseTotalForOwner()`).
  _expenseComparisonForOwner(o) {
    if (typeof resolveTxOwnerSplitForAccount !== 'function' || typeof resolveTxOwnerAssignment !== 'function' || typeof MultiOwnerEngine === 'undefined') return null;
    if (typeof D === 'undefined' || !Array.isArray(D.assets) || !Array.isArray(D.transactions)) return null;
    const seenAcc = new Set();
    let total = 0;
    const accountNames = [];
    (o.holdings || []).forEach((h) => {
      if (!h) return;
      let accountId = null;
      let accountLabel = null;
      // Prioritas 0 (S601-3): holding tertaut LANGSUNG ke akun, 0 Aset perantara.
      if (h.linkedInvestmentId && typeof Investment !== 'undefined' && typeof Investment.getHolding === 'function') {
        const srcHolding = Investment.getHolding(h.linkedInvestmentId);
        if (srcHolding && srcHolding.accountId) {
          accountId = srcHolding.accountId;
          accountLabel = srcHolding.name;
        }
      }
      // Prioritas 1 (rute lama): via Aset perantara -- HANYA dicek kalau prioritas 0 kosong.
      if (!accountId) {
        let asset = null;
        if (h.type === 'aset' && h.linkedAssetId) {
          asset = D.assets.find((a) => a && sameId(a.id, h.linkedAssetId));
        } else if (h.linkedInvestmentId) {
          asset = D.assets.find((a) => a && sameId(a.investmentId, h.linkedInvestmentId));
        }
        accountId = asset && asset.accountId;
        accountLabel = asset && asset.name;
      }
      if (!accountId || seenAcc.has(accountId)) return;
      seenAcc.add(accountId);
      const resolved = resolveTxOwnerSplitForAccount(accountId);
      if (!resolved) return;
      const idx = resolved.owners.findIndex((ow) => ow && ow.ownerId === o.ownerId);
      if (idx < 0) return;
      // FIX SESI S608 (audit user "apakah data dari akun transaksi yg
      // ditautkan dari dana titipan sync otomatis ke dashboard Dana
      // Titipan" -- lihat catatan lengkap di `resolveTxOwnerAssignment()`,
      // filter-laporan.js, sesi yg sama). SEBELUM fix ini, baris "Estimasi
      // dari Transaksi <Akun>" di sini dihitung PROPORSIONAL lewat
      // `MultiOwnerEngine.splitByPorsi(pengeluaranTotal, resolved.owners)`
      // -- padahal kartu "Porsi per Pemilik" di Riwayat Transaksi
      // (`showFilteredTx()`, filter-laporan.js) SUDAH diubah sesi lama
      // ("Porsi per Pemilik bukan sistem patungan") jadi penjumlahan per
      // ASSIGNMENT EKSPLISIT tiap transaksi (`resolveTxOwnerAssignment()`,
      // sekarang baca `t.deductionOwnerId` stlh fix di atas) -- 2 layar yg
      // SAMA-SAMA merepresentasikan "pengeluaran akun ini per pemilik"
      // memakai 2 definisi split BERBEDA, jadi angkanya TIDAK PERNAH sama
      // (mis. transaksi yg deductionOwnerId-nya diarahkan ke pemilik minor
      // tetap ikut "nyicip" ke pemilik mayoritas di sini lewat splitByPorsi
      // proporsional, padahal Riwayat Transaksi sudah benar 100% ke
      // pemilik minor). FIX: ganti ke SATU sumber kebenaran yg sama persis
      // dgn `showFilteredTx()` -- jumlah transaksi yg `resolveTxOwnerAssignment()`
      // (REUSE 100%, sudah global lewat filter-laporan.js yg dimuat lebih
      // dulu di scripts/build.js -- 0 rumus split baru ditulis di sini)
      // resolve ke `o.ownerId` PERSIS, bukan proporsi porsi kepemilikan
      // lagi. `MultiOwnerEngine`/`splitByPorsi` TIDAK dipakai lagi di
      // fungsi ini (baris lama dibuang, bukan cuma tidak dipanggil).
      const ownerExpenseTotal = D.transactions
        .filter((t) => t && t.type === 'expense' && sameId(t.accountId, accountId) && resolveTxOwnerAssignment(t, resolved.owners) === o.ownerId)
        .reduce((s, t) => s + (isFinite(t.amount) ? Number(t.amount) : 0), 0);
      total += ownerExpenseTotal;
      accountNames.push(accountLabel || 'Akun');
    });
    // SESI S620 -- twin fix dari `_linkedExpenseTotalForOwner()`
    // (dana-titipan-aggregation-api.js, catatan lengkap di sana & di
    // `resolveTxOwnerSplitForAccount()`, filter-laporan.js), WAJIB diubah
    // bersamaan per konvensi file ini ("kedua fungsi 100% sama formulanya").
    // Loop kedua ini scan `D.accounts` langsung utk owner yang 0 holding
    // sama sekali (mis. "Uang motor") -- REUSE 100% dedup `seenAcc` & pola
    // filter loop pertama, beda hanya `sameId()` (bukan `String()`) & TANPA
    // exclude `titipanLinkId`, konsisten kontrak murni-display fungsi ini.
    if (typeof D !== 'undefined' && Array.isArray(D.accounts)) {
      D.accounts.forEach((acc) => {
        if (!acc || !acc.id || seenAcc.has(acc.id)) return;
        const resolved = resolveTxOwnerSplitForAccount(acc.id);
        if (!resolved) return;
        const idx = resolved.owners.findIndex((ow) => ow && ow.ownerId === o.ownerId);
        if (idx < 0) return;
        seenAcc.add(acc.id);
        const ownerExpenseTotal = D.transactions
          .filter((t) => t && t.type === 'expense' && sameId(t.accountId, acc.id) && resolveTxOwnerAssignment(t, resolved.owners) === o.ownerId)
          .reduce((s, t) => s + (isFinite(t.amount) ? Number(t.amount) : 0), 0);
        total += ownerExpenseTotal;
        accountNames.push(acc.name || 'Akun');
      });
    }
    if (!accountNames.length) return null;
    return { total, accountNames };
  },

  // _returnsHistoryHtml(ownerId) — Sesi 486 (Case F). Riwayat baris
  // pengembalian per owner, 100% konsumsi
  // `DanaTitipanPortfolioAPI.getReturns(ownerId)` (0 agregasi baru di
  // sini — total sudah dihitung `build()`). Kosong -> string kosong
  // (TIDAK render heading "Riwayat" kalau tidak ada isi, pola sama
  // `o.holdings.map()` di atas yang juga diam kalau kosong).
  // `notes` WAJIB lewat `escapeHtml()` (field user-controlled, sama
  // seperti `ownerName`).
  _returnsHistoryHtml(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return '';
    const list = DanaTitipanPortfolioAPI.getReturns(ownerId) || [];
    if (!list.length) return '';
    // S642 (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md): tema "modern"
    // pakai mini-tabel (reuse class .tx-tbl* dari s637, 0 CSS baru) KHUSUS
    // isi daftar riwayat pengembalian ini -- struktur <details> pembungkus
    // kartu owner (pemanggil, baris ~852) TIDAK disentuh sama sekali, sesuai
    // batasan rencana ("perluas isi badan <details>, bukan ganti
    // struktur-nya"). 10 tema lama tetap jalur div/flex lama apa adanya.
    if (typeof D !== 'undefined' && D.profile && D.profile.theme === 'modern') {
      return `
          <div class="u-fs11 u-t2 u-ml10 u-mt4">Riwayat pengembalian:</div>
          <div class="tx-tbl-wrap u-ml10"><table class="tx-tbl"><thead><tr><th>Tanggal</th><th>Catatan</th><th class="num">Nominal</th><th></th></tr></thead><tbody>
          ${list.map((r) => `
            <tr class="tx-tbl-row">
              <td class="tx-tbl-date">${r.returnDate ? escapeHtml(r.returnDate) : '—'}</td>
              <td>${r.notes ? escapeHtml(r.notes) : ''}</td>
              <td class="num tx-amount money">↩️ ${this._money(r.amount)}</td>
              <td class="tx-tbl-del"><button type="button" class="card-setting-btn" data-action="DanaTitipanReturnUI.deleteEntry" data-args='["${r.id}"]' aria-label="Hapus riwayat pengembalian">🗑️</button></td>
            </tr>
          `).join('')}
          </tbody></table></div>`;
    }
    return `
          <div class="u-fs11 u-t2 u-ml10 u-mt4">Riwayat pengembalian:</div>
          ${list.map((r) => `
            <div class="u-flex u-jcb u-fs11 u-mb2 u-ml10">
              <span>↩️ ${this._money(r.amount)}${r.returnDate ? ` <span class="u-t2">(${escapeHtml(r.returnDate)})</span>` : ''}${r.notes ? ` <span class="u-t2">— ${escapeHtml(r.notes)}</span>` : ''}</span>
              <button type="button" class="card-setting-btn" data-action="DanaTitipanReturnUI.deleteEntry" data-args='["${r.id}"]' aria-label="Hapus riwayat pengembalian">🗑️</button>
            </div>
          `).join('')}`;
  },

  // _assetOptionsHtml() — SESI 515 (Owner -> Nominal -> Asset -> Kuota ->
  // Porsi). Bangun daftar `<option>` `D.assets` utk dropdown picker "Pilih
  // Aset" per kartu owner — langkah "Asset" di flow, supaya user bisa
  // lompat dari kartu owner LANGSUNG ke `assetOwnersModal` (aset.js, S392a+,
  // live Kuota S505) tanpa cari manual di Buku Aset. PURE, hanya baca
  // `D.assets` — 0 tulis, 0 SSOT baru. Pola SAMA PERSIS
  // `vehicleAssetLinkOptionsHtml()` (modules/vehicle/vehicle-core.js, S506),
  // beda sengaja: 0 filter jenis (dana titipan bisa dialokasikan ke aset
  // jenis apa pun, bukan cuma Kendaraan).
  // Return: string HTML `<option>` (opsi pertama selalu placeholder kosong).
  //
  // FIX s599 (laporan user: 2 aset yang sudah "hilang" dari Buku Aset TETAP
  // muncul di dropdown/picker "Pilih Aset" ini, padahal tidak ada lagi di
  // Buku Aset maupun di Holding Investasi). ROOT CAUSE: fungsi ini SATU-
  // SATUNYA titik baca `D.assets` di modul Dana Titipan yang TIDAK menerapkan
  // guard `_migratedToInvestmentId`/`investmentId` — guard yang sama sudah
  // dipakai `Aset.renderList()` (aset.js, filter Buku Aset), `Aset.totalValue()`
  // (aset.js), dan `_assetSplits()` (dana-titipan-aggregation-api.js, fix
  // s554/s594) untuk definisi "aset ini masih dihitung/tampil di mana" yang
  // konsisten. Karena luput di sini, aset yang sudah tertaut manual ke
  // Holding Investasi (`a.investmentId`) ATAU sudah dimigrasi otomatis
  // (`a._migratedToInvestmentId`, s476a) — keduanya SENGAJA disembunyikan
  // dari Buku Aset tapi TETAP ADA di `D.assets` agar reversible — tetap
  // muncul sebagai opsi picker, padahal representasinya yang aktif sudah
  // pindah ke domain Holding (bukan "dihapus" secara data, tapi dari sudut
  // pandang user tampak seperti aset hantu/duplikat yang seharusnya sudah
  // tidak ada). FIX: tambah filter yang SAMA PERSIS dengan
  // `Aset.totalValue()` — 0 rumus baru, murni menyamakan definisi.
  // FIX s608 (laporan user, screenshot dropdown "Pilih Aset" hanya berisi
  // entri Buku Aset seperti "vario 125 kzr"/"Vario 110" -- Holding
  // Investasi (mis. "Majoris", "bibit", instrumen milik owner lain di
  // kartu "Total Teralokasi" di bawahnya) TIDAK PERNAH muncul jadi opsi,
  // padahal user perlu buka "⚖️ Atur Porsi Aset" utk Holding juga, bukan
  // cuma Buku Aset). ROOT CAUSE: dropdown ini SELALU murni baca
  // `D.assets` (lihat komentar s599 di atas) -- `D.investments[]`
  // (SSOT Holding sejak s476b) tidak pernah diikutkan sama sekali.
  // FIX (additive, 0 baris lama diubah): opsi Holding ditambahkan
  // SETELAH opsi Buku Aset, value diberi prefix `h:` (mis. `h:h1`) supaya
  // `openAssetPorsi()` bisa membedakan routing tanpa nebak/duplikat id
  // dengan Buku Aset (id Buku Aset & Holding punya ruang id terpisah,
  // tapi prefix ini jaga-jaga eksplisit + gampang dibaca kode). Ikon 📈
  // (beda dari 🏦 label Buku Aset di baris holding lain) + nama
  // custodian (kalau ada) supaya user gampang bedakan holding yang mirip
  // nama antar institusi. 0 filter jenis, sama prinsip Buku Aset di atas.
  _assetOptionsHtml() {
    const opts = ['<option value="">— Pilih Aset —</option>'];
    const list = (typeof D !== 'undefined' && Array.isArray(D.assets)) ? D.assets : [];
    list
      .filter((a) => a && !a._migratedToInvestmentId && !a.investmentId)
      .forEach((a) => {
        if (!a || !a.id) return;
        opts.push('<option value="' + a.id + '">' + escapeHtml(a.name || '?') + '</option>');
      });
    const holdings = (typeof D !== 'undefined' && Array.isArray(D.investments)) ? D.investments : [];
    holdings.forEach((h) => {
      if (!h || !h.id) return;
      const label = '📈 ' + (h.name || '?') + (h.custodian ? ' (' + h.custodian + ')' : '');
      opts.push('<option value="h:' + h.id + '">' + escapeHtml(label) + '</option>');
    });
    return opts.join('');
  },

  // _holdingCustodianId(hh) — SESI 540-D (Tahap 4/4 DESIGN-S540-
  // CUSTODIAN-GROUPING.md). Baris `hh` di sini adalah entri hasil
  // `DanaTitipanPortfolioAPI.build()` (bucket.holdings[]) — build() itu
  // SENGAJA TIDAK diubah sesi ini (0 field custodianId ditambahkan ke
  // hasilnya), jadi grouping HARUS baca `custodianId` LANGSUNG dari
  // sumber aslinya (`Investment.getHolding()`) di layer render ini, bukan
  // dari `hh`. Hanya baris Investasi (`hh.linkedInvestmentId` terisi)
  // yang punya kemungkinan custodianId — baris Aset (`linkedAssetId`,
  // `linkedInvestmentId` null) TIDAK PERNAH punya custodian (scope S540
  // sengaja cuma `D.investments[]`, lihat Non-goals di Design Lock),
  // jadi otomatis flat. Guard typeof berlapis pola sama fungsi lain di
  // file ini — balikin null (bukan throw) kalau dependency belum dimuat
  // atau holding sumbernya sudah tidak ada (mis. terhapus di antara
  // build() & render, race kecil yang sudah ditoleransi pola lain di
  // file ini juga).
  _holdingCustodianId(hh) {
    if (!hh || !hh.linkedInvestmentId) return null;
    if (typeof Investment === 'undefined' || typeof Investment.getHolding !== 'function') return null;
    const src = Investment.getHolding(hh.linkedInvestmentId);
    return (src && src.custodianId) ? src.custodianId : null;
  },

  // _custodianName(custodianId) — lookup nama dari `CustodianRegistry`
  // (S540-A). Fallback "Kustodian" (BUKAN crash/kosong) kalau id-nya
  // sudah tidak ada di registry (mis. dihapus manual dari data, out-of-
  // scope UI hapus kustodian di paket S540) — grup tetap bisa dibuka,
  // cuma labelnya generic.
  _custodianName(custodianId) {
    if (typeof CustodianRegistry === 'undefined' || typeof CustodianRegistry.listAll !== 'function') return 'Kustodian';
    const found = CustodianRegistry.listAll().find((c) => c && c.id === custodianId);
    return (found && found.name && String(found.name).trim()) || 'Kustodian';
  },

  // _groupHoldingsByCustodian(holdings) — SESI 540-D. Kelompokkan array
  // `o.holdings` (urutan SUDAH terjaga dari build(), sort by
  // allocatedPrincipal desc — TIDAK diubah di sini) jadi urutan node
  // campuran: baris flat (0 custodian) apa adanya di posisi asalnya, DAN
  // grup per kustodian (SATU grup per kustodian, dibuka pertama kali
  // kustodian itu muncul, baris berikutnya dgn kustodian yang SAMA masuk
  // ke grup yang SAMA walau tidak berurutan di array asal). Keputusan
  // Design Lock: holding tanpa custodianId (null/undefined) TETAP FLAT
  // di luar grup — BUKAN dikumpulkan ke grup "Lainnya" (data lama tidak
  // boleh tersembunyi di balik grup baru). Murni reshaping array utk
  // render, 0 agregasi angka baru (pokok/nilai/gain per grup TIDAK
  // dijumlahkan sesi ini — non-goal, header grup hanya nama + jumlah
  // instrumen).
  //
  // FIX s593 (laporan user: "🏦 Majoris" tampil 2x sbg 2 grup terpisah
  // yang isinya kepisah). ROOT CAUSE: grouping dikunci by `custodianId`
  // MENTAH-MENTAH, sedangkan `CustodianRegistry.findOrCreate()`/
  // `rename()` (custodian-registry.js) SENGAJA TIDAK collapse entri
  // yang kebetulan namanya jadi sama (dedup registry itu sendiri by
  // `id`, bukan by nama — lihat catatan di file itu). Kalau 2 entri
  // `D.investmentCustodians` beda `id` tapi sama-sama bernama "Majoris",
  // sebelumnya kode ini bikin 2 node grup terpisah krn `groupIndexById`
  // dikunci by `custodianId`. FIX: kunci grouping by NAMA kustodian yang
  // sudah dinormalisasi (trim + lowercase, pola sama persis dedup-by-
  // nama `CustodianRegistry.findOrCreate()`) — bukan ganti dedup
  // registry (itu tetap by-id, TIDAK disentuh), murni di layer render
  // ini supaya kustodian dgn nama yang sama SELALU digabung jadi 1 grup
  // visual, apa pun `id` aslinya.
  _groupHoldingsByCustodian(holdings) {
    const nodes = [];
    const groupIndexByName = new Map();
    (holdings || []).forEach((hh) => {
      const custodianId = this._holdingCustodianId(hh);
      if (!custodianId) {
        nodes.push({ kind: 'flat', holding: hh });
        return;
      }
      const custodianName = this._custodianName(custodianId);
      const nameKey = String(custodianName).trim().toLowerCase();
      if (!groupIndexByName.has(nameKey)) {
        groupIndexByName.set(nameKey, nodes.length);
        nodes.push({ kind: 'group', custodianId, custodianName, items: [] });
      }
      nodes[groupIndexByName.get(nameKey)].items.push(hh);
    });
    return nodes;
  },

  // _holdingRowHtml(hh) — SESI 540-D: markup 1 baris holding, DIEKSTRAK
  // apa adanya dari isi `o.holdings.map()` lama (0 perubahan visual utk
  // baris flat — dipakai ulang persis sama baik di luar maupun di dalam
  // grup kustodian, supaya baris di dalam grup tampil identik dgn baris
  // flat, cuma beda posisi/indentasi lewat markup pembungkus grup).
  // SESI s591: tombol "⚖️ Atur Porsi" PER-BARIS holding (dulu ada di
  // sini, khusus baris `hasGainTracking:false`/Aset) DIHAPUS — redundan
  // dgn dropdown "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" yang SUDAH
  // ada per kartu owner (lihat `_ownerCardHtml()`/markup sekitar
  // `titipanAssetPick_${oi}`). 2 kontrol terpisah utk 1 tindakan yang
  // sama bikin bingung (user report: "kok ada 2 opsi atur porsi").
  // Sekarang HANYA 1 jalur: pilih aset di dropdown, lalu tap "⚖️ Atur
  // Porsi Aset" — konsisten dipakai baik utk baris Aset satu maupun
  // banyak. `hh.linkedAssetId` tetap dipertahankan di `data-linked-
  // asset-id` (dipakai `onAssetPickChange()` utk highlight baris yang
  // cocok dgn pilihan dropdown), murni bukan trigger aksi lagi di sini.
  // SESI 631 (permintaan user: tampilan Dana Titipan "atur porsi aset"
  // masih 2 langkah — pilih di dropdown "Pilih Aset" lalu tap tombol
  // "⚖️ Atur Porsi Aset" terpisah — padahal nama instrumennya SUDAH
  // kelihatan di baris holding ini (mis. "🏦 Majoris (85.043%)").
  // FIX: nama holding di baris ini SEKARANG jadi tombol yang LANGSUNG
  // buka modal atur porsi aset yg bersangkutan (delegasi ke
  // `openAssetPorsiDirect()` baru — 100% reuse routing `openAssetPorsi()`
  // lama via `_routeAssetPorsi()`, 0 logic CRUD/porsi baru). Dropdown
  // "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" di kartu owner TIDAK
  // dihapus (masih perlu utk TAUTKAN ASET BARU yang belum ada baris
  // holding-nya) — cuma sekarang bukan satu-satunya jalan utk aset yang
  // SUDAH tertaut. `data-linked-asset-id` tetap dipertahankan apa adanya
  // (masih dipakai `onAssetPickChange()` utk highlight).
  _holdingRowHtml(hh) {
    const assetId = hh.linkedAssetId ? hh.linkedAssetId : (hh.linkedInvestmentId ? 'h:' + hh.linkedInvestmentId : '');
    const nameHtml = assetId
      ? `<button type="button" class="u-fs11" style="background:none;border:none;padding:0;margin:0;color:inherit;text-decoration:underline dotted;cursor:pointer;font:inherit" data-action="DanaTitipanCommitmentUI.openAssetPorsiDirect" data-args="${escapeHtml(JSON.stringify([assetId]))}" aria-label="Atur porsi aset ${escapeHtml(hh.name)}">${hh.hasGainTracking === false ? '🏦' : '📈'} ${escapeHtml(hh.name)}</button>`
      : `${hh.hasGainTracking === false ? '🏦' : '📈'} ${escapeHtml(hh.name)}`;
    return `
            <div class="titipan-holding-row u-flex u-jcb u-fs11 u-mb2" data-linked-asset-id="${escapeHtml(assetId)}">
              <span>${nameHtml} <span class="u-t2">(${hh.ownerPct}%)</span></span>
              <span>${hh.hasGainTracking === false ? `
                <span class="u-t2 money">Nilai: ${this._money(hh.currentValue)}</span>
              ` : `
                <span class="u-t2 money">${this._money(hh.allocatedPrincipal)} → ${this._money(hh.currentValue)}</span>
                &nbsp;<span class="money ${this._gainCls(hh.gain)}">${this._gainMoney(hh.gain)}</span>
              `}</span>
            </div>
          `;
  },

  // _groupSubtotal(items) — SESI 541 (item ringan #1 dari catatan lanjutan
  // S540: "header grup kustodian saat ini cuma nama+jumlah instrumen").
  // Jumlahkan `allocatedPrincipal`/`currentValue`/`gain` dari `items`
  // (array `hh` yang SUDAH dihasilkan `build()`, dikelompokkan
  // `_groupHoldingsByCustodian()`) — 0 rumus finansial baru, murni
  // `reduce()` angka yang SUDAH final per baris holding (sama pola
  // `totals` di `build()`). `items` di sini SELALU baris Investasi
  // (`hasGainTracking:true` — holding Aset TIDAK PERNAH masuk grup
  // kustodian, lihat `_holdingCustodianId()`/test S540D #6), jadi tidak
  // perlu cabang `hasGainTracking:false` di sini.
  // Return: {allocatedPrincipal, currentValue, gain} (0 kalau items kosong).
  _groupSubtotal(items) {
    return (items || []).reduce((acc, hh) => {
      acc.allocatedPrincipal += hh.allocatedPrincipal || 0;
      acc.currentValue += hh.currentValue || 0;
      acc.gain += hh.gain || 0;
      return acc;
    }, { allocatedPrincipal: 0, currentValue: 0, gain: 0 });
  },

  // _holdingsListHtml(holdings) — SESI 540-D: pengganti isi
  // `o.holdings.map().join('')` lama, sekarang lewat
  // `_groupHoldingsByCustodian()` dulu. Baris flat pakai `_holdingRowHtml()`
  // apa adanya (0 markup baru dibanding sebelum sesi ini). Grup kustodian
  // dibungkus `<details>` native (pola sama expand/collapse kartu owner
  // di atasnya) dgn label "🏦 {nama kustodian} ({jumlah instrumen})".
  // SESI 541: summary grup SEKARANG JUGA tampilkan subtotal pokok→kini
  // ±gain (via `_groupSubtotal()`) — supaya user bisa lihat total per
  // kustodian tanpa expand, pola markup SAMA PERSIS baris "Pokok → Kini
  // ±gain" di summary kartu owner di atasnya (`_gainCls()`/`_money()`
  // dipakai ulang apa adanya, 0 helper format baru).
  _holdingsListHtml(holdings) {
    // GATE tema "modern" — RENCANA-MODERNISASI-UI.md (mockup Ledger Pro
    // .owner-tbl/.holding-row), pola SAMA PERSIS txTableHTML()
    // (tx-list-cashflow.js, tab Uang)/assetTableHTML() (aset.js): jalur
    // BARU 100% ADDITIF, dipanggil HANYA saat D.profile.theme==='modern'.
    // Tema lain 0 disentuh — tetap _holdingRowHtml()/<details> grup
    // kustodian apa adanya di bawah.
    if (typeof D !== 'undefined' && D.profile && D.profile.theme === 'modern') {
      return this._holdingsTableHtmlModern(holdings);
    }
    const nodes = this._groupHoldingsByCustodian(holdings);
    return nodes.map((node) => {
      if (node.kind === 'flat') return this._holdingRowHtml(node.holding);
      const sub = this._groupSubtotal(node.items);
      return `
            <details class="titipan-custodian-group u-ml10 u-mb2">
              <summary class="u-flex u-jcb u-fs11 u-pointer">
                <span class="u-t2">🏦 ${escapeHtml(node.custodianName)} (${node.items.length})</span>
                <span class="u-t2 money">${this._money(sub.allocatedPrincipal)} → ${this._money(sub.currentValue)} <span class="money ${this._gainCls(sub.gain)}">${this._gainMoney(sub.gain)}</span></span>
              </summary>
              ${node.items.map((hh) => this._holdingRowHtml(hh)).join('')}
            </details>
          `;
    }).join('');
  },

  // _holdingsTableHtmlModern(holdings) — tema "modern" (mockup Ledger Pro
  // .owner-tbl/.holding-row: kolom Instrumen / Nilai / Porsi rata kanan
  // mono). REUSE class .tx-tbl* (S637/s642) & helper format
  // (_money/_gainCls/_gainMoney) apa adanya — 0 CSS baru, 0 rumus baru,
  // murni markup tabel pengganti baris flex. Grup kustodian
  // (_groupHoldingsByCustodian) TETAP dipakai supaya info pengelompokan
  // tidak hilang, direpresentasikan sbg baris header colspan penuh
  // (.titipan-tbl-group-row) di dalam tabel yang sama — bukan <details>
  // terpisah lagi, biar konsisten "tabel padat".
  _holdingsTableHtmlModern(holdings) {
    const nodes = this._groupHoldingsByCustodian(holdings);
    const rows = nodes.map((node) => {
      if (node.kind === 'flat') return this._holdingRowHtmlModern(node.holding);
      const sub = this._groupSubtotal(node.items);
      return `
            <tr class="titipan-tbl-group-row">
              <td colspan="3">🏦 ${escapeHtml(node.custodianName)} (${node.items.length}) <span class="money ${this._gainCls(sub.gain)}">${this._money(sub.allocatedPrincipal)} → ${this._money(sub.currentValue)} ${this._gainMoney(sub.gain)}</span></td>
            </tr>
            ${node.items.map((hh) => this._holdingRowHtmlModern(hh)).join('')}
          `;
    }).join('');
    return `
          <div class="tx-tbl-wrap"><table class="tx-tbl">
            <thead><tr><th>Instrumen</th><th class="num">Nilai</th><th class="num">Porsi</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        `;
  },

  // _holdingRowHtmlModern(hh) — 1 baris <tr> tabel modern, padanan
  // _holdingRowHtml() (flex) di atas. data-linked-asset-id & tombol nama
  // -> openAssetPorsiDirect() dipertahankan APA ADANYA (0 logic diubah,
  // murni dibungkus <td> bukan <div>/<span>).
  _holdingRowHtmlModern(hh) {
    const assetId = hh.linkedAssetId ? hh.linkedAssetId : (hh.linkedInvestmentId ? 'h:' + hh.linkedInvestmentId : '');
    const nameHtml = assetId
      ? `<button type="button" class="tx-tbl-name-btn" data-action="DanaTitipanCommitmentUI.openAssetPorsiDirect" data-args="${escapeHtml(JSON.stringify([assetId]))}" aria-label="Atur porsi aset ${escapeHtml(hh.name)}">${hh.hasGainTracking === false ? '🏦' : '📈'} ${escapeHtml(hh.name)}</button>`
      : `${hh.hasGainTracking === false ? '🏦' : '📈'} ${escapeHtml(hh.name)}`;
    const valCell = hh.hasGainTracking === false
      ? `<span class="money">${this._money(hh.currentValue)}</span>`
      : `<span class="money">${this._money(hh.currentValue)}</span> <span class="money ${this._gainCls(hh.gain)}">${this._gainMoney(hh.gain)}</span>`;
    return `
            <tr class="tx-tbl-row" data-linked-asset-id="${escapeHtml(assetId)}">
              <td>${nameHtml}</td>
              <td class="num">${valCell}</td>
              <td class="num money">${hh.ownerPct}%</td>
            </tr>
          `;
  },

  render() {
    this.renderInto('danaTitipanPortfolioList');
  },

  // _ownerCardHtml(o, oi) — SESI s645: markup 1 kartu owner, DIEKSTRAK
  // apa adanya dari isi `projection.owners.map()` lama di dalam
  // `_renderNow()` (0 perubahan visual/struktural — byte-identik dgn
  // sebelum sesi ini). Dipakai ulang oleh KEDUA jalur di `_ownerListHtml()`
  // di bawah: 10 tema lama (flat, apa adanya) DAN tema "modern" (dibungkus
  // <tr><td colspan> per owner, lihat `_ownerListHtmlModern()`) — supaya
  // seluruh wiring di dalamnya (`id="titipanOwnerCard_${oi}"`,
  // `id="titipanAssetPick_${oi}"`, `data-owner-id`, tombol-tombol
  // data-action, `_returnsHistoryHtml()`, `_holdingsListHtml()`) TETAP
  // SAMA PERSIS di kedua jalur, 0 duplikasi logic.
  // MOCKUP-ALIGN (audit tampilan, Agustus 2026): kartu owner sebelumnya
  // <details> polos (0 border/radius) -- jauh dari kartu bulat + avatar
  // bulat inisial nama yang dipakai kedua mockup (`.owner-tbl`/`.tcard`).
  // FIX ADDITIF: tambah class `titipan-card titipan-owner-card` (styling
  // kartu bulat, styles.css) + atribut `data-owner-initial` (huruf
  // pertama nama, dibaca CSS `content:attr(data-owner-initial)` pada
  // `.titipan-owner-avatar::before` -- 0 <span> nama baru ditulis supaya
  // teks "👤 nama" yang sudah dicek test tetap PERSIS 1x, bukan duplikat).
  // 0 logic/id/data-action lain diubah -- summary sticky, alert class,
  // Pokok/Kini/gain tetap sama persis.
  _ownerCardHtml(o, oi) {
    const initial = escapeHtml(String(o.ownerName || '?').trim().charAt(0).toUpperCase() || '?');
    return `
        <details class="u-mb6 titipan-card titipan-owner-card${o.allocationStatus === 'OVER_ALLOCATED' ? ' titipan-owner-alert' : ''}" id="titipanOwnerCard_${oi}">
          <summary class="u-flex u-jcb u-fs12 u-pointer titipan-summary-sticky">
            <span class="titipan-owner-avatar" data-owner-initial="${initial}" aria-hidden="true"></span>
            <span>${o.allocationStatus === 'OVER_ALLOCATED' ? '⚠️ ' : ''}👤 ${escapeHtml(o.ownerName)}</span>
            <span>
              <span class="u-t2">Pokok</span> <span class="u-fw700 money">${this._money(o.allocatedPrincipal)}</span>
              &nbsp;→&nbsp;
              <span class="u-t2">Kini</span> <span class="u-fw700 money">${this._money(o.currentValue)}</span>
              &nbsp;<span class="u-fw700 money ${this._gainCls(o.gain)}">${this._gainMoney(o.gain)}</span>
            </span>
          </summary>
          <!-- SESI 632 (audit S631, rekomendasi #2): 8-baris grid detail
          (Pokok Dikomit/Estimasi Transaksi/Teralokasi/Belum Teralokasi/
          Nilai Saat Ini/Untung-Rugi/Sudah Dikembalikan/Belum Dikembalikan)
          dibungkus <details> collapsed-by-default, pola SAMA PERSIS
          <details> kartu owner & grup kustodian di file ini (0 CSS/JS
          baru). Ringkasan Pokok→Kini→gain di <summary> kartu owner di
          atas TETAP selalu kelihatan tanpa expand apa pun — grid ini
          murni rincian tambahan, bukan info utama. 0 rumus/data diubah,
          murni markup pembungkus. -->
          <details class="titipan-detail-toggle u-mb6">
            <summary class="u-fs11 u-t2 u-pointer">Detail lengkap</summary>
            <div class="titipan-detail-grid u-fs11 u-mt4" style="display:grid;grid-template-columns:1fr 1fr;gap:3px 10px">
              <span class="u-t2">Pokok Dikomit</span><span>${this._principalCell(o)}</span>
              ${(() => { const cmp = this._expenseComparisonForOwner(o); return cmp ? `<span class="u-t2">Estimasi dari Transaksi ${escapeHtml(cmp.accountNames.join(', '))}</span><span class="u-fw700">${this._money(cmp.total)}</span>` : ''; })()}
              <span class="u-t2">Teralokasi ke Holding</span><span class="u-fw700">${this._money(o.allocatedPrincipal)}</span>
              <span class="u-t2">Estimasi Belum Teralokasi</span><span>${this._unallocatedCell(o)}</span>
              <span class="u-t2">Nilai Saat Ini</span><span class="u-fw700">${this._money(o.currentValue)}</span>
              <span class="u-t2">Untung-Rugi</span><span class="u-fw700 ${this._gainCls(o.gain)}">${this._gainMoney(o.gain)}</span>
              <span class="u-t2">Sudah Dikembalikan</span><span class="u-fw700">${this._money(o.returnedTotal)}</span>
              <span class="u-t2">Pokok Belum Dikembalikan</span><span>${this._outstandingCell(o)}</span>
            </div>
          </details>
          <div class="btn-row3 u-ml10 u-mb6" style="gap:6px">
            <button type="button" class="btn btn-ghost btn-sm" style="padding:7px 4px;font-size:10px;line-height:1.2;gap:2px;white-space:normal;text-align:center" data-action="DanaTitipanCommitmentUI.open" data-args="${escapeHtml(JSON.stringify([o.ownerId]))}">✏️ Atur Pokok Dana Titipan</button>
            <button type="button" class="btn btn-ghost btn-sm" style="padding:7px 4px;font-size:10px;line-height:1.2;gap:2px;white-space:normal;text-align:center" data-action="DanaTitipanReturnUI.open" data-args="${escapeHtml(JSON.stringify([o.ownerId]))}">↩️ Catat Pengembalian</button>
            <button type="button" class="btn btn-ghost btn-sm" style="padding:7px 4px;font-size:10px;line-height:1.2;gap:2px;white-space:normal;text-align:center" data-action="DanaTitipanCommitmentUI.removeOwnerLinkage" data-args="${escapeHtml(JSON.stringify([o.ownerId]))}">🔓 Lepas Keterikatan Dana Titipan</button>
          </div>
          <!-- SESI 633 (lanjutan ringan S631/S632): sejak S631 nama
          holding sudah bisa diklik LANGSUNG utk atur porsi aset yang
          SUDAH tertaut (lihat _holdingRowHtml -> openAssetPorsiDirect).
          Dropdown "Pilih Aset" + tombol "Atur Porsi Aset" di bawah ini
          jadi HANYA perlu utk kasus TAUTKAN ASET BARU (aset yang belum
          py baris holding) -- pola sama S632 (details collapsed), supaya
          kartu owner tidak selalu menampilkan kontrol yang jarang dipakai
          begitu owner sudah py holding. id select/onchange/data-owner-id
          TIDAK diubah sama sekali (0 breaking change ke
          onAssetPickChange/openAssetPorsi/test s543/s608 yang cari
          elemen ini via querySelectorAll/regex, terlepas dari nesting
          details pembungkusnya). -->
          <details class="titipan-linkasset-toggle u-mb6 u-ml10 u-fs11">
            <summary class="u-t2 u-pointer">+ Tautkan Aset Baru</summary>
            <div class="u-flex u-gap4 u-mt4">
              <select id="titipanAssetPick_${oi}" data-owner-id="${escapeHtml(o.ownerId)}" class="fs u-flex-1" style="padding:8px 10px;font-size:11px" aria-label="Pilih Aset (lalu tap Atur Porsi Aset di sebelah kanan)" onchange="DanaTitipanPortfolioPresenter.onAssetPickChange(this)">${this._assetOptionsHtml()}</select>
              <button type="button" class="btn btn-ghost btn-sm" data-action="DanaTitipanCommitmentUI.openAssetPorsi" data-args='["$el"]'>⚖️ Atur Porsi Aset</button>
            </div>
          </details>
          ${this._returnsHistoryHtml(o.ownerId)}
          <div id="titipanHoldingsList_${oi}">
          ${!o.holdings.length ? `
            <div class="u-fs11 u-t2 u-ml10 titipan-holding-row">Belum ada instrumen terhubung ke owner ini — pilih aset dari dropdown di atas lalu atur porsinya.</div>
          ` : this._holdingsListHtml(o.holdings)}
          </div>
        </details>
      `;
  },

  // _ownerListHtml(owners) — SESI s645: GATE tema "modern" (lanjutan
  // s644, RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md — laporan user:
  // baris ringkasan per-owner "👤 nama Pokok→Kini" di ATAS kartu holding
  // masih flat/div, belum ikut jadi tabel spt mockup Ledger Pro). 10 tema
  // lama TETAP `_ownerCardHtml()` apa adanya, flat join, 0 perubahan.
  _ownerListHtml(owners) {
    if (typeof D !== 'undefined' && D.profile && D.profile.theme === 'modern') {
      return this._ownerListHtmlModern(owners);
    }
    return owners.map((o, oi) => this._ownerCardHtml(o, oi)).join('');
  },

  // _ownerListHtmlModern(owners) — tema "modern": bungkus tiap kartu owner
  // (`_ownerCardHtml()`, 0 diubah sama sekali) dalam <table class="tx-tbl">
  // (reuse class S637/s642/s644, 0 CSS baru) supaya konsisten "tabel
  // padat" spt holdings (s644)/returns (s642). Header kolom murni visual
  // (Pemilik / Pokok → Kini / ±) — TIDAK ada 3 <td> terpisah per baris
  // krn tiap owner tetap 1 <details> utuh (toggle expand, tombol aksi,
  // dropdown tautkan aset, holdings bersarang — SEMUA wiring lama ikut
  // apa adanya) yang butuh lebar penuh; baris ringkasan Pokok→Kini→gain
  // di dalam <summary> sudah rata kanan via markup lama sendiri, jadi
  // header di atas cukup jadi acuan visual kolom, bukan alignment persis
  // per-<td> (beda dari _holdingsTableHtmlModern() yang barisnya flat/
  // leaf, 0 expand, sehingga BISA 3 <td> sungguhan).
  _ownerListHtmlModern(owners) {
    const rows = owners.map((o, oi) => `
        <tr class="tx-tbl-row titipan-tbl-owner-row">
          <td colspan="3" class="titipan-tbl-owner-cell">${this._ownerCardHtml(o, oi)}</td>
        </tr>
      `).join('');
    return `
      <div class="tx-tbl-wrap"><table class="tx-tbl">
        <thead><tr><th>Pemilik</th><th class="num">Pokok → Kini</th><th class="num">±</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    `;
  },

  // onAssetPickChange(i) — SESI 531 (fix laporan user: dropdown "Pilih
  // Aset" & tombol "⚖️ Atur Porsi" per-institusi di list holding (mis.
  // "🏦 Majoris") adalah 2 kontrol independen — dropdown pilih assetId
  // utk tombol "⚖️ Atur Porsi Aset" DI SEBELAHNYA (openAssetPorsi(), 0
  // diubah), SEDANGKAN tombol per-institusi di bawahnya pakai
  // hh.linkedAssetId sendiri (0 diubah juga). User kira 2 kontrol itu 1
  // alur karena berdekatan tanpa penanda visual. Fix MURNI UI, TIDAK
  // menyentuh openAssetPorsi()/openOwnersModalById() (keduanya sudah
  // benar baca id masing2): saat dropdown berubah, highlight+scroll ke
  // baris holding yang `linkedAssetId`-nya cocok dgn aset terpilih
  // (kalau ada) di dalam `#titipanHoldingsList_{i}`, supaya user LANGSUNG
  // lihat baris mana yang berkaitan dgn pilihan dropdown-nya sebelum tap
  // tombol manapun. 0 aggregasi/CRUD baru, cuma DOM highlight sementara.
  // SESI 544 (audit laporan user: toast "⚠️ Pilih aset dulu" tetap
  // muncul walau dropdown "Pilih Aset" kelihatan sudah terisi, MASIH
  // terjadi setelah fix S543 preserve-selection). ROOT CAUSE BARU
  // (beda dari S543): `renderLaporan()` (modules-render.js) me-render
  // `DanaTitipanPortfolioPresenter` ke DUA container SEKALIGUS tiap
  // panggilan -- `#danaTitipanPortfolioList` (kartu lama di tab
  // Uang/Dana Kelolaan) DAN `#danaTitipanTabList` (sub-tab Laporan >
  // Dana Titipan, Sesi 498) -- KEDUANYA ada permanen di DOM (index.html,
  // tidak dilepas/dibuat ulang per tab aktif, cuma disembunyikan via
  // CSS). Karena isi kedua container 100% SAMA (sumber data sama,
  // `DanaTitipanPortfolioAPI.build()`), ID `titipanAssetPick_N`/
  // `titipanHoldingsList_N`/`titipanOwnerCard_N` di render() jadi
  // DUPLIKAT persis di 2 tempat sekaligus. `document.getElementById()`
  // SELALU balikin elemen PERTAMA yang match di seluruh dokumen --
  // kalau user pilih dropdown di container KEDUA (mis. lagi buka
  // sub-tab Laporan > Dana Titipan), tapi container PERTAMA (kartu tab
  // Uang, mungkin tidak pernah disentuh) render duluan di HTML, maka
  // `getElementById('titipanAssetPick_N')` diam2 balikin punya
  // container PERTAMA (masih placeholder kosong) -- BUKAN yang baru
  // saja dipilih user. Toast "Pilih aset dulu" muncul walau user MERASA
  // sudah pilih (S543 preserve-selection sendiri BENAR & tetap berguna
  // -- ini bug DUPLIKAT ID yang beda lapis, S543 tidak menyentuhnya
  // krn scope-nya cuma re-render dalam 1 container yang sama).
  //
  // FIX: 0 lagi baca id global -- sekarang terima ELEMEN pemicu
  // langsung (`this` dari <select onchange>, `$el` dari data-action
  // dispatcher, lihat features-helpers-global-security.js
  // `_dataActionClickHandler` yang SUDAH mendukung placeholder `$el`),
  // lalu telusur DOM relatif (`closest('details')` -> `querySelector`)
  // supaya SELALU dapat elemen di CONTAINER YANG SAMA dgn yang diklik
  // user, apa pun urutan render 2 container itu. Dual-mode: kalau
  // dipanggil dgn angka index (pola lama, dipakai test existing/kode
  // lama mana pun yang belum sempat diupdate) tetap fallback ke
  // `getElementById()` lama (0 breaking change), TAPI itu tetap rawan
  // bug duplikat ID yang sama -- jalur BARU (elemen) yang dipakai
  // markup render() sekarang (lihat perubahan di bawah).
  onAssetPickChange(target) {
    let sel = null;
    let list = null;
    let card = null;
    if (target && typeof target === 'object' && typeof target.closest === 'function') {
      sel = target;
      card = target.closest('details');
      list = card && typeof card.querySelector === 'function' ? card.querySelector('[id^="titipanHoldingsList_"]') : null;
    } else {
      sel = document.getElementById('titipanAssetPick_' + target);
      list = document.getElementById('titipanHoldingsList_' + target);
      card = document.getElementById('titipanOwnerCard_' + target);
    }
    if (!list) return;
    const rows = list.querySelectorAll('[data-linked-asset-id]');
    rows.forEach((row) => { row.style.outline = ''; row.style.borderRadius = ''; row.style.background = ''; });
    const assetId = sel ? sel.value : '';
    if (!assetId) return;
    let matched = null;
    rows.forEach((row) => {
      if (row.getAttribute('data-linked-asset-id') === assetId) matched = row;
    });
    if (matched) {
      matched.style.outline = '2px solid var(--accent, #4a9eff)';
      matched.style.borderRadius = '6px';
      matched.style.background = 'rgba(74,158,255,0.08)';
      if (card && 'open' in card) card.open = true;
      matched.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  // _poolSummaryHtml() — SESI 4 (UI POOL, MASTER_HANDOFF_DANA_TITIPAN_POOL_
  // PORSI.md §13.1-13.3, §19). Kartu ringkasan pool, ditaruh PALING ATAS
  // _renderNow() (sebelum addBtn/expenseBtn) — read-only murni, 0 tulis ke
  // `D`. Konsumsi `DanaTitipanPoolAPI.status()/poolMasukTotal()/
  // sisaAlokasi()/overAllocatedAmount()` (Sesi 1/2, sudah lengkap & tested,
  // TIDAK diubah sesi ini).
  //
  // CATATAN AUDIT soal "Sudah Dialokasikan": dipakai `principalAmountTotal`
  // dari PARAMETER `projection` (hasil `DanaTitipanPortfolioAPI.build()`,
  // sudah dihitung 1x di `_renderNow()`, sama angka yang dipakai baris
  // "Total Pokok Dikomit" existing) — BUKAN dihitung ulang manual. Sempat
  // dicurigai `principalAmountTotal` cuma menjumlah owner yang punya
  // holding investasi/aset (beda dari definisi MASTER_HANDOFF §6, "SUM
  // SEMUA `D.titipanCommitments[].principalAmount`"), tapi diverifikasi
  // ulang lewat test (D1, session04a) `build()` SUDAH union dgn
  // `D.titipanCommitments[]` sejak Sesi 485c (baris ~604-619 di
  // dana-titipan-aggregation-api.js, "owner yang sudah komit pokok tapi
  // BELUM punya holding sama sekali tetap harus muncul di projection") —
  // jadi `principalAmountTotal` SUDAH persis sesuai §6, 0 gap. Menghitung
  // ulang secara terpisah di sini hanya akan mendua-sumberkan angka yang
  // sama tanpa manfaat (melanggar reuse existing source of truth).
  //
  // Tombol "Set Saldo Awal Dana Titipan" / "+ Tambah Deposit" (§13.4)
  // digate `typeof DanaTitipanPoolUI !== 'undefined'` — defensif murni
  // (jaga-jaga urutan load script), karena `DanaTitipanPoolUI` SUDAH
  // didefinisikan di file ini (lihat definisi di bawah, akhir file) sejak
  // Bagian 1 — jadi guard ini praktis selalu true di app nyata. Method
  // `openSetSaldoAwal()`/`openTambahDeposit()` MASIH STUB (toast "belum
  // tersedia") sampai Bagian 2 mengisi modal sungguhan — lihat komentar di
  // definisi `DanaTitipanPoolUI` utk detail.
  // MOCKUP-ALIGN (audit tampilan vs mockup-ledgerpro.html/mockup-minimal.html,
  // Agustus 2026): kartu ringkasan pool sebelumnya berupa kotak dashed polos
  // (border putus-putus, tanpa hierarki visual) -- jauh dari kartu bulat
  // (border-radius 14px) & tipografi besar utk angka utama yang dipakai
  // kedua mockup ("hero" amount + baris sekunder). FIX: markup dibungkus
  // `.titipan-card` (kartu bulat solid, styles.css) + baris pertama tiap
  // status ditandai `.titipan-card-hero` (angka besar, pola `.hero-amt`
  // mockup-minimal) sedangkan baris berikutnya `.titipan-pool-row` (pola
  // `.bento-card`/`.tick` mockup). 0 teks/label/data-action diubah -- semua
  // string yang dicek test (👥/💰/📋/🔴/🟢, "Belum diset", "Set Saldo Awal
  // Dana Titipan", dst) tetap PERSIS sama, murni pembungkus + class baru.
  _poolSummaryHtml(principalAmountTotal) {
    if (typeof DanaTitipanPoolAPI === 'undefined') return '';
    const status = DanaTitipanPoolAPI.status();
    const masuk = DanaTitipanPoolAPI.poolMasukTotal();
    const sudahDialokasikan = Number(principalAmountTotal) || 0;
    const hasPoolUI = (typeof DanaTitipanPoolUI !== 'undefined');
    const wrapOpen = '<div class="titipan-pool-summary titipan-card u-mb8">';

    if (status === 'NOT_MIGRATED') {
      const btn = hasPoolUI ? '<button type="button" class="btn btn-ghost btn-full btn-sm u-mt8" data-action="DanaTitipanPoolUI.openSetSaldoAwal">Set Saldo Awal Dana Titipan</button>' : '';
      return `${wrapOpen}
        <div class="titipan-card-hero"><span class="titipan-pool-lbl">👥 Sudah Dialokasikan</span><span class="titipan-pool-amt">${this._money(sudahDialokasikan)}</span></div>
        <div class="titipan-pool-row"><span class="u-t2">💰 Dana Titipan Masuk</span><span class="u-fw700">Belum diset</span></div>
        <div class="u-fs10 u-t2 u-mt4">📋 Status: Data lama / belum dimigrasikan</div>
        ${btn}
      </div>`;
    }

    const btn = hasPoolUI ? '<button type="button" class="btn btn-ghost btn-full btn-sm u-mt8" data-action="DanaTitipanPoolUI.openTambahDeposit">+ Tambah Deposit</button>' : '';

    if (status === 'OVER_ALLOCATED') {
      const lebih = DanaTitipanPoolAPI.overAllocatedAmount();
      return `${wrapOpen}
        <div class="titipan-card-hero"><span class="titipan-pool-lbl">💰 Dana Titipan Masuk</span><span class="titipan-pool-amt">${this._money(masuk)}</span></div>
        <div class="titipan-pool-row"><span class="u-t2">👥 Sudah Dialokasikan</span><span class="u-fw700">${this._money(sudahDialokasikan)}</span></div>
        <div class="titipan-pool-row"><span class="u-t2">🔴 Alokasi melebihi pool</span><span class="titipan-over-badge red">${this._money(lebih)}</span></div>
        <div class="titipan-pool-row"><span class="u-t2">Belum Dialokasikan</span><span class="u-fw700">${this._money(0)}</span></div>
        ${btn}
      </div>`;
    }

    // status === 'OK'
    const sisa = DanaTitipanPoolAPI.sisaAlokasi();
    return `${wrapOpen}
      <div class="titipan-card-hero"><span class="titipan-pool-lbl">💰 Dana Titipan Masuk</span><span class="titipan-pool-amt">${this._money(masuk)}</span></div>
      <div class="titipan-pool-row"><span class="u-t2">👥 Sudah Dialokasikan</span><span class="u-fw700">${this._money(sudahDialokasikan)}</span></div>
      <div class="titipan-pool-row"><span class="u-t2">🟢 Belum Dialokasikan</span><span class="u-fw700 green">${this._money(sisa)}</span></div>
      ${btn}
    </div>`;
  },

  // _holdingSettlement(hh) — S668. Resolve status settlement ('titipan'/'milik')
  // 1 baris holding owner (hh, elemen `o.holdings[]` hasil `DanaTitipanPortfolioAPI.
  // build()`) dgn REUSE PENUH `Aset.getOwnerSettlement()`/`Investment.
  // getOwnerSettlement()` yang SUDAH ADA (S660/S665) -- 0 rumus baru ditulis di sini,
  // murni lookup entity asal via `hh.linkedAssetId`/`hh.linkedInvestmentId` (field yang
  // SUDAH ADA di tiap holding sejak build(), lihat dana-titipan-aggregation-api.js)
  // lalu delegasi ke helper domain yang sesuai. Holding domain Aset (`hh.linkedAssetId`
  // terisi, `type:'aset'`) -> `Aset.getOwnerSettlement(asset, hh.linkedOwnerId)`.
  // Holding domain Investasi (`hh.linkedInvestmentId` terisi) -> `Investment.
  // getOwnerSettlement(holding, hh.linkedOwnerId)`. Default `'titipan'` kalau entity
  // asal sudah tidak ketemu lagi (mis. terhapus di antara build() & render ini) atau
  // helper-nya belum tersedia -- konsisten dgn default `getOwnerSettlement()` sendiri
  // (data lama tanpa field settlement eksplisit dianggap 'titipan', bukan 'milik').
  _holdingSettlement(hh) {
    if (!hh) return 'titipan';
    try {
      if (hh.linkedAssetId != null) {
        if (typeof D === 'undefined' || !Array.isArray(D.assets)) return 'titipan';
        const a = D.assets.find((x) => x && x.id === hh.linkedAssetId);
        if (!a || typeof Aset === 'undefined' || typeof Aset.getOwnerSettlement !== 'function') return 'titipan';
        return Aset.getOwnerSettlement(a, hh.linkedOwnerId);
      }
      if (hh.linkedInvestmentId != null) {
        if (typeof Investment === 'undefined' || typeof Investment.getHoldings !== 'function' || typeof Investment.getOwnerSettlement !== 'function') return 'titipan';
        const h = Investment.getHoldings().find((x) => x && x.id === hh.linkedInvestmentId);
        if (!h) return 'titipan';
        return Investment.getOwnerSettlement(h, hh.linkedOwnerId);
      }
    } catch (err) {
      return 'titipan';
    }
    return 'titipan';
  },

  // _ownerMatchesFilter(o) — S668. Predicate murni (0 mutasi), dipanggil per-owner
  // dari `_renderNow()` (HANYA di container tab, lihat `isTabView`). filterOwnerId
  // kosong -> semua owner lolos (filter nonaktif). Owner harus COCOK filterOwnerId
  // DAN, kalau filterSettlement juga diisi, MINIMAL 1 holding owner ini (`o.holdings[]`)
  // punya settlement yang cocok (`_holdingSettlement()`) -- beda dari Aset/Investasi
  // (1 item = 1 owner-relation, match langsung), di sini 1 owner card bisa merangkum
  // banyak holding lintas Aset+Investasi jadi dicek "ada minimal 1 yang cocok", bukan
  // "semua harus cocok" (pola sama semangat "tampilkan owner ini kalau relevan dgn
  // filter", bukan "sembunyikan holding yang tidak cocok di dalam kartu" -- granularitas
  // filter di sini per KARTU OWNER, konsisten dgn unit yang dirender `_ownerListHtml()`).
  _ownerMatchesFilter(o) {
    if (!DanaTitipanPortfolioPresenter.filterOwnerId) return true;
    if (!o || String(o.ownerId) !== String(DanaTitipanPortfolioPresenter.filterOwnerId)) return false;
    if (!DanaTitipanPortfolioPresenter.filterSettlement) return true;
    return (o.holdings || []).some((hh) => DanaTitipanPortfolioPresenter._holdingSettlement(hh) === DanaTitipanPortfolioPresenter.filterSettlement);
  },

  // _renderFilterBar(owners) — S668. Bangun 2 dropdown "Pemilik" & "Status" di atas
  // daftar kartu owner tab Dana Titipan, pola SAMA PERSIS `InvestmentListUI.
  // _renderFilterBar()` (S662/S664, investasi-list-view.js) -- termasuk badge jumlah
  // "(N holding)" per owner (S664). Beda dari Investasi/Aset: `owners` di sini SUDAH
  // 1 entry per ownerId (hasil `DanaTitipanPortfolioAPI.build()`, bukan array holding
  // mentah), jadi 0 perlu agregasi ulang -- badge count = `o.holdings.length` apa
  // adanya. `owners` (SEBELUM difilter S668) SELALU non-SELF (build() sudah exclude
  // isSelf), jadi 0 owner sama sekali HANYA terjadi kalau projection.owners kosong
  // total -- kasus itu sudah ditangani early-return terpisah di `_renderNow()`
  // (pesan "Belum ada porsi dana titipan..."), jadi guard `!owners.length` di sini
  // murni jaga-jaga (pola sama InvestmentListUI, filter bar disembunyikan bukan
  // dirender kosong/nganggur).
  _renderFilterBar(owners) {
    if (!owners || !owners.length) return '';
    const ownerOpts = ['<option value="">👥 Semua Pemilik</option>'].concat(
      owners.map((o) => (
        '<option value="' + escapeHtml(o.ownerId) + '"' + (String(DanaTitipanPortfolioPresenter.filterOwnerId) === String(o.ownerId) ? ' selected' : '') + '>'
        + escapeHtml(o.ownerName) + ' (' + ((o.holdings && o.holdings.length) || 0) + ' holding)</option>'
      )),
    ).join('');
    // Dropdown Status HANYA masuk akal kalau owner sudah dipilih (settlement adalah
    // properti PER owner-holding, tidak bermakna lintas semua owner sekaligus) --
    // disabled + balik ke '' otomatis lewat onFilterOwnerChange() saat filterOwnerId
    // dikosongkan lagi, pola sama persis InvestmentListUI.
    const statusDisabled = DanaTitipanPortfolioPresenter.filterOwnerId ? '' : ' disabled';
    const statusOpts = '<option value="">Semua Status</option>'
      + '<option value="titipan"' + (DanaTitipanPortfolioPresenter.filterSettlement === 'titipan' ? ' selected' : '') + '>🔒 Dana Titipan</option>'
      + '<option value="milik"' + (DanaTitipanPortfolioPresenter.filterSettlement === 'milik' ? ' selected' : '') + '>✅ Milik Sendiri</option>';
    return '<div class="u-flex u-gap8 u-mb10" style="flex-wrap:wrap">'
      + '<select class="fs u-flex1" style="min-width:140px" onchange="DanaTitipanPortfolioPresenter.onFilterOwnerChange(this.value)">' + ownerOpts + '</select>'
      + '<select class="fs u-flex1" style="min-width:140px"' + statusDisabled + ' onchange="DanaTitipanPortfolioPresenter.onFilterSettlementChange(this.value)">' + statusOpts + '</select>'
      + '</div>';
  },

  // onFilterOwnerChange(val) / onFilterSettlementChange(val) — S668. onchange handler
  // dropdown filter bar di atas, murni state UI + render ulang -- pola SAMA PERSIS
  // `InvestmentListUI.onFilterOwnerChange()`/`onFilterSettlementChange()` (S662), BEDA
  // cuma target render: `renderInto('danaTitipanTabList')` LANGSUNG (bukan 2 method
  // terpisah _renderSummary()/_renderList() spt InvestmentListUI) -- Dana Titipan tab
  // 0 kartu ringkasan terpisah dari isi utama container (poolSummary sudah bagian dari
  // innerHTML yang sama), pola sama `Aset.onFilterOwnerChange()` (S667) yang juga
  // langsung panggil 1 method render. Balik ke "Semua Pemilik" otomatis mengosongkan
  // filterSettlement juga (status tanpa owner terpilih tidak bermakna apa-apa).
  onFilterOwnerChange(val) {
    DanaTitipanPortfolioPresenter.filterOwnerId = val || '';
    if (!DanaTitipanPortfolioPresenter.filterOwnerId) DanaTitipanPortfolioPresenter.filterSettlement = '';
    DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  },
  onFilterSettlementChange(val) {
    DanaTitipanPortfolioPresenter.filterSettlement = (val === 'milik' || val === 'titipan') ? val : '';
    DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
  },

  // renderInto(containerId) — SESI 498 (Tab "Dana Titipan" Terpadu, Sesi A
  // §2.2 rancangan audit AUDIT-DANA-TITIPAN-TAB-TERPADU.md): generalisasi
  // render() supaya bisa dipasang ke LEBIH dari satu container sekaligus
  // (kartu lama #danaTitipanPortfolioList di dalam Dana Kelolaan/Laporan >
  // Ringkasan, TIDAK diubah/dihapus — plus container baru
  // #danaTitipanTabList di sub-tab Laporan > Dana Titipan). 0 perubahan
  // logic/HTML output per container — render() tetap 100% method lama
  // (delegasi 1 baris ke sini dgn id lama), semua test s484/s485d/s486
  // existing tidak berubah hasilnya. TIDAK ada agregasi/rumus baru di sini.
  // renderInto() — SESI 539: skeleton state saat `DanaTitipanPortfolioAPI.
  // build()` (agregasi lintas Investment+Aset) berpotensi lambat kalau
  // holding banyak, supaya browser sempat paint sesuatu dulu sebelum main
  // thread diblok proses build()+render string HTML besar (backlog S535).
  // HANYA aktif kalau `requestAnimationFrame` ada di global (browser
  // nyata) — di harness test Node (tests/helpers/loadSource.js, vm sandbox
  // TANPA rAF), `typeof requestAnimationFrame` selalu 'undefined', jadi
  // fallback ke `_renderNow()` sinkron seperti sebelumnya. Artinya: 0
  // perubahan perilaku/output/test existing (s484/s485d/s486/s498/dst,
  // semua panggil renderInto() lalu langsung cek el.innerHTML sinkron) —
  // skeleton HANYA kelihatan di app nyata, 1 frame doang sebelum konten asli.
  renderInto(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return; // container belum ada di halaman ini, aman diam2ny (pola sama presenter lain).
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;

    if (typeof requestAnimationFrame === 'function') {
      el.innerHTML = '<div class="u-fs11 u-t2 u-mt6 titipan-skeleton-row"></div><div class="u-fs11 u-t2 u-mt6 titipan-skeleton-row"></div><div class="u-fs11 u-t2 u-mt6 titipan-skeleton-row"></div>';
      requestAnimationFrame(() => this._renderNow(el));
      return;
    }
    this._renderNow(el);
  },

  // _captureAssetPickSelections(el) — SESI 543 (fix laporan user:
  // dropdown "Pilih Aset" per kartu owner "belum sinkron"). ROOT CAUSE:
  // _renderNow() mengganti SELURUH el.innerHTML tiap kali dipanggil ulang
  // (dan dipanggil ulang dari renderLaporan() setiap ada perubahan lain
  // di halaman, mis. harga investasi live update) — _assetOptionsHtml()
  // SELALU generate opsi pertama "— Pilih Aset —" TANPA `selected` sesuai
  // pilihan sebelumnya, jadi pilihan dropdown user diam2 ke-reset ke
  // placeholder sebelum sempat tap "Atur Porsi Aset". Preservasi PER
  // ownerId (via `data-owner-id` di tiap <select>, BUKAN cuma index oi —
  // index bisa berubah antar render kalau urutan owners berubah, mis.
  // owner baru masuk di tengah / sort ulang). Dipanggil SEBELUM
  // el.innerHTML ditimpa. Guard `typeof el.querySelectorAll` (pola sama
  // gaya guard lain di file ini, mis. `typeof D !== 'undefined'`) — aman
  // di test harness yang pakai DOM mock ringan tanpa querySelectorAll
  // (getElementById-only, lihat tests/s515-*.test.js), fallback diam2
  // objek kosong (0 restore, TAPI juga 0 crash).
  _captureAssetPickSelections(el) {
    const map = {};
    if (!el || typeof el.querySelectorAll !== 'function') return map;
    const selects = el.querySelectorAll('select[id^="titipanAssetPick_"]');
    selects.forEach((sel) => {
      const ownerId = sel.getAttribute && sel.getAttribute('data-owner-id');
      if (ownerId && sel.value) map[ownerId] = sel.value;
    });
    return map;
  },

  // _restoreAssetPickSelections(el, savedByOwner) — SESI 543. Dipanggil
  // SETELAH el.innerHTML ditimpa dgn markup baru (opsi placeholder
  // default dari _assetOptionsHtml()). Cocokkan tiap <select> baru via
  // `data-owner-id` ke hasil _captureAssetPickSelections() SEBELUM
  // render, lalu set .value. TIDAK divalidasi assetId-nya masih ada di
  // D.assets atau tidak sebelum di-set — kalau sudah tidak ada di antara
  // opsi (mis. aset itu terhapus di antara render), browser native diam2
  // fallback .value ke '' (tidak match opsi manapun), sama seperti
  // perilaku native <select> lainnya, jadi aman tanpa validasi tambahan.
  _restoreAssetPickSelections(el, savedByOwner) {
    if (!el || typeof el.querySelectorAll !== 'function') return;
    if (!savedByOwner || !Object.keys(savedByOwner).length) return;
    const selects = el.querySelectorAll('select[id^="titipanAssetPick_"]');
    selects.forEach((sel) => {
      const ownerId = sel.getAttribute && sel.getAttribute('data-owner-id');
      if (ownerId && savedByOwner[ownerId]) sel.value = savedByOwner[ownerId];
    });
  },

  // _renderNow(el) — SESI 539: badan asli renderInto() (0 logika diubah,
  // cuma dipindah ke method terpisah supaya bisa dipanggil sinkron ATAU
  // via requestAnimationFrame() dari renderInto() di atas). SESI 543:
  // tambah capture/restore pilihan dropdown `#titipanAssetPick_N` di
  // sekeliling penggantian el.innerHTML (lihat _captureAssetPickSelections
  // / _restoreAssetPickSelections di atas) — SATU-SATUNYA perubahan
  // perilaku sesi ini, 0 logika projection/aggregasi lain disentuh.
  // S668: `isTabView` gate -- filter Owner+Status HANYA aktif di container tab
  // (#danaTitipanTabList, sub-tab Laporan > Dana Titipan). Kartu ringkas
  // #danaTitipanPortfolioList (tab Ringkasan, di dalam kartu Dana Kelolaan)
  // TETAP 100% apa adanya (0 filter bar, `projection.owners` penuh apa adanya)
  // -- sesuai permintaan eksplisit user "nyambungin filter ini ke tab Dana
  // Titipan" (bukan kartu ringkas), pola sama semangat filter Aset/Investasi
  // yang dipasang di halaman DAFTAR (browsing), bukan di kartu ringkasan.
  _renderNow(el) {
    const savedAssetPicks = this._captureAssetPickSelections(el);
    const projection = DanaTitipanPortfolioAPI.build();
    const isTabView = !!(el && el.id === 'danaTitipanTabList');
    // Sesi 485d — tombol buka modal "💰 Pokok Dana Titipan" (murni
    // konsumsi API sesi 485a-c: listExistingOwners()/saveCommitment(),
    // 0 logika CRUD/projection baru ditulis di sini). Selalu ditampilkan
    // di atas (bukan cuma saat owners.length>0) supaya owner yang baru
    // saja dapat porsi holding (jadi listExistingOwners()) tapi belum
    // pernah dicatat pokoknya tetap bisa langsung dicatat dari sini.
    const addBtn = '<button type="button" class="btn btn-ghost btn-full btn-sm u-mb8" data-action="DanaTitipanCommitmentUI.open">💰 Catat/Update Pokok Dana Titipan</button>';
    // expenseBtn — SESI 521-B2 (DESIGN-S520-DANA-TITIPAN-UI-MULTIOWNER.md):
    // pemicu modal `titipanExpenseModal` (S521-B1) -> `TitipanExpenseUI.open()`
    // (S521-B2, murni konsumsi TitipanExpenseFlow S521-A). Selalu ditampilkan
    // bareng addBtn (bukan cuma saat owners.length>0), pola sama addBtn.
    const expenseBtn = '<button type="button" class="btn btn-ghost btn-full btn-sm u-mb8" data-action="TitipanExpenseUI.open">💸 Catat Pengeluaran Dana Titipan</button>';
    // poolSummary — SESI 4 (UI POOL). Ditaruh PALING ATAS, di atas
    // addBtn/expenseBtn (§13: kartu ringkasan pool tampil sebelum
    // aksi-aksi lain). Dihitung sekali, dipakai kedua cabang di bawah.
    const poolSummary = this._poolSummaryHtml(projection.totals.principalAmountTotal);

    if (!projection.owners.length) {
      el.innerHTML = poolSummary + addBtn + expenseBtn + '<div class="u-fs11 u-t2 u-mt6">Belum ada porsi dana titipan yang teralokasi ke holding investasi.</div>';
      return;
    }

    // S668 — filter bar dibangun dari `projection.owners` PENUH (SEBELUM
    // difilter), supaya opsi dropdown owner tetap lengkap walau filter Status
    // sedang aktif menyembunyikan sebagian kartu, pola sama persis
    // `InvestmentListUI._renderFilterBar(allHoldings)`/`Aset._renderFilterBar(list)`.
    // `filteredOwners` dipakai di `_ownerListHtml()` di bawah -- totals/poolSummary
    // TETAP dihitung dari `projection` penuh (0 diubah), filter ini HANYA
    // memfilter kartu owner apa yang dirender, konsisten dgn Aset (S667)/
    // Investasi (S662): dashboard/ringkasan tidak ikut terfilter.
    const filterBarHtml = isTabView ? this._renderFilterBar(projection.owners) : '';
    const filteredOwners = isTabView ? projection.owners.filter((o) => this._ownerMatchesFilter(o)) : projection.owners;

    // filteredOwners kosong TAPI projection.owners tidak -- beda pesan drpd
    // "belum ada porsi dana titipan..." di atas (yang berarti 0 data sama
    // sekali), pola sama persis Aset._assetMatchesFilter()/InvestmentListUI
    // ("🔍 Tidak ada holding/aset yang cocok"). HANYA bisa terjadi di isTabView
    // (filter nonaktif di container lain, filteredOwners === projection.owners).
    if (isTabView && !filteredOwners.length) {
      el.innerHTML = poolSummary + addBtn + expenseBtn + filterBarHtml + '<div class="u-fs11 u-t2 u-mt6">🔍 Tidak ada pemilik dana titipan yang cocok dengan filter ini.</div>';
      return;
    }

    // MOCKUP-ALIGN (audit tampilan, Agustus 2026 — screenshot user: layar
    // Dana Titipan didominasi baris teknis rekonsiliasi/audit — "Pengeluaran
    // Majoris", "Sisa Saldo Majoris Belum Terpotong", warning "Beda dgn
    // total Estimasi..." — di ATAS lipatan, padahal kedua mockup
    // (mockup-ledgerpro.html/mockup-minimal.html) hanya menonjolkan 1 angka
    // ringkasan per kartu & menyembunyikan rincian di balik expand). FIX
    // ADDITIF: "Total Teralokasi" (angka paling relevan utk sekali lihat)
    // TETAP selalu tampil apa adanya, gaya kartu footer (`.titipan-card`
    // baru) menggantikan border-top dashed lama. Baris-baris audit
    // berikutnya (Total Pokok Dikomit/rekonsiliasi Majoris/Estimasi Belum
    // Teralokasi/Kelebihan Alokasi) DIPINDAH APA ADANYA (0 teks/angka/
    // urutan/kondisi diubah) ke dalam <details class="titipan-detail-toggle
    // titipan-audit-toggle"> collapsed-by-default, pola SAMA PERSIS
    // <details class="titipan-detail-toggle"> per-owner (S632) — semua
    // string yang dicek test (mis. "Total Kelebihan Alokasi",
    // "Pengeluaran Majoris") tetap ada di innerHTML, cuma disembunyikan
    // visual sampai user tap "🔍 Rincian Audit & Rekonsiliasi".
    el.innerHTML = poolSummary + addBtn + expenseBtn + filterBarHtml + `
      <div class="u-fs11 u-t2 u-mt10 u-mb4">Dana titipan dalam investasi (per pemilik, teralokasi ke instrumen):</div>
      ${this._ownerListHtml(filteredOwners)}
      <div class="titipan-card titipan-card-hero u-mt10">
        <span class="titipan-pool-lbl">Total Teralokasi</span>
        <span class="titipan-pool-amt">
          ${this._money(projection.totals.allocatedPrincipalTotal)}
          → ${this._money(projection.totals.currentValueTotal)}
          &nbsp;<span class="${this._gainCls(projection.totals.gainTotal)}">${this._gainMoney(projection.totals.gainTotal)}</span>
        </span>
      </div>
      <details class="titipan-detail-toggle titipan-audit-toggle u-mt6">
        <summary class="u-fs11 u-t2 u-pointer">🔍 Rincian Audit &amp; Rekonsiliasi</summary>
      <div class="u-flex u-jcb u-fs11 u-mt4">
        <span class="u-t2">Total Pokok Dikomit</span>
        <span class="u-fw700">${this._money(projection.totals.principalAmountTotal)}</span>
      </div>
      ${(() => {
        // SESI S595 (kontrak audit final, lanjutan
        // AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md): baris pembanding
        // OTOMATIS "Pengeluaran Majoris"/"Sisa Saldo Majoris Belum
        // Terpotong", tepat di bawah "Total Pokok Dikomit" MANUAL di
        // atas (0 logic Pokok Dikomit diubah). REUSE 100%
        // DanaTitipanPortfolioAPI.majorisRenovReconciliation() — 0
        // rumus ditulis di sini, murni wiring markup. null -> baris
        // disembunyikan (tidak ada akun tertaut Dana Titipan sama
        // sekali), pola sama `_expenseComparisonForOwner()`.
        const majoris = DanaTitipanPortfolioAPI.majorisRenovReconciliation(projection.owners, projection.totals.principalAmountTotal);
        if (!majoris) return '';
        return `
      <div class="u-flex u-jcb u-fs11 u-mt2">
        <span class="u-t2">Pengeluaran Majoris (dari transaksi Renov)</span>
        <span class="u-fw700">${this._money(majoris.pengeluaranMajoris)}</span>
      </div>
      <div class="u-flex u-jcb u-fs11 u-mt2">
        <span class="u-t2">Sisa Saldo Majoris Belum Terpotong</span>
        ${majoris.sisaSaldo < 0
          ? `<span class="titipan-over-badge red">⚠️ Melebihi pokok ${this._money(majoris.sisaSaldo)}</span>`
          : `<span class="u-fw700 green">${this._money(majoris.sisaSaldo)}</span>`}
      </div>
      ${majoris.synced ? '' : `
      <div class="u-flex u-jcb u-fs10 u-mt2 u-t2">
        <span>⚠️ Beda dgn total "Estimasi dari Transaksi Akun" per pemilik (${this._money(majoris.deductionOwnerTotal)}) — cek tag "Proyek Renovasi" vs "Ditanggung"</span>
      </div>`}`;
      })()}
      <div class="u-flex u-jcb u-fs11 u-mt2">
        <span class="u-t2">Total Estimasi Belum Teralokasi</span>
        <span class="u-fw700">${this._money(projection.totals.estimatedUnallocatedTotal)}</span>
      </div>
      ${projection.totals.overAllocatedTotal > 0 ? `
      <div class="u-flex u-jcb u-fs11 u-mt2">
        <span class="u-t2">Total Kelebihan Alokasi</span>
        <span class="titipan-over-badge red">⚠️ ${this._money(projection.totals.overAllocatedTotal)}</span>
      </div>` : ''}
      </details>
    `;
    this._restoreAssetPickSelections(el, savedAssetPicks);
  },

};

// --- DanaTitipanCommitmentUI / DanaTitipanReturnUI / DanaTitipanPoolUI
// dipindah ke modules/finance/dana-titipan-portfolio-render-b.js (audit
// ukuran file, sesi lanjutan split scan-ocr.js — lihat docs/CLAUDE.md).
// Object global verbatim, tetap dipanggil sama persis dari sini/HTML.
