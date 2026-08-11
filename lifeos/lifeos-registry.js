// lifeos-registry.js — taksonomi FUNGSIONAL Life OS (beda dari
// FEATURE_REGISTRY yang taksonomi NAVIGASI — keduanya sengaja terpisah,
// lihat personal-life-os-blueprint.md Langkah 1).
//
// PENTING: file ini MURNI DATA. Tidak ada logic, tidak ada akses D di sini
// — cuma daftar "field mana yang jadi sumber apa", dikonsumsi oleh
// adapters/*.js. Tidak mengubah D, tidak mengubah FEATURE_REGISTRY.

// AREAS — domain yang tidak pernah "selesai". dSources = nama array D.*
// yang jadi sumber data Area ini (read-only, lihat masing-masing adapter).
const LIFEOS_AREAS = [
  { key: 'finance',   label: 'Finance',   icon: '💰', dSources: ['transactions', 'accounts', 'budgets', 'budgetReko', 'bills', 'billsArchive', 'debts', 'debtStrategy', 'piutang', 'pajakZakat'] },
  { key: 'business',  label: 'Business',  icon: '🛒', dSources: ['cobek', 'cobekKategori', 'produsen', 'products', 'sewaKios'] },
  { key: 'kendaraan', label: 'Kendaraan', icon: '🚗', dSources: ['vehicles', 'bbmLogs', 'servisLogs', 'kmLogs', 'simList', 'partsStock', 'sparepartCats', 'torsiChecklist', 'jalanLogs'] },
  { key: 'family',    label: 'Family',    icon: '👨‍👩‍👧', dSources: ['milestones', 'tukangWorkers', 'tukangAbsensi', 'tukangBorHargaMemory'] },
  { key: 'health',    label: 'Health',    icon: '🏃', dSources: ['refleksi', 'lifeBalanceSnapshots'] },
  { key: 'spiritual', label: 'Spiritual', icon: '🕌', dSources: ['pajakZakat', 'refleksi'] },
];

// TODAY — irisan waktu, bukan penyimpanan sendiri. Tiap entri nunjuk ke
// array D.* + label; today-adapter.js yang menentukan logic "urgent hari
// ini" per sumber.
const LIFEOS_TODAY_SOURCES = [
  { key: 'bills',     dArr: 'bills',              label: 'Tagihan jatuh tempo' },
  { key: 'reminders', dArr: 'reminders',           label: 'Pengingat umum' },
  { key: 'selfcare',  dArr: 'refleksi',            label: 'Checklist Self-Care & Jurnal Syukur' },
  { key: 'payroll',   dArr: 'gajiMingguanHistory', label: 'Reset Gaji Mingguan' },
  { key: 'tukang',    dArr: 'tukangAbsensi',       label: 'Absensi Tukang/pekerja lepas' },
];

// GOALS — sumber D.* per jenis goal (adapter murni, lihat
// adapters/goal-adapter.js — tidak menyimpan apa pun, dihitung on-the-fly).
const LIFEOS_GOAL_SOURCES = [
  { key: 'target',    dArr: 'targets',           areaKey: 'finance' },
  { key: 'eduFund',   dArr: 'eduFunds',          areaKey: 'finance' },
  { key: 'pensiun',   dArr: 'pensiun',           areaKey: 'finance' },
  { key: 'fi',        dArr: 'finansialFreedom',  areaKey: 'finance' },
  { key: 'wishlist',  dArr: 'wishlist',          areaKey: 'finance' },
  { key: 'debt',      dArr: 'debts',             areaKey: 'finance' },
];

// PROJECTS — sumber legacy (Renovasi) yang di-merge dengan
// LifeOSStore.projects lewat project-adapter.js.
const LIFEOS_PROJECT_LEGACY_SOURCE = { key: 'renovasi', dArr: 'renovProjects', areaKey: 'business' };

