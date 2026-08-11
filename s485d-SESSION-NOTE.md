# Sesi 485d (Gap #3 — Titipan Commitment, langkah 4/5: Modal + Render Extension)

## Konteks

Lanjutan langkah 3/5 (S485c, projection extension `build()`). Sesi ini
= **SATU-SATUNYA** sesi dalam rencana Gap #3 yang mengubah markup/DOM
nyata (lihat `RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md`) — semua sesi
sebelumnya (485a/485b/485c) sengaja diisolasi dari UI supaya review bisa
fokus ke data model/CRUD/allocation guard dulu, bukan markup. Sesi ini =
**langkah 4/5**.

## Target sesi ini

1. Modal baru `titipanCommitmentModal` di `MODAL_HTML` (`modals.js`) —
   "💰 Pokok Dana Titipan": dropdown Owner (WAJIB dari
   `listExistingOwners()`, TIDAK ADA input teks bebas — mencegah user
   bikin identity baru yang tidak dikenal sistem, konsisten dgn
   validasi existing-owner-only di `saveCommitment()` S485b), field
   Pokok/Tanggal Komit (opsional)/Catatan (opsional), tombol Simpan
   (`DanaTitipanCommitmentUI.save`).
2. Object baru `DanaTitipanCommitmentUI` (`dana-titipan-portfolio-
   presenter.js`) — `open(ownerId)` (isi dropdown dari
   `listExistingOwners()`, mode edit kalau `ownerId` sudah punya record
   di `getCommitments()`) + `save()` (baca form, panggil
   `saveCommitment()` S485b, try/catch pola sama `InvestmentUI.
   saveOwners()`). **0 logika CRUD/projection baru** — 100% konsumsi
   API sesi 485a-c.
3. Extend `DanaTitipanPortfolioPresenter.render()`:
   - Tombol "💰 Catat/Update Pokok Dana Titipan" (global, selalu
     tampil di atas — bukan cuma saat `owners.length>0`, supaya owner
     baru yang belum sempat dicatat pokoknya tetap bisa langsung dari
     sini).
   - Per owner: baris "Pokok Dikomit" (`_principalCell()` — "Belum
     dicatat", BUKAN "Rp0", kalau `principalAmount===null`), "Estimasi
     Belum Teralokasi" (`_unallocatedCell()` — label ini WAJIB dipakai,
     bukan Kas/Saldo/Dana Tersisa, badge ⚠️ + nominal kelebihan kalau
     `OVER_ALLOCATED`), tombol "✏️ Atur Pokok Dana Titipan" per owner
     (buka modal mode edit lewat `data-args`).
   - Summary per owner (`<summary>`) dapat prefix ⚠️ kalau
     `allocationStatus==='OVER_ALLOCATED'`.
   - Totals dapat 3 baris baru: "Total Pokok Dikomit", "Total Estimasi
     Belum Teralokasi", dan "⚠️ Total Kelebihan Alokasi" (baris ini
     **hanya tampil kalau `overAllocatedTotal>0`** — tidak permanen di
     layout).

## File yang diubah

- `modules/finance/dana-titipan-portfolio-presenter.js` — tambah
  `DanaTitipanCommitmentUI` (baru), extend `render()` +
  `_principalCell()`/`_unallocatedCell()` (helper baru, pure function —
  tidak sentuh DOM). `build()`/`listExistingOwners()`/`saveCommitment()`/
  `getCommitments()` (S485a-c) **TIDAK diubah sama sekali**.
- `modules/shared/modals.js` — tambah 1 entry baru di `MODAL_HTML`:
  `titipanCommitmentModal`. Modal lain di array TIDAK disentuh.
- `tests/s485d-titipan-commitment-ui.test.js` (BARU) — 17 test, 3 lapis:
  1. Cross-check template HTML asli (`modals.js`) vs id/`data-action`
     yang benar-benar dipanggil `DanaTitipanCommitmentUI`/`render()`
     (pola sama regression guard bug s392f di
     `tests/asset-owners-flow-e2e-392a-to-392e.test.js`) — supaya kalau
     template & JS pernah tidak sinkron lagi, ketahuan di sini, bukan
     baru pas manual QA di browser.
  2. Unit murni-logika `_principalCell()`/`_unallocatedCell()` (pure
     function, aman dites lewat `loadSource` default tanpa DOM).
  3. Simulasi DOM STATEFUL (bukan stub permisif default `loadSource.js`
     — override `document` sendiri, pola sama test 392a-392e) utk
     `render()` (isi container list) dan `DanaTitipanCommitmentUI.
     open()`/`save()` (baca/tulis `.value`/`.innerHTML`/
     `.selectedOptions`), termasuk alur upsert & alur error
     (owner belum dipilih, principal negatif ditolak).
