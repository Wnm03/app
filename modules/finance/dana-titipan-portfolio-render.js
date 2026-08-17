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
  _poolSummaryHtml(principalAmountTotal) {
    if (typeof DanaTitipanPoolAPI === 'undefined') return '';
    const status = DanaTitipanPoolAPI.status();
    const masuk = DanaTitipanPoolAPI.poolMasukTotal();
    const sudahDialokasikan = Number(principalAmountTotal) || 0;
    const hasPoolUI = (typeof DanaTitipanPoolUI !== 'undefined');
    const wrapOpen = '<div class="titipan-pool-summary u-fs11 u-mb8" style="border:1px dashed var(--border,#ddd);border-radius:8px;padding:8px 10px">';

    if (status === 'NOT_MIGRATED') {
      const btn = hasPoolUI ? '<button type="button" class="btn btn-ghost btn-full btn-sm u-mt6" data-action="DanaTitipanPoolUI.openSetSaldoAwal">Set Saldo Awal Dana Titipan</button>' : '';
      return `${wrapOpen}
        <div class="u-flex u-jcb"><span class="u-t2">👥 Sudah Dialokasikan</span><span class="u-fw700">${this._money(sudahDialokasikan)}</span></div>
        <div class="u-flex u-jcb"><span class="u-t2">💰 Dana Titipan Masuk</span><span class="u-fw700">Belum diset</span></div>
        <div class="u-fs10 u-t2 u-mt4">📋 Status: Data lama / belum dimigrasikan</div>
        ${btn}
      </div>`;
    }

    const btn = hasPoolUI ? '<button type="button" class="btn btn-ghost btn-full btn-sm u-mt6" data-action="DanaTitipanPoolUI.openTambahDeposit">+ Tambah Deposit</button>' : '';

    if (status === 'OVER_ALLOCATED') {
      const lebih = DanaTitipanPoolAPI.overAllocatedAmount();
      return `${wrapOpen}
        <div class="u-flex u-jcb"><span class="u-t2">💰 Dana Titipan Masuk</span><span class="u-fw700">${this._money(masuk)}</span></div>
        <div class="u-flex u-jcb"><span class="u-t2">👥 Sudah Dialokasikan</span><span class="u-fw700">${this._money(sudahDialokasikan)}</span></div>
        <div class="u-flex u-jcb"><span class="u-t2">🔴 Alokasi melebihi pool</span><span class="titipan-over-badge red">${this._money(lebih)}</span></div>
        <div class="u-flex u-jcb"><span class="u-t2">Belum Dialokasikan</span><span class="u-fw700">${this._money(0)}</span></div>
        ${btn}
      </div>`;
    }

    // status === 'OK'
    const sisa = DanaTitipanPoolAPI.sisaAlokasi();
    return `${wrapOpen}
      <div class="u-flex u-jcb"><span class="u-t2">💰 Dana Titipan Masuk</span><span class="u-fw700">${this._money(masuk)}</span></div>
      <div class="u-flex u-jcb"><span class="u-t2">👥 Sudah Dialokasikan</span><span class="u-fw700">${this._money(sudahDialokasikan)}</span></div>
      <div class="u-flex u-jcb"><span class="u-t2">🟢 Belum Dialokasikan</span><span class="u-fw700 green">${this._money(sisa)}</span></div>
      ${btn}
    </div>`;
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
  _renderNow(el) {
    const savedAssetPicks = this._captureAssetPickSelections(el);
    const projection = DanaTitipanPortfolioAPI.build();
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

    el.innerHTML = poolSummary + addBtn + expenseBtn + `
      <div class="u-fs11 u-t2 u-mt10 u-mb4">Dana titipan dalam investasi (per pemilik, teralokasi ke instrumen):</div>
      ${projection.owners.map((o, oi) => `
        <details class="u-mb6${o.allocationStatus === 'OVER_ALLOCATED' ? ' titipan-owner-alert' : ''}" id="titipanOwnerCard_${oi}">
          <summary class="u-flex u-jcb u-fs12 u-pointer titipan-summary-sticky">
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
      `).join('')}
      <div class="u-flex u-jcb u-fs12 u-mt6 u-pt6" style="border-top:1px dashed var(--border,#ddd)">
        <span class="u-fw700">Total Teralokasi</span>
        <span>
          <span class="u-fw700">${this._money(projection.totals.allocatedPrincipalTotal)}</span>
          → <span class="u-fw700">${this._money(projection.totals.currentValueTotal)}</span>
          &nbsp;<span class="u-fw700 ${this._gainCls(projection.totals.gainTotal)}">${this._gainMoney(projection.totals.gainTotal)}</span>
        </span>
      </div>
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
    `;
    this._restoreAssetPickSelections(el, savedAssetPicks);
  },

};

