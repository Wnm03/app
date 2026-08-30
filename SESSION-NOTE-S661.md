# Sesi S661 — Wiring UI: toggle "Titipan / Milik Sendiri" di investmentOwnersModal

## Konteks

Lanjutan fondasi S660 (`Investment.getOwnerSettlement()`/
`setOwnerSettlement()`/`holdingsByOwnerSettlement()`). Sesi ini
menyambungkan fondasi itu ke UI: modal "⚖️ Atur Porsi Kepemilikan" holding
investasi (`investmentOwnersModal`) sekarang punya toggle per-baris owner
non-SELF, supaya user bisa menandai "emas ini memang milik istri sendiri"
tanpa lewat DevTools/console.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/investasi-view.js`
(`InvestmentUI`). `modules/asset/investasi.js` (fondasi S660) TIDAK
disentuh lagi sesi ini — reuse penuh API yang sudah ada.

- `openOwnersModal()` / `resetOwners()`: draft owner sekarang bawa field
  `settlement`, dibaca dari `Investment.getOwnerSettlement(h, ownerId)`
  saat modal dibuka/direset (bukan disintesis ulang).
- `addOwnerRow()`: baris baru default `settlement:'titipan'` (konsisten
  dgn default fondasi S660).
- `_ownerSettlementFieldHtml(o,i)` (BARU) + dipanggil dari
  `_renderOwnersList()`: `<select>` 2 opsi ("🔒 Dana Titipan" / "✅ Milik
  Sendiri Pemilik Ini"), HANYA dirender utk baris non-SELF (pemilik "saya"
  tidak relevan).
- `onOwnerSettlementChange(i,val)` (BARU): tulis pilihan ke draft saja
  (state murni, sama pola `onOwnerNameInput`/`onOwnerPorsiInput`).
- `saveOwners()`: SETELAH `Investment.setOwners()` sukses, panggil
  `Investment.setOwnerSettlement()` per owner non-SELF sesuai draft — jadi
  Buku Utang otomatis ikut disinkron (0 rumus baru, delegasi penuh ke
  `_syncTitipanDebt()` yang sudah ada). **Guard `typeof
  Investment.setOwnerSettlement === 'function'`** — beberapa test lama
  (S585/S607/rebalance-porsi-pemilik) memasang stub `Investment` minimal
  tanpa method S660 ini; guard ini mencegah regresi di situ (modul
  investasi.js SUNGGUHAN selalu punya method ini sejak S660).

**0 perubahan skema/field baru di `investasi.js`** — murni pemakaian API
yang sudah difondasikan sesi lalu.

**Belum dikerjakan sesi ini** (sesuai lingkup "toggle modal" saja):
filter di daftar investasi/portfolio berdasarkan owner+settlement (mis.
tombol "Tampilkan: Milik Istri, bukan Titipan" di list view) — jadi sesi
lanjutan terpisah (1 file lain: `investasi-list-view.js` atau
`asset-portfolio-presenter.js`).

## Verifikasi

- `node -c modules/asset/investasi-view.js` — lolos.
- Test baru: `tests/s661-investmentui-owner-settlement-toggle.test.js` (7
  test: draft dimuat dari data tersimpan, default toleran, select cuma di
  baris non-SELF, onChange murni state, saveOwners sinkron ke Buku Utang
  utk kedua status, dan guard stub tanpa method S660 tidak throw).
- Ditemukan **5 test lama gagal** (`Investment.setOwnerSettlement is not a
  function`) saat pertama kali wiring `saveOwners()` tanpa guard —
  diperbaiki dgn `typeof` guard di atas, lalu 225 test terkait
  `InvestmentUI` semuanya pass lagi (0 regresi akhir).
- Full suite (`node --test tests/*.test.js`): **4933/4933 pass**
  (4926 sebelumnya + 7 baru sesi ini, 0 gagal).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation |
| `tests/s660-investasi-owner-settlement-bukan-titipan.test.js` | S660 | test |
| `docs/ZIP_RULES.md` | S660 | aturan Mode Patch ZIP |
| `SESSION-NOTE-S660.md` | S660 | catatan sesi S660 |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `tests/s661-investmentui-owner-settlement-toggle.test.js` | S661 | test baru |
| `SESSION-NOTE-S661.md` | S661 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan)

- Filter UI di daftar investasi/portfolio berdasarkan owner + settlement.
- Field sejenis untuk `D.assets[]` (Buku Aset) kalau dibutuhkan pola yang
  sama di luar Investasi.
