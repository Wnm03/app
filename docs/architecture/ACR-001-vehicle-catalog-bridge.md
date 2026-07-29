# ACR-001 — Vehicle Catalog Milestone 0: Pola Implementasi Belum Ditentukan

> **Status: ACCEPTED by Project Owner (Opsi A).**
> Keputusan diberikan langsung oleh Pemilik OS pada sesi ini:
> **Opsi A — Vehicle Catalog Milestone 0 Phase 1 menggunakan pola
> existing repository (`window.X` + adapter function-call + `IDBStore`
> generik, key `vehicle-catalog:store`)**, konsisten dengan 358 file
> legacy dan sejalan dengan `BLUEPRINT_CONSOLIDATION_PLAN.md` §7
> (TASK-001D). Keputusan ini **hanya berlaku untuk fitur Vehicle
> Catalog** — bukan perubahan isi `BP-015.md`, `ADR-022.md`..
> `ADR-026.md`, `IS-001.md`, `AR-001.md`, `DoD-001.md`, atau Governance
> manapun. Opsi B (BP-015 penuh: class/factory, `#field`, Message
> Passing via Registry) dan pertanyaan bridge/adapter §10 item #1
> **tetap terbuka** untuk modul BP-015-compliant di masa depan, di
> luar cakupan ACR ini.

## 1. Konteks

Vehicle Catalog Milestone 0 Phase 1 belum pernah diimplementasikan di
repository ini (terverifikasi: tidak ada `vehicle-catalog.js`, tidak
ada test terkait, tidak ada entri di `scripts/build.js`). Saat mulai
menulis implementasi, ditemukan bahwa `BLUEPRINT_CONSOLIDATION_PLAN.md`
§10 sendiri sudah mencatat blocker ini sebagai belum selesai — bukan
temuan baru dari sesi ini.

## 2. Masalah

Ada dua sumber keputusan cakupan yang **saling bertentangan** untuk
pola kode yang harus dipakai modul baru (Vehicle Catalog):

| Sumber | Keputusan | Kapan |
|---|---|---|
| `BLUEPRINT_CONSOLIDATION_PLAN.md` §7 (TASK-001D) | Modul baru boleh pakai pola **adapter function-call existing** (`window.X`, gaya `lifeos/adapters/*`/`_aiContext*()`) — dianggap sudah sesuai semangat ADR-022 | Sebelum `BP-015.md` terisi |
| `BP-015.md` BAB 11/20/21 + `BLUEPRINT_CONSOLIDATION_PLAN.md` §9 (TASK-001F) | Kode baru wajib **class/factory** dengan `init()/mount()/unmount()/getState()`, field privat (`#field`), **dilarang** direct function call/`window.X` publik, wajib Message Passing via Registry | Setelah `BP-015.md` terisi, forward-only utk kode baru |

`BLUEPRINT_CONSOLIDATION_PLAN.md` §8 poin 6 menandai ini **"Kritis"**
dan §10 mencatat lapisan bridge/adapter antara dua dunia ini **"Belum
dimulai"**, **blocking Milestone 0**. Belum ada rekonsiliasi eksplisit
di dokumen manapun untuk kasus konkret Vehicle Catalog.

Tambahan: `DoD-001.md`, `AR-001.md`, `IS-001.md` isi teknisnya masih
placeholder kosong (menunggu `NexusV6_*.zip` yang tidak ada di ZIP
ini) — sehingga tidak ada kriteria "selesai" yang sah untuk
disandarkan Definition of Done Milestone 0 Phase 1.

## 3. Kenapa ini bukan hal yang bisa saya putuskan sendiri

Memilih salah satu pola berarti menentukan interpretasi cakupan
BP-015 vs ADR-022 untuk modul konkret pertama yang akan menguji
keputusan itu — persis jenis keputusan yang menurut instruksi
eksplisit harus berhenti dan dieskalasi, bukan diasumsikan.

## 4. Opsi yang tersedia (tidak direkomendasikan salah satu secara sepihak)

**Opsi A — Ikuti §7 (pola adapter existing, `window.X`)**
- Konsisten dengan 358 file lain, risiko regresi minimal, cepat.
- Bertentangan literal dengan BP-015 BAB 11/20/21 untuk kode "baru".

**Opsi B — Ikuti BP-015 penuh (class/factory, `#field`, Registry)**
- Sesuai teks BP-015 forward-only apa adanya.
- Butuh lapisan bridge/adapter yang menurut §10 "belum dimulai" —
  tanpa itu, Vehicle Catalog tidak bisa terhubung ke `D.vehicles`,
  `curVehicleId`, `backup-restore.js`, atau `scripts/build.js` (semua
  masih `window.X`) tanpa melanggar BP-015 §20.3 (larangan direct
  call) atau §21.3 (larangan expose publik).

**Opsi C — Pemilik OS menuliskan keputusan cakupan eksplisit** (sama
seperti §7/§9 dibuat sebelumnya) khusus untuk kasus ini, sebelum
implementasi dimulai.

## 5. Yang saya butuhkan dari Anda

Satu keputusan eksplisit: pola mana yang berlaku untuk Vehicle
Catalog Milestone 0 Phase 1 (Opsi A, B, atau varian lain yang Anda
tentukan) — dicatat sebagai Keputusan Arsitektur Resmi berikutnya,
sama seperti alur §7/§9 di `BLUEPRINT_CONSOLIDATION_PLAN.md`.

Setelah ada keputusan itu, saya lanjutkan implementasi penuh (storage,
CRUD, search, validation, unit test, integrasi build/backup-restore/
Car Notes, dokumentasi, build final, ZIP) tanpa mengulang audit ini.

## 6. Resolusi

**Diputuskan: Opsi A.** Vehicle Catalog Milestone 0 Phase 1 diimplementasikan
mengikuti pola existing repository:

- Storage: `IDBStore.get('vehicle-catalog:store')` /
  `IDBStore.set('vehicle-catalog:store', ...)` — reuse helper generik
  di `modules/asset/aset.js`, tidak membuat DB/object store baru.
- Modul diekspos via `window.VehicleCatalog` (pola sama seperti
  `window.Aset`, `window.VehicleCore`, dst).
- Komunikasi lintas-modul: adapter function-call tipis, guard
  `typeof fn === 'function'`, sama seperti `_aiContext*()` /
  `lifeos/adapters/*`.
- Integrasi: entri baru di `scripts/build.js` (GROUP_B, domain
  vehicle), registrasi manual di `modules/shared/backup-restore.js`,
  tab baru di dalam `page:'carnotes'` (mengikuti pola
  `setCnInsightTab`/`setCnBbmTab`).
- Tidak mengubah struktur `D.vehicles`, `curVehicleId`/`selectVehicle()`,
  atau file `modules/vehicle/*.js` existing.

DoD ad-hoc untuk Phase 1 ini (karena `DoD-001.md` canonical masih
placeholder kosong): seluruh test lama tetap PASS + test baru untuk
Vehicle Catalog PASS, `node scripts/build.js` sukses tanpa error lint
guard, `docs/ai/PROJECT_STATUS.md`/`AI_HANDOFF.md`/`CHANGELOG.md`
diperbarui, ZIP rilis dibuat. Ini bukan pengganti `DoD-001.md`
canonical — hanya kriteria kerja untuk sesi ini, dicatat eksplisit
supaya tidak dianggap sebagai isi resmi DoD-001.
