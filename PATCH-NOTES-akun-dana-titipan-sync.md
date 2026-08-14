# Patch: Audit + Cabang "Akun" pada TitipanReconcile (Sinkron Akun & Metode Pembayaran ↔ Dana Titipan)

## File yang diubah/ditambah
- `modules/finance/titipan-reconcile.js` (diubah — tambah fungsi baru, 0 fungsi lama diubah perilakunya)
- `tests/titipan-reconcile.test.js` (diubah — tambah test baru utk fungsi baru + `accounts` di helper)
- `self-test.js` (diubah — 1 baris pesan diperkaya, assertion-nya sendiri tidak diubah)

Tidak ada file lain yang disentuh. Diverifikasi: seluruh 4274 test di `tests/*.test.js` PASS dengan
file-file yang sudah dipatch, 0 regresi.

---

## 1. AUDIT (temuan)

Kamu minta akun di halaman "🏦 Akun & Metode Pembayaran" (Cash, BRI, Gopay, Seabank, dst) ikut
disinkronkan ke Dana Titipan, sama seperti fitur yang sudah jalan untuk transaksi (in/out ->
sync ke Dana Titipan, riwayat transaksi, pilih "potong pemilik"). Setelah baca kode:

- **Aset** (`aset.js`) dan **Investasi** (`investasi.js`) — begitu kamu set porsi kepemilikan
  non-SELF di sana, `_syncOwnerDebts()`/`_syncTitipanDebt()` OTOMATIS bikin baris di Buku Utang
  (`D.debts`, ber-`linkedAssetId`/`linkedInvestmentId`) — itu yang muncul di tab Dana Titipan.
  `TitipanReconcile.check()` juga sudah mengaudit cabang ini (bandingkan "harusnya ada" vs
  "tercatat"), jadi kalau ada titik simpan yang lupa sync, ketahuan otomatis.

- **Akun** (`akun.js`, modal "⚖️ Porsi Kepemilikan" per kartu akun, fitur S574) — kamu BISA set
  porsi kepemilikan non-SELF di sini juga. TAPI: `AccOwners.save()` cuma sinkron ke Buku Utang
  kalau akun itu **tertaut ke sebuah Aset** (`a.accountId === akun.id`) — porsinya disamakan ke
  Aset tertaut lalu Aset itu yang sync. Untuk akun **berdiri sendiri** (spt Cash/BRI/Gopay/Seabank
  di screenshot kamu, tidak tertaut Aset apa pun), porsi kepemilikan TERSIMPAN di akun (dan
  muncul di modal itu sendiri) tapi **TIDAK PERNAH** membuat baris Buku Utang / tidak pernah
  masuk hitungan Dana Titipan — beda dari Aset/Investasi.

- `TitipanReconcile.check()` (audit yang sudah ada) juga **tidak mengecek cabang Akun sama
  sekali** — jadi gap di atas bahkan tidak ketahuan lewat "Tes Otomatis", murni ketemu lewat baca
  kode manual sesi ini.

**Kesimpulan audit:** ada 1 gap nyata — porsi kepemilikan (titipan) di akun berdiri-sendiri
"bocor" secara diam-diam (tersimpan tapi tidak pernah tercermin di Dana Titipan/Buku Utang), dan
sebelum patch ini, tidak ada mekanisme apa pun (bahkan audit) yang mendeteksinya.

Catatan lain di luar scope gap ini (FYI, bukan bagian temuan utama): fitur "pilih potong pemilik"
(`deductionOwnerId`) dan sinkron transaksi in/out yang kamu sebut **sudah berjalan** — itu
`resolveTxOwnerSplitForAccount`/`applyTxTitipanLinkageOnSave` (`transaksi.js`), tetap dipakai apa
adanya, tidak disentuh sesi ini.

---

## 2. REKOMENDASI (3 opsi, dari yang paling aman)

