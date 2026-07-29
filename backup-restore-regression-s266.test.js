'use strict';
// tests/backup-restore-regression-s266.test.js — Sesi 266: Backup & Restore
// Test Coverage. Modul di bawah audit: modules/shared/backup-restore.js.
//
// Cakupan (sesuai target sesi):
//   - Export     -> buildBackupPayload() (tombol Backup utama) & runBackup()
//                   (Backup Custom per-modul).
//   - Import     -> parseCSVImport()/ensureCashewTaxonomy()/splitCSVLine()
//                   (import Cashew/CSV lain), importCarData() (import Car
//                   Notes JSON).
//   - Restore    -> applyRestoredData() (merge + rollback kalau error).
//   - Data       -> applyRestoredDataMigrations() (default field yang hilang
//     migration    saat restore dari backup lama).
//   - Ownership  -> field `ownership` di Asset/Vehicle/Shop/Finance/Family
//     integrity    HARUS tetap utuh (byte-identik) setelah restore, karena
//                  restore murni merge objek, bukan rebuild per-field.
//
// Semua fungsi diambil LANGSUNG dari source asli (bukan re-implementasi) lewat
// loadSource() — konsisten dengan pola test lain di repo ini (lihat
// tests/ownership-sync-asset.test.js). Dependency lintas-file (SCHEMA_VERSION,
// runDataMigrations, DEFAULT_*, codeFromName, migrateShopCategory, IDBStore,
// showAlertModal, askConfirm, dst) di-stub minimal sesuai kontrak yang dipakai
// backup-restore.js — logic ASLI migrasi/global lain di luar cakupan modul ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const FILE = 'modules/shared/backup-restore.js';

function makeD(overrides = {}) {
  return Object.assign({
    schemaVersion: 3,
    chatHistory: ['halo ini history chat AI'],
    profile: { nama: 'W', apiKey: 'sk-rahasia-123', gajiPokok: 65000, kiriman: 500000 },
    transactions: [
      { id: 't1', date: '2026-07-01', type: 'income', category: 'Gaji', amount: 1000000, accountId: 'acc_cash' },
      { id: 't2', date: '2026-07-02', type: 'expense', category: 'Makan', amount: 20000, accountId: 'acc_cash', ownership: 'FAMILY' },
    ],
    accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 500000 }],
    categories: { income: [{ id: 'cat_gaji', name: 'Gaji', emoji: '💼', subs: [] }], expense: [{ id: 'cat_makan', name: 'Makan', emoji: '🍽️', subs: [] }] },
    bills: [], billsArchive: [], targets: [], eduFunds: [],
    vehicles: [{ id: 'veh_1', name: 'Vario 125', emoji: '🏍️', serviceIntervalKm: 3000, ownership: 'CUSTOMER' }],
    sparepartCats: [{ id: 'sp1', name: 'Oli', code: 'OLI' }],
    partsStock: [], simList: [],
    bbmLogs: [{ id: 'b1', vehicleId: 'veh_1', date: '2026-07-01', liter: 3, cost: 30000 }],
    servisLogs: [{ id: 's1', vehicleId: 'veh_1', date: '2026-07-01', item: 'Ganti Oli', cost: 50000 }],
    jalanLogs: [{ id: 'j1', vehicleId: 'veh_1', date: '2026-07-01', rute: 'Rumah-Pasar', jarak: 5 }],
    kmLogs: [],
    products: [{ id: 'p1', name: 'Cobek Batu', stock: 10, hargaBeli: 20000, hargaJual: 35000, ownership: 'INVESTOR' }],
    produsen: [], cobekKategori: [{ id: 'ck1', name: 'Shop Kecil' }],
    cobek: [{ id: 'c1', date: '2026-07-01', items: [{ name: 'Cobek Batu', qty: 2 }], subtotal: 70000, total: 70000, profit: 30000 }],
    assets: [{ id: 'a1', name: 'Tanah Warisan', jenis: 'Tanah', nilai: 500000000, ownership: 'THIRD_PARTY' }],
    debts: [], piutang: [], wealthSnapshots: [],
    renovProjects: [], sewaKios: { units: [] },
    pensiun: null, finansialFreedom: null, pajakZakat: null, assetAllocation: null, budgetReko: null,
    wishlist: [], lifeBalanceSnapshots: [],
    workDays: [{ id: 'w1', date: '2026-07-01', jenis: 'harian' }],
    catatan: { anak: [{ id: 'ca1', date: '2026-07-01', text: 'Imunisasi' }] },
    milestones: [false, false, false, false, false],
    nextPulang: '', reminders: [], budgets: {}, notifSettings: { enabled: false, billDays: 3, ldrDays: 3 },
    archiveHistory: [], refleksi: { gratitude: [], selfCareLog: {}, privateNotes: [] },
    gajiMingguanHistory: [], tukangBorHargaMemory: {}, tukangWorkers: [], tukangAbsensi: [],
    torsiChecklist: {}, debtStrategy: { method: 'avalanche', extra: 0 }, dashCardPrefs: {},
    lastBackup: null,
  }, overrides);
}

