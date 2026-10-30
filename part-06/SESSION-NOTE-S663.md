# Sesi S663 — Ringkasan portofolio ikut menunjukkan info filter (owner+settlement)

## Konteks

Lanjutan eksplisit dari daftar "Ide lanjutan yang relevan" yang diberikan user
setelah S662 selesai, poin 1 (kategori "Ringan, sesi kecil"):

> **Ringkasan ikut ter-filter** — sekarang `_renderSummary()` (kartu total
> nilai/gain) selalu hitung dari SEMUA holding, walau list di bawahnya sudah
> difilter. Bisa ditambah baris kecil "Menampilkan: 3 dari 8 holding (Rp X)"
> biar user tahu ringkasan atas ≠ hasil filter di bawah.

Keputusan desain (SESUAI permintaan user, bukan interpretasi bebas): kartu
ringkasan utama (`investSummaryValue`/`investSummaryCost`/`investSummaryGain`/
dst, dari `Investment.portfolioSummary()`) **TETAP dihitung dari SEMUA
holding** — TIDAK diubah jadi ikut terfilter. Yang ditambahkan cuma baris info
kecil di bawahnya, bukan mengganti perilaku kartu ringkasan itu sendiri
(permintaan aslinya eksplisit bilang "biar user tahu ringkasan atas ≠ hasil
filter di bawah" — jadi keduanya SENGAJA dibiarkan beda, dengan baris info
sebagai jembatan penjelasnya).

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/investasi-list-view.js`
(`InvestmentListUI`) — file yang sama dengan S662 (filter bar owner+status),
karena fitur ini murni lanjutan langsung dari state filter (`filterOwnerId`/
`filterSettlement`) yang sudah ada di file itu. `modules/asset/investasi.js`
(fondasi S660) **TIDAK disentuh** — reuse penuh `Investment.getHoldings()`/
`Investment.holdingValue()`/`Investment.portfolioSummary()` yang sudah ada,
0 rumus baru.

- **`#investSummaryFilterNote` (elemen BARU, dibuat dinamis)** — baris kecil
  `u-fs11 u-t2 u-mt4` tepat di bawah `#investSummaryMeta`, isinya
  `"Menampilkan: X dari Y holding (Rp Z)"` saat `InvestmentListUI.filterOwnerId`
  aktif, dikosongkan lagi (`textContent = ''`) saat filter dikembalikan ke
  "Semua Pemilik". Dibuat & disisipkan lewat `insertAdjacentElement('afterend',
  ...)` — pola **SAMA PERSIS** `InvestmentUI._renderRebalancePanel()`
  (`investasi-view.js`, S-lama): dibuat sekali di render pertama, dipakai
  ulang (bukan dibuat ulang) di render berikutnya. Dipilih pola ini secara
  sengaja supaya **TIDAK perlu menyentuh `index.html` sama sekali** — sesi ini
  tetap 1 file source sesuai Mode PATCH ZIP.
- **`_renderSummary()` (diedit)** — di akhir fungsi (setelah blok
  `investSummaryYield` yang sudah ada), tambah blok baru yang: (1) pastikan
  `#investSummaryFilterNote` ada (`getElementById` dulu, `createElement` kalau
  belum ada, dibungkus `if (metaBox)` supaya konsisten dgn guard elemen lain
  di fungsi ini); (2) kalau `filterOwnerId` kosong -> kosongkan teksnya; (3)
  kalau terisi -> ambil `Investment.getHoldings()`, filter pakai
  `InvestmentListUI._holdingMatchesFilter` (predicate S662, REUSE 100%, 0
  duplikasi logic filter), jumlah `Investment.holdingValue(h)` PER holding yg
  lolos (dibungkus try/catch per-holding, pola sama `_renderList()` — 1
  holding korup dilewati dari total Rp tapi TIDAK menjatuhkan seluruh
  `_renderSummary()`, dan tetap ikut dihitung ke jumlah/count "X dari Y").
- **`onFilterOwnerChange(val)` / `onFilterSettlementChange(val)` (diedit)** —
  sekarang juga panggil `InvestmentListUI._renderSummary()` (sebelumnya cuma
  `_renderList()`) supaya baris info di atas ikut update LIVE begitu user
  ganti dropdown filter, bukan basi menunggu render berikutnya. Kartu
  ringkasan utama tetap tidak berubah nilainya (`portfolioSummary()` tidak
  disentuh) — cuma dipanggil ulang supaya baris info-nya sinkron.

**0 perubahan skema/field baru di `investasi.js`, 0 perubahan `index.html`.**

## Verifikasi

- `node -c modules/asset/investasi-list-view.js` — lolos.
- Test baru: `tests/s663-investmentlistui-summary-filter-note.test.js` (7
  test: filter tidak aktif -> baris info kosong; filter owner aktif -> baris
  info "X dari Y holding (Rp Z)" muncul dgn angka benar; kartu ringkasan
  utama TETAP dari `portfolioSummary()` apa adanya walau filter aktif; ganti
  filter ke owner lain -> baris info ikut update live; balik ke "Semua
  Pemilik" -> baris info dikosongkan lagi; filter owner+status bareng ->
  total baris info cuma dari holding yg cocok KEDUA filter; 1 holding korup
  (`holdingValue()` throw) tidak menjatuhkan `_renderSummary()`, dilewati
  dari total Rp tapi tetap ikut ke count).
- Full suite (`node --test tests/*.test.js`): **4948/4948 pass** (4941
  sebelumnya + 7 baru sesi ini, 0 gagal, 0 regresi).
- Release Gate (`node scripts/verify-release-ready.js`): lint & minifikasi
  di-override (environment sandbox tanpa akses jaringan, eslint/esbuild
  tidak terpasang — override tercatat di `docs/RELEASE-GATE-LOG.md`);
  html-sync & version-sync lolos normal (0 perubahan `index.html` sesi ini).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation |
| `tests/s660-investasi-owner-settlement-bukan-titipan.test.js` | S660 | test |
| `docs/ZIP_RULES.md` | S660 | aturan Mode Patch ZIP |
| `SESSION-NOTE-S660.md` | S660 | catatan sesi S660 |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `tests/s661-investmentui-owner-settlement-toggle.test.js` | S661 | test baru |
| `SESSION-NOTE-S661.md` | S661 | catatan sesi S661 |
| `modules/asset/investasi-list-view.js` | S662, diupdate lagi S663 | S662: filter daftar investasi owner+settlement. S663: + baris info ringkasan ikut filter |
| `tests/s662-investmentlistui-owner-settlement-filter.test.js` | S662 | test baru |
| `SESSION-NOTE-S662.md` | S662 | catatan sesi S662 |
| `tests/s663-investmentlistui-summary-filter-note.test.js` | S663 | test baru |
| `SESSION-NOTE-S663.md` | S663 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan)

Sisa ide dari daftar "Ide lanjutan" user yang belum dikerjakan (independen,
tidak saling blocking, lihat pesan user pasca-S662):

- **Badge jumlah di opsi dropdown owner** (mis. "Istri (3 holding)") — belum
  dikerjakan sesi ini, kandidat sesi ringan berikutnya.
- **Pola sama ke `D.assets[]` (Buku Aset)** — sudah dicatat sejak S660,
  masih tertunda.
- **Filter nyambung ke Dana Titipan tab** (grup custodian S540 &
  `DanaTitipanPortfolioPresenter`) — belum tersambung ke `ownerSettlement`.
- **Multi-select owner** (bukan cuma 1 pemilik sekaligus) — belum
  dikerjakan, butuh desain state UI terpisah dari `filterOwnerId` tunggal
  yang ada sekarang.
