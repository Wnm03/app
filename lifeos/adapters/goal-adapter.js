// adapters/goal-adapter.js — READ-ONLY. Menyeragamkan sumber goal lama
// (D.targets, D.eduFunds, D.pensiun, D.finansialFreedom, D.wishlist,
// D.debtStrategy) jadi satu bentuk "goal card". Tidak menyimpan apa pun,
// dihitung ulang tiap dipanggil. Tidak pernah menulis ke D.
//
// goalAdapterList() SEKARANG registry-driven (pola SAMA PERSIS dgn
// today-adapter.js/TODAY_SOURCE_BUILDERS — Sesi 24): iterasi
// LIFEOS_GOAL_SOURCES (lifeos-registry.js) lalu dispatch ke builder di
// GOAL_SOURCE_BUILDERS berdasar `key` registry — kalau builder utk 1 key
// belum terdaftar, key itu dilewati (aman, tidak throw), TIDAK ada key
// yang diproses tanpa terdaftar di registry duluan. Sebelum sesi ini,
// docstring file ini SUDAH mengaku "Depends on: LIFEOS_GOAL_SOURCES" tapi
// kode-nya belum benar-benar membaca array itu (3 sumber di-hardcode
// langsung) — sekarang benar-benar dikonsumsi otomatis: kalau
// LIFEOS_GOAL_SOURCES bertambah/berkurang entri (dan builder-nya ada),
// goalAdapterList() otomatis ikut berubah tanpa perlu ubah file ini.
//
// Depends on: lifeos-registry.js (LIFEOS_GOAL_SOURCES).
//
// Builder utk key pensiun/fi/debt — DIIMPLEMENTASIKAN Sesi 49, setelah
// keputusan produk final (`docs/PRODUCT_DECISIONS.md` § LifeOS — Goal
// source pensiun/fi/debt, sebelumnya "BELUM final"):
//
// 1) pensiun/fi — currentAmount REUSE LANGSUNG `Pensiun.danaTerkumpul()`/
//    `FI.netAssetFund()` (guard `typeof X!=='undefined'`), BUKAN dihitung
//    ulang dari parameter `D`. Konsekuensi yang disadari & diterima
//    (keputusan eksplisit user Sesi 49): kedua fungsi itu membaca `D` dari
//    CLOSURE modul masing-masing, jadi kalau builder ini dipanggil dgn `D`
//    palsu (mis. di test terisolasi lewat `loadSource` TANPA memuat
//    `modules-calc.js`), `Pensiun`/`FI` TIDAK terdefinisi -> guard aktif ->
//    builder balik `[]` (aman, TIDAK throw, TIDAK menebak angka) — bukan
//    pakai `D` palsu yang di-pass. targetAmount/meta tetap dibaca dari `D`
//    parameter (`D.pensiun`, `D.finansialFreedom`) spy tetap konsisten dgn
//    pola builder lain. Alasan TIDAK menghitung ulang murni dari `D`:
//    `FI.netAssetFund()` berantai ke banyak helper global lain
//    (`totalSaldoAkun`, `totalCicilanOutstanding`, `totalDebtValue`, dll)
//    — menduplikasi logic itu di sini melanggar "Larangan duplikasi"
//    (`docs/PRODUCT_DECISIONS.md` § Umum).
// 2) debt — sumber data BUKAN `D.debtStrategy` ({method,extra}, tanpa
//    nominal) tapi `D.debts` (array per-utang, field `nilai`/`lunas` —
//    lihat `modules/finance/piutang-utang.js`), keputusan eksplisit user
//    Sesi 49. Registry `LIFEOS_GOAL_SOURCES` (`lifeos-registry.js`) `dArr`
//    utk key `debt` diubah dari `debtStrategy` -> `debts` sesi ini supaya
//    konsisten (dArr cuma dipakai sbg dokumentasi sumber di registry,
//    builder di bawah yang jadi sumber kebenaran aktual — pola sama dgn
//    builder lain yg baca field D langsung).
//
// Audit Sesi 35 (target eksplisit user: "Registry Driven Goal
// Adapter"): dikonfirmasi ulang lewat pembacaan langsung file ini +
// `tests/lifeos-goal-adapter.test.js` (11 test, termasuk test yang
// menghapus 1 entri dari `LIFEOS_GOAL_SOURCES` lalu membuktikan
// sumbernya otomatis berhenti diproses) — migrasi registry-driven ini
// SUDAH selesai (Sesi 25, lihat README.md § LifeOS), TIDAK ada
// hardcode daftar sumber yang tersisa. Tidak ada perubahan kode yang
// diperlukan sesi ini.

