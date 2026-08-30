# Sesi S666 — Wiring UI: toggle "Titipan / Milik Sendiri" di assetOwnersModal

## Konteks

Lanjutan fondasi S665 (`Aset.getOwnerSettlement()`/`setOwnerSettlement()`/
`assetsByOwnerSettlement()`, port dari `Investment.*` S660 ke domain
`D.assets[]`). Sesi ini menyambungkan fondasi itu ke UI: modal "⚖️ Atur
Porsi Kepemilikan" aset (`assetOwnersModal`) sekarang punya toggle per-baris
owner non-SELF, mirroring `InvestmentUI` (S661, `investasi-view.js`) 1:1 —
supaya user bisa menandai "rumah warisan ini memang milik istri sendiri"
langsung dari modal Buku Aset, sama seperti sudah bisa dilakukan di modal
Investasi sejak S661.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/aset-owners.js`
(`AssetOwnersMixin`). `modules/asset/aset.js` (inti Buku Aset) **TIDAK
disentuh**.

- `openOwnersModal()`: draft owner (cabang non-read-only, aset TIDAK
  tertaut ke Holding Investasi) sekarang bawa field `settlement`, dibaca
  dari `Aset.getOwnerSettlement(a, ownerId)` saat modal dibuka — bukan
  disintesis ulang, supaya toggle selalu mencerminkan status TERSIMPAN
  terakhir (`a.ownerSettlement`).
- `addOwnerRow()`: baris baru default `settlement:'titipan'` (konsisten
  dgn default fondasi S665).
- `_ownerSettlementFieldHtml(o,i)` (BARU) + dipanggil dari
  `_renderOwnersList()`: `<select>` 2 opsi ("🔒 Dana Titipan" / "✅ Milik
  Sendiri Pemilik Ini"), HANYA dirender utk baris non-SELF — ditempatkan
  tepat setelah checkbox "👤 Ini saya", sebelum indikator kuota titipan
  (`_ownerQuotaText`), pola tata-letak SAMA PERSIS `InvestmentUI.
  _renderOwnersList()`.
- `onOwnerSettlementChange(i,val)` (BARU): tulis pilihan ke draft saja
  (state murni, pola sama `onOwnerNameInput`/`onOwnerPorsiInput`), keduanya
  disisipkan tepat setelah `_renderOwnersList()` (sebelum
  `updateOwnersTotal()`).
- `saveOwners()`: SETELAH `Object.assign(a,{owners:res.entity.owners})`,
  panggil `Aset.setOwnerSettlement()` per owner non-SELF sesuai draft —
  Buku Utang otomatis ikut disinkron (0 rumus baru, delegasi penuh ke
  `TitipanSync.reconcile()`/`_syncOwnerDebts()` yang sudah dipanggil di
  dalam `setOwnerSettlement()` sejak S665). **Guard `typeof
  Aset.setOwnerSettlement === 'function'`** — beberapa test lama memasang
  stub `Aset` minimal tanpa method S665 ini; guard ini mencegah regresi di
  situ (modul aset-owners.js SUNGGUHAN selalu punya method ini sejak S665).
- Draft di-rebuild ulang setelah `saveOwners()` sukses (baris
  `Aset._ownersDraft=res.entity.owners.map(...)`) & di `resetOwners()`
  ikut membaca `Aset.getOwnerSettlement()` per baris — supaya modal yang
  masih terbuka setelah Simpan/Reset Draft langsung menampilkan status
  toggle terbaru, bukan status lama sebelum disimpan.

**Cabang read-only** (aset tertaut ke Holding Investasi,
`Aset._ownersReadOnly`) **TIDAK disentuh** — toggle ini tidak relevan di
sana krn porsi & settlement sungguhan diatur langsung di
`investmentOwnersModal` (S661), modal Aset cuma menampilkan ringkasan
baca-saja.

**0 UI filter sesi ini** (fondasi + modal saja, pola sama S660→S661) —
filter daftar Buku Aset berdasarkan owner+settlement jadi sesi lanjutan
terpisah (S667, pola S661→S662 tapi domain Aset), sesuai aturan "1 sesi 1
target" (`docs/SESSION_RULES.md`).

## Verifikasi

- `node -c modules/asset/aset-owners.js` — lolos.
- Test baru: `tests/s666-aset-owners-settlement-toggle-ui.test.js` (8 test:
  draft dimuat dari data tersimpan kasus "milik" & default "titipan", select
  cuma dirender di baris non-SELF, `onOwnerSettlementChange()` murni state,
  `saveOwners()` sinkron ke Buku Utang utk kedua status, `resetOwners()`
  memuat ulang settlement dari data tersimpan, `addOwnerRow()` default
  "titipan").
- Full suite (`node --test tests/*.test.js`): **4968/4968 pass** (4960
  sebelumnya + 8 baru, 0 regresi).
- Build (`node scripts/build.js`) sukses, versi naik ke **v1468**
  (`s625-fix-toast-menutupi-tombol-tab-investasi`, tag build ini sudah ada
  sebelum sesi S666 & tidak berubah — versi angka murni auto-increment
  internal `scripts/build.js`, tidak mencerminkan nomor sesi patch S660+).
- Release Gate: **lolos via override** — `eslint`/`esbuild` tidak tersedia
  di sandbox ini (tidak ada akses jaringan utk `npm install`), di-override
  manual lewat `CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  tercatat di `docs/RELEASE-GATE-LOG.md` (entri `2026-08-30T06:53:50.593Z`).
  Gate html-sync & version-sync lolos bersih (tanpa override).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation (Investasi) |
| `tests/s660-investasi-owner-settlement-bukan-titipan.test.js` | S660 | test |
| `docs/ZIP_RULES.md` | S660 | aturan Mode Patch ZIP |
| `SESSION-NOTE-S660.md` | S660 | catatan |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `tests/s661-investmentui-owner-settlement-toggle.test.js` | S661 | test |
| `SESSION-NOTE-S661.md` | S661 | catatan |
| `modules/asset/investasi-list-view.js` | S662, S663, S664 | filter owner+status, baris info ringkasan, badge jumlah |
| `tests/s662-investmentlistui-owner-settlement-filter.test.js` | S662 (assertion diupdate S664) | test |
| `SESSION-NOTE-S662.md` | S662 | catatan |
| `tests/s663-investmentlistui-summary-filter-note.test.js` | S663 | test |
| `SESSION-NOTE-S663.md` | S663 | catatan |
| `tests/s664-investmentlistui-filterbar-owner-count-badge.test.js` | S664 | test |
| `SESSION-NOTE-S664.md` | S664 | catatan |
| `modules/asset/aset-owners.js` | S665, S666 | owner settlement foundation (S665) + wiring UI toggle (S666) |
| `tests/s665-aset-owner-settlement-bukan-titipan.test.js` | S665 | test |
| `SESSION-NOTE-S665.md` | S665 | catatan |
| `tests/s666-aset-owners-settlement-toggle-ui.test.js` | S666 | test baru |
| `SESSION-NOTE-S666.md` | S666 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan — sesuai "1 sesi 1 target")

- **S667**: filter Owner+Status di daftar Buku Aset (`Aset.renderList()`,
  `aset.js`), pola sama `investasi-list-view.js` S662.
- **S668**: filter nyambung ke tab Dana Titipan (`DanaTitipanPortfolioPresenter`).
- **S669**: multi-select owner di Investasi.
