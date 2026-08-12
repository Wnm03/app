# AUDIT-S572 — Duplicate Source & Stale State pada `#txAcc`

## Ringkasan

Dropdown "Akun / Metode" (`#txAcc`, modal `txModal`) di HTML **LIVE**
(`modules/shared/modals.js`, satu-satunya sumber `modals.js` yang
direferensikan `scripts/build.js`) masih memakai wiring lama:

```html
<select ... id="txAcc" onchange="_txAccManuallySet=true"></select>
```

Wiring ini **hanya** menandai flag `_txAccManuallySet=true` (dipakai
`applyLastAccForCat()` supaya tidak menimpa pilihan akun manual user).
Padahal `onTxAccChange()` (`modules/finance/transaksi.js`) sejak beberapa
sesi lalu sudah bertanggung jawab **juga** untuk:

- `updateTxAssetWrapVisibility()` — visibilitas & isi dropdown "Kaitkan ke
  Aset Multi-Owner" (`#txAssetId`) sesuai akun yang dipilih.
- `updateTxOwnerPorsiOptions()` — visibilitas & isi dropdown "Porsi Pemilik
  (akun patungan)" (`#txOwnerPorsi`).
- `updateTxAssetSplitPreview()` — live preview pembagian porsi
  (`#txAssetSplitPreview`).

Karena HTML LIVE tidak pernah memanggil `onTxAccChange()`, ketiga blok di
atas **tidak ikut refresh** tiap kali user mengganti akun di `#txAcc` —
**STALE STATE**: form terus menampilkan data aset/porsi milik akun
SEBELUMNYA walau akun sudah berpindah (mis. dari akun biasa ke akun
patungan/multi-owner, atau sebaliknya).

## Root Cause

Gap antara HTML (sumber wiring `onchange`) dan JS (`onTxAccChange()`) yang
sudah berkembang lebih jauh dari HTML-nya — pola drift klasik saat sebuah
handler diperluas tanggung jawabnya (dari sekadar set flag menjadi juga
sinkronisasi UI lintas-dropdown) tapi titik pemanggilannya di markup lupa
diperbarui mengikuti.

## Fix

**File diubah:** `modules/shared/modals.js` (SATU-satunya `modals.js` yang
dibundel `scripts/build.js` — lihat bagian "Duplicate Source" di bawah).

```diff
- <select class="fs" id="txAcc" onchange="_txAccManuallySet=true"></select>
+ <select class="fs" id="txAcc" onchange="onTxAccChange()"></select>
```

`onTxAccChange()` sendiri baris pertamanya tetap `_txAccManuallySet=true`
(lihat `modules/finance/transaksi.js`), jadi **0 regresi** pada perilaku
lama — fix ini murni menutup gap sinkronisasi, tidak mengubah semantik flag
manual yang sudah ada.

## Duplicate Source — Risiko Terdokumentasi (TIDAK diubah)

Audit menemukan **3 file duplikat/orphan** yang berisi salinan lama dari
logika yang sama, tapi **tidak direferensikan `scripts/build.js`** sama
sekali (dikonfirmasi lewat `grep -n "modals.js\|transaksi.js" scripts/build.js`
— hanya `modules/shared/modals.js` dan `modules/finance/transaksi.js` yang
muncul sebagai path sumber bundel):

| File | Status | Catatan |
|---|---|---|
| `modules/modals.js` | Dead/orphan | Tidak direferensikan build. Kebetulan sudah berisi `onTxAccChange()` di baris `#txAcc`-nya sendiri (independen dari patch ini) — **tidak disentuh** sesi ini. |
| `modules/shop/modals.js` | Dead/orphan | Tidak direferensikan build. Masih berisi wiring LAMA `_txAccManuallySet=true` — **tidak disentuh**, diverifikasi lewat regression test S572 sebagai bukti eksplisit. |
| `finance/transaksi.js` (root, bukan `modules/finance/transaksi.js`) | Dead/orphan | Tidak direferensikan build. Berisi salinan lama `onTxAccChange()`/`jsAttrEscape()`/dst dari `modules/finance/transaksi.js` — **tidak disentuh**. |

**Risiko yang perlu diwaspadai ke depan:** selama file-file duplikat ini
tetap ada di repo, ada risiko developer masa depan (manusia atau AI)
salah mengedit salinan yang tidak live, mengira perubahan sudah berlaku
padahal `scripts/build.js` tidak pernah membacanya. Rekomendasi jangka
panjang (di luar cakupan sesi ini): hapus/arsipkan ketiga file orphan
setelah dikonfirmasi tidak ada referensi lain (mis. dokumentasi lama,
skrip migrasi) yang masih bergantung padanya.

## Verifikasi

1. `node --check modules/shared/modals.js` → lolos.
2. `tests/s572-tx-acc-change-stale-state.test.js` → **8/8 PASS**, mencakup:
   account A→B, B→A, self-link/owner, non-owner, repeated change,
   `_txAccManuallySet` tetap ter-set, `updateTxAssetSplitPreview()`
   ikut terpanggil, serta wiring statis HTML LIVE vs orphan.
3. `npm test` (full suite): **4014 tests / 4007 pass / 7 fail** — 7 failure
   yang tersisa **sama persis** dengan baseline pra-patch (4006 tests / 7
   pre-existing failures; delta +8 test baru dari file S572, 0 failure
   baru). Detail failure pra-existing (tidak terkait `#txAcc`/S572):
   - `runDataHealthCheck: warn kalau Transaksi tertaut ke Aset yang
     accountId-nya SAMA dgn akun transaksi itu sendiri`
   - 6 test `_ownerNominalText()` / `onOwnerPorsiInput()` (investment
     owners nominal display) — modul investasi, tidak bersinggungan
     dengan `#txAcc`/transaksi.
4. `node scripts/build.js` → sukses, versi naik ke `s570-owner-porsi-tx-assignment`
   / build `v1301`, `app-bundle-a.min.js` & `app-bundle-b.min.js` lolos
   `node --check`.
5. `app-bundle-a.min.js` diverifikasi mengandung wiring baru
   (`onchange="onTxAccChange()"` pada elemen `id="txAcc"`) dan **0**
   sisa pola lama (`_txAccManuallySet=true` langsung di `onchange`).
