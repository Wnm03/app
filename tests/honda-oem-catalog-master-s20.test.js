'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

test('S20 Honda OEM master — katalog Vario Techno 125 penuh menghasilkan 550 OEM unik / 607 kemunculan', () => {
  const ctx = loadSource(['modules/vehicle/honda-oem-catalog-master.js'], {}, ['HondaOemCatalogMaster']);
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'vario-125-2-full-catalog-main-pages.txt'), 'utf8');
  const rows = ctx.HondaOemCatalogMaster.parse(fixture, { startPage: 34, endPage: 94 });
  const stats = ctx.HondaOemCatalogMaster.stats(rows);
  assert.equal(stats.uniqueOemCount, 550);
  assert.equal(stats.occurrenceCount, 607);
  assert.equal(stats.blockCount, 17);
  const cover = rows.find(r => r.oemCode === '12310-KZR-600');
  assert.ok(cover);
  assert.equal(cover.catalogBlock, 'E-2');
  assert.match(cover.partName, /COVER COMP/i);
  const injector = rows.find(r => r.oemCode === '16016-KVB-S51');
  assert.ok(injector);
  assert.equal(injector.catalogBlock, 'E-22');
  assert.equal(injector.sourcePage, 55);
});

test('S20 Honda OEM master — tidak membuat masterCategoryId/serviceComponentId secara otomatis', () => {
  const ctx = loadSource(['modules/vehicle/honda-oem-catalog-master.js'], {}, ['HondaOemCatalogMaster']);
  const rows = ctx.HondaOemCatalogMaster.parse('E-2 CYLINDER HEAD COVER\n 1 12310-KZR-600 COVER COMP., HEAD ................... 1 1 1 1', {startPage:1,endPage:1});
  assert.equal(rows.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(rows[0], 'masterCategoryId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(rows[0], 'serviceComponentId'), false);
});
