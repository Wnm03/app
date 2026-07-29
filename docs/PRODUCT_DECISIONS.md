# PRODUCT_DECISIONS.md — Keputusan produk final (permanen)

Ditambahkan Sesi 26 (2026-07-18). Berisi keputusan produk yang SUDAH
final — kalau sebuah TODO/blocker jawabannya ada di sini, langsung
implementasikan, JANGAN tanya ulang ke user.

## Smart AI — Navigation

Alur navigasi AI:

```
Dashboard Card
      ↓
AI Command Center
```

Tidak membuat menu AI baru — reuse `FEATURE_REGISTRY` existing & reuse
`showPage()` existing. **Tidak membuat router baru** kalau router
existing sudah cukup.

**Dampak ke TODO.md #6b (Tahap 2 — Navigation wiring/Router wiring):**
Ini keputusan yang selama ini ditunggu (dicatat "scope belum jelas"
sejak Sesi 22). Sekarang jelas: navigation/router wiring = pastikan
entry LifeOS/AI sudah bisa dijangkau lewat `FEATURE_REGISTRY` +
`showPage()` existing (pola sama seperti Sesi 22 Registry). TIDAK perlu
bikin sistem router baru. Sub-item ini SUDAH BISA dikerjakan mulai
sesi berikutnya tanpa nanya user lagi — verifikasi dulu apa yang
konkret masih kurang (audit kecil, bukan audit ulang seluruh project).

## Smart AI — Daily Briefing (struktur 5 bagian)

`dailyBriefing()` WAJIB terdiri dari 5 bagian:

1. Finance Summary
2. Delivery Summary
3. Reminder Summary
4. Target Summary
5. Recommendation Summary

