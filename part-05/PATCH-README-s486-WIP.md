# PATCH s485f → s486 (Case F: Partial Return) — **WIP, BELUM di-build/BELUM full-regression ulang**

> ⚠️ **STATUS SEBENARNYA**: sesuai permintaan eksplisit user, ZIP ini
> diprioritaskan/dipaketkan LEBIH DULU, SEBELUM langkah wajib berikut
> dijalankan:
> 1. Full regression `node --test tests/*.test.js` ulang (terakhir
>    dijalankan: 3172 test, 6 gagal — 4 sudah diperbaiki di source ini
>    (schema `totals` bertambah 2 field baru & 1 scope test lama
>    dibetulkan), 2 sisanya — `checkHtmlSync`/`verify-release-ready` —
>    diduga akan hijau otomatis setelah `node scripts/build.js`
>    dijalankan, TAPI **belum diverifikasi ulang di ZIP ini**).
> 2. `node scripts/build.js` (bump versi 1214→1215, sync
>    `app_production.html` dari `index.html`, sync bundle
>    `app-bundle-a/b.min.js`) — **BELUM DIJALANKAN**. `app_production.html`
>    di ZIP release penuh yang menyertai patch ini MASIH VERSI LAMA
>    (?v=1214), belum mencerminkan modal `titipanReturnModal` yang baru.
> 3. Audit HARD RULE (diff eksplisit `ownership-engine.js`,
>    `multi-owner-engine.js`, `investasi.js`, `akun.js` tidak berubah) —
>    **belum dijalankan formal** (secara desain file-file itu memang
>    tidak disentuh sama sekali sesi ini, tapi belum di-diff eksplisit).
> 4. `s486-SESSION-NOTE.md` final — **belum ditulis** (dokumen ini
>    pengganti sementara).
>
> **JANGAN dianggap sebagai rilis final S486** — anggap sebagai
> checkpoint kode (Checkpoint 1 + 2 dari rencana sesi) yang dipaketkan
> lebih awal atas permintaan user. Langkah 1-4 di atas WAJIB dijalankan
> sebelum ZIP ini dianggap release-ready.

## Isi patch (7 file, semua di dalam `dana-titipan-portfolio-presenter.js`
## + `modals.js` + `index.html` + test)

| File | Status | Ringkas perubahan |
|---|---|---|
| `modules/finance/dana-titipan-portfolio-presenter.js` | diubah | + `recordReturn()`/`getReturns(ownerId?)`/`deleteReturn(id)` di `DanaTitipanPortfolioAPI`; `build()` extend `returnedTotal`/`outstandingPrincipal` per owner (derived, tidak disimpan) + `totals.returnedTotalSum`/`totals.outstandingPrincipalTotal`; `render()` extend baris "Sudah Dikembalikan"/"Pokok Belum Dikembalikan" + riwayat + tombol "↩️ Catat Pengembalian"; object baru `DanaTitipanReturnUI` (open/save/deleteEntry) + expose ke `window`. |
| `modules/shared/modals.js` | diubah | +1 entry `MODAL_HTML[97]`: `titipanReturnModal` (owner READONLY, beda dari `titipanCommitmentModal` yang dropdown). |
| `index.html` | diubah | +1 baris `<script>document.write(MODAL_HTML[97]);</script>` setelah baris `titipanCommitmentModal`. **CATATAN: `app_production.html` BELUM disinkronkan** (menunggu `node scripts/build.js`). |
| `tests/s486-titipan-commitment-return.test.js` | **baru** | 28 test baru (backend recordReturn/getReturns/deleteReturn, build() projection, render() wording+riwayat+XSS, DanaTitipanReturnUI open/save/deleteEntry, flow end-to-end). **28/28 PASS** (dijalankan berdiri sendiri). |
| `tests/s484-dana-titipan-portfolio-presenter.test.js` | diubah | 1 assersi `Object.keys(totals)` diperbarui (+2 field baru, additive). |
| `tests/s485b-titipan-commitment-crud.test.js` | diubah | 1 assersi `Object.keys(totals)` diperbarui (+2 field baru, additive). |
| `tests/s485d-titipan-commitment-ui.test.js` | diubah | Scope ekstraksi `uiCode` di gap-check test dibatasi sampai `const DanaTitipanReturnUI` (sebelumnya `slice(start)` tanpa batas ikut menangkap object baru yang ditambahkan setelahnya di file yang sama — murni perbaikan scope test, 0 perubahan assersi/validasi). |

## HARD RULE (per desain, belum di-diff eksplisit)

Sesi ini TIDAK menyentuh `ownership-engine.js`, `multi-owner-engine.js`,
`investasi.js` (termasuk `_syncTitipanDebt()`), `akun.js` — semua
perubahan 100% terisolasi ke `dana-titipan-portfolio-presenter.js` +
`modals.js` + `index.html` + test, sesuai rencana
`RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md`. Verifikasi diff eksplisit
menyusul.

## Cara apply patch

Timpa 7 file di atas ke atas baseline S485f (`v1214`,
`kw_release_v1214_s485f-gap3-audit-closeout.zip`), lalu **WAJIB**
jalankan `node scripts/build.js` sebelum dipakai/dianggap final.
