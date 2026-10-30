# SESSION-NOTE-S1590 — Konversi 10 field `simpleAutocompleteInput` (onfocus) ke 1 wiring generik

**Basis:** dibangun di atas patch `PATCH-s758-v1589.zip` (versi 1589,
APP_BUILD_VERSION `s758-fuel-jenis-unknown-edit-legacy`), yang sendiri
adalah akumulasi S1587–S1589 di atas `app-main__63_.zip` (versi 1586).
Timpa semua file di ZIP patch ini ke project asli. Versi baru: **1590**,
`s1590-simpleautocomplete-onfocus-generic-dispatch`.

## Permintaan user

Field yang pakai `simpleAutocompleteInput(...)` (10 field total) polanya
identik dengan `txCat`/`txSubCat` (buka suggest-box saat field di-tap
pertama kali, lewat `onfocus`), jadi rawan kena bug regresi yang sama
(dropdown tidak muncul saat tap pertama kalau field dikonversi ke
`data-oninput=` tanpa dispatcher menangani `focus` — lihat S1587). User
minta dibuatkan **1 fungsi generik**:

```
data-onfocus="simpleAutocompleteInput" data-onfocus-args='["txNote","txNoteBox","acTxNotes"]'
```

alih-alih bikin wrapper baru per-field (pola `_txCatOnBlur`/`_txSubCatOnBlur`
yang menambah "fungsi kecil" satu-satu). **Scope sesi ini SENGAJA dipersempit
ke poin ini saja** — hanya konversi atribut `onfocus`; `oninput` & `onblur`
inline pada field yang sama TIDAK disentuh (masih pola lama), sesuai
instruksi eksplisit user untuk tidak mengerjakan poin lain dulu.

## 10 field yang dikonversi (semua di `modules/shared/modals.js`, canonical
— file duplikat `modules/modals.js`, `modules/asset/modals.js`,
`modules/shop/modals.js` adalah dead file leftover, sengaja TIDAK disentuh,
lihat `docs/archive/DEAD-FILE-CANDIDATES-AUDIT.md`)

| Field | Box ID | List var | Modal |
|---|---|---|---|
| `bbmSpbu` | `bbmSpbuBox` | `acSpbuNames` | bbmModal |
| `txBbmSpbu` | `txBbmSpbuBox` | `acSpbuNames` | txModal (panel sync BBM) |
| `txNote` | `txNoteBox` | `acTxNotes` | txModal |
| `billName` | `billNameBox` | `acBillNames` | billModal |
| `pName` | `pNameBox` | `acProductNames` | productModal |
| `prName` | `prNameBox` | `acProdusenNames` | produsenModal |
| `sparepartName` | `sparepartNameBox` | `acSparepartCatNames` | sparepartModal |
| `sparepartCode` | `sparepartCodeBox` | `acSparepartCatCodes` | sparepartModal |
| `stockName` | `stockNameBox` | `acStockNames` | stockModal |
| `stockCode` | `stockCodeBox` | `acStockCodes` | stockModal |

Tiap field: `onfocus="simpleAutocompleteInput('id','boxId',acListVar)"`
diganti jadi `data-onfocus="simpleAutocompleteInput"
data-onfocus-args='["id","boxId","acListVar"]'`. `oninput=` (masih
`simpleAutocompleteInput(...)` inline, ditambah `AutoKat.onNoteInput()`
khusus di `txNote`) & `onblur="setTimeout(()=>hideSuggestBox('boxId'),150)"`
dibiarkan apa adanya.

## Masalah teknis: JSON `data-*-args` tidak bisa membawa referensi array

`_dataActionResolveArgs()` (dispatcher pusat,
`modules/shared/features-helpers-global-security.js`) mem-parse
`data-onfocus-args` sebagai JSON — JSON cuma bisa membawa string/number/
boolean/null/array literal, **tidak bisa** membawa referensi ke variabel
JS (`acTxNotes` dkk adalah `let`/`const` array di top-level module, bukan
string). Sedangkan `simpleAutocompleteInput(fieldId, boxId, list)` butuh
`list` sebagai ARRAY ASLI di parameter ke-3, bukan namanya.

Solusi (persis seperti diminta user — 1 fungsi generik, bukan wrapper
per-field): arg ke-3 dikirim sbg STRING nama variabel di JSON
(`"acTxNotes"`), lalu **khusus saat `data-onfocus`/nama fungsi yang
dipanggil persis `simpleAutocompleteInput`**, `_dataActionInputChangeHandler`
men-dereference string itu balik ke `window[namaVariabel]` SEBELUM
memanggil fungsinya. Sengaja diletakkan sebagai pengecualian sempit
(cek `namesRaw.trim()==='simpleAutocompleteInput'`) di dalam handler,
BUKAN mengubah `_dataActionResolveArgs()` secara generik — supaya
resolver generik itu tidak perlu tahu soal konvensi "nama variabel list
autocomplete" yang cuma relevan utk fungsi ini, dan fungsi lain yang
kebetulan punya arg string yang sama dengan nama variabel global TIDAK
ikut ke-dereference tanpa sengaja (dikunci test #2 di bawah).

## Test baru (2, di `tests/data-oninput-onchange-dispatcher.test.js`,
menjalankan fungsi ASLI lewat sandbox `vm`, pola sama seperti test
`data-onfocus` txCat/txSubCat yang sudah ada)

1. `data-onfocus="simpleAutocompleteInput"` dgn
   `data-onfocus-args='["txNote","txNoteBox","acTxNotes"]'` — arg ke-3
   yang diterima fungsi target harus REFERENSI array `acTxNotes` asli
   (`assert.equal(received.list, acTxNotes)`, bukan cuma `deepEqual`),
   bukan string `"acTxNotes"`.
2. Fungsi SELAIN `simpleAutocompleteInput` dengan arg string yang
   kebetulan cocok nama variabel global (`"acTxNotes"`) HARUS tetap
   menerima string literal apa adanya (dereferencing tidak "bocor" ke
   fungsi lain).

## Verifikasi

- `node --check` lolos utk `modules/shared/modals.js`,
  `modules/shared/features-helpers-global-security.js`, dan file test.
- Full suite: **5656/5656 pass** (5654 lama + 2 baru).
- `npm run build:safe` (SKIP_LINT=1, eslint/esbuild tidak terpasang di
  sandbox ini — sama seperti S1587–S1589, override tercatat otomatis di
  `docs/RELEASE-GATE-LOG.md`) lolos, versi naik 1589 → **1590**,
  `s758-fuel-jenis-unknown-edit-legacy` → `s1590-simpleautocomplete-onfocus-generic-dispatch`.
- Audit statis build.js ("MODAL_HTML index drift", "field user tanpa
  escapeHtml()", dll) semua tetap ✓, tidak ada regresi baru.

## Belum dikerjakan (di luar scope, per instruksi eksplisit user)

- `oninput=`/`onblur=` inline pada 10 field ini (masih pola lama, belum
  ke `data-oninput=`/`data-onblur=`).
- Field lain di luar 10 field `simpleAutocompleteInput` ini yang mungkin
  masih pakai inline `onfocus=` (belum diaudit ulang di sesi ini).
