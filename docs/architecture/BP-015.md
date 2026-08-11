# BP-015 — Nexus V6 Master Blueprint

> **Status: POPULATED (Tahap 2, TASK-001E)** — Draft utuh diterima dari
> user pada sesi ini, menggantikan placeholder sebelumnya. Isi di bawah
> ini APA ADANYA dari draft yang diberikan user — tidak diedit,
> diringkas, atau ditafsirkan ulang oleh AI.
>
> **PERINGATAN CROSS-CHECK**: dokumen ini belum direview terhadap
> kondisi repository nyata (`docs/ai/FOUNDATION_AUDIT.md`). Beberapa
> pasal berpotensi bertentangan dengan kode existing (358 file) — lihat
> temuan di `BLUEPRINT_CONSOLIDATION_PLAN.md` §8 (Tahap 3 Cross-Check).
> **Belum ada keputusan cakupan (retroaktif vs forward-only) untuk
> dokumen ini secara keseluruhan.**

## BAB 1 Executive Summary

### 1.1 Purpose
Dokumen BP-015 ini mendefinisikan Source of Truth arsitektural dan operasional untuk Nexus V6, sebuah Personal Operating System. Blueprint ini dirancang untuk memastikan keselarasan penuh antara AI Assisted Development, standardisasi kode Vanilla JavaScript, dan kapabilitas sistem lokal.

### 1.2 Scope
Ruang lingkup dokumen mencakup seluruh lapisan arsitektur Nexus V6, mulai dari kernel platform (GROUP_A), modul domain (GROUP_B), mekanisme Offline-First (IndexedDB/LocalStorage), hingga integrasi AI dan Build System tanpa framework eksternal.

### 1.3 Rules
1. Dilarang menggunakan framework JavaScript pihak ketiga (React, Vue, Angular).
2. Dilarang menggunakan library eksternal tanpa justifikasi arsitektural tingkat tinggi.
3. Semua modul harus didaftarkan melalui Feature Registry.
4. Semua status operasi harus mendukung eksekusi Offline-First.

### 1.4 Design Principles
Nexus V6 mengadopsi prinsip Modular Monolith dan Capability-Based Architecture. Sistem harus bersifat isolatif (kegagalan satu modul tidak menjatuhkan OS), persisten secara lokal (Local-First), dan dirender melalui Progressive Web App (PWA) standards.

### 1.5 Examples
Implementasi kernel OS mendelegasikan state management ke `CoreState` dan mendaftarkan `FinanceModule` via `Registry.register('finance', FinanceAdapter)`.

### 1.6 Anti Pattern
* Global variable mutation lintas modul (`window.financeState = ...`).
* Direct DOM manipulation dari dalam core logic (melewati adapter layer).
* Synchronous blocking calls pada operasi I/O IndexedDB.

### 1.7 Best Practice
Pemisahan murni antara Core Logic, Storage Logic, dan UI Render Logic. Penggunaan Web Workers untuk kalkulasi berat (misal: AI sinkronisasi atau parsing data aset besar).

### 1.8 Decision Matrix
| Kriteria | Opsi A (Framework) | Opsi B (Vanilla JS) | Keputusan |
| :--- | :--- | :--- | :--- |
| Performa & Kontrol | Overhead tinggi | Akses DOM langsung, cepat | **Opsi B** |
| Bundle Size | > 1MB | < 100KB | **Opsi B** |
| Umur Kode | Tergantung vendor | Sesuai standar ECMAScript | **Opsi B** |

### 1.9 Checklist
- [x] Arsitektur PWA terdefinisi.
- [x] Paradigma Local-First disetujui.
- [x] Struktur Vanilla JS dipatenkan.

### 1.10 References
* ISO/IEC/IEEE 42010:2011 Systems and software engineering — Architecture description.
* PWA Web Standards (W3C).

---

## BAB 2 Vision

### 2.1 Purpose
Menetapkan pandangan jangka panjang Nexus V6 sebagai sistem operasi personal yang independen, sangat efisien, dan abadi (future-proof) tanpa ketergantungan pada vendor eksternal atau konektivitas cloud yang konstan.

### 2.2 Scope
Visi ini mengikat seluruh siklus hidup pengembangan (SDLC), keputusan arsitektur, integrasi AI, dan rilis produksi Nexus V6.

### 2.3 Rules
1. Setiap baris kode harus ditulis dengan asumsi sistem ini akan berjalan selama dekade berikutnya tanpa perubahan infrastruktur dasar.
2. Cloud bersifat opsional dan hanya berfungsi sebagai backup, bukan primary truth.

### 2.4 Design Principles
**Perpetual Architecture**: Desain yang tidak membusuk. Tidak ada *depreciation* dari framework pihak ketiga. Mengandalkan standar inti Web API (ES6+, DOM API, IndexedDB).

### 2.5 Examples
Menyimpan data analitik kendaraan bukan ke server AWS, melainkan ke `NexusDB` (IndexedDB lokal) yang kemudian direplikasi ke format JSON saat di-ekspor.

### 2.6 Anti Pattern
Membangun fitur yang membutuhkan validasi server-side sebelum user dapat berinteraksi dengan UI.

### 2.7 Best Practice
Menerapkan skema optimistik: UI merespons seketika, data disimpan lokal, dan disinkronkan ke layer persisten secara asinkron (background sync).

### 2.8 Decision Matrix
| Target Visi | Ketergantungan Cloud | Local-First + PWA | Keputusan |
| :--- | :--- | :--- | :--- |
| Ketersediaan | Tergantung sinyal | 99.9% (Always On) | **Local-First** |
| Privasi Data | Terdistribusi | Tersentralisasi di perangkat | **Local-First** |

### 2.9 Checklist
- [x] Tidak ada API call eksternal di jalur kritis render (critical rendering path).
- [x] Data primary sepenuhnya tersimpan di IndexedDB.

### 2.10 References
* Local-First Software: You own your data (Ink & Switch).

---

## BAB 3 Mission

### 3.1 Purpose
Menjabarkan taktik spesifik untuk mencapai visi Nexus V6 melalui modularitas, kejelasan kontrak antar modul, dan pemberdayaan AI dalam proses development.

### 3.2 Scope
Misi mencakup pembagian kerja struktural dalam repository (GROUP_A, GROUP_B, Bundle Production) dan penyediaan antarmuka Dashboard Hub.

### 3.3 Rules
1. Eksekusi kode harus stabil di bawah 60 FPS pada perangkat low-end.
2. Proses build harus menghasilkan satu bundel statis (HTML, JS, CSS) yang dapat di-host di mana saja atau dijalankan langsung dari file system.

### 3.4 Design Principles
**Zero-Friction Deployment**. Sistem terkompilasi melalui Build Script kustom yang menggabungkan seluruh manifest, aset, dan logika ke dalam struktur PWA murni.

### 3.5 Examples
Menjalankan perintah `node scripts/build.js` yang akan melakukan concatenating `GROUP_A` (Core) dan `GROUP_B` (Modules) menjadi `dist/bundle.js`.

### 3.6 Anti Pattern
Menggunakan Webpack, Babel, atau bundler kompleks yang mengaburkan eksekusi kode Vanilla JS.

### 3.7 Best Practice
Memanfaatkan ES Modules (ESM) selama development dan custom concatenator sederhana untuk produksi guna menjaga integritas dan transparansi arsitektur.

### 3.8 Decision Matrix
| Kebutuhan | Bundler Standar (Webpack) | Custom Build Script | Keputusan |
| :--- | :--- | :--- | :--- |
| Kompleksitas | Tinggi (Blackbox) | Rendah (Whitebox) | **Custom Build** |
| Eksekusi AI | Sulit dianalisis | Mudah dibaca AI | **Custom Build** |

### 3.9 Checklist
- [x] Build script independen.
- [x] Output tunggal siap PWA.

### 3.10 References
* Google Web Fundamentals: Build & Deploy.

---

## BAB 4 Philosophy

### 4.1 Purpose
Mendefinisikan landasan moral dan teknis dari Nexus V6: Kedaulatan data di tangan pengguna dan kode yang sepenuhnya transparan.

### 4.2 Scope
Filosofi diterapkan pada pengumpulan data, tata kelola arsitektur, dan cara AI berinteraksi dengan codebase.

### 4.3 Rules
1. Data pengguna tidak boleh meninggalkan perangkat tanpa protokol ekspor eksplisit.
2. Kode harus "Self-Documenting". Kompleksitas ditangani melalui isolasi, bukan abstraksi cerdas namun sulit dipahami.

