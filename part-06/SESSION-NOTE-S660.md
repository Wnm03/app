# Sesi S660 — Fondasi "Kepemilikan Bukan Titipan" + aturan Patch ZIP

## Konteks

Laporan user: holding investasi yang dimiliki keluarga (mis. emas milik
istri sendiri) selalu otomatis dianggap "titipan" oleh
`Investment.setOwners()`/`_syncTitipanDebt()` begitu ada owner non-SELF —
padahal seharusnya bisa dibedakan: **pemilik sungguhan** (tidak ada
kewajiban dikembalikan, TIDAK boleh masuk Buku Utang) vs **dana titipan**
(ada kewajiban, masuk Buku Utang, perilaku existing tetap dipertahankan).

User juga eksplisit minta aturan baru: 1 sesi = 1 file source, ZIP hasil
sesi cukup berisi file yang berubah (bukan seluruh project), TAPI
akumulatif — tidak boleh kehilangan perbaikan sesi patch sebelumnya.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan baru): `modules/asset/investasi.js`.

- `Investment.getOwnerSettlement(h, ownerId)` — baca status owner:
  `'titipan'` (default, 0 perubahan data lama) atau `'milik'`.
- `Investment.setOwnerSettlement(id, ownerId, settlement)` — tulis status
  ke `h.ownerSettlement` (map BARU, field aditif, TIDAK menyentuh skema
  `h.owners`/MultiOwnerEngine sama sekali), lalu resync Buku Utang.
- `Investment.holdingsByOwnerSettlement(ownerId, settlement)` — query
  murni: jawaban konkret kebutuhan "filter kepemilikan Istri yang BUKAN
  titipan" (`holdingsByOwnerSettlement(istriId, 'milik')`).
- `_syncTitipanDebt()` direvisi: owner dengan `settlement==='milik'`
  dikecualikan dari sinkronisasi entry Buku Utang (entry lama ikut
  dihapus otomatis lewat mekanisme `keepIds` yang sudah ada — 0 fungsi
  baru di titik itu).

**0 wiring UI sesi ini** (fondasi saja, pola "1 task = 1 sesi" project
ini) — dropdown "Titipan / Milik Sendiri" di `investmentOwnersModal` &
filter di list view jadi sesi lanjutan eksplisit.

## Verifikasi

- `node -c modules/asset/investasi.js` — lolos.
- Test baru: `tests/s660-investasi-owner-settlement-bukan-titipan.test.js`
  (6 test, termasuk skenario persis dari laporan user: emas istri
  `settlement='milik'` → 0 entry Buku Utang, tetap muncul di
  `holdingsByOwnerSettlement(istriId,'milik')`; multi-owner campuran
  milik+titipan; toggle balik ke titipan). Semua pass.
- Full suite (`node --test tests/*.test.js`): **4920/4920 pass**
  sebelum perubahan (baseline) — dijalankan lagi setelah menambah 6 test
  baru, semua tetap pass, 0 regresi ke test lama (khususnya
  `s462-investasi-multi-owner-titipan.test.js`,
  `s460-investment-titipan-debt-linked-id.test.js`,
  `asset-titipan.test.js` — semua 100% pass tanpa modifikasi).

## Aturan baru: Mode Patch ZIP (`docs/ZIP_RULES.md`)

Ditambahkan section "Mode PATCH ZIP" — dipakai kalau user eksplisit minta
mode ini: 1 sesi = 1 file source, ZIP hanya berisi file yang berubah
(bukan seluruh working directory), **akumulatif** (daftar file yang
sudah dipatch di sesi-sesi patch berjalan tetap disertakan tiap ZIP
baru), Release Gate & full test tetap wajib, prefix nama file
`kw_patch_sesi<N>_...` (beda dari `kw_release_...`).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation |
| `tests/s660-investasi-owner-settlement-bukan-titipan.test.js` | S660 | test baru |
| `docs/ZIP_RULES.md` | S660 | aturan Mode Patch ZIP |
| `SESSION-NOTE-S660.md` | S660 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris
di atas — inilah mekanisme "akumulasi tanpa kehilangan perbaikan
sebelumnya" yang diminta user.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan)

- Wiring UI: dropdown "Titipan / Milik Sendiri" per-owner di
  `investmentOwnersModal` (asset/modals.js, asset/aset-owners.js).
- Filter UI di daftar investasi/portfolio berdasarkan owner + settlement.
- Field sejenis untuk `D.assets[]` (Buku Aset) kalau dibutuhkan pola yang
  sama di luar Investasi.