- `scripts/build.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `index.html`, `app_production.html`, kedua bundle, `sw.js`,
  `modules/shared/modules-calc.js`/`modules-render.js`/
  `features-helpers-global-security.js`, `chat-action-handlers.js` —
  **hanya bump versi build** (1212→1213).

## Hasil test

`node --test tests/*.test.js` → **3144/3144 PASS** (3124 lama tidak
diubah sama sekali + 20 baru dari file test sesi ini), 0 gagal, 0
regresi nilai.

## Hasil build

`node scripts/build.js s485d-titipan-commitment-ui` → sukses, versi
s485c→s485d (build 1212→1213), sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=1213` sinkron.

## Verifikasi HARD RULE (wajib per instruksi audit)

`diff` eksplisit baseline S485c vs hasil sesi ini terhadap file yang
DILARANG diubah:

```
ownership-engine.js     -> TIDAK BERUBAH
multi-owner-engine.js   -> TIDAK BERUBAH
investasi.js            -> TIDAK BERUBAH (termasuk _syncTitipanDebt())
akun.js                 -> TIDAK BERUBAH
```

`build()`/`listExistingOwners()`/`saveCommitment()`/`getCommitments()`
di `dana-titipan-portfolio-presenter.js` sendiri (S485a-c) juga
diverifikasi TIDAK diubah sama sekali sesi ini — hanya ditambah
kode/komentar baru DI BAWAHNYA (`render()` extension + object
`DanaTitipanCommitmentUI`). Semua file lain yang ikut ter-diff (bundle,
index.html, dst) diverifikasi HANYA berisi bump konstanta versi build.

## ⚠️ Catatan penting: batasan node:test vs browser smoke test

Sesi ini SATU-SATUNYA yang mengubah markup/DOM nyata dalam rencana Gap
#3 — `tests/helpers/loadSource.js` secara eksplisit TIDAK dirancang
untuk menggantikan browser sungguhan (stub `document` default-nya
permisif no-op). Test sesi ini (`s485d-titipan-commitment-ui.test.js`)
memakai DOM tiruan STATEFUL kustom (pola sama test 392a-392e) yang
menutup gap itu sejauh mungkin — cross-check template vs id yang
dipanggil, simulasi baca/tulis `.value`/`.innerHTML`/`.selectedOptions`
— tapi **BUKAN pengganti penuh** untuk hal-hal yang cuma kelihatan di
browser sungguhan: animasi buka/tutup modal, tampilan visual badge ⚠️/
warna, keyboard/touch di dropdown Owner asli, dan reflow layout modal
di berbagai ukuran layar. **Wajib manual browser smoke test** sebelum
rilis ke pengguna: buka modal dari tombol global & tombol per-owner
(mode tambah vs edit), simpan principal baru & update principal
existing, coba principal negatif (harus ditolak dgn toast, modal tetap
terbuka), cek tampilan badge ⚠️ saat over-allocated di kartu ringkasan
maupun baris total.

## Progress & Next TODO

Langkah 4/5 selesai, teruji (unit + DOM stateful), ter-build. **Sesi
485e** (berikutnya, sesi PENUTUP Gap #3): build final + regresi penuh
+ dokumentasi penutup (update
`RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` jadi status selesai,
ringkasan akhir 5 sesi). Tidak ada lagi perubahan logika/UI baru yang
direncanakan setelah sesi ini — 485e murni verifikasi & dokumentasi.

## Known Issue

Tidak ada known issue baru dari perubahan sesi ini, selain
`titipan_investor` collision yang sudah dicatat sejak S485a (pre-
existing, tidak diperbaiki — di luar scope, dilarang oleh keputusan
audit). Catatan UI tambahan: kalau 2 owner berbeda collapse jadi 1
`ownerId` (`titipan_investor`) akibat collision itu, tombol "✏️ Atur
Pokok Dana Titipan" di sesi ini juga otomatis ikut menampilkan/
mengedit 1 baris gabungan yang sama — konsisten dgn keterbatasan yang
sama, bukan bug baru sesi ini.