// --- stub global minimal yang dibutuhkan backup-restore.js di luar cakupan modulnya sendiri ---
function baseGlobals(D, extra = {}) {
  const calls = { showAlertModal: [], askConfirm: [], safeSetItem: [], idbSet: [] };
  return {
    globals: Object.assign({
      D,
      SCHEMA_VERSION: 3,
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
      save: () => {},
      saveFlush: () => {},
      init: () => {},
      toast: () => {},
      closeModal: () => {},
      escapeHtml: (s) => String(s),
      DEFAULT_CATS: { income: [], expense: [] },
      DEFAULT_ACCOUNTS: [],
      DEFAULT_SPAREPARTS: [],
      DEFAULT_COBEK_KATEGORI: [],
      codeFromName: (n) => String(n || '').slice(0, 3).toUpperCase(),
      migrateShopCategory: () => {},
      runDataMigrations: (fromVersion) => { D.schemaVersion = 3; },
      showAlertModal: (msg, opts) => { calls.showAlertModal.push({ msg, opts }); return Promise.resolve(); },
      askConfirm: (msg, opts) => { calls.askConfirm.push({ msg, opts }); return Promise.resolve(true); },
      safeSetItem: (k, v) => { calls.safeSetItem.push({ k, v }); },
      IDBStore: {
        get: async () => undefined,
        set: async (k, v) => { calls.idbSet.push({ k, v }); },
      },
    }, extra),
    calls,
  };
}

function makeCtx(D, extraGlobals = {}) {
  const { globals, calls } = baseGlobals(D, extraGlobals);
  const ctx = loadSource([FILE], globals, [
    'buildBackupPayload', 'exportData', 'runBackup', 'applyRestoredData', 'applyRestoredDataMigrations',
    'importData', 'importCarData', 'parseCSVImport', 'ensureCashewTaxonomy', 'splitCSVLine',
    'guessCatEmoji', 'slugify', 'parseCashewDate', 'backupModules',
  ]);
  return { ctx, calls };
}

// ============================= EXPORT =============================

test('buildBackupPayload() — apiKey terhapus, chatHistory dikosongkan, D asli tidak berubah', async () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  const backupD = await ctx.buildBackupPayload();
  assert.equal(backupD.profile.apiKey, undefined, 'apiKey wajib hilang dari payload backup');
  assert.deepEqual(JSON.parse(JSON.stringify(backupD.chatHistory)), [], 'chatHistory wajib dikosongkan di payload backup');
  assert.equal(D.profile.apiKey, 'sk-rahasia-123', 'D asli TIDAK boleh ikut termutasi');
  assert.equal(D.chatHistory.length, 1, 'D.chatHistory asli TIDAK boleh ikut termutasi');
});