// DanaTitipanCommitmentUI — Sesi 485d (Gap #3 audit, langkah 4/5 dari
// rencana multi-sesi — lihat RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md):
// modal CRUD "💰 Pokok Dana Titipan" (`titipanCommitmentModal`,
// modals.js), pola gabungan `investmentOwnersModal` (dropdown owner
// via listExistingOwners(), TIDAK BOLEH ketik nama bebas) +
// `investmentTxModal` (form tambah sederhana). MURNI konsumsi API sesi
// 485a-c (`DanaTitipanPortfolioAPI.listExistingOwners()`/
// `getCommitments()`/`saveCommitment()`) — 0 logika CRUD/projection
// baru ditulis di sini, file ini hanya baca input DOM & panggil API
// yang sudah ada + validasi (SUDAH ADA di saveCommitment()).
const DanaTitipanCommitmentUI = {

  // editingOwnerId — Sesi 522, pola SAMA PERSIS `InvestmentListUI.editId`
  // (investasi-list-view.js): ownerId yang SEDANG dibuka di modal ini
  // dalam mode edit (record commitment sudah ada), `null` kalau mode
  // tambah baru. Dipakai `deleteCommitment()` supaya tombol 🗑 Hapus
  // tahu owner mana yang mau dihapus tanpa perlu data-args statis (form
  // dropdown owner tidak dikunci setelah dibuka, jadi TIDAK aman baca
  // dari `#titipanCommitOwner` langsung saat delete — orang bisa saja
  // sempat ganti pilihan dropdown sebelum tap Hapus).
  editingOwnerId: null,

  // open(ownerId) — Sesi 485d. Isi dropdown owner dari
  // listExistingOwners() (bukan free-text — cegah user bikin identity
  // baru yang tidak nyambung ke holding manapun, sama alasan
  // listExistingOwners() sendiri, S485a). Kalau `ownerId` diberikan &
  // sudah punya record commitment tersimpan (getCommitments()), field
  // Pokok/Tanggal/Catatan diisi otomatis dari situ (mode edit) — kalau
  // tidak, form kosong (mode tambah baru, owner dipilih manual dari
  // dropdown).
  open(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pokok dana titipan belum siap dimuat'); return; }
    const owners = DanaTitipanPortfolioAPI.listExistingOwners();
    const sel = document.getElementById('titipanCommitOwner');
    if (sel) {
      if (!owners.length) {
        sel.innerHTML = '<option value="">— Belum ada owner di holding investasi —</option>';
      } else {
        sel.innerHTML = owners.map((o) => `<option value="${escapeHtml(o.ownerId)}">${escapeHtml(o.ownerName)}</option>`).join('');
      }
      if (ownerId) sel.value = ownerId;
    }
    const existing = ownerId
      ? DanaTitipanPortfolioAPI.getCommitments().find((c) => c && c.ownerId === ownerId)
      : null;
    const principalEl = document.getElementById('titipanCommitPrincipal');
    if (principalEl) principalEl.value = existing ? existing.principalAmount : '';
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanCommitPrincipal', 'titipanCommitPrincipalPreview');
    const dateEl = document.getElementById('titipanCommitDate');
    if (dateEl) dateEl.value = existing ? (existing.committedDate || '') : '';
    const notesEl = document.getElementById('titipanCommitNotes');
    if (notesEl) notesEl.value = existing ? (existing.notes || '') : '';
    // Sesi 522: tandai mode edit + tampilkan tombol 🗑 Hapus HANYA kalau
    // record commitment sudah ada utk owner ini (mode tambah baru -> 0
    // apa pun utk dihapus, tombol tetap disembunyikan, pola sama
    // `investmentModal`/`investmentDeleteBtn`).
    DanaTitipanCommitmentUI.editingOwnerId = existing ? ownerId : null;
    const delBtn = document.getElementById('titipanCommitDelBtn');
    if (delBtn && delBtn.style) delBtn.style.display = existing ? '' : 'none';
    // Sesi 5 ("Isi dari Sisa", MASTER_HANDOFF §11/§13.2/§19): tombol HANYA
    // muncul saat status pool `OK` DAN sisa>0 (§19 acceptance criteria).
    // Angka `sisa` dibaca LIVE di sini (saat modal dibuka) — TAPI §11
    // rule 2 tetap mewajibkan baca ULANG lagi persis di titik klik
    // (`fillFromRemaining()` di bawah, BUKAN pakai closure/angka dari
    // sini), krn render bisa stale kalau ada perubahan pool/commitment
    // di tab lain sebelum user benar-benar klik (skenario K, §18).
    DanaTitipanCommitmentUI._refreshFillRemainingBtn();
    if (typeof openModal === 'function') openModal('titipanCommitmentModal');
  },

  // _refreshFillRemainingBtn() — helper internal Sesi 5, dipanggil dari
  // `open()` (saat modal dibuka) supaya tombol+label langsung sesuai
  // status pool terkini. Guard `typeof DanaTitipanPoolAPI==='undefined'`
  // (build.js Sesi 6 belum jalan, lihat catatan di
  // `DanaTitipanPoolUI.save()`) -> tombol disembunyikan diam-diam (bukan
  // toast error, krn ini bukan aksi user, cuma render pasif saat buka
  // modal).
  _refreshFillRemainingBtn() {
    const btn = document.getElementById('titipanCommitFillRemainingBtn');
    if (!btn || !btn.style) return;
    if (typeof DanaTitipanPoolAPI === 'undefined') { btn.style.display = 'none'; return; }
    const status = DanaTitipanPoolAPI.status();
    const sisa = DanaTitipanPoolAPI.sisaAlokasi();
    if (status === 'OK' && typeof sisa === 'number' && sisa > 0) {
      const label = document.getElementById('titipanCommitFillRemainingLabel');
      if (label) label.textContent = 'Isi dari Sisa ' + DanaTitipanPortfolioPresenter._money(sisa);
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  },

  // fillFromRemaining() — Sesi 5 (§11, skenario J/K). WAJIB baca ulang
  // `DanaTitipanPoolAPI.status()`/`.sisaAlokasi()` LIVE di titik klik ini
  // (bukan pakai label yang sudah dirender `open()`/nilai closure lain)
  // — kalau antara modal dibuka & tombol diklik ada perubahan pool/
  // commitment di tempat lain (skenario K), angka yang dipakai HARUS
  // yang terbaru. Field `principalAmount` tetap EDITABLE setelah diisi
  // (§11 rule 4) -- ini cuma isi nilai awal, bukan lock field. Validasi
  // final tetap di titik save() (§11 rule 5), 0 validasi baru ditulis di
  // sini.
  fillFromRemaining() {
    if (typeof DanaTitipanPoolAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur Dana Titipan Pool belum siap dimuat'); return; }
    const status = DanaTitipanPoolAPI.status();
    const sisa = DanaTitipanPoolAPI.sisaAlokasi();
    if (status !== 'OK' || typeof sisa !== 'number' || sisa <= 0) {
      // Skenario K: data sempat berubah antara modal dibuka & klik
      // (mis. owner lain baru saja disimpan di tab lain, sisa jadi 0).
      // Refresh tombol supaya konsisten (auto-sembunyi) + kasih toast
      // jelas, BUKAN mengisi field dgn angka basi.
      DanaTitipanCommitmentUI._refreshFillRemainingBtn();
      if (typeof toast === 'function') toast('⚠️ Sisa dana titipan sudah berubah (mis. baru saja dialokasikan di tempat lain) — silakan isi manual.');
      return;
    }
    const principalEl = document.getElementById('titipanCommitPrincipal');
    if (principalEl) principalEl.value = sisa;
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanCommitPrincipal', 'titipanCommitPrincipalPreview');
  },

  // addNewOwner() — Sesi 523-B (BUG-01). Modal ini sebelumnya HANYA bisa
  // pilih owner existing dari listExistingOwners() (dropdown read-only,
  // Design Lock S485d) -- tidak ada jalan membuat owner baru langsung
  // dari sini, harus muter dulu lewat "⚖️ Atur Porsi Kepemilikan" di
  // Investasi/Aset. Fix ini TIDAK melanggar Design Lock: tetap 0 free-text
  // langsung ke saveCommitment() (ownerId masih wajib dari
  // listExistingOwners()) -- yang baru cuma jalur MEMBUAT owner itu lebih
  // dulu via OwnerRegistry.findOrCreate() (S489, API resmi, sama seperti
  // dipakai assetOwnersModal/investmentOwnersModal), lalu open() dipanggil
  // ulang supaya dropdown ter-refresh dan owner baru otomatis dipilih
  // (listExistingOwners() sudah include OwnerRegistry.listAll() sejak
  // S492, jadi owner baru ini langsung muncul di union).
  async addNewOwner() {
    if (typeof OwnerRegistry === 'undefined' || typeof OwnerRegistry.findOrCreate !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur tambah pemilik belum siap dimuat');
      return;
    }
    const name = typeof showPromptModal === 'function'
      ? await showPromptModal({ title: 'Tambah Pemilik Baru', message: 'Nama pemilik dana titipan', placeholder: 'Budi, Ibu, dll' })
      : (typeof prompt === 'function' ? prompt('Nama pemilik dana titipan') : null);
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const ownerId = OwnerRegistry.findOrCreate(trimmed);
    DanaTitipanCommitmentUI.open(ownerId);
    if (typeof toast === 'function') toast('✅ Pemilik "' + trimmed + '" ditambahkan');
  },

  // save() — Sesi 485d. Baca form, panggil
  // `DanaTitipanPortfolioAPI.saveCommitment()` (S485b, validasi
  // existing-owner-only + principal>=0 SUDAH ADA di sana — 0 validasi
  // baru ditulis di sini). `saveCommitment()` melempar Error kalau
  // validasi gagal, dibungkus try/catch pola sama
  // `InvestmentUI.saveOwners()`.
  save() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pokok dana titipan belum siap dimuat'); return; }
    const sel = document.getElementById('titipanCommitOwner');
    const ownerId = sel ? sel.value : '';
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner wajib dipilih'); return; }
    const ownerName = sel && sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
    const principalEl = document.getElementById('titipanCommitPrincipal');
    const principalAmount = principalEl ? principalEl.value : '';
    const committedDate = (document.getElementById('titipanCommitDate') || {}).value || '';
    const notes = (document.getElementById('titipanCommitNotes') || {}).value || '';
    try {
      DanaTitipanPortfolioAPI.saveCommitment({ ownerId, ownerName, principalAmount, committedDate, notes });
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan pokok dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanCommitmentModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // Sesi 550 (FIX-S550-DANA-TITIPAN-TABLIST-SYNC-COMMITMENT-UI): sinkron
    // container #danaTitipanTabList (sub-tab Laporan > Dana Titipan, Sesi
    // 498) setelah save() commitment — pola PERSIS sama seperti panggilan
    // di renderLaporan() (modules-render.js), 0 logic baru, hanya
    // memastikan container BARU ini ikut ter-refresh saat commitment
    // diubah lewat modal (sebelumnya cuma render() ke container LAMA
    // #danaTitipanPortfolioList yang ke-refresh, #danaTitipanTabList baru
    // ikut update di render berikutnya lewat renderLaporan()).
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('✅ Pokok dana titipan tersimpan');
  },

  // deleteCommitment() — Sesi 522 (FIX-S521-DANA-TITIPAN-UI-MULTIOWNER,
  // gap #2). Hapus record commitment owner yang SEDANG dibuka
  // (`editingOwnerId`, di-set di `open()` — TIDAK baca ulang dropdown,
  // lihat komentar `editingOwnerId` di atas), `askConfirm()` dulu (pola
  // sama `DanaTitipanReturnUI.deleteEntry()`), 100% reuse
  // `DanaTitipanPortfolioAPI.deleteCommitment()` (0 logic baru).
  async deleteCommitment() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    const ownerId = DanaTitipanCommitmentUI.editingOwnerId;
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Belum ada pokok dana titipan tersimpan utk owner ini'); return; }
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm('Hapus pokok dana titipan owner ini?', { okText: 'Ya, Hapus' });
      if (!ok) return;
    }
    DanaTitipanPortfolioAPI.deleteCommitment(ownerId);
    DanaTitipanCommitmentUI.editingOwnerId = null;
    if (typeof closeModal === 'function') closeModal('titipanCommitmentModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // Sesi 550 (FIX-S550-DANA-TITIPAN-TABLIST-SYNC-COMMITMENT-UI): sama
    // seperti save() di atas — sinkron #danaTitipanTabList setelah hapus
    // commitment, pola PERSIS sama dgn renderLaporan() (0 logic baru).
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('🗑️ Pokok dana titipan dihapus');
  },

  // removeOwnerLinkage(ownerId) — Sesi 523-C (BUG-02/BUG-06). Dipanggil
  // LANGSUNG dari kartu owner di dashboard (tombol "🔓 Lepas Keterikatan
  // Dana Titipan") — TIDAK perlu buka modal `titipanCommitmentModal`
  // dulu (beda dari `deleteCommitment()` di atas yang baca
  // `editingOwnerId`, HANYA valid kalau modal itu sedang terbuka).
  // `ownerId` diberikan LANGSUNG dari `data-args` kartu (pola sama
  // `DanaTitipanReturnUI.open(ownerId)`), 0 baca state modal tersembunyi.
  // 100% reuse `DanaTitipanPortfolioAPI.removeOwnerLinkage()` (0 logic
  // baru) + `askConfirm()` dulu (pola sama `deleteCommitment()`/
  // `DanaTitipanReturnUI.deleteEntry()`). Pesan konfirmasi eksplisit
  // menyebutkan bedanya dari delete commitment biasa (porsi Investasi/
  // Aset & identitas owner TIDAK ikut hilang) supaya user tidak salah
  // duga ini "hapus owner".
  async removeOwnerLinkage(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner tidak dikenali'); return; }
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm(
        'Lepas keterikatan owner ini dari Dana Titipan?\nPokok dana titipan yang tercatat akan dihapus. Porsi kepemilikan di Investasi/Aset TIDAK ikut berubah, dan identitas pemilik ini tetap ada (bisa dipakai lagi kapan saja).',
        { okText: 'Ya, Lepas' },
      );
      if (!ok) return;
    }
    const removed = DanaTitipanPortfolioAPI.removeOwnerLinkage(ownerId);
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // FIX (audit tombol "Lepas Keterikatan"): sama seperti save()/
    // deleteCommitment() di atas (Sesi 550, FIX-S550-DANA-TITIPAN-TABLIST-
    // SYNC-COMMITMENT-UI) — tombol ini dirender dgn markup yg SAMA di 2
    // container (#danaTitipanPortfolioList lama & #danaTitipanTabList
    // baru/sub-tab Laporan > Dana Titipan). render() di atas cuma
    // refresh container lama; kalau user klik tombol ini dari
    // #danaTitipanTabList, tampilan yg sedang dilihat jadi stale sampai
    // pindah tab. Sync eksplisit, pola PERSIS sama dgn save()/
    // deleteCommitment(), 0 logic baru.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') {
      toast(removed ? '🔓 Keterikatan Dana Titipan dilepas' : 'ℹ️ Owner ini belum punya pokok dana titipan tercatat');
    }
  },

  // openAssetPorsi(i) — SESI 515 (Owner -> Nominal -> Asset -> Kuota ->
  // Porsi). Wrapper navigasi TIPIS dari kartu Dana Titipan ke
  // `assetOwnersModal` (aset.js, S392a+, live Kuota S505) utk aset yang
  // dipilih dari dropdown picker `renderInto()`
  // (`DanaTitipanPortfolioPresenter._assetOptionsHtml()`). `i` = index urutan
  // kartu owner SAAT render() ini — dipakai HANYA utk cari elemen DOM
  // picker-nya sendiri (`#titipanAssetPick_{i}`), BUKAN identity
  // owner/aset. 0 logika CRUD/porsi baru di sini — 100% delegasi ke
  // `Aset.openOwnersModalById()` (baru, aset.js Sesi 515) yang sendiri
  // 100% reuse `Aset.openOwnersModal()` existing (S392a).
  // SESI 544 — sama root cause & fix dgn `onAssetPickChange()` di atas
  // (duplikat ID `titipanAssetPick_N` di 2 container render bersamaan).
  // Dual-mode: elemen tombol (`$el`, dipakai markup baru) ATAU angka
  // index (fallback lama, 0 breaking change utk caller/test existing).
  openAssetPorsi(target) {
    let sel = null;
    if (target && typeof target === 'object' && typeof target.closest === 'function') {
      const card = target.closest('details');
      sel = card && typeof card.querySelector === 'function' ? card.querySelector('select[id^="titipanAssetPick_"]') : null;
    } else {
      sel = document.getElementById('titipanAssetPick_' + target);
    }
    const assetId = sel ? sel.value : '';
    if (!assetId) { if (typeof toast === 'function') toast('⚠️ Pilih aset dulu'); return; }
    this._routeAssetPorsi(assetId);
  },

  // openAssetPorsiDirect(assetId) — SESI 631. Jalur BARU: dipanggil
  // langsung dari klik nama instrumen di baris holding (_holdingRowHtml())
  // — TANPA lewat dropdown "Pilih Aset" dulu, karena assetId-nya SUDAH
  // pasti (baris ini sendiri representasi aset/holding itu). 100%
  // delegasi ke `_routeAssetPorsi()` yang sama dipakai `openAssetPorsi()`
  // (dropdown lama) — 0 logic routing baru, cuma 1 pintu masuk tambahan.
  openAssetPorsiDirect(assetId) {
    if (!assetId) { if (typeof toast === 'function') toast('⚠️ Aset tidak ditemukan'); return; }
    this._routeAssetPorsi(assetId);
  },

  // _routeAssetPorsi(assetId) — SESI 631: routing asli `openAssetPorsi()`
  // (s608, opsi Holding prefix `h:` -> InvestmentUI.openOwnersModal(),
  // opsi Buku Aset -> Aset.openOwnersModalById()) DIEKSTRAK apa adanya
  // supaya dipakai bareng oleh `openAssetPorsi()` (dropdown) DAN
  // `openAssetPorsiDirect()` (klik nama baris holding) — 0 perubahan
  // perilaku routing, murni dedup.
  _routeAssetPorsi(assetId) {
    if (assetId.indexOf('h:') === 0) {
      const holdingId = assetId.slice(2);
      if (typeof InvestmentUI === 'undefined' || typeof InvestmentUI.openOwnersModal !== 'function') {
        if (typeof toast === 'function') toast('⚠️ Fitur Holding Investasi belum siap dimuat');
        return;
      }
      InvestmentUI.openOwnersModal(holdingId);
      return;
    }
    if (typeof Aset === 'undefined' || typeof Aset.openOwnersModalById !== 'function') {
      if (typeof toast === 'function') toast('⚠️ Fitur Buku Aset belum siap dimuat');
      return;
    }
    Aset.openOwnersModalById(assetId);
  },

};

