'use strict';
// tests/dashboard-networth-renderbersih-ssot-s659.test.js — cakupan Sesi 659
// (AUDIT-MENYELURUH-2026-08-28.md §5 & §6 poin 5).
//
// Gap yang ditutup: tests/dashboard-networth-ssot-s268.test.js (S268) sudah
// menguji `FI.totalDebt()` vs `Kekayaan.currentNetWorth()`, TAPI tidak
// pernah benar-benar memanggil `Kekayaan.renderBersih()` (Dashboard) —
// padahal komentar di source mengklaim "SEMUA konsumen Net Worth ... pakai
// 1 sumber utang yang sama (SSOT)". Audit menemukan `renderBersih()` (sebelum
// sesi ini) menghitung ulang formula utang sendiri, LENGKAP dgn fallback
// baca langsung dari DOM (`#zmUtang.value`) kalau `D.pajakZakat.utangJT`
// falsy — beda dari `FI.totalDebt()` yang cuma `||0` (tanpa fallback DOM).
//
// Test 1-2 di bawah membuktikan gap itu ADA secara nyata (bukan cuma teori)
// sebelum fix: kalau `utangJT` falsy TAPI elemen `#zmUtang` di DOM masih
// menyimpan angka lama (state SPA — semua `.page` tetap di DOM), Net Worth
// Dashboard vs Net Worth AssetPortfolioAPI/snapshot bisa BEDA ANGKA.
//
// FIX (Sesi 659, per rekomendasi audit §6 poin 5): `renderBersih()` di-unify
// untuk reuse `FI.totalDebt()` (0 rumus baru, pola identik fix S268) —
// menghilangkan fallback DOM-read yang jadi sumber gap. Test 3 (kasus umum)
// & Test 4 (kasus edge yang tadinya divergen) sekarang HARUS identik.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(extra) {
  return Object.assign({
    accounts: [{ id: 'acc1', name: 'Kas', baseBalance: 1000000, includeInBalance: true }],
    assets: [],
    investments: [],
    investmentTx: [],
    transactions: [],
    debts: [{ id: 'd1', name: 'Utang Bank', nilai: 200000, cicilanBulanan: 0, lunas: false }],
    piutang: [],
    products: [],
    bills: [{ id: 'b1', kind: 'cicilan', name: 'Cicilan Motor', outstanding: 300000, lunas: false }],
    pajakZakat: {},
  }, extra || {});
}

// Stub DOM minimal KHUSUS test ini (bukan permissive-stub Proxy dari
// loadSource.js — harness itu eksplisit bilang jangan dipakai utk fungsi yg
// baca/tulis DOM, lihat komentar di tests/helpers/loadSource.js). Elemen yang
// tidak didaftarkan balik `null` (mis. #zmUtang kalau skenario mau simulasikan
// "elemen tidak ada"), yang didaftarkan punya `textContent`/`style`/`value`/
// `classList` no-op secukupnya supaya renderBersih()/renderSnapshots() tidak
// throw.
function makeDomStub(elements) {
  const registry = elements || {};
  const cache = {};
  function makeEl() {
    return {
      textContent: '',
      className: '',
      style: {},
      classList: { remove() {}, add() {}, toggle() {} },
    };
  }
  return {
    getElementById(id) {
      if (!(id in registry)) return null;
      if (id in cache) return cache[id];
      const el = registry[id] === undefined ? makeEl() : registry[id];
      cache[id] = el;
      return el;
    },
  };
}

function makeCtx(D, documentStub) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/finance/akun.js',
      'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js',
      'modules/finance/piutang-utang.js',
      'pajak-aset-ui-wrappers.js',
      'modules/shared/modules-calc.js',
    ],
    {
      D,
      document: documentStub,
      Etalase: { totalModalStok: () => 0 },
      uid: () => 'x',
      save: () => {},
      todayStr: () => '2026-01-01',
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      fmtFullSigned: (n) => (n < 0 ? '-Rp ' + Math.round(-n) : 'Rp ' + Math.round(n || 0)),
      parsePzNum: (v) => (typeof v === 'number' ? v : Number(String(v || '0').replace(/[^\d.-]/g, '')) || 0),
      sameId: (a, b) => a === b,
      getBillStats: () => ({
        outstanding: (D.bills || []).filter((b) => b.kind === 'cicilan' && !b.lunas)
          .reduce((s, b) => s + (b.outstanding || 0), 0),
      }),
    },
    ['OwnershipEngine', 'Kekayaan', 'FI', 'Piutang', 'Debt', 'totalCicilanOutstanding', 'totalDebtValue'],
  );
}