test('buildBackupPayload() — store IndexedDB terpisah (lifeos/eie/vehicle-catalog/honda-pdf-import) ikut kalau ada, dilewati kalau tidak', async () => {
  const D = makeD();
  const stores = { 'lifeos:store': { projects: ['p1'] }, 'vehicle-catalog:store': { catalog: ['v1'] } };
  const { ctx } = makeCtx(D, { IDBStore: { get: async (k) => stores[k], set: async () => {} } });
  const backupD = await ctx.buildBackupPayload();
  assert.deepEqual(backupD._lifeosStore, { projects: ['p1'] });
  assert.deepEqual(backupD._vehicleCatalogStore, { catalog: ['v1'] });
  assert.equal(backupD._eieStore, undefined, 'store yang tidak ada di IDB tidak boleh muncul di payload');
  assert.equal(backupD._hondaPdfImportStore, undefined);
});

test('runBackup() (Backup Custom) — semua domain utama ikut saat semua modul diaktifkan (Asset/Vehicle/Finance/Shop/Family)', () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  const elValues = { bPeriode: 'selamanya', bCustomRange: '', bTipe: 'semua', bFormat: 'json', bFrom: '', bTo: '' };
  const stubEl = () => ({ textContent: '', classList: { add() {}, remove() {} }, style: {} });
  let capturedBlob = null;
  class BlobStub { constructor(parts, opts) { capturedBlob = { parts, type: opts && opts.type }; } }
  const documentStub = {
    getElementById: (id) => (id in elValues ? { value: elValues[id] } : stubEl()),
    createElement: () => ({ set href(v) {}, get href() { return ''; }, set download(v) {}, click() {} }),
  };
  const ctx2 = loadSource([FILE], Object.assign(baseGlobals(D).globals, {
    document: documentStub, Blob: BlobStub, URL: { createObjectURL: () => 'blob:x' },
  }), ['runBackup', 'backupModules']);
  ctx2.backupModules.keuangan = true; ctx2.backupModules.carnotes = true; ctx2.backupModules.shop = true;
  ctx2.backupModules.aset = true; ctx2.backupModules.renov = true; ctx2.backupModules.pensiunZakat = true;
  ctx2.backupModules.habit = true; ctx2.backupModules.lain = true;
  ctx2.runBackup();
  assert.ok(capturedBlob, 'Blob backup harus dibuat');
  const out = JSON.parse(capturedBlob.parts[0]);
  // Finance
  assert.equal(out.transactions.length, 2);
  assert.equal(out.accounts.length, 1);
  // Vehicle
  assert.equal(out.vehicles.length, 1);
  assert.equal(out.bbmLogs.length, 1);
  assert.equal(out.servisLogs.length, 1);
  // Shop
  assert.equal(out.products.length, 1);
  assert.equal(out.cobek.length, 1);
  // Asset
  assert.equal(out.assets.length, 1);
  // Family ("lain")
  assert.equal(out.workDays.length, 1);
  assert.deepEqual(out.catatan.anak[0].text, 'Imunisasi');
  assert.equal(out.profile.apiKey, undefined, 'apiKey wajib disaring juga di jalur Backup Custom');
});

test('runBackup() — modul yang di-nonaktifkan tidak ikut ke payload (per-modul opt-out tetap berfungsi)', () => {
  const D = makeD();
  const elValues = { bPeriode: 'selamanya', bCustomRange: '', bTipe: 'semua', bFormat: 'json', bFrom: '', bTo: '' };
  const stubEl = () => ({ textContent: '', classList: { add() {}, remove() {} }, style: {} });
  let capturedBlob = null;
  class BlobStub { constructor(parts, opts) { capturedBlob = { parts, type: opts && opts.type }; } }
  const documentStub = {
    getElementById: (id) => (id in elValues ? { value: elValues[id] } : stubEl()),
    createElement: () => ({ set href(v) {}, get href() { return ''; }, set download(v) {}, click() {} }),
  };
  const ctx2 = loadSource([FILE], Object.assign(baseGlobals(D).globals, {
    document: documentStub, Blob: BlobStub, URL: { createObjectURL: () => 'blob:x' },
  }), ['runBackup', 'backupModules']);
  Object.assign(ctx2.backupModules, { keuangan: true, carnotes: false, shop: false, aset: false, renov: false, pensiunZakat: false, habit: false, lain: false });
  ctx2.runBackup();
  const out = JSON.parse(capturedBlob.parts[0]);
  assert.ok(out.transactions, 'modul keuangan yang aktif harus tetap ada');
  assert.equal(out.vehicles, undefined, 'modul carnotes nonaktif tidak boleh ikut');
  assert.equal(out.assets, undefined, 'modul aset nonaktif tidak boleh ikut');
  assert.equal(out.products, undefined, 'modul shop nonaktif tidak boleh ikut');
});

