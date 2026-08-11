# BLUEPRINT_CONSOLIDATION_PLAN.md

> Dibuat oleh TASK-001C (Blueprint Consolidation Plan), dokumentasi
> saja. Tidak ada source code/build/test yang diubah, tidak ada
> placeholder di `docs/architecture/*.md` yang diisi, tidak ada
> keputusan arsitektur baru yang dibuat di sini — dokumen ini murni
> mencatat Keputusan Arsitektur Resmi yang sudah diberikan user, plus
> memetakan apa yang masih perlu terjadi sebelum populasi bisa
> dilakukan.

---

## 1. Daftar Dokumen Canonical

Ditetapkan resmi oleh user pada sesi ini sebagai Source of Truth:

| Dokumen | Status isi | Sumber canonical |
|---|---|---|
| `BP-015.md` | **BELUM LENGKAP** — akan ditulis ulang jadi 1 dokumen utuh (bukan Part 2/3 lama) | Menunggu draft baru dari user |
| `ADR-022.md` — Dependency Isolation | Lengkap, siap populasi | `NexusV6_ADR022.zip` |
| `ADR-023.md` — Storage Isolation | Lengkap, siap populasi | `NexusV6_ADR023.zip` |
| `ADR-024.md` — Event & Adapter Communication | Lengkap, siap populasi | `NexusV6_ADR024.zip` |
| `ADR-025.md` — Build & Release Integrity | Lengkap, siap populasi | `NexusV6_ADR025.zip` |
| `ADR-026.md` — Documentation & AI Handoff | Lengkap, siap populasi | `NexusV6_ADR026.zip` |
| `IS-001.md` — Implementation Specification | Lengkap, siap populasi | `NexusV6_IS001.zip` |
| `AR-001.md` — Architecture Rules | Lengkap, siap populasi | `NexusV6_AR001_DoD001.zip` |
| `DoD-001.md` — Definition of Done | Lengkap, siap populasi | `NexusV6_AR001_DoD001.zip` |

**8 dari 9 dokumen canonical sudah lengkap isinya dan siap dipopulasikan
ke placeholder.** BP-015 adalah satu-satunya yang masih menunggu.

## 2. Daftar Dokumen Deprecated (diabaikan)

| File | Alasan deprecated |
|---|---|
| `NexusV6_Blueprint_v1_Draft.zip` | Berisi stub 1 baris untuk BP-015 + ADR-022–026 + IS-001/AR-001/DoD-001 — draft awal, sudah digantikan versi lengkap. |
| `Volume-01_Master_Blueprint_Draft.docx` | Bukan BP-015 Part 1 (dikonfirmasi user). Draft paralel dengan struktur bab sendiri, tidak dipakai. |
| `Volume-02_ADR_Draft.docx` | Draft ringkasan ADR-022–026 versi awal, digantikan versi lengkap `NexusV6_ADR0XX.zip`. |
| `NexusV6_BP015_Part2.zip` | BP-015 lama berbasis skema "Part" — dibatalkan, digantikan 1 dokumen utuh. |
| `NexusV6_BP015_Part3_Final.zip` | Sama seperti di atas — termasuk isi Governance/Acceptance Criteria yang perlu ditulis ulang di BP-015 baru (lihat §6). |

Seluruh file di atas TIDAK dipakai sebagai sumber isi apa pun mulai
sesi ini dan seterusnya.

## 3. Migration Plan

Populasi placeholder `docs/architecture/*.md` **tidak dilakukan pada
sesi ini** (task ini scope-nya cuma Consolidation Plan, bukan
populasi). Urutan migrasi yang direkomendasikan untuk sesi
berikutnya (TASK-001D atau setara):

1. **Tahap 1 — Populasi 8 dokumen yang sudah lengkap**: `ADR-022.md`
   s/d `ADR-026.md`, `IS-001.md`, `AR-001.md`, `DoD-001.md`, isi
   sesuai versi canonical (§1), status diubah dari DRAFT ke versi
   final sesuai isi yang diberikan.
2. **Tahap 2 — BP-015**: menunggu draft BP-015 baru (1 dokumen utuh)
   dari user. Setelah diterima, isi `BP-015.md`, JANGAN mengambil
   konten apa pun dari Part 2/Part 3 lama atau Volume-01 (semua
   deprecated, §2).