// DanaTitipanReturnUI — Sesi 486 (Case F: Partial Return / Pengembalian
// Dana Titipan, lihat RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md,
// lanjutan Gap #3 yang SUDAH SELESAI S485a-e). Modal "↩️ Catat
// Pengembalian" (`titipanReturnModal`, modals.js) — beda dari
// `titipanCommitmentModal`: field Owner di sini READONLY DISPLAY (bukan
// dropdown), karena pengembalian SELALU terikat ke owner yang sedang
// dibuka dari kartunya sendiri (bukan record baru bebas pilih owner).
// MURNI konsumsi API Sesi 486 (`DanaTitipanPortfolioAPI.recordReturn()`/
// `getReturns()`/`deleteReturn()`) — 0 logika CRUD baru ditulis di sini,
// pola SAMA PERSIS `DanaTitipanCommitmentUI` (S485d).
const DanaTitipanReturnUI = {

  // open(ownerId) — isi tampilan owner (readonly) dari
  // listExistingOwners() + kosongkan form (SELALU mode tambah baru —
  // riwayat pengembalian TIDAK PERNAH diedit, hanya ditambah/dihapus,
  // pola sama InvestmentTxUI "hapus lalu catat ulang").
  open(ownerId) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pengembalian dana titipan belum siap dimuat'); return; }
    const known = DanaTitipanPortfolioAPI.listExistingOwners().find((o) => o.ownerId === ownerId);
    const ownerDisplayEl = document.getElementById('titipanReturnOwnerDisplay');
    if (ownerDisplayEl) ownerDisplayEl.textContent = known ? known.ownerName : '';
    const ownerIdEl = document.getElementById('titipanReturnOwnerId');
    if (ownerIdEl) ownerIdEl.value = ownerId || '';
    const amountEl = document.getElementById('titipanReturnAmount');
    if (amountEl) amountEl.value = '';
    if (typeof updateAmtPreview === 'function') updateAmtPreview('titipanReturnAmount', 'titipanReturnAmountPreview');
    const dateEl = document.getElementById('titipanReturnDate');
    if (dateEl) dateEl.value = '';
    const notesEl = document.getElementById('titipanReturnNotes');
    if (notesEl) notesEl.value = '';
    if (typeof openModal === 'function') openModal('titipanReturnModal');
  },

  // save() — baca form, panggil `DanaTitipanPortfolioAPI.recordReturn()`
  // (validasi existing-owner-only + amount>=0 SUDAH ADA di sana — 0
  // validasi baru di sini). `recordReturn()` melempar Error kalau
  // validasi gagal, dibungkus try/catch pola sama
  // `DanaTitipanCommitmentUI.save()`.
  save() {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') { if (typeof toast === 'function') toast('⚠️ Fitur pengembalian dana titipan belum siap dimuat'); return; }
    const ownerIdEl = document.getElementById('titipanReturnOwnerId');
    const ownerId = ownerIdEl ? ownerIdEl.value : '';
    if (!ownerId) { if (typeof toast === 'function') toast('⚠️ Owner wajib dipilih'); return; }
    const ownerDisplayEl = document.getElementById('titipanReturnOwnerDisplay');
    const ownerName = ownerDisplayEl ? ownerDisplayEl.textContent : '';
    const amountEl = document.getElementById('titipanReturnAmount');
    const amount = amountEl ? amountEl.value : '';
    const returnDate = (document.getElementById('titipanReturnDate') || {}).value || '';
    const notes = (document.getElementById('titipanReturnNotes') || {}).value || '';
    try {
      DanaTitipanPortfolioAPI.recordReturn({ ownerId, ownerName, amount, returnDate, notes });
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal mencatat pengembalian dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanReturnModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // FIX (audit lanjutan tombol "Lepas Keterikatan" — bug sekelas di
    // fungsi mutasi lain file ini): sama seperti save()/deleteCommitment()/
    // removeOwnerLinkage() di atas (Sesi 550 + fix ini) — sync eksplisit
    // ke #danaTitipanTabList (sub-tab Laporan > Dana Titipan), pola
    // PERSIS sama, 0 logic baru.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('✅ Pengembalian dana titipan tercatat');
  },

  // deleteEntry(id) — hapus 1 baris riwayat pengembalian, `askConfirm()`
  // dulu (pola sama `InvestmentTxUI.deleteTx()`), 100% reuse
  // `DanaTitipanPortfolioAPI.deleteReturn()` (0 logic baru).
  async deleteEntry(id) {
    if (typeof DanaTitipanPortfolioAPI === 'undefined') return;
    if (typeof askConfirm === 'function') {
      const ok = await askConfirm('Hapus riwayat pengembalian ini?', { okText: 'Ya, Hapus' });
      if (!ok) return;
    }
    DanaTitipanPortfolioAPI.deleteReturn(id);
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    // FIX (audit lanjutan, bug sekelas — lihat catatan di save() di atas):
    // sync eksplisit ke #danaTitipanTabList, pola PERSIS sama.
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast('🗑️ Riwayat pengembalian dihapus');
  },

};

