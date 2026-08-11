'use strict';
// tests/asset-owners-flow-e2e-392a-to-392e.test.js — Verifikasi END-TO-END
// (bukan cuma unit per fungsi) rencana 5 sesi "form UI porsi kepemilikan"
// (392a -> 392e), dijalankan lewat SOURCE ASLI (loadSource, sama pola
// harness test lain di repo ini) dengan DOM tiruan yang STATEFUL (bukan
// stub permisif no-op seperti asset-owners-ai-rules-regression-s392e.test.js
// -- di sana DOM sengaja di-mock jadi no-op karena scope-nya rule AI, bukan
// UI). Di sini kita betulan mensimulasikan urutan interaksi user:
//
//   392a: buka modal (skeleton, baca data existing lewat MultiOwnerEngine)
//   392b: tambah/hapus baris, ketik nama & porsi
//   392c: indikator total porsi (warna/teks/tombol simpan aktif-nonaktif)
//   392d: simpan ke D.assets (tervalidasi) & reset draft
//   392e: rule AI S391 menyala/tidak menyala sesuai jalur data
//
// PLUS satu lapis tambahan yang TIDAK ADA di 392a-392e sebelumnya: cross-
// check template HTML ASLI (modules/shared/modals.js, MODAL_HTML array)
// terhadap id/data-action yang benar-benar dipanggil aset.js -- supaya
// class bug s392f (tombol tersisip rusak di tengah atribut `class`) punya
// regression guard permanen, bukan cuma dicek manual sekali saat fix.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

// loadSource() menjalankan aset.js di dalam vm.createContext terpisah --
// artinya Array/Object yang dibuat DI DALAM sana (mis. Aset._ownersDraft)
// adalah instance dari Array/Object REALM VM itu, BUKAN realm Node utama.
// assert.deepEqual/deepStrictEqual (strict mode) membandingkan constructor
// juga, jadi array yang isinya identik tapi beda realm tetap gagal cocok.
// norm() menormalkan lewat round-trip JSON (String primitif tidak
// terpengaruh realm) supaya bisa dibandingkan aman dgn literal biasa.
function norm(x) { return JSON.parse(JSON.stringify(x)); }

// --- DOM tiruan STATEFUL: getElementById() auto-vivify elemen & MENYIMPAN
// state antar panggilan (beda dari makePermissiveStub yang selalu no-op),
// supaya alur "isi input -> baca ulang value" & "innerHTML ter-set -> DOM
// query di test ini" beneran nyambung, sama seperti browser asli. Cukup
// buat method/property yang benar-benar dipakai aset.js untuk modal ini
// (getElementById, .value, .textContent, .innerHTML, .style.color/
// fontWeight, .className, .disabled, .classList.toggle) -- BUKAN jsdom
// penuh, sengaja minimal & sesuai batasan loadSource.js (lihat catatan di
// file itu: "jangan pakai buat nge-test fungsi yang baca/tulis DOM" untuk
// harness DEFAULT-nya -- di sini kita override `document` sendiri, di luar
// default itu, khusus buat test end-to-end ini).
function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      className: '',
      placeholder: '',
      disabled: false,
      style: {},
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeD() {
  return {
    assets: [
      { id: 'a1', name: 'Ruko Warisan Keluarga', jenis: 'Ruko', nilai: 500000000, keuntungan: 20000000 },
    ],
    accounts: [],
    transactions: [],
    debts: [],
  };
}

function makeAIDecisionMock() {
  const registered = [];
  return {
    rules: { register: (r) => { registered.push(r); return true; } },
    _registered: registered,
    find(id) { return registered.find((r) => r.id === id); },
  };
}

function makeCtx(D, AIDecision, dom) {
  let _n = 0;
  const openModalCalls = [];
  const toastMessages = [];
  const ctx = loadSource(
    [
      'modules/shared/multi-owner-engine.js',
      'modules/asset/asset-ownership-split-presenter.js',
      'modules/asset/aset.js',
    ],
    {
      D,
      AIDecision,
      document: dom,
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      openModal: (id) => { openModalCalls.push(id); },
      closeModal: () => {},
      uid: () => 'owner_' + (_n += 1),
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: (msg) => { toastMessages.push(msg); },
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      todayStr: () => '2026-08-06',
      parsePzNum: (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; },
    },
    ['Aset', 'MultiOwnerEngine', 'AssetOwnershipSplitPresenter', 'registerAssetAIRules'],
  );
  // renderList()/renderDashboard() penuh butuh banyak DOM/kartu lain di luar
  // cakupan modal porsi kepemilikan (sama seperti test 392e) -- di-no-op-kan
  // spy, TIDAK mengubah source aset.js.
  ctx.Aset.renderList = () => {};
  ctx.openModalCalls = openModalCalls;
  ctx.toastMessages = toastMessages;
  return ctx;
}

