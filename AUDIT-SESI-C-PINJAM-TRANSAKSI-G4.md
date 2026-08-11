# Audit: Sesi C — Mekanisme "Pinjam untuk Transaksi Keuangan" (G4)

**Tanggal audit:** 2026-08-09
**Status:** AUDIT — 0 kode diimplementasikan sesi ini.
**Konteks:** Sesi A (S498, v1229), Sesi B1 (S499, v1230), Sesi B2 (S500,
v1231), F3 (S501, v1232) sudah shipped — tab "💰 Dana Titipan" terpadu
sekarang mencakup Investasi + Aset, dengan guard F1, tampilan F2 Opsi B,
& deteksi F3. Sesi ini murni **audit** untuk G4 ("mekanisme pinjam untuk
transaksi keuangan") sesuai rencana 4-sesi awal (`AUDIT-DANA-TITIPAN-
TAB-TERPADU.md`) — wajib dikerjakan sebelum coding apa pun, sesuai
keputusan sejak Sesi A.

---

## 1. APA YANG DIMAKSUD G4

Berdasarkan pola yang SUDAH ADA & terbukti jalan di 2 domain lain:
- **Investasi** (`investasi.js`, `addHolding()`): field `fundSource`
  (`'titipan'`/`'sendiri'`) + `titipanOwner` → beli instrumen pakai uang
  titipan orang lain, otomatis mencatat 1 entry Buku Utang lewat
  `Investment._syncTitipanDebt()`.
- **Aset** (`aset.js`, migrasi Sesi 406b-410): porsi titipan dlm 1 aset
  SELF, disinkron ke Buku Utang lewat `Aset._syncOwnerDebts()`.

G4 = generalisasi pola yang sama ke **Transaksi Keuangan biasa**
(`D.transactions`, `modules/finance/transaksi.js`): user membuat 1
transaksi (paling relevan: Pengeluaran) yang dananya berasal dari uang
titipan orang lain — mis. "beli laptop Rp 15jt pakai uang titipan Budi",
otomatis menghasilkan 1 entry Buku Utang "Utang ke Budi Rp 15jt" tanpa
user harus buka 2 modal terpisah (Transaksi + Utang).

Ini **beda** dari fitur yang SUDAH ADA di `transaksi.js` sejak Sesi 394
(`resolveTxAssetSplit()`, `#txAssetId`): itu HANYA preview info "kalau
transaksi Pemasukan ini ditautkan ke aset multi-owner, begini pembagian
nominalnya ke tiap pemilik" — read-only, TIDAK membuat/mengubah Buku
Utang, TIDAK berlaku untuk Pengeluaran.

---

## 2. RINGKASAN TEMUAN

| # | Temuan | Severity | Implikasi |
|---|---|---|---|
| G1 | `saveTx()`/`_saveTxInner()` (transaksi.js, 1200+ baris) punya **≥5 percabangan khusus** yang saling eksklusif berdasar tautan existing (`billLinkId` kind `utang`/`tagihan`, `cicilan`/`langganan`, generik) — SETIAP cabang punya `Object.assign(existingTx, …)` & alur `save()` SENDIRI-SENDIRI | 🔴 TINGGI | Field debt-borrow baru HARUS di-wire ke tiap cabang secara terpisah, bukan 1 titik generik |
| G2 | `delTx()` (tx-list-cashflow.js) sudah py **9 blok cleanup linked-side-effect berbeda** (`bbmLinkId`/`partStockId`/`stockItems`/`cobekLinkId`/`servisLinkId`/`renovItemLinkId`/`wishlistLinkId`/`sewaKiosLinkId`/`tukangPaymentEntryIds`/`transferPairId`) — pola "1 field link = 1 blok cleanup manual" sudah mapan tapi linear (nambah 1 field = nambah 1 blok, 0 abstraksi generik) | 🟡 SEDANG | Debt-borrow butuh blok cleanup ke-10 kalau mau delete-sync yang benar (kalau tidak: debt jadi orphan yang tidak pernah ikut terhapus) |
| G3 | Edit-sync utang SUDAH py preseden rumit yg berhasil (`existingBill.kind==='utang'`, baris 826-840): pola `isLatestInstallment` (cuma pembayaran TERBARU yg boleh sinkron balik ke jadwal) — TAPI itu utk transaksi PEMBAYARAN cicilan utang yg SUDAH ADA, bukan transaksi PENYEBAB utang baru terbentuk (kasus G4 kebalikannya: 1 transaksi Pengeluaran MEMBUAT utang, bukan MELUNASI) | 🟡 SEDANG | Pola existing tidak bisa direuse langsung, perlu alur baru (meski konsepnya mirip) |
| G4a | `Investment._syncTitipanDebt()`/`Aset._syncOwnerDebts()` sudah dites (multi-owner-engine.test.js, investasi.js tests) & TERBUKTI aman utk domain masing2 — pola "titik akses tunggal yg menjaga 1 entry Buku Utang tetap sinkron" ADA presedennya, TAPI titik akses itu dipanggil dari SEDIKIT tempat (addHolding/updateHolding/removeHolding, atau Aset.save()/saveOwners()) — `saveTx()` py JAUH lebih banyak titik masuk (create baru, ≥5 cabang edit, delTx() terpisah di file lain) | ℹ️ INFO | Preseden ADA & TERBUKTI, tapi permukaan integrasi G4 jauh lebih luas dari 2 domain sebelumnya |
| G4b | **Sudah ada alternatif manual, 0 kode, yang mencapai hasil bookkeeping SAMA PERSIS**: modul Buku Utang (`piutang-utang.js`, `Debt.save()`) sudah bisa dipakai user HARI INI untuk mencatat "Utang ke Budi Rp 15jt" secara manual, kapan pun, tanpa perlu tertaut ke transaksi tertentu (`assetId` di form Utang OPSIONAL) | ℹ️ INFO | Baca §4 |

---

## 3. DETAIL G1-G3 (kompleksitas `saveTx()`, dengan bukti kode)

`_saveTxInner()` (transaksi.js baris 733-1200+) MEMANG dirancang sbg 1
fungsi besar dgn banyak jalur exclusive-return, bukan 1 alur linear:

```
_saveTxInner()
├── existingBill.kind==='utang'   → baris 826-840 (early return)
├── existingBill.kind==='tagihan' (aktif ATAU diarsipkan) → baris 854-869 (early return)
├── existingBill && curPayMethod===existingBill.kind
│   ├── curPayMethod==='cicilan'  → baris 884-9xx (early return)
│   └── curPayMethod==='langganan' → cabang serupa (tidak dikutip penuh di sini)
└── (fallback) transaksi generik/tunai → sisa fungsi
```

Tiap cabang independen: kalau G4 ("dibiayai dana titipan Budi") mau
berlaku UNIVERSAL (bisa dipasang ke transaksi model pembayaran apa pun —
tunai, cicilan, tagihan, dst), field baru itu harus di-`Object.assign()`
& di-sync-debt di **SETIAP** cabang di atas, TERPISAH-PISAH — resep yang
sama seperti kenapa BUG-FIN-tagihan (fix Sesi 316, dikutip di komentar
baris 841-853) & BUG utang (fix item #4 laporan s299, baris 813-825)
pernah terjadi: 1 cabang di-update, cabang lain lupa, jadi tidak
konsisten. RISIKO REGRESI utk fitur baru yg nyentuh SEMUA cabang ini
tinggi, terutama kalau dikerjakan dalam 1 sesi besar.

`delTx()` (tx-list-cashflow.js baris 82-160+) sudah py pola "1 field
link = 1 blok cleanup", TAPI **linear & manual** (bukan generik/loop) —
lihat 9 blok if terpisah yg dikutip di tabel G2. Field debt-borrow baru
butuh blok ke-10 dgn pola sama (cari debt tertaut via id, hapus/kurangi
`d.nilai`) — SECARA TEKNIS straightforward tapi WAJIB ditambahkan,
karena kalau lupa: debt yg dibuat G4 jadi ORPHAN permanen begitu
transaksi sumbernya dihapus (mirip persis kelas bug yg dicek
`data-health-check.js` utk tautan `assetId` orphan Sesi 401b/402 — tapi
kali ini arahnya TERBALIK: bukan tautan yg orphan krn ASET dihapus,
tapi UTANG yg orphan krn TRANSAKSI dihapus).

---

## 4. ALTERNATIF YANG SUDAH ADA HARI INI (0 kode, 0 risiko)

Modul Buku Utang (`piutang-utang.js`, `Debt.save()`, baris 408-445)
SUDAH mendukung use-case inti G4 tanpa perlu 1 baris kode baru:

```js
// Debt._saveInner() -- SUDAH ADA, sudah dites, dipakai hari ini
d = { id: uid(), name, jenis, nilai, bunga, cicilanBulanan, tanggal,
      jatuhTempo, catatan, assetId, lunas: Debt._lunasState };
D.debts.push(d);
```

`assetId` di form Utang **opsional** (`const assetId=assetIdEl?
assetIdEl.value:''`) — user BISA (dan SUDAH BISA sejak modul ini ada)
mencatat "Utang ke Budi, Rp 15.000.000, keterangan: dana titipan dipakai
buat beli laptop" lewat modal Utang biasa, **hari ini juga**, 2-3 tap:
1. Buat transaksi Pengeluaran spt biasa (beli laptop, Rp 15jt, tunai).
2. Buka modal ➕ Utang, isi nama pemberi (Budi), nilai (15jt), catatan
   ("dana titipan, dipakai beli laptop [tanggal]").

Hasil bookkeeping-nya **identik** dgn yang G4 otomatis akan hasilkan:
1 baris di Buku Utang, tercatat di Dana Kelolaan (`sumDebt('THIRD_PARTY')`
kalau ownership utang itu di-set non-SELF, atau tetap default SELF kalau
memang utang pribadi ke kenalan — pola sama semua utang lain), muncul
di daftar `Debt.renderList()`, ikut proyeksi `Debt.simulate()`/debt
optimizer. **Satu-satunya** yang G4 tambahkan di atas ini adalah:
otomasi (tidak perlu 2 modal terpisah) & tautan eksplisit
transaksi↔utang (utk delete-sync otomatis, badge di list transaksi,
dst) — BUKAN kapabilitas baru yg BELUM BISA dicapai sama sekali hari
ini.

---

## 5. REKOMENDASI

### 5.1 Rekomendasi utama: **JANGAN bangun otomasi G4 sekarang**
Alasan:
1. Kapabilitas intinya **sudah tersedia** lewat Buku Utang manual
   (§4) — 0 gap fungsional yang bikin user benar-benar stuck.
2. Permukaan integrasi (`saveTx()` ≥5 cabang + `delTx()` 9→10 blok,
   §3) jauh lebih luas & lebih rapuh dibanding 2 domain yg sudah py
   pola serupa (Investasi/Aset — titik akses tunggal, sedikit caller).
3. Konsisten dgn prinsip project yg sudah dipakai berulang kali di sesi
   lain (F3 di Sesi 501, opsional F2-B sebelum ada laporan nyata) —
   **"driven by laporan konkret, bukan cakupan lengkap di muka"**. Belum
   ada laporan pengguna yg bilang "saya kerepotan pakai 2 modal
   terpisah" — cuma rencana 4-sesi lama yang menyebut G4 tanpa detail
   use-case.

### 5.2 KALAU tetap mau dilanjutkan (keputusan produk, bukan teknis)
Kalau ke depan ada laporan nyata bhw alur 2-modal terasa merepotkan,
pecah jadi sub-sesi SANGAT kecil, HARUS berurutan (masing2 1 sesi 1 zip,
audit ulang scope-nya sebelum lanjut ke sub-sesi berikutnya — pola sama
migrasi Multi-Owner Sesi 406b→410 yg dipecah 4 sesi):

1. **C1 (paling kecil)** — HANYA cabang transaksi BARU + tunai (bukan
   edit, bukan cicilan/langganan/tagihan/utang existing). Tambah
   checkbox "Dibiayai dana titipan?" + dropdown nama (reuse
   `OwnerRegistry`, pola sama `titipanOwner`) di form Transaksi (khusus
   Pengeluaran, mirror `updateTxAssetWrapVisibility()` yg sudah
   Pemasukan-only). Simpan → 1 debt baru dgn `catatan` berisi id
   transaksi (bukan field baru `debtLinkId` dulu, biar TIDAK usah wiring
   `delTx()` sesi ini — trade-off: delete tidak auto-sync, user hapus
   manual, sama seperti resep manual §4 tapi 1 modal lebih sedikit).
2. **C2 (follow-up, kalau C1 dipakai nyata)** — tambah `debtLinkId` +
   wiring `delTx()` (blok ke-10, §3) supaya delete transaksi ikut
   menghapus/menyesuaikan debt — WAJIB audit ulang `delTx()` versi
   terbaru dulu (kemungkinan sudah berubah sejak audit ini).
3. **C3 (follow-up, opsional)** — perluas ke cabang edit generik (bukan
   cicilan/utang/tagihan — itu 3 cabang PALING rapuh, sengaja ditunda
   paling akhir/tidak sama sekali kalau C1/C2 sudah cukup).
4. **C4 (opsional)** — union ke tab Dana Titipan (`build()`) sbg source
   ke-3, pola sama Sesi B1 (`_asetOwnersForTitipan`-setara utk
   transaksi) — TAPI baru relevan kalau C1-C2 sudah jalan & user minta
   transaksi jenis ini ikut tampil di kartu owner.

**Constraint tiap sub-sesi**: 0 sentuhan ke cabang `cicilan`/
`langganan`/`utang`/`tagihan` existing di `saveTx()` sampai benar2
diperlukan (itu bagian PALING berisiko regresi, sesuai G1/G3) — kalau
demand nyata ternyata cuma butuh transaksi tunai baru (kasus paling
umum utk "titip beli barang"), C1 saja mungkin SUDAH CUKUP selamanya.

---

## 6. SARAN PRODUK (di luar keputusan teknis)

- **Jangka pendek**: dokumentasikan alur manual §4 di tempat yang
  user lihat (mis. tooltip singkat di tombol "+ Tambah Pemilik Titipan"
  tab Dana Titipan, atau FAQ) — 0 kode, langsung mengisi gap G4 tanpa
  menunggu sub-sesi apa pun.
- **Sebelum coding C1**: kalau ternyata demand nyata muncul, ukur dulu
  pola pemakaiannya (berapa sering user buka 2 modal terpisah utk kasus
  ini per bulan) — kalau jarang (mis. <1x/bulan), ROI otomasi rendah
  dibanding risiko regresi §3; kalau sering (mis. user memang rutin
  belanja pakai titipan orang tertentu), C1 sepadan.
- **Alternatif desain lebih murah** (kalau demand nyata tapi mau
  hindari nyentuh `saveTx()` sama sekali): tambah tombol pintasan
  "➕ Transaksi + Utang Titipan" TERPISAH dari form Transaksi biasa —
  1 aksi yg internal-nya memanggil `saveTx()` (apa adanya, 0 modifikasi)
  DIIKUTI `Debt.save()` (apa adanya, 0 modifikasi) terprogram —
  kombinasi 2 fungsi yg SUDAH ADA & SUDAH TERUJI, 0 field baru di
  `D.transactions`, 0 cabang baru di `saveTx()`/`delTx()`. Trade-off:
  edit/delete transaksi TIDAK auto-sync debt (sama seperti C1 §5.2),
  tapi risiko regresi mendekati NOL karena tidak menyentuh fungsi
  existing sama sekali — worth dipertimbangkan sbg alternatif C1 kalau
  demand nyata muncul.

---

## 7. KEPUTUSAN YANG PERLU DIKONFIRMASI USER

1. Setuju **tidak** membangun G4 sekarang (§5.1)? (rekomendasi audit ini)
2. Kalau tidak setuju — mulai dari C1 (§5.2) atau alternatif "tombol
   pintasan" (§6, risiko regresi lebih rendah)?
3. Perlu tooltip/FAQ dokumentasi alur manual §4 sekarang juga (0
   risiko, bisa jalan terlepas dari jawaban #1/#2)?

Sesi D (Kendaraan/Shop, opsional) tetap seperti keputusan sebelumnya —
tidak berubah oleh audit ini.