// DanaTitipanPoolUI — SESI 4 (UI POOL, MASTER_HANDOFF_DANA_TITIPAN_POOL_
// PORSI.md §13.4), BAGIAN 2/2. Bagian 1 (session-04a) membuat STUB kedua
// method di bawah (toast "belum tersedia") supaya lint statis
// `tests/data-action-resolvable-s285.test.js` lolos & tombol tidak dead-
// click. Bagian 2 ini ISI ULANG badan kedua method dengan modal
// `titipanPoolModal` sungguhan (§13.4: field nominal/tanggal/catatan,
// pola persis sama `titipanCommitmentModal` — amt-wrap+fi-calc-only utk
// nominal, `evalAmtExpr`/`updateAmtPreview`, `openModal`/`closeModal`),
// submit -> `DanaTitipanPoolAPI.addOpeningBalance()`/`.addDeposit()`
// (Sesi 1/2, sudah ada & tested, TIDAK diubah di sini).
//
// `_mode` menyimpan mode terakhir (`'opening_balance'`|`'deposit'`) yang
// dipilih lewat `openSetSaldoAwal()`/`openTambahDeposit()` — dibaca ulang
// oleh `save()` supaya 1 modal fisik (`titipanPoolModal`) bisa dipakai utk
// 2 aksi berbeda tanpa 2 modal terpisah (pola sama `Bill.setBillType`/
// `WorthIt.switchTab`, bukan pola baru).
//
// [AUDIT PENTING utk Sesi 6/Integration]: `dana-titipan-pool-api.js`
// (Sesi 1/2) BELUM terdaftar di `scripts/build.js` GROUP_A/GROUP_B — ini
// SESUAI rencana MASTER_HANDOFF §15/§20 (registrasi build.js adalah scope
// Sesi 6, BUKAN Bagian 2 ini). Konsekuensinya: sampai Sesi 6 selesai,
// `DanaTitipanPoolAPI` TIDAK ada di bundle produksi (`app-bundle-*.min.js`)
// walau modal & wiring di bawah ini sudah lengkap & lolos build lint —
// `save()` di bawah SUDAH menggate `typeof DanaTitipanPoolAPI === 'undefined'`
// (pola sama `DanaTitipanCommitmentUI.save()`) supaya kalau modal ini
// sempat ke-deploy sendirian sebelum Sesi 6, user dapat toast jelas
// ("fitur belum siap dimuat"), BUKAN error JS mentah/crash. Sesi 6 WAJIB
// menambah `'modules/finance/dana-titipan-pool-api.js'` ke build.js
// (sebelum `dana-titipan-commitment-return-api.js`, urutan §15) SEBELUM
// fitur ini benar-benar bisa dipakai user nyata.
const DanaTitipanPoolUI = {

  _mode: 'opening_balance',

  // _resetForm() — helper internal, kosongkan field & set tanggal default
  // hari ini (pola sama `Piutang.openModal()`/`DanaTitipanCommitmentUI.
  // open()` utk mode "tambah baru" — modal ini TIDAK punya mode edit,
  // tiap submit = 1 entry pool baru, MASTER_HANDOFF §14 `_addEntry()`
  // sengaja tidak upsert).
  _resetForm() {
    const amtEl = document.getElementById('titipanPoolAmt');
    if (amtEl) amtEl.value = '';
    const previewEl = document.getElementById('titipanPoolAmtPreview');
    if (previewEl) previewEl.textContent = '';
    const dateEl = document.getElementById('titipanPoolDate');
    if (dateEl) dateEl.value = (typeof todayStr === 'function') ? todayStr() : '';
    const notesEl = document.getElementById('titipanPoolNotes');
    if (notesEl) notesEl.value = '';
  },

  // openSetSaldoAwal() — Bagian 2. Buka `titipanPoolModal` mode
  // "opening balance", submit -> `DanaTitipanPoolAPI.addOpeningBalance()`.
  // Sesuai MASTER_HANDOFF §19 (acceptance criteria), tombol ini HANYA
  // dirender saat status `NOT_MIGRATED` (lihat `_poolSummaryHtml()`,
  // Bagian 1, tidak diubah di sini) -- method ini sendiri TIDAK perlu
  // cek ulang status, cukup buka modal dgn label yang sesuai.
  openSetSaldoAwal() {
    DanaTitipanPoolUI._mode = 'opening_balance';
    const titleEl = document.getElementById('titipanPoolModalTitle');
    if (titleEl) titleEl.textContent = '💰 Set Saldo Awal Dana Titipan';
    const hintEl = document.getElementById('titipanPoolModalHint');
    if (hintEl) hintEl.textContent = 'Catat saldo awal dana titipan yang sudah ada saat ini (baseline pool pertama kali) — dipakai buat validasi supaya total pokok yang dialokasikan ke tiap pemilik tidak melebihi dana yang benar-benar ada. Bukan transaksi keuangan, tidak menyentuh Kas/Akun/Investasi.';
    DanaTitipanPoolUI._resetForm();
    if (typeof openModal === 'function') openModal('titipanPoolModal');
  },

  // openTambahDeposit() — Bagian 2. Buka `titipanPoolModal` mode
  // "deposit", submit -> `DanaTitipanPoolAPI.addDeposit()`. Dirender saat
  // status `OK`/`OVER_ALLOCATED` (pool sudah pernah diisi, §19).
  openTambahDeposit() {
    DanaTitipanPoolUI._mode = 'deposit';
    const titleEl = document.getElementById('titipanPoolModalTitle');
    if (titleEl) titleEl.textContent = '➕ Tambah Deposit Dana Titipan';
    const hintEl = document.getElementById('titipanPoolModalHint');
    if (hintEl) hintEl.textContent = 'Catat tambahan dana titipan yang baru masuk (menambah pool yang sudah ada) — dipakai buat validasi supaya total pokok yang dialokasikan ke tiap pemilik tidak melebihi dana yang benar-benar ada. Bukan transaksi keuangan, tidak menyentuh Kas/Akun/Investasi.';
    DanaTitipanPoolUI._resetForm();
    if (typeof openModal === 'function') openModal('titipanPoolModal');
  },

  // save() — baca form, panggil `DanaTitipanPoolAPI.addOpeningBalance()`/
  // `.addDeposit()` sesuai `_mode` (Sesi 1/2, sudah tested, 0 logic baru
  // ditulis di sini). API melempar Error kalau validasi gagal (amount
  // bukan angka >=0, MASTER_HANDOFF §14 `_validateAmount()`), dibungkus
  // try/catch pola sama `DanaTitipanCommitmentUI.save()`/`InvestmentUI.
  // saveOwners()`. Setelah sukses: tutup modal, re-render dashboard
  // Dana Titipan (pola re-render sama persis `DanaTitipanCommitmentUI.
  // save()` di atas -- `DanaTitipanPortfolioPresenter.render()` +
  // `renderInto('danaTitipanTabList')`, supaya kartu ringkasan pool baru
  // ikut ter-refresh di KEDUA container, bukan cuma satu).
  save() {
    if (typeof DanaTitipanPoolAPI === 'undefined') {
      if (typeof toast === 'function') toast('⚠️ Fitur Dana Titipan Pool belum siap dimuat (menunggu registrasi build.js Sesi 6)');
      return;
    }
    const amtEl = document.getElementById('titipanPoolAmt');
    const amount = amtEl ? amtEl.value : '';
    const date = (document.getElementById('titipanPoolDate') || {}).value || '';
    const notes = (document.getElementById('titipanPoolNotes') || {}).value || '';
    try {
      if (DanaTitipanPoolUI._mode === 'deposit') {
        DanaTitipanPoolAPI.addDeposit({ amount, date, notes });
      } else {
        DanaTitipanPoolAPI.addOpeningBalance({ amount, date, notes });
      }
    } catch (e) {
      if (typeof toast === 'function') toast('⚠️ ' + ((e && e.message) ? e.message : 'Gagal menyimpan dana titipan'));
      return;
    }
    if (typeof closeModal === 'function') closeModal('titipanPoolModal');
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined') DanaTitipanPortfolioPresenter.render();
    if (typeof DanaTitipanPortfolioPresenter !== 'undefined' && typeof DanaTitipanPortfolioPresenter.renderInto === 'function') DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
    if (typeof toast === 'function') toast(DanaTitipanPoolUI._mode === 'deposit' ? '✅ Deposit dana titipan tersimpan' : '✅ Saldo awal dana titipan tersimpan');
  },

};

if (typeof window !== 'undefined') {
  window.DanaTitipanCommitmentUI = DanaTitipanCommitmentUI;
  window.DanaTitipanReturnUI = DanaTitipanReturnUI;
  window.DanaTitipanPoolUI = DanaTitipanPoolUI;
}