3. **Tahap 3 — Cross-check pasca-populasi**: setelah Tahap 1 & 2
   selesai, jalankan review silang IS-001 §References (BP-015,
   ADR-022–026, AR-001, DoD-001) terhadap isi final — pastikan tidak
   ada rujukan ke bagian BP-015 yang ternyata belum tercakup di
   dokumen baru.

**Placeholder TIDAK diisi berdasarkan interpretasi sendiri** (sesuai
Repository Rule dari user) — Tahap 1 baru dieksekusi setelah ada
instruksi eksplisit berikutnya untuk melakukan populasi.

## 4. Dependency Map

```
BP-015 (utuh, akan ditulis ulang)
  │
  ├── ADR-022 Dependency Isolation ─────┐
  ├── ADR-023 Storage Isolation ────────┤
  ├── ADR-024 Event & Adapter Comm ─────┼──> diacu oleh IS-001 §References
  ├── ADR-025 Build & Release Integrity ┤
  ├── ADR-026 Documentation & Handoff ──┘
  │
  ├── AR-001 Architecture Rules  (meringkas/menegakkan ADR-022,023,024)
  │
  ├── IS-001 Implementation Spec (mengacu ke BP-015 + semua ADR + AR-001 + DoD-001)
  │
  └── DoD-001 Definition of Done (syarat selesai: sesuai BP-015 & ADR,
                                    build sukses, test lulus, docs/ai
                                    diperbarui, ZIP dibuat)
```