// ============================= RESTORE =============================

test('applyRestoredData() — merge berhasil, ownership tetap utuh di semua domain (Asset/Vehicle/Shop/Finance)', async () => {
  // PENTING: `applyRestoredData` melakukan `D={...D,...imp}` di dalam sandbox
  // — ini REBIND variabel global `D`, bukan mutasi in-place — jadi setelah
  // dipanggil, HARUS baca `ctx.D` (binding sandbox yang live), BUKAN variabel
  // `D` di scope test (referensi lama, jadi stale setelah rebind).
  const D = makeD({ transactions: [], assets: [], vehicles: [], products: [] }); // target restore kosong
  const { ctx, calls } = makeCtx(D);
  const imp = JSON.parse(JSON.stringify(makeD({ schemaVersion: 3 })));
  const ok = await ctx.applyRestoredData(imp);
  assert.equal(ok, true);
  assert.equal(ctx.D.assets[0].ownership, 'THIRD_PARTY');
  assert.equal(ctx.D.vehicles[0].ownership, 'CUSTOMER');
  assert.equal(ctx.D.products[0].ownership, 'INVESTOR');
  assert.equal(ctx.D.transactions.find((t) => t.id === 't2').ownership, 'FAMILY');
  assert.equal(calls.safeSetItem.length, 1, 'snapshot pre-restore harus disimpan sebelum merge');
});

test('applyRestoredData() — file bukan format backup (tidak ada known key manapun) ditolak, D tidak berubah', async () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  const before = JSON.stringify(D);
  const ok = await ctx.applyRestoredData({ foo: 'bar', random: 123 });
  assert.equal(ok, false);
  assert.equal(JSON.stringify(D), before, 'D tidak boleh berubah kalau file backup tidak valid');
});

test('applyRestoredData() — null/bukan objek ditolak dengan modal error', async () => {
  const D = makeD();
  const { ctx, calls } = makeCtx(D);
  const ok = await ctx.applyRestoredData(null);
  assert.equal(ok, false);
  assert.equal(calls.showAlertModal.length, 1);
  assert.match(calls.showAlertModal[0].opts.title, /Tidak Valid/);
});

test('applyRestoredData() — backup dari versi lebih baru: minta konfirmasi; kalau user batal, restore DIBATALKAN (D tidak berubah)', async () => {
  const D = makeD();
  const { ctx, calls } = makeCtx(D, { askConfirm: () => Promise.resolve(false) });
  const before = JSON.stringify(D);
  const imp = { schemaVersion: 99, transactions: [{ id: 'tX' }] };
  const ok = await ctx.applyRestoredData(imp);
  assert.equal(ok, false);
  assert.equal(JSON.stringify(D), before);
});

test('applyRestoredData() — backup dari versi lebih baru: kalau user setuju lanjut, restore tetap jalan', async () => {
  const D = makeD();
  const { ctx } = makeCtx(D, { askConfirm: () => Promise.resolve(true) });
  const imp = JSON.parse(JSON.stringify(makeD({ schemaVersion: 99 })));
  const ok = await ctx.applyRestoredData(imp);
  assert.equal(ok, true);
});

test('applyRestoredData() — error saat proses restore: D di-ROLLBACK persis ke kondisi sebelum restore (tidak corrupt)', async () => {
  const D = makeD();
  let initCalls = 0;
  // init() gagal HANYA di percobaan pertama (jalur restore normal) — panggilan
  // kedua dari blok catch (recovery, mengembalikan prevD) harus tetap sukses,
  // persis skenario nyata "gagal di tengah proses lalu recovery jalan".
  const { ctx, calls } = makeCtx(D, { init: () => { initCalls++; if (initCalls === 1) throw new Error('simulasi gagal init'); } });
  const before = JSON.parse(JSON.stringify(D));
  const imp = JSON.parse(JSON.stringify(makeD()));
  imp.assets[0].ownership = 'SELF'; // ubahan yang SEHARUSNYA tidak sampai ke D setelah rollback
  const ok = await ctx.applyRestoredData(imp);
  assert.equal(ok, false);
  // Baca ctx.D (live, pasca-panggilan) — bukan `D` scope test yang jadi stale
  // gara-gara `D={...D,...imp}`/`D=prevD` mem-REBIND variabel global di sandbox.
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.D)), before, 'D (sandbox) harus identik dengan sebelum restore setelah rollback');
  assert.equal(calls.showAlertModal.some((c) => /Restore Gagal/.test(c.opts.title)), true);
});