// ============================================================
// LAPIS 1 — cross-check TEMPLATE HTML ASLI vs referensi di aset.js
// (regression guard utk class bug s392f: tag tersisip rusak di tengah
// atribut). Dijalankan sekali di depan supaya kalau template rusak lagi,
// test gagal DI SINI dengan pesan jelas, bukan baru ketahuan pas simulasi
// interaksi di bawah gagal random.
// ============================================================

function extractModalHtml() {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  const sandbox = {};
  const vm = require('vm');
  const context = vm.createContext(sandbox);
  new vm.Script(modalsSrc + '\nthis.MODAL_HTML = MODAL_HTML;', { filename: 'modals.js' }).runInContext(context);
  const all = context.MODAL_HTML.join('\n');
  const assetModalMatch = /<div class="overlay" id="assetModal"[\s\S]*?\n\s*<\/div>\n<\/div>/.exec(all);
  const assetOwnersModalMatch = /<div class="overlay" id="assetOwnersModal"[\s\S]*?\n\s*<\/div>\n<\/div>/.exec(all);
  assert.ok(assetModalMatch, 'assetModal harus ditemukan utuh di MODAL_HTML (regex tag penutup tidak nyambung -> indikasi HTML rusak/tidak simetris)');
  assert.ok(assetOwnersModalMatch, 'assetOwnersModal harus ditemukan utuh di MODAL_HTML');
  return { assetModalHtml: assetModalMatch[0], assetOwnersModalHtml: assetOwnersModalMatch[0] };
}

