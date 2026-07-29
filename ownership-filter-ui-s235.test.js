'use strict';
// tests/ownership-filter-ui-s235.test.js — Sesi 235: Ownership Filter UI.
//
// Target eksplisit user: "Tambahkan filter Ownership pada halaman yang
// sudah memiliki daftar data: Akun, Asset, Investasi, Kendaraan... Reuse
// OwnershipEngine.filterByType(). Jangan membuat filter baru. Default =
// Semua. Jangan mengubah perhitungan."
//
// Test ini fokus ke renderVehicleManageList() (modules-render.js) karena
// dependensinya paling ringan (D.vehicles + escapeHtml + vehMetaText +
// OwnershipEngine) dibanding renderAccGrid()/Aset.renderList() yang
// butuh recalcAccBalance()/totalSaldoAkun() dkk. Yang dites SAMA untuk
// ketiganya: filter dropdown "ALL"/tidak ada elemen -> tampilkan semua
// (default Semua), filter tipe tertentu -> HANYA item ownership efektif
// itu yang dirender, dan index [i] yang dipakai tombol edit/hapus TETAP
// index asli di D.vehicles (bukan index di list terfilter) walau list
// sudah difilter.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Fake document minimal: cuma elemen yang benar2 dipakai renderVehicleManageList()
// (vehicleManageList container + vehOwnFilter select) yang didaftarkan; id lain
// balikin null (persis document.getElementById asli kalau elemen tidak ada).
function makeFakeDocument(filterValue) {
  const vehicleManageListEl = { innerHTML: '' };
  const vehOwnFilterEl = filterValue === undefined ? null : { value: filterValue };
  return {
    el: vehicleManageListEl,
    document: {
      getElementById(id) {
        if (id === 'vehicleManageList') return vehicleManageListEl;
        if (id === 'vehOwnFilter') return vehOwnFilterEl;
        return null;
      },
    },
  };
}

function makeD() {
  return {
    vehicles: [
      { id: 'v1', name: 'Vario Pribadi', emoji: '🏍️', jenis: 'motor' }, // tanpa ownership -> default SELF
      { id: 'v2', name: 'Motor Investor', emoji: '🏍️', jenis: 'motor', ownership: 'INVESTOR' },
      { id: 'v3', name: 'Mobil Customer', emoji: '🚗', jenis: 'mobil', ownership: 'CUSTOMER' },
      { id: 'v4', name: 'Motor Keluarga', emoji: '🏍️', jenis: 'motor', ownership: 'FAMILY' },
      { id: 'v5', name: 'Motor Titipan', emoji: '🏍️', jenis: 'motor', ownership: 'THIRD_PARTY' },
    ],
  };
}

function makeCtx(D, filterValue) {
  const fake = makeFakeDocument(filterValue);
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/helper-teks.js', 'modules/vehicle/vehicle-core.js', 'modules/shared/modules-render.js'],
    { D, document: fake.document },
    ['OwnershipEngine']
  );
  return { ctx, el: fake.el };
}

test('renderVehicleManageList() — tidak ada elemen vehOwnFilter (halaman lain tanpa filter) -> semua kendaraan tampil (fallback aman)', () => {
  const D = makeD();
  const { ctx, el } = makeCtx(D, undefined);
  ctx.renderVehicleManageList();
  D.vehicles.forEach((v) => assert.ok(el.innerHTML.includes(v.name), `${v.name} harus tampil`));
});

test('renderVehicleManageList() — filter "ALL" (default Semua) -> semua kendaraan tampil', () => {
  const D = makeD();
  const { ctx, el } = makeCtx(D, 'ALL');
  ctx.renderVehicleManageList();
  D.vehicles.forEach((v) => assert.ok(el.innerHTML.includes(v.name), `${v.name} harus tampil`));
});

test('renderVehicleManageList() — filter "SELF" -> HANYA kendaraan tanpa ownership eksplisit (default SELF) yang tampil', () => {
  const D = makeD();
  const { ctx, el } = makeCtx(D, 'SELF');
  ctx.renderVehicleManageList();
  assert.ok(el.innerHTML.includes('Vario Pribadi'));
  assert.ok(!el.innerHTML.includes('Motor Investor'));
  assert.ok(!el.innerHTML.includes('Mobil Customer'));
  assert.ok(!el.innerHTML.includes('Motor Keluarga'));
  assert.ok(!el.innerHTML.includes('Motor Titipan'));
});

test('renderVehicleManageList() — filter "INVESTOR" -> HANYA kendaraan ownership INVESTOR yang tampil', () => {
  const D = makeD();
  const { ctx, el } = makeCtx(D, 'INVESTOR');
  ctx.renderVehicleManageList();
  assert.ok(el.innerHTML.includes('Motor Investor'));
  assert.ok(!el.innerHTML.includes('Vario Pribadi'));
  assert.ok(!el.innerHTML.includes('Mobil Customer'));
  assert.ok(!el.innerHTML.includes('Motor Keluarga'));
  assert.ok(!el.innerHTML.includes('Motor Titipan'));
});

test('renderVehicleManageList() — filter "FAMILY" -> index [i] tombol edit/hapus tetap index ASLI di D.vehicles (bukan index list terfilter)', () => {
  const D = makeD();
  const { ctx, el } = makeCtx(D, 'FAMILY');
  ctx.renderVehicleManageList();
  // "Motor Keluarga" ada di index 3 (0-based) di D.vehicles ASLI, walau di list
  // terfilter dia jadi satu-satunya/index 0 -> data-args harus tetap [3], bukan [0].
  assert.ok(el.innerHTML.includes('data-args="[3]"'), el.innerHTML);
  assert.ok(!el.innerHTML.includes('data-args="[0]"'));
});

test('renderVehicleManageList() — tidak mengubah D.vehicles (tidak memutasi data asli)', () => {
  const D = makeD();
  const before = JSON.stringify(D.vehicles);
  const { ctx } = makeCtx(D, 'CUSTOMER');
  ctx.renderVehicleManageList();
  assert.equal(JSON.stringify(D.vehicles), before);
});