Governance/urutan-presedensi ("Blueprint > ADR > IS > AR > DoD >
Source implementation") sebelumnya HANYA disebutkan di BP-015 Part 3
lama (§15, sekarang **deprecated**). Ini **belum dikonfirmasi ulang**
di dokumen canonical manapun yang sudah diterima — perlu ditegaskan
kembali secara eksplisit di BP-015 versi baru (dicatat sebagai item
di §6 Roadmap, bukan diasumsikan berlaku otomatis).

## 5. Cross-Reference — Temuan yang Perlu Diperhatikan

Membandingkan isi ADR/IS/AR canonical dengan kondisi repository nyata
(`docs/ai/FOUNDATION_AUDIT.md`, TASK-001) ditemukan beberapa titik
yang **berpotensi bertentangan** dengan arsitektur existing. Ini
**bukan konflik antar-dokumen Blueprint**, melainkan potensi gap
antara Blueprint (untuk Milestone 0 ke depan) dan kode yang sudah
berjalan — dicatat untuk diputuskan user, TIDAK diputuskan di sini:

- **ADR-023 (Storage Isolation)** — "Storage dipisahkan per domain,
  tidak ada akses langsung ke storage domain lain." Kondisi
  repository saat ini: **satu** IndexedDB generik (`kw_idb_v1`, object
  store `kv`), dipakai bersama oleh `D`, LifeOS, EIE, dan AI Core lewat
  key masing-masing (`FOUNDATION_AUDIT.md` §3). Ini pola "shared store,
  isolated key" — bukan "storage terpisah per domain" secara harfiah.
  **Perlu klarifikasi**: apakah ADR-023 berlaku retroaktif ke storage
  existing, atau hanya mengikat modul BARU (mis. Vehicle Catalog) mulai
  sekarang?
- **ADR-022 (Dependency Isolation)** — "Modul hanya berkomunikasi
  melalui Adapter atau Event... tidak boleh mengakses storage modul
  lain secara langsung." Kondisi repository: banyak modul mengakses
  `IDBStore` (co-located di `modules/asset/aset.js`) secara langsung
  lintas-domain (`FOUNDATION_AUDIT.md` §3/§6), dan window-global
  function call lintas modul adalah pola dominan, bukan Adapter murni
  di semua tempat. Sama seperti di atas — perlu klarifikasi cakupan
  (modul baru vs retroaktif).
- **IS-001 §Folder Standard** — `modules/<module>/{api,engine,store,
  ui,tests,docs}/`. Kondisi repository: modul existing (termasuk
  `modules/vehicle/`) pakai struktur flat `modules/<domain>/*.js`, TIDAK
  bersubfolder `api/engine/store/ui/tests/docs`. Untuk Vehicle Catalog
  (Milestone 0), perlu diputuskan apakah folder standard IS-001 wajib
  diikuti persis (struktur baru) atau modul baru tetap mengikuti
  konvensi flat yang sudah ada demi konsistensi dengan `modules/vehicle/`
  existing.

Ketiga poin di atas tidak menghalangi pembuatan Consolidation Plan ini,
tapi **akan menghalangi implementasi Milestone 0** kalau belum
diklarifikasi — dicantumkan di roadmap (§6) sebagai prasyarat.

## 6. Blueprint Completion Roadmap

| # | Item | Status | Blocking Milestone 0? |
|---|---|---|---|
| 1 | Draft BP-015 versi utuh (bukan Part-based) | **Diterima & dipopulasikan (Tahap 2, TASK-001E)** — lihat §8 untuk temuan cross-check yang muncul | Ya — lihat §8, ada temuan baru |
| 2 | Populasi ADR-022–026, IS-001, AR-001, DoD-001 ke placeholder | Siap dieksekusi, menunggu instruksi | Ya (perlu jadi bagian repo, bukan cuma di chat) |
| 3 | Klarifikasi presedensi Blueprint > ADR > IS > AR > DoD (§4) — tegaskan ulang di BP-015 baru, jangan diwarisi dari Part 3 lama yang sudah deprecated | Menunggu | Tidak langsung, tapi disarankan sebelum populasi Tahap 1 |
| 4 | Klarifikasi cakupan ADR-022/ADR-023 (retroaktif vs modul baru saja) | **Diputuskan (lihat §7)** — forward-only, tidak retroaktif | Tidak lagi — resolved |
| 5 | Klarifikasi cakupan IS-001 Folder Standard utk modul baru vs existing | **Diputuskan (lihat §7)** — `modules/vehicle/` tetap flat | Tidak lagi — resolved |
| 6 | Setelah 1–5 selesai: baru boleh mulai IS-001 §Verification ("Repository Audit selesai" — sudah ✅ via TASK-001, sisanya build/test/docs/ZIP menyusul saat implementasi) | Belum dimulai | — |

**Kesimpulan**: Repository dokumentasi sudah siap secara struktural
(`docs/architecture/` ada, 9 placeholder terverifikasi utuh). Yang
menahan progres ke Milestone 0 bukan lagi soal versi/konflik dokumen
(sudah diselesaikan lewat Keputusan Arsitektur Resmi ini), melainkan:
(a) BP-015 belum lengkap, dan (b) 3 titik gap Blueprint-vs-repository
di §5 yang belum diklarifikasi.

## 7. Keputusan Cakupan Gap §5 (TASK-001D)

Ditetapkan resmi oleh user pada sesi ini. Aturan berlaku **forward-only**
(mengikat modul baru ke depan), **bukan migrasi retroaktif** ke kode
existing — dipilih karena ketiganya kebetulan sudah selaras dengan pola
yang terbukti jalan di repo (`FOUNDATION_AUDIT.md`), sehingga migrasi
retroaktif hanya menambah risiko (menyentuh 447/447 test yang lulus)
tanpa manfaat jelas untuk Milestone 0:

| Gap | Keputusan | Dasar |
|---|---|---|
| ADR-023 (Storage Isolation) | **Tidak retroaktif.** Pola "satu object store `kv`, satu key top-level per subsistem" (`lifeos:store`, `eie:store`, `ai:store`) diakui SAH sebagai bentuk isolasi ADR-023 — bukan pelanggaran. Modul baru (mis. Vehicle Catalog) wajib ikut pola ini (`vehicle-catalog:store`), termasuk registrasi manual ke `backup-restore.js`. | `FOUNDATION_AUDIT.md` §3 |
| ADR-022 (Dependency Isolation) | **Tidak retroaktif.** Pola adapter function-call (`lifeos/adapters/*`, `economic-intelligence/adapters/*`, `_aiContext*()`) sudah dianggap sesuai semangat ADR-022. Modul existing tidak direfactor; modul baru wajib pakai pola adapter yang sama, reuse `AIBus` bila perlu event reaktif — jangan bikin bus baru. | `FOUNDATION_AUDIT.md` §5 |
| IS-001 Folder Standard | **`modules/vehicle/` tetap flat** (konsisten dengan 46 file existing yang 100% sinkron dengan `scripts/build.js`) — tidak direstrukturisasi ke `{api,engine,store,ui,tests,docs}`. Subfolder IS-001 berlaku untuk domain/top-level module yang benar-benar baru ke depannya. | `FOUNDATION_AUDIT.md` §2, §6 |

Item #4 dan #5 di §6 Roadmap dinyatakan **resolved**. Sisa blocker
Milestone 0 tinggal item #1 (draft BP-015 utuh) dan #2 (populasi
ADR-022–026/IS-001/AR-001/DoD-001 — isi kontennya sendiri belum
berubah pada sesi ini, hanya cakupan/interpretasinya yang diputuskan).