**Dampak ke TODO.md #8 (Tahap 5 — Daily Summary/Reminder Summary):**
Ini keputusan yang selama ini ditunggu (dicatat "butuh keputusan
produk soal struktur pembagian" sejak Sesi 23). Sekarang jelas:
- Finance Summary = `financialSummary` (Sesi 23, sudah ada).
- Delivery Summary = `deliverySummary` (Sesi 15, sudah ada).
- Reminder Summary = BARU, sumber data ditentukan lewat **Reminder
  Priority** di bawah.
- Target Summary = BARU, kemungkinan besar reuse `goalAdapterList()`
  (`lifeos/adapters/goal-adapter.js`, Sesi 25) sebagai sumber data
  target/goal — **cross-check dulu apakah reuse lintas `lifeos/` dari
  `modules/ai/` melanggar arsitektur "LifeOS read-only orchestration
  layer" (lihat `docs/LIFEOS_SCOPE.md`) sebelum diimplementasikan; kalau
  ada konflik arsitektur, itu baru butuh keputusan produk tambahan.**
- Recommendation Summary = `recommendations` (Sesi 11, sudah ada).

**Audit Sesi 40 — status "Daily Summary (terstruktur per bagian)"
(`ROADMAP.md` Tahap 5): TIDAK butuh keputusan produk baru.** Struktur
5-bagian di atas SUDAH final sejak Sesi 26. Checkbox "Daily Summary"
di `ROADMAP.md` akan otomatis lengkap begitu Reminder Summary & Target
Summary (2 field yang masih kosong) selesai diimplementasikan — bukan
item terpisah yang butuh desain sendiri. Sesi implementasi berikutnya
JANGAN tanya ulang soal struktur ini.

**Audit Sesi 40 — cross-check arsitektur Target Summary: TIDAK ADA
KONFLIK, sudah dijawab di `docs/LIFEOS_SCOPE.md` § "Di luar scope
LifeOS":** *"LifeOS boleh DIBACA dari AI ... tapi arahnya SATU jalur —
AI membaca LifeOS, bukan sebaliknya, dan LifeOS tidak boleh punya
dependency balik ke `modules/ai/*`."* Target Summary reuse
`goalAdapterList()` dari `modules/ai/ai-service.js` = AI membaca
LifeOS = arah yang diizinkan. **Keputusan final: `dailyBriefing()`
field `targetSummary` = hasil `goalAdapterList()` diangkat APA ADANYA
(pola sama persis dgn `financialSummary`/`deliverySummary` — TIDAK ada
rumus/agregasi baru), guard `typeof goalAdapterList === 'function'`
kalau LifeOS belum di-load, balik `null` kalau tidak tersedia (TIDAK
menebak data).**

## Smart AI — Reminder Priority

Urutan prioritas reminder (dipakai utk Reminder Summary di atas, dan
kapan pun perlu urutan domain):

```
Finance → Vehicle → Shop → Asset → Goal → LifeOS
```

**Keputusan final Sesi 40 — sumber data konkret Reminder Summary:**
Audit kode menemukan LifeOS SUDAH punya mesin agregasi read-only
lintas-domain yang persis cocok utk ini: `todayAdapterList()`
(`lifeos/adapters/today-adapter.js`) — registry-driven lewat
`LIFEOS_TODAY_SOURCES` (`bills`/`reminders`/`selfcare`/`payroll`/
`tukang`), sudah zero-touch terhadap `D`, sudah dipakai LifeOS Home.
Membuat mesin baru utk Reminder Summary akan **duplicate** mesin yang
sudah ada (dilarang, lihat § Umum di bawah) — padahal
`checkAndFireReminders()` (`reminder-notif.js`) TIDAK bisa dipakai
langsung krn dia bukan fungsi murni (side-effect: `fireNotif()`/DOM),
sama alasan `checkWeeklySalaryReset()` sengaja tidak dipanggil dari
`today-adapter.js` (lihat komentar di file itu).

**Keputusan:** `dailyBriefing()` field `reminderSummary` = hasil
`todayAdapterList()` diangkat APA ADANYA (pola sama dgn
`financialSummary`/`deliverySummary` — TIDAK ada rumus/agregasi baru,
TIDAK ada urutan/filter tambahan di luar yang sudah dihasilkan
`todayAdapterList()`), guard `typeof todayAdapterList === 'function'`
kalau LifeOS belum di-load, balik `null` kalau tidak tersedia.

**Catatan scope (BUKAN blocker sesi berikutnya):** urutan abstrak
"Finance → Vehicle → Shop → Asset → Goal → LifeOS" di atas belum
1:1 dgn 5 `key` yang ada di `LIFEOS_TODAY_SOURCES` saat ini (`bills`
mewakili Finance, tapi belum ada sumber Vehicle/Shop/Asset/Goal/LifeOS
eksplisit di registry itu — mis. pajak/SIM kendaraan yang dicek
`checkAndFireReminders()` belum masuk `LIFEOS_TODAY_SOURCES`). Ini
TIDAK menghalangi implementasi Reminder Summary sesi berikutnya (reuse
apa adanya seperti keputusan di atas) — perluasan `LIFEOS_TODAY_SOURCES`
ke domain lain (kalau suatu saat diinginkan) adalah pekerjaan
ADDITIVE terpisah di masa depan (tambah entry registry + builder baru,
pola sama dgn `todaySourceBills`/`todaySourceReminders` yang sudah
ada), BUKAN keputusan produk yang menghalangi sekarang.

## Smart AI — Tahap 6 AI Learning lanjutan (tampilan histori Terima/Tolak/Abaikan)

**Keputusan final Sesi 40:** histori/statistik Terima/Tolak/Abaikan per
rule ditampilkan sbg baris kecil TAMBAHAN di dalam kartu existing
`AIRecommendCard` (`ai-chat.js`), di bawah/samping teks rekomendasi
yang sudah ada — BUKAN halaman/route/chart baru, BUKAN modal baru.
Reuse penuh data yang SUDAH ADA & SUDAH dipersist:
`AIDecision.learn.getStats(ruleId)` (balikin
`{accepted, rejected, ignored}`) + `AIDecision.learn.getConfidence(ruleId)`
(sudah dipakai Sesi 19 utk urutan tampil). TIDAK ada storage/helper baru
— murni menampilkan angka yang sudah dihitung & disimpan sejak Sesi 14/19.
Format teks persis (mis. urutan angka, emoji, singkatan) diserahkan ke
implementasi teknis sesi berikutnya — itu bagian implementasi normal,
BUKAN keputusan produk tambahan, jangan tanya user lagi. Guard: kalau
`getStats`/`getConfidence` tidak tersedia atau rule belum pernah punya
histori (`accepted+rejected+ignored===0`), baris statistik TIDAK
ditampilkan sama sekali (bukan tampilkan 0/0/0 kosong) — konsisten dgn
pola "TIDAK menebak/menampilkan data yang belum ada" di seluruh project.

## Smart AI — Performance Check (Tahap 8 #4e)

Yang diukur:

- Context Collector
- Rule Evaluation
- Recommendation
- Daily Briefing
- Simulation

**Dampak ke TODO.md #4e (Tahap 8 — Performance Check, sub-item
terakhir):** Ini keputusan yang selama ini ditunggu (dicatat "scope
timing instrumentation perlu diperjelas" sejak Sesi 21). Scope-nya
sekarang jelas: ukur durasi eksekusi 5 fungsi di atas. **Cara ukur
konkret (mis. `performance.now()` di titik mana persis, hasilnya
disimpan di mana, format field `healthCheck().checks.performance`
seperti apa) masih perlu didesain teknis sesi implementasi — ini bagian
implementasi normal, BUKAN keputusan produk baru, jangan tanya user
lagi.**

## LifeOS — Zero-touch terhadap `D`

LifeOS tidak pernah menulis ke `D`. Seluruh `lifeos/adapters/*.js`
hanya membaca. Data milik LifeOS sendiri (projects generik, review log,
knowledge base) disimpan lewat `LifeOSStore` (`lifeos-store.js`),
namespace terpisah total dari `D`. (Keputusan lama, sudah diverifikasi
berkali-kali, lihat `README.md` § LifeOS.)

## LifeOS — Goal source `pensiun`/`fi`/`debt` (FINAL — Sesi 49)

**Keputusan final Sesi 49** (menjawab 2 pertanyaan terbuka yang dicatat
sejak Sesi 25, lihat `docs/CLAUDE.md` Sesi 25/49 utk detail lengkap):

- **pensiun/fi:** builder `goalSourcePensiun()`/`goalSourceFI()`
  (`lifeos/adapters/goal-adapter.js`) REUSE LANGSUNG
  `Pensiun.danaTerkumpul()`/`FI.netAssetFund()`/`FI.targetNominal()`
  (guard `typeof X!=='undefined'`) sbg currentAmount/targetAmount —
  BUKAN dihitung ulang murni dari parameter `D`. Konsekuensi yang
  disadari & diterima: kedua fungsi itu baca `D` dari CLOSURE modul
  masing-masing, jadi kalau adapter dipanggil dgn `D` palsu (test
  terisolasi tanpa `modules-calc.js` di-load), `Pensiun`/`FI` TIDAK
  terdefinisi → guard aktif → builder balik `[]` (aman, TIDAK throw).
  Alasan TIDAK memilih opsi "hitung ulang murni dari `D`": `FI.netAssetFund()`
  berantai ke banyak helper global lain (`totalSaldoAkun`,
  `totalCicilanOutstanding`, `totalDebtValue`, dll) — menduplikasi
  logic itu di adapter melanggar "Larangan duplikasi" (§ Umum bawah).
- **debt:** sumber data = `D.debts` (array per-utang individual,
  field `nilai`/`lunas` — lihat `modules/finance/piutang-utang.js`),
  BUKAN `D.debtStrategy` ({method, extra}, tanpa nominal/progress
  sama sekali). Registry `lifeos-registry.js` `LIFEOS_GOAL_SOURCES`
  entry `debt.dArr` diubah dari `debtStrategy` → `debts` sesi ini.
  Tiap utang aktif jadi 1 goal card (target=nilai, currentAmount=0
  progressPct=0 kalau belum lunas, currentAmount=nilai progressPct=100
  kalau `lunas===true`).

Lihat `lifeos/adapters/goal-adapter.js` (builder `goalSourcePensiun`/
`goalSourceFI`/`goalSourceDebt`) & `tests/lifeos-goal-adapter.test.js`
(+9 test baru, Sesi 49) utk implementasi lengkap.

## LifeOS — Life Object `sourceRef` (FINAL — Sesi 57)

**Keputusan final Sesi 57** (Batch 4, jawaban atas pertanyaan arsitektur
Life Object yang dicatat "belum final" sejak Sesi 55/56):

- Life Object `kind:"ref"` pakai `sourceRef = { domain: "...", id: "..." }`.
- `domain` HANYA boleh salah satu dari yang terdaftar di registry
  `LIFEOS_OBJECT_REF_SOURCES` (`lifeos-registry.js`) — minimal `goal`,
  `project`, `knowledge`, `review`. **Bukan referensi ke Life Object
  lain, bukan generic resolver bebas `{kind,id}`, bukan recursive,
  bukan wildcard domain.** Tiap entry registry minimal punya `label`,
  `resolver(id)`, `exists(id)` — sengaja hanya menerima `id` (bukan
  `D`/store sbg parameter), baca `D`/`LifeOSStore` lewat closure global
  dgn guard `typeof X !== 'undefined'` (pola sama persis dgn
  `goalSourcePensiun()`/`goalSourceFI()` mengakses `Pensiun`/`FI`,
  `docs/PRODUCT_DECISIONS.md` § Goal source di atas).
- Validasi saat create/update: `domain` wajib terdaftar, `id` wajib
  ada, `exists(id)` harus true — kalau gagal, balik validation error
  (`{valid:false, error:'...'}`), TIDAK PERNAH membuat object.
- **Scope MVP Sesi 57 (implementasi):** HANYA registry + resolver +
  validator (`lifeos/lifeos-object-ref.js`) + test. TIDAK termasuk
  storage/CRUD Life Object itu sendiri (belum ada `kind` lain selain
  `ref` yang didesain, belum ada `LifeOSStore.objects`), TIDAK ada UI
  baru, TIDAK ada Plugin System — semua itu keputusan produk terpisah
  yang masih menunggu arahan lanjutan (lihat `docs/NEXT_SESSION.md`).

Lihat `lifeos/lifeos-registry.js` (`LIFEOS_OBJECT_REF_SOURCES`),
`lifeos/lifeos-object-ref.js`, & `tests/lifeos-object-ref.test.js`
(17 test, Sesi 57) utk implementasi lengkap.

## LifeOS — Life Object CRUD Service Layer (FINAL — Sesi 58)

**Keputusan final Sesi 58** (Batch 4, lanjutan Sesi 57): storage/CRUD
Life Object penuh, instruksi eksplisit user — CRUD service layer saja,
kind yang didukung `"generic"` & `"ref"`, TIDAK ada UI, TIDAK ada Plugin
System sesi ini.

- Storage baru: `LifeOSStore.objects` (array, `lifeos-store.js`) —
  sejajar `projects`/`reviewLog`/`knowledge`, persist lewat siklus
  `lifeOSSave()`/`lifeOSLoad()` yang sudah ada, TIDAK ada perubahan
  struktur `D`.
- Skema object: `{id, name, areaKey, kind, sourceRef, createdAt}` —
  `kind:"generic"` → `sourceRef` SELALU `null` (dipaksa, bukan
  divalidasi — tidak ada yang divalidasi); `kind:"ref"` → `sourceRef`
  WAJIB lolos `lifeOSObjectRefValidate()` (Sesi 57) sebelum
  ditulis/diupdate. Kind selain `generic`/`ref` **ditolak eksplisit**
  (`{valid:false,error}`) — belum didesain, bukan diterima diam-diam.
- Kontrak `create()`/`update()`: balik
  `Promise<{valid:true,object}|{valid:false,error}>` (beda dari
  `project-service.js` yang balik object/null langsung) — validasi bisa
  gagal dgn alasan yang perlu ditunjukkan ke pemanggil (mis. UI di sesi
  lanjutan kalau ada), pola sama persis kontrak `lifeOSObjectRefValidate()`
  sendiri. Validasi gagal → **TIDAK PERNAH menulis** ke `store.objects`
  atau memanggil `lifeOSSave()`, termasuk saat `update()` (object lama
  tidak berubah sama sekali, bukan partial mutation).
- `delete()`/`get()`/`list()`: pola sama persis `project-service.js`
  (delete tidak throw kalau id tidak ada, get() null kalau tidak ketemu,
  list() salinan array).
- **Scope MVP Sesi 58 (implementasi):** HANYA service layer
  (`lifeos/services/life-object-service.js`) + test. TIDAK termasuk UI
  Life Object apa pun, TIDAK termasuk Plugin System — keduanya keputusan
  produk terpisah yang masih menunggu arahan lanjutan (lihat
  `docs/NEXT_SESSION.md`).

Lihat `lifeos/lifeos-store.js` (`LifeOSStore.objects`),
`lifeos/services/life-object-service.js`, &
`tests/lifeos-life-object-service.test.js` (17 test, Sesi 58) utk
implementasi lengkap.

## LifeOS — Life Object UI (FINAL — Sesi 59)

**Keputusan final Sesi 59** (Batch 4, lanjutan Sesi 57-58): rancangan UI
Life Object disetujui W, mencakup keputusan Risiko #1 (jump-to-source).
**Belum ada implementasi/coding sesi ini — ini keputusan produk saja,
Fase 1 dikerjakan sesi berikutnya.**

- **0 sistem baru.** Life Object jadi panel ke-7 di `#lifeOSWrap`
  (`LifeOSHome`), pola identik 6 panel lain (`lifeos/ui/*.js`) — bukan
  page/router/modal-system baru. Kartu ringkasan baru di
  `lifeOSHomeGrid` (class `dashhub-feature-card` existing), ikon 🧩,
  count dari `lifeObjectServiceList().length`.
- Panel baru `lifeos/ui/life-objects.js` (`LifeOSLifeObjects`),
  reuse styling `lifeos-project-card`. Wajib didaftarkan ke `window`
  di `knowledge.js` (mencegah bug data-action silent-fail yang pernah
  terjadi di modul lain).
- **Create `kind:"generic"`:** `showPromptModal()` (nama, areaKey) →
  `lifeObjectServiceCreate()` → render. areaKey wajib dari
  `LIFEOS_AREAS` (dropdown), bukan input bebas teks.
- **Create `kind:"ref"`:** 2 tahap `showChoiceModal()` (pilih domain
  dari `LIFEOS_OBJECT_REF_SOURCES` → pilih id via adapter domain
  terkait) → `lifeObjectServiceCreate({kind:'ref', sourceRef})`. Gagal
  validasi (`{valid:false,error}`) → tampil via `toast()`/
  `showAlertModal()`, tidak boleh diam-diam gagal.
- **Delete:** `askConfirm()` (reuse existing) → `lifeObjectServiceDelete()`
  → render.
- **Update UI: tidak ada di Fase 1** (lihat fase bertahap di bawah).
- **Risiko #1 — jump-to-source domain `knowledge`/`review` DIPUTUSKAN:
  opsi (c).** `knowledgeAdapterList()`/`LifeOSStore.reviewLog` TIDAK
  diubah (tidak menempel `sourceKind`). `lifeos/ui/life-objects.js`
  sendiri yang menyimpan mapping domain→cara-buka utk kebutuhan
  Life Object (duplikasi kecil disengaja, scope-nya sempit — hanya
  dipakai saat `open()` Life Object `kind:"ref"`), TIDAK mengubah
  `lifeOSNavigateToSource()`/`LIFEOS_NAV_MAP` existing maupun adapter
  `goal`/`project` yang sudah punya `sourceKind`. Untuk domain `goal`/
  `project`, tetap reuse `lifeOSNavigateToSource()` apa adanya (sudah
  punya `sourceKind`).
- **Guard sourceRef "busuk":** `open()`/render kartu Life Object
  `kind:"ref"` pakai `lifeOSObjectRefResolve()`, balik `null` → tampil
  "Referensi tidak ditemukan" (bukan error/blank). Tidak ada
  background re-validate.
- **Fase implementasi (untuk sesi berikutnya):**
  1. Panel + render + empty state + create `kind:"generic"` + delete.
  2. Create `kind:"ref"` (2-modal `showChoiceModal()`).
  3. Jump-to-source `kind:"ref"` pakai mapping lokal di
     `life-objects.js` (Risiko #1 opsi c).
  4. (Opsional, belum diminta) Update UI.
- **Acceptance criteria Fase 1+:** lihat draft audit Sesi 59 (panel
  hanya muncul kalau `LifeOSHome.isVisiblePref()` true; create/delete
  gagal → tidak ada partial render/state berubah; grid + count
  `LifeOSHome` auto re-render setelah create/delete sukses; empty
  state konsisten pola 5 panel lain).

**Scope Sesi 59:** HANYA keputusan produk/desain di atas, ditulis ke
dokumen ini. TIDAK ada coding/implementasi sesi ini (sesuai instruksi
W). Implementasi Fase 1 menunggu sesi berikutnya.

## Umum — Larangan duplikasi (semua track)

Tidak boleh duplicate:

- helper
- function
- storage
- registry
- adapter
- event

Selalu reuse kode existing. Kalau menemukan fungsi existing yang bisa
dipakai ulang, WAJIB reuse — jangan tulis versi baru.

## LifeOS — Finance Account & Finance Category Foundation (FINAL — Sesi 73, Batch 6)

**Keputusan produk FINAL eksplisit user:** lanjutan Batch 6 setelah
Finance Domain Foundation (Sesi 71) + Builder Filter Transaksi (Sesi
72) — tambah 2 domain `sourceRef` baru ke `LIFEOS_OBJECT_REF_SOURCES`:
`financeAccount` (akun finance, `D.accounts`) & `financeCategory`
(kategori finance, `D.categories.income`/`.expense`). Life Object
`kind:"ref"` sekarang bisa menunjuk ke akun/kategori finance, sama
seperti sudah bisa menunjuk ke transaksi (`finance`, Sesi 71) &
goal/project/knowledge/review sejak Sesi 57.

**Scope diambil paling sempit**, pola SAMA PERSIS dgn domain `finance`
(Sesi 71) — bukan sistem finance baru:

- `resolver(id)`/`exists(id)` domain `financeAccount` baca `D.accounts`
  LANGSUNG (guard `typeof D !== 'undefined'`) — TIDAK ada adapter
  `lifeos/adapters/*.js` baru, TIDAK memanggil `recalcAccBalance()`
  (agregasi saldo di luar scope Foundation).
- `resolver(id)`/`exists(id)` domain `financeCategory` baca
  `D.categories.income` lalu `D.categories.expense` LANGSUNG — id
  kategori unik lintas kedua array (lihat `DEFAULT_CATS`), hasil
  ditempel field `type:'income'|'expense'` non-destruktif (dipakai UI
  utk tahu array mana yg harus dibuka). Hanya kategori level atas —
  subs/subkategori TIDAK ikut jadi target `sourceRef` (di luar scope
  Foundation ini).
- Jump-to-source domain `financeAccount`/`financeCategory` REUSE
  `openAccModal(idx)`/`openCatModal(idx,type)` (`modules/finance/
  akun.js`/`kategori.js`, modal edit yang SUDAH ADA) — BUKAN pola
  knowledge/review (`showAlertModal()`, baca-saja), sama alasan dgn
  domain `finance` (Sesi 71): sudah punya UI edit sendiri yang lebih
  berguna daripada modal baca-saja baru. Beda dgn `editTx(id)` (terima
  id langsung), kedua modal lama ini terima INDEX array — jadi
  `_openRefLocal()` (`lifeos/ui/life-objects.js`) cari idx-nya dulu
  dari `D.accounts`/`D.categories[type]` via `sourceId` SEBELUM
  memanggil, signature modal lama TIDAK diubah.
- `lifeOSObjectRefResolve`/`Exists`/`Validate` (`lifeos-object-ref.js`)
  dan `life-object-service.js` **0 perubahan** — generic penuh
  terhadap domain terdaftar.
- `promptCreateRef()` (`lifeos/ui/life-objects.js`) juga **0
  perubahan** — daftar domain diambil dinamis dari
  `Object.keys(LIFEOS_OBJECT_REF_SOURCES)`, jadi 2 domain baru otomatis
  muncul di UI create ref tanpa kode tambahan.
- TIDAK ada UI/panel baru, TIDAK ada storage baru, TIDAK ada builder/
  filter tambahan di picker (pola Sesi 72 utk domain `finance`) —
  kandidat lanjutan Batch 6 kalau dibutuhkan (butuh keputusan produk
  terpisah).

**Kenapa "Foundation":** sesi ini murni mendaftarkan financeAccount &
financeCategory sbg domain `sourceRef` yang SAH (fondasi), bukan
membangun fitur akun/kategori baru di Life OS. Builder/filter yang
lebih spesifik (kalau diperlukan nanti) adalah keputusan produk
terpisah, JANGAN ditebak.

## LifeOS — Finance Domain: Builder Filter Transaksi (FINAL — Sesi 72, Batch 6)

**Keputusan produk FINAL eksplisit user:** "Builder finance lanjutan"
= filter di picker saat BUAT ref baru (pilih tipe transaksi dulu, lalu
pilih 1 transaksi spesifik) — **sourceRef tetap nunjuk 1 transaksi
tunggal**, BUKAN Life Object yang menunjuk sekumpulan transaksi
(alternatif itu ditolak eksplisit oleh user).

**Implementasi:** `promptCreateRef()` (`lifeos/ui/life-objects.js`)
menyisipkan 1 `showChoiceModal()` tambahan KHUSUS setelah domain
`finance` dipilih — pilihan "Semua"/"Pemasukan"/"Pengeluaran" — sebelum
modal pilih item. `_refSourceItems(domain, filter)` nambah parameter
`filter` opsional (`{type:'income'|'expense'}`), HANYA berlaku utk
domain `finance`; domain lain mengabaikan parameter ini. Struktur
`sourceRef` (`{domain,id}`) 0 perubahan.

## LifeOS — Finance Domain Foundation (FINAL — Sesi 71, Batch 6)

Keputusan produk FINAL eksplisit dari user, di luar 2 kandidat lama
Batch 5 (Plugin Marketplace / kind Life Object baru): domain `finance`
ditambahkan ke `LIFEOS_OBJECT_REF_SOURCES` (`lifeos-registry.js`),
sehingga Life Object `kind:"ref"` sekarang bisa menunjuk ke transaksi
keuangan (`D.transactions`), sama seperti sudah bisa menunjuk ke
goal/project/knowledge/review sejak Sesi 57.

**Scope diambil paling sempit** yang konsisten dgn arsitektur
`sourceRef` yang sudah ada (bukan sistem finance baru):

- `resolver(id)`/`exists(id)` domain `finance` baca `D.transactions`
  LANGSUNG (guard `typeof D !== 'undefined'`) — TIDAK ada adapter
  `lifeos/adapters/*.js` baru dibuat, pola SAMA PERSIS dgn domain
  `review` (yang juga baca `store.reviewLog` langsung tanpa adapter
  terpisah, beda dgn goal/project/knowledge yang sudah punya adapter
  list function tersendiri dari sebelum Life Object ada).
- Jump-to-source domain `finance` REUSE `editTx()`
  (`modules/finance/transaksi.js`, modal edit transaksi yang SUDAH
  ADA) — BUKAN pola knowledge/review (`showAlertModal()`, baca-saja),
  karena transaksi sudah punya UI edit sendiri yang lebih berguna utk
  dituju daripada modal baca-saja baru.
- `lifeOSObjectRefResolve`/`Exists`/`Validate` (`lifeos-object-ref.js`)
  dan `life-object-service.js` **0 perubahan** — keduanya sudah generic
  penuh terhadap domain terdaftar, domain baru otomatis didukung tanpa
  disentuh.
- `promptCreateRef()` (`lifeos/ui/life-objects.js`) juga **0
  perubahan** — daftar domain di 2-modal `showChoiceModal()` diambil
  dinamis dari `Object.keys(LIFEOS_OBJECT_REF_SOURCES)`, jadi domain
  baru otomatis muncul di UI create ref tanpa kode tambahan.
- TIDAK ada UI/panel baru, TIDAK ada storage baru, TIDAK ada builder
  per tipe transaksi (income/expense/kategori tertentu) — itu di luar
  scope "Foundation", kandidat lanjutan Batch 6 kalau dibutuhkan
  (butuh keputusan produk terpisah).

**Kenapa "Foundation":** sesi ini murni mendaftarkan finance sbg
domain `sourceRef` yang SAH (fondasi), bukan membangun fitur finance
baru di Life OS. Builder/filter transaksi yang lebih spesifik (kalau
diperlukan nanti) adalah keputusan produk terpisah, JANGAN ditebak.

## Dashboard Hub — Finance Dashboard & AI Hook Foundation (FINAL — Sesi 75, Batch 6)

Keputusan produk FINAL eksplisit user (lanjutan Batch 6 setelah Finance
Intelligence Foundation, Sesi 74): tambahkan Finance Dashboard —
4 kartu presenter (Net Worth, Cash Flow, Budget, Financial Health) di
Dashboard Hub — **100% reuse** `FinanceIntelligence.summary()` (Sesi
74), TIDAK ada rumus baru, TIDAK menghitung ulang cashflow/budget/
income-vs-expense/health score.

**Scope diambil paling sempit** yang konsisten dgn pola widget
Dashboard Hub yang sudah ada (`DashboardHubSummary`/
`DashboardHubAnalytics`/`EIEDashboard`):

- `modules/finance/finance-dashboard.js` (`FinanceDashboard`) — UI
  HANYA presenter, satu-satunya pembacaan data di luar
  `FinanceIntelligence.summary()` adalah `totalSaldoAkun()`/
  `totalDebtValue()` (Net Worth Card) — KEDUANYA fungsi yang SUDAH ADA
  & juga dipakai `FinanceIntelligence.healthScore()` sendiri, dipanggil
  ulang apa adanya (bukan duplikasi rumus) krn `summary()` tidak
  expose angka net worth mentah sbg field.
- `getAIHook()` — wrapper tipis read-only ke
  `FinanceIntelligence.summary()`, 0 transformasi, disiapkan sbg titik
  akses data utk konsumen AI/briefing masa depan (`ai-chat.js` dst) —
  TIDAK ada wiring AI baru sesi ini, murni fondasi titik akses.
- Container `#findashWrap`/`#findashGrid` ditambahkan ke
  `index.html`/`app_production.html`, masuk grup sub-tab **"insight"**
  (`SECTION_GROUPS` di `dashboard-hub.js`, bareng `lifeOSWrap`/
  `eieWrap`) — bukan tab baru.
  `DashboardHub.render()` & live-wiring `renderDashboard()`
  (`modules-render.js`) memanggil `FinanceDashboard.render()`, pola
  sama persis `EIEDashboard.render()`/`DashboardHubAnalytics.render()`
  di titik yang sama.
- CSS `.findash-*` murni tambahan baru, semua token & warna
  (`.green`/`.red`/`.orange`) REUSE yang sudah ada — 0 token/warna
  baru.
- TIDAK ada perubahan ke `FinanceIntelligence`, `Budget`,
  `computeCashflowForecast()`, atau struktur `D` apa pun.

**Kenapa "& AI Hook Foundation":** `getAIHook()` sengaja hanya berupa
wrapper pass-through — belum ada konsumen AI yang memanggilnya sesi
ini. Wiring nyata ke `ai-chat.js`/AI briefing adalah keputusan produk
terpisah utk sesi mendatang, JANGAN ditebak.

## Scanner — Exclusive Scanner Mode via ScannerSession (FINAL — Sesi 316, PD-007)

> **AUDIT (Sesi 312, ditambahkan saat cek konsistensi docs pasca pemisahan
> file):** section ini SEHARUSNYA sudah ada sejak Sesi 316/317 — dikutip
> persis dgn judul ini oleh `modules/shared/scanner-session.js`,
> `modules/vehicle/vehicle-scanner.js`, `modules/vehicle/sparepart-scanner.js`,
> `modules/shared/modal-navigasi.js`, `scripts/build.js`, &
> `tests/scanner-session.test.js` — tapi isinya baru pernah ditulis di
> `CHANGELOG.md` § Sesi 317 & `docs/NEXT_SESSION.md`, tidak pernah dipromosikan
> ke sini. Konten di bawah murni konsolidasi dari sumber yang sudah final &
> sudah diimplementasi (0 keputusan baru dibuat sesi ini).

Keputusan produk FINAL (Tahap 5, Sesi 316): scanner apa pun (`VehicleScanner`,
`SparepartScanner`, & scanner masa depan) WAJIB berjalan lewat SATU titik
masuk/keluar tunggal — `ScannerSession.enter()`/`exit()`
(`modules/shared/scanner-session.js`). Tidak ada jalur lain yang boleh
suspend/resume UI global (modal/toast/dashboard chrome) di luar file ini.
Scanner Engine (lapisan ZXing/decode — `vehicle-scanner.js`/
`sparepart-scanner.js`) 0% menyentuh modal/toast/dashboard; tanggung jawab
itu 100% dipindah ke `ScannerSession.pauseUI()`/`resumeUI()`.

**Tahap 6 (Sesi 317)** menuntaskan migrasi: `vehicleScannerHideChrome()`/
`vehicleScannerRestoreChrome()` dihapus dari `vehicle-scanner.js`; blok IIFE
`camera-scan-active` (`MutationObserver`+`setInterval(400ms)`+
`document.querySelector('video')`) dihapus total dari `modal-navigasi.js`.
State "scanner aktif" jadi EKSPLISIT (`_scannerSessionCount`, reference
counter — lihat audit lanjutan di kepala `scanner-session.js`), bukan lagi
disimpulkan dari keberadaan `<video>` di DOM.

**Urutan wajib:**
- `enter()`: suspend UI global (`pauseUI()`) DULU, baru Scanner Engine boleh
  membangun overlay & mulai decode.
- `exit()`: Scanner Engine teardown overlay DULU, baru UI global di-resume
  (`resumeUI()`) — kebalikan dari `enter()`, supaya tidak ada jendela waktu
  scanner & UI global aktif bersamaan.

TIDAK ada logic baru di `VehicleScanner`/`SparepartScanner` sendiri dari
keputusan ini — murni pemindahan tanggung jawab suspend/resume UI ke satu
titik. Audit lanjutan (self-healing guard, overlay-registry) dicatat sendiri
di komentar `scanner-session.js` & `docs/architecture/OVERLAY-REGISTRY-AUDIT.md`.
