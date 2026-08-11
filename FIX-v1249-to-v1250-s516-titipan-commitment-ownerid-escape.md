# S516 — BUG-S516-001: Owner Picker Dana Titipan Gagal "Owner Tidak Ditemukan" (Fix Escaping)

**Status: S516 COMPLETE — FIXED & VERIFIED**

## Ringkasan

Laporan user: modal "💰 Pokok Dana Titipan" (`DanaTitipanCommitmentUI`)
kadang menolak simpan dengan pesan "Owner tidak ditemukan pada daftar
pemilik investasi yang ada", padahal owner yang dipilih JELAS ada di
dropdown & di `listExistingOwners()`.

Audit statis awal (sebelum sesi ini) membaca `listExistingOwners()`,
`saveCommitment()`, `recordReturn()`, dan tiga sumber ownerId
(`MultiOwnerEngine.getOwners()`, `_synthesizeFromTitipan()`,
`OwnerRegistry.findOrCreate()`) — semuanya deterministik & konsisten kalau
dibaca terpisah. Audit itu SALAH menyimpulkan penyebabnya adalah race
condition runtime atau bundle basi yang butuh debugging browser langsung.

Investigasi lanjutan sesi ini membaca satu lapisan yang terlewat:
**`DanaTitipanCommitmentUI.open()`, tempat dropdown benar-benar di-render
ke DOM.** Di situlah bug-nya.

## Root Cause

`open()` (baris 927, sebelum fix) menyuntik `o.ownerId` MENTAH ke atribut
HTML lewat `innerHTML`:

```js
sel.innerHTML = owners.map((o) => `<option value="${o.ownerId}">${escapeHtml(o.ownerName)}</option>`).join('');
```

`o.ownerName` (teks tampilan) di-escape, tapi `o.ownerId` (identifier
internal) TIDAK. Kalau `ownerId` memuat karakter `"` (mis. hasil
`OwnerRegistry.findOrCreate()` dari nama pemilik yang memuat tanda kutip),
atribut `value="..."` pecah di tengah jalan — browser membaca `sel.value`
sbg **string terpotong**, bukan `ownerId` asli. Saat `save()` mengirim
`ownerId` yang sudah rusak itu ke `saveCommitment()`/`recordReturn()`,
fungsi itu mencari `known` di `listExistingOwners()` segar dan TIDAK
ketemu (karena mencari string yang salah) — makanya muncul error "Owner
tidak ditemukan..." walau ownerId aslinya valid.

Dua tombol pemicu per-owner (baris 852-853, `render()`) punya lubang yang
sama: `data-args='["${o.ownerId}"]'` — `ownerId` yang memuat `'` merusak
delimiter atribut single-quote itu sendiri.

**Dibuktikan reproducible 100%** (bukan cuma teori) lewat test regresi
baru yang dijalankan terhadap kode SEBELUM fix — lihat bagian Verifikasi.

## Perubahan

1. `modules/finance/dana-titipan-portfolio-presenter.js`
   - Baris 927: `value="${o.ownerId}"` → `value="${escapeHtml(o.ownerId)}"`
     (pola sama value atribut lain, mis. `akun.js:175`).
   - Baris 852-853: `data-args='["${o.ownerId}"]'` →
     `data-args="${escapeHtml(JSON.stringify([o.ownerId]))}"` (pola SUDAH
     established di file yang sama, `Aset.openOwnersModalById` baris 864
     — bukan pola baru, cuma diterapkan konsisten ke 2 titik yang
     sebelumnya terlewat).
2. `tests/s516-dana-titipan-commitment-ownerid-escaping.test.js` (BARU,
   2 test) — memakai `escapeHtml` ASLI dari `helper-teks.js` (bukan stub
   identity `(s)=>String(s)` seperti test lain di domain ini), krn stub
   identity tidak akan pernah mendeteksi bug attribute-breakout ini.
3. `tests/s485d-titipan-commitment-ui.test.js` — 2 assertion lama yang
   memeriksa format `data-args` MENTAH diupdate mengikuti format baru yg
   ter-escape (test `[gap-check]` & test #7). 0 logic test lain diubah.

## HARD RULE — isolasi sentuhan

0 sentuhan ke `listExistingOwners()`, `saveCommitment()`, `recordReturn()`
(logic CRUD/validasi sudah benar sejak awal — root cause murni di lapisan
populate-DOM). 0 sentuhan ke `ownership-engine.js`, `multi-owner-engine.js`,
`investasi.js`, `akun.js`.

## Verifikasi

- **Bukti bug nyata (bukan cuma teori):** test baru dijalankan dulu
  terhadap kode SEBELUM fix (`sed` sementara mengembalikan baris 927 ke
  unescaped) → **GAGAL** dgn `actual: 'owner_'` (atribut terpotong persis
  di titik `ownerId` bertemu `"` pertama) vs `expected` ownerId ter-escape
  utuh. Fix dipasang ulang → **PASS**.
- `node --test tests/*.test.js` → **3374/3374 pass**, 0 fail (3372 dari
  baseline v1249 + 2 baru sesi ini, 2 assertion lama diupdate mengikuti
  fix format).
- `node scripts/verify-window-expose.js` → OK, 68 modul window-expose
  lengkap.
- `node scripts/build.js` → versi `s515-...` → `s516-...`, `?v=1249` →
  `?v=1250`, `CACHE_NAME` → `kw-cache-v1250`, sintaks bundle lolos
  `node --check`.
- `node scripts/verify-bundle-freshness.js` → OK, hash source cocok kedua
  bundle.
- `node scripts/verify-release-ready.js` → LOLOS (gate `html-sync` hijau
  otomatis; gate `lint`/`minify` di-override manual — eslint/esbuild tidak
  bisa diinstall di sandbox tanpa akses jaringan, konsisten dgn pola
  override sesi-sesi sebelumnya, tercatat di `docs/RELEASE-GATE-LOG.md`).

## Baseline → Hasil

- Versi awal: `v1249` / `s515-dana-titipan-owner-nominal-asset-kuota-porsi`
- Versi akhir: `v1250` / `s516-dana-titipan-owner-nominal-asset-kuota-porsi`
- Test: 3372 → 3374 pass (+2 baru), 0 fail
