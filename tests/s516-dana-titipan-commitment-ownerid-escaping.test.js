'use strict';
// tests/s516-dana-titipan-commitment-ownerid-escaping.test.js — Sesi 516,
// BUG-S516-001 (laporan user: "Owner tidak ditemukan pada daftar pemilik
// investasi yang ada" muncul di modal "💰 Pokok Dana Titipan" walau owner
// itu jelas ada di listExistingOwners()).
//
// ROOT CAUSE (ditemukan lewat pembacaan langsung
// DanaTitipanCommitmentUI.open(), bukan cuma listExistingOwners()/
// saveCommitment() yang sebelumnya diaudit statis dan dinyatakan
// "konsisten"): `open()` menyuntik `o.ownerId` MENTAH (tanpa escapeHtml)
// ke atribut HTML `<option value="${o.ownerId}">` lewat innerHTML. Kalau
// ownerId punya karakter `"` (mis. ownerId hasil OwnerRegistry.findOrCreate
// dari nama pemilik yang mengandung tanda kutip), atribut value pecah di
// tengah jalan -> browser membaca `sel.value` jadi STRING TERPOTONG, beda
// dari ownerId asli -> saveCommitment()/recordReturn() cari `known` pakai
// ownerId yang sudah rusak itu -> tidak ketemu -> Error "Owner tidak
// ditemukan..." walau ownerId aslinya 100% valid & ada di
// listExistingOwners(). Ini BUKAN race condition/bundle basi seperti dugaan
// audit statis sebelumnya -- murni bug escaping, reproducible 100% dgn
// ownerId yang mengandung `"`.
//
// FIX (Sesi 516): escapeHtml() dipasang ke `o.ownerId` juga (bukan cuma
// `o.ownerName`) di option value -- pola sama title `escapeHtml(...)` yang
// SUDAH dipakai di tempat lain utk value atribut (mis. akun.js:175). Turut
// dirapikan 2 tombol data-args (baris "Atur Pokok Dana Titipan"/"Catat
// Pengembalian") yang punya lubang sama (ownerId mentah di JSON literal
// dalam atribut '...') -- disamakan ke pola `escapeHtml(JSON.stringify([...]))`
// yang SUDAH dipakai persis di baris "Atur Porsi" (Aset.openOwnersModalById)
// pada file yang sama.
//
// Test ini SENGAJA memakai escapeHtml ASLI dari helper-teks.js (bukan stub
// identity `(s) => String(s)` seperti test s484/s453/dst) -- kalau dites
// pakai stub identity, bug ini tidak akan pernah terdeteksi karena stub
// tidak pernah mem-break attribute manapun.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, value: '', textContent: '', innerHTML: '', selectedOptions: [] };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
  };
}

// Simulasi PALING SEDERHANA dari parser HTML browser buat <option value="...">:
// ambil isi atribut value= sampai tanda kutip PENUTUP pertama (persis cara
// browser beneran berhenti baca atribut). Ini bukan full HTML parser --
// cukup buat membuktikan attribute-breakout kalau string tidak di-escape.
function parseFirstOptionValue(html) {
  const m = /<option value="([^"]*)"/.exec(html);
  return m ? m[1] : null;
}

function makeCtx(D, dom, realEscapeHtml) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',],
    {
      D,
      document: dom,
      escapeHtml: realEscapeHtml,
      openModal: () => {},
      closeModal: () => {},
      updateAmtPreview: () => {},
      toast: () => {},
      uid: () => 'tc1',
      save: () => {},
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
    },
    ['DanaTitipanPortfolioAPI', 'DanaTitipanCommitmentUI'],
  );
}

function loadRealEscapeHtml() {
  const ctx = loadSource(['modules/shared/helper-teks.js'], {}, ['escapeHtml']);
  return ctx.escapeHtml;
}

test('BUG-S516-001: ownerId dengan tanda kutip ganda tidak merusak atribut value option (escapeHtml dipasang)', () => {
  const escapeHtml = loadRealEscapeHtml();
  const trickyOwnerId = 'owner_"><script>x</script>';
  const D = {
    investments: [
      { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: trickyOwnerId, ownerName: 'Budi "Bee" Santoso', porsi: 100 }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
    titipanCommitments: [],
  };
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, escapeHtml);

  ctx.DanaTitipanCommitmentUI.open();

  const sel = dom.getElementById('titipanCommitOwner');
  const parsedValue = parseFirstOptionValue(sel.innerHTML);

  // SEBELUM fix: parsedValue akan terpotong jadi 'owner_' (attribut pecah
  // di tanda kutip pertama milik ownerId), BEDA dari trickyOwnerId asli.
  // SESUDAH fix: parsedValue harus == escapeHtml(trickyOwnerId) utuh, dan
  // ketika "dibaca ulang" browser (unescape kasar `&quot;`->`"` dst) harus
  // balik jadi ownerId asli persis.
  assert.equal(parsedValue, escapeHtml(trickyOwnerId));
  assert.notEqual(parsedValue, 'owner_');
});

test('BUG-S516-001: saveCommitment() tidak lagi gagal "Owner tidak ditemukan" utk ownerId ber-tanda-kutip stlh roundtrip escape/unescape browser', () => {
  const escapeHtml = loadRealEscapeHtml();
  const trickyOwnerId = 'owner_"quoted"_id';
  const D = {
    investments: [
      { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: trickyOwnerId, ownerName: 'Budi', porsi: 100 }] },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [],
    titipanCommitments: [],
  };
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom, escapeHtml);

  ctx.DanaTitipanCommitmentUI.open();
  const sel = dom.getElementById('titipanCommitOwner');
  // Simulasikan browser membaca kembali atribut value= yang sudah di-escape
  // (unescape &quot;/&#39;/&amp; -> balik ke karakter asli), lalu user
  // "memilih" opsi itu (sel.value = hasil decode, PERSIS perilaku browser
  // asli saat elemen <option> dibuat dari HTML terescape).
  const decoded = escapeHtml(trickyOwnerId)
    .replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.equal(decoded, trickyOwnerId, 'sanity: escape/unescape roundtrip harus balik ke ownerId asli');
  sel.value = decoded;
  sel.selectedOptions = [{ textContent: 'Budi' }];

  ctx.DanaTitipanCommitmentUI.save();

  const record = D.titipanCommitments.find((c) => c && c.ownerId === trickyOwnerId);
  assert.ok(record, 'commitment harus tersimpan dgn ownerId asli, bukan gagal "Owner tidak ditemukan"');
});
