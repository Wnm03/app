'use strict';
// tests/vehicle-catalog-web-import.test.js — cakupan
// modules/vehicle/vehicle-catalog-web-import.js (Tahap 6: Import Katalog
// dari URL Web). fetchCatalogHtml() dites dgn `fetch` palsu (network
// nyata butuh browser + CORS situs eksternal, tidak reliable buat CI —
// sama pola dgn vehicle-scanner.test.js utk kamera). parseCatalogHtml()
// dites dgn fixture HTML yang dibangun dari DATA NYATA halaman katalog
// hondacengkareng.com (dicek isi persisnya via web fetch: nama part,
// kode part, & harga di bawah ini adalah data sungguhan dari halaman
// "E-2 Cylinder Head Cover — Katalog Honda Vario Techno 125 -2", per
// 25 Juli 2026), dibungkus markup tabel WooCommerce-style yang wajar
// (exact tag wrapper situs asli tidak bisa diverifikasi dari sandbox
// tanpa akses network langsung ke situsnya, tapi parser TIDAK bergantung
// ke tag spesifik — lihat catatan desain di file source).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(extraGlobals) {
  return loadSource(
    ['modules/vehicle/vehicle-catalog-web-import.js'],
    extraGlobals || {},
    ['VehicleCatalogWebImport']
  );
}

// Fixture dibangun dari 6 part NYATA di halaman E-2 Cylinder Head Cover
// (hondacengkareng.com/catalogs/katalog-honda-vario-techno-125-2/e-2-
// cylinder-head-cover-katalog-honda-vario-techno-125-2/), termasuk noise
// nav menu (daftar puluhan model motor) SEBELUM tabel, persis seperti
// struktur nyata halamannya — supaya test membuktikan parser tidak
// "tertipu" noise itu.
const REAL_CATALOG_FIXTURE_HTML = `
<html><body>
<nav>
<ul>
<li><a href="#">ADV 150 K0W (2019, 2020, 2021, 2022)</a></li>
<li><a href="#">Vario 125 eSP K2V (2022, 2023, 2024, 2025)</a></li>
<li><a href="#">Vario Techno 125 FI STD (2013 - 2015)</a></li>
</ul>
</nav>
<h1>E-2 Cylinder Head Cover – Katalog Honda Vario Techno 125 -2</h1>
<table>
<tr><td>#</td><td>Gambar</td><td>Nama Part</td><td>Harga</td><td>Order</td></tr>
<tr>
<td>1</td>
<td><a href="/produk/12310kzr701/"><img alt="Catalog Image" src="cover.jpg"></a></td>
<td><a href="/produk/12310kzr701/">COVER COMP., HEAD</a><br><a href="/produk/12310kzr701/">12310KZR701</a>stok habis</td>
<td><del>Rp 87,000</del> <ins>Rp 82,650</ins></td>
<td>stok habis</td>
</tr>
<tr>
<td>2</td>
<td><a href="/produk/gasket/"><img alt="Catalog Image" src="gasket.jpg"></a></td>
<td><a href="/produk/gasket/">GASKET, CYLINDER HEAD COVER</a><br><a href="/produk/gasket/">12391KZR600</a>stok habis</td>
<td><del>Rp 55,000</del> <ins>Rp 52,250</ins></td>
<td>stok habis</td>
</tr>
<tr>
<td>3</td>
<td><a href="/produk/washer/"><img alt="Catalog Image" src="washer.png"></a></td>
<td><a href="/produk/washer/">WASHER SEALING 6.5MM</a><br><a href="/produk/washer/">90463ML7000</a>stok 120</td>
<td><del>Rp 5,000</del> <ins>Rp 4,750</ins></td>
<td>Tambah</td>
</tr>
<tr>
<td>4</td>
<td><a href="/produk/bolt1/"><img alt="Catalog Image" src="bolt1.jpg"></a></td>
<td><a href="/produk/bolt1/">BOLT FLANGE 6X14</a><br><a href="/produk/bolt1/">957010601400</a>stok 300</td>
<td><del>Rp 1,500</del> <ins>Rp 1,425</ins></td>
<td>Tambah</td>
</tr>
<tr>
<td>5</td>
<td><a href="/produk/bolt2/"><img alt="Catalog Image" src="bolt2.png"></a></td>
<td><a href="/produk/bolt2/">BOLT FLANGE 6X22</a><br><a href="/produk/bolt2/">957010602200</a>stok 11</td>
<td><del>Rp 1,500</del> <ins>Rp 1,425</ins></td>
<td>Tambah</td>
</tr>
<tr>
<td>5</td>
<td><a href="/produk/bolt3/"><img alt="Catalog Image" src="bolt3.jpg"></a></td>
<td><a href="/produk/bolt3/">BOLT FLANGE 6X22</a><br><a href="/produk/bolt3/">957010602207</a>stok 73</td>
<td><del>Rp 9,000</del> <ins>Rp 8,550</ins></td>
<td>Tambah</td>
</tr>
</table>
</body></html>
`;