test('[gap-check] assetModal: tombol Aset.openOwnersModal adalah elemen <button> valid, BUKAN tersisip di tengah atribut lain', () => {
  const { assetModalHtml } = extractModalHtml();
  // Regex ketat: seluruh tag <button ...data-action="Aset.openOwnersModal"...> harus
  // langsung didahului oleh '>' (penutup tag sebelumnya) atau whitespace/newline
  // setelah tag sebelumnya ditutup -- BUKAN oleh '="' (tanda dia nyempil di dalam
  // atribut, persis pola bug s392f).
  const idx = assetModalHtml.indexOf('data-action="Aset.openOwnersModal"');
  assert.notEqual(idx, -1, 'tombol Atur Porsi Kepemilikan harus ada di assetModal');
  const before = assetModalHtml.slice(Math.max(0, idx - 200), idx);
  assert.match(before, /<button[^<>]*$/, 'data-action="Aset.openOwnersModal" harus berada di dalam tag <button ...> yang bersih, tidak nyempil di tengah atribut elemen lain');
  assert.doesNotMatch(before, /class="\s*<button/, 'REGRESI BUG s392f: tombol tersisip di tengah atribut class milik elemen lain');
});

test('[gap-check] assetModal & assetOwnersModal: semua tag seimbang (label/button/div/select)', () => {
  const { assetModalHtml, assetOwnersModalHtml } = extractModalHtml();
  function assertBalanced(html, label) {
    const pairs = [['label', 'button', 'select', 'div']].flat();
    for (const tag of ['label', 'button', 'select', 'div']) {
      const openCount = (html.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
      const closeCount = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(openCount, closeCount, `${label}: <${tag}> tidak seimbang (${openCount} buka vs ${closeCount} tutup) -- indikasi HTML rusak`);
    }
  }
  assertBalanced(assetModalHtml, 'assetModal');
  assertBalanced(assetOwnersModalHtml, 'assetOwnersModal');
});

test('[gap-check] semua id yang dipakai Aset.openOwnersModal/_renderOwnersList/updateOwnersTotal/saveOwners/resetOwners memang ada di template assetOwnersModal', () => {
  const { assetOwnersModalHtml } = extractModalHtml();
  const asetSrc = fs.readFileSync(path.join(ROOT, 'modules/asset/aset.js'), 'utf8');
  // Ambil hanya potongan owners-modal (dari openOwnersModal sampai akhir resetOwners)
  // biar tidak ketarik id field form Aset lain yang tidak relevan.
  const start = asetSrc.indexOf('openOwnersModal(){');
  const end = asetSrc.indexOf('_syncOwnerDebts(a){');
  assert.ok(start !== -1 && end !== -1 && end > start, 'batas fungsi owners-modal di aset.js harus ditemukan (nama fungsi berubah? update test ini)');
  const ownersModalCode = asetSrc.slice(start, end);
  const idsUsed = [...ownersModalCode.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(idsUsed.length >= 3, 'harus ada minimal beberapa getElementById dipanggil di kode owners-modal');
  for (const id of new Set(idsUsed)) {
    assert.match(assetOwnersModalHtml, new RegExp(`id="${id}"`), `id="${id}" dipanggil aset.js tapi TIDAK ADA di template assetOwnersModal -- gap HTML/JS`);
  }
  // Sebaliknya: data-action yang dipanggil dari tombol di template harus benar-benar
  // ada sbg method Aset.* yang dipakai kode owners-modal (addOwnerRow/saveOwners/resetOwners).
  for (const action of ['Aset.addOwnerRow', 'Aset.saveOwners', 'Aset.resetOwners']) {
    assert.match(assetOwnersModalHtml, new RegExp(`data-action="${action.replace('.', '\\.')}"`), `${action} harus ada sbg data-action tombol di template assetOwnersModal`);
  }
});

// ============================================================
// LAPIS 2 — SIMULASI ALUR NYATA 392a -> 392e lewat source asli
// ============================================================

test('[flow a->e] alur penuh: buka modal -> tambah baris -> isi porsi belum 100% -> lengkapi ke 100% -> simpan -> reset -> rule AI', () => {
  const D = makeD();
  const AIDecision = makeAIDecisionMock();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, AIDecision, dom);

  // --- 392a: buka modal utk aset yang SUDAH ADA (belum punya field owners
  // eksplisit -> MultiOwnerEngine mensintesis 1 pemilik SELF 100%, sesuai
  // kontrak backward-compat S390) ---
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  assert.deepEqual(ctx.openModalCalls, ['assetOwnersModal'], '392a: openModal("assetOwnersModal") harus terpanggil tepat 1x');
  assert.equal(dom.getElementById('assetOwnersAssetName').textContent, '📋 Ruko Warisan Keluarga', '392a: nama aset harus tampil di header modal');
  assert.equal(ctx.Aset._ownersDraft.length, 1, '392a: aset lama tanpa field owners disintesis jadi 1 pemilik (backward-compat MultiOwnerEngine)');
  assert.match(dom.getElementById('assetOwnersTotalBox').textContent, /100%/, '392a: 1 pemilik sintesis otomatis 100%, indikator harus langsung hijau/pas');
  assert.equal(dom.getElementById('assetOwnersSaveBtn').disabled, false, '392a: dgn draft awal 100%, tombol Simpan harus AKTIF dari awal');

  // --- 392b: user mau ubah jadi kepemilikan majemuk -- hapus baris
  // sintesis, tambah 2 baris baru, isi nama & porsi ---
  ctx.Aset.removeOwnerRow(0);
  assert.equal(ctx.Aset._ownersDraft.length, 0, '392b: removeOwnerRow harus mengosongkan draft');
  assert.match(dom.getElementById('assetOwnersList').innerHTML, /Belum ada pemilik/, '392b: list kosong harus tampilkan pesan empty-state');

  ctx.Aset.addOwnerRow();
  ctx.Aset.addOwnerRow();
  assert.equal(ctx.Aset._ownersDraft.length, 2, '392b: addOwnerRow x2 harus menghasilkan 2 baris draft');
  const listHtmlAfterAdd = dom.getElementById('assetOwnersList').innerHTML;
  assert.match(listHtmlAfterAdd, /Aset\.onOwnerNameInput\(0/, '392b: baris pertama harus render input nama dgn handler onOwnerNameInput(0,...)');
  assert.match(listHtmlAfterAdd, /Aset\.onOwnerNameInput\(1/, '392b: baris kedua harus render input nama dgn handler onOwnerNameInput(1,...)');
  assert.match(listHtmlAfterAdd, /Aset\.removeOwnerRow.*\[0\]/, '392b: baris pertama harus punya tombol hapus dgn index 0');
  assert.match(listHtmlAfterAdd, /Aset\.removeOwnerRow.*\[1\]/, '392b: baris kedua harus punya tombol hapus dgn index 1');

  ctx.Aset.onOwnerNameInput(0, 'Ayah');
  ctx.Aset.onOwnerPorsiInput(0, '60');
  ctx.Aset.onOwnerNameInput(1, 'Budi');
  ctx.Aset.onOwnerPorsiInput(1, '25');
  assert.deepEqual(
    norm(ctx.Aset._ownersDraft.map((o) => [o.ownerName, o.porsi])),
    [['Ayah', 60], ['Budi', 25]],
    '392b: ketikan nama & porsi harus tersimpan persis ke draft (index sesuai)',
  );

  // --- 392c: total baru 85% (belum 100%) -- indikator harus MERAH & tombol
  // Simpan NONAKTIF, sinkron dgn validasi yang akan dipakai saveOwners() ---
  const totalBoxMid = dom.getElementById('assetOwnersTotalBox');
  assert.match(totalBoxMid.textContent, /kurang 15%/, '392c: sisa 15% harus muncul di teks indikator (100-60-25=15)');
  assert.equal(totalBoxMid.style.color, 'var(--accent2)', '392c: warna indikator harus warna "belum pas" (merah) saat total 85%');
  assert.equal(dom.getElementById('assetOwnersSaveBtn').disabled, true, '392c: tombol Simpan harus NONAKTIF selama total belum 100%');

  // 392d: coba simpan padahal belum 100% -- HARUS DITOLAK, D.assets tidak berubah
  const ownersBeforeRejectedSave = D.assets[0].owners;
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].owners, ownersBeforeRejectedSave, '392d: saveOwners() saat draft belum 100% TIDAK BOLEH menulis ke D.assets');
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /⚠️/, '392d: saveOwners() yang ditolak harus toast peringatan');

  // Lengkapi ke 100%
  ctx.Aset.onOwnerPorsiInput(1, '40'); // Budi 25 -> 40, total jadi 100
  const totalBoxDone = dom.getElementById('assetOwnersTotalBox');
  assert.match(totalBoxDone.textContent, /pas 100%/, '392c: setelah dilengkapi, indikator harus bilang "pas 100%"');
  assert.equal(totalBoxDone.style.color, 'var(--accent3)', '392c: warna indikator harus warna sukses (hijau) saat total pas 100%');
  assert.equal(dom.getElementById('assetOwnersSaveBtn').disabled, false, '392c: tombol Simpan harus AKTIF lagi begitu total pas 100%');

  // --- 392d: simpan sungguhan ---
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].owners.length, 2, '392d: saveOwners() dgn draft valid harus menulis 2 owners ke D.assets');
  assert.deepEqual(norm(D.assets[0].owners.map((o) => o.ownerName)), ['Ayah', 'Budi'], '392d: nama owners tersimpan sesuai urutan draft');
  assert.deepEqual(norm(D.assets[0].owners.map((o) => o.porsi)), [60, 40], '392d: porsi owners tersimpan sesuai draft (60/40)');
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /✅.*tersimpan/, '392d: saveOwners() sukses harus toast konfirmasi');

  // Rusak draft tanpa simpan (simulasi salah ketik), lalu reset
  ctx.Aset.onOwnerPorsiInput(0, '99');
  ctx.Aset.resetOwners();
  assert.deepEqual(
    norm(ctx.Aset._ownersDraft.map((o) => [o.ownerName, o.porsi])),
    [['Ayah', 60], ['Budi', 40]],
    '392d: resetOwners() harus memuat ulang draft dari data TERSIMPAN terakhir (60/40), membuang perubahan 99 yg belum disimpan',
  );
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /↺.*direset/, '392d: resetOwners() harus toast konfirmasi reset');

  // --- 392e: rule AI S391 terhadap hasil saveOwners() beneran (bukan data
  // programatik) -- profit-split-info menyala, porsi-incomplete TIDAK
  // menyala (temuan sesi 392e, dipastikan lagi di sini via alur UI utuh) ---
  ctx.registerAssetAIRules();
  ctx.registerAssetAIRules(); // dipanggil 2x -- idempotency check bawaan 392e
  const splitRule = AIDecision.find('asset-multi-owner-profit-split-info');
  const incompleteRule = AIDecision.find('asset-multi-owner-porsi-incomplete');
  assert.ok(splitRule && incompleteRule, '392e: kedua rule S391 harus teregistrasi');
  const dupCount = AIDecision._registered.filter((r) => r.id === 'asset-multi-owner-profit-split-info').length;
  assert.equal(dupCount, 1, '392e: registerAssetAIRules() dipanggil 2x tidak boleh mendaftarkan rule dobel (idempotent)');

  const asset = D.assets[0];
  assert.equal(splitRule.condition(asset), true, '392e: profit-split-info harus MENYALA utk hasil saveOwners() UI nyata (2 pemilik, 100%)');
  const action = splitRule.action(asset);
  const actionText = typeof action === 'string' ? action : JSON.stringify(action);
  assert.match(actionText, /Ayah/, '392e: pesan rule harus memuat nama pemilik dari draft yang disimpan user (Ayah)');
  assert.match(actionText, /Budi/, '392e: pesan rule harus memuat nama pemilik dari draft yang disimpan user (Budi)');
  assert.equal(incompleteRule.condition(asset), false, '392e: porsi-incomplete TIDAK BOLEH menyala dari hasil tombol Simpan Porsi UI (saveOwners() menolak yg belum 100%)');

  // Jalur DI LUAR UI (import/restore/migrasi lama) -- porsi-incomplete harus
  // TETAP bisa menyala, memastikan rule itu tidak "mati" walau tidak pernah
  // menyala dari UI normal (klarifikasi cakupan 392e, bukan bug).
  const legacyAsset = { id: 'a2', name: 'Aset Migrasi Lama', nilai: 100000000, owners: [{ ownerId: 'x', ownerName: 'Entah', porsi: 70 }] };
  D.assets.push(legacyAsset);
  assert.equal(incompleteRule.condition(legacyAsset), true, '392e: porsi-incomplete harus tetap menyala utk data yg masuk lewat jalur non-UI (bukan via saveOwners())');
});