### 4.4 Design Principles
**KISS (Keep It Simple, Stupid) & YAGNI (You Aren't Gonna Need It)**. Implementasi hanya berdasarkan spesifikasi blueprint, tanpa over-engineering untuk kasus penggunaan imajiner di masa depan.

### 4.5 Examples
Alih-alih membangun ORM (Object-Relational Mapping) yang kompleks untuk IndexedDB, gunakan wrapper sederhana berbasis Promise yang langsung memetakan query ke Object Store spesifik (misal `db.get('finance', id)`).

### 4.6 Anti Pattern
* Abstraction layering yang berlebihan (misal: Controller memanggil Service yang memanggil Repository yang memanggil Adapter hanya untuk mengambil 1 string).

### 4.7 Best Practice
Menggunakan arsitektur vertical slice untuk setiap modul. Modul memiliki kendali atas logika bisnis dan query datanya sendiri dalam batasan kontrak sistem.

### 4.8 Decision Matrix
| Aspek | Over-engineering | Pragmatic Vanilla | Keputusan |
| :--- | :--- | :--- | :--- |
| Maintainability | Rendah (butuh konteks tinggi) | Tinggi (baca dan pahami) | **Pragmatic** |

### 4.9 Checklist
- [x] Kode bebas dari "magic code".
- [x] Desain transparan untuk inspeksi AI.

### 4.10 References
* The Zen of Python (diadaptasi untuk Vanilla JS OS).
* Clean Architecture Principles.

---

## BAB 5 Scope

### 5.1 Purpose
Menjelaskan secara definitif batas-batas fungsionalitas dan teknis dari Nexus V6.

### 5.2 Scope
* **Termasuk**: Manajemen state lokal, modul domain (Finance, Vehicle, Asset, Family, Shop, AI), antarmuka Dashboard Hub, PWA lifecycle, mekanisme Offline-First.
* **Tidak Termasuk**: Cloud backend, autentikasi berbasis server (OAuth), real-time multiplayer/collaboration sinkron.

### 5.3 Rules
1. Fitur baru hanya diizinkan jika relevan dengan manajemen OS personal pengguna tunggal.
2. Setiap entitas dalam OS merupakan milik entitas tunggal (pengguna lokal).

### 5.4 Design Principles
**Single Tenant, Absolute Ownership**. Sistem tidak membutuhkan manajemen multi-role yang kompleks (Admin, User, Guest), menghemat overhead pada arsitektur data.

### 5.5 Examples
Menyusun skema database dengan asumsi seluruh tabel adalah milik satu otoritas, menghilangkan kebutuhan kolom `user_id` pada setiap record.

### 5.6 Anti Pattern
Menulis logika pengecekan otorisasi tingkat row (Row-Level Security) yang membuang siklus CPU secara percuma di perangkat lokal.

### 5.7 Best Practice
Menerapkan enkripsi pada level storage (opsional jika perangkat digunakan bersama), bukan pada level query.

### 5.8 Decision Matrix
| Kebutuhan | Multi-Tenant Model | Single-Tenant Model | Keputusan |
| :--- | :--- | :--- | :--- |
| Struktur DB | Kompleks, berelasi | Datar, langsung | **Single-Tenant** |

### 5.9 Checklist
- [x] Batasan sistem divalidasi.
- [x] Arsitektur single-tenant dipastikan.

### 5.10 References
* Enterprise Architecture Handbook: Context Boundaries.

---

## BAB 6 Non Goals

### 6.1 Purpose
Mencegah *scope creep* dengan menyatakan secara tegas apa yang TIDAK akan pernah dibangun di dalam Nexus V6.

### 6.2 Scope
Batasan teknis, fitur eksperimental di luar kontrol, dan paradigma eksternal.

### 6.3 Rules
1. Nexus V6 bukan platform sosial. Tidak ada fitur berbagi (share) otomatis.
2. Nexus V6 bukan aplikasi native (APK/IPA) yang memerlukan app store; PWA adalah rute final.

### 6.4 Design Principles
**Subtractive Design**. Jika sebuah masalah bisa diselesaikan tanpa menulis kode (misalnya menggunakan fungsi native peramban), maka kode tidak ditulis.

### 6.5 Examples
Menolak implementasi Push Notification kustom melalui WebSockets eksternal, melainkan murni mengandalkan Service Worker native Notification API jika dibutuhkan, atau membiarkannya.

### 6.6 Anti Pattern
Membangun sistem sinkronisasi peer-to-peer (P2P) WebRTC kustom yang melanggar prinsip stabilitas offline-first lokal.

### 6.7 Best Practice
Menyimpan semua "ide menarik" yang melanggar non-goals ini ke dalam daftar penolakan historis.

### 6.8 Decision Matrix
| Ide Ekstensi | Sesuai Tujuan OS? | Kompleksitas | Keputusan |
| :--- | :--- | :--- | :--- |
| Sinkronisasi Cloud Real-time | Tidak | Sangat Tinggi | **REJECTED** |
| Sosial Share Button | Tidak | Rendah | **REJECTED** |

### 6.9 Checklist
- [x] Fitur yang ditolak didokumentasikan.
- [x] Integrasi eksternal dibatasi.

### 6.10 References
* Basecamp "Getting Real": Knowing what to leave out.

---

## BAB 7 Architecture Principles

### 7.1 Purpose
Mendefinisikan fondasi teknis absolut yang menjaga integritas proyek, memungkinkan Modular Monolith berfungsi tanpa collision.

### 7.2 Scope
Seluruh interaksi antara GROUP_A (Kernel/Platform) dan GROUP_B (Modules), serta antarmuka Dashboard.

### 7.3 Rules
1. GROUP_B tidak boleh berkomunikasi satu sama lain secara langsung. Komunikasi wajib melalui Event Bus atau Cross Module Bridge (GROUP_A).
2. UI rendering dipisahkan secara ketat dari bisnis logic.

### 7.4 Design Principles
**Capability-Based Security & Isolation**. Setiap modul berjalan di dalam namespace sendiri. Modul `Finance` tidak dapat membaca memori modul `Vehicle` secara langsung.

### 7.5 Examples
```javascript
// BENAR: Komunikasi via Hub
DashboardHub.emit('FINANCE_UPDATE', payload);

// SALAH: Direct access
VehicleModule.updateCost(FinanceModule.state.balance);
```

### 7.6 Anti Pattern
Spaghetti dependencies di mana ShopModule meng-import class dari FamilyModule.

### 7.7 Best Practice
Menerapkan skema Publish-Subscribe (Pub/Sub) pada Core Platform. Modul mendaftarkan listener pada lifecycle hook standar (onMount, onSleep, onWake).

### 7.8 Decision Matrix
| Pola Interaksi | Ketergantungan Silang (Coupling) | Kecepatan Debugging | Keputusan |
|---|---|---|---|
| Direct Import | Sangat Tinggi | Sulit | Ditolak |
| Event Bus | Rendah | Mudah (trace log) | Disetujui |

### 7.9 Checklist
- [x] Modul terisolasi.
- [x] Dependency berpusat pada Kernel.

### 7.10 References
* Microsoft Architecture Guide: Event-Driven Architecture.

---

## BAB 8 Repository Standard

### 8.1 Purpose
Menjamin bahwa struktur fisik repository mencerminkan secara langsung struktur logika arsitektur (Screaming Architecture).

### 8.2 Scope
Organisasi folder, konvensi penamaan file, penempatan build script, dan dokumentasi root.

### 8.3 Rules
1. Penamaan folder dan file wajib menggunakan huruf kecil (kebab-case atau snake_case) sesuai OS standard, kecuali class definitions.
2. Tidak ada file logic yang berada di luar folder domainnya (tidak ada file orphan).

### 8.4 Design Principles
Predictable Locatability. AI dan pengembang manusia harus dapat menebak lokasi sebuah file kode hanya dengan mengetahui fungsi bisnisnya.

### 8.5 Examples
```
/nexus-v6
├── /src
│   ├── /group_a_core
│   │   ├── kernel.js
│   │   └── registry.js
│   ├── /group_b_modules
│   │   ├── /finance
│   │   └── /vehicle
├── /scripts
│   └── build.js
└── index.html
```

### 8.6 Anti Pattern
Menaruh logic modul di dalam folder UI/komponen, seperti meletakkan query database di dalam file finance-dashboard.js.

### 8.7 Best Practice
Pemisahan Root: `/core` -> Engine, `/modules` -> Domain, `/ui` -> Presenter.

### 8.8 Decision Matrix
| Struktur Repo | Kejelasan Domain | Analisis AI | Keputusan |
|---|---|---|---|
| Berbasis Tipe File (MVC) | Buruk | Terpecah | Ditolak |
| Berbasis Fitur (Modular) | Sangat Baik | Sangat Fokus | Disetujui |

### 8.9 Checklist
- [x] Struktur folder mencerminkan domain.
- [x] Script terisolasi dari source.

### 8.10 References
* Clean Architecture (Robert C. Martin).

---

## BAB 9 Coding Standard

### 9.1 Purpose
Menetapkan gaya sintaks dan pola penulisan Vanilla JavaScript agar codebase tetap homogen meskipun dikerjakan oleh berbagai agen AI dan manusia.

### 9.2 Scope
Penamaan variabel, struktur kelas, error handling, fungsi murni (pure functions), dan mutabilitas statis.

### 9.3 Rules
1. Wajib menggunakan `const` secara default. Gunakan `let` hanya pada loop atau re-assignment yang absolut diperlukan. Larangan mutlak menggunakan `var`.
2. Semua error harus ditangkap (caught) secara eksplisit; dilarang keras menelan error (`catch(e) {}`).
3. Class berbasis ES6 diizinkan, tetapi state management diutamakan berbasis fungsi dan closure untuk menghindari masalah `this` context binding.

### 9.4 Design Principles
Deterministic & Explicit. Kode harus eksplisit. Hindari implicit type coercion (gunakan `===` selalu, bukan `==`).

### 9.5 Examples
```javascript
// BEST PRACTICE
class FinanceService {
  static async calculateTotal(records) {
    if (!Array.isArray(records)) throw new TypeError('Records must be array');
    return records.reduce((sum, record) => sum + record.amount, 0);
  }
}
```

### 9.6 Anti Pattern
* Memodifikasi prototype bawaan JavaScript (misal: `Array.prototype.myCustomFilter = ...`).
* Menggunakan callback hell (wajib gunakan async/await).

### 9.7 Best Practice
Gunakan JSDoc secara agresif untuk setiap fungsi yang diekspor. Ini krusial bagi agen AI untuk memahami tipe data masukan dan keluaran tanpa TypeScript.

### 9.8 Decision Matrix
| Tipe Typing | Kecepatan Eksekusi (Build) | Kejelasan bagi AI | Keputusan |
|---|---|---|---|
| TypeScript | Lambat (butuh transpile) | Sangat Tinggi | Ditolak (Melanggar Vanilla JS rule) |
| JS + JSDoc | Cepat (tanpa build tool) | Tinggi | Disetujui |

### 9.9 Checklist
- [x] Linting terstandar (ESLint rules tersirat).
- [x] Strict equality (===) diterapkan.
- [x] JSDoc hadir di semua modul utama.

### 9.10 References
* Google JavaScript Style Guide.

---

## BAB 10 Folder Standard

### 10.1 Purpose
Mengatur taksonomi absolut hierarki folder dalam ekosistem Nexus V6, menjabarkan relasi antara GROUP_A (Platform/Kernel) dan GROUP_B (Modul Fungsional).

### 10.2 Scope
Struktur di dalam `/src`, manajemen `dist`, penempatan aset grafis, ikon, dan manajemen manifes PWA.

### 10.3 Rules
1. Setiap folder modul pada GROUP_B wajib memiliki struktur internal yang sama (isomorfik).
2. Direktori `/dist` hanya boleh dimodifikasi oleh Build Script, tidak boleh dikomit ke version control jika memungkinkan (kecuali untuk deployment statis).

### 10.4 Design Principles
Fractal Architecture. Pola desain mikro pada setiap folder modul merefleksikan pola desain makro pada level sistem.

### 10.5 Examples
Folder Tree Mutlak:
```
/src
  /group_a_core
    /storage
    /event_bus
    /registry
  /group_b_modules
    /vehicle
      - VehicleModule.js
      - VehicleStore.js
      - VehicleUI.js
    /finance
      - FinanceModule.js
      ...
```

### 10.6 Anti Pattern
* Menciptakan sub-direktori dengan nama `misc`, `utils`, `helpers` di luar modul spesifik yang berfungsi sebagai tempat pembuangan kode.

### 10.7 Best Practice
Jika ada utilitas yang digunakan lintas modul (seperti format tanggal), tempatkan secara terpusat di `/group_a_core/utils/FormatUtil.js`.

### 10.8 Decision Matrix
| Manajemen Utility | DRY (Don't Repeat Yourself) | Otonomi Modul | Keputusan |
|---|---|---|---|
| Utils per Modul | Duplikasi terjadi | Sangat tinggi | Digunakan untuk utilitas spesifik |
| Core Utils | Sentralisasi | Ketergantungan ke Core | Digunakan untuk utilitas lintas batas |

### 10.9 Checklist
- [x] Kesesuaian hirarki.
- [x] Larangan folder sampah (/misc) dipatuhi.

### 10.10 References
* Screaming Architecture Principles.

---

## BAB 11 Module Standard

### 11.1 Purpose
Memastikan setiap unit bisnis (Module) mematuhi antarmuka siklus hidup (Lifecycle Interface) sistem, sehingga kernel OS (Dashboard Hub & Registry) dapat melakukan orkestrasi tanpa mempedulikan isi logika modul.

### 11.2 Scope
Registrasi modul, injeksi dependensi, inisialisasi state, dan terminasi state (cleanup).

### 11.3 Rules
1. Setiap modul harus merupakan sebuah kelas atau fungsi pabrik (factory) yang mengimplementasikan antarmuka standar: `init()`, `mount(containerId)`, `unmount()`, dan `getState()`.
2. Modul dilarang keras melalukan auto-eksekusi (Self-Executing Anonymous Functions dilarang di level ekspor modul utama).

### 11.4 Design Principles
Inversion of Control. Modul tidak mengambil data dari sistem secara proaktif pada saat inisialisasi awal file; Kernel OS yang menyuntikkan (inject) referensi ke Storage atau Event Bus ke dalam modul saat modul diregistrasi.

### 11.5 Examples
```javascript
class FinanceModule {
  constructor(coreServices) {
    this.db = coreServices.db;
    this.events = coreServices.events;
  }
  async init() {
    this.state = await this.db.load('finance');
    this.events.emit('MODULE_READY', 'finance');
  }
}
```

### 11.6 Anti Pattern
Modul membaca langsung dari `window.localStorage` tanpa melalui layanan `coreServices.db`.

### 11.7 Best Practice
Menerapkan metode Graceful Degradation di dalam setiap modul. Jika data tidak tersedia, modul menampilkan status kosong (Empty State) dengan aman tanpa merusak render antarmuka Hub.

### 11.8 Decision Matrix
| Teknik Inisialisasi | Kontrol OS | Potensi Memory Leak | Keputusan |
|---|---|---|---|
| Singleton Auto-init | Rendah | Tinggi (sulit di-garbage collect) | Ditolak |
| Factory Injected | Sangat Tinggi | Rendah | Disetujui |

### 11.9 Checklist
- [x] Modul mematuhi Lifecycle Interface.
- [x] Dependensi disuntikkan oleh Kernel.

### 11.10 References
* Dependency Injection (DI) Principles.

---

## BAB 12 Storage Architecture

### 12.1 Purpose
Mengelola penyimpanan data persisten yang efisien, handal secara offline, dan kebal terhadap kehilangan data jika terjadi error peramban.

### 12.2 Scope
Penggunaan IndexedDB (untuk data berat, riwayat, master data) dan LocalStorage (untuk preferensi ringan, sesi, token konfigurasi).

### 12.3 Rules
1. Data relasional atau data dalam jumlah besar (tabel Finance, log Vehicle) WAJIB disimpan di IndexedDB.
2. Dilarang menggunakan LocalStorage melebihi kapasitas operasional 1MB guna menghindari blocking pada Main Thread (LocalStorage bersifat sinkron).
3. Semua operasi IndexedDB wajib dibungkus dengan Promise.

### 12.4 Design Principles
Asynchronous First, Graceful Persistence. Semua aksi simpan tidak menghalangi UI. OS menangani UI secara optimis dan menyimpan data di latar belakang.

### 12.5 Examples
Struktur Penyimpanan Logika:
```
+--------------------+      +--------------------+
| UI Component       | ---> | Storage Adapter    |
+--------------------+      +--------------------+
                                     |
                                     v
                            +--------------------+
                            | IndexedDB API      |
                            +--------------------+
```

### 12.6 Anti Pattern
Menyimpan array JSON berisi 10,000 riwayat transaksi keuangan ke dalam LocalStorage, menyebabkan seluruh tab peramban hang selama proses serialization (`JSON.stringify`).

### 12.7 Best Practice
Menerapkan skema versi pada database (IndexedDB versi 1, 2, dst) untuk mengatur proses migrasi (`IndexedDB onupgradeneeded`) ketika struktur entitas domain berubah.

### 12.8 Decision Matrix
| Storage Engine | Sinkron / Asinkron | Kapasitas | Keputusan Penggunaan |
|---|---|---|---|
| LocalStorage | Sinkron (Blocking) | ~5MB | Hanya config & UI state kecil |
| IndexedDB | Asinkron | >50MB | Data Domain / Logika Bisnis |

### 12.9 Checklist
- [x] Wrapper Promise untuk IndexedDB digunakan.
- [x] Migrasi skema difasilitasi.

### 12.10 References
* W3C Indexed Database API 3.0.

---

## BAB 13 Database Standard

### 13.1 Purpose
Menstandarkan struktur tabel/Object Store dan format dokumen (JSON) di dalam IndexedDB, memastikan validitas entitas, granularitas, dan keandalan data (sejalan dengan paradigma High-Granularity Nexus).

### 13.2 Scope
Desain skema dokumen (Document Schema) untuk Modul Finance, Vehicle, Asset, Family, dan Shop. Manajemen indeks pencarian dan struktur kunci utama (Primary Keys).

### 13.3 Rules
1. Setiap record wajib memiliki format identifikasi standar: `id` (UUIDv4 atau timestamp berbasis hash), `createdAt` (ISO 8601), dan `updatedAt` (ISO 8601).
2. Data bersifat Soft Delete (menggunakan flag `isDeleted: true`); dilarang melakukan penghapusan data mentah (hard delete) untuk menjaga integritas historis (Sinking Fund logic, Predictive Appreciation).

### 13.4 Design Principles
Schema-less Flexibility with Application-level Rigidity. Walaupun IndexedDB beroperasi seperti NoSQL document store, aplikasi (modul) WAJIB memberlakukan validasi struktur ketat (pseudo-schema) sebelum melakukan insert/update.

### 13.5 Examples
Format standar Object Store untuk modul Vehicle:
```json
{
  "id": "vhc_9a8b7c...",
  "type": "MAINTENANCE_LOG",
  "vehicleId": "vario_125_kzr",
  "metrics": { "odometer": 42100, "cost": 150000 },
  "details": { "parts": ["Oil Extreme", "Spark Plug"] },
  "createdAt": "2026-03-15T08:00:00Z",
  "isDeleted": false
}
```

### 13.6 Anti Pattern
Menulis Object langsung dari Form UI ke Database tanpa melalui lapisan validasi sanitasi tipe data (misalnya biaya tersimpan sebagai string `"150000"` alih-alih number `150000`).

### 13.7 Best Practice
Menggunakan indeks jamak (compound indexes) jika sering melakukan query kombinasi (misal: mengambil data Finance berdasarkan rentang bulan dan tipe pengeluaran).

### 13.8 Decision Matrix
| Format Relasi | Denormalisasi (Embedded) | Normalisasi (Terpisah) | Keputusan |
|---|---|---|---|
| Performa Read lokal | Sangat Cepat | Lambat (butuh join manual) | Denormalisasi (Lebih disukai) |
| Konsistensi Update | Kompleks | Sangat Sederhana | Tergantung ukuran entitas |

### 13.9 Checklist
- [x] Format timestamp baku ditetapkan.
- [x] Mekanisme Soft Delete wajib jalan.

### 13.10 References
* NoSQL Data Modeling Techniques.

---

## BAB 14 Event Architecture

### 14.1 Purpose
Membangun saraf pusat komunikasi OS (Event Bus). Mengelola pengiriman sinyal (events) asinkron tanpa menimbulkan kebocoran memori (memory leak) atau ghost events.

### 14.2 Scope
Sistem Pub/Sub internal Nexus V6, event naming convention, event payload standards, dan eksekusi event loops.

### 14.3 Rules
1. Format nama event harus kapital dan dipisahkan underscore: `[NAMA_MODUL]_[AKSI]_[STATUS]` (Contoh: `FINANCE_TRANSACTION_ADDED`).
2. Payload event harus Immutable. Event bus tidak boleh mengubah data payload di tengah perjalanan (transit).
3. Setiap komponen yang melakukan subscribe WAJIB melakukan unsubscribe saat di-unmount atau dihancurkan.

### 14.4 Design Principles
Decoupled & Reactive. Pengirim (Publisher) tidak perlu mengetahui ada berapa modul pendengar (Subscriber) yang bereaksi terhadap event-nya. Hal ini menjaga arsitektur tetap longgar (loosely coupled).

### 14.5 Examples
```javascript
// Publisher (di dalam Finance Module)
CoreEventBus.publish('FINANCE_FUNDS_LOW', { currentBalance: 15000 });

// Subscriber (di dalam Dashboard Hub / AI Module)
CoreEventBus.subscribe('FINANCE_FUNDS_LOW', (payload) => {
  DashboardHub.triggerAlert(`Peringatan Saldo: ${payload.currentBalance}`);
});
```

### 14.6 Anti Pattern
* Membuat event berantai tak berujung (Infinite Event Loop): Event A memicu Event B, Event B memicu Event C, Event C memicu Event A.
* Menggunakan event bus untuk melakukan transfer data massa (misal: mengirim query data base utuh sebesar 50MB melalui event payload).

### 14.7 Best Practice
Batasi payload hanya untuk membawa metadata (seperti ID atau status kecil). Biarkan penerima (Subscriber) menarik data lengkap dari Storage jika diperlukan berdasarkan ID tersebut.

### 14.8 Decision Matrix
| Pendekatan | Callbacks Terikat | Global Event Bus | Keputusan |
|---|---|---|---|
| Modularitas | Sangat Rendah | Sangat Tinggi | Event Bus |

### 14.9 Checklist
- [x] Event bus dirancang singleton.
- [x] Garbage collection untuk dead listeners terjamin.

### 14.10 References
* Observer Pattern (Gang of Four).

---

## BAB 15 AI Architecture

### 15.1 Purpose
Menetapkan protokol integrasi AI Module, bertindak sebagai Copilot cerdas yang memahami konteks os, menggerakkan metrik analitik, dan memproses prediksi tanpa membocorkan privasi.

### 15.2 Scope
Konfigurasi prompt injection (system instructions), pembatasan akses DOM oleh AI, penggunaan Web Worker untuk kalkulasi tensor/logic parsial AI, dan format output laporan otomatis.

### 15.3 Rules
1. AI Module DILARANG memiliki akses tulis (Write Access) secara langsung ke eksekusi kernel/GROUP_A. AI hanya dapat menyarankan struktur data (Drafting) atau mengirim event.
2. Interaksi API dari eksternal LLM (seperti Gemini, Claude) yang ditarik ke dalam OS lokal WAJIB dilakukan melalui lapisan Proxy/Adapter yang membuang data sensitif sebelum dikirim ke luar.

### 15.4 Design Principles
Augmented Intelligence, Absolute Constraint. AI mengusulkan, manusia (atau rule system yang ketat) memutuskan. AI beroperasi di ruang berpasir (Sandbox) dalam arsitektur Nexus V6.

### 15.5 Examples
AI Workflow untuk Predictive Asset Appreciation:
```
[Asset Data] -> [AI Adapter Layer] -> [Prompt Constructor] -> [LLM API/Local Logic] -> [Output Parser] -> [Event: AI_INSIGHT_READY] -> [Dashboard Widget]
```

### 15.6 Anti Pattern
Mengirimkan fungsi `eval()` kepada output AI dan menjalankannya sebagai baris kode native di dalam peramban.

### 15.7 Best Practice
Meminta output dari AI murni dalam format struktur JSON, lalu OS memvalidasi skema JSON tersebut sebelum diparsing dan dirender.

### 15.8 Decision Matrix
| Output Form AI | Teks Tidak Terstruktur | JSON / Object Bounded | Keputusan |
|---|---|---|---|
| Ekstraksi OS | Butuh regex kompleks | Parsable langsung | JSON Terstruktur |

### 15.9 Checklist
- [x] Parameter injeksi dibatasi.
- [x] Tidak ada eksekusi string dinamis dari AI (eval/Function).

### 15.10 References
* LLM Sandbox Principles (OWASP for LLMs).

---

## BAB 16 Dashboard Architecture

### 16.1 Purpose
Sebagai Command Center tunggal (Dashboard Hub), lapisan ini bertugas menampilkan agregat visual dari semua modul GROUP_B dalam form factor High-Granularity Android Style Widget.

### 16.2 Scope
Sistem Grid UI, manajemen status Widget (Loading, Active, Error), render dinamis berdasarkan registrasi modul, dan hierarki DOM.

### 16.3 Rules
1. Dashboard Hub dilarang menyimpan logika bisnis. Hub HANYA merender status (View Layer Murni).
2. Tampilan wajib responsif menggunakan Vanilla CSS Grid/Flexbox, tanpa library styling tambahan (Tailwind/Bootstrap dilarang).
3. Penggunaan Dynamic Buffer Logic (margin error visual) 5% harus ada dalam indikator progres.

### 16.4 Design Principles
Dumb Components, Smart Containers. Hub (Container) mendapatkan data lewat Event Bus dan menyuntikkannya ke DOM (Komponen statis). Pembaruan UI memanfaatkan template literal ECMAScript secara efisien.

### 16.5 Examples
```javascript
const renderWidget = (title, dataHTML) => `
  <div class="v6-widget-card" data-status="active">
    <header class="widget-head">${title}</header>
    <div class="widget-body">${dataHTML}</div>
  </div>
`;
```

### 16.6 Anti Pattern
Menempatkan logika perhitungan Sinking Fund di dalam fungsi render HTML.

### 16.7 Best Practice
Gunakan fitur `requestAnimationFrame` untuk memperbarui DOM pada widget yang membutuhkan update visual cepat tanpa layout thrashing.

### 16.8 Decision Matrix
| Render Strategy | Virtual DOM Kustom | Direct DOM / Template Literals | Keputusan |
|---|---|---|---|
| Kompleksitas Kode | Tinggi | Rendah | Template Literals |
| Kecepatan Murni | Cepat tapi berlebih | Memadai dan Sederhana | Template Literals |

### 16.9 Checklist
- [x] CSS Grid digunakan untuk sistem layout utama.
- [x] Komponen view murni (tanpa bisnis logic).

### 16.10 References
* Reactive UI without Frameworks.

---

## BAB 17 Vehicle Architecture

### 17.1 Purpose
Mendefinisikan arsitektur dan pola penanganan Modul Kendaraan (mengelola Vario 125, Vario 110, dll). Termasuk manajemen logistik, checklist maintenance, dan prediksi penggantian suku cadang.

### 17.2 Scope
Entitas Vehicle, MaintenanceLog, PartLifecycle. Parameter pemicu otomatis (Trigger Parameters), dan integrasi dengan kalender waktu.

### 17.3 Rules
1. Setiap entitas suku cadang wajib memiliki parameter usia (Odometer & Rentang Waktu Bulan).
2. Data kendaraan bersifat spesifik (High-Granularity): tipe oli, viskositas, batas tegangan aki, harus dicatat presisi.

### 17.4 Design Principles
Threshold-Based Triggers. Modul ini berjalan secara pasif. Saat update odometer dikirimkan, sistem menghitung delta (selisih) dari suku cadang, dan jika nilai ambang tercapai, ia akan menembakkan event `VEHICLE_SERVICE_REQUIRED`.

### 17.5 Examples
Flow Diagram Perawatan:
```
[User Inputs Odometer: 45000] -> [Vehicle Module Checks Thresholds]
  |--> (If Odometer - LastOil > 2000) -> [Trigger: GANTI OLI]
  |--> (If V-Belt Life < 5%) -> [Trigger: PERINGATAN V-BELT]
[Emit Event ke Hub] -> [Tampilkan Notifikasi]
```

### 17.6 Anti Pattern
Menggabungkan data biaya perawatan kendaraan (Cost) dengan logistik tanpa menyinkronkannya dengan FinanceModule.

### 17.7 Best Practice
Semua biaya yang dihasilkan dalam Modul Vehicle secara otomatis mengirimkan payload ke Modul Finance (sebagai pencatatan expense pengeluaran) melalui Event Bus.

### 17.8 Decision Matrix
| Sinkronisasi Biaya | Input Manual 2 Kali | Event Bus Auto-Sync | Keputusan |
|---|---|---|---|
| Efisiensi Pengguna | Buruk | Sangat Baik | Auto-Sync |

### 17.9 Checklist
- [x] Entitas metrik Odometer distandarisasi.
- [x] Standar integrasi antar modul (ke Finance) aktif.

### 17.10 References
* Predictive Maintenance Algorithms.

---

## BAB 18 Finance Architecture

### 18.1 Purpose
Mengelola kesehatan moneter dengan format Sinking Fund (Master 4A & 4B) dan kalkulasi prediktif. Arsitektur harus mengakomodasi Critical Health Dashboard untuk arus kas, aset lancar, dan dana darurat.

### 18.2 Scope
Manajemen Ledger, Kalkulasi Saldo (Balance Calculator), Kategorisasi Bisnis vs Personal, Sinking Fund dialokasi, dan pelaporan Raw Metadata Block.

### 18.3 Rules
1. Mutasi adalah Immutable. Transaksi yang dicatat tidak dapat diubah; jika ada kesalahan, wajib mencatat jurnal koreksi (Reversal) alih-alih melakukan overwrite. (Kecuali revisi struktural/metadata langsung).
2. Sistem wajib mengalokasikan Sinking Fund secara virtual tanpa memindahkan uang secara fisik dari dompet.

### 18.4 Design Principles
Double-Entry Pattern (Simplified). Setiap pengeluaran atau pemasukan wajib memiliki sumber dan tujuan (walaupun dalam kategori dompet virtual). Menjamin konsistensi agregat data 100%.

### 18.5 Examples
Sinking Fund Logic Array:
```javascript
const allocateFund = (totalIncome) => {
  return {
    operational: totalIncome * 0.40,
    maintenance: totalIncome * 0.15, // Link to Vehicle
    saving: totalIncome * 0.45
  }
}
```

### 18.6 Anti Pattern
Menggunakan angka bertipe Float JavaScript (`0.1 + 0.2`) secara langsung untuk operasi mata uang, menyebabkan error fraksi `0.30000000000000004`.

### 18.7 Best Practice
Menyimpan semua nilai moneter dalam format Integer (Sen, atau nominal dasar tanpa desimal dalam konteks Rupiah) selama di DB dan kalkulasi, lalu memformat ulang hanya pada level UI Rendering.

### 18.8 Decision Matrix
| Penanganan Nilai Uang | Float Point Math | Integer / BigInt Math | Keputusan |
|---|---|---|---|
| Akurasi Jangka Panjang | Rentan Kebocoran | Stabil dan Mutlak | Integer Math |

### 18.9 Checklist
- [x] Matematika moneter dijamin aman dari presisi error JS.
- [x] Jurnal rekam jejak immutable.

### 18.10 References
* Fowler, Martin: Accounting Patterns.

---

## BAB 19 Asset Architecture

### 19.1 Purpose
Membangun sistem inventarisasi dan audit tata ruang fisik/lahan (termasuk Regular Vegetation Audit dan pengukuran konstruksi).

### 19.2 Scope
Entitas Properti Fisik (Lahan Kwaderan 2.350 m2), Entitas Konstruksi (Rumah WN), Depresiasi Aset, dan Predictive Asset Appreciation.

### 19.3 Rules
1. Ukuran/dimensi metrik fisik wajib menggunakan satuan SI standar (Meter, Centimeter) dan disimpan secara seragam.
2. Setiap perubahan status lahan/vegetasi dicatat dalam format array audit berbasis waktu.

### 19.4 Design Principles
Spatial Data Integrity. Data struktur fisik (misalnya rancangan kamar mandi, pipa septic tank, jumlah pohon alpukat) dipetakan sebagai metadata graf berbasis hirarki.

### 19.5 Examples
Mempresentasikan Lahan Kwaderan:
```javascript
const landAudit = {
  id: "lhn_kwa_01",
  area: 2350,
  unit: "m2",
  vegetation: [
    { type: "Sengon", count: 120, estValue: 150000, maturityTime: "2030-01" }
  ],
  metadata: { version: "V5.0", auditDate: "2026-02" }
}
```

### 19.6 Anti Pattern
Menggabungkan aset fana (peralatan habis pakai) dengan aset strategis (Lahan, Emas, Kripto) dalam satu Object Store tanpa pembeda tipe aset (AssetClass).

### 19.7 Best Practice
Klasifikasi Aset Ketat: TANGIBLE (Lahan, Bangunan), VEHICLE (terhubung ke modul Vehicle), LIQUID (Emas, Kripto), DEPRECIATING (Peralatan).

### 19.8 Decision Matrix
| Audit Vegetasi | Catat Total Area Saja | Granularitas per Pohon/Spesies | Keputusan |
|---|---|---|---|
| Presisi Estimasi Harga | Sangat Rendah | Sangat Tinggi | Granularitas per Spesies |

### 19.9 Checklist
- [x] Klasifikasi aset didirikan.
- [x] Prediksi masa panen/maturity terekam sistem.

### 19.10 References
* Land & Resource Management DB Schema.

---

## BAB 20 Cross Module Communication

### 20.1 Purpose
Mekanisme spesifik untuk menyelesaikan kebutuhan interaksi kompleks, seperti saat FinanceModule perlu mem-validasi apakah budget cukup sebelum VehicleModule memesan spare part.

### 20.2 Scope
Synchronous Request-Reply pattern menggunakan Event Bus dengan balasan asinkron via Promise layer atau jembatan API Kernel (Cross-Module Bridge).

### 20.3 Rules
1. Tidak ada Direct Function Call (RPC). Semua pemanggilan modul ke modul menggunakan Message Passing yang ditengahi Registry.
2. Format Triple-Lock Verification diimplementasikan untuk setiap transfer status tingkat kritikal.

### 20.4 Design Principles
Saga Pattern (Micro/Local). Operasi lintas modul dijalankan sebagai saga terpisah; jika gagal pada satu titik, ia harus mengirimkan event pembatalan/rekompensasi (Compensating Transaction).

### 20.5 Examples
```
[Vehicle Module] --(REQ: BUDGET_CHECK)--> [Event Bus] --(REQ: BUDGET_CHECK)--> [Finance Module]
[Finance Module] --(RES: BUDGET_OK)-----> [Event Bus] --(RES: BUDGET_OK)-----> [Vehicle Module]
[Vehicle Module] --(EXEC: DO_MAINTENANCE)-> [Local Storage & UI Updates]
```

### 20.6 Anti Pattern
Modul Vehicle `await` secara langsung fungsi internal Finance. Jika modul Finance dinonaktifkan (unmounted), modul Vehicle akan mengalami Unhandled Promise Rejection crash.

### 20.7 Best Practice
Menerapkan skema Timeout. Jika Module B tidak merespons dalam 500ms, Module A berasumsi Module B gagal atau offline dan memberikan respons default (Graceful degradation).

### 20.8 Decision Matrix
| Komunikasi Inter-Domain | Direct RPC Lokal | Asynchronous Messaging | Keputusan |
|---|---|---|---|
| Stabilitas Sistem | Rentan Crash Beruntun | Tahan Banting | Asynchronous Messaging |

### 20.9 Checklist
- [x] Timeout fallback disertakan.
- [x] Triple-Lock verifikasi untuk data kritikal.

### 20.10 References
* Enterprise Integration Patterns: Message Broker.

---

## BAB 21 API Standard

### 21.1 Purpose
Mendefinisikan antarmuka internal (API Kernel) di dalam OS Nexus V6. Walaupun offline-first, istilah API di sini merujuk pada standar kontrak Object/Interface antar komponen.

### 21.2 Scope
Kernel API, Module Interface API, Event Payload Schema.

### 21.3 Rules
1. Setiap fungsi pabrik wajib mengembalikan Objek dengan kontrak yang ketat.
2. Tidak boleh ada Properti Objek yang bersifat Publik secara mutlak (gunakan `#privateField` ECMAScript atau closure pattern) untuk mencegah mutasi liar.

### 21.4 Design Principles
Interface Segregation Principle. Modul tidak boleh dipaksa bergantung pada antarmuka OS yang tidak ia gunakan.

### 21.5 Examples
Standar API Objek Modul:
```javascript
const ShopAdapter = (() => {
  let isMounted = false;
  return {
    mount: async () => { isMounted = true; },
    unmount: () => { isMounted = false; },
    status: () => isMounted
  };
})();
```

### 21.6 Anti Pattern
Mengekspos Object Database/Storage utuh ke antarmuka Module, sehingga Modul bebas men-drop database OS.

### 21.7 Best Practice
Berikan BoundedContext API per modul. Modul Finance hanya menerima interface database yang beroperasi di table Finance.

### 21.8 Decision Matrix
| Pola Privasi Field | Closure (IIFE/Factory) | Class Private (#field) | Keputusan |
|---|---|---|---|
| Performa & Dukungan | Sangat Baik (Lebih tua) | Native, Clean syntax | Class Private (#field) |

### 21.9 Checklist
- [x] Private state diamankan.
- [x] Kernel mengekspos fitur spesifik domain.

### 21.10 References
* SOLID Principles: Interface Segregation.

---

## BAB 22 Adapter Pattern

### 22.1 Purpose
Menangani integrasi dengan API eksternal pihak ketiga (misalnya harga Crypto Spot atau prakiraan cuaca) dengan memisahkan kode native Nexus dari eksternalitas.

### 22.2 Scope
External Fetch API, Data Transformation, Error Handling spesifik vendor, Fallback Response, Cache (SWR - Stale While Revalidate).

### 22.3 Rules
1. Eksternal API Call dilarang berada di dalam Core Module Logic. Wajib dimasukkan ke dalam sub-folder `/adapters`.
2. Jika offline, Adapter wajib mengembalikan data dari Cache (IndexedDB) dan tidak boleh mem-block sistem.

### 22.4 Design Principles
Hexagonal Architecture (Ports and Adapters). Lapisan paling luar beradaptasi dengan dunia luar dan menerjemahkannya ke dalam bahasa domain internal Nexus.

### 22.5 Examples
```
[External API (BTC/USDT)] -> (JSON Murni)
      |
[CryptoAdapter] -> (Translasi ke Nexus Asset Structure)
      |
[Nexus Event Bus / Module]
```

### 22.6 Anti Pattern
Memasukkan API Key secara hardcode di dalam file adapter yang dikomit.

### 22.7 Best Practice
Gunakan LocalStorage untuk menyimpan API Key (User Settings). Adapter mengambil key dari OS Kernel saat eksekusi. Implementasikan pola Circuit Breaker jika API eksternal gagal terus menerus.

### 22.8 Decision Matrix
| Penanganan Error API | Retry Polling Tanpa Batas | Circuit Breaker + Cache | Keputusan |
|---|---|---|---|
| Penggunaan Baterai | Boros | Sangat Efisien | Circuit Breaker |

### 22.9 Checklist
- [x] Adapter Pattern membungkus panggilan pihak ketiga.
- [x] Fallback offline terjamin.

### 22.10 References
* Alistair Cockburn: Hexagonal Architecture.

---

## BAB 23 Dependency Rules

### 23.1 Purpose
Menjamin arsitektur sistem tidak membusuk menjadi "Big Ball of Mud" melalui pembatasan arah referensi impor pada struktur kode Vanilla JS.

### 23.2 Scope
Aturan impor file (ES Modules import / export), pemetaan level (Tier), pelarangan circular dependency.

### 23.3 Rules
1. Aturan Arah (Directional Rule): Komponen spesifik/UI boleh mengimpor dari Komponen Inti (Core/Domain), namun Core TIDAK BOLEH mengimpor spesifik UI.
2. Dilarang keras melakukan circular import (File A impor File B, File B impor File A).

### 23.4 Design Principles
The Dependency Inversion Principle & Acyclic Dependencies. Inti bisnis aturan OS Nexus harus kebal terhadap perubahan desain UI atau metode penyimpanan.

### 23.5 Examples
Dependency Graph:
```
[UI Layer (Widgets)]
    |
    v (Imports from)
[GROUP_B Modules (Finance/Vehicle)]
    |
    v (Imports from)
[GROUP_A Kernel (EventBus/Registry/Storage)]
```

### 23.6 Anti Pattern
Modul Kernel mendaftarkan spesifik FinanceUI dan melakukan import langsung: `import FinanceUI from '../group_b_modules/finance/UI.js';` (Ini melanggar arah panah dependensi).

### 23.7 Best Practice
Kernel hanya menyediakan fungsi pendaftaran dinamis (`registerWidget(name, htmlTemplate)`), dan UI Layer yang mendorong template tersebut ke Kernel.

### 23.8 Decision Matrix
| Manajemen Dependency | Static Import Seluruhnya | Dynamic Injection (IoC) | Keputusan |
|---|---|---|---|
| Fleksibilitas Arsitektur | Terkunci ketat | Fleksibel & Teruji (Testable) | Dynamic Injection |

### 23.9 Checklist
- [x] Struktur Acyclic diverifikasi.
- [x] Arah import menuju pusat domain.

### 23.10 References
* Clean Architecture: The Dependency Rule.

---

## BAB 24 Build System

### 24.1 Purpose
Mendefinisikan proses transformasi kode Vanilla modular (Development) menjadi satu kesatuan bundel PWA (Production) yang ringan, teroptimasi, dan siap dijalankan offline-first.

### 24.2 Scope
Skrip `build.js` berbasis Node.js murni, Concatenation, Minification sederhana, HTML Inlining, dan Service Worker generation.

### 24.3 Rules
1. Proses Build wajib berdurasi kurang dari 3 detik (Fast Compilation).
2. Dilarang bergantung pada Webpack, Vite, atau bundler kompleks eksternal untuk menghindari kelusuhan arsitektur.
3. Output harus 1 file `index.html` (termasuk inline CSS/JS) atau maksimal 3 file (`index.html`, `app.js`, `sw.js`).

### 24.4 Design Principles
Transparent Build Process. Build script adalah file konfigurasi yang bisa dibaca dan dimodifikasi langsung oleh pemilik OS atau AI asisten kapan saja.

### 24.5 Examples
Logika Build Flow:
1. Baca manifest modul (GROUP_A & GROUP_B).
2. Baca file `.js` sesuai urutan kernel -> adapters -> modules -> ui.
3. Gabungkan seluruh teks menggunakan file stream.
4. Tulis ke `/dist/app.js`.

### 24.6 Anti Pattern
Menggunakan transpiler raksasa yang membutuhkan gigabytes `node_modules` hanya untuk menggabungkan file JavaScript murni.

### 24.7 Best Practice
Menerapkan cache-busting sederhana di production dengan menambahkan parameter timestamp pada registrasi service worker atau nama file bundel.

### 24.8 Decision Matrix
| Bundler System | Zero-Config Bundler (Parcel) | Custom Vanilla Concatenator | Keputusan |
|---|---|---|---|
| Maintainability (10 Tahun) | Mungkin Deprecated | Bisa diperbaiki manual selamanya | Custom Vanilla |

### 24.9 Checklist
- [x] Skrip berbasis `fs` murni (File System).
- [x] Ukuran bundel diawasi (<500 KB ideal).

### 24.10 References
* Rollup Philosophy (Simplifikasi Konsep).

---

## BAB 25 Testing Standard

### 25.1 Purpose
Memastikan stabilitas dan kebenaran matematis sistem OS (seperti alokasi kalkulasi Sinking Fund) sebelum rilis ke production state.

### 25.2 Scope
Unit Testing (Pure functions), Integration Testing (IndexedDB Flow), Validasi Konvensi Penamaan (Linting statis), dan Standar Mock Data.

### 25.3 Rules
1. Seluruh fungsi kalkulasi uang, estimasi tanggal, dan algoritma Predictive Appreciation WAJIB memiliki setidaknya 1 unit test murni.
2. Dilarang melakukan test manipulasi DOM langsung, lakukan test terhadap state keluaran komponen tersebut.

### 25.4 Design Principles
Test pure logic, Ignore the DOM. DOM itu fluktuatif, tapi bisnis logik statis. Lebih murah (komputasi) melakukan ratusan unit test murni pada Modul dibandingkan 10 UI Test berbalut framework.

### 25.5 Examples
Menulis custom test runner 20 baris di Vanilla JS (tidak perlu Jest/Mocha):
```javascript
const test = (name, fn) => {
  try { fn(); console.log(`[PASS] ${name}`); }
  catch(e) { console.error(`[FAIL] ${name}: ${e.message}`); }
};

test("Sinking fund allocation correct", () => {
  const result = allocateFund(10000);
  if(result.saving !== 4500) throw new Error("Math fail");
});
```

### 25.6 Anti Pattern
Mengandalkan QA/Pengujian manual dengan memasukkan data palsu berulang-ulang melalui antarmuka web form setiap kali akan deploy rilis baru.

### 25.7 Best Practice
Gunakan Data Seeding untuk integration testing menggunakan format Raw Metadata Block standar.

### 25.8 Decision Matrix
| Strategi Testing | E2E (Playwright) | Pure Logic Unit Testing | Keputusan |
|---|---|---|---|
| Beban Infrastruktur | Tinggi | Nyaris Nol | Pure Logic Utama |

### 25.9 Checklist
- [x] Algoritma utama tervalidasi matematis.
- [x] Custom test runner disertakan dalam skrip utilitas.

### 25.10 References
* Martin Fowler: The Test Pyramid.

---

## BAB 26 Documentation Standard

### 26.1 Purpose
Memastikan seluruh struktur pemikiran (Source of Truth) terabadikan dengan cara yang dapat diproses baik oleh manusia (pemilik OS) dan mesin/AI (sebagai system instruction).

### 26.2 Scope
Standar struktur Master Note, Raw Metadata, High-Granularity format, dan integrasi dengan catatan referensial Google Keep yang sudah ada.

### 26.3 Rules
1. Semua update substansial wajib mencatat stempel waktu (Timestamp) yang jelas.
2. Seluruh dokumentasi Master Snapshot wajib menyertakan Raw Metadata di bagian ekor catatan.

### 26.4 Design Principles
Living Documentation & Machine Readability. Dokumentasi tidak hanya teks diam; melainkan metadata (JSON berformat) yang tertanam (embedded) di dalam markdown yang bisa dibaca dan dienkripsi ulang oleh AI ketika dipanggil (Restore/Master Snapshot).

### 26.5 Examples
Raw Metadata Block (Contoh):
```json
{
  "system_version": "v6.0",
  "audit_timestamp": "2026-07-15T12:00",
  "modules_active": ["vehicle", "finance", "asset"]
}
```

### 26.6 Anti Pattern
Menulis deskripsi kode naratif panjang (novel) tanpa menyertakan blok kode spesifik atau tabel matriks keputusan, menjadikannya rentan salah tafsir oleh AI.

### 26.7 Best Practice
Gunakan ASCII Diagram dalam teks (seperti di blueprint ini) untuk memberi konteks relasional spasial tanpa perlu bergantung pada ekstensi peramban perender gambar.

### 26.8 Decision Matrix
| Format Dokumen | DOCX/PDF Terpisah | In-code Markdown (MD) | Keputusan |
|---|---|---|---|
| Version Control | Sulit dilacak diff | Git Diff native, AI Read | Markdown (MD) |

### 26.9 Checklist
- [x] Metadata Block selalu tersedia di footer lapor.
- [x] Penamaan versi sistem direfleksikan jelas (V6).

### 26.10 References
* Documentation as Code (Docs-as-code) Principles.

---

## BAB 27 AI Collaboration Rules

### 27.1 Purpose
Menetapkan protokol komunikasi mutlak antara Pemilik OS dan Asisten AI (Agent) selama proses rekayasa, coding, atau Restore Snapshot.

### 27.2 Scope
System instructions, pelarangan dummy data, penguncian paten struktur laporan, kewajiban konfirmasi High-Granularity.

### 27.3 Rules
1. AI Dilarang keras menggunakan data imajinasi/dummy; jika data riil tidak ditemukan, tampilkan sebagai "Data Belum Terinput".
2. Setiap kali Pemilik OS meminta 'RESTORE' atau 'MASTER SNAPSHOT', AI wajib mematuhi 5 Blok Utama.
3. Arsitektur blueprint OS (BP-015) tidak dapat ditimpa oleh permintaan percakapan generik yang bersifat destruktif.

### 27.4 Design Principles
Deterministic AI Output. Interaksi AI dibatasi pada rel pemformatan yang ketat (Strict Schema Prompting) agar hasil generasinya 100% kompatibel dengan infrastruktur parser Nexus.

### 27.5 Examples
Protokol Perintah Utama:
```
USER: Tampilkan MASTER SNAPSHOT untuk Lahan Kwaderan.
AI: [Memproses pencarian via Personal Context/Keep] -> [Menyajikan UI Widget V6 Android Style dengan 5 Blok Utama] -> [Akhiri dengan Raw Metadata]
```

### 27.6 Anti Pattern
AI secara mandiri menghapus properti Object JSON karena menganggap field tersebut "tidak penting" tanpa melakukan validasi ke sistem Core Rules.

### 27.7 Best Practice
Menyimpan System Instruction dan Blueprint BP-015 ini sebagai pinned prompt context untuk semua sesi coding.

### 27.8 Decision Matrix
| Handling Kekosongan Data | Halusinasi Data Palsu | Peringatan Eksplisit (Belum Terinput) | Keputusan |
|---|---|---|---|
| Integritas OS | Fatal & Rusak | Aman & Terjaga | Peringatan Eksplisit |

### 27.9 Checklist
- [x] Aturan halusinasi AI dinonaktifkan via Prompt System.
- [x] Paten V6 Android Style Dashboard disetujui.

### 27.10 References
* Prompt Engineering: Constraining LLM Outputs for Software Integration.

---

## BAB 28 Release Management

### 28.1 Purpose
Menstandarkan protokol rilis/penempatan (Deployment) agar setiap iterasi pembaruan kode tidak memutus integritas data lokal (IndexedDB) yang sudah ada di perangkat Pemilik OS.

### 28.2 Scope
Pemberian versi (Versioning: Semantic Versioning), Migrasi Skema (Migration Scripts), Strategi Invalidate Service Worker (Cache Eviction).

### 28.3 Rules
1. Pembaruan Minor (Bugfix UI) tidak boleh menyentuh versi database.
2. Pembaruan Mayor (Penambahan Struktur Kolom DB Baru) wajib diiringi dengan logika script Migrasi di lapisan Kernel.
3. Tidak pernah melakukan `indexedDB.deleteDatabase()` secara sepihak dari sisi rilis OS.

### 28.4 Design Principles
Backward Compatibility is Absolute. Kode baru harus bisa menangani (handle) bentuk data lama. Jika data lama kurang field `maturityTime`, kode harus menyuntikkannya secara dinamis atau mengatasinya di lapisan View.

### 28.5 Examples
Standar Migrasi di IndexedDB:
```javascript
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

  if (oldVersion < 2) { // Migrasi ke V6.2
    const tx = event.target.transaction;
    const store = tx.objectStore('finance');
    store.createIndex('byCategory', 'category', { unique: false });
  }
};
```

### 28.6 Anti Pattern
Merilis struktur kode UI yang berasumsi semua record lama sudah memiliki field X, menyebabkan blank screen of death saat aplikasi me-render list masa lalu.

### 28.7 Best Practice
Jalankan prosedur Snapshot Data Audit sebelum menekan tombol rilis, backup format JSON seluruh IndexedDB menggunakan utilitas Export/Import lokal OS.

### 28.8 Decision Matrix
| Eksekusi Migrasi Data | Offline Migration Node | Client-Side Migration (onUpgradeNeeded) | Keputusan |
|---|---|---|---|
| Kompleksitas Proses | Terlalu Berbelit | Standard Native Web API | Client-Side Migration |

### 28.9 Checklist
- [x] Proteksi hard-delete IndexedDB.
- [x] Mekanisme invalidasi cache (SW update) aman.

### 28.10 References
* Progressive Web App Update Strategies (Google Developers).

---

## BAB 29 Governance

### 29.1 Purpose
Mengunci tata kelola kode, standarisasi kepatuhan arsitektur, dan memegang otoritas atas persetujuan perubahan besar (Major RFC) di dalam Nexus V6.

### 29.2 Scope
Pengaturan Blueprint sebagai konstitusi, proses pengajuan revisi sistem (Perubahan ke V7), Hak Akses Modul.

### 29.3 Rules
1. Dokumen BP-015 (Dokumen ini) adalah HUKUM TERTINGGI untuk repository Nexus. Setiap kode yang melanggar dokumen ini dianggap cacat (void) dan harus ditolak/dihapus (reverted).
2. Perubahan pada BP-015 hanya boleh dilakukan secara eksklusif oleh Pemilik OS.

### 29.4 Design Principles
Dictatorial Governance, Immutable Core. Otoritas tunggal. Tidak perlu kompromi pada "trend developer". Sistem dibangun agar bertahan dan tidak mengikuti hype teknologi di luar aturan dasar Vanilla JS.

### 29.5 Examples
Alur Tata Kelola Revisi:
```
[Ide Fitur Baru: Integrasi API Saham] -> [Cek BP-015 Bab 5: Scope & Bab 6: Non Goals]
  |--> (Sesuai? Lanjut ke Bab 22 Adapter Pattern)
  |--> (Melanggar? Tolak Fitur secara mutlak)
```

### 29.6 Anti Pattern
Menyetujui fitur yang merusak struktur Modular Monolith hanya karena skrip (Snippet) dari internet tampak menarik.

### 29.7 Best Practice
Membiasakan pendekatan Read The Fucking Blueprint (RTFBP) untuk setiap Agen AI atau pengelola sebelum mulai merombak satu folder pun di repo.

### 29.8 Decision Matrix
| Kepemimpinan Proyek | Demokratis (Voting Tim) | Benevolent Dictator (Pemilik) | Keputusan |
|---|---|---|---|
| Ketepatan Visi | Rentan Scope Creep | Konsisten dan Sentralistik | Benevolent Dictator |

### 29.9 Checklist
- [x] Otoritas Master disahkan.
- [x] Hierarki kepatuhan hukum kode dikunci (Kode wajib tunduk pada Dokumen).

### 29.10 References
* The Benevolent Dictator For Life (BDFL) Governance Model.

---

## BAB 30 Acceptance Criteria

### 30.1 Purpose
Syarat penyelesaian (Definition of Done). Matriks ini menjadi patokan apakah sistem Nexus V6 siap dioperasikan dalam lingkungan produksi riil oleh pengguna secara seutuhnya.

### 30.2 Scope
Performa, Stabilitas Offline, Keselarasan AI UI (Android V6 Widget Style), Validasi Database, dan Laporan Raw Metadata.

### 30.3 Rules
1. Nexus V6 harus bisa dimatikan (perangkat masuk mode Flight Mode), di-restart, dan seluruh data yang ada harus persisten.
2. Proses Cold Start aplikasi (dari tap ikon OS ke visualisasi Dashboard Utama yang dirender penuh) di bawah 1.5 detik pada spesifikasi menengah.
3. Seluruh Modul Core (Vehicle, Finance, Asset, Family, Shop) berfungsi penuh dan bebas error integrasi.

### 30.4 Design Principles
End-to-End Resilience. Sistem harus lulus dari ujian kondisi ekstrim: Storage terbatas, CPU throttling lambat, offline sebulan, dan input string abnormal.

### 30.5 Examples
Test Kriteria Kelulusan Offline:
1. Matikan koneksi internet (Airplane mode).
2. Buka Nexus PWA dari home screen.
3. Input transaksi beli material di modul Shop, potong saldo di Finance.
4. Nyalakan ulang aplikasi (Refresh/Tutup Paksa).
5. Buka dan verifikasi Dashboard.
6. JIKA Dashboard menampilkan sisa saldo termutakhir dengan benar = LULUS (PASS).

### 30.6 Anti Pattern
* Menurunkan kriteria penyelesaian (menoleransi bug loading state atau infinite loading saat koneksi buram/offline).
* Merilis Master Snapshot dengan komponen hilang dan AI menutupi kekosongan menggunakan imajinasi/halusinasi alih-alih melempar status "Data Belum Terinput".

### 30.7 Best Practice
Menjalankan audit lintas matriks pada modul master (Master 4A, Master 4B Sinking Fund, Master 5 Checklist, Master 6 Audit Vegetasi) secara serial setiap seminggu sekali untuk menjamin konsistensi agregat data 100%.

### 30.8 Decision Matrix
| Standar Penyelesaian | Fungsi Berjalan Saja | Stabil, Offline & Tercatat | Keputusan |
|---|---|---|---|
| Kesesuaian Visi | Rendah (Prototype) | Sempurna (Production Source) | Stabil, Offline & Tercatat |

### 30.9 Checklist
- [x] Cold start di bawah 1.5 detik.
- [x] PWA offline mode 100% fungsional (Cek lewat Lighthouse audit).
- [x] Triple-Lock verifikasi disimulasikan tanpa cacat memori.
- [x] BP-015 diresmikan sebagai Source of Truth.

### 30.10 References
* Definition of Done (DoD) in Agile Enterprise Architecture.
* Google Lighthouse PWA Audits.
