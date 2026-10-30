# FIX — Dropdown saran nama pemilik tidak muncul di "⚖️ Porsi Kepemilikan Akun"

**Status: FIXED**

## Laporan

Saat edit Porsi Kepemilikan Akun (mis. akun BRI di Metode Pembayaran, modal
`accountOwnersModal` / `AccOwners.open()`), field "Nama pemilik" tidak
menampilkan dropdown saran nama pemilik yang sudah pernah dipakai
sebelumnya — user harus ketik manual dari nol tiap kali, padahal field
serupa di modul lain (Aset, dsb.) diharapkan bisa pilih dari daftar.

## Akar masalah

Input "Nama pemilik" di `AccOwners._renderList()` (dulu di
`modules/finance/akun-owners.js`, dibundel ke `app-bundle-b.min.js`) adalah
`<input type="text">` polos — 0 autocomplete sama sekali, tidak ada
`<datalist>` ataupun suggest-box custom.

Ini **bukan** kasus "datalist tidak reliable di WebView Android" (itu sudah
diperbaiki di tempat lain lewat Sesi 545 — lihat komentar di
`car-notes.js`/`populateDatalist()`) — field ini memang dari awal belum
pernah dikasih autocomplete apa pun, jadi tidak ada dropdown yang gagal
tampil, dropdown-nya memang tidak pernah ada.

## Perbaikan

Tambah suggest-box custom per baris (pola sama seperti field lain di app
ini — `txCat`, `billName`, dst — BUKAN `<datalist>` native, supaya
konsisten dan sudah terbukti jalan di WebView Android):

- Bungkus input nama pemilik dengan `<div style="position:relative">` +
  `<div class="suggest-box" id="accOwnerNameSuggestBox{i}">` per baris.
- `AccOwners.onNameInput(i,val)` sekarang juga memanggil
  `AccOwners._renderNameSuggestions(i,val)` tiap user mengetik.
- `onfocus` pada input langsung memanggil `_renderNameSuggestions()` juga
  (tampil begitu field difokus, tidak perlu ketik dulu).
- `_renderNameSuggestions(i,query)` — sumber saran dari
  **`OwnerRegistry.listAll()`** (registry yang sama dipakai `AccOwners.save()`
  lewat `OwnerRegistry.findOrCreate()`), dedup case-insensitive, filter oleh
  query, maksimal 8 hasil.
- `AccOwners.selectNameSuggestion(i,name)` — tulis nama terpilih ke draft +
  ke `<input>` langsung (tanpa `_renderList()` ulang, jaga fokus baris lain,
  pola sama `onNameInput()`), lalu tutup dropdown.
- `_scheduleHideNameSuggestions(i)` — sembunyikan dropdown saat blur, ditunda
  150ms supaya event `onmousedown` (yang sudah `preventDefault()`) di pilihan
  dropdown tetap sempat kejalan duluan.

**0 perubahan skema data / logic simpan.** `AccOwners.save()`,
`MultiOwnerEngine`, `setAccOwners()`/`getAccOwners()` tidak disentuh sama
sekali — murni penambahan UI dropdown saran di atas draft yang sudah ada.

## Perubahan

| File | Sumber perubahan |
|---|---|
| `app-bundle-b.min.js` | `AccOwners._renderList()` (markup baris + suggest-box), `AccOwners.onNameInput()` diperluas, tambah `AccOwners._renderNameSuggestions()`, `AccOwners._scheduleHideNameSuggestions()`, `AccOwners.selectNameSuggestion()` |

## Verifikasi

- `node --check app-bundle-b.min.js` — lolos.
- Alur `addRow()`/`removeRow()` tetap render ulang seluruh list (indeks `i`
  suggest-box ikut re-generate, konsisten dgn indeks baris baru) — tidak ada
  perubahan pada logic itu.
- `AccOwners.save()`, `getAccOwners()`/`setAccOwners()`, sinkron ke aset
  tertaut, dan guard Holding Investasi (S604) tidak disentuh.