// ------------------------------------------------------------------------
// parseCatalogHtml() — fixture data nyata
// ------------------------------------------------------------------------
test('parseCatalogHtml() — mengekstrak keenam part nyata (kode + harga diskon final)', () => {
  const ctx = makeCtx();
  const rows = ctx.VehicleCatalogWebImport.parseCatalogHtml(REAL_CATALOG_FIXTURE_HTML);
  assert.equal(rows.length, 6);

  const byCode = Object.fromEntries(rows.map((r) => [r.oemCode, r]));
  assert.equal(byCode['12310KZR701'].partName, 'COVER COMP., HEAD');
  assert.equal(byCode['12310KZR701'].price, 82650); // harga diskon, BUKAN 87000

  assert.equal(byCode['12391KZR600'].partName, 'GASKET, CYLINDER HEAD COVER');
  assert.equal(byCode['12391KZR600'].price, 52250);

  assert.equal(byCode['90463ML7000'].partName, 'WASHER SEALING 6.5MM');
  assert.equal(byCode['90463ML7000'].price, 4750);

  assert.equal(byCode['957010601400'].price, 1425);
  assert.equal(byCode['957010602200'].price, 1425);
  assert.equal(byCode['957010602207'].price, 8550);
});

test('parseCatalogHtml() — tidak tertipu noise nav menu (nama model motor) sebelum tabel', () => {
  const ctx = makeCtx();
  const rows = ctx.VehicleCatalogWebImport.parseCatalogHtml(REAL_CATALOG_FIXTURE_HTML);
  const names = rows.map((r) => r.partName);
  assert.ok(!names.some((n) => /ADV 150|Vario 125 eSP|Vario Techno 125 FI STD/.test(n)));
});

test('parseCatalogHtml() — baris tanpa kode part TIDAK diikutkan', () => {
  const ctx = makeCtx();
  const html = '<table><tr><td>Sesuatu Tanpa Kode</td><td>Rp 50,000</td></tr></table>';
  const rows = ctx.VehicleCatalogWebImport.parseCatalogHtml(html);
  assert.equal(rows.length, 0);
});

test('parseCatalogHtml() — kode part tanpa harga TIDAK diikutkan', () => {
  const ctx = makeCtx();
  const html = '<table><tr><td>Nama Part</td><td>12310KZR701</td></tr></table>';
  const rows = ctx.VehicleCatalogWebImport.parseCatalogHtml(html);
  assert.equal(rows.length, 0);
});

test('parseCatalogHtml() — HTML kosong/bukan string menghasilkan array kosong (tidak error)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.VehicleCatalogWebImport.parseCatalogHtml('').length, 0);
  assert.equal(ctx.VehicleCatalogWebImport.parseCatalogHtml(null).length, 0);
});

// ------------------------------------------------------------------------
// fetchCatalogHtml()
// ------------------------------------------------------------------------
test('fetchCatalogHtml() — URL tanpa http(s):// ditolak sebelum fetch dipanggil', async () => {
  const ctx = makeCtx({ fetch: async () => { throw new Error('tidak boleh sampai sini'); } });
  await assert.rejects(() => ctx.VehicleCatalogWebImport.fetchHtml('hondacengkareng.com/catalogs/x'));
});

test('fetchCatalogHtml() — sukses mengembalikan teks HTML dari fetch()', async () => {
  const ctx = makeCtx({
    fetch: async (url) => ({ ok: true, status: 200, text: async () => '<html>' + url + '</html>' }),
  });
  const html = await ctx.VehicleCatalogWebImport.fetchHtml('https://www.hondacengkareng.com/catalogs/x');
  assert.match(html, /hondacengkareng\.com/);
});

test('fetchCatalogHtml() — gagal fetch (mis. diblokir CORS) melempar error dgn code FETCH_BLOCKED', async () => {
  const ctx = makeCtx({
    fetch: async () => { throw new TypeError('Failed to fetch'); }, // perilaku nyata browser saat CORS diblokir
  });
  await assert.rejects(
    () => ctx.VehicleCatalogWebImport.fetchHtml('https://www.hondacengkareng.com/catalogs/x'),
    (err) => {
      assert.equal(err.code, 'FETCH_BLOCKED');
      return true;
    }
  );
});

test('fetchCatalogHtml() — HTTP error (mis. 404) juga melempar FETCH_BLOCKED (fallback ke paste manual)', async () => {
  const ctx = makeCtx({
    fetch: async () => ({ ok: false, status: 404 }),
  });
  await assert.rejects(
    () => ctx.VehicleCatalogWebImport.fetchHtml('https://www.hondacengkareng.com/tidak-ada'),
    (err) => {
      assert.equal(err.code, 'FETCH_BLOCKED');
      return true;
    }
  );
});