test('applyRestoredData() — titipan IndexedDB (_lifeosStore dkk) tidak nyangkut jadi field liar di D', async () => {
  const D = makeD();
  const { ctx, calls } = makeCtx(D);
  const imp = JSON.parse(JSON.stringify(makeD()));
  imp._lifeosStore = { projects: ['restored'] };
  imp._vehicleCatalogStore = { catalog: ['restored'] };
  const ok = await ctx.applyRestoredData(imp);
  assert.equal(ok, true);
  assert.equal(ctx.D._lifeosStore, undefined);
  assert.equal(ctx.D._vehicleCatalogStore, undefined);
  assert.deepEqual(calls.idbSet.find((c) => c.k === 'lifeos:store').v, { projects: ['restored'] });
  assert.deepEqual(calls.idbSet.find((c) => c.k === 'vehicle-catalog:store').v, { catalog: ['restored'] });
});

// ========================= DATA MIGRATION =========================

test('applyRestoredDataMigrations() — backup lama tanpa koleksi baru (mis. wishlist/wealthSnapshots) diisi default, bukan undefined', () => {
  const D = makeD();
  delete D.wishlist; delete D.wealthSnapshots; delete D.targets; delete D.reminders;
  const { ctx } = makeCtx(D);
  ctx.applyRestoredDataMigrations();
  assert.deepEqual(JSON.parse(JSON.stringify(D.wishlist)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(D.wealthSnapshots)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(D.targets)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(D.reminders)), []);
});

test('applyRestoredDataMigrations() — vehicle tanpa serviceIntervalKm (backup lama) di-default-kan, TANPA menghapus field ownership', () => {
  const D = makeD();
  delete D.vehicles[0].serviceIntervalKm;
  const { ctx } = makeCtx(D);
  ctx.applyRestoredDataMigrations();
  assert.equal(D.vehicles[0].serviceIntervalKm, 3000);
  assert.equal(D.vehicles[0].ownership, 'CUSTOMER', 'migrasi default TIDAK BOLEH menyentuh field ownership yang sudah ada');
});

test('applyRestoredDataMigrations() — cobek transaksi lama tanpa "delivered" di-default true, item lain tidak ikut berubah', () => {
  const D = makeD();
  delete D.cobek[0].delivered;
  const { ctx } = makeCtx(D);
  ctx.applyRestoredDataMigrations();
  assert.equal(D.cobek[0].delivered, true);
  assert.equal(D.cobek[0].total, 70000, 'field lain tidak boleh ikut berubah oleh migrasi default');
});

// ============================= IMPORT =============================

test('splitCSVLine() — parsing baris CSV dengan koma di dalam tanda kutip', () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  const out = ctx.splitCSVLine('2026-07-01,"Beli, bayar cash",20000');
  assert.deepEqual(JSON.parse(JSON.stringify(out)), ['2026-07-01', 'Beli, bayar cash', '20000']);
});

test('parseCSVImport() (format cashew) — hasil parsing benar & baris amount<=0 dilewati', () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  const content = [
    'Date,Amount,Income,Category Name,Subcategory Name,Title,Note,Account',
    '2026-07-10,50000,false,Makan,,Sarapan,Nasi uduk,Cash',
    '2026-07-11,0,false,Makan,,Kosong,,Cash',
  ].join('\n');
  const rows = ctx.parseCSVImport(content, 'cashew');
  assert.equal(rows.length, 1, 'baris dengan amount 0 harus dilewati');
  assert.equal(rows[0].type, 'expense');
  assert.equal(rows[0].amount, 50000);
  assert.equal(rows[0].category, 'Makan');
});

