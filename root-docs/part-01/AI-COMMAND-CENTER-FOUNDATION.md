# AI COMMAND CENTER — FOUNDATION

**Sprint 3 Tahap 3.1 — AI Command Center Foundation**

Baseline: Tahap 16 selesai (`SECONDARY-CLICKABLE-HOVER.md`), `node --test`
1384/1384 PASS (dikonfirmasi ulang dari isi repository sebelum tahap ini
dimulai — lihat `CHANGELOG.md` §Tahap 16 dan catatan audit di bawah).

## Ruang lingkup

Tahap 3.1 ini adalah **Foundation saja**: menyediakan satu registry netral,
murni logic (tanpa DOM/UI), tempat modul lain (Tahap 3.2+) nantinya
mendaftarkan "command" AI — aksi yang bisa dijalankan lewat command
palette / asisten AI di masa depan. File ini **tidak berisi satu command
pun** dan **tidak mengubah perilaku app yang berjalan sama sekali** —
registry kosong sampai modul lain mulai memanggil
`AICommandCenter.registerCommand()` di tahap berikutnya.

### Kenapa terpisah dari FEATURE_REGISTRY

`FEATURE_REGISTRY` (`dashboard-hub-registry.js`) adalah taksonomi
**navigasi** (`page`/`tab`/`goTo`/`action` target untuk membuka kartu/menu
yang sudah ada di UI), dikonsumsi `DashboardHub`. `AICommandCenter` adalah
registry **aksi yang bisa dieksekusi langsung** (fungsi `run`, bukan
navigasi) — kebutuhan dan konsumen berbeda. Dipisah sengaja supaya kontrak
`FEATURE_REGISTRY` yang sudah dites luas tidak tersentuh sama sekali; file
ini tidak membaca maupun menulis `FEATURE_REGISTRY`.

## API (`window.AICommandCenter`)

| Method | Deskripsi |
|---|---|
| `registerCommand({id, label, run, description?, category?})` | Daftarkan command baru. Return `true`/`false`. Menolak (silent) input invalid atau `id` duplikat. |
| `unregisterCommand(id)` | Hapus command. Return `true`/`false`. |
| `getCommands()` | Array copy seluruh command terdaftar (bukan referensi internal). |
| `getCommand(id)` | Satu command (copy) atau `null`. |
| `execute(id, ...args)` | Jalankan `run()` command; dibungkus try/catch → `{ ok, result }` atau `{ ok:false, error }`. Tidak pernah throw ke pemanggil. |
| `clear()` | Kosongkan registry (dipakai test harness untuk isolasi, bukan dipanggil app runtime). |

## File berubah

| File | Perubahan |
|---|---|
| `ai-command-center.js` | **Baru.** Registry + eksekusi command, murni logic, tanpa DOM. |
| `tests/ai-command-center.test.js` | **Baru.** 14 test baru. |
| `scripts/build.js` | +1 baris — daftarkan `ai-command-center.js` ke `GROUP_B` (urutan file bundle). Logic build.js sendiri **tidak diedit**. |
| `CHANGELOG.md` | +section Sprint 3 Tahap 3.1 |
| `FILES-CHANGED.md` | +entry Tahap 3.1 |
| `AI-COMMAND-CENTER-FOUNDATION.md` | Dokumen ini |

Total **3 file kode** tersentuh (1 baru + 1 test baru + 1 baris konfigurasi
di `build.js`) — di bawah batas maksimal 5 file kode.

## Tidak diubah

`FEATURE_REGISTRY`, Dashboard V2, business logic modul manapun (akun,
cicilan, cobek, vehicle, dll.), `index.html`/`app_production.html`
(keduanya hanya memuat bundle hasil build, bukan file source individual —
tidak perlu diedit), `sw.js`, `package.json`, logic `scripts/build.js`.

> Catatan proses: `node scripts/build.js` sempat dijalankan untuk sanity
> check sintaks dan menghasilkan efek samping standar tool ini (bump versi
> `?v=`, regenerasi bundle, `docs/FILE-MAP.md`, backup) di beberapa file
> yang tidak seharusnya tersentuh tahap ini. Seluruh efek samping tsb
> **sudah di-revert** ke kondisi identik dengan ZIP sumber sebelum commit
> akhir — diverifikasi lewat `diff -rq` penuh terhadap isi ZIP asli,
> menyisakan hanya 3 file kode di atas.

## Hasil test

```
node --test
# tests 1398
# pass 1398
# fail 0
```

1384 (baseline Tahap 16) + 14 (test baru `ai-command-center.test.js`) = 1398.

## Constraint check

| Constraint | Status |
|---|---|
| Reuse komponen existing semaksimal mungkin | ✅ Pola registry/global-object & harness test 100% reuse konvensi existing (`dashboard-hub-registry.js`, `dashboard-hub-favorit-view.js`, `tests/helpers/loadSource.js`) |
| Tidak menyentuh `FEATURE_REGISTRY` | ✅ Tidak dibaca maupun ditulis; diverifikasi via test khusus |
| Tidak menyentuh Dashboard V2 | ✅ |
| Tidak menyentuh business logic | ✅ |
| Maksimal 5 file kode | ✅ 3 file |
| Test baru ditambahkan | ✅ 14 test |
| Full `node --test` dijalankan | ✅ 1398/1398 |

## Status

Foundation Sprint 3 Tahap 3.1 selesai. Registry aktif tapi kosong (belum
ada command terdaftar) — pendaftaran command nyata & UI command palette
adalah scope Tahap 3.2+, sesi terpisah dengan mandat eksplisit.