---
*Dibuat oleh TASK-001C/TASK-001D, dokumentasi saja. Tidak ada perubahan
source code/build/test. Tidak ada placeholder isi teknis ADR-022,
ADR-023, atau IS-001 yang dipopulasikan pada sesi ini (§7 hanya
mencatat keputusan cakupan, bukan isi ADR itu sendiri — isi tetap
menunggu `NexusV6_ADR022.zip`/`NexusV6_ADR023.zip`/`NexusV6_IS001.zip`
sesuai §1). Tidak ada keputusan arsitektur baru yang dibuat di luar
yang sudah diberikan user — seluruh isi dokumen ini murni pencatatan
Keputusan Arsitektur Resmi dari user dan pemetaan gap yang sudah ada.*

## 8. Tahap 3 Cross-Check — BP-015 (populated) vs Repository Nyata (TASK-001E)

BP-015 utuh sudah diterima dan dipopulasikan ke `BP-015.md` pada sesi
ini (item #1 §6). Sesuai instruksi Migration Plan §3 Tahap 3, berikut
cross-check awal terhadap `docs/ai/FOUNDATION_AUDIT.md` — **dicatat
sebagai temuan terbuka, bukan keputusan sepihak**, karena skala
konfliknya jauh lebih besar dari 3 gap ADR-022/023/IS-001 yang sudah
diputuskan di §7 (yang itu hanya menyangkut modul baru; ini menyangkut
kesesuaian BP-015 dengan **seluruh 358 file existing**):

| # | Pasal BP-015 | Kondisi Repository Nyata | Skala Konflik |
|---|---|---|---|
| 1 | BAB 11 §11.3 — modul wajib class/factory dengan `init()/mount()/unmount()/getState()`, **auto-eksekusi dilarang keras** | `FOUNDATION_AUDIT.md` §2: seluruh domain expose lewat `window.<Nama>` di akhir file — pola ini pada praktiknya self-executing/IIFE-style, bukan factory yang di-mount Kernel | **Tinggi** — hampir seluruh 358 file berpotensi "melanggar" secara harfiah |
| 2 | BAB 8 §8.5 & BAB 10 §10.5 — struktur wajib `/src/group_a_core/`, `/src/group_b_modules/<domain>/` | Repo aktual: `modules/<domain>/*.js` flat di root, tanpa prefix `/src`, tanpa nested `/group_a_core` `/group_b_modules` | **Tinggi** — struktur folder root berbeda total dari yang dipatenkan BP-015 |
| 3 | BAB 21 §21.3 — properti objek wajib privat (`#field` ES6 atau closure), dilarang expose objek publik mutlak | Pola dominan repo: objek/fungsi domain diekspos publik via `window.X` agar bisa saling dipanggil (`FOUNDATION_AUDIT.md` §5, pola adapter/function-call) | **Sedang–Tinggi** — bertentangan langsung dengan pola komunikasi lintas-modul yang justru direkomendasikan `FOUNDATION_AUDIT.md` §5 |
| 4 | BAB 20 §20.3 — dilarang direct function call (RPC) lintas modul, wajib Message Passing via Registry | `FOUNDATION_AUDIT.md` §5: pola paling konsisten di repo justru function-call langsung via adapter tipis (`lifeos/adapters/*`, `_aiContext*()`) — sudah diputuskan **forward-only, tidak direfactor** di §7 untuk ADR-022 | **Tinggi** — BP-015 (dokumen tertinggi) tampak lebih ketat daripada ADR-022 yang sudah diputuskan cakupannya |
| 5 | BAB 13 §13.3 — setiap record wajib `id/createdAt/updatedAt/isDeleted` (soft delete) | Struktur data existing lebih sederhana, mis. `D.vehicles: {id, name, emoji, serviceIntervalKm}` tanpa `createdAt/updatedAt/isDeleted` (`FOUNDATION_AUDIT.md` §6) | **Sedang** — additive-only sudah jadi aturan proteksi `D.vehicles` (§6 audit), belum tentu align dengan skema wajib BP-015 |
| 6 | BAB 29 §29.3 — BP-015 adalah **"HUKUM TERTINGGI"**; kode yang melanggar "dianggap cacat (void) dan harus ditolak/dihapus (reverted)" | Bertentangan langsung dengan keputusan §7 sesi ini (ADR-022/023/IS-001 forward-only, tidak retroaktif) — BP-015 secara literal tidak memberi pengecualian untuk kode legacy | **Kritis** — ini pertanyaan cakupan paling mendasar, mendahului semua ADR di bawahnya sesuai presedensi §4 |

**Kesimpulan sementara**: BP-015 seperti yang diterima menjelaskan
arsitektur ES-Module/class-based yang jauh berbeda dari pola
window-global/IIFE yang sudah dipakai konsisten di 358 file repo
existing. Ini **bukan kesalahan tulis** — bisa jadi memang BP-015
dimaksud sebagai standar untuk arsitektur baru/generasi berikutnya
(Nexus V6), sementara kode existing yang diaudit adalah generasi
sebelumnya yang belum tentu dimaksud untuk diselaraskan penuh.

## 9. Keputusan Cakupan BP-015 (TASK-001F)

Ditetapkan resmi oleh user pada sesi ini, menyelesaikan temuan kritis
§8 poin #6:

**BP-015 berlaku forward-only (standar generasi baru) — tidak
retroaktif ke 358 file existing.**

Dasar keputusan:

1. Merefactor 358 file existing (yang 447/447 test-nya lulus dan
   build-nya 100% sinkron, `FOUNDATION_AUDIT.md` §1–§2) ke class/factory
   + `#privateField` + struktur `/src/group_a_core`/`/src/group_b_modules`
   berisiko regresi jauh melebihi manfaat arsitektural — tidak
   proporsional untuk kode yang sudah SEHAT.
2. Retroaktif penuh akan **membatalkan** keputusan forward-only ADR-022/
   ADR-023/IS-001 yang sudah diambil di §7 — supaya presedensi
   "Blueprint > ADR > IS > AR > DoD" tetap konsisten di semua level,
   cakupan BP-015 harus selaras: forward-only juga.
3. §29.3 BP-015 ("HUKUM TERTINGGI", kode melanggar = void) dipahami
   berlaku untuk kode yang ditulis **setelah** BP-015 diresmikan —
   bukan literal menghapus 358 file lama. Ini interpretasi yang
   disepakati, bukan yang tertulis eksplisit sebagai pengecualian di
   teks BP-015 itu sendiri — dicatat di sini supaya tidak ambigu di
   sesi berikutnya.
4. **Konsekuensi lanjutan yang masih terbuka**: modul baru (mis.
   Vehicle Catalog) yang ditulis penuh mengikuti BP-015 (class/factory,
   lifecycle interface, Message Passing via Registry) tetap harus bisa
   berinteraksi dengan 358 file lama yang masih `window.X`. Ini
   membutuhkan **lapisan jembatan (bridge/adapter) eksplisit** antara
   dunia lama dan dunia baru — belum didesain, dicatat sebagai item
   baru di §10, bukan diasumsikan otomatis beres.

Poin #6 §8 dinyatakan **resolved**. Poin §8 #1–#5 (konflik pasal
spesifik BP-015 vs pola existing) mengikuti resolusi yang sama:
masing-masing berlaku untuk kode baru saja, existing tidak direfactor.

## 10. Roadmap Lanjutan (pasca-TASK-001F)

| # | Item | Status | Blocking Milestone 0? |
|---|---|---|---|
| 1 | Desain lapisan bridge/adapter antara modul BP-015-compliant baru dan 358 file window-global existing | Belum dimulai | Ya — diperlukan begitu modul baru pertama (Vehicle Catalog) mulai memanggil/menerima panggilan dari kode lama |
| 2 | Populasi ADR-022–026, IS-001, AR-001, DoD-001 (isi teknis, bukan hanya cakupan) | Siap dieksekusi, menunggu `NexusV6_*.zip` | Ya |
| 3 | Review apakah isi teknis 8 dokumen canonical (setelah tersedia) juga konsisten forward-only dengan keputusan §7/§9 | Menunggu item #2 | Tidak langsung |

---
*Ditambahkan oleh TASK-001E/TASK-001F. Cross-check dan keputusan
cakupan dokumentasi saja — tidak ada source/build/test yang diubah.
`BP-015.md` dipopulasikan apa adanya sesuai draft user tanpa diedit
isinya; §9 hanya mencatat keputusan cakupan penerapannya.*