// REVIEW — histori pasif existing yang jadi bahan sesi review.
const LIFEOS_REVIEW_SOURCES = [
  { key: 'wealth',      dArr: 'wealthSnapshots' },
  { key: 'lifeBalance', dArr: 'lifeBalanceSnapshots' },
  { key: 'assetAlloc',  dArr: 'assetAllocation' },
];

// KNOWLEDGE — referensi (bukan sumber tulis) ke catatan privat lama.
const LIFEOS_KNOWLEDGE_REF_SOURCE = { key: 'catatan', dArr: 'catatan' };

// LIFE OBJECT — daftar domain LifeOS yang SAH jadi tujuan `sourceRef`
// milik Life Object `kind:"ref"` (lihat lifeos-object-ref.js). Sesi 58
// (keputusan produk final — lihat docs/PRODUCT_DECISIONS.md § LifeOS —
// Life Object sourceRef): `sourceRef` HANYA boleh menunjuk ke domain yang
// terdaftar di sini — BUKAN referensi ke Life Object lain, BUKAN generic
// resolver bebas {kind,id}, BUKAN recursive, BUKAN wildcard domain.
//
// Beda bentuk dgn registry lain (array + `key`) SENGAJA: pemakaiannya
// murni lookup langsung per nama domain (validasi `sourceRef.domain`),
// bukan iterasi/dispatch builder seperti TODAY_SOURCE_BUILDERS dkk — jadi
// object map key=domain lebih pas drpd array+find(). Tiap entry MURNI
// membaca (read-only, sama seperti seluruh adapters/*.js) via fungsi
// adapter yang SUDAH ADA — TIDAK ada logic/agregasi baru di sini:
//   - goal            -> goalAdapterList(D)                     (goal-adapter.js)
//   - project         -> projectAdapterFindOne(D, store, id)     (project-adapter.js)
//   - knowledge       -> knowledgeAdapterList(store)              (knowledge-adapter.js)
//   - review          -> LifeOSStore.reviewLog                    (lifeos-store.js)
//   - finance         -> D.transactions apa adanya                (modules/finance/transaksi.js)
//   - financeAccount  -> D.accounts apa adanya (Sesi 73, Batch 6 — "Finance
//                        Account & Finance Category Foundation") (modules/finance/akun.js)
//   - financeCategory -> D.categories.income/.expense apa adanya (Sesi 73,
//                        Batch 6, sama pola) (modules/finance/kategori.js)
// `resolver`/`exists` sengaja hanya menerima `id` (bukan D/store sbg
// parameter) supaya sesuai kontrak final user (`resolver(id)`/`exists(id)`)
// — pola ini SAMA PERSIS dgn cara goalSourcePensiun()/goalSourceFI() akses
// `Pensiun`/`FI` dari closure global (bukan parameter), lihat goal-adapter.js:
// baca `D`/`LifeOSStore` lewat guard `typeof X !== 'undefined'`, balik
// `null`/`false` (aman, TIDAK throw) kalau belum ter-load — BUKAN
// pelanggaran "zero-touch" krn tetap murni baca, tidak pernah menulis.
const LIFEOS_OBJECT_REF_SOURCES = {
  goal: {
    label: 'Goal',
    resolver(id) {
      if (typeof D === 'undefined' || typeof goalAdapterList !== 'function') return null;
      return goalAdapterList(D).find((g) => g.id === id) || null;
    },
    exists(id) {
      return !!LIFEOS_OBJECT_REF_SOURCES.goal.resolver(id);
    },
  },
  project: {
    label: 'Project',
    resolver(id) {
      const store = typeof lifeOSGetStore === 'function' ? lifeOSGetStore() : null;
      if (typeof D === 'undefined' || !store || typeof projectAdapterFindOne !== 'function') return null;
      return projectAdapterFindOne(D, store, id);
    },
    exists(id) {
      return !!LIFEOS_OBJECT_REF_SOURCES.project.resolver(id);
    },
  },
  knowledge: {
    label: 'Knowledge',
    resolver(id) {
      const store = typeof lifeOSGetStore === 'function' ? lifeOSGetStore() : null;
      if (!store || typeof knowledgeAdapterList !== 'function') return null;
      return knowledgeAdapterList(store).find((k) => k.id === id) || null;
    },
    exists(id) {
      return !!LIFEOS_OBJECT_REF_SOURCES.knowledge.resolver(id);
    },
  },
  review: {
    label: 'Review',
    resolver(id) {
      const store = typeof lifeOSGetStore === 'function' ? lifeOSGetStore() : null;
      if (!store) return null;
      return (store.reviewLog || []).find((r) => r.id === id) || null;
    },
    exists(id) {
      return !!LIFEOS_OBJECT_REF_SOURCES.review.resolver(id);
    },
  },
  // finance — Sesi 71 (Batch 6, keputusan produk FINAL user: "Finance
  // Domain Foundation"). Sumbernya D.transactions (modules/finance/
  // transaksi.js) — array flat yang SUDAH ADA, tidak ada adapter
  // lifeos/adapters/*.js terpisah utk ini (pola SAMA PERSIS dgn domain
  // `review` di atas: baca langsung D.transactions via guard `typeof D
  // !== 'undefined'`, TIDAK ada agregasi/query baru, TIDAK ada file
  // adapter baru — beda dgn goal/project/knowledge yang sudah punya
  // adapter list function tersendiri sejak sebelum Life Object ada).
  finance: {
    label: 'Transaksi',
    resolver(id) {
      if (typeof D === 'undefined' || !D.transactions) return null;
      return D.transactions.find((t) => t.id === id) || null;
    },
    exists(id) {
      return !!LIFEOS_OBJECT_REF_SOURCES.finance.resolver(id);
    },
  },
  // financeAccount — Sesi 73 (Batch 6, keputusan produk FINAL user:
  // "Finance Account & Finance Category Foundation"). Sumbernya
  // D.accounts (modules/finance/akun.js) — array flat yang SUDAH ADA,
  // pola SAMA PERSIS dgn domain `finance` di atas: baca langsung D.accounts
  // via guard `typeof D !== 'undefined'`, TIDAK ada agregasi/query baru
  // (mis. TIDAK memanggil recalcAccBalance()), TIDAK ada file adapter baru.
  financeAccount: {
    label: 'Akun Finance',
    resolver(id) {
      if (typeof D === 'undefined' || !D.accounts) return null;
      return D.accounts.find((a) => a.id === id) || null;
    },
    exists(id) {
      return !!LIFEOS_OBJECT_REF_SOURCES.financeAccount.resolver(id);
    },
  },
  // financeCategory — Sesi 73 (Batch 6, sama keputusan produk dgn
  // financeAccount di atas). Sumbernya D.categories.income +
  // D.categories.expense (modules/finance/kategori.js) — dua array flat
  // yang SUDAH ADA (bukan subs/subkategori, TIDAK ada level baru). id
  // kategori unik lintas income/expense (lihat DEFAULT_CATS), jadi
  // resolver cukup cari di kedua array lalu tempel `type` hasil temuan
  // (dipakai UI utk tahu array mana yg harus dibuka, lihat
  // ui/life-objects.js _openRefLocal) — TIDAK mengubah bentuk object
  // kategori aslinya selain menambah field `type` non-destruktif.
  financeCategory: {
    label: 'Kategori Finance',
    resolver(id) {
      if (typeof D === 'undefined' || !D.categories) return null;
      const inIncome = (D.categories.income || []).find((c) => c.id === id);
      if (inIncome) return { ...inIncome, type: 'income' };
      const inExpense = (D.categories.expense || []).find((c) => c.id === id);
      if (inExpense) return { ...inExpense, type: 'expense' };
      return null;
    },
    exists(id) {
      return !!LIFEOS_OBJECT_REF_SOURCES.financeCategory.resolver(id);
    },
  },
};
