# Patch s485c → s485d

Fitur: Gap #3 (Titipan Commitment) — langkah 4/5: modal
`titipanCommitmentModal` baru + extend `render()` (tampilkan Pokok
Dikomit/Teralokasi/Estimasi Belum Teralokasi/Nilai Saat Ini/Untung-Rugi
per owner) + object baru `DanaTitipanCommitmentUI` (`open()`/`save()`).
**Sesi ini satu-satunya yang mengubah markup/DOM nyata** dalam rencana
Gap #3.

Lihat `s485d-SESSION-NOTE.md` untuk detail lengkap, dan
`RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` (di root repo) untuk peta 5
sesi Gap #3 secara keseluruhan.

## Cara pakai patch ini

Timpa (overwrite) file-file di bawah ini ke atas instalasi versi s485c
(build 1212). Semua path relatif terhadap root aplikasi.

## Isi patch

**File baru:**
- `tests/s485d-titipan-commitment-ui.test.js`

**File diubah (source):**
- `modules/finance/dana-titipan-portfolio-presenter.js` — tambah object
  `DanaTitipanCommitmentUI` (`open()`/`save()`), extend `render()` +
  helper baru `_principalCell()`/`_unallocatedCell()`. `build()`/
  `listExistingOwners()`/`saveCommitment()`/`getCommitments()` (S485a-c)
  TIDAK diubah.
- `modules/shared/modals.js` — tambah 1 entry baru di `MODAL_HTML`
  (`titipanCommitmentModal`). Modal lain TIDAK disentuh.

**File hasil build otomatis (JANGAN diedit manual, timpa apa adanya):**
- `app_production.html`, `index.html` (hanya bump `?v=1212→1213`)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `sw.js` (`CACHE_NAME` → `kw-cache-v1213`)
- `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` (semua hanya konstanta versi disamakan
  build.js ke `s485d-titipan-commitment-ui`, 0 perubahan lain)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

## Verifikasi setelah apply patch

```
node --test tests/*.test.js
```
Harus **3144/3144 PASS**.

**Tambahan wajib khusus sesi ini (beda dari sesi 485a-c sebelumnya):**
karena ini satu-satunya sesi yang mengubah markup/DOM nyata, lakukan
juga manual browser smoke test sebelum rilis ke pengguna — lihat
checklist di bagian "⚠️ Catatan penting" di `s485d-SESSION-NOTE.md`.

## Tidak termasuk dalam patch ini (menunggu sesi berikutnya)

- **Sesi 485e:** build final + regresi penuh + dokumentasi penutup
  (update `RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` jadi status
  selesai). Tidak ada lagi perubahan logika/UI baru direncanakan
  setelah sesi ini.

Tidak ada perubahan ke `ownership-engine.js`, `multi-owner-engine.js`,
`investasi.js` (termasuk `_syncTitipanDebt()`), atau `akun.js` — sudah
diverifikasi lewat diff eksplisit (lihat SESSION-NOTE).

## Known limitation (pre-existing, bukan bug baru patch ini)

Holding legacy `fundSource:'titipan'` semuanya memakai `ownerId` literal
`'titipan_investor'` — 2 orang berbeda yang memakai jalur legacy ini
collapse jadi 1 entri owner, jadi juga 1 baris di modal "Atur Pokok Dana
Titipan" sesi ini (konsisten dgn keterbatasan yang sama sejak S485a).
Tidak diperbaiki di sesi manapun dalam rencana Gap #3 ini (di luar
scope, dilarang oleh keputusan audit).
