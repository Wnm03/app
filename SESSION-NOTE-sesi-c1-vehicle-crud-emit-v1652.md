# Session Note — Sesi C-1: `vehicle.updated` di CRUD Kendaraan (v1651 → v1652)

**Ref:** `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` §Prioritas Tinggi #1
(sesi sebelumnya, audit-only). Item ini dipilih duluan dari daftar audit
karena paling rendah risiko: **replikasi persis** pola `vehicle.updated`
yang sudah ada & terbukti jalan (dipakai sisi servis di
`sparepart-servis-b.js`/`car-notes.js Servis.markServiced()`), 0 nama
event baru perlu diputuskan W, 0 keputusan desain lain yang menggantung.

## Yang dikerjakan

`modules/vehicle/vehicle-core.js` — 3 titik CRUD kendaraan sekarang emit
`AIBus.emit("vehicle.updated", ...)` (guard `typeof AIBus!=="undefined"`,
pola sama persis titik lain):

1. `saveVehicle()` cabang **edit** (kendaraan existing) —
   `{kind:"vehicle", action:"edit", vehicleId}`.
2. `saveVehicle()` cabang **create** (kendaraan baru) —
   `{kind:"vehicle", action:"create", vehicleId}`.
3. `delVehicle(i)` — `{kind:"vehicle", action:"delete", deletedId}` (id
   diambil SEBELUM `splice()`, pola sama `aset.js` yg emit
   `{deletedId:id}` saat hapus asset).
4. `saveKm()` (update KM manual, bukan cuma CRUD kendaraan tapi state
   kendaraan yang sama relevan-nya) — `{kind:"km", vehicleId}`.

Emit ditaruh **setelah** `save()` (pola sama persis
`sparepart-servis-b.js saveServis()`), sebelum re-render — jadi listener
manapun yang subscribe nanti dapat data yang sudah ke-persist.

## Test baru

`tests/vehicle-core-crud-aibus-vehicle-updated-sesi-c.test.js` — 5 test:
create/edit/delete/saveKm masing-masing emit dgn payload benar, + 1 test
guard AIBus tidak ada (3 fungsi tetap tidak throw). Harness `loadSource` +
`document.getElementById` mock minimal (pola sama
`vehicle-asset-auto-create-opsiA.test.js`).

Catatan teknis kecil (untuk sesi berikutnya kalau butuh pola serupa):
`vehEditIdx` dideklarasikan `let` di top-level `vehicle-core.js` — vm
context TIDAK menempelkan binding `let`/`const` ke context object secara
otomatis (beda dari `function`/`var`), jadi tidak bisa di-set langsung
lewat `ctx.vehEditIdx = 0` dari luar. Diakali dgn menjalankan
`vm.Script('vehEditIdx = 0;').runInContext(ctx)` — context yang
dikembalikan `loadSource()` tetap vm context yang sama & lexical
environment top-level-nya persisten antar-eksekusi `Script`, jadi
assignment ini benar-benar mengubah binding yang dipakai fungsi
`saveVehicle()`. (0 perubahan di `loadSource.js` sendiri, murni teknik di
sisi test.)

## Verifikasi

Full suite: 6163 test (6158 lama + 5 baru), 6152 pass, 11 fail — 11
kegagalan **identik** (nama & lokasi test yang sama persis) dengan
baseline v1651 (pre-existing, sudah didokumentasikan sebelumnya, tidak
terkait perubahan sesi ini). **0 regresi.**

## Yang BELUM dikerjakan (sengaja, di luar scope sesi ringan ini)

Sisa temuan audit (Prioritas Tinggi #2 `delTx()`, transfer/renov/target/
stok-sparepart, utang-piutang, tagihan, akun; Prioritas Sedang Dana
Titipan/Shop/Zakat/investasi.js) **belum disentuh** — per prinsip "1 sesi
1 fokus kecil" (§7 roadmap), dan karena beberapa di antaranya masih perlu
keputusan nama event baru dari W (`account.updated`? `titipan.updated`?)
sebelum aman dikerjakan. Lihat file audit untuk daftar lengkap +
keputusan yang masih menggantung.

Wiring listener (`AIService.wireEvents()` belum subscribe
`vehicle.updated` maupun event lain kecuali investasi — lihat
AUDIT-AI-WIRING-GAP.md sesi B1) juga belum disentuh — sesi ini murni sisi
emit, sama seperti scope literal §7 "perluas pola emit".

## File di patch ini

- `modules/vehicle/vehicle-core.js` (diedit — 3 titik emit baru)
- `tests/vehicle-core-crud-aibus-vehicle-updated-sesi-c.test.js` (baru)
- `SESSION-NOTE-sesi-c1-vehicle-crud-emit-v1652.md` (baru, ini)
- `CHANGELOG.md` (ditambah entri di paling atas)
- `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` (dari sesi audit
  sebelumnya, disertakan lagi supaya patch ini tetap lengkap/mandiri)

Versi naik ke **v1652** (source disentuh, beda dari sesi audit
sebelumnya yang docs-only).