test('ensureCashewTaxonomy() — akun/kategori baru dibuat kalau belum ada, yang sudah ada TIDAK diduplikasi', () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  const content = [
    'Date,Amount,Income,Category Name,Subcategory Name,Title,Note,Account',
    '2026-07-10,50000,false,Makan,Sarapan,Sarapan,,Cash',
    '2026-07-11,20000,true,Bonus,,Bonus,,Dompet Digital',
  ].join('\n');
  const summary = ctx.ensureCashewTaxonomy(content);
  assert.equal(D.accounts.length, 2, 'akun baru "Dompet Digital" harus ditambahkan');
  assert.ok(D.categories.income.some((c) => c.name === 'Bonus'), 'kategori baru "Bonus" harus ditambahkan');
  assert.equal(D.categories.expense.find((c) => c.name === 'Makan').subs.length, 1, 'subkategori baru "Sarapan" ditambahkan ke kategori Makan yang sudah ada (bukan duplikat kategori)');
  assert.equal(summary.newAccounts.length, 1);
  assert.equal(summary.newCats.length, 1);
});

test('importCarData() (JSON) — BBM/servis baru masuk, entri dengan id yang sudah ada TIDAK diduplikasi', () => {
  const D = makeD();
  const resultStore = {};
  const documentStub = {
    getElementById: (id) => {
      if (id === 'carImportResult') return { get innerHTML() { return resultStore.html; }, set innerHTML(v) { resultStore.html = v; } };
      if (id === 'carImportVehicle') return { value: 'veh_1' };
      return { textContent: '' };
    },
  };
  const fileContent = JSON.stringify({
    bbmLogs: [
      { id: 'b1', vehicleId: 'veh_1', date: '2026-07-05', liter: 2, cost: 20000 }, // id sudah ada -> harus dilewati
      { id: 'bNEW', vehicleId: 'veh_1', date: '2026-07-06', liter: 4, cost: 40000 },
    ],
    servisLogs: [
      { id: 'sNEW', vehicleId: 'veh_1', date: '2026-07-06', item: 'Ganti Ban', cost: 100000 },
    ],
  });
  class FileReaderStub {
    readAsText() { if (this.onload) this.onload({ target: { result: fileContent } }); }
  }
  const { globals } = baseGlobals(D, { document: documentStub, FileReader: FileReaderStub });
  const ctx = loadSource([FILE], globals, ['importCarData']);
  ctx.importCarData({ target: { files: [{ name: 'car.json' }] } });
  assert.equal(D.bbmLogs.length, 2, 'entri dengan id yang sudah ada tidak boleh diduplikasi, hanya 1 entri baru masuk');
  assert.ok(D.bbmLogs.some((b) => b.cost === 40000 && b.liter === 4), 'entri BBM baru (cost 40rb) harus masuk (id baru di-generate ulang lewat uid(), bukan id asli file import)');
  assert.equal(D.servisLogs.length, 2, 'entri servis baru harus masuk');
  assert.ok(D.servisLogs.some((s) => s.item === 'Ganti Ban'), 'entri servis baru harus punya data yang benar');
});

// ================= ROUND-TRIP: EXPORT -> IMPORT -> RESTORE =================

