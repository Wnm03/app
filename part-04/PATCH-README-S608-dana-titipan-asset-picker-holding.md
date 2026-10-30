# Patch S608 — Dropdown "Pilih Aset" (Dana Titipan) sekarang menampilkan Holding Investasi juga

## Laporan user
Dropdown "Pilih Aset" di kartu Dana Titipan (tombol "⚖️ Atur Porsi Aset") cuma
menampilkan entri Buku Aset (mis. "vario 125 kzr", "Vario 110"). Holding
Investasi (Majoris, bibit, dll — yang muncul di "Total Teralokasi" di bawahnya)
tidak pernah muncul sebagai opsi, padahal user perlu atur porsi Holding juga
lewat dropdown yang sama.

## Root cause
`DanaTitipanPortfolioPresenter._assetOptionsHtml()`
(`modules/finance/dana-titipan-portfolio-render.js`) SATU-SATUNYA sumber opsi
dropdown ini, dan sejak awal cuma baca `D.assets` (Buku Aset). `D.investments`
(SSOT Holding sejak s476b) tidak pernah diikutkan.

## Fix (additive, 0 logic lama diubah)
1. `_assetOptionsHtml()` — opsi Holding (`D.investments`) ditambahkan SETELAH
   opsi Buku Aset. Value diberi prefix `h:` (mis. `h:h1`), label pakai ikon 📈
   + nama custodian kalau ada, supaya beda jelas dari opsi Buku Aset (yang
   tetap tanpa prefix, 0 breaking change).
2. `DanaTitipanCommitmentUI.openAssetPorsi()` — kalau value dropdown berprefix
   `h:`, route ke `InvestmentUI.openOwnersModal(id)` (modal Atur Porsi Holding
   yang sudah ada) alih-alih `Aset.openOwnersModalById()` (khusus Buku Aset).
3. `_holdingRowHtml()` — atribut `data-linked-asset-id` sekarang juga diisi
   `h:<linkedInvestmentId>` untuk baris Holding, supaya highlight
   `onAssetPickChange()` tetap bisa menyorot baris yang cocok saat user pilih
   opsi Holding di dropdown (sebelumnya cuma jalan untuk baris Aset tertaut).

## Test
- Update `tests/dana-titipan-asset-picker-ghost-asset-s599.test.js`: 2 test
  lama disesuaikan (ghost Buku Aset tetap tersembunyi, tapi Holding aslinya
  sekarang BOLEH muncul — sebelumnya assert generik "tidak boleh ada string
  X sama sekali", sekarang dicek tepat via `value="h:h1"` vs `value="a1"`).
- Baru `tests/dana-titipan-asset-picker-holding-option-s608.test.js` (3 test):
  opsi Holding muncul dengan prefix benar, routing `openAssetPorsi()` ke
  `InvestmentUI` untuk opsi Holding, dan regresi routing Buku Aset tetap ke
  `Aset.openOwnersModalById()`.

**Hasil `node --test tests/*.test.js`: 4245/4245 pass, 0 fail.**
**`node scripts/build.js`: sukses, versi naik ke v1340, sintaks bundle valid.**

## File yang berubah (upload SEMUA, bukan cuma yang "logic")
- `modules/finance/dana-titipan-portfolio-render.js` (fix inti)
- `tests/dana-titipan-asset-picker-ghost-asset-s599.test.js` (update assert)
- `tests/dana-titipan-asset-picker-holding-option-s608.test.js` (test baru)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (hasil build ulang)
- `index.html`, `app_production.html`, `sw.js` (versi ?v= & cache name naik ke 1340)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi otomatis oleh build.js)

## Catatan tentang dropdown "Pilih Pemilik" (input transaksi)
Diaudit juga — dropdown ini (`txDeductionOwner`) **sudah benar** sejak sesi
S601-3: kalau akun ditautkan ke Holding lewat `investAccId`, porsi owner
dibaca LIVE dari Holding (`Investment.getOwners()`). Yang tampil di screenshot
cuma "Milik Sendiri" karena akun tsb memang cuma py 1 owner — bukan bug, jadi
TIDAK disentuh di patch ini.