test('[flow a->e] validasi 392d: nama pemilik kosong ditolak, tidak menyentuh D.assets', () => {
  const D = makeD();
  const AIDecision = makeAIDecisionMock();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, AIDecision, dom);
  ctx.Aset.editId = 'a1';
  ctx.Aset.openOwnersModal();
  ctx.Aset.removeOwnerRow(0);
  ctx.Aset.addOwnerRow();
  ctx.Aset.onOwnerPorsiInput(0, '100');
  // nama sengaja dikosongkan
  const before = D.assets[0].owners;
  ctx.Aset.saveOwners();
  assert.equal(D.assets[0].owners, before, 'nama pemilik kosong harus ditolak saveOwners(), D.assets tidak berubah');
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /Nama pemilik/, 'toast harus menyebut nama pemilik wajib diisi');
});

test('[flow a->e] aset BELUM tersimpan (Tambah Aset baru, editId kosong): modal tampil pesan blokir, addOwnerRow & saveOwners tidak mengizinkan', () => {
  const D = makeD();
  const AIDecision = makeAIDecisionMock();
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, AIDecision, dom);
  ctx.Aset.editId = null; // form "Tambah Aset" baru, belum disimpan
  ctx.Aset.openOwnersModal();
  assert.match(dom.getElementById('assetOwnersList').innerHTML, /Simpan aset ini dulu/, 'harus muncul pesan minta simpan aset dulu');
  ctx.Aset.addOwnerRow();
  assert.equal(ctx.Aset._ownersDraft.length, 0, 'addOwnerRow tidak boleh menambah baris kalau aset belum tersimpan');
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /Simpan aset ini dulu/, 'addOwnerRow harus toast peringatan yg sama');
  ctx.Aset.saveOwners();
  assert.match(ctx.toastMessages[ctx.toastMessages.length - 1], /Simpan aset ini dulu/, 'saveOwners juga harus menolak dgn pesan yang sama');
});
