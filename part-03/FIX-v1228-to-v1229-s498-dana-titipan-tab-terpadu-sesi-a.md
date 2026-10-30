# FIX v1228 → v1229 (Sesi 498): Tab "Dana Titipan" Terpadu — Sesi A (Fondasi Tab)

## Konteks
Menindaklanjuti `AUDIT-DANA-TITIPAN-TAB-TERPADU.md` (audit + rancangan, 0
kode sesi itu). User meninjau rancangan & menyetujui Sesi A dengan 3
guardrail:
1. Jangan bikin `DanaTitipanEngine` baru.
2. Jangan ubah arti `titipanCommitments[]`.
3. Audit overlap `OwnershipEngine`/`MultiOwnerEngine` sebelum wiring yang
   menyentuh entitas (sudah dikerjakan sesi sebelumnya, hasil: risiko nyata
   tapi sempit — `a.ownership` bisa stale setelah `a.owners[]` diisi
   eksplisit; TIDAK memblokir shell/kartu Sesi A karena Sesi A cuma baca
   `titipanCommitments`/`getReturns()`/`build()`, 0 baca `a.ownership`).

Sesi ini murni **Sesi A — Fondasi Tab** (lihat §3 audit): 1 layar terpusat
yang menyatukan owner dana titipan yang sebelumnya cuma kelihatan
tertanam di dalam kartu "💰 Dana Kelolaan" (Laporan › Ringkasan), tanpa
mesin finansial baru.

## Perubahan

### 1. `DanaTitipanPortfolioPresenter.render()` → `renderInto(containerId)`
`render()` (dipakai sejak S484) sekarang 1 baris: delegasi ke
`renderInto('danaTitipanPortfolioList')` — **perilaku 0% berubah**, semua
test S484/S485a-d/S486 lolos tanpa modifikasi. `renderInto()` adalah
generalisasi murni supaya presenter yang sama bisa dipasang ke lebih dari
1 container sekaligus, 1 sumber data (`DanaTitipanPortfolioAPI.build()`),
0 SSOT baru.

### 2. Sub-tab ke-4 "💰 Dana Titipan" di Laporan Keuangan
`modules/finance/tx-list-cashflow.js` (`setLaporanTab`,
`LAPORAN_SUBTAB_ORDER`/`LABEL`) — pola direplikasi PERSIS dari 3 sub-tab
lama (Ringkasan/Arus Kas/Transaksi), murni toggle DOM, 0 logic baru.

`index.html` — tombol sub-tab baru + pane `#laporanTab-titipan` berisi 1
kartu (`#danaTitipanTabCard`) dengan container `#danaTitipanTabList`,
diisi `DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList')`
(dipanggil dari `renderLaporan()`, `modules-render.js`, tepat setelah
panggilan `render()` lama — kartu lama di Ringkasan TIDAK dihapus/diubah,
tetap tampil apa adanya, 2 tempat 1 sumber data).

`modules/dashboard-hub/dashboard-hub.js` — `LAPORAN_SUBTAB_IDX` ditambah
`titipan: 3` (konsisten dgn 3 entry lama, dipakai `dashHubNavigateToFeature`
kalau nanti ada fitur yang mau deep-link ke sub-tab ini).

`self-test.js` — **tidak disentuh**: pengecekan visibilitas panel sudah
generik (iterasi semua tombol `.lap-subtab`), otomatis mencakup sub-tab
baru tanpa perubahan apa pun.

### 3. Tombol "+ Tambah Pemilik Titipan"
Reuse 100% tombol `DanaTitipanCommitmentUI.open` yang sudah ada (S485d) —
tampil identik di kedua container (lama & baru), tidak ada modal/CRUD baru
ditulis sesi ini.

## Yang TIDAK berubah (sesuai guardrail)
- `D.titipanCommitments[]` — skema sama persis (`ownerId`, `ownerName`,
  `principalAmount`, dst), 0 field baru.
- `DanaTitipanPortfolioAPI` — 0 method baru, 0 rumus baru. `build()`
  masih HANYA baca holding Investasi (perluasan ke Aset = Sesi B, belum
  dikerjakan sesi ini).
- Mekanisme "pinjam untuk transaksi" (G4, Sesi C) — belum disentuh sama
  sekali.
- `OwnershipEngine`/`MultiOwnerEngine` — 0 baris diubah.

## Test Baru
`tests/s498-dana-titipan-tab-terpadu.test.js` (12 test):
1–4. `renderInto()`: `render()` lama tidak berubah perilakunya, container
   baru merender data yang sama, 2 container independen, guard aman kalau
   container tidak ada.
5–8. Cross-check struktural: `index.html`/`app_production.html` punya
   tombol+pane+container baru (dan container lama tetap ada), 
   `LAPORAN_SUBTAB_ORDER`/`LABEL`/`LAPORAN_SUBTAB_IDX` konsisten.
9–12. `setLaporanTab('titipan', …)` lewat DOM stateful: pane baru
   terlihat & 3 pane lain tersembunyi saat aktif, simetris saat pindah
   balik, breadcrumb benar, guard aman kalau pane tidak ada di DOM.

## Verifikasi
- `node --test tests/*.test.js` — **3254/3254 lulus** (naik dari 3242, +12
  test baru; 0 regresi).
- `node scripts/build.js s498-dana-titipan-tab-terpadu-sesi-a` — build
  sukses, versi naik ke **v1229**, sintaks kedua bundle valid
  (`node --check`), `app_production.html` disinkronkan otomatis ke
  `index.html`.
- `esbuild` tidak tersedia di environment build sesi ini (tanpa akses
  jaringan) — kedua bundle **belum diminify** (ukuran lebih besar dari
  v1228, tapi 100% valid & aman dipakai, sama seperti build dev biasa
  tanpa `npm install`). Kalau mau ukuran seminify versi lama, jalankan
  `npm install --save-dev esbuild` sekali (butuh internet) lalu build
  ulang — tidak wajib untuk fungsi, cuma ukuran file.

## Sisa Kerjaan (sesuai §3 audit, sengaja BUKAN sesi ini)
- **Sesi B** — perluas `DanaTitipanPortfolioAPI.build()` supaya breakdown
  alokasi ikut Aset (bukan cuma Investasi), lewat kontrak
  `listAllocations(ownerId)` per domain. Sebelum itu: cross-check
  `a.ownership` vs `a.owners[]` per aset (temuan guardrail 3) supaya
  alokasi tidak dobel-hitung untuk aset yang punya kedua field itu
  sekaligus dengan klaim non-SELF yang konflik.
- **Sesi C** — mekanisme "pinjam untuk transaksi keuangan" (G4), wajib
  audit kecil `saveTx()`/`txModal` dulu sebelum coding.
- **Sesi D (opsional)** — perluasan ke Kendaraan/Shop, hanya kalau ada
  use-case nyata.

## Catatan
Zip release ini **FULL RELEASE** (semua file, v1229). Zip patch terpisah
(`kw_patch_v1228-to-v1229_s498-dana-titipan-tab-terpadu-sesi-a.zip`) berisi
HANYA 16 file yang berubah/baru sejak v1228 — upload ULANG semua file di
situ ke lokasi yang sama, jangan cuma `index.html`/`sw.js`.