1. **[DIKERJAKAN SESI INI] Audit cabang Akun** — tambah `TitipanReconcile.checkAccounts()`, pure
   read-only, wired ke `checkAll()`/"Tes Otomatis", supaya gap di atas langsung KETAHUAN (nama
   akun + owner yang porsinya "menggantung"), tanpa risiko apa pun ke data/alur tulis. Ini persis
   pola yang proyek ini sudah pakai berkali-kali (Rec #2/#3 di sesi-sesi S583 sebelumnya): audit
   dulu sebelum enforcement/fix, supaya gap kelihatan by design, bukan diam-diam "diperbaiki"
   dengan asumsi yang belum tentu benar.

2. **[BELUM, risiko sedang-tinggi]** Bikin baris Buku Utang bernilai NOMINAL untuk akun
   berdiri-sendiri (`linkedAccountId`), disinkron ulang tiap kali saldo akun berubah (setiap
   transaksi masuk/keluar di akun itu — bukan cuma saat porsi diedit, beda dari Aset/Investasi
   yang nilainya stabil sampai diedit manual). Perlu keputusan desain eksplisit dulu: berapa
   sering re-sync (tiap transaksi = banyak titik tulis baru, mirip 5 titik `_syncOwnerDebts()`
   yang sudah diaudit di `titipan-sync.js`), dan apakah nominalnya berdasar saldo saat ini atau
   snapshot. Kalau nanti mau dikerjakan, gerbang `TitipanSync.reconcile()` yang sudah disiapkan
   (sesi 10a, `titipan-sync.js`) adalah titik yang tepat untuk dikembangkan/diperluas.

3. **[BELUM, risiko rendah tapi kosmetik]** Tambah indikator visual di kartu akun (halaman
   screenshot kamu) untuk akun yang porsi-nya "menggantung" (hasil `checkAccounts().missing`),
   mis. badge "⚠️ Porsi titipan belum sinkron ke Dana Titipan" — murni UI, baca hasil audit #1,
   tidak menulis apa pun ke `D`.

---

## 3. YANG DIIMPLEMENTASIKAN SESI INI: Rekomendasi #1

`modules/finance/titipan-reconcile.js` — tambah 3 fungsi baru (0 fungsi lama diubah):

- `_expectedFromAccounts()` — akun berdiri-sendiri (bukan tertaut Aset) dengan owner non-SELF
  porsi>0 → `{accId::ownerId: true}`. **Presence-only** (bukan nominal Rp) karena saldo akun
  berubah tiap transaksi (beda dari `nilai` Aset/`holdingCost` Investasi yang stabil) — bandingkan
  nominal di sini akan menghasilkan "mismatch" palsu tiap ada transaksi baru.
- `_actualLinkedAccountDebts()` — baris `D.debts` ber-`linkedAccountId` (saat ini SELALU kosong,
  karena belum ada satu pun titik tulis yang mengisi field ini — disiapkan simetris utk Rec #2
  nanti).
- `checkAccounts()` — bandingkan keduanya, `{ok, missing[], orphan[]}`, pola sama `check()`.

`checkAll()` — sekarang menyertakan `accountSync` sbg sub-check ke-4 (`ok` = AND dari 4 sub-check,
sebelumnya 3).

**Efek samping yang perlu kamu tahu:** begitu patch ini aktif, kalau kamu SUDAH pernah set porsi
kepemilikan non-SELF di akun berdiri-sendiri manapun, "Tes Otomatis" (Pengaturan > Diagnostik)
akan mulai melaporkan gap ini (`accountSync.missing`). Ini **bukan bug baru** — gap-nya sudah ada
dari dulu, cuma sekarang baru KETAHUAN. Tidak ada data yang berubah, tidak ada simpan yang
ditolak (`AccOwners.save()` tidak disentuh sama sekali) — murni informasi baru di layar
diagnostik/`console.warn`.

## 4. Cara verifikasi
```
node --test tests/titipan-reconcile.test.js       # 40/40 pass
node --test tests/akun-titipan-gap-badge.test.js  # 5/5 pass (badge baru sesi ini)
node --test tests/*.test.js                       # 4279/4279 pass, 0 regresi
```

---

## 5. SESI LANJUTAN (2026-08-14, lanjutan #2) — Rekomendasi #3 diimplementasikan

File tambahan yang diubah:
- `modules/shared/modules-render.js` (diubah — `renderAccGrid()` saja yang disentuh)
- `tests/akun-titipan-gap-badge.test.js` (baru — 5 test)

### Apa yang ditambahkan
Kartu akun di halaman "🏦 Akun & Metode Pembayaran" sekarang menampilkan badge peringatan
**"⚠️ Porsi titipan belum sinkron ke Dana Titipan"** untuk akun **berdiri sendiri** (bukan
tertaut Aset/Holding — akun tertaut sudah otomatis sync lewat cabang lain) yang punya porsi
kepemilikan non-SELF tapi belum ada baris Buku Utang/Dana Titipan sama sekali — persis gap yang
dideteksi `TitipanReconcile.checkAccounts()` (bagian #1 di atas).

- **100% REUSE** `TitipanReconcile.checkAccounts()` — 0 logic gap dihitung ulang di
  `modules-render.js`. Dihitung SEKALI per render (bukan per-kartu) lalu dicocokkan ke tiap akun
  lewat `Set` id akun yang punya gap.
- **Murni informasi** — 0 tombol/aksi baru, 0 mutasi ke `D`, tidak mengubah cara kerja modal
  "⚖️ Porsi Kepemilikan" (`AccOwners.save()`) sama sekali.
- **Guard `typeof TitipanReconcile`** — kalau `titipan-reconcile.js` kebetulan belum dimuat di
  suatu halaman, fallback ke `Set` kosong (0 badge tampil), tidak error.
- Sekarang kamu bisa langsung LIHAT dari halaman Akun mana saja yang porsinya "menggantung",
  tanpa harus buka Tes Otomatis di Pengaturan > Diagnostik dulu.

Diverifikasi: 4279/4279 test PASS (4274 sebelumnya + 5 test baru khusus badge ini), 0 regresi.

### Yang masih di luar scope (Rekomendasi #2, belum dikerjakan)
Badge ini murni memberi tahu — belum ada cara 1-tap dari kartu Akun utk benar-benar "memperbaiki"
gap-nya (bikin baris Buku Utang bernominal). Itu tetap Rekomendasi #2 (risiko sedang-tinggi,
perlu desain sinkron nominal terpisah karena saldo akun berubah tiap transaksi), sengaja ditunda
ke sesi terpisah.

---

## 6. SESI LANJUTAN (2026-08-14, lanjutan #3) — Rekomendasi #2 diimplementasikan

File tambahan yang diubah — lihat `CHANGELOG-sesi-lanjutan-akun-titipan-sync-rec2.md` utk detail
lengkap:
- `modules/finance/titipan-sync.js` (tambah `TitipanSync.reconcileAccounts()`)
- `modules/shared/features-helpers-global-security.js` (1 baris wiring di `save()`)
- `modules/finance/titipan-reconcile.js` (komentar saja, 0 logic)
- `tests/titipan-sync.test.js` (+10 test)

**Keputusan desain** (ditanya eksplisit ke user sebelum implementasi):
1. Nominal = saldo akun **saat ini**, real-time (bukan snapshot dikunci saat porsi diedit).
2. Re-sync dijalankan tiap transaksi masuk/keluar — direalisasikan lewat gerbang tunggal `save()`
   (titik yang sama dipakai `syncLinkedAssetNilaiFromAkun()`), 0 titik panggil baru di
   `transaksi.js`/`akun.js`.

Gap "porsi tersimpan di akun tapi tidak pernah masuk hitungan Dana Titipan" (§1 di atas) sekarang
TERTUTUP, bukan cuma terdeteksi (Rec #1)/terlihat (Rec #3). `checkAccounts()` akan mulai `ok:true`
& badge "⚠️" akan otomatis hilang begitu `save()` berikutnya jalan utk akun yang tersinkron.

Diverifikasi: `node --test tests/titipan-sync.test.js` 17/17 pass, `node --test tests/*.test.js`
4289/4289 pass, 0 regresi.
