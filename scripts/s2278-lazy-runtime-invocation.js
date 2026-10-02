'use strict';
// S2278 audit companion. Keep the matrix discoverable without modifying
// production runtime; execution is provided by the Node test contract.
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const testFile=path.join(ROOT,'tests','s2278-lazy-runtime-invocation.test.js');
const src=fs.readFileSync(testFile,'utf8');
const required=[
  'ensureVehicleCatalogFeatureScripts','ensureHondaPdfImportScripts',
  'ensureDataHealthScripts','ensureLaporanExportScripts','ensureShopPdfImportScripts'
];
for(const name of required) if(!src.includes(name)) throw new Error(`S2278 matrix missing ${name}`);
console.log(`S2278 runtime invocation matrix: ${required.length} lazy loaders covered`);