function goalSourceTarget(D) {
  return (D.targets || []).map((t) => ({
    id: `target:${t.id}`, sourceKind: 'target', sourceId: t.id,
    name: t.name, emoji: t.emoji || '🎯',
    targetAmount: t.amount, currentAmount: t.saved,
    progressPct: t.amount ? Math.min(100, Math.round((t.saved / t.amount) * 100)) : 0,
    deadline: null, areaKey: 'finance',
    isDanaDarurat: !!t.isDanaDarurat,
  }));
}

function goalSourceEduFund(D) {
  return (D.eduFunds || []).map((e) => ({
    id: `eduFund:${e.id}`, sourceKind: 'eduFund', sourceId: e.id,
    name: e.name || 'Dana Pendidikan', emoji: '🎓',
    targetAmount: e.target ?? null, currentAmount: e.saved ?? null,
    progressPct: e.target ? Math.min(100, Math.round(((e.saved || 0) / e.target) * 100)) : null,
    deadline: null, areaKey: 'finance',
  }));
}

function goalSourceWishlist(D) {
  return (D.wishlist || []).filter((w) => !w.bought).map((w) => ({
    id: `wishlist:${w.id}`, sourceKind: 'wishlist', sourceId: w.id,
    name: w.name, emoji: '🛍️',
    targetAmount: w.price, currentAmount: 0, progressPct: 0,
    deadline: null, areaKey: 'finance',
  }));
}

function goalSourcePensiun(D) {
  const p = D.pensiun;
  // Guard konfigurasi: sama persis dgn kondisi "Belum diatur" di
  // Pensiun.renderDashMini() (modules-calc.js) — usiaSekarang/usiaPensiun/
  // accId wajib ada dulu, kalau belum jangan tampilkan goal card kosong.
  if (!p || !p.usiaSekarang || !p.usiaPensiun || !p.accId) return [];
  let current = 0;
  if (typeof Pensiun !== 'undefined' && typeof Pensiun.danaTerkumpul === 'function') {
    try { current = Number(Pensiun.danaTerkumpul()) || 0; } catch (e) { current = 0; }
  } else {
    return [];
  }
  const target = Number(p.targetDana) || 0;
  return [{
    id: 'pensiun:main', sourceKind: 'pensiun', sourceId: 'main',
    name: 'Dana Pensiun', emoji: '🏖️',
    targetAmount: target, currentAmount: current,
    progressPct: target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0,
    deadline: null, areaKey: 'finance',
  }];
}

function goalSourceFI(D) {
  const fi = D.finansialFreedom;
  if (!fi) return [];
  if (typeof FI === 'undefined' || typeof FI.targetNominal !== 'function' || typeof FI.netAssetFund !== 'function') return [];
  let target = 0, current = 0;
  try { target = Number(FI.targetNominal()) || 0; } catch (e) { target = 0; }
  try { current = Number(FI.netAssetFund()) || 0; } catch (e) { current = 0; }
  // Belum ada data transaksi yang cukup utk hitung target (annualExpense
  // 0 -> targetNominal 0) — jangan tampilkan goal card kosong/menyesatkan,
  // pola sama dgn guard pensiun di atas.
  if (!isFinite(target) || target <= 0) return [];
  return [{
    id: 'fi:main', sourceKind: 'fi', sourceId: 'main',
    name: 'Financial Independence', emoji: '🕊️',
    targetAmount: target, currentAmount: current,
    progressPct: Math.max(0, Math.min(100, Math.round((current / target) * 100))),
    deadline: null, areaKey: 'finance',
  }];
}

function goalSourceDebt(D) {
  return (D.debts || []).filter((d) => (d.nilai || 0) > 0).map((d) => ({
    id: `debt:${d.id}`, sourceKind: 'debt', sourceId: d.id,
    name: d.name, emoji: '📕',
    targetAmount: d.nilai, currentAmount: d.lunas ? d.nilai : 0,
    progressPct: d.lunas ? 100 : 0,
    deadline: d.jatuhTempo || null, areaKey: 'finance',
  }));
}

const GOAL_SOURCE_BUILDERS = {
  target: goalSourceTarget,
  eduFund: goalSourceEduFund,
  wishlist: goalSourceWishlist,
  pensiun: goalSourcePensiun,
  fi: goalSourceFI,
  debt: goalSourceDebt,
};

function goalAdapterList(D) {
  const out = [];
  const sources = typeof LIFEOS_GOAL_SOURCES !== 'undefined' ? LIFEOS_GOAL_SOURCES : [];
  sources.forEach((src) => {
    const builder = GOAL_SOURCE_BUILDERS[src.key];
    if (typeof builder !== 'function') return;
    out.push(...builder(D));
  });
  return out;
}

function goalAdapterFindOne(D, sourceKind, sourceId) {
  return goalAdapterList(D).find((g) => g.sourceKind === sourceKind && g.sourceId === sourceId) || null;
}
