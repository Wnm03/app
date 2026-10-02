#!/usr/bin/env node
'use strict';

// S2273 — static lazy-boundary consumer audit.
// The app uses legacy globals rather than ES modules, so a feature can be
// moved out of GROUP_B while an eager consumer still assumes its globals are
// already resident. This manifest makes those boundaries explicit and fails
// closed when a known consumer loses its demand-load/dispatcher contract.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));

const FEATURES = [
  {
    name: 'Vehicle Catalog / Scanner cluster',
    loader: 'ensureVehicleCatalogFeatureScripts',
    files: [
      'modules/vehicle/vehicle-scanner.js',
      'modules/vehicle/sparepart-scanner.js',
      'modules/vehicle/sparepart-scanner-ui.js',
      'modules/vehicle/sparepart-ocr.js',
      'modules/vehicle/sparepart-ocr-parser.js',
      'modules/vehicle/sparepart-ocr-catalog-link.js',
      'modules/vehicle/sparepart-ocr-catalog-detail.js',
      'modules/vehicle/sparepart-ocr-catalog-add.js',
      'modules/vehicle/sparepart-ocr-orchestrator.js',
      'modules/vehicle/vehicle-catalog-import.js',
      'modules/vehicle/vehicle-catalog-import-ui.js',
      'modules/vehicle/vehicle-catalog-import-stock-push.js',
      'modules/vehicle/vehicle-catalog-web-import.js',
      'modules/vehicle/vehicle-catalog-web-import-ui.js',
    ],
    loaderConsumers: [
      ['modules/finance/tx-stok-sparepart.js', /await ensureVehicleCatalogFeatureScripts\(\)/],
      ['modules/vehicle/vehicle-catalog-ui.js', /await ensureVehicleCatalogFeatureScripts\(\)/],
      ['self-test.js', /await ensureVehicleCatalogFeatureScripts\(\)/],
    ],
  },
  {
    name: 'Honda PDF import',
    loader: 'ensureHondaPdfImportScripts',
    files: [
      'modules/vehicle/honda-pdf-catalog-auto-import.js',
      'modules/vehicle/honda-pdf-import.js',
      'modules/vehicle/honda-pdf-import-extract.js',
      'modules/vehicle/honda-pdf-import-parse.js',
      'modules/vehicle/honda-pdf-import-commit.js',
      'modules/vehicle/honda-pdf-import-ui.js',
    ],
    loaderConsumers: [
      ['modules/shared/features-helpers-global-security.js', /HondaPdfImportUI:\s*typeof ensureHondaPdfImportScripts/],
      ['self-test.js', /await ensureHondaPdfImportScripts\(\)/],
    ],
  },
  {
    name: 'Data Health',
    loader: 'ensureDataHealthScripts',
    files: ['data-health-check.js'],
    loaderConsumers: [
      ['modules/shared/features-helpers-global-security.js', /runDataHealthCheck:\s*typeof ensureDataHealthScripts/],
      ['modules/shared/features-helpers-global-security.js', /DataHealth:\s*typeof ensureDataHealthScripts/],
      ['self-test.js', /await ensureDataHealthScripts\(\)/],
    ],
  },
  {
    name: 'Laporan export',
    loader: 'ensureLaporanExportScripts',
    files: ['laporan-export.js'],
    loaderConsumers: [
      ['modules/shared/features-helpers-global-security.js', /exportLaporanPDF:\s*typeof ensureLaporanExportScripts/],
      ['modules/shared/features-helpers-global-security.js', /exportLaporanImage:\s*typeof ensureLaporanExportScripts/],
      ['self-test.js', /await ensureLaporanExportScripts\(\)/],
    ],
  },
  {
    name: 'Shop PDF import UI',
    loader: 'ensureShopPdfImportScripts',
    files: ['modules/business/shop-pdf-import-ui.js'],
    loaderConsumers: [
      ['modules/shared/features-helpers-global-security.js', /ShopPdfImportUI:\s*typeof ensureShopPdfImportScripts/],
    ],
  },
];

const loaderSource = read('modules/shared/feature-lazy-loader.js');
const buildSource = read('scripts/build.js');
const failures = [];
const checks = [];

function check(label, condition, detail) {
  checks.push({ label, pass: !!condition });
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

for (const feature of FEATURES) {
  check(`${feature.name}: loader exists`, loaderSource.includes(`function ${feature.loader}()`));
  check(`${feature.name}: loader exposed`, loaderSource.includes(`window.${feature.loader} = ${feature.loader}`));
  for (const file of feature.files) {
    check(`${feature.name}: source exists ${file}`, exists(file));
    check(`${feature.name}: source is absent from eager build ${file}`, !buildSource.includes(`'${file}'`));
    check(`${feature.name}: loader owns ${file}`, loaderSource.includes(`'${file}'`));
  }
  for (const [consumer, pattern] of feature.loaderConsumers) {
    check(`${feature.name}: consumer contract ${consumer}`, pattern.test(read(consumer)));
  }
}

// Explicit cold-start contracts for the two highest-risk legacy-global paths.
const txStock = read('modules/finance/tx-stok-sparepart.js');
const txStart = txStock.indexOf('async function txStockScanPartVia(adapterName)');
const txLoad = txStock.indexOf('await ensureVehicleCatalogFeatureScripts()', txStart);
const txScan = txStock.indexOf('SparepartScanner.scan(adapterName)', txStart);
check('Cold-start: txStockScanPartVia loads scanner before use', txLoad >= 0 && txScan > txLoad);

const selfTest = read('self-test.js');
const selfTestPreload = selfTest.indexOf('async function computeSelfTestResults()');
check('Cold-start diagnostic: self-test preloads lazy boundaries before cases',
  selfTestPreload >= 0 &&
  selfTest.indexOf('await ensureDataHealthScripts()', selfTestPreload) > selfTestPreload &&
  selfTest.indexOf('await ensureVehicleCatalogFeatureScripts()', selfTestPreload) > selfTestPreload &&
  selfTest.indexOf('await ensureLaporanExportScripts()', selfTestPreload) > selfTestPreload);

const dispatcher = read('modules/shared/features-helpers-global-security.js');
for (const action of ['HondaPdfImportUI','runDataHealthCheck','DataHealth','exportLaporanPDF','exportLaporanImage','ShopPdfImportUI']) {
  check(`Cold-start dispatcher: ${action} has lazy owner`, new RegExp(`${action}:\\s*typeof ensure[A-Za-z0-9]+Scripts`).test(dispatcher));
}

const passCount = checks.filter(c => c.pass).length;
console.log(`S2273 lazy-boundary audit: ${passCount}/${checks.length} checks PASS`);
if (failures.length) {
  console.error('FAILURES:');
  for (const f of failures) console.error(`- ${f}`);
  process.exitCode = 1;
} else {
  console.log('No known unguarded eager→lazy consumer boundary found.');
}