test('S659 — kasus umum: utangJT tersinkron, renderBersih() & currentNetWorth() identik', () => {
  const D = makeD({ pajakZakat: { utangJT: 0 } });
  const dom = makeDomStub({
    kbSaldoAkun: undefined, kbTotalAset: undefined, kbInventori: undefined,
    kbPiutang: undefined, kbUtang: undefined, kbNetWorth: undefined,
    zmUtang: undefined, // ada di DOM (SPA, semua page tetap ada), value kosong/'0'
    wealthSnapshotList: undefined, wealthGrowthSummary: null,
  });
  const ctx = makeCtx(D, dom);
  ctx.Kekayaan.renderBersih();
  const netEl = dom.getElementById('kbNetWorth');
  assert.equal(ctx.Kekayaan.currentNetWorth(), 1000000 - 500000, 'sanity: currentNetWorth() SSOT tetap 1000000-500000');
  // renderBersih() menulis fmtFullSigned(netWorth) ke #kbNetWorth — bandingkan
  // angka mentahnya lewat pemanggilan ulang formula, bukan parsing string.
  assert.equal(netEl.textContent, ctx.fmtFullSigned(1000000 - 500000));
});

test('S659 — EDGE CASE (gap yang ditemukan audit): utangJT=0 TAPI #zmUtang DOM masih simpan angka lama -- setelah fix HARUS tetap identik (fallback DOM-read sudah dihapus, unify ke FI.totalDebt())', () => {
  const D = makeD({ pajakZakat: { utangJT: 0 } });
  // Simulasikan state SPA nyata: user pernah ketik nilai di halaman Zakat
  // (elemen #zmUtang masih ada di DOM dgn value lama), TAPI D.pajakZakat.utangJT
  // entah kenapa belum ter-sync (mis. restore/import yg tidak lewat event
  // oninput) — persis edge case yg dicatat audit §5.
  const dom = makeDomStub({
    kbSaldoAkun: undefined, kbTotalAset: undefined, kbInventori: undefined,
    kbPiutang: undefined, kbUtang: undefined, kbNetWorth: undefined,
    zmUtang: { value: '9999999' }, // angka lama/stale di DOM
    wealthSnapshotList: undefined, wealthGrowthSummary: null,
  });
  const ctx = makeCtx(D, dom);
  ctx.Kekayaan.renderBersih();
  const netEl = dom.getElementById('kbNetWorth');
  const dashboardNetWorthText = netEl.textContent;
  const ssotNetWorth = ctx.Kekayaan.currentNetWorth();

  // Sebelum fix (S659), baris di atas akan GAGAL: renderBersih() baca stale
  // '9999999' dari #zmUtang.value lewat fallback DOM-read, currentNetWorth()
  // TIDAK (cuma D.pajakZakat.utangJT||0) -- dua angka Net Worth BEDA.
  // Setelah fix (unify ke FI.totalDebt(), fallback DOM-read dihapus), harus
  // identik -- inilah assertion yang menutup gap §5/§6 poin 5.
  assert.equal(dashboardNetWorthText, ctx.fmtFullSigned(ssotNetWorth),
    'renderBersih() (Dashboard) & currentNetWorth() (SSOT) harus pakai formula utang yang SAMA PERSIS -- fallback DOM-read #zmUtang seharusnya sudah tidak dipakai lagi setelah unify ke FI.totalDebt()');
});

test('S659 — renderBersih() reuse FI.totalDebt() di source (bukan hitung ulang formula utang sendiri)', () => {
  const fs = require('fs');
  const src = fs.readFileSync('modules/shared/modules-calc.js', 'utf8');
  const m = src.match(/renderBersih\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'renderBersih() harus ketemu di modules-calc.js');
  assert.match(m[0], /FI\.totalDebt\(\)/,
    'renderBersih() harus reuse FI.totalDebt() (SSOT total utang), bukan formula utangManual+totalDebtValue()+totalCicilanOutstanding() sendiri');
});
