#!/usr/bin/env node
'use strict';
// S2274 — machine-readable cold-start lazy-feature matrix summary.
// The executable regression contract lives in tests/s2274-cold-start-feature-matrix.test.js.
const matrix = [
  ['Vehicle Catalog / Scanner', 'ensureVehicleCatalogFeatureScripts'],
  ['Honda PDF', 'ensureHondaPdfImportScripts'],
  ['Data Health', 'ensureDataHealthScripts'],
  ['Laporan Export', 'ensureLaporanExportScripts'],
  ['Shop PDF', 'ensureShopPdfImportScripts'],
];
console.log('S2274 Cold-Start Feature Matrix');
for (const [feature, loader] of matrix) console.log(`- ${feature}: ${loader}`);
console.log('Contract: fresh context, complete load order, concurrent dedup, retry-after-failure.');
