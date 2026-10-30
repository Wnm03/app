# Session Note — Sesi C: Audit Event Bus (0 kode diubah, versi tetap v1651)

**Ref:** `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §6 (risiko) & §7 (Sesi
C — "Perluas pola `finance.updated`/`vehicle.updated` ... ke titik-titik
lain yang masih menulis `D` langsung tanpa emit — audit dulu titik mana
saja sebelum coding (daftar konsumen, bukan langsung ubah).").

## Yang dikerjakan

1. Checkout v1646 (base `app-main__77_.zip` yang W upload) + apply
   berurutan 5 patch zip sesi sebelumnya: v1647 (Sesi A1) → v1648 (Sesi
   A2) → v1649 (followup A2) → v1650 (Sesi B) → v1651 (followup wiring 3
   literal). Diverifikasi full suite jalan di checkout gabungan ini:
   6158 test, 6147 pass, 11 fail — **identik** dengan angka yang sudah
   dicatat CHANGELOG.md v1651 sendiri (dicek nama test yang gagal satu per
   satu, bukan cuma jumlahnya). 0 regresi dari proses gabung 5 patch.
2. Audit murni (0 file source diedit): peta semua titik `AIBus.emit()`
   yang sudah ada (baseline pola & nama event), lalu per domain
   (`finance/`, `asset/`, `vehicle/`, `shop/`) cari file yang menulis `D`
   (via pemanggilan `save()` global) tapi 0 `AIBus` — dicek manual satu
   per satu untuk pastikan itu benar mutasi data, bukan sekadar
   baca/render.
3. Hasil lengkap: `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` (di root,
   sejajar `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md`).

## Ringkasan temuan (detail + nomor baris di file audit)

- **Prioritas Tinggi** (pola sudah ada di domain sama, tinggal replikasi):
  CRUD kendaraan (`vehicle-core.js` — `saveVehicle`/`delVehicle`/`saveKm`)
  belum emit `vehicle.updated` padahal servis sudah; `delTx()`
  (`tx-list-cashflow.js`) — jalur HAPUS transaksi umum — 0 emit padahal
  `saveTx()` sudah emit per-kind; transfer/renov/target/stok-sparepart (4
  jenis transaksi khusus) 0 emit; utang/piutang & tagihan (2 domain) 0
  emit; akun 0 emit (domain baru, belum ada nama event).
- **Prioritas Sedang** (domain besar, 0% Event Bus sama sekali): Dana
  Titipan (4 file), Shop/Cobek produk-stok (4 file, cuma order yang
  emit), Zakat/PBB (1 file, 9 titik `save()`), investasi.js dasar (perlu
  verifikasi lanjut), aset non-core (3 file).
- **Rendah** (sengaja tidak direkomendasikan): file settings/UI/kalkulator
  lokal tanpa konsumen lintas-modul yang jelas.

## Keputusan yang masih perlu W (dicatat di audit doc, BELUM diputuskan sepihak)

1. Cakupan Sesi C pertama — sekaligus semua atau dipecah per-domain.
2. Nama event baru untuk domain yang 0% (`account.updated`?
   `titipan.updated`? dst).
3. Apakah Sesi C ini juga mencakup wiring listener (`AIService.wireEvents()`
   masih belum subscribe `investment.updated` per temuan lama
   AUDIT-AI-WIRING-GAP.md sesi B1), atau murni sisi emit dulu.

## Yang TIDAK dikerjakan sesi ini (sengaja)

- 0 kode produksi diubah.
- 0 test baru ditambah (audit dokumen, bukan coding).
- Tidak menebak nama event baru atau langsung menambah `AIBus.emit()` di
  mana pun — sesuai instruksi eksplisit roadmap §7 Sesi C ("daftar
  konsumen, bukan langsung ubah").

## File di patch ini

- `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` (baru)
- `SESSION-NOTE-sesi-c-audit-eventbus-v1651.md` (baru, ini)
- `CHANGELOG.md` (ditambah entri di paling atas)

Versi tetap **v1651** (0 source disentuh, konsisten dgn konvensi
docs-only session seperti S699/S700/B1 sebelumnya).