test('Round-trip: buildBackupPayload() -> JSON.stringify/parse (simulasi file diunduh & dibuka lagi) -> applyRestoredData() -> semua domain & ownership utuh', async () => {
  const D = makeD();
  const { ctx: exportCtx } = makeCtx(D);
  const backupD = await exportCtx.buildBackupPayload();
  const fileJson = JSON.parse(JSON.stringify(backupD)); // persis proses export ke file lalu file dibuka lagi

  const D2 = makeD({
    // D tujuan restore beda isi (skenario ganti device / restore ke instalasi baru)
    transactions: [], accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }],
    assets: [], vehicles: [{ id: 'veh_1', name: 'Vario 125', emoji: '🏍️', serviceIntervalKm: 3000 }],
    products: [],
  });
  const { ctx: restoreCtx } = makeCtx(D2);
  const ok = await restoreCtx.applyRestoredData(fileJson);
  assert.equal(ok, true);

  // Baca restoreCtx.D (live) — bukan D2, yang jadi stale setelah `D={...}` rebind.
  const finalD = restoreCtx.D;
  // Finance
  assert.equal(finalD.transactions.length, 2);
  assert.equal(finalD.transactions.find((t) => t.id === 't2').ownership, 'FAMILY');
  // Asset
  assert.equal(finalD.assets[0].ownership, 'THIRD_PARTY');
  // Vehicle
  assert.equal(finalD.vehicles[0].ownership, 'CUSTOMER');
  // Shop
  assert.equal(finalD.products[0].ownership, 'INVESTOR');
  // Family
  assert.equal(finalD.catatan.anak[0].text, 'Imunisasi');
  // apiKey yang sudah disaring saat export TIDAK BOLEH muncul lagi setelah restore
  assert.equal(finalD.profile.apiKey, undefined);
});

// ==================== KOMPATIBILITAS SCHEMA/MIGRASI LAMA ====================

test('Restore backup SANGAT LAMA (schemaVersion 0, tanpa field koleksi baru sama sekali) tetap kompatibel — tidak crash, default terisi', async () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  // Backup purba: cuma modul keuangan inti, semua field baru (assets/wishlist/
  // wealthSnapshots/targets/eduFunds/sparepartCats/dst) belum pernah ada.
  const oldBackup = {
    transactions: [{ id: 'old1', date: '2020-01-01', type: 'income', category: 'Gaji', amount: 500000, accountId: 'acc_cash' }],
    accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }],
    categories: { income: [], expense: [] },
  };
  const ok = await ctx.applyRestoredData(oldBackup);
  assert.equal(ok, true, 'backup versi purba (tanpa schemaVersion) harus tetap bisa di-restore');
  const finalD = ctx.D; // live — jangan pakai `D` scope test (stale setelah rebind)
  assert.equal(finalD.transactions.length, 1);
  assert.equal(finalD.transactions[0].id, 'old1');
  // Koleksi yang tidak ada di backup lama harus di-default-kan oleh migrasi, bukan undefined/crash
  assert.ok(Array.isArray(finalD.vehicles) && finalD.vehicles.length >= 1, 'D.vehicles harus ter-default');
  assert.ok(Array.isArray(finalD.wishlist), 'D.wishlist harus ter-default jadi array');
  assert.ok(Array.isArray(finalD.wealthSnapshots), 'D.wealthSnapshots harus ter-default jadi array');
  assert.equal(finalD.schemaVersion, 3, 'schemaVersion harus ikut naik ke versi app saat ini setelah migrasi');
});

test('Restore backup lama yang PUNYA ownership di beberapa field TAPI tidak di field lain — field yang ada tetap dipertahankan, tidak ikut di-default ulang', async () => {
  const D = makeD();
  const { ctx } = makeCtx(D);
  const oldBackup = {
    schemaVersion: 1,
    transactions: [{ id: 'old2', date: '2021-05-05', type: 'expense', category: 'Sewa', amount: 100000, accountId: 'acc_cash', ownership: 'FAMILY' }],
    accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }],
    categories: { income: [], expense: [] },
    vehicles: [{ id: 'veh_old', name: 'Motor Lama', ownership: 'CUSTOMER' }], // TANPA serviceIntervalKm (field baru)
  };
  const ok = await ctx.applyRestoredData(oldBackup);
  assert.equal(ok, true);
  const finalD = ctx.D; // live — jangan pakai `D` scope test (stale setelah rebind)
  assert.equal(finalD.transactions.find((t) => t.id === 'old2').ownership, 'FAMILY');
  assert.equal(finalD.vehicles.find((v) => v.id === 'veh_old').ownership, 'CUSTOMER', 'ownership lama harus tetap ada setelah migrasi mengisi field baru');
  assert.equal(finalD.vehicles.find((v) => v.id === 'veh_old').serviceIntervalKm, 3000, 'field baru (serviceIntervalKm) tetap di-default tanpa menghapus ownership');
});
